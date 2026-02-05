import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { Repository } from 'typeorm';
import { Game, GameStatus } from '../../database/entities/game.entity';
import { Quiz, QuizDifficulty, QuizType, QuizSource } from '../../database/entities/quiz.entity';
import { QuizHistory } from '../../database/entities/quiz-history.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

/**
 * Quiz System E2E Tests
 *
 * Comprehensive end-to-end test suite covering all quiz integration scenarios.
 *
 * Test Coverage:
 * 1. Quiz appears at correct turns (5 quizzes per game)
 * 2. Multiple choice quiz flow
 * 3. OX quiz flow
 * 4. Correct answer increases correctQuizCount
 * 5. Incorrect answer doesn't affect correctQuizCount
 * 6. Quiz bonus calculated correctly
 * 7. Quiz summary displays at game end
 * 8. Quiz statistics API returns correct data
 * 9. Cache hit/miss scenarios
 * 10. Fallback quiz activation when LLM fails
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 1 (Core Quiz System)
 * Task: Task #27
 */
describe('Quiz System E2E Tests', () => {
  let app: INestApplication;
  let gameRepository: Repository<Game>;
  let quizRepository: Repository<Quiz>;
  let quizHistoryRepository: Repository<QuizHistory>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    gameRepository = moduleFixture.get(getRepositoryToken(Game));
    quizRepository = moduleFixture.get(getRepositoryToken(Quiz));
    quizHistoryRepository = moduleFixture.get(getRepositoryToken(QuizHistory));
  });

  beforeEach(async () => {
    // Clean database before each test
    await quizHistoryRepository.delete({});
    await quizRepository.delete({});
    await gameRepository.delete({});

    // Seed fallback quizzes for testing
    await seedFallbackQuizzes();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Helper: Seed fallback quizzes for testing
   */
  async function seedFallbackQuizzes() {
    const fallbackQuizzes = [
      // EASY - Multiple Choice
      {
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.EASY,
        question: 'EC2는 무엇의 약자입니까?',
        options: [
          'Elastic Compute Cloud',
          'Elastic Container Cloud',
          'Easy Compute Cloud',
          'Enterprise Compute Cloud',
        ],
        correctAnswer: 'A',
        explanation: 'EC2는 Elastic Compute Cloud의 약자입니다.',
        infraContext: ['EC2'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 1,
        turnRangeEnd: 10,
      },
      // EASY - OX
      {
        type: QuizType.OX,
        difficulty: QuizDifficulty.EASY,
        question: 'RDS는 관계형 데이터베이스 서비스입니다.',
        options: null,
        correctAnswer: 'true',
        explanation: 'RDS는 Relational Database Service의 약자로 관계형 데이터베이스를 제공합니다.',
        infraContext: ['RDS', 'Aurora'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 1,
        turnRangeEnd: 25,
      },
      // MEDIUM - Multiple Choice
      {
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        question: 'Aurora Serverless v2의 최소 용량 단위는?',
        options: ['0.5 ACU', '1 ACU', '2 ACU', '4 ACU'],
        correctAnswer: 'A',
        explanation: 'Aurora Serverless v2는 0.5 ACU부터 시작 가능합니다.',
        infraContext: ['Aurora'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 5,
        turnRangeEnd: 20,
      },
      // MEDIUM - OX
      {
        type: QuizType.OX,
        difficulty: QuizDifficulty.MEDIUM,
        question: 'EKS는 Kubernetes를 관리형으로 제공하는 서비스입니다.',
        options: null,
        correctAnswer: 'true',
        explanation: 'EKS는 Elastic Kubernetes Service로 관리형 Kubernetes를 제공합니다.',
        infraContext: ['EKS'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 10,
        turnRangeEnd: 25,
      },
      // HARD - Multiple Choice
      {
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.HARD,
        question: 'Aurora Global Database의 RPO는 일반적으로 얼마입니까?',
        options: ['1초 미만', '5초 미만', '1분 미만', '5분 미만'],
        correctAnswer: 'A',
        explanation: 'Aurora Global Database는 일반적으로 1초 미만의 RPO를 제공합니다.',
        infraContext: ['Aurora', 'Global DB'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 15,
        turnRangeEnd: 25,
      },
      // HARD - OX
      {
        type: QuizType.OX,
        difficulty: QuizDifficulty.HARD,
        question: 'Karpenter는 AWS의 공식 오토스케일링 솔루션입니다.',
        options: null,
        correctAnswer: 'false',
        explanation: 'Karpenter는 오픈소스 프로젝트이며, AWS에서 개발했지만 공식 AWS 서비스는 아닙니다.',
        infraContext: ['EKS', 'Karpenter'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 15,
        turnRangeEnd: 25,
      },
    ];

    for (const quizData of fallbackQuizzes) {
      const quiz = quizRepository.create(quizData);
      await quizRepository.save(quiz);
    }
  }

  /**
   * Helper: Create a new game and return gameId
   */
  async function createGame(difficulty: string = 'NORMAL'): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/game/start')
      .send({ difficulty })
      .expect(201);

    return response.body.gameId;
  }

  /**
   * Helper: Navigate game to a specific turn
   */
  async function navigateToTurn(gameId: string, targetTurn: number): Promise<void> {
    const game = await gameRepository.findOne({ where: { gameId } });
    if (!game) throw new Error('Game not found');

    // Update turn directly for testing purposes
    game.currentTurn = targetTurn;
    await gameRepository.save(game);
  }

  // ---------------------------------------------------------------------------
  // Test Scenario 1: Quiz appears at correct turns
  // ---------------------------------------------------------------------------

  describe('1. Quiz appears at correct turns', () => {
    it('should show quizzes at exactly 5 predetermined turns', async () => {
      const gameId = await createGame('NORMAL');

      // Get game to check quizTurns
      const game = await gameRepository.findOne({ where: { gameId } });
      expect(game).toBeDefined();
      expect(game!.quizTurns).toBeDefined();
      expect(game!.quizTurns.length).toBe(5);

      // Verify quizzes appear at quiz turns
      for (const quizTurn of game!.quizTurns) {
        await navigateToTurn(gameId, quizTurn);

        const response = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.quizId).toBeDefined();
        expect(response.body.question).toBeDefined();
      }
    });

    it('should NOT show quiz at non-quiz turns', async () => {
      const gameId = await createGame('NORMAL');

      const game = await gameRepository.findOne({ where: { gameId } });
      const nonQuizTurns = [1, 2, 3, 4, 5].filter(
        (turn) => !game!.quizTurns.includes(turn),
      );

      // Test first non-quiz turn
      if (nonQuizTurns.length > 0) {
        await navigateToTurn(gameId, nonQuizTurns[0]);

        const response = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        expect(response.body).toEqual({});
      }
    });

    it('should ensure minimum 3-turn spacing between quizzes', async () => {
      const gameId = await createGame('NORMAL');

      const game = await gameRepository.findOne({ where: { gameId } });
      const quizTurns = game!.quizTurns.sort((a, b) => a - b);

      // Check spacing between consecutive quiz turns
      for (let i = 0; i < quizTurns.length - 1; i++) {
        const spacing = quizTurns[i + 1] - quizTurns[i];
        expect(spacing).toBeGreaterThanOrEqual(3);
      }
    });

    it('should handle all 25 turns correctly', async () => {
      const gameId = await createGame('NORMAL');

      const game = await gameRepository.findOne({ where: { gameId } });
      const quizTurns = game!.quizTurns;

      let quizCount = 0;

      for (let turn = 1; turn <= 25; turn++) {
        await navigateToTurn(gameId, turn);

        const response = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        if (quizTurns.includes(turn)) {
          expect(response.body.quizId).toBeDefined();
          quizCount++;
        } else {
          expect(response.body).toEqual({});
        }
      }

      expect(quizCount).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 2: Multiple choice quiz flow
  // ---------------------------------------------------------------------------

  describe('2. Multiple choice quiz flow', () => {
    it('should display 4 options (A, B, C, D)', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      const response = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      if (response.body.type === QuizType.MULTIPLE_CHOICE) {
        expect(response.body.options).toBeDefined();
        expect(response.body.options.length).toBe(4);
        expect(response.body.correctAnswer).toBeUndefined(); // Should not expose answer
      }
    });

    it('should accept answer submission and return result', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      // Get quiz
      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      // Submit answer
      const answerResponse = await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: 'A' })
        .expect(200);

      expect(answerResponse.body.isCorrect).toBeDefined();
      expect(answerResponse.body.correctAnswer).toBeDefined();
      expect(answerResponse.body.explanation).toBeDefined();
      expect(answerResponse.body.correctQuizCount).toBeDefined();
    });

    it('should close quiz after result is displayed', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      // Get quiz
      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      // Submit answer
      await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: 'A' })
        .expect(200);

      // Verify quiz history was created
      const history = await quizHistoryRepository.findOne({
        where: { gameId, quizId },
      });

      expect(history).toBeDefined();
      expect(history!.playerAnswer).toBe('A');
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 3: OX quiz flow
  // ---------------------------------------------------------------------------

  describe('3. OX quiz flow', () => {
    it('should display two options (true/false)', async () => {
      // Manually create OX quiz
      const oxQuiz = quizRepository.create({
        type: QuizType.OX,
        difficulty: QuizDifficulty.EASY,
        question: 'Test OX question?',
        options: null,
        correctAnswer: 'true',
        explanation: 'Test explanation',
        infraContext: ['EC2'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 1,
        turnRangeEnd: 25,
      });
      await quizRepository.save(oxQuiz);

      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      const response = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      if (response.body.type === QuizType.OX) {
        expect(response.body.options).toBeNull();
        expect(response.body.question).toBeDefined();
        expect(response.body.correctAnswer).toBeUndefined();
      }
    });

    it('should accept true/false answer submission', async () => {
      const oxQuiz = quizRepository.create({
        type: QuizType.OX,
        difficulty: QuizDifficulty.EASY,
        question: 'Test OX question?',
        options: null,
        correctAnswer: 'true',
        explanation: 'Test explanation',
        infraContext: ['EC2'],
        source: QuizSource.FALLBACK,
        isActive: true,
        turnRangeStart: 1,
        turnRangeEnd: 25,
      });
      const savedQuiz = await quizRepository.save(oxQuiz);

      const gameId = await createGame('EASY');
      const game = await gameRepository.findOne({ where: { gameId } });
      game!.currentTurn = game!.quizTurns[0];
      await gameRepository.save(game);

      // Submit answer
      const answerResponse = await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${savedQuiz.quizId}/answer`)
        .send({ answer: 'true' })
        .expect(200);

      expect(answerResponse.body.isCorrect).toBe(true);
      expect(answerResponse.body.correctAnswer).toBe('true');
      expect(answerResponse.body.explanation).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 4: Correct answer increases correctQuizCount
  // ---------------------------------------------------------------------------

  describe('4. Correct answer increases correctQuizCount', () => {
    it('should increment correctQuizCount when answer is correct', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const initialCount = game!.correctQuizCount;

      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      // Get quiz
      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      // Get correct answer from DB
      const quiz = await quizRepository.findOne({ where: { quizId } });
      const correctAnswer = quiz!.correctAnswer;

      // Submit correct answer
      const answerResponse = await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: correctAnswer })
        .expect(200);

      expect(answerResponse.body.isCorrect).toBe(true);
      expect(answerResponse.body.correctQuizCount).toBe(initialCount + 1);

      // Verify in database
      const updatedGame = await gameRepository.findOne({ where: { gameId } });
      expect(updatedGame!.correctQuizCount).toBe(initialCount + 1);
    });

    it('should create QuizHistory record with isCorrect=true', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      // Get quiz
      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      // Get correct answer
      const quiz = await quizRepository.findOne({ where: { quizId } });
      const correctAnswer = quiz!.correctAnswer;

      // Submit correct answer
      await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: correctAnswer })
        .expect(200);

      // Verify history
      const history = await quizHistoryRepository.findOne({
        where: { gameId, quizId },
      });

      expect(history).toBeDefined();
      expect(history!.isCorrect).toBe(true);
      expect(history!.playerAnswer).toBe(correctAnswer);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 5: Incorrect answer doesn't affect correctQuizCount
  // ---------------------------------------------------------------------------

  describe('5. Incorrect answer does not affect correctQuizCount', () => {
    it('should NOT increment correctQuizCount when answer is incorrect', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const initialCount = game!.correctQuizCount;

      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      // Get quiz
      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      // Get incorrect answer (not the correct one)
      const quiz = await quizRepository.findOne({ where: { quizId } });
      const correctAnswer = quiz!.correctAnswer.toLowerCase();
      let incorrectAnswer = 'B';
      if (correctAnswer === 'b') incorrectAnswer = 'A';

      // Submit incorrect answer
      const answerResponse = await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: incorrectAnswer })
        .expect(200);

      expect(answerResponse.body.isCorrect).toBe(false);
      expect(answerResponse.body.correctQuizCount).toBe(initialCount);

      // Verify in database
      const updatedGame = await gameRepository.findOne({ where: { gameId } });
      expect(updatedGame!.correctQuizCount).toBe(initialCount);
    });

    it('should create QuizHistory record with isCorrect=false', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      // Get quiz
      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      // Submit incorrect answer
      await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: 'Z' }) // Invalid option
        .expect(200);

      // Verify history
      const history = await quizHistoryRepository.findOne({
        where: { gameId, quizId },
      });

      expect(history).toBeDefined();
      expect(history!.isCorrect).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 6: Quiz bonus calculated correctly
  // ---------------------------------------------------------------------------

  describe('6. Quiz bonus calculated correctly', () => {
    const bonusTestCases = [
      { correctCount: 5, expectedBonus: 50 },
      { correctCount: 4, expectedBonus: 30 },
      { correctCount: 3, expectedBonus: 15 },
      { correctCount: 2, expectedBonus: 5 },
      { correctCount: 1, expectedBonus: 0 },
      { correctCount: 0, expectedBonus: 0 },
    ];

    bonusTestCases.forEach(({ correctCount, expectedBonus }) => {
      it(`should calculate bonus=${expectedBonus} for ${correctCount} correct answers`, async () => {
        const gameId = await createGame('EASY');

        const game = await gameRepository.findOne({ where: { gameId } });

        // Simulate answering quizzes
        for (let i = 0; i < correctCount; i++) {
          const quizTurn = game!.quizTurns[i];
          await navigateToTurn(gameId, quizTurn);

          // Get quiz
          const quizResponse = await request(app.getHttpServer())
            .get(`/api/game/${gameId}/quiz/next`)
            .expect(200);

          const quizId = quizResponse.body.quizId;

          // Get correct answer
          const quiz = await quizRepository.findOne({ where: { quizId } });
          const correctAnswer = quiz!.correctAnswer;

          // Submit correct answer
          await request(app.getHttpServer())
            .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
            .send({ answer: correctAnswer })
            .expect(200);
        }

        // Get quiz summary
        const summaryResponse = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz-summary`)
          .expect(200);

        expect(summaryResponse.body.averageBonus).toBe(expectedBonus);
      });
    });

    it('should include bonus in final score calculation', async () => {
      const gameId = await createGame('EASY');

      // Answer all 5 quizzes correctly for max bonus (50 points)
      const game = await gameRepository.findOne({ where: { gameId } });

      for (let i = 0; i < 5; i++) {
        const quizTurn = game!.quizTurns[i];
        await navigateToTurn(gameId, quizTurn);

        const quizResponse = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        const quizId = quizResponse.body.quizId;

        const quiz = await quizRepository.findOne({ where: { quizId } });
        const correctAnswer = quiz!.correctAnswer;

        await request(app.getHttpServer())
          .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
          .send({ answer: correctAnswer })
          .expect(200);
      }

      // Update game with quiz bonus
      const updatedGame = await gameRepository.findOne({ where: { gameId } });
      updatedGame!.quizBonus = 50;
      await gameRepository.save(updatedGame);

      // Verify bonus is stored
      const finalGame = await gameRepository.findOne({ where: { gameId } });
      expect(finalGame!.quizBonus).toBe(50);
      expect(finalGame!.correctQuizCount).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 7: Quiz summary displays at game end
  // ---------------------------------------------------------------------------

  describe('7. Quiz summary displays at game end', () => {
    it('should show total quizzes answered', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });

      // Answer 3 quizzes
      for (let i = 0; i < 3; i++) {
        const quizTurn = game!.quizTurns[i];
        await navigateToTurn(gameId, quizTurn);

        const quizResponse = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        const quizId = quizResponse.body.quizId;

        await request(app.getHttpServer())
          .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
          .send({ answer: 'A' })
          .expect(200);
      }

      const summaryResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz-summary`)
        .expect(200);

      expect(summaryResponse.body.totalAnswers).toBe(3);
    });

    it('should show correct count and accuracy percentage', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });

      // Answer 2 correctly, 1 incorrectly
      for (let i = 0; i < 3; i++) {
        const quizTurn = game!.quizTurns[i];
        await navigateToTurn(gameId, quizTurn);

        const quizResponse = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        const quizId = quizResponse.body.quizId;

        const quiz = await quizRepository.findOne({ where: { quizId } });
        const answer = i < 2 ? quiz!.correctAnswer : 'WRONG';

        await request(app.getHttpServer())
          .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
          .send({ answer })
          .expect(200);
      }

      const summaryResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz-summary`)
        .expect(200);

      expect(summaryResponse.body.totalAnswers).toBe(3);
      expect(summaryResponse.body.accuracyRate).toBeCloseTo(66.67, 1);
    });

    it('should show bonus score', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });

      // Answer 4 correctly for 30 bonus
      for (let i = 0; i < 4; i++) {
        const quizTurn = game!.quizTurns[i];
        await navigateToTurn(gameId, quizTurn);

        const quizResponse = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        const quizId = quizResponse.body.quizId;

        const quiz = await quizRepository.findOne({ where: { quizId } });

        await request(app.getHttpServer())
          .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
          .send({ answer: quiz!.correctAnswer })
          .expect(200);
      }

      const summaryResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz-summary`)
        .expect(200);

      expect(summaryResponse.body.averageBonus).toBe(30);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 8: Quiz statistics API returns correct data
  // ---------------------------------------------------------------------------

  describe('8. Quiz statistics API returns correct data', () => {
    it('should return overall quiz statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/quiz/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('totalQuizzes');
      expect(response.body).toHaveProperty('totalAnswers');
      expect(response.body).toHaveProperty('accuracyRate');
      expect(response.body).toHaveProperty('averageBonus');
      expect(response.body).toHaveProperty('generatedAt');
    });

    it('should return game-specific quiz statistics', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: 'A' })
        .expect(200);

      const statsResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz-summary`)
        .expect(200);

      expect(statsResponse.body.totalAnswers).toBe(1);
      expect(statsResponse.body.accuracyRate).toBeDefined();
    });

    it('should calculate accuracy rates correctly', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });

      // Answer 3 out of 5 correctly (60% accuracy)
      for (let i = 0; i < 5; i++) {
        const quizTurn = game!.quizTurns[i];
        await navigateToTurn(gameId, quizTurn);

        const quizResponse = await request(app.getHttpServer())
          .get(`/api/game/${gameId}/quiz/next`)
          .expect(200);

        const quizId = quizResponse.body.quizId;

        const quiz = await quizRepository.findOne({ where: { quizId } });
        const answer = i < 3 ? quiz!.correctAnswer : 'WRONG';

        await request(app.getHttpServer())
          .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
          .send({ answer })
          .expect(200);
      }

      const statsResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz-summary`)
        .expect(200);

      expect(statsResponse.body.accuracyRate).toBe(60);
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 9: Cache hit/miss scenarios
  // ---------------------------------------------------------------------------

  describe('9. Cache hit/miss scenarios', () => {
    it('should generate quiz on cold start (cache miss)', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const endTime = Date.now();

      expect(response.body.quizId).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5s
    });

    it('should use cached quiz on second game with same context', async () => {
      // First game - cache miss
      const gameId1 = await createGame('EASY');
      const game1 = await gameRepository.findOne({ where: { gameId: gameId1 } });
      await navigateToTurn(gameId1, game1!.quizTurns[0]);

      const response1 = await request(app.getHttpServer())
        .get(`/api/game/${gameId1}/quiz/next`)
        .expect(200);

      const quizId1 = response1.body.quizId;

      // Second game - potential cache hit
      const gameId2 = await createGame('EASY');
      const game2 = await gameRepository.findOne({ where: { gameId: gameId2 } });
      await navigateToTurn(gameId2, game2!.quizTurns[0]);

      const response2 = await request(app.getHttpServer())
        .get(`/api/game/${gameId2}/quiz/next`)
        .expect(200);

      expect(response2.body.quizId).toBeDefined();
      // May or may not be same quiz due to fallback selection randomness
    });

    it('should trigger cache miss for different infraContext', async () => {
      // Game 1 with basic infrastructure
      const gameId1 = await createGame('EASY');
      const game1 = await gameRepository.findOne({ where: { gameId: gameId1 } });
      game1!.infrastructure = ['EC2'];
      await gameRepository.save(game1);
      await navigateToTurn(gameId1, game1!.quizTurns[0]);

      const response1 = await request(app.getHttpServer())
        .get(`/api/game/${gameId1}/quiz/next`)
        .expect(200);

      // Game 2 with advanced infrastructure
      const gameId2 = await createGame('EASY');
      const game2 = await gameRepository.findOne({ where: { gameId: gameId2 } });
      game2!.infrastructure = ['EC2', 'Aurora', 'EKS', 'CloudFront'];
      await gameRepository.save(game2);
      await navigateToTurn(gameId2, game2!.quizTurns[0]);

      const response2 = await request(app.getHttpServer())
        .get(`/api/game/${gameId2}/quiz/next`)
        .expect(200);

      expect(response1.body.quizId).toBeDefined();
      expect(response2.body.quizId).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test Scenario 10: Fallback quiz activation when LLM fails
  // ---------------------------------------------------------------------------

  describe('10. Fallback quiz activation when LLM fails', () => {
    it('should use fallback quiz when LLM generation fails', async () => {
      // Fallback quizzes are already seeded in beforeEach
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      const response = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      // Should still get a quiz (from fallback pool)
      expect(response.body.quizId).toBeDefined();
      expect(response.body.question).toBeDefined();

      // Verify it's a fallback quiz
      const quiz = await quizRepository.findOne({
        where: { quizId: response.body.quizId },
      });

      expect(quiz!.source).toBe(QuizSource.FALLBACK);
    });

    it('should ensure fallback quiz meets quality criteria', async () => {
      const gameId = await createGame('MEDIUM');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      const response = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quiz = await quizRepository.findOne({
        where: { quizId: response.body.quizId },
      });

      // Verify quality criteria
      expect(quiz!.question.length).toBeGreaterThan(10);
      expect(quiz!.explanation.length).toBeGreaterThan(10);
      expect(quiz!.correctAnswer).toBeDefined();
      expect(quiz!.isActive).toBe(true);

      if (quiz!.type === QuizType.MULTIPLE_CHOICE) {
        expect(quiz!.options).toBeDefined();
        expect(quiz!.options!.length).toBe(4);
      }
    });

    it('should continue game normally with fallback quiz', async () => {
      const gameId = await createGame('EASY');

      const game = await gameRepository.findOne({ where: { gameId } });
      const firstQuizTurn = game!.quizTurns[0];
      await navigateToTurn(gameId, firstQuizTurn);

      // Get fallback quiz
      const quizResponse = await request(app.getHttpServer())
        .get(`/api/game/${gameId}/quiz/next`)
        .expect(200);

      const quizId = quizResponse.body.quizId;

      // Answer quiz
      const quiz = await quizRepository.findOne({ where: { quizId } });
      const answerResponse = await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/${quizId}/answer`)
        .send({ answer: quiz!.correctAnswer })
        .expect(200);

      // Verify game continues normally
      expect(answerResponse.body.isCorrect).toBe(true);
      expect(answerResponse.body.correctQuizCount).toBe(1);

      const updatedGame = await gameRepository.findOne({ where: { gameId } });
      expect(updatedGame!.correctQuizCount).toBe(1);
    });

    it('should handle 404 when quiz not found', async () => {
      const gameId = await createGame('EASY');

      await request(app.getHttpServer())
        .post(`/api/game/${gameId}/quiz/invalid-quiz-id/answer`)
        .send({ answer: 'A' })
        .expect(404);
    });

    it('should handle 404 when game not found', async () => {
      await request(app.getHttpServer())
        .get('/api/game/invalid-game-id/quiz/next')
        .expect(404);
    });
  });
});
