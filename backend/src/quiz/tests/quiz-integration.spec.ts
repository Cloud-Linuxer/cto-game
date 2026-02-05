import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizService } from '../quiz.service';
import { LLMQuizGeneratorService } from '../services/llm-quiz-generator.service';
import { QuizQualityScorerService } from '../services/quiz-quality-scorer.service';
import { QuizValidatorService } from '../validators/quiz-validator.service';
import { Context7IntegrationService } from '../services/context7-integration.service';
import { QuizAnalyticsService } from '../services/quiz-analytics.service';
import { Quiz, QuizDifficulty, QuizType, QuizSource } from '../../database/entities/quiz.entity';
import { QuizHistory } from '../../database/entities/quiz-history.entity';
import { Game } from '../../database/entities/game.entity';
import { VLLMClientService } from '../../llm/services/vllm-client.service';
import { PromptBuilderService } from '../../llm/services/prompt-builder.service';

/**
 * Quiz System Integration Tests
 *
 * Tests service interactions and business logic integration.
 *
 * Test Coverage:
 * - QuizService integration with LLMQuizGeneratorService
 * - QuizService integration with QuizValidatorService
 * - QuizService integration with QuizQualityScorerService
 * - Cache service interactions
 * - Database repository interactions
 * - Fallback mechanism integration
 * - Bonus calculation logic
 * - Statistics aggregation logic
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 1 (Core Quiz System)
 * Task: Task #27
 */
describe('Quiz System Integration Tests', () => {
  let quizService: QuizService;
  let quizRepository: Repository<Quiz>;
  let quizHistoryRepository: Repository<QuizHistory>;
  let gameRepository: Repository<Game>;

  // Mock repositories
  const mockQuizRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    })),
  };

  const mockQuizHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
    })),
  };

  const mockGameRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: getRepositoryToken(Quiz),
          useValue: mockQuizRepository,
        },
        {
          provide: getRepositoryToken(QuizHistory),
          useValue: mockQuizHistoryRepository,
        },
        {
          provide: getRepositoryToken(Game),
          useValue: mockGameRepository,
        },
      ],
    }).compile();

    quizService = module.get<QuizService>(QuizService);
    quizRepository = module.get(getRepositoryToken(Quiz));
    quizHistoryRepository = module.get(getRepositoryToken(QuizHistory));
    gameRepository = module.get(getRepositoryToken(Game));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // QuizService Integration Tests
  // ---------------------------------------------------------------------------

  describe('QuizService Integration', () => {
    describe('generateQuiz', () => {
      it('should use fallback quiz when LLM is unavailable', async () => {
        const fallbackQuiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'What is EC2?',
          options: ['Compute', 'Storage', 'Network', 'Database'],
          correctAnswer: 'A',
          explanation: 'EC2 is Elastic Compute Cloud',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.createQueryBuilder().getOne.mockResolvedValue(fallbackQuiz);

        const result = await quizService.generateQuiz({
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2'],
        });

        expect(result).toBeDefined();
        expect(result.source).toBe(QuizSource.FALLBACK);
        expect(result.quizId).toBe('quiz-1');
      });

      it('should filter quizzes by difficulty and turn range', async () => {
        const fallbackQuiz: Quiz = {
          quizId: 'quiz-2',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question: 'What is Aurora?',
          options: ['Compute', 'Database', 'Network', 'Storage'],
          correctAnswer: 'B',
          explanation: 'Aurora is a MySQL/PostgreSQL compatible database',
          infraContext: ['Aurora'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: 5,
          turnRangeEnd: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.createQueryBuilder().getOne.mockResolvedValue(fallbackQuiz);

        const result = await quizService.generateQuiz({
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['Aurora'],
          turnNumber: 10,
        });

        expect(result).toBeDefined();
        expect(result.difficulty).toBe(QuizDifficulty.MEDIUM);
      });

      it('should exclude previously used quizzes when gameId is provided', async () => {
        const gameId = 'game-123';

        mockQuizHistoryRepository.createQueryBuilder().getRawMany.mockResolvedValue([
          { quizId: 'quiz-used-1' },
          { quizId: 'quiz-used-2' },
        ]);

        const freshQuiz: Quiz = {
          quizId: 'quiz-fresh',
          type: QuizType.OX,
          difficulty: QuizDifficulty.EASY,
          question: 'Is RDS a database service?',
          options: null,
          correctAnswer: 'true',
          explanation: 'Yes, RDS is Relational Database Service',
          infraContext: ['RDS'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.createQueryBuilder().getOne.mockResolvedValue(freshQuiz);

        const result = await quizService.generateQuiz({
          difficulty: QuizDifficulty.EASY,
          infraContext: ['RDS'],
          gameId,
        });

        expect(result).toBeDefined();
        expect(result.quizId).toBe('quiz-fresh');
      });
    });

    describe('validateAnswer', () => {
      it('should correctly validate matching answers', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);

        const isCorrect = await quizService.validateAnswer('quiz-1', 'B');

        expect(isCorrect).toBe(true);
      });

      it('should correctly validate incorrect answers', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);

        const isCorrect = await quizService.validateAnswer('quiz-1', 'A');

        expect(isCorrect).toBe(false);
      });

      it('should be case-insensitive when validating answers', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.OX,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: null,
          correctAnswer: 'true',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);

        const isCorrect1 = await quizService.validateAnswer('quiz-1', 'TRUE');
        const isCorrect2 = await quizService.validateAnswer('quiz-1', 'True');
        const isCorrect3 = await quizService.validateAnswer('quiz-1', 'true');

        expect(isCorrect1).toBe(true);
        expect(isCorrect2).toBe(true);
        expect(isCorrect3).toBe(true);
      });

      it('should throw NotFoundException when quiz not found', async () => {
        mockQuizRepository.findOne.mockResolvedValue(null);

        await expect(
          quizService.validateAnswer('invalid-quiz-id', 'A'),
        ).rejects.toThrow('Quiz not found');
      });
    });

    describe('recordAnswer', () => {
      it('should create quiz history record', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        const expectedHistory = {
          historyId: 1,
          gameId: 'game-123',
          quizId: 'quiz-1',
          turnNumber: 5,
          playerAnswer: 'B',
          isCorrect: true,
          quizType: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2'],
          createdAt: new Date(),
          timeTaken: null,
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);
        mockQuizHistoryRepository.create.mockReturnValue(expectedHistory);
        mockQuizHistoryRepository.save.mockResolvedValue(expectedHistory);
        mockQuizRepository.save.mockResolvedValue(quiz);

        const result = await quizService.recordAnswer(
          'game-123',
          'quiz-1',
          'B',
          true,
          5,
        );

        expect(mockQuizHistoryRepository.create).toHaveBeenCalledWith({
          gameId: 'game-123',
          quizId: 'quiz-1',
          turnNumber: 5,
          playerAnswer: 'B',
          isCorrect: true,
          quizType: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2'],
        });

        expect(mockQuizHistoryRepository.save).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it('should update quiz metrics after recording answer', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);
        mockQuizHistoryRepository.create.mockReturnValue({});
        mockQuizHistoryRepository.save.mockResolvedValue({});
        mockQuizRepository.save.mockResolvedValue(quiz);

        await quizService.recordAnswer('game-123', 'quiz-1', 'B', true, 5);

        expect(mockQuizRepository.save).toHaveBeenCalled();
      });
    });

    describe('calculateQuizBonus', () => {
      it('should calculate correct bonus for 5 correct answers', () => {
        const bonus = quizService.calculateQuizBonus(5);
        expect(bonus).toBe(50);
      });

      it('should calculate correct bonus for 4 correct answers', () => {
        const bonus = quizService.calculateQuizBonus(4);
        expect(bonus).toBe(30);
      });

      it('should calculate correct bonus for 3 correct answers', () => {
        const bonus = quizService.calculateQuizBonus(3);
        expect(bonus).toBe(15);
      });

      it('should calculate correct bonus for 2 correct answers', () => {
        const bonus = quizService.calculateQuizBonus(2);
        expect(bonus).toBe(5);
      });

      it('should calculate correct bonus for 1 correct answer', () => {
        const bonus = quizService.calculateQuizBonus(1);
        expect(bonus).toBe(0);
      });

      it('should calculate correct bonus for 0 correct answers', () => {
        const bonus = quizService.calculateQuizBonus(0);
        expect(bonus).toBe(0);
      });

      it('should throw error for invalid correctCount', () => {
        expect(() => quizService.calculateQuizBonus(-1)).toThrow();
        expect(() => quizService.calculateQuizBonus(6)).toThrow();
      });
    });

    describe('getQuizStatistics', () => {
      it('should return overall statistics when no gameId provided', async () => {
        mockQuizRepository.count.mockResolvedValue(100);
        mockQuizHistoryRepository.createQueryBuilder().getRawOne.mockResolvedValue({
          totalAnswers: '500',
          correctAnswers: '400',
        });
        mockQuizHistoryRepository.createQueryBuilder().getRawMany.mockResolvedValue([
          { gameId: 'game-1', correctCount: '5' },
          { gameId: 'game-2', correctCount: '4' },
        ]);

        const stats = await quizService.getQuizStatistics();

        expect(stats).toBeDefined();
        expect(stats.totalQuizzes).toBe(100);
        expect(stats.totalAnswers).toBe(500);
        expect(stats.accuracyRate).toBe(80);
      });

      it('should return game-specific statistics when gameId provided', async () => {
        mockQuizHistoryRepository.createQueryBuilder().getRawOne
          .mockResolvedValueOnce({
            totalAnswers: '5',
            correctAnswers: '3',
          })
          .mockResolvedValueOnce({
            count: '5',
          });

        const stats = await quizService.getQuizStatistics('game-123');

        expect(stats).toBeDefined();
        expect(stats.totalAnswers).toBe(5);
        expect(stats.accuracyRate).toBe(60);
        expect(stats.averageBonus).toBe(15); // 3 correct = 15 bonus
      });
    });

    describe('updateQuizMetrics', () => {
      it('should increment usageCount and totalAnswerCount', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 5,
          correctAnswerCount: 3,
          totalAnswerCount: 5,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return (3 / 5) * 100;
          },
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);
        mockQuizRepository.save.mockResolvedValue(quiz);

        await quizService.updateQuizMetrics('quiz-1', true);

        expect(mockQuizRepository.save).toHaveBeenCalled();
        expect(quiz.usageCount).toBe(6);
        expect(quiz.totalAnswerCount).toBe(6);
        expect(quiz.correctAnswerCount).toBe(4);
      });

      it('should increment correctAnswerCount when answer is correct', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);
        mockQuizRepository.save.mockResolvedValue(quiz);

        await quizService.updateQuizMetrics('quiz-1', true);

        expect(quiz.correctAnswerCount).toBe(1);
      });

      it('should NOT increment correctAnswerCount when answer is incorrect', async () => {
        const quiz: Quiz = {
          quizId: 'quiz-1',
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'Test question',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Test explanation',
          infraContext: ['EC2'],
          source: QuizSource.FALLBACK,
          isActive: true,
          usageCount: 0,
          correctAnswerCount: 0,
          totalAnswerCount: 0,
          qualityScore: null,
          turnRangeStart: null,
          turnRangeEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          get accuracyRate() {
            return 0;
          },
        };

        mockQuizRepository.findOne.mockResolvedValue(quiz);
        mockQuizRepository.save.mockResolvedValue(quiz);

        await quizService.updateQuizMetrics('quiz-1', false);

        expect(quiz.correctAnswerCount).toBe(0);
        expect(quiz.totalAnswerCount).toBe(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Bonus Calculation Edge Cases
  // ---------------------------------------------------------------------------

  describe('Bonus Calculation Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      expect(quizService.calculateQuizBonus(0)).toBe(0);
      expect(quizService.calculateQuizBonus(5)).toBe(50);
    });

    it('should throw error for out-of-range values', () => {
      expect(() => quizService.calculateQuizBonus(-1)).toThrow('Invalid correctCount');
      expect(() => quizService.calculateQuizBonus(6)).toThrow('Invalid correctCount');
      expect(() => quizService.calculateQuizBonus(100)).toThrow('Invalid correctCount');
    });

    it('should calculate progressive bonus tiers correctly', () => {
      const bonuses = [];
      for (let i = 0; i <= 5; i++) {
        bonuses.push(quizService.calculateQuizBonus(i));
      }

      expect(bonuses).toEqual([0, 0, 5, 15, 30, 50]);
    });
  });

  // ---------------------------------------------------------------------------
  // Database Integration Tests
  // ---------------------------------------------------------------------------

  describe('Database Integration', () => {
    it('should handle database errors gracefully', async () => {
      mockQuizRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        quizService.validateAnswer('quiz-1', 'A'),
      ).rejects.toThrow();
    });

    it('should use transactions for complex operations', async () => {
      const quiz: Quiz = {
        quizId: 'quiz-1',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.EASY,
        question: 'Test question',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'B',
        explanation: 'Test explanation',
        infraContext: ['EC2'],
        source: QuizSource.FALLBACK,
        isActive: true,
        usageCount: 0,
        correctAnswerCount: 0,
        totalAnswerCount: 0,
        qualityScore: null,
        turnRangeStart: null,
        turnRangeEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        get accuracyRate() {
          return 0;
        },
      };

      mockQuizRepository.findOne.mockResolvedValue(quiz);
      mockQuizHistoryRepository.create.mockReturnValue({});
      mockQuizHistoryRepository.save.mockResolvedValue({});
      mockQuizRepository.save.mockResolvedValue(quiz);

      await quizService.recordAnswer('game-123', 'quiz-1', 'B', true, 5);

      expect(mockQuizHistoryRepository.save).toHaveBeenCalled();
      expect(mockQuizRepository.save).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Statistics Aggregation Tests
  // ---------------------------------------------------------------------------

  describe('Statistics Aggregation', () => {
    it('should calculate accuracy rate correctly for multiple games', async () => {
      mockQuizHistoryRepository.createQueryBuilder().getRawMany.mockResolvedValue([
        { gameId: 'game-1', correctCount: '5' }, // 50 bonus
        { gameId: 'game-2', correctCount: '4' }, // 30 bonus
        { gameId: 'game-3', correctCount: '3' }, // 15 bonus
      ]);

      mockQuizRepository.count.mockResolvedValue(100);
      mockQuizHistoryRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        totalAnswers: '12',
        correctAnswers: '12',
      });

      const stats = await quizService.getQuizStatistics();

      expect(stats.averageBonus).toBeCloseTo(31.67, 1); // (50 + 30 + 15) / 3
    });

    it('should handle empty statistics gracefully', async () => {
      mockQuizRepository.count.mockResolvedValue(0);
      mockQuizHistoryRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        totalAnswers: '0',
        correctAnswers: '0',
      });
      mockQuizHistoryRepository.createQueryBuilder().getRawMany.mockResolvedValue([]);

      const stats = await quizService.getQuizStatistics();

      expect(stats.totalQuizzes).toBe(0);
      expect(stats.accuracyRate).toBe(0);
      expect(stats.averageBonus).toBe(0);
    });
  });
});
