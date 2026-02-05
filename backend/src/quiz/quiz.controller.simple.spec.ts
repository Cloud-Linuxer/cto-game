import { Test, TestingModule } from '@nestjs/testing';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { GameService } from '../game/game.service';

/**
 * QuizController Simple Test
 *
 * Simplified test to verify controller can be instantiated
 * Full integration tests in quiz.controller.spec.ts require GameService fixes
 */
describe('QuizController (Simple)', () => {
  let controller: QuizController;

  beforeEach(async () => {
    const mockQuizService = {
      generateQuiz: jest.fn(),
      validateAnswer: jest.fn(),
      recordAnswer: jest.fn(),
      getQuizStatistics: jest.fn(),
      quizRepository: { findOne: jest.fn() },
    };

    const mockGameService = {
      getGame: jest.fn(),
      gameRepository: { update: jest.fn() },
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have generateQuiz method', () => {
    expect(controller.generateQuiz).toBeDefined();
    expect(typeof controller.generateQuiz).toBe('function');
  });

  it('should have getNextQuiz method', () => {
    expect(controller.getNextQuiz).toBeDefined();
    expect(typeof controller.getNextQuiz).toBe('function');
  });

  it('should have submitAnswer method', () => {
    expect(controller.submitAnswer).toBeDefined();
    expect(typeof controller.submitAnswer).toBe('function');
  });

  it('should have getGameQuizSummary method', () => {
    expect(controller.getGameQuizSummary).toBeDefined();
    expect(typeof controller.getGameQuizSummary).toBe('function');
  });

  it('should have getOverallStatistics method', () => {
    expect(controller.getOverallStatistics).toBeDefined();
    expect(typeof controller.getOverallStatistics).toBe('function');
  });
});
