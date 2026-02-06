import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { GameService } from '../game/game.service';
import {
  GenerateQuizDto,
  SubmitAnswerDto,
  QuizResponseDto,
  QuizResultDto,
  QuizStatisticsDto,
} from './dto';
import { Quiz } from '../database/entities/quiz.entity';

/**
 * QuizController
 *
 * AWS 퀴즈 시스템 API 엔드포인트
 *
 * 주요 기능:
 * 1. POST /api/quiz/generate - LLM 기반 퀴즈 생성
 * 2. GET /api/game/:gameId/quiz/next - 현재 턴 퀴즈 조회
 * 3. POST /api/game/:gameId/quiz/:quizId/answer - 답변 제출 및 검증
 * 4. GET /api/game/:gameId/quiz-summary - 게임별 퀴즈 통계
 * 5. GET /api/quiz/statistics - 전체 퀴즈 통계
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 1 (Core Quiz System)
 * Task: Task #10
 */
@ApiTags('Quiz')
@Controller()
export class QuizController {
  private readonly logger = new Logger(QuizController.name);

  constructor(
    private readonly quizService: QuizService,
    private readonly gameService: GameService,
  ) {}

  /**
   * 1. POST /api/quiz/generate - 퀴즈 생성
   *
   * LLM을 사용하여 새로운 퀴즈를 생성합니다.
   * 실패 시 Fallback 퀴즈를 반환합니다.
   *
   * @param dto 퀴즈 생성 옵션 (난이도, 인프라 컨텍스트)
   * @returns 생성된 퀴즈 (정답 제외)
   */
  @Post('quiz/generate')
  @ApiOperation({ summary: 'Generate a new quiz using LLM' })
  @ApiResponse({
    status: 201,
    description: 'Quiz generated successfully',
    type: QuizResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Quiz generation failed',
  })
  async generateQuiz(
    @Body() dto: GenerateQuizDto,
  ): Promise<QuizResponseDto> {
    this.logger.log(
      `POST /api/quiz/generate - difficulty=${dto.difficulty}, infraContext=${dto.infraContext?.join(',')}`,
    );

    try {
      const quiz = await this.quizService.generateQuiz({
        difficulty: dto.difficulty,
        infraContext: dto.infraContext || [],
      });

      return this.toQuizResponse(quiz, false);
    } catch (error) {
      this.logger.error(
        `Failed to generate quiz: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to generate quiz. Please try again.',
      );
    }
  }

  /**
   * 2. GET /api/game/:gameId/quiz/next - 현재 턴 퀴즈 조회
   *
   * 현재 턴에 퀴즈가 등장해야 하는지 확인하고,
   * 등장해야 한다면 새 퀴즈를 생성하여 반환합니다.
   *
   * @param gameId 게임 ID
   * @returns 퀴즈 (있는 경우) 또는 204 No Content
   */
  @Get('game/:gameId/quiz/next')
  @ApiOperation({ summary: 'Check if quiz should appear at current turn' })
  @ApiParam({
    name: 'gameId',
    description: '게임 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz available for current turn',
    type: QuizResponseDto,
  })
  @ApiResponse({
    status: 204,
    description: 'No quiz for current turn',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async getNextQuiz(
    @Param('gameId') gameId: string,
  ): Promise<QuizResponseDto | null> {
    this.logger.log(`GET /api/game/${gameId}/quiz/next`);

    try {
      const game = await this.gameService.getGame(gameId);

      if (!game) {
        throw new NotFoundException(`Game not found: gameId=${gameId}`);
      }

      // Check if current turn is in quizTurns array
      const shouldShowQuiz =
        game.quizTurns && game.quizTurns.includes(game.currentTurn);

      if (!shouldShowQuiz) {
        this.logger.log(
          `No quiz for turn ${game.currentTurn} in game ${gameId}`,
        );
        return null;
      }

      // Generate quiz based on game state
      const quiz = await this.quizService.generateQuiz({
        difficulty: this.mapGameDifficultyToQuizDifficulty(
          game.difficultyMode,
        ),
        infraContext: game.infrastructure || [],
        turnNumber: game.currentTurn,
        gameId: game.gameId,
      });

      this.logger.log(
        `Quiz generated for turn ${game.currentTurn}: quizId=${quiz.quizId}`,
      );

      return this.toQuizResponse(quiz, false);
    } catch (error) {
      this.logger.error(
        `Failed to get next quiz: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve quiz. Please try again.',
      );
    }
  }

  /**
   * 3. POST /api/game/:gameId/quiz/:quizId/answer - 답변 제출
   *
   * 플레이어의 퀴즈 답변을 검증하고 결과를 반환합니다.
   * 정답 시 게임의 correctQuizCount를 증가시킵니다.
   *
   * @param gameId 게임 ID
   * @param quizId 퀴즈 ID
   * @param dto 답변 정보
   * @returns 답변 결과 (정답 여부, 정답, 해설)
   */
  @Post('game/:gameId/quiz/:quizId/answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit answer and get result' })
  @ApiParam({
    name: 'gameId',
    description: '게임 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'quizId',
    description: '퀴즈 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer validated successfully',
    type: QuizResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid answer format',
  })
  @ApiResponse({
    status: 404,
    description: 'Game or quiz not found',
  })
  async submitAnswer(
    @Param('gameId') gameId: string,
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAnswerDto,
  ): Promise<QuizResultDto> {
    this.logger.log(
      `POST /api/game/${gameId}/quiz/${quizId}/answer - answer=${dto.answer}`,
    );

    try {
      // Validate game exists
      const game = await this.gameService.getGame(gameId);
      if (!game) {
        throw new NotFoundException(`Game not found: gameId=${gameId}`);
      }

      // Validate answer
      const isCorrect = await this.quizService.validateAnswer(
        quizId,
        dto.answer,
      );

      // Record answer in history
      await this.quizService.recordAnswer(
        gameId,
        quizId,
        dto.answer,
        isCorrect,
        game.currentTurn,
      );

      // Get quiz for explanation and correct answer
      const quiz = await this.quizService['quizRepository'].findOne({
        where: { quizId },
      });

      if (!quiz) {
        throw new NotFoundException(`Quiz not found: quizId=${quizId}`);
      }

      // Update game correctQuizCount if correct
      let updatedCorrectCount = game.correctQuizCount || 0;
      if (isCorrect) {
        updatedCorrectCount += 1;
        await this.gameService['gameRepository'].update(
          { gameId },
          { correctQuizCount: updatedCorrectCount },
        );

        this.logger.log(
          `Updated correctQuizCount for game ${gameId}: ${updatedCorrectCount}`,
        );
      }

      const result: QuizResultDto = {
        isCorrect,
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation,
        correctQuizCount: updatedCorrectCount,
      };

      this.logger.log(
        `Answer submitted: isCorrect=${isCorrect}, correctQuizCount=${updatedCorrectCount}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to submit answer: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to submit answer. Please try again.',
      );
    }
  }

  /**
   * 4. GET /api/game/:gameId/quiz-summary - 게임별 퀴즈 통계
   *
   * 특정 게임의 퀴즈 통계를 조회합니다.
   * - correctQuizCount: 맞춘 개수
   * - quizBonus: 보너스 점수
   * - accuracyRate: 정답률
   *
   * @param gameId 게임 ID
   * @returns 게임별 퀴즈 통계
   */
  @Get('game/:gameId/quiz-summary')
  @ApiOperation({ summary: 'Get quiz statistics for a specific game' })
  @ApiParam({
    name: 'gameId',
    description: '게임 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz statistics retrieved successfully',
    type: QuizStatisticsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async getGameQuizSummary(
    @Param('gameId') gameId: string,
  ): Promise<QuizStatisticsDto> {
    this.logger.log(`GET /api/game/${gameId}/quiz-summary`);

    try {
      const game = await this.gameService.getGame(gameId);
      if (!game) {
        throw new NotFoundException(`Game not found: gameId=${gameId}`);
      }

      const statistics = await this.quizService.getQuizStatistics(gameId);

      this.logger.log(
        `Quiz summary for game ${gameId}: totalQuizzes=${statistics.totalQuizzes}, accuracyRate=${statistics.accuracyRate}%`,
      );

      return statistics;
    } catch (error) {
      this.logger.error(
        `Failed to get quiz summary: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve quiz summary. Please try again.',
      );
    }
  }

  /**
   * 5. GET /api/quiz/statistics - 전체 퀴즈 통계
   *
   * 모든 게임의 퀴즈 통계를 조회합니다.
   * - 총 퀴즈 수
   * - 평균 정답률
   * - 난이도별 통계
   *
   * @returns 전체 퀴즈 통계
   */
  @Get('quiz/statistics')
  @ApiOperation({ summary: 'Get overall quiz statistics' })
  @ApiResponse({
    status: 200,
    description: 'Overall quiz statistics retrieved successfully',
    type: QuizStatisticsDto,
  })
  async getOverallStatistics(): Promise<QuizStatisticsDto> {
    this.logger.log('GET /api/quiz/statistics');

    try {
      const statistics = await this.quizService.getQuizStatistics();

      this.logger.log(
        `Overall quiz statistics: totalQuizzes=${statistics.totalQuizzes}, accuracyRate=${statistics.accuracyRate}%`,
      );

      return statistics;
    } catch (error) {
      this.logger.error(
        `Failed to get overall statistics: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to retrieve quiz statistics. Please try again.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  /**
   * Quiz 엔티티를 QuizResponseDto로 변환
   *
   * @param quiz Quiz 엔티티
   * @param includeAnswer 정답 포함 여부
   * @returns QuizResponseDto
   */
  private toQuizResponse(
    quiz: Quiz,
    includeAnswer: boolean,
  ): QuizResponseDto {
    const response: QuizResponseDto = {
      quizId: quiz.quizId,
      type: quiz.type,
      difficulty: quiz.difficulty,
      question: quiz.question,
      options: quiz.options,
      explanation: quiz.explanation,
      infraContext: quiz.infraContext,
    };

    if (includeAnswer) {
      response.correctAnswer = quiz.correctAnswer;
    }

    return response;
  }

  /**
   * 게임 난이도를 퀴즈 난이도로 매핑
   *
   * @param gameDifficulty 게임 난이도 (EASY, NORMAL, HARD)
   * @returns 퀴즈 난이도 (EASY, MEDIUM, HARD)
   */
  private mapGameDifficultyToQuizDifficulty(
    gameDifficulty: string,
  ): import('../database/entities/quiz.entity').QuizDifficulty {
    const { QuizDifficulty } = require('../database/entities/quiz.entity');

    switch (gameDifficulty?.toUpperCase()) {
      case 'EASY':
        return QuizDifficulty.EASY;
      case 'HARD':
        return QuizDifficulty.HARD;
      case 'NORMAL':
      default:
        return QuizDifficulty.MEDIUM;
    }
  }
}
