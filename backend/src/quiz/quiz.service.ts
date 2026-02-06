import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz, QuizDifficulty, QuizSource } from '../database/entities/quiz.entity';
import { QuizHistory } from '../database/entities/quiz-history.entity';
import { QuizGenerationOptions } from './interfaces/quiz-generation-options.interface';
import { QuizStatisticsDto, QuizStatisticsByDifficulty } from './dto/quiz-statistics.dto';

/**
 * QuizService
 *
 * AWS 퀴즈 시스템의 핵심 로직을 담당합니다.
 *
 * 주요 기능:
 * 1. 퀴즈 생성 (LLM 기반 or Fallback)
 * 2. 정답 검증
 * 3. 퀴즈 이력 기록
 * 4. 보너스 계산
 * 5. 통계 조회
 * 6. 퀴즈 메트릭 업데이트
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 1 (Core Quiz System)
 * Task: Task #9
 */
@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizHistory)
    private readonly quizHistoryRepository: Repository<QuizHistory>,
    // LLMQuizGeneratorService will be injected in Task #10-11
    // private readonly llmQuizGenerator: LLMQuizGeneratorService,
  ) {}

  /**
   * 퀴즈 생성
   *
   * 1. LLMQuizGeneratorService를 호출하여 퀴즈 생성 시도 (Phase 2)
   * 2. 실패 시 Fallback 퀴즈 풀에서 선택
   * 3. 생성된 퀴즈를 DB에 저장
   *
   * @param options 퀴즈 생성 옵션
   * @returns 생성된 퀴즈
   */
  async generateQuiz(options: QuizGenerationOptions): Promise<Quiz> {
    this.logger.log(
      `Generating quiz with options: difficulty=${options.difficulty}, infraContext=${options.infraContext.join(',')}`,
    );

    try {
      // Phase 1: Fallback 퀴즈 풀에서 선택
      // Phase 2: LLM 생성 로직 추가 예정
      const quiz = await this.selectFallbackQuiz(options);

      if (!quiz) {
        throw new NotFoundException(
          `No suitable quiz found for difficulty=${options.difficulty}`,
        );
      }

      this.logger.log(`Quiz generated successfully: quizId=${quiz.quizId}`);
      return quiz;
    } catch (error) {
      this.logger.error(
        `Failed to generate quiz: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to generate quiz');
    }
  }

  /**
   * Fallback 퀴즈 선택
   *
   * 사전 생성된 퀴즈 풀에서 조건에 맞는 퀴즈를 선택합니다.
   *
   * 선택 기준:
   * 1. 난이도 일치
   * 2. 활성화된 퀴즈 (isActive = true)
   * 3. 인프라 컨텍스트 매칭 (선택적)
   * 4. 턴 범위 매칭 (선택적)
   * 5. 게임 이력에서 중복 제외 (선택적)
   *
   * @param options 퀴즈 생성 옵션
   * @returns 선택된 퀴즈
   */
  private async selectFallbackQuiz(
    options: QuizGenerationOptions,
  ): Promise<Quiz | null> {
    this.logger.debug(`selectFallbackQuiz called with: ${JSON.stringify(options)}`);

    const queryBuilder = this.quizRepository
      .createQueryBuilder('quiz')
      .where('quiz.difficulty = :difficulty', {
        difficulty: options.difficulty,
      })
      .andWhere('quiz.isActive = :isActive', { isActive: true })
      .andWhere('quiz.source = :source', { source: QuizSource.FALLBACK });

    // Debug: count after basic filters
    const countAfterBasic = await queryBuilder.getCount();
    this.logger.debug(`After basic filters (difficulty, isActive, source): ${countAfterBasic} quizzes`);

    // TEMP FIX: 턴 범위 필터링 비활성화 (모든 퀴즈를 모든 턴에서 사용 가능)
    // TODO: fallback-quizzes.json 재생성 시 turnRange를 1-25로 설정
    /*
    if (options.turnNumber !== undefined) {
      queryBuilder.andWhere(
        '(quiz.turnRangeStart IS NULL OR quiz.turnRangeStart <= :turnNumber)',
        { turnNumber: options.turnNumber },
      );
      queryBuilder.andWhere(
        '(quiz.turnRangeEnd IS NULL OR quiz.turnRangeEnd >= :turnNumber)',
        { turnNumber: options.turnNumber },
      );

      const countAfterTurn = await queryBuilder.getCount();
      this.logger.debug(`After turn range filter (turnNumber=${options.turnNumber}): ${countAfterTurn} quizzes`);
    }
    */

    // 게임 이력에서 중복 제외
    if (options.gameId) {
      const usedQuizIds = await this.quizHistoryRepository
        .createQueryBuilder('history')
        .select('DISTINCT history.quizId')
        .where('history.gameId = :gameId', { gameId: options.gameId })
        .getRawMany()
        .then((rows) => rows.map((row) => row.quizId));

      this.logger.debug(`Used quiz IDs for game ${options.gameId}: ${usedQuizIds.length} quizzes`);

      if (usedQuizIds.length > 0) {
        queryBuilder.andWhere('quiz.quizId NOT IN (:...usedQuizIds)', {
          usedQuizIds,
        });

        const countAfterExclude = await queryBuilder.getCount();
        this.logger.debug(`After excluding used quizzes: ${countAfterExclude} quizzes`);
      }
    }

    // 사용 빈도가 낮은 퀴즈 우선 선택 (부하 분산)
    queryBuilder.orderBy('quiz.usageCount', 'ASC');
    queryBuilder.addOrderBy('RANDOM()'); // 동일 사용 빈도 시 랜덤

    const quiz = await queryBuilder.getOne();

    if (quiz) {
      this.logger.debug(
        `Selected fallback quiz: quizId=${quiz.quizId}, usageCount=${quiz.usageCount}`,
      );
    } else {
      this.logger.warn(`No quiz found with options: ${JSON.stringify(options)}`);
    }

    return quiz;
  }

  /**
   * 정답 검증
   *
   * 플레이어의 답변이 정답인지 확인합니다.
   *
   * @param quizId 퀴즈 ID
   * @param answer 플레이어 답변 ('A', 'B', 'C', 'D' or 'true', 'false')
   * @returns 정답 여부
   * @throws NotFoundException 퀴즈를 찾을 수 없는 경우
   * @throws BadRequestException 답변 형식이 잘못된 경우
   */
  async validateAnswer(quizId: string, answer: string): Promise<boolean> {
    this.logger.log(`Validating answer: quizId=${quizId}, answer=${answer}`);

    const quiz = await this.quizRepository.findOne({
      where: { quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz not found: quizId=${quizId}`);
    }

    // 답변 형식 정규화 (대소문자 무시)
    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedCorrectAnswer = quiz.correctAnswer.toLowerCase().trim();

    // 정답 비교
    const isCorrect = normalizedAnswer === normalizedCorrectAnswer;

    this.logger.log(
      `Answer validation result: isCorrect=${isCorrect} (expected=${quiz.correctAnswer}, got=${answer})`,
    );

    return isCorrect;
  }

  /**
   * 퀴즈 답변 기록
   *
   * 플레이어의 퀴즈 답변을 이력에 저장하고 퀴즈 메트릭을 업데이트합니다.
   *
   * @param gameId 게임 ID
   * @param quizId 퀴즈 ID
   * @param answer 플레이어 답변
   * @param isCorrect 정답 여부
   * @param turnNumber 현재 턴 번호
   * @returns 생성된 QuizHistory 레코드
   * @throws NotFoundException 퀴즈를 찾을 수 없는 경우
   */
  async recordAnswer(
    gameId: string,
    quizId: string,
    answer: string,
    isCorrect: boolean,
    turnNumber: number,
  ): Promise<QuizHistory> {
    this.logger.log(
      `Recording answer: gameId=${gameId}, quizId=${quizId}, isCorrect=${isCorrect}, turnNumber=${turnNumber}`,
    );

    // 퀴즈 조회
    const quiz = await this.quizRepository.findOne({
      where: { quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz not found: quizId=${quizId}`);
    }

    // QuizHistory 생성
    const quizHistory = this.quizHistoryRepository.create({
      gameId,
      quizId,
      turnNumber,
      playerAnswer: answer,
      isCorrect,
      quizType: quiz.type,
      difficulty: quiz.difficulty,
      infraContext: quiz.infraContext,
    });

    await this.quizHistoryRepository.save(quizHistory);

    // 퀴즈 메트릭 업데이트
    await this.updateQuizMetrics(quizId, isCorrect);

    this.logger.log(
      `Answer recorded: historyId=${quizHistory.historyId}, isCorrect=${isCorrect}`,
    );

    return quizHistory;
  }

  /**
   * 퀴즈 보너스 계산
   *
   * 5개 퀴즈 중 맞춘 개수에 따라 보너스 점수를 계산합니다.
   *
   * 보너스 정책:
   * - 5개 정답: +50 points
   * - 4개 정답: +30 points
   * - 3개 정답: +15 points
   * - 2개 정답: +5 points
   * - 0-1개 정답: 0 points
   *
   * @param correctCount 맞춘 개수 (0-5)
   * @returns 보너스 점수
   * @throws BadRequestException correctCount가 0-5 범위를 벗어난 경우
   */
  calculateQuizBonus(correctCount: number): number {
    if (correctCount < 0 || correctCount > 5) {
      throw new BadRequestException(
        `Invalid correctCount: ${correctCount}. Must be between 0 and 5.`,
      );
    }

    let bonus = 0;

    if (correctCount === 5) {
      bonus = 50;
    } else if (correctCount === 4) {
      bonus = 30;
    } else if (correctCount === 3) {
      bonus = 15;
    } else if (correctCount === 2) {
      bonus = 5;
    }

    this.logger.log(
      `Quiz bonus calculated: correctCount=${correctCount}, bonus=${bonus}`,
    );

    return bonus;
  }

  /**
   * 퀴즈 통계 조회
   *
   * 전체 또는 게임별 퀴즈 통계를 조회합니다.
   *
   * @param gameId 게임 ID (선택적, 없으면 전체 통계)
   * @returns 퀴즈 통계
   */
  async getQuizStatistics(gameId?: string): Promise<QuizStatisticsDto> {
    this.logger.log(
      `Fetching quiz statistics: gameId=${gameId || 'overall'}`,
    );

    if (gameId) {
      return this.getGameQuizStatistics(gameId);
    } else {
      return this.getOverallQuizStatistics();
    }
  }

  /**
   * 전체 퀴즈 통계 조회
   *
   * @returns 전체 퀴즈 통계
   */
  private async getOverallQuizStatistics(): Promise<QuizStatisticsDto> {
    // 전체 퀴즈 수
    const totalQuizzes = await this.quizRepository.count({
      where: { isActive: true },
    });

    // 전체 답변 통계
    const answerStats = await this.quizHistoryRepository
      .createQueryBuilder('history')
      .select('COUNT(*)', 'totalAnswers')
      .addSelect('SUM(CASE WHEN history.isCorrect THEN 1 ELSE 0 END)', 'correctAnswers')
      .getRawOne();

    const totalAnswers = parseInt(answerStats?.totalAnswers || '0', 10);
    const correctAnswers = parseInt(answerStats?.correctAnswers || '0', 10);
    const accuracyRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // 평균 보너스 계산 (게임별 정답 개수 기반)
    const gameAnswers = await this.quizHistoryRepository
      .createQueryBuilder('history')
      .select('history.gameId', 'gameId')
      .addSelect('SUM(CASE WHEN history.isCorrect THEN 1 ELSE 0 END)', 'correctCount')
      .groupBy('history.gameId')
      .getRawMany();

    const bonuses = gameAnswers.map((game) =>
      this.calculateQuizBonus(parseInt(game.correctCount || '0', 10)),
    );
    const averageBonus =
      bonuses.length > 0
        ? bonuses.reduce((sum, b) => sum + b, 0) / bonuses.length
        : 0;

    // 난이도별 통계
    const byDifficulty = await this.getStatisticsByDifficulty();

    return {
      totalQuizzes,
      totalAnswers,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      averageBonus: Math.round(averageBonus * 100) / 100,
      byDifficulty,
      generatedAt: new Date(),
    };
  }

  /**
   * 게임별 퀴즈 통계 조회
   *
   * @param gameId 게임 ID
   * @returns 게임별 퀴즈 통계
   */
  private async getGameQuizStatistics(
    gameId: string,
  ): Promise<QuizStatisticsDto> {
    // 게임별 답변 통계
    const answerStats = await this.quizHistoryRepository
      .createQueryBuilder('history')
      .select('COUNT(*)', 'totalAnswers')
      .addSelect('SUM(CASE WHEN history.isCorrect THEN 1 ELSE 0 END)', 'correctAnswers')
      .where('history.gameId = :gameId', { gameId })
      .getRawOne();

    const totalAnswers = parseInt(answerStats?.totalAnswers || '0', 10);
    const correctAnswers = parseInt(answerStats?.correctAnswers || '0', 10);
    const accuracyRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // 보너스 계산
    const bonus = this.calculateQuizBonus(correctAnswers);

    // 게임에서 사용된 퀴즈 수
    const totalQuizzes = await this.quizHistoryRepository
      .createQueryBuilder('history')
      .select('COUNT(DISTINCT history.quizId)', 'count')
      .where('history.gameId = :gameId', { gameId })
      .getRawOne()
      .then((result) => parseInt(result?.count || '0', 10));

    return {
      totalQuizzes,
      totalAnswers,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      averageBonus: bonus,
      generatedAt: new Date(),
    };
  }

  /**
   * 난이도별 통계 조회
   *
   * @returns 난이도별 통계 배열
   */
  private async getStatisticsByDifficulty(): Promise<
    QuizStatisticsByDifficulty[]
  > {
    const difficulties = [
      QuizDifficulty.EASY,
      QuizDifficulty.MEDIUM,
      QuizDifficulty.HARD,
    ];

    const results: QuizStatisticsByDifficulty[] = [];

    for (const difficulty of difficulties) {
      // 난이도별 퀴즈 수
      const totalQuizzes = await this.quizRepository.count({
        where: { difficulty, isActive: true },
      });

      // 난이도별 답변 통계
      const answerStats = await this.quizHistoryRepository
        .createQueryBuilder('history')
        .select('COUNT(*)', 'totalAnswers')
        .addSelect('SUM(CASE WHEN history.isCorrect THEN 1 ELSE 0 END)', 'correctAnswers')
        .where('history.difficulty = :difficulty', { difficulty })
        .getRawOne();

      const totalAnswers = parseInt(answerStats?.totalAnswers || '0', 10);
      const correctAnswers = parseInt(answerStats?.correctAnswers || '0', 10);
      const accuracyRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      // 난이도별 평균 보너스 계산
      const gameAnswers = await this.quizHistoryRepository
        .createQueryBuilder('history')
        .select('history.gameId', 'gameId')
        .addSelect('SUM(CASE WHEN history.isCorrect THEN 1 ELSE 0 END)', 'correctCount')
        .where('history.difficulty = :difficulty', { difficulty })
        .groupBy('history.gameId')
        .getRawMany();

      const bonuses = gameAnswers.map((game) =>
        this.calculateQuizBonus(parseInt(game.correctCount || '0', 10)),
      );
      const averageBonus =
        bonuses.length > 0
          ? bonuses.reduce((sum, b) => sum + b, 0) / bonuses.length
          : 0;

      results.push({
        difficulty,
        totalQuizzes,
        totalAnswers,
        accuracyRate: Math.round(accuracyRate * 100) / 100,
        averageBonus: Math.round(averageBonus * 100) / 100,
      });
    }

    return results;
  }

  /**
   * 퀴즈 메트릭 업데이트
   *
   * 퀴즈 사용 횟수 및 정답률 메트릭을 업데이트합니다.
   *
   * @param quizId 퀴즈 ID
   * @param isCorrect 정답 여부
   */
  async updateQuizMetrics(quizId: string, isCorrect: boolean): Promise<void> {
    this.logger.debug(
      `Updating quiz metrics: quizId=${quizId}, isCorrect=${isCorrect}`,
    );

    const quiz = await this.quizRepository.findOne({
      where: { quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz not found: quizId=${quizId}`);
    }

    // 메트릭 업데이트
    quiz.usageCount += 1;
    quiz.totalAnswerCount += 1;
    if (isCorrect) {
      quiz.correctAnswerCount += 1;
    }

    await this.quizRepository.save(quiz);

    this.logger.debug(
      `Quiz metrics updated: quizId=${quizId}, usageCount=${quiz.usageCount}, accuracyRate=${quiz.accuracyRate.toFixed(2)}%`,
    );
  }
}
