import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizService } from './quiz.service';
import {
  Quiz,
  QuizDifficulty,
  QuizType,
  QuizSource,
} from '../database/entities/quiz.entity';
import { QuizHistory } from '../database/entities/quiz-history.entity';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { QuizGenerationOptions } from './interfaces/quiz-generation-options.interface';

describe('QuizService', () => {
  let service: QuizService;
  let quizRepository: Repository<Quiz>;
  let quizHistoryRepository: Repository<QuizHistory>;

  // Mock repositories
  const mockQuizRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQuizHistoryRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  // Sample test data
  const sampleQuiz: Quiz = {
    quizId: 'quiz-123',
    type: QuizType.MULTIPLE_CHOICE,
    difficulty: QuizDifficulty.MEDIUM,
    question: 'What is EC2?',
    options: ['Virtual Server', 'Database', 'Storage', 'Network'],
    correctAnswer: 'A',
    explanation: 'EC2 is a virtual server service',
    infraContext: ['EC2'],
    turnRangeStart: 1,
    turnRangeEnd: 10,
    source: QuizSource.FALLBACK,
    qualityScore: 85,
    usageCount: 5,
    correctAnswerCount: 3,
    totalAnswerCount: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    get accuracyRate() {
      return this.totalAnswerCount > 0
        ? (this.correctAnswerCount / this.totalAnswerCount) * 100
        : 0;
    },
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
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
    quizRepository = module.get<Repository<Quiz>>(getRepositoryToken(Quiz));
    quizHistoryRepository = module.get<Repository<QuizHistory>>(
      getRepositoryToken(QuizHistory),
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // generateQuiz
  // ---------------------------------------------------------------------------

  describe('generateQuiz', () => {
    const options: QuizGenerationOptions = {
      difficulty: QuizDifficulty.MEDIUM,
      infraContext: ['EC2', 'Aurora'],
      useCache: true,
      turnNumber: 5,
      gameId: 'game-123',
    };

    it('should generate quiz from fallback pool', async () => {
      // Mock history query builder (for used quizzes check)
      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      // Mock quiz query builder
      const mockQuizQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(sampleQuiz),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );
      mockQuizRepository.createQueryBuilder.mockReturnValue(
        mockQuizQueryBuilder,
      );

      const result = await service.generateQuiz(options);

      expect(result).toEqual(sampleQuiz);
      expect(mockQuizRepository.createQueryBuilder).toHaveBeenCalledWith('quiz');
      expect(mockQuizQueryBuilder.where).toHaveBeenCalledWith(
        'quiz.difficulty = :difficulty',
        { difficulty: options.difficulty },
      );
    });

    it('should throw NotFoundException when no quiz found', async () => {
      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const mockQuizQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );
      mockQuizRepository.createQueryBuilder.mockReturnValue(
        mockQuizQueryBuilder,
      );

      await expect(service.generateQuiz(options)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should filter by turn range', async () => {
      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const mockQuizQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(sampleQuiz),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );
      mockQuizRepository.createQueryBuilder.mockReturnValue(
        mockQuizQueryBuilder,
      );

      const optionsWithTurn = { ...options, turnNumber: 5 };
      await service.generateQuiz(optionsWithTurn);

      expect(mockQuizQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(quiz.turnRangeStart IS NULL OR quiz.turnRangeStart <= :turnNumber)',
        { turnNumber: 5 },
      );
      expect(mockQuizQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(quiz.turnRangeEnd IS NULL OR quiz.turnRangeEnd >= :turnNumber)',
        { turnNumber: 5 },
      );
    });

    it('should exclude already used quizzes for a game', async () => {
      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ quizId: 'used-quiz-1' }, { quizId: 'used-quiz-2' }]),
      };

      const mockQuizQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(sampleQuiz),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );
      mockQuizRepository.createQueryBuilder.mockReturnValue(
        mockQuizQueryBuilder,
      );

      const optionsWithGame = { ...options, gameId: 'game-123' };
      await service.generateQuiz(optionsWithGame);

      expect(mockQuizQueryBuilder.andWhere).toHaveBeenCalledWith(
        'quiz.quizId NOT IN (:...usedQuizIds)',
        { usedQuizIds: ['used-quiz-1', 'used-quiz-2'] },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // validateAnswer
  // ---------------------------------------------------------------------------

  describe('validateAnswer', () => {
    it('should return true for correct answer', async () => {
      mockQuizRepository.findOne.mockResolvedValue(sampleQuiz);

      const result = await service.validateAnswer('quiz-123', 'A');

      expect(result).toBe(true);
      expect(mockQuizRepository.findOne).toHaveBeenCalledWith({
        where: { quizId: 'quiz-123' },
      });
    });

    it('should return false for incorrect answer', async () => {
      mockQuizRepository.findOne.mockResolvedValue(sampleQuiz);

      const result = await service.validateAnswer('quiz-123', 'B');

      expect(result).toBe(false);
    });

    it('should be case-insensitive', async () => {
      mockQuizRepository.findOne.mockResolvedValue(sampleQuiz);

      const result = await service.validateAnswer('quiz-123', 'a');

      expect(result).toBe(true);
    });

    it('should handle whitespace in answers', async () => {
      mockQuizRepository.findOne.mockResolvedValue(sampleQuiz);

      const result = await service.validateAnswer('quiz-123', ' A ');

      expect(result).toBe(true);
    });

    it('should validate OX quiz answers', async () => {
      const oxQuiz = {
        ...sampleQuiz,
        type: QuizType.OX,
        correctAnswer: 'true',
      };
      mockQuizRepository.findOne.mockResolvedValue(oxQuiz);

      const result = await service.validateAnswer('quiz-123', 'TRUE');

      expect(result).toBe(true);
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockQuizRepository.findOne.mockResolvedValue(null);

      await expect(service.validateAnswer('quiz-999', 'A')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // recordAnswer
  // ---------------------------------------------------------------------------

  describe('recordAnswer', () => {
    it('should create quiz history record', async () => {
      mockQuizRepository.findOne.mockResolvedValue(sampleQuiz);
      mockQuizRepository.save.mockResolvedValue({
        ...sampleQuiz,
        usageCount: 6,
        totalAnswerCount: 6,
        correctAnswerCount: 4,
      });

      const historyRecord = {
        historyId: 1,
        gameId: 'game-123',
        quizId: 'quiz-123',
        turnNumber: 5,
        playerAnswer: 'A',
        isCorrect: true,
        quizType: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: ['EC2'],
        createdAt: new Date(),
      };

      mockQuizHistoryRepository.create.mockReturnValue(historyRecord);
      mockQuizHistoryRepository.save.mockResolvedValue(historyRecord);

      const result = await service.recordAnswer(
        'game-123',
        'quiz-123',
        'A',
        true,
        5,
      );

      expect(result).toEqual(historyRecord);
      expect(mockQuizHistoryRepository.create).toHaveBeenCalledWith({
        gameId: 'game-123',
        quizId: 'quiz-123',
        turnNumber: 5,
        playerAnswer: 'A',
        isCorrect: true,
        quizType: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: ['EC2'],
      });
      expect(mockQuizHistoryRepository.save).toHaveBeenCalledWith(historyRecord);
    });

    it('should update quiz metrics after recording', async () => {
      const updatedQuiz = {
        ...sampleQuiz,
        usageCount: 6,
        totalAnswerCount: 6,
        correctAnswerCount: 4,
      };

      // First call in recordAnswer, second call in updateQuizMetrics
      mockQuizRepository.findOne
        .mockResolvedValueOnce(sampleQuiz)
        .mockResolvedValueOnce(sampleQuiz);
      mockQuizRepository.save.mockResolvedValue(updatedQuiz);

      const historyRecord = {
        historyId: 1,
        gameId: 'game-123',
        quizId: 'quiz-123',
        turnNumber: 5,
        playerAnswer: 'A',
        isCorrect: true,
        quizType: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: ['EC2'],
        createdAt: new Date(),
      };

      mockQuizHistoryRepository.create.mockReturnValue(historyRecord);
      mockQuizHistoryRepository.save.mockResolvedValue(historyRecord);

      await service.recordAnswer('game-123', 'quiz-123', 'A', true, 5);

      // Should be called twice: once in recordAnswer, once in updateQuizMetrics
      expect(mockQuizRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockQuizRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockQuizRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordAnswer('game-123', 'quiz-999', 'A', true, 5),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateQuizBonus
  // ---------------------------------------------------------------------------

  describe('calculateQuizBonus', () => {
    it('should return 50 points for 5 correct answers', () => {
      expect(service.calculateQuizBonus(5)).toBe(50);
    });

    it('should return 30 points for 4 correct answers', () => {
      expect(service.calculateQuizBonus(4)).toBe(30);
    });

    it('should return 15 points for 3 correct answers', () => {
      expect(service.calculateQuizBonus(3)).toBe(15);
    });

    it('should return 5 points for 2 correct answers', () => {
      expect(service.calculateQuizBonus(2)).toBe(5);
    });

    it('should return 0 points for 1 correct answer', () => {
      expect(service.calculateQuizBonus(1)).toBe(0);
    });

    it('should return 0 points for 0 correct answers', () => {
      expect(service.calculateQuizBonus(0)).toBe(0);
    });

    it('should throw BadRequestException for negative counts', () => {
      expect(() => service.calculateQuizBonus(-1)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for counts > 5', () => {
      expect(() => service.calculateQuizBonus(6)).toThrow(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // updateQuizMetrics
  // ---------------------------------------------------------------------------

  describe('updateQuizMetrics', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should increment usageCount and totalAnswerCount', async () => {
      // Create fresh quiz object for this test
      const freshQuiz: Quiz = {
        quizId: 'quiz-123',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        question: 'What is EC2?',
        options: ['Virtual Server', 'Database', 'Storage', 'Network'],
        correctAnswer: 'A',
        explanation: 'EC2 is a virtual server service',
        infraContext: ['EC2'],
        turnRangeStart: 1,
        turnRangeEnd: 10,
        source: QuizSource.FALLBACK,
        qualityScore: 85,
        usageCount: 5,
        correctAnswerCount: 3,
        totalAnswerCount: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        get accuracyRate() {
          return this.totalAnswerCount > 0
            ? (this.correctAnswerCount / this.totalAnswerCount) * 100
            : 0;
        },
      };

      mockQuizRepository.findOne.mockResolvedValue(freshQuiz);
      mockQuizRepository.save.mockImplementation((quiz) => Promise.resolve(quiz));

      await service.updateQuizMetrics('quiz-123', false);

      expect(mockQuizRepository.findOne).toHaveBeenCalledWith({
        where: { quizId: 'quiz-123' },
      });
      expect(mockQuizRepository.save).toHaveBeenCalled();

      // Verify the quiz object was modified correctly
      const savedQuiz = mockQuizRepository.save.mock.calls[0][0];
      expect(savedQuiz.usageCount).toBe(6);
      expect(savedQuiz.totalAnswerCount).toBe(6);
      expect(savedQuiz.correctAnswerCount).toBe(3); // unchanged for incorrect answer
    });

    it('should increment correctAnswerCount for correct answers', async () => {
      // Create fresh quiz object for this test
      const freshQuiz: Quiz = {
        quizId: 'quiz-123',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        question: 'What is EC2?',
        options: ['Virtual Server', 'Database', 'Storage', 'Network'],
        correctAnswer: 'A',
        explanation: 'EC2 is a virtual server service',
        infraContext: ['EC2'],
        turnRangeStart: 1,
        turnRangeEnd: 10,
        source: QuizSource.FALLBACK,
        qualityScore: 85,
        usageCount: 5,
        correctAnswerCount: 3,
        totalAnswerCount: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        get accuracyRate() {
          return this.totalAnswerCount > 0
            ? (this.correctAnswerCount / this.totalAnswerCount) * 100
            : 0;
        },
      };

      mockQuizRepository.findOne.mockResolvedValue(freshQuiz);
      mockQuizRepository.save.mockImplementation((quiz) => Promise.resolve(quiz));

      await service.updateQuizMetrics('quiz-123', true);

      expect(mockQuizRepository.findOne).toHaveBeenCalledWith({
        where: { quizId: 'quiz-123' },
      });
      expect(mockQuizRepository.save).toHaveBeenCalled();

      // Verify the quiz object was modified correctly
      const savedQuiz = mockQuizRepository.save.mock.calls[0][0];
      expect(savedQuiz.usageCount).toBe(6);
      expect(savedQuiz.totalAnswerCount).toBe(6);
      expect(savedQuiz.correctAnswerCount).toBe(4); // incremented for correct answer
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockQuizRepository.findOne.mockResolvedValue(null);

      await expect(service.updateQuizMetrics('quiz-999', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getQuizStatistics - Overall
  // ---------------------------------------------------------------------------

  describe('getQuizStatistics - Overall', () => {
    it('should return overall statistics', async () => {
      mockQuizRepository.count.mockResolvedValue(100);

      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalAnswers: '500',
          correctAnswers: '375',
        }),
        getRawMany: jest.fn().mockResolvedValue([
          { gameId: 'game-1', correctCount: '5' },
          { gameId: 'game-2', correctCount: '4' },
          { gameId: 'game-3', correctCount: '3' },
        ]),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );

      const result = await service.getQuizStatistics();

      expect(result.totalQuizzes).toBe(100);
      expect(result.totalAnswers).toBe(500);
      expect(result.accuracyRate).toBe(75);
      expect(result.averageBonus).toBeGreaterThan(0);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should handle zero answers', async () => {
      mockQuizRepository.count.mockResolvedValue(50);

      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalAnswers: '0',
          correctAnswers: '0',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );

      const result = await service.getQuizStatistics();

      expect(result.totalQuizzes).toBe(50);
      expect(result.totalAnswers).toBe(0);
      expect(result.accuracyRate).toBe(0);
      expect(result.averageBonus).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getQuizStatistics - Game-specific
  // ---------------------------------------------------------------------------

  describe('getQuizStatistics - Game-specific', () => {
    it('should return game-specific statistics', async () => {
      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalAnswers: '5',
          correctAnswers: '4',
          count: '5',
        }),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );

      const result = await service.getQuizStatistics('game-123');

      expect(result.totalQuizzes).toBe(5);
      expect(result.totalAnswers).toBe(5);
      expect(result.accuracyRate).toBe(80);
      expect(result.averageBonus).toBe(30); // 4 correct = 30 bonus
    });

    it('should handle game with no answers', async () => {
      const mockHistoryQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalAnswers: '0',
          correctAnswers: '0',
          count: '0',
        }),
      };

      mockQuizHistoryRepository.createQueryBuilder.mockReturnValue(
        mockHistoryQueryBuilder,
      );

      const result = await service.getQuizStatistics('game-456');

      expect(result.totalQuizzes).toBe(0);
      expect(result.totalAnswers).toBe(0);
      expect(result.accuracyRate).toBe(0);
      expect(result.averageBonus).toBe(0);
    });
  });
});
