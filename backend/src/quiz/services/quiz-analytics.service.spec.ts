import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuizAnalyticsService } from './quiz-analytics.service';
import { Quiz, QuizDifficulty, QuizType } from '../../database/entities/quiz.entity';
import { QuizHistory } from '../../database/entities/quiz-history.entity';
import { Game } from '../../database/entities/game.entity';
import { NotFoundException } from '@nestjs/common';
import { QuestionQualityFlag } from '../dto/question-quality.dto';

describe('QuizAnalyticsService', () => {
  let service: QuizAnalyticsService;
  let quizRepository: Repository<Quiz>;
  let quizHistoryRepository: Repository<QuizHistory>;
  let gameRepository: Repository<Game>;

  // Mock repositories
  const mockQuizRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockQuizHistoryRepository = {
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockGameRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizAnalyticsService,
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

    service = module.get<QuizAnalyticsService>(QuizAnalyticsService);
    quizRepository = module.get<Repository<Quiz>>(getRepositoryToken(Quiz));
    quizHistoryRepository = module.get<Repository<QuizHistory>>(
      getRepositoryToken(QuizHistory),
    );
    gameRepository = module.get<Repository<Game>>(getRepositoryToken(Game));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverallStatistics', () => {
    it('should return overall statistics with accurate calculations', async () => {
      // Arrange
      mockQuizRepository.count.mockResolvedValue(250);
      mockQuizHistoryRepository.count
        .mockResolvedValueOnce(1250) // totalAnswers
        .mockResolvedValueOnce(875); // correctAnswers
      mockGameRepository.find.mockResolvedValue([
        { quizBonus: 40 },
        { quizBonus: 30 },
        { quizBonus: 50 },
        { quizBonus: 20 },
      ]);

      // Act
      const result = await service.getOverallStatistics();

      // Assert
      expect(result).toEqual({
        totalQuizzes: 250,
        totalAnswers: 1250,
        correctAnswers: 875,
        accuracyRate: 70.0,
        averageBonus: 35.0,
      });

      expect(mockQuizRepository.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockQuizHistoryRepository.count).toHaveBeenCalledTimes(2);
      expect(mockGameRepository.find).toHaveBeenCalledWith({
        select: ['quizBonus'],
      });
    });

    it('should handle zero answers scenario', async () => {
      // Arrange
      mockQuizRepository.count.mockResolvedValue(100);
      mockQuizHistoryRepository.count
        .mockResolvedValueOnce(0) // totalAnswers
        .mockResolvedValueOnce(0); // correctAnswers
      mockGameRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getOverallStatistics();

      // Assert
      expect(result.accuracyRate).toBe(0);
      expect(result.averageBonus).toBe(0);
    });

    it('should handle games with null quizBonus', async () => {
      // Arrange
      mockQuizRepository.count.mockResolvedValue(50);
      mockQuizHistoryRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60);
      mockGameRepository.find.mockResolvedValue([
        { quizBonus: 30 },
        { quizBonus: null },
        { quizBonus: 40 },
      ]);

      // Act
      const result = await service.getOverallStatistics();

      // Assert
      expect(result.averageBonus).toBe(23.3); // (30 + 0 + 40) / 3
    });
  });

  describe('getDifficultyStatistics', () => {
    it('should return difficulty-specific statistics with most missed questions', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const mockQuizzes: Partial<Quiz>[] = [
        {
          quizId: 'quiz-1',
          question: 'What is EC2?',
          difficulty: QuizDifficulty.MEDIUM,
          totalAnswerCount: 20,
          correctAnswerCount: 15,
        },
        {
          quizId: 'quiz-2',
          question: 'What is Aurora?',
          difficulty: QuizDifficulty.MEDIUM,
          totalAnswerCount: 30,
          correctAnswerCount: 10,
        },
        {
          quizId: 'quiz-3',
          question: 'What is EKS?',
          difficulty: QuizDifficulty.MEDIUM,
          totalAnswerCount: 10,
          correctAnswerCount: 8,
        },
      ];

      const mockHistory: Partial<QuizHistory>[] = [
        { quizId: 'quiz-1', isCorrect: true },
        { quizId: 'quiz-1', isCorrect: false },
        { quizId: 'quiz-2', isCorrect: false },
        { quizId: 'quiz-2', isCorrect: false },
      ];

      mockQuizRepository.find.mockResolvedValue(mockQuizzes);
      mockQuizHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getDifficultyStatistics(difficulty);

      // Assert
      expect(result.difficulty).toBe(difficulty);
      expect(result.totalQuizzes).toBe(3);
      expect(result.totalAnswers).toBe(4);
      expect(result.correctAnswers).toBe(1);
      expect(result.accuracyRate).toBe(25.0);
      expect(result.mostMissedQuestions).toHaveLength(3);
      expect(result.mostMissedQuestions[0].quizId).toBe('quiz-2'); // 66.67% miss rate
      expect(result.mostMissedQuestions[0].missRate).toBe(66.67);
    });

    it('should filter out questions with less than 5 attempts from most missed', async () => {
      // Arrange
      const mockQuizzes: Partial<Quiz>[] = [
        {
          quizId: 'quiz-1',
          question: 'Question 1',
          totalAnswerCount: 10,
          correctAnswerCount: 2,
        },
        {
          quizId: 'quiz-2',
          question: 'Question 2',
          totalAnswerCount: 3, // Less than 5
          correctAnswerCount: 0,
        },
      ];

      mockQuizRepository.find.mockResolvedValue(mockQuizzes);
      mockQuizHistoryRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifficultyStatistics(
        QuizDifficulty.EASY,
      );

      // Assert
      expect(result.mostMissedQuestions).toHaveLength(1);
      expect(result.mostMissedQuestions[0].quizId).toBe('quiz-1');
    });

    it('should handle empty quiz list for difficulty', async () => {
      // Arrange
      mockQuizRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifficultyStatistics(
        QuizDifficulty.HARD,
      );

      // Assert
      expect(result.totalQuizzes).toBe(0);
      expect(result.totalAnswers).toBe(0);
      expect(result.accuracyRate).toBe(0);
      expect(result.mostMissedQuestions).toHaveLength(0);
    });

    it('should truncate long question text to 100 characters', async () => {
      // Arrange
      const longQuestion = 'A'.repeat(150);
      const mockQuizzes: Partial<Quiz>[] = [
        {
          quizId: 'quiz-1',
          question: longQuestion,
          totalAnswerCount: 10,
          correctAnswerCount: 5,
        },
      ];

      mockQuizRepository.find.mockResolvedValue(mockQuizzes);
      mockQuizHistoryRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifficultyStatistics(
        QuizDifficulty.MEDIUM,
      );

      // Assert
      expect(result.mostMissedQuestions[0].question).toHaveLength(103); // 100 + '...'
      expect(result.mostMissedQuestions[0].question.endsWith('...')).toBe(true);
    });
  });

  describe('getQuestionQualityMetrics', () => {
    it('should return quality metrics for all quizzes', async () => {
      // Arrange
      const mockQuizzes: Partial<Quiz>[] = [
        {
          quizId: 'quiz-1',
          question: 'Easy question',
          difficulty: QuizDifficulty.EASY,
          type: QuizType.MULTIPLE_CHOICE,
          usageCount: 50,
          totalAnswerCount: 50,
          correctAnswerCount: 45, // 90% - TOO_EASY
          infraContext: ['EC2', 'S3'],
          createdAt: new Date('2026-02-01'),
        },
        {
          quizId: 'quiz-2',
          question: 'Hard question',
          difficulty: QuizDifficulty.HARD,
          type: QuizType.OX,
          usageCount: 30,
          totalAnswerCount: 30,
          correctAnswerCount: 6, // 20% - TOO_HARD
          infraContext: ['EKS', 'Aurora'],
          createdAt: new Date('2026-02-02'),
        },
        {
          quizId: 'quiz-3',
          question: 'Balanced question',
          difficulty: QuizDifficulty.MEDIUM,
          type: QuizType.MULTIPLE_CHOICE,
          usageCount: 40,
          totalAnswerCount: 40,
          correctAnswerCount: 28, // 70% - BALANCED
          infraContext: ['ALB', 'Aurora'],
          createdAt: new Date('2026-02-03'),
        },
        {
          quizId: 'quiz-4',
          question: 'New question',
          difficulty: QuizDifficulty.EASY,
          type: QuizType.OX,
          usageCount: 5,
          totalAnswerCount: 5, // Less than 10 - INSUFFICIENT_DATA
          correctAnswerCount: 4,
          infraContext: ['EC2'],
          createdAt: new Date('2026-02-04'),
        },
      ];

      mockQuizRepository.find.mockResolvedValue(mockQuizzes);

      // Act
      const result = await service.getQuestionQualityMetrics();

      // Assert
      expect(result).toHaveLength(4);

      // Check TOO_EASY flag
      const easyQuiz = result.find((q) => q.quizId === 'quiz-1');
      expect(easyQuiz.qualityFlag).toBe(QuestionQualityFlag.TOO_EASY);
      expect(easyQuiz.accuracyRate).toBe(90.0);

      // Check TOO_HARD flag
      const hardQuiz = result.find((q) => q.quizId === 'quiz-2');
      expect(hardQuiz.qualityFlag).toBe(QuestionQualityFlag.TOO_HARD);
      expect(hardQuiz.accuracyRate).toBe(20.0);

      // Check BALANCED flag
      const balancedQuiz = result.find((q) => q.quizId === 'quiz-3');
      expect(balancedQuiz.qualityFlag).toBe(QuestionQualityFlag.BALANCED);
      expect(balancedQuiz.accuracyRate).toBe(70.0);

      // Check INSUFFICIENT_DATA flag
      const newQuiz = result.find((q) => q.quizId === 'quiz-4');
      expect(newQuiz.qualityFlag).toBe(
        QuestionQualityFlag.INSUFFICIENT_DATA,
      );
      expect(newQuiz.accuracyRate).toBe(80.0); // Has data but less than 10
    });

    it('should handle quizzes with zero answers', async () => {
      // Arrange
      const mockQuizzes: Partial<Quiz>[] = [
        {
          quizId: 'quiz-1',
          question: 'Unused question',
          difficulty: QuizDifficulty.EASY,
          type: QuizType.OX,
          usageCount: 0,
          totalAnswerCount: 0,
          correctAnswerCount: 0,
          infraContext: [],
          createdAt: new Date(),
        },
      ];

      mockQuizRepository.find.mockResolvedValue(mockQuizzes);

      // Act
      const result = await service.getQuestionQualityMetrics();

      // Assert
      expect(result[0].accuracyRate).toBeNull();
      expect(result[0].qualityFlag).toBe(
        QuestionQualityFlag.INSUFFICIENT_DATA,
      );
    });

    it('should request quizzes sorted by usage count descending', async () => {
      // Arrange
      // Mock repository already returns sorted data (order: DESC on usageCount)
      const mockQuizzes: Partial<Quiz>[] = [
        {
          quizId: 'quiz-2',
          question: 'Q2',
          usageCount: 50,
          totalAnswerCount: 50,
          correctAnswerCount: 25,
          infraContext: [],
          createdAt: new Date(),
        },
        {
          quizId: 'quiz-3',
          question: 'Q3',
          usageCount: 30,
          totalAnswerCount: 30,
          correctAnswerCount: 15,
          infraContext: [],
          createdAt: new Date(),
        },
        {
          quizId: 'quiz-1',
          question: 'Q1',
          usageCount: 10,
          totalAnswerCount: 10,
          correctAnswerCount: 5,
          infraContext: [],
          createdAt: new Date(),
        },
      ];

      mockQuizRepository.find.mockResolvedValue(mockQuizzes);

      // Act
      const result = await service.getQuestionQualityMetrics();

      // Assert
      expect(mockQuizRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { usageCount: 'DESC' },
      });
      expect(result[0].usageCount).toBe(50);
      expect(result[1].usageCount).toBe(30);
      expect(result[2].usageCount).toBe(10);
    });
  });

  describe('getPlayerInsights', () => {
    it('should return comprehensive player insights', async () => {
      // Arrange
      const gameId = 'game-123';
      const mockGame: Partial<Game> = {
        gameId,
        correctQuizCount: 4,
        quizBonus: 40,
      };

      const mockHistory: Partial<QuizHistory>[] = [
        {
          turnNumber: 5,
          isCorrect: true,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2', 'S3'],
        },
        {
          turnNumber: 10,
          isCorrect: false,
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['Aurora'],
        },
        {
          turnNumber: 15,
          isCorrect: true,
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['EC2', 'ALB'],
        },
        {
          turnNumber: 20,
          isCorrect: true,
          difficulty: QuizDifficulty.HARD,
          infraContext: ['EKS', 'Aurora'],
        },
        {
          turnNumber: 25,
          isCorrect: true,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['S3'],
        },
      ];

      mockGameRepository.findOne.mockResolvedValue(mockGame);
      mockQuizHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getPlayerInsights(gameId);

      // Assert
      expect(result.gameId).toBe(gameId);
      expect(result.totalQuizzes).toBe(5);
      expect(result.correctCount).toBe(4);
      expect(result.accuracyRate).toBe(80.0);
      expect(result.quizBonus).toBe(40);

      // Check learning curve
      expect(result.learningCurve).toHaveLength(5);
      expect(result.learningCurve[0].cumulativeAccuracy).toBe(100.0); // 1/1
      expect(result.learningCurve[1].cumulativeAccuracy).toBe(50.0); // 1/2
      expect(result.learningCurve[4].cumulativeAccuracy).toBe(80.0); // 4/5

      // Check context performance (best 3)
      expect(result.bestPerformingContexts.length).toBeLessThanOrEqual(3);
      expect(result.bestPerformingContexts[0]).toHaveProperty('context');
      expect(result.bestPerformingContexts[0]).toHaveProperty('accuracy');
      expect(result.bestPerformingContexts[0]).toHaveProperty('totalQuestions');

      // Check difficulty accuracy
      expect(result.difficultyAccuracy.EASY).toBe(100.0); // 2/2
      expect(result.difficultyAccuracy.MEDIUM).toBe(50.0); // 1/2
      expect(result.difficultyAccuracy.HARD).toBe(100.0); // 1/1

      // Check recommendations exist
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when game does not exist', async () => {
      // Arrange
      const gameId = 'non-existent-game';
      mockGameRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPlayerInsights(gameId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPlayerInsights(gameId)).rejects.toThrow(
        `Game ${gameId} not found`,
      );
    });

    it('should handle game with no quiz history', async () => {
      // Arrange
      const gameId = 'game-no-quiz';
      const mockGame: Partial<Game> = {
        gameId,
        correctQuizCount: 0,
        quizBonus: 0,
      };

      mockGameRepository.findOne.mockResolvedValue(mockGame);
      mockQuizHistoryRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getPlayerInsights(gameId);

      // Assert
      expect(result.totalQuizzes).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.accuracyRate).toBe(0);
      expect(result.learningCurve).toHaveLength(0);
      expect(result.bestPerformingContexts).toHaveLength(0);
      expect(result.recommendations).toContain(
        'Complete at least one quiz to see insights',
      );
    });

    it('should calculate context performance correctly', async () => {
      // Arrange
      const gameId = 'game-context-test';
      const mockGame: Partial<Game> = {
        gameId,
        correctQuizCount: 3,
        quizBonus: 30,
      };

      const mockHistory: Partial<QuizHistory>[] = [
        {
          turnNumber: 5,
          isCorrect: true,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2'],
        },
        {
          turnNumber: 10,
          isCorrect: true,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2'],
        },
        {
          turnNumber: 15,
          isCorrect: false,
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['Aurora'],
        },
        {
          turnNumber: 20,
          isCorrect: true,
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['Aurora'],
        },
      ];

      mockGameRepository.findOne.mockResolvedValue(mockGame);
      mockQuizHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getPlayerInsights(gameId);

      // Assert
      const ec2Context = result.bestPerformingContexts.find(
        (c) => c.context === 'EC2',
      );
      expect(ec2Context.accuracy).toBe(100.0); // 2/2

      const auroraContext = result.bestPerformingContexts.find(
        (c) => c.context === 'Aurora',
      );
      expect(auroraContext.accuracy).toBe(50.0); // 1/2
    });

    it('should generate recommendations based on performance', async () => {
      // Arrange
      const gameId = 'game-recommendations';
      const mockGame: Partial<Game> = {
        gameId,
        correctQuizCount: 2,
        quizBonus: 20,
      };

      const mockHistory: Partial<QuizHistory>[] = [
        {
          turnNumber: 5,
          isCorrect: false,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2'],
        },
        {
          turnNumber: 10,
          isCorrect: false,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['S3'],
        },
        {
          turnNumber: 15,
          isCorrect: true,
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['Aurora'],
        },
        {
          turnNumber: 20,
          isCorrect: true,
          difficulty: QuizDifficulty.HARD,
          infraContext: ['EKS'],
        },
      ];

      mockGameRepository.findOne.mockResolvedValue(mockGame);
      mockQuizHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getPlayerInsights(gameId);

      // Assert
      // EASY: 0/2 = 0% < 60% -> should recommend basic concepts
      expect(result.recommendations).toContain(
        'Review basic AWS concepts like EC2, S3, and networking',
      );
    });

    it('should recommend excellence when performance is high', async () => {
      // Arrange
      const gameId = 'game-excellent';
      const mockGame: Partial<Game> = {
        gameId,
        correctQuizCount: 5,
        quizBonus: 50,
      };

      const mockHistory: Partial<QuizHistory>[] = [
        {
          turnNumber: 5,
          isCorrect: true,
          difficulty: QuizDifficulty.EASY,
          infraContext: ['EC2'],
        },
        {
          turnNumber: 10,
          isCorrect: true,
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['Aurora'],
        },
        {
          turnNumber: 15,
          isCorrect: true,
          difficulty: QuizDifficulty.MEDIUM,
          infraContext: ['ALB'],
        },
        {
          turnNumber: 20,
          isCorrect: true,
          difficulty: QuizDifficulty.HARD,
          infraContext: ['EKS'],
        },
        {
          turnNumber: 25,
          isCorrect: true,
          difficulty: QuizDifficulty.HARD,
          infraContext: ['Aurora'],
        },
      ];

      mockGameRepository.findOne.mockResolvedValue(mockGame);
      mockQuizHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getPlayerInsights(gameId);

      // Assert
      // EASY: 100%, MEDIUM: 100%, HARD: 100%
      expect(result.recommendations).toContain(
        'Excellent performance! Consider exploring advanced AWS certifications',
      );
    });

    it('should handle history with null infraContext', async () => {
      // Arrange
      const gameId = 'game-null-context';
      const mockGame: Partial<Game> = {
        gameId,
        correctQuizCount: 1,
        quizBonus: 10,
      };

      const mockHistory: Partial<QuizHistory>[] = [
        {
          turnNumber: 5,
          isCorrect: true,
          difficulty: QuizDifficulty.EASY,
          infraContext: null,
        },
      ];

      mockGameRepository.findOne.mockResolvedValue(mockGame);
      mockQuizHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getPlayerInsights(gameId);

      // Assert
      expect(result.bestPerformingContexts).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockQuizRepository.count.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(service.getOverallStatistics()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle very large numbers correctly', async () => {
      // Arrange
      mockQuizRepository.count.mockResolvedValue(1000000);
      mockQuizHistoryRepository.count
        .mockResolvedValueOnce(10000000)
        .mockResolvedValueOnce(7500000);
      mockGameRepository.find.mockResolvedValue(
        Array(10000).fill({ quizBonus: 45 }),
      );

      // Act
      const result = await service.getOverallStatistics();

      // Assert
      expect(result.totalQuizzes).toBe(1000000);
      expect(result.accuracyRate).toBe(75.0);
      expect(result.averageBonus).toBe(45.0);
    });

    it('should handle floating point precision correctly', async () => {
      // Arrange
      mockQuizRepository.count.mockResolvedValue(100);
      mockQuizHistoryRepository.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);
      mockGameRepository.find.mockResolvedValue([
        { quizBonus: 10 },
        { quizBonus: 20 },
        { quizBonus: 30 },
      ]);

      // Act
      const result = await service.getOverallStatistics();

      // Assert
      expect(result.accuracyRate).toBe(33.33); // 1/3
      expect(result.averageBonus).toBe(20.0); // (10+20+30)/3
    });
  });
});
