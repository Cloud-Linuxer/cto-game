import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { Quiz, QuizDifficulty } from '../../database/entities/quiz.entity';

/**
 * Quiz Cache Statistics
 * 캐시 성능 모니터링을 위한 통계 인터페이스
 */
export interface QuizCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  poolSizes: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
  lastRefresh: Date;
  totalCached: number;
}

/**
 * Cached Quiz
 * Redis에 저장되는 퀴즈 데이터 구조
 */
interface CachedQuiz extends Omit<Quiz, 'createdAt' | 'updatedAt' | 'accuracyRate'> {
  cachedAt: number;
}

/**
 * QuizCacheService
 *
 * Redis를 사용하여 사전 생성된 퀴즈 풀을 관리합니다.
 *
 * 주요 기능:
 * 1. 퀴즈 풀 관리 (난이도별 10개씩 유지)
 * 2. 캐시 히트/미스 추적
 * 3. 인프라 컨텍스트 매칭
 * 4. 자동 풀 리프레시 (임계값 이하 시)
 * 5. 애플리케이션 시작 시 캐시 워밍
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 2 (Quiz Cache & Pool Management)
 * Task: Task #15
 */
@Injectable()
export class QuizCacheService implements OnModuleInit {
  private readonly logger = new Logger(QuizCacheService.name);
  private redis: Redis | null = null;

  // Cache configuration
  private readonly POOL_SIZE = parseInt(process.env.QUIZ_CACHE_POOL_SIZE || '10', 10);
  private readonly REFRESH_THRESHOLD = parseInt(process.env.QUIZ_CACHE_REFRESH_THRESHOLD || '5', 10);
  private readonly MIN_QUALITY_SCORE = parseInt(process.env.QUIZ_CACHE_MIN_QUALITY || '60', 10);

  // Redis keys
  private readonly POOL_KEY_PREFIX = 'quiz:pool:';
  private readonly STATS_HITS_KEY = 'quiz:stats:hits';
  private readonly STATS_MISSES_KEY = 'quiz:stats:misses';
  private readonly STATS_REFRESH_KEY = 'quiz:stats:refresh';

  // Metrics
  private metrics = {
    hits: 0,
    misses: 0,
  };

  // Dependencies (will be injected via constructor in actual implementation)
  // These will be set by QuizModule
  private llmQuizGenerator: any = null; // LLMQuizGeneratorService
  private quizValidator: any = null; // QuizValidatorService
  private quizQualityScorer: any = null; // QuizQualityScorerService

  /**
   * Redis 연결 초기화 및 캐시 워밍
   */
  async onModuleInit() {
    await this.initializeRedis();

    if (this.redis && process.env.NODE_ENV !== 'test') {
      // 애플리케이션 시작 시 캐시 워밍
      await this.warmCache();
    }
  }

  /**
   * Redis 클라이언트 초기화
   */
  private async initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed, quiz cache disabled');
            return null;
          }
          return Math.min(times * 100, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
        this.redis = null;
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected, quiz cache enabled');
      });

      // Load metrics from Redis
      await this.loadMetricsFromRedis();
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis: ${error.message}`);
      this.redis = null;
    }
  }

  /**
   * Redis에서 메트릭 로드
   */
  private async loadMetricsFromRedis() {
    if (!this.redis) return;

    try {
      const hits = await this.redis.get(this.STATS_HITS_KEY);
      const misses = await this.redis.get(this.STATS_MISSES_KEY);

      this.metrics.hits = hits ? parseInt(hits, 10) : 0;
      this.metrics.misses = misses ? parseInt(misses, 10) : 0;
    } catch (error) {
      this.logger.warn(`Failed to load metrics from Redis: ${error.message}`);
    }
  }

  /**
   * 캐시에서 퀴즈 가져오기
   *
   * 1. 난이도별 풀에서 퀴즈 조회
   * 2. 인프라 컨텍스트 매칭 (exact > partial > any)
   * 3. RPOP으로 단일 사용 보장
   * 4. 풀 크기 확인 및 자동 리프레시 트리거
   *
   * @param difficulty 퀴즈 난이도
   * @param infraContext 현재 게임의 인프라 컨텍스트
   * @returns 캐시된 퀴즈 또는 null
   */
  async getCachedQuiz(
    difficulty: QuizDifficulty,
    infraContext: string[] = [],
  ): Promise<Quiz | null> {
    if (!this.redis) {
      this.metrics.misses++;
      return null;
    }

    try {
      const poolKey = this.getPoolKey(difficulty);
      const poolSize = await this.redis.llen(poolKey);

      if (poolSize === 0) {
        this.logger.debug(`Quiz pool empty for difficulty=${difficulty}`);
        this.metrics.misses++;
        await this.incrementMissCount();

        // 백그라운드에서 풀 리프레시 (블록하지 않음)
        this.preloadQuizPool(difficulty, this.POOL_SIZE).catch((err) => {
          this.logger.error(`Background pool refresh failed: ${err.message}`);
        });

        return null;
      }

      // 인프라 컨텍스트 매칭 시도
      const quiz = await this.findBestMatchQuiz(poolKey, infraContext, poolSize);

      if (quiz) {
        this.metrics.hits++;
        await this.incrementHitCount();
        this.logger.log(
          `Cache hit: difficulty=${difficulty}, infraContext=${infraContext.join(',')}, poolSize=${poolSize - 1}`,
        );

        // 풀 크기가 임계값 이하면 백그라운드 리프레시
        if (poolSize - 1 < this.REFRESH_THRESHOLD) {
          this.logger.log(
            `Pool size below threshold (${poolSize - 1} < ${this.REFRESH_THRESHOLD}), triggering background refresh`,
          );
          this.preloadQuizPool(difficulty, this.POOL_SIZE - (poolSize - 1)).catch((err) => {
            this.logger.error(`Background pool refresh failed: ${err.message}`);
          });
        }

        return quiz;
      }

      this.metrics.misses++;
      await this.incrementMissCount();
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached quiz: ${error.message}`);
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * 인프라 컨텍스트에 가장 잘 매칭되는 퀴즈 찾기
   *
   * 매칭 우선순위:
   * 1. Exact match (모든 인프라가 일치)
   * 2. Partial match (일부 인프라가 일치)
   * 3. Any quiz (매칭 없음)
   *
   * @param poolKey Redis 풀 키
   * @param infraContext 인프라 컨텍스트
   * @param poolSize 현재 풀 크기
   * @returns 가장 잘 매칭되는 퀴즈
   */
  private async findBestMatchQuiz(
    poolKey: string,
    infraContext: string[],
    poolSize: number,
  ): Promise<Quiz | null> {
    if (!this.redis) return null;

    try {
      // 풀에서 모든 퀴즈 조회 (LRANGE는 읽기 전용)
      const quizStrings = await this.redis.lrange(poolKey, 0, poolSize - 1);

      if (quizStrings.length === 0) return null;

      const quizzes = quizStrings.map((str) => JSON.parse(str) as CachedQuiz);

      // 매칭 점수 계산
      const scoredQuizzes = quizzes.map((quiz, index) => ({
        quiz,
        index,
        score: this.calculateMatchScore(quiz.infraContext, infraContext),
      }));

      // 점수로 정렬 (높은 점수 우선)
      scoredQuizzes.sort((a, b) => b.score - a.score);

      const bestMatch = scoredQuizzes[0];

      // 선택된 퀴즈를 풀에서 제거
      await this.redis.lrem(poolKey, 1, quizStrings[bestMatch.index]);

      this.logger.debug(
        `Selected quiz with match score ${bestMatch.score}: quizId=${bestMatch.quiz.quizId}`,
      );

      return this.convertCachedQuizToQuiz(bestMatch.quiz);
    } catch (error) {
      this.logger.error(`Failed to find best match quiz: ${error.message}`);
      // Fallback: RPOP (FIFO)
      const quizStr = await this.redis.rpop(poolKey);
      if (quizStr) {
        return this.convertCachedQuizToQuiz(JSON.parse(quizStr));
      }
      return null;
    }
  }

  /**
   * 인프라 컨텍스트 매칭 점수 계산
   *
   * @param quizInfra 퀴즈의 인프라 컨텍스트
   * @param gameInfra 게임의 인프라 컨텍스트
   * @returns 매칭 점수 (0-100)
   */
  private calculateMatchScore(quizInfra: string[], gameInfra: string[]): number {
    if (!quizInfra || quizInfra.length === 0) return 0;
    if (!gameInfra || gameInfra.length === 0) return 0;

    const quizSet = new Set(quizInfra.map((i) => i.toLowerCase()));
    const gameSet = new Set(gameInfra.map((i) => i.toLowerCase()));

    // 교집합 크기
    const intersection = [...quizSet].filter((i) => gameSet.has(i)).length;

    // 정확도: 교집합 / 퀴즈 인프라 크기
    const accuracy = intersection / quizSet.size;

    // 커버리지: 교집합 / 게임 인프라 크기
    const coverage = intersection / gameSet.size;

    // 가중 평균 (정확도 60%, 커버리지 40%)
    return Math.round((accuracy * 0.6 + coverage * 0.4) * 100);
  }

  /**
   * 퀴즈를 캐시에 추가
   *
   * 1. 퀴즈 유효성 검증
   * 2. 품질 점수 확인 (최소 60점)
   * 3. 난이도별 풀에 추가
   * 4. 풀 크기 제한 유지
   *
   * @param quiz 캐시할 퀴즈
   */
  async cacheQuiz(quiz: Quiz): Promise<void> {
    if (!this.redis) {
      this.logger.debug('Redis not available, skipping cache');
      return;
    }

    try {
      // 유효성 검증 (QuizValidatorService 사용)
      if (this.quizValidator) {
        const validationResult = await this.quizValidator.validateQuiz(quiz);
        if (!validationResult.isValid) {
          this.logger.warn(
            `Quiz validation failed: ${validationResult.errors.join(', ')}`,
          );
          return;
        }
      }

      // 품질 점수 확인
      if (quiz.qualityScore && quiz.qualityScore < this.MIN_QUALITY_SCORE) {
        this.logger.warn(
          `Quiz quality score too low (${quiz.qualityScore} < ${this.MIN_QUALITY_SCORE}), skipping cache`,
        );
        return;
      }

      const poolKey = this.getPoolKey(quiz.difficulty);
      const cachedQuiz: CachedQuiz = {
        ...quiz,
        cachedAt: Date.now(),
      };

      // 풀에 추가 (LPUSH: 새로운 퀴즈를 앞에 추가)
      await this.redis.lpush(poolKey, JSON.stringify(cachedQuiz));

      // 풀 크기 제한 유지 (LTRIM: 최대 POOL_SIZE개만 유지)
      await this.redis.ltrim(poolKey, 0, this.POOL_SIZE - 1);

      this.logger.debug(
        `Quiz cached: difficulty=${quiz.difficulty}, quizId=${quiz.quizId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to cache quiz: ${error.message}`);
    }
  }

  /**
   * 퀴즈 풀 사전 로드
   *
   * LLM을 사용하여 지정된 난이도의 퀴즈를 생성하고 캐시에 추가합니다.
   * 백그라운드에서 비동기로 실행됩니다.
   *
   * @param difficulty 퀴즈 난이도
   * @param count 생성할 퀴즈 개수
   */
  async preloadQuizPool(difficulty: QuizDifficulty, count: number): Promise<void> {
    if (!this.redis) {
      this.logger.warn('Redis not available, skipping pool preload');
      return;
    }

    if (!this.llmQuizGenerator) {
      this.logger.warn('LLMQuizGeneratorService not available, skipping pool preload');
      return;
    }

    this.logger.log(`Starting quiz pool preload: difficulty=${difficulty}, count=${count}`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < count; i++) {
      try {
        // LLM으로 퀴즈 생성
        const quiz = await this.llmQuizGenerator.generateQuiz({
          difficulty,
          infraContext: [], // Generic quiz (no specific infra context)
        });

        // 품질 평가 (QuizQualityScorerService 사용)
        if (this.quizQualityScorer) {
          const qualityScore = await this.quizQualityScorer.scoreQuiz(quiz);
          quiz.qualityScore = qualityScore.totalScore;

          if (qualityScore.totalScore < this.MIN_QUALITY_SCORE) {
            this.logger.debug(
              `Quiz quality too low (${qualityScore.totalScore}), skipping (${i + 1}/${count})`,
            );
            failCount++;
            continue;
          }
        }

        // 캐시에 추가
        await this.cacheQuiz(quiz);
        successCount++;

        this.logger.debug(
          `Quiz preloaded: ${successCount}/${count} (difficulty=${difficulty})`,
        );
      } catch (error) {
        this.logger.error(`Failed to preload quiz ${i + 1}/${count}: ${error.message}`);
        failCount++;
      }
    }

    // 리프레시 타임스탬프 업데이트
    await this.updateRefreshTimestamp();

    this.logger.log(
      `Quiz pool preload complete: difficulty=${difficulty}, success=${successCount}, failed=${failCount}`,
    );
  }

  /**
   * 캐시 초기화 (모든 풀 삭제)
   */
  async clearCache(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const difficulties = [QuizDifficulty.EASY, QuizDifficulty.MEDIUM, QuizDifficulty.HARD];

      for (const difficulty of difficulties) {
        const poolKey = this.getPoolKey(difficulty);
        await this.redis.del(poolKey);
      }

      // 통계 초기화
      await this.redis.del(this.STATS_HITS_KEY);
      await this.redis.del(this.STATS_MISSES_KEY);
      await this.redis.del(this.STATS_REFRESH_KEY);

      this.metrics.hits = 0;
      this.metrics.misses = 0;

      this.logger.log('Quiz cache cleared');
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<QuizCacheStats> {
    const poolSizes = {
      EASY: await this.getPoolSize(QuizDifficulty.EASY),
      MEDIUM: await this.getPoolSize(QuizDifficulty.MEDIUM),
      HARD: await this.getPoolSize(QuizDifficulty.HARD),
    };

    const totalCached = poolSizes.EASY + poolSizes.MEDIUM + poolSizes.HARD;
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? this.metrics.hits / total : 0;

    const lastRefresh = await this.getLastRefreshTimestamp();

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
      poolSizes,
      lastRefresh,
      totalCached,
    };
  }

  /**
   * 풀 크기 조회
   */
  private async getPoolSize(difficulty: QuizDifficulty): Promise<number> {
    if (!this.redis) return 0;

    try {
      const poolKey = this.getPoolKey(difficulty);
      return await this.redis.llen(poolKey);
    } catch (error) {
      this.logger.error(`Failed to get pool size: ${error.message}`);
      return 0;
    }
  }

  /**
   * 마지막 리프레시 타임스탬프 조회
   */
  private async getLastRefreshTimestamp(): Promise<Date> {
    if (!this.redis) return new Date(0);

    try {
      const timestamp = await this.redis.get(this.STATS_REFRESH_KEY);
      return timestamp ? new Date(parseInt(timestamp, 10)) : new Date(0);
    } catch (error) {
      this.logger.error(`Failed to get last refresh timestamp: ${error.message}`);
      return new Date(0);
    }
  }

  /**
   * 리프레시 타임스탬프 업데이트
   */
  private async updateRefreshTimestamp(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.set(this.STATS_REFRESH_KEY, Date.now().toString());
    } catch (error) {
      this.logger.error(`Failed to update refresh timestamp: ${error.message}`);
    }
  }

  /**
   * Hit 카운트 증가
   */
  private async incrementHitCount(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.incr(this.STATS_HITS_KEY);
    } catch (error) {
      this.logger.error(`Failed to increment hit count: ${error.message}`);
    }
  }

  /**
   * Miss 카운트 증가
   */
  private async incrementMissCount(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.incr(this.STATS_MISSES_KEY);
    } catch (error) {
      this.logger.error(`Failed to increment miss count: ${error.message}`);
    }
  }

  /**
   * 애플리케이션 시작 시 캐시 워밍
   */
  private async warmCache(): Promise<void> {
    this.logger.log('Warming quiz cache...');

    try {
      await Promise.all([
        this.preloadQuizPool(QuizDifficulty.EASY, this.POOL_SIZE),
        this.preloadQuizPool(QuizDifficulty.MEDIUM, this.POOL_SIZE),
        this.preloadQuizPool(QuizDifficulty.HARD, this.POOL_SIZE),
      ]);

      const stats = await this.getCacheStats();
      this.logger.log(
        `Quiz cache warmed: total=${stats.totalCached} (EASY=${stats.poolSizes.EASY}, MEDIUM=${stats.poolSizes.MEDIUM}, HARD=${stats.poolSizes.HARD})`,
      );
    } catch (error) {
      this.logger.error(`Failed to warm cache: ${error.message}`);
    }
  }

  /**
   * 난이도별 Redis 풀 키 생성
   */
  private getPoolKey(difficulty: QuizDifficulty): string {
    return `${this.POOL_KEY_PREFIX}${difficulty}`;
  }

  /**
   * CachedQuiz를 Quiz 엔티티로 변환
   */
  private convertCachedQuizToQuiz(cachedQuiz: CachedQuiz): Quiz {
    const quiz = new Quiz();
    Object.assign(quiz, cachedQuiz);
    quiz.createdAt = new Date();
    quiz.updatedAt = new Date();
    return quiz;
  }

  /**
   * 의존성 주입 설정 (QuizModule에서 호출)
   */
  setDependencies(
    llmQuizGenerator: any,
    quizValidator: any,
    quizQualityScorer: any,
  ): void {
    this.llmQuizGenerator = llmQuizGenerator;
    this.quizValidator = quizValidator;
    this.quizQualityScorer = quizQualityScorer;
  }

  /**
   * 모듈 종료 시 Redis 연결 해제
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
