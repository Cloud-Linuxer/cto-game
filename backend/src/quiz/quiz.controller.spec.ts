import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { GameService } from '../game/game.service';
import {
  Quiz,
  QuizType,
  QuizDifficulty,
  QuizSource,
} from '../database/entities/quiz.entity';
import { QuizHistory } from '../database/entities/quiz-history.entity';
import {
  GenerateQuizDto,
  SubmitAnswerDto,
  QuizResponseDto,
  QuizResultDto,
  QuizStatisticsDto,
} from './dto';

describe('QuizController', () => {
  let controller: QuizController;
  let quizService: jest.Mocked<QuizService>;
  let gameService: jest.Mocked<GameService>;

  const mockQuiz: Quiz = {
    quizId: 'quiz-123',
    type: QuizType.MULTIPLE_CHOICE,
    difficulty: QuizDifficulty.MEDIUM,
    question: 'EC2 인스턴스를 Auto Scaling Group에 추가할 때 필요한 필수 구성 요소는?',
    options: ['Launch Template', 'VPC', 'IAM Role', 'CloudWatch Alarm'],
    correctAnswer: 'A',
    explanation: 'Auto Scaling Group을 생성하려면 Launch Template 또는 Launch Configuration이 필수입니다.',
    infraContext: ['EC2', 'Auto Scaling'],
    source: QuizSource.FALLBACK,
    qualityScore: null,
    isActive: true,
    usageCount: 0,
    totalAnswerCount: 0,
    correctAnswerCount: 0,
    get accuracyRate() { return 0; },
    turnRangeStart: null,
    turnRangeEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGame = {
    gameId: 'game-123',
    currentTurn: 5,
    quizTurns: [5, 10, 15, 20, 25],
    infrastructure: ['EC2', 'Aurora', 'ALB'],
    difficultyMode: 'NORMAL',
    correctQuizCount: 2,
  };

  const mockQuizHistory: QuizHistory = {
    historyId: 123,
    gameId: 'game-123',
    quizId: 'quiz-123',
    turnNumber: 5,
    playerAnswer: 'A',
    isCorrect: true,
    timeTaken: null,
    quizType: QuizType.MULTIPLE_CHOICE,
    difficulty: QuizDifficulty.MEDIUM,
    infraContext: ['EC2', 'Auto Scaling'],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockQuizService = {
      generateQuiz: jest.fn(),
      validateAnswer: jest.fn(),
      recordAnswer: jest.fn(),
      calculateQuizBonus: jest.fn(),
      getQuizStatistics: jest.fn(),
      updateQuizMetrics: jest.fn(),
      quizRepository: {
        findOne: jest.fn(),
      },
    };

    const mockGameService = {
      getGame: jest.fn(),
      gameRepository: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
        {
          provide: GameService,
          useValue: mockGameService,
        },
      ],
    }).compile();

    controller = module.get<QuizController>(QuizController);
    quizService = module.get(QuizService) as jest.Mocked<QuizService>;
    gameService = module.get(GameService) as jest.Mocked<GameService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. POST /api/quiz/generate', () => {
    it('should generate a quiz successfully', async () => {
      const dto: GenerateQuizDto = {
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: ['EC2', 'Aurora'],
      };

      quizService.generateQuiz.mockResolvedValue(mockQuiz);

      const result = await controller.generateQuiz(dto);

      expect(result).toMatchObject({
        quizId: 'quiz-123',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        question: expect.any(String),
        options: expect.any(Array),
        explanation: expect.any(String),
      });
      expect(result.correctAnswer).toBeUndefined(); // 정답은 제외
      expect(quizService.generateQuiz).toHaveBeenCalledWith({
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: ['EC2', 'Aurora'],
      });
    });

    it('should handle missing infraContext', async () => {
      const dto: GenerateQuizDto = {
        difficulty: QuizDifficulty.EASY,
        infraContext: [],
      };

      quizService.generateQuiz.mockResolvedValue(mockQuiz);

      await controller.generateQuiz(dto);

      expect(quizService.generateQuiz).toHaveBeenCalledWith({
        difficulty: QuizDifficulty.EASY,
        infraContext: [],
      });
    });

    it('should throw BadRequestException for invalid difficulty', async () => {
      const dto: GenerateQuizDto = {
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: [],
      };

      quizService.generateQuiz.mockRejectedValue(
        new BadRequestException('Invalid difficulty'),
      );

      await expect(controller.generateQuiz(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException on generation failure', async () => {
      const dto: GenerateQuizDto = {
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: [],
      };

      quizService.generateQuiz.mockRejectedValue(
        new Error('Generation failed'),
      );

      await expect(controller.generateQuiz(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('2. GET /api/game/:gameId/quiz/next', () => {
    it('should return quiz when quiz turn is active', async () => {
      gameService.getGame.mockResolvedValue(mockGame as any);
      quizService.generateQuiz.mockResolvedValue(mockQuiz);

      const result = await controller.getNextQuiz('game-123');

      expect(result).toBeDefined();
      expect(result?.quizId).toBe('quiz-123');
      expect(result?.correctAnswer).toBeUndefined(); // 정답 제외
      expect(gameService.getGame).toHaveBeenCalledWith('game-123');
      expect(quizService.generateQuiz).toHaveBeenCalledWith({
        difficulty: QuizDifficulty.MEDIUM,
        infraContext: ['EC2', 'Aurora', 'ALB'],
        turnNumber: 5,
        gameId: 'game-123',
      });
    });

    it('should return null when quiz turn is not active', async () => {
      const gameWithoutQuiz = {
        ...mockGame,
        currentTurn: 3, // Not in quizTurns
      };

      gameService.getGame.mockResolvedValue(gameWithoutQuiz as any);

      const result = await controller.getNextQuiz('game-123');

      expect(result).toBeNull();
      expect(quizService.generateQuiz).not.toHaveBeenCalled();
    });

    it('should return null when quizTurns is empty', async () => {
      const gameWithoutQuizTurns = {
        ...mockGame,
        quizTurns: [],
      };

      gameService.getGame.mockResolvedValue(gameWithoutQuizTurns as any);

      const result = await controller.getNextQuiz('game-123');

      expect(result).toBeNull();
    });

    it('should map EASY game difficulty to EASY quiz difficulty', async () => {
      const easyGame = {
        ...mockGame,
        difficultyMode: 'EASY',
      };

      gameService.getGame.mockResolvedValue(easyGame as any);
      quizService.generateQuiz.mockResolvedValue(mockQuiz);

      await controller.getNextQuiz('game-123');

      expect(quizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: QuizDifficulty.EASY,
        }),
      );
    });

    it('should map HARD game difficulty to HARD quiz difficulty', async () => {
      const hardGame = {
        ...mockGame,
        difficultyMode: 'HARD',
      };

      gameService.getGame.mockResolvedValue(hardGame as any);
      quizService.generateQuiz.mockResolvedValue(mockQuiz);

      await controller.getNextQuiz('game-123');

      expect(quizService.generateQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: QuizDifficulty.HARD,
        }),
      );
    });

    it('should throw NotFoundException if game does not exist', async () => {
      gameService.getGame.mockResolvedValue(null);

      await expect(controller.getNextQuiz('invalid-game')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      gameService.getGame.mockRejectedValue(new Error('Database error'));

      await expect(controller.getNextQuiz('game-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('3. POST /api/game/:gameId/quiz/:quizId/answer', () => {
    const submitDto: SubmitAnswerDto = {
      answer: 'A',
    };

    it('should submit correct answer and update correctQuizCount', async () => {
      gameService.getGame.mockResolvedValue(mockGame as any);
      quizService.validateAnswer.mockResolvedValue(true);
      quizService.recordAnswer.mockResolvedValue(mockQuizHistory);
      (quizService as any).quizRepository.findOne.mockResolvedValue(mockQuiz);
      (gameService as any).gameRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.submitAnswer('game-123', 'quiz-123', submitDto);

      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('A');
      expect(result.explanation).toBe(mockQuiz.explanation);
      expect(result.correctQuizCount).toBe(3); // 2 + 1
      expect(quizService.validateAnswer).toHaveBeenCalledWith('quiz-123', 'A');
      expect(quizService.recordAnswer).toHaveBeenCalledWith(
        'game-123',
        'quiz-123',
        'A',
        true,
        5,
      );
      expect((gameService as any).gameRepository.update).toHaveBeenCalledWith(
        { gameId: 'game-123' },
        { correctQuizCount: 3 },
      );
    });

    it('should submit incorrect answer without updating correctQuizCount', async () => {
      gameService.getGame.mockResolvedValue(mockGame as any);
      quizService.validateAnswer.mockResolvedValue(false);
      quizService.recordAnswer.mockResolvedValue(mockQuizHistory);
      (quizService as any).quizRepository.findOne.mockResolvedValue(mockQuiz);

      const result = await controller.submitAnswer('game-123', 'quiz-123', submitDto);

      expect(result.isCorrect).toBe(false);
      expect(result.correctAnswer).toBe('A');
      expect(result.correctQuizCount).toBe(2); // Unchanged
      expect((gameService as any).gameRepository.update).not.toHaveBeenCalled();
    });

    it('should handle game with no previous correctQuizCount', async () => {
      const gameWithoutQuizCount = {
        ...mockGame,
        correctQuizCount: undefined,
      };

      gameService.getGame.mockResolvedValue(gameWithoutQuizCount as any);
      quizService.validateAnswer.mockResolvedValue(true);
      quizService.recordAnswer.mockResolvedValue(mockQuizHistory);
      (quizService as any).quizRepository.findOne.mockResolvedValue(mockQuiz);
      (gameService as any).gameRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.submitAnswer('game-123', 'quiz-123', submitDto);

      expect(result.correctQuizCount).toBe(1); // 0 + 1
    });

    it('should throw NotFoundException if game not found', async () => {
      gameService.getGame.mockResolvedValue(null);

      await expect(
        controller.submitAnswer('invalid-game', 'quiz-123', submitDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if quiz not found', async () => {
      gameService.getGame.mockResolvedValue(mockGame as any);
      quizService.validateAnswer.mockRejectedValue(
        new NotFoundException('Quiz not found'),
      );

      await expect(
        controller.submitAnswer('game-123', 'invalid-quiz', submitDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid answer format', async () => {
      gameService.getGame.mockResolvedValue(mockGame as any);
      quizService.validateAnswer.mockRejectedValue(
        new BadRequestException('Invalid answer format'),
      );

      await expect(
        controller.submitAnswer('game-123', 'quiz-123', submitDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      gameService.getGame.mockResolvedValue(mockGame as any);
      quizService.validateAnswer.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.submitAnswer('game-123', 'quiz-123', submitDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('4. GET /api/game/:gameId/quiz-summary', () => {
    const mockStatistics: QuizStatisticsDto = {
      totalQuizzes: 5,
      totalAnswers: 5,
      accuracyRate: 80.0,
      averageBonus: 30,
      generatedAt: new Date(),
    };

    it('should return quiz summary for a game', async () => {
      gameService.getGame.mockResolvedValue(mockGame as any);
      quizService.getQuizStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getGameQuizSummary('game-123');

      expect(result).toEqual(mockStatistics);
      expect(gameService.getGame).toHaveBeenCalledWith('game-123');
      expect(quizService.getQuizStatistics).toHaveBeenCalledWith('game-123');
    });

    it('should throw NotFoundException if game not found', async () => {
      gameService.getGame.mockResolvedValue(null);

      await expect(
        controller.getGameQuizSummary('invalid-game'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      gameService.getGame.mockRejectedValue(new Error('Database error'));

      await expect(controller.getGameQuizSummary('game-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('5. GET /api/quiz/statistics', () => {
    const mockOverallStatistics: QuizStatisticsDto = {
      totalQuizzes: 150,
      totalAnswers: 500,
      accuracyRate: 72.5,
      averageBonus: 25.5,
      byDifficulty: [
        {
          difficulty: QuizDifficulty.EASY,
          totalQuizzes: 50,
          totalAnswers: 200,
          accuracyRate: 85.0,
          averageBonus: 35,
        },
        {
          difficulty: QuizDifficulty.MEDIUM,
          totalQuizzes: 60,
          totalAnswers: 200,
          accuracyRate: 70.0,
          averageBonus: 25,
        },
        {
          difficulty: QuizDifficulty.HARD,
          totalQuizzes: 40,
          totalAnswers: 100,
          accuracyRate: 60.0,
          averageBonus: 15,
        },
      ],
      generatedAt: new Date(),
    };

    it('should return overall quiz statistics', async () => {
      quizService.getQuizStatistics.mockResolvedValue(mockOverallStatistics);

      const result = await controller.getOverallStatistics();

      expect(result).toEqual(mockOverallStatistics);
      expect(result.byDifficulty).toHaveLength(3);
      expect(quizService.getQuizStatistics).toHaveBeenCalledWith();
    });

    it('should handle empty statistics', async () => {
      const emptyStats: QuizStatisticsDto = {
        totalQuizzes: 0,
        totalAnswers: 0,
        accuracyRate: 0,
        averageBonus: 0,
        generatedAt: new Date(),
      };

      quizService.getQuizStatistics.mockResolvedValue(emptyStats);

      const result = await controller.getOverallStatistics();

      expect(result.totalQuizzes).toBe(0);
      expect(result.totalAnswers).toBe(0);
      expect(result.accuracyRate).toBe(0);
    });

    it('should throw InternalServerErrorException on error', async () => {
      quizService.getQuizStatistics.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.getOverallStatistics()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Helper: toQuizResponse', () => {
    it('should convert Quiz to QuizResponseDto without answer', () => {
      const result = (controller as any).toQuizResponse(mockQuiz, false);

      expect(result.quizId).toBe('quiz-123');
      expect(result.type).toBe(QuizType.MULTIPLE_CHOICE);
      expect(result.difficulty).toBe(QuizDifficulty.MEDIUM);
      expect(result.question).toBe(mockQuiz.question);
      expect(result.options).toEqual(mockQuiz.options);
      expect(result.explanation).toBe(mockQuiz.explanation);
      expect(result.correctAnswer).toBeUndefined();
    });

    it('should convert Quiz to QuizResponseDto with answer', () => {
      const result = (controller as any).toQuizResponse(mockQuiz, true);

      expect(result.correctAnswer).toBe('A');
    });
  });

  describe('Helper: mapGameDifficultyToQuizDifficulty', () => {
    it('should map EASY to EASY', () => {
      const result = (controller as any).mapGameDifficultyToQuizDifficulty('EASY');
      expect(result).toBe(QuizDifficulty.EASY);
    });

    it('should map NORMAL to MEDIUM', () => {
      const result = (controller as any).mapGameDifficultyToQuizDifficulty('NORMAL');
      expect(result).toBe(QuizDifficulty.MEDIUM);
    });

    it('should map HARD to HARD', () => {
      const result = (controller as any).mapGameDifficultyToQuizDifficulty('HARD');
      expect(result).toBe(QuizDifficulty.HARD);
    });

    it('should default to MEDIUM for unknown difficulty', () => {
      const result = (controller as any).mapGameDifficultyToQuizDifficulty('UNKNOWN');
      expect(result).toBe(QuizDifficulty.MEDIUM);
    });

    it('should handle null difficulty', () => {
      const result = (controller as any).mapGameDifficultyToQuizDifficulty(null);
      expect(result).toBe(QuizDifficulty.MEDIUM);
    });
  });
});
