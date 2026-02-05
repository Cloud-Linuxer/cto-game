import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Quiz, QuizDifficulty } from '../../database/entities/quiz.entity';
import { QuizHistory } from '../../database/entities/quiz-history.entity';
import { Game } from '../../database/entities/game.entity';
import { OverallStatsDto } from '../dto/overall-stats.dto';
import {
  DifficultyStatsDto,
  MostMissedQuestionDto,
} from '../dto/difficulty-stats.dto';
import {
  QuestionQualityDto,
  QuestionQualityFlag,
} from '../dto/question-quality.dto';
import {
  PlayerInsightsDto,
  LearningCurvePoint,
  ContextPerformance,
} from '../dto/player-insights.dto';

/**
 * QuizAnalyticsService
 *
 * 퀴즈 성과, 문제 품질, 플레이어 학습 패턴에 대한 종합 분석 및 인사이트를 제공합니다.
 *
 * Provides comprehensive analytics and insights about quiz performance,
 * question quality, and player learning patterns.
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 5 (Analytics & Insights)
 * Task: #28
 */
@Injectable()
export class QuizAnalyticsService {
  private readonly logger = new Logger(QuizAnalyticsService.name);

  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizHistory)
    private readonly quizHistoryRepository: Repository<QuizHistory>,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  /**
   * 전체 퀴즈 시스템 통계 조회
   * Get overall statistics for the entire quiz system
   */
  async getOverallStatistics(): Promise<OverallStatsDto> {
    this.logger.log('Fetching overall quiz statistics');

    // 총 퀴즈 수 (활성화된 퀴즈만)
    const totalQuizzes = await this.quizRepository.count({
      where: { isActive: true },
    });

    // 총 답변 수
    const totalAnswers = await this.quizHistoryRepository.count();

    // 정답 수
    const correctAnswers = await this.quizHistoryRepository.count({
      where: { isCorrect: true },
    });

    // 정답률 계산
    const accuracyRate =
      totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // 게임당 평균 퀴즈 보너스 계산
    const games = await this.gameRepository.find({
      select: ['quizBonus'],
    });

    const avgBonus =
      games.length > 0
        ? games.reduce((sum, g) => sum + (g.quizBonus || 0), 0) / games.length
        : 0;

    const result: OverallStatsDto = {
      totalQuizzes,
      totalAnswers,
      correctAnswers,
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      averageBonus: parseFloat(avgBonus.toFixed(1)),
    };

    this.logger.log(
      `Overall stats: ${totalQuizzes} quizzes, ${totalAnswers} answers, ${result.accuracyRate}% accuracy`,
    );

    return result;
  }

  /**
   * 난이도별 통계 조회
   * Get difficulty-specific statistics
   */
  async getDifficultyStatistics(
    difficulty: QuizDifficulty,
  ): Promise<DifficultyStatsDto> {
    this.logger.log(`Fetching statistics for difficulty: ${difficulty}`);

    // 해당 난이도의 퀴즈 조회
    const quizzes = await this.quizRepository.find({
      where: { difficulty, isActive: true },
    });

    const quizIds = quizzes.map((q) => q.quizId);

    // 답변 이력 조회
    let answers: QuizHistory[] = [];
    if (quizIds.length > 0) {
      answers = await this.quizHistoryRepository.find({
        where: { quizId: In(quizIds) },
      });
    }

    const totalAnswers = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const accuracyRate =
      totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // 가장 많이 틀린 문제 Top 5 계산 (최소 5회 이상 시도된 문제)
    const questionStats = quizzes.map((quiz) => {
      const missRate =
        quiz.totalAnswerCount > 0
          ? ((quiz.totalAnswerCount - quiz.correctAnswerCount) /
              quiz.totalAnswerCount) *
            100
          : 0;

      return {
        quizId: quiz.quizId,
        question: quiz.question,
        totalAttempts: quiz.totalAnswerCount,
        correctAttempts: quiz.correctAnswerCount,
        missRate,
      };
    });

    const mostMissed: MostMissedQuestionDto[] = questionStats
      .filter((q) => q.totalAttempts >= 5) // 최소 5회 시도
      .sort((a, b) => b.missRate - a.missRate)
      .slice(0, 5)
      .map((q) => ({
        quizId: q.quizId,
        question:
          q.question.length > 100
            ? q.question.substring(0, 100) + '...'
            : q.question,
        totalAttempts: q.totalAttempts,
        correctAttempts: q.correctAttempts,
        missRate: parseFloat(q.missRate.toFixed(2)),
      }));

    // 평균 완료 시간 (Phase 2에서 구현)
    const avgCompletionTime = await this.calculateAverageCompletionTime(
      quizIds,
    );

    const result: DifficultyStatsDto = {
      difficulty,
      totalQuizzes: quizzes.length,
      totalAnswers,
      correctAnswers,
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      mostMissedQuestions: mostMissed,
      averageCompletionTime: avgCompletionTime || null,
    };

    this.logger.log(
      `Difficulty ${difficulty}: ${quizzes.length} quizzes, ${result.accuracyRate}% accuracy`,
    );

    return result;
  }

  /**
   * 모든 문제의 품질 메트릭 조회
   * Get question quality metrics for all quizzes
   */
  async getQuestionQualityMetrics(): Promise<QuestionQualityDto[]> {
    this.logger.log('Fetching question quality metrics');

    const quizzes = await this.quizRepository.find({
      where: { isActive: true },
      order: { usageCount: 'DESC' },
    });

    const qualityMetrics = quizzes.map((quiz) => {
      // 정답률 계산
      const accuracyRate =
        quiz.totalAnswerCount > 0
          ? (quiz.correctAnswerCount / quiz.totalAnswerCount) * 100
          : null;

      // 품질 플래그 판정
      let qualityFlag: QuestionQualityFlag =
        QuestionQualityFlag.INSUFFICIENT_DATA;

      if (quiz.totalAnswerCount >= 10) {
        if (accuracyRate >= 85) {
          qualityFlag = QuestionQualityFlag.TOO_EASY;
        } else if (accuracyRate <= 25) {
          qualityFlag = QuestionQualityFlag.TOO_HARD;
        } else {
          qualityFlag = QuestionQualityFlag.BALANCED;
        }
      }

      return {
        quizId: quiz.quizId,
        question:
          quiz.question.length > 100
            ? quiz.question.substring(0, 100) + '...'
            : quiz.question,
        difficulty: quiz.difficulty,
        type: quiz.type,
        usageCount: quiz.usageCount,
        accuracyRate: accuracyRate ? parseFloat(accuracyRate.toFixed(2)) : null,
        qualityFlag,
        infraContext: quiz.infraContext || [],
        createdAt: quiz.createdAt,
      };
    });

    this.logger.log(`Quality metrics calculated for ${quizzes.length} quizzes`);

    return qualityMetrics;
  }

  /**
   * 특정 게임의 플레이어 학습 인사이트 조회
   * Get player-specific insights and learning patterns
   */
  async getPlayerInsights(gameId: string): Promise<PlayerInsightsDto> {
    this.logger.log(`Fetching player insights for game: ${gameId}`);

    // 게임 조회
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found`);
    }

    // 퀴즈 이력 조회
    const history = await this.quizHistoryRepository.find({
      where: { gameId },
      order: { turnNumber: 'ASC' },
    });

    if (history.length === 0) {
      this.logger.warn(`No quiz history found for game: ${gameId}`);
      return {
        gameId,
        totalQuizzes: 0,
        correctCount: 0,
        accuracyRate: 0,
        quizBonus: game.quizBonus,
        learningCurve: [],
        bestPerformingContexts: [],
        difficultyAccuracy: {
          EASY: 0,
          MEDIUM: 0,
          HARD: 0,
        },
        recommendations: ['Complete at least one quiz to see insights'],
      };
    }

    // 학습 곡선 계산 (턴별 누적 정답률)
    const learningCurve: LearningCurvePoint[] = history.map((h, index) => {
      const cumulativeCorrect = history
        .slice(0, index + 1)
        .filter((x) => x.isCorrect).length;
      const cumulativeAccuracy = (cumulativeCorrect / (index + 1)) * 100;

      return {
        turnNumber: h.turnNumber,
        isCorrect: h.isCorrect,
        cumulativeAccuracy: parseFloat(cumulativeAccuracy.toFixed(2)),
      };
    });

    // 컨텍스트별 성과 분석
    const contextPerformanceMap = new Map<
      string,
      { total: number; correct: number }
    >();

    history.forEach((h) => {
      const contexts = h.infraContext || [];
      contexts.forEach((ctx) => {
        if (!contextPerformanceMap.has(ctx)) {
          contextPerformanceMap.set(ctx, { total: 0, correct: 0 });
        }
        const stats = contextPerformanceMap.get(ctx)!;
        stats.total++;
        if (h.isCorrect) stats.correct++;
      });
    });

    const contextStats: ContextPerformance[] = Array.from(
      contextPerformanceMap.entries(),
    )
      .map(([context, stats]) => ({
        context,
        accuracy: parseFloat(((stats.correct / stats.total) * 100).toFixed(2)),
        totalQuestions: stats.total,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    // Top 3 best performing contexts
    const bestPerformingContexts = contextStats.slice(0, 3);

    // 난이도별 정답률 계산
    const difficultyProgress = {
      EASY: history.filter((h) => h.difficulty === QuizDifficulty.EASY),
      MEDIUM: history.filter((h) => h.difficulty === QuizDifficulty.MEDIUM),
      HARD: history.filter((h) => h.difficulty === QuizDifficulty.HARD),
    };

    const difficultyAccuracy = {
      EASY: this.calculateDifficultyAccuracy(difficultyProgress.EASY),
      MEDIUM: this.calculateDifficultyAccuracy(difficultyProgress.MEDIUM),
      HARD: this.calculateDifficultyAccuracy(difficultyProgress.HARD),
    };

    // 추천 사항 생성
    const recommendations = this.generateRecommendations(
      difficultyAccuracy,
      contextStats,
    );

    const totalQuizzes = history.length;
    const correctCount = game.correctQuizCount;
    const accuracyRate =
      totalQuizzes > 0 ? (correctCount / totalQuizzes) * 100 : 0;

    const result: PlayerInsightsDto = {
      gameId,
      totalQuizzes,
      correctCount,
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      quizBonus: game.quizBonus,
      learningCurve,
      bestPerformingContexts,
      difficultyAccuracy,
      recommendations,
    };

    this.logger.log(
      `Player insights: ${totalQuizzes} quizzes, ${result.accuracyRate}% accuracy`,
    );

    return result;
  }

  /**
   * 평균 완료 시간 계산 (Phase 2 구현 예정)
   * Calculate average completion time for quizzes
   */
  private async calculateAverageCompletionTime(
    quizIds: string[],
  ): Promise<number | null> {
    if (quizIds.length === 0) return null;

    // Phase 2에서 timeTaken 필드가 활성화되면 계산
    const historyWithTime = await this.quizHistoryRepository.find({
      where: { quizId: In(quizIds) },
      select: ['timeTaken'],
    });

    const validTimes = historyWithTime
      .filter((h) => h.timeTaken != null && h.timeTaken > 0)
      .map((h) => h.timeTaken);

    if (validTimes.length === 0) return null;

    const avgTime =
      validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length;

    return parseFloat(avgTime.toFixed(1));
  }

  /**
   * 난이도별 정답률 계산 헬퍼
   * Calculate accuracy rate for a specific difficulty
   */
  private calculateDifficultyAccuracy(history: QuizHistory[]): number {
    if (history.length === 0) return 0;

    const correct = history.filter((h) => h.isCorrect).length;
    const accuracy = (correct / history.length) * 100;

    return parseFloat(accuracy.toFixed(2));
  }

  /**
   * 학습 개선 추천 사항 생성
   * Generate personalized learning recommendations
   */
  private generateRecommendations(
    difficultyAccuracy: Record<string, number>,
    contextStats: ContextPerformance[],
  ): string[] {
    const recommendations: string[] = [];

    // 난이도별 추천
    if (difficultyAccuracy.EASY < 60) {
      recommendations.push(
        'Review basic AWS concepts like EC2, S3, and networking',
      );
    }

    if (difficultyAccuracy.MEDIUM < 50) {
      recommendations.push(
        'Focus on architectural decisions and service integration patterns',
      );
    }

    if (difficultyAccuracy.HARD < 40) {
      recommendations.push(
        'Study advanced topics like multi-region deployments and performance optimization',
      );
    }

    // 취약한 컨텍스트 추천 (최소 2문제 이상, 정답률 50% 미만)
    const weakContexts = contextStats.filter(
      (c) => c.accuracy < 50 && c.totalQuestions >= 2,
    );

    if (weakContexts.length > 0) {
      const contextNames = weakContexts.map((c) => c.context).join(', ');
      recommendations.push(`Improve knowledge in: ${contextNames}`);
    }

    // 전체적으로 잘하는 경우
    const overallGood =
      difficultyAccuracy.EASY >= 80 &&
      difficultyAccuracy.MEDIUM >= 70 &&
      difficultyAccuracy.HARD >= 60;

    if (overallGood) {
      recommendations.push(
        'Excellent performance! Consider exploring advanced AWS certifications',
      );
    }

    // 추천 사항이 없으면 기본 메시지
    if (recommendations.length === 0) {
      recommendations.push(
        'Keep practicing to improve your AWS knowledge across all difficulty levels',
      );
    }

    return recommendations;
  }
}
