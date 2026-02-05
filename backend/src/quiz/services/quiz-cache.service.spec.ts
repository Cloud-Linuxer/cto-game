import { Test, TestingModule } from '@nestjs/testing';
import { QuizCacheService, QuizCacheStats } from './quiz-cache.service';
import { Quiz, QuizDifficulty, QuizType, QuizSource } from '../../database/entities/quiz.entity';

describe('QuizCacheService', () => {
  let service: QuizCacheService;
  let mockRedis: any;

  // Sample quiz data
  const createSampleQuiz = (
    difficulty: QuizDifficulty,
    infraContext: string[] = [],
    qualityScore: number = 80,
  ): Quiz => {
    const quiz = new Quiz();
    quiz.quizId = `quiz-${Math.random().toString(36).substr(2, 9)}`;
    quiz.type = QuizType.MULTIPLE_CHOICE;
    quiz.difficulty = difficulty;
    quiz.question = 'Sample AWS question?';
    quiz.options = ['Option A', 'Option B', 'Option C', 'Option D'];
    quiz.correctAnswer = 'A';
    quiz.explanation = 'Sample explanation';
    quiz.infraContext = infraContext;
    quiz.source = QuizSource.LLM;
    quiz.qualityScore = qualityScore;
    quiz.usageCount = 0;
    quiz.correctAnswerCount = 0;
    quiz.totalAnswerCount = 0;
    quiz.isActive = true;
    quiz.createdAt = new Date();
    quiz.updatedAt = new Date();
    return quiz;
  };

  beforeEach(async () => {
    // Create mock Redis instance
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(1),
      lpush: jest.fn().mockResolvedValue(1),
      ltrim: jest.fn().mockResolvedValue('OK'),
      lrange: jest.fn().mockResolvedValue([]),
      lrem: jest.fn().mockResolvedValue(1),
      rpop: jest.fn().mockResolvedValue(null),
      llen: jest.fn().mockResolvedValue(0),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuizCacheService],
    }).compile();

    service = module.get<QuizCacheService>(QuizCacheService);

    // Inject mock Redis (skip actual Redis initialization)
    service['redis'] = mockRedis;

    // Load metrics manually
    await service['loadMetricsFromRedis']();
  });

  afterEach(async () => {
    if (service && service['redis']) {
      await service.onModuleDestroy();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Redis initialization', () => {
    it('should have mock Redis connection', () => {
      expect(service['redis']).toBeDefined();
      expect(service['redis']).toBe(mockRedis);
    });

    it('should handle Redis errors gracefully', () => {
      // Simulate error callback
      service['redis'] = null;
      expect(service['redis']).toBeNull();
    });

    it('should load metrics from Redis on initialization', async () => {
      mockRedis.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'quiz:stats:hits') return Promise.resolve('10');
        if (key === 'quiz:stats:misses') return Promise.resolve('5');
        return Promise.resolve(null);
      });

      await service['loadMetricsFromRedis']();

      expect(service['metrics'].hits).toBe(10);
      expect(service['metrics'].misses).toBe(5);
    });
  });

  describe('getCachedQuiz', () => {
    it('should return null when Redis is not available', async () => {
      service['redis'] = null;

      const result = await service.getCachedQuiz(QuizDifficulty.EASY, ['EC2']);

      expect(result).toBeNull();
      expect(service['metrics'].misses).toBe(1);
    });

    it('should return null when pool is empty', async () => {
      mockRedis.llen.mockResolvedValue(0);

      const result = await service.getCachedQuiz(QuizDifficulty.EASY, ['EC2']);

      expect(result).toBeNull();
      expect(service['metrics'].misses).toBe(1);
      expect(mockRedis.llen).toHaveBeenCalledWith('quiz:pool:EASY');
    });

    it('should return quiz from cache when available', async () => {
      const sampleQuiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);
      const cachedQuiz = { ...sampleQuiz, cachedAt: Date.now() };

      mockRedis.llen.mockResolvedValue(5);
      mockRedis.lrange.mockResolvedValue([JSON.stringify(cachedQuiz)]);
      mockRedis.lrem.mockResolvedValue(1);

      const result = await service.getCachedQuiz(QuizDifficulty.EASY, ['EC2']);

      expect(result).toBeDefined();
      expect(result?.quizId).toBe(sampleQuiz.quizId);
      expect(service['metrics'].hits).toBe(1);
    });

    it('should match quizzes by infrastructure context', async () => {
      const quiz1 = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);
      const quiz2 = createSampleQuiz(QuizDifficulty.EASY, ['Aurora', 'RDS']);
      const quiz3 = createSampleQuiz(QuizDifficulty.EASY, ['EC2', 'Aurora']);

      mockRedis.llen.mockResolvedValue(3);
      mockRedis.lrange.mockResolvedValue([
        JSON.stringify({ ...quiz1, cachedAt: Date.now() }),
        JSON.stringify({ ...quiz2, cachedAt: Date.now() }),
        JSON.stringify({ ...quiz3, cachedAt: Date.now() }),
      ]);
      mockRedis.lrem.mockResolvedValue(1);

      // Request quiz with EC2 and Aurora context
      const result = await service.getCachedQuiz(QuizDifficulty.EASY, ['EC2', 'Aurora']);

      expect(result).toBeDefined();
      // Should prioritize quiz3 (exact match)
      expect(result?.infraContext).toEqual(['EC2', 'Aurora']);
    });

    it('should trigger background refresh when pool size is below threshold', async () => {
      const sampleQuiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);
      const cachedQuiz = { ...sampleQuiz, cachedAt: Date.now() };

      mockRedis.llen.mockResolvedValue(4); // Below threshold (5)
      mockRedis.lrange.mockResolvedValue([JSON.stringify(cachedQuiz)]);
      mockRedis.lrem.mockResolvedValue(1);

      // Mock preloadQuizPool to prevent actual execution
      const preloadSpy = jest.spyOn(service, 'preloadQuizPool').mockResolvedValue();

      await service.getCachedQuiz(QuizDifficulty.EASY, ['EC2']);

      // Wait for background task to be triggered
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(preloadSpy).toHaveBeenCalledWith(QuizDifficulty.EASY, expect.any(Number));

      preloadSpy.mockRestore();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.llen.mockRejectedValue(new Error('Redis error'));

      const result = await service.getCachedQuiz(QuizDifficulty.EASY, ['EC2']);

      expect(result).toBeNull();
      expect(service['metrics'].misses).toBe(1);
    });
  });

  describe('cacheQuiz', () => {
    it('should skip caching when Redis is not available', async () => {
      service['redis'] = null;

      const quiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);

      await service.cacheQuiz(quiz);

      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });

    it('should cache valid quiz with sufficient quality score', async () => {
      const quiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2'], 80);

      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.ltrim.mockResolvedValue('OK');

      await service.cacheQuiz(quiz);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'quiz:pool:EASY',
        expect.stringContaining(quiz.quizId),
      );
      expect(mockRedis.ltrim).toHaveBeenCalledWith('quiz:pool:EASY', 0, 9); // POOL_SIZE - 1
    });

    it('should skip caching quiz with low quality score', async () => {
      const quiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2'], 50); // Below minimum (60)

      await service.cacheQuiz(quiz);

      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });

    it('should skip caching quiz with validation errors', async () => {
      const quiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);

      // Mock validator
      const mockValidator = {
        validateQuiz: jest.fn().mockResolvedValue({
          isValid: false,
          errors: ['Invalid question format'],
        }),
      };
      service['quizValidator'] = mockValidator;

      await service.cacheQuiz(quiz);

      expect(mockValidator.validateQuiz).toHaveBeenCalledWith(quiz);
      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });

    it('should handle caching errors gracefully', async () => {
      const quiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);

      mockRedis.lpush.mockRejectedValue(new Error('Redis error'));

      await expect(service.cacheQuiz(quiz)).resolves.not.toThrow();
    });
  });

  describe('preloadQuizPool', () => {
    it('should skip preloading when Redis is not available', async () => {
      service['redis'] = null;

      await service.preloadQuizPool(QuizDifficulty.EASY, 5);

      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });

    it('should skip preloading when LLM generator is not available', async () => {
      service['llmQuizGenerator'] = null;

      await service.preloadQuizPool(QuizDifficulty.EASY, 5);

      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });

    it('should generate and cache multiple quizzes', async () => {
      const mockLLMGenerator = {
        generateQuiz: jest.fn().mockImplementation((options) =>
          Promise.resolve(createSampleQuiz(options.difficulty, [], 80)),
        ),
      };

      const mockQualityScorer = {
        scoreQuiz: jest.fn().mockResolvedValue({ totalScore: 80 }),
      };

      service['llmQuizGenerator'] = mockLLMGenerator;
      service['quizQualityScorer'] = mockQualityScorer;

      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.ltrim.mockResolvedValue('OK');
      mockRedis.set.mockResolvedValue('OK');

      await service.preloadQuizPool(QuizDifficulty.EASY, 3);

      expect(mockLLMGenerator.generateQuiz).toHaveBeenCalledTimes(3);
      expect(mockQualityScorer.scoreQuiz).toHaveBeenCalledTimes(3);
      expect(mockRedis.lpush).toHaveBeenCalledTimes(3);
    });

    it('should skip quizzes with low quality scores', async () => {
      const mockLLMGenerator = {
        generateQuiz: jest.fn().mockImplementation((options) =>
          Promise.resolve(createSampleQuiz(options.difficulty, [], 50)), // Low quality
        ),
      };

      const mockQualityScorer = {
        scoreQuiz: jest.fn().mockResolvedValue({ totalScore: 50 }),
      };

      service['llmQuizGenerator'] = mockLLMGenerator;
      service['quizQualityScorer'] = mockQualityScorer;

      mockRedis.set.mockResolvedValue('OK');

      await service.preloadQuizPool(QuizDifficulty.EASY, 3);

      expect(mockLLMGenerator.generateQuiz).toHaveBeenCalledTimes(3);
      expect(mockRedis.lpush).not.toHaveBeenCalled(); // None cached due to low quality
    });

    it('should handle generation errors gracefully', async () => {
      const mockLLMGenerator = {
        generateQuiz: jest.fn().mockRejectedValue(new Error('LLM error')),
      };

      service['llmQuizGenerator'] = mockLLMGenerator;
      mockRedis.set.mockResolvedValue('OK');

      await expect(
        service.preloadQuizPool(QuizDifficulty.EASY, 2),
      ).resolves.not.toThrow();

      expect(mockLLMGenerator.generateQuiz).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    it('should clear all quiz pools and statistics', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.clearCache();

      expect(mockRedis.del).toHaveBeenCalledWith('quiz:pool:EASY');
      expect(mockRedis.del).toHaveBeenCalledWith('quiz:pool:MEDIUM');
      expect(mockRedis.del).toHaveBeenCalledWith('quiz:pool:HARD');
      expect(mockRedis.del).toHaveBeenCalledWith('quiz:stats:hits');
      expect(mockRedis.del).toHaveBeenCalledWith('quiz:stats:misses');
      expect(mockRedis.del).toHaveBeenCalledWith('quiz:stats:refresh');

      expect(service['metrics'].hits).toBe(0);
      expect(service['metrics'].misses).toBe(0);
    });

    it('should handle clear errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.clearCache()).resolves.not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.llen.mockImplementation((key: string) => {
        if (key === 'quiz:pool:EASY') return Promise.resolve(8);
        if (key === 'quiz:pool:MEDIUM') return Promise.resolve(6);
        if (key === 'quiz:pool:HARD') return Promise.resolve(4);
        return Promise.resolve(0);
      });

      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'quiz:stats:refresh') return Promise.resolve(Date.now().toString());
        return Promise.resolve(null);
      });

      service['metrics'].hits = 75;
      service['metrics'].misses = 25;

      const stats: QuizCacheStats = await service.getCacheStats();

      expect(stats.hits).toBe(75);
      expect(stats.misses).toBe(25);
      expect(stats.hitRate).toBe(75); // 75%
      expect(stats.poolSizes.EASY).toBe(8);
      expect(stats.poolSizes.MEDIUM).toBe(6);
      expect(stats.poolSizes.HARD).toBe(4);
      expect(stats.totalCached).toBe(18);
      expect(stats.lastRefresh).toBeInstanceOf(Date);
    });

    it('should handle zero stats gracefully', async () => {
      mockRedis.llen.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue(null);

      service['metrics'].hits = 0;
      service['metrics'].misses = 0;

      const stats: QuizCacheStats = await service.getCacheStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.totalCached).toBe(0);
    });
  });

  describe('calculateMatchScore', () => {
    it('should return 0 for empty contexts', () => {
      const score = service['calculateMatchScore']([], ['EC2']);
      expect(score).toBe(0);
    });

    it('should return 0 when no game context', () => {
      const score = service['calculateMatchScore'](['EC2'], []);
      expect(score).toBe(0);
    });

    it('should return 100 for exact match', () => {
      const score = service['calculateMatchScore'](['EC2', 'Aurora'], ['EC2', 'Aurora']);
      expect(score).toBe(100);
    });

    it('should return partial score for partial match', () => {
      const score = service['calculateMatchScore'](['EC2', 'Aurora'], ['EC2']);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should handle case-insensitive matching', () => {
      const score1 = service['calculateMatchScore'](['EC2'], ['ec2']);
      const score2 = service['calculateMatchScore'](['EC2'], ['EC2']);
      expect(score1).toBe(score2);
    });
  });

  describe('setDependencies', () => {
    it('should set service dependencies', () => {
      const mockLLMGenerator = { generateQuiz: jest.fn() };
      const mockValidator = { validateQuiz: jest.fn() };
      const mockScorer = { scoreQuiz: jest.fn() };

      service.setDependencies(mockLLMGenerator, mockValidator, mockScorer);

      expect(service['llmQuizGenerator']).toBe(mockLLMGenerator);
      expect(service['quizValidator']).toBe(mockValidator);
      expect(service['quizQualityScorer']).toBe(mockScorer);
    });
  });

  describe('findBestMatchQuiz', () => {
    it('should select quiz with highest match score', async () => {
      const quiz1 = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);
      const quiz2 = createSampleQuiz(QuizDifficulty.EASY, ['Aurora']);
      const quiz3 = createSampleQuiz(QuizDifficulty.EASY, ['EC2', 'Aurora']);

      mockRedis.lrange.mockResolvedValue([
        JSON.stringify({ ...quiz1, cachedAt: Date.now() }),
        JSON.stringify({ ...quiz2, cachedAt: Date.now() }),
        JSON.stringify({ ...quiz3, cachedAt: Date.now() }),
      ]);
      mockRedis.lrem.mockResolvedValue(1);

      const result = await service['findBestMatchQuiz'](
        'quiz:pool:EASY',
        ['EC2', 'Aurora'],
        3,
      );

      expect(result).toBeDefined();
      expect(result?.infraContext).toEqual(['EC2', 'Aurora']); // Exact match
      expect(mockRedis.lrem).toHaveBeenCalled();
    });

    it('should fallback to RPOP on error', async () => {
      const sampleQuiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);

      mockRedis.lrange.mockRejectedValue(new Error('Redis error'));
      mockRedis.rpop.mockResolvedValue(JSON.stringify({ ...sampleQuiz, cachedAt: Date.now() }) as any);

      const result = await service['findBestMatchQuiz'](
        'quiz:pool:EASY',
        ['EC2'],
        1,
      );

      expect(result).toBeDefined();
      expect(mockRedis.rpop).toHaveBeenCalledWith('quiz:pool:EASY');
    });
  });

  describe('pool size management', () => {
    it('should maintain pool size limit', async () => {
      const quiz = createSampleQuiz(QuizDifficulty.EASY, ['EC2']);

      mockRedis.lpush.mockResolvedValue(1);
      mockRedis.ltrim.mockResolvedValue('OK');

      await service.cacheQuiz(quiz);

      expect(mockRedis.ltrim).toHaveBeenCalledWith('quiz:pool:EASY', 0, 9); // Max 10 items
    });
  });

  describe('Redis key generation', () => {
    it('should generate correct pool keys', () => {
      expect(service['getPoolKey'](QuizDifficulty.EASY)).toBe('quiz:pool:EASY');
      expect(service['getPoolKey'](QuizDifficulty.MEDIUM)).toBe('quiz:pool:MEDIUM');
      expect(service['getPoolKey'](QuizDifficulty.HARD)).toBe('quiz:pool:HARD');
    });
  });

  describe('entity conversion', () => {
    it('should convert cached quiz to Quiz entity', () => {
      const cachedQuiz: any = {
        quizId: 'test-id',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.EASY,
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: 'Test explanation',
        infraContext: ['EC2'],
        source: QuizSource.LLM,
        qualityScore: 80,
        usageCount: 0,
        correctAnswerCount: 0,
        totalAnswerCount: 0,
        isActive: true,
        cachedAt: Date.now(),
      };

      const quiz = service['convertCachedQuizToQuiz'](cachedQuiz);

      expect(quiz).toBeInstanceOf(Quiz);
      expect(quiz.quizId).toBe('test-id');
      expect(quiz.difficulty).toBe(QuizDifficulty.EASY);
      expect(quiz.createdAt).toBeInstanceOf(Date);
      expect(quiz.updatedAt).toBeInstanceOf(Date);
    });
  });
});
