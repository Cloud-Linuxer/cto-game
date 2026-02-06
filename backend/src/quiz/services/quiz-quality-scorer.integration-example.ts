/**
 * QuizQualityScorerService Integration Example
 *
 * This file demonstrates how to integrate QuizQualityScorerService
 * into the LLM quiz generation workflow.
 *
 * NOT FOR PRODUCTION - Example code only
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz, QuizDifficulty } from '../../database/entities/quiz.entity';
import { QuizQualityScorerService } from './quiz-quality-scorer.service';
import { LLMQuizGeneratorService } from './llm-quiz-generator.service';

@Injectable()
export class QuizGenerationWorkflowExample {
  private readonly logger = new Logger(QuizGenerationWorkflowExample.name);

  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    private readonly llmGenerator: LLMQuizGeneratorService,
    private readonly qualityScorer: QuizQualityScorerService,
  ) {}

  /**
   * Example 1: Generate quiz with quality validation
   *
   * Generates a quiz using LLM and validates quality.
   * Retries up to 3 times if quality is below threshold.
   */
  async generateValidatedQuiz(
    difficulty: QuizDifficulty,
    infraContext: string[],
    turnNumber: number,
  ): Promise<Quiz> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      this.logger.log(`Generating quiz attempt ${attempt}/${maxRetries}`);

      try {
        // Generate quiz with LLM
        const quiz = await this.llmGenerator.generateQuiz(
          difficulty,
          infraContext,
          { turnNumber, useCache: true },
        );

        // Evaluate quality
        const score = await this.qualityScorer.scoreQuiz(quiz, infraContext);

        this.logger.log(`Quiz quality score: ${score.total}/100`);

        // Check if passed minimum threshold
        if (score.passed) {
          // Save quiz with quality score
          quiz.qualityScore = score.total;
          await this.quizRepository.save(quiz);

          this.logger.log(`✅ Quiz generated successfully with score ${score.total}`);
          return quiz;
        } else {
          // Log suggestions for debugging
          this.logger.warn(`❌ Quiz failed quality check (${score.total}/100)`);
          this.logger.warn(`Suggestions: ${score.suggestions.join(', ')}`);

          if (attempt < maxRetries) {
            this.logger.log('Retrying quiz generation...');
          }
        }
      } catch (error) {
        this.logger.error(`Quiz generation attempt ${attempt} failed:`, error);
      }
    }

    // Fallback: Use pre-generated quiz pool
    this.logger.warn('Max retries reached, using fallback quiz');
    throw new Error('Failed to generate high-quality quiz after 3 attempts');
  }

  /**
   * Example 2: Batch quality evaluation
   *
   * Evaluates quality of multiple quizzes and filters by threshold.
   */
  async batchEvaluateQuizzes(quizzes: Quiz[], minScore: number = 80): Promise<Quiz[]> {
    const results = await Promise.all(
      quizzes.map(async (quiz) => {
        const score = await this.qualityScorer.scoreQuiz(quiz, quiz.infraContext);
        return { quiz, score };
      }),
    );

    // Filter by minimum score
    const passedQuizzes = results
      .filter((result) => result.score.total >= minScore)
      .map((result) => {
        result.quiz.qualityScore = result.score.total;
        return result.quiz;
      });

    this.logger.log(`Batch evaluation: ${passedQuizzes.length}/${quizzes.length} quizzes passed (≥${minScore})`);

    return passedQuizzes;
  }

  /**
   * Example 3: Quality monitoring dashboard
   *
   * Generates quality statistics for monitoring.
   */
  async getQualityStatistics(startDate: Date, endDate: Date): Promise<any> {
    const quizzes = await this.quizRepository.find({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        } as any,
      },
    });

    // Re-evaluate quality for statistics
    const scores = await Promise.all(
      quizzes.map(async (quiz) => {
        const score = await this.qualityScorer.scoreQuiz(quiz, quiz.infraContext);
        return score;
      }),
    );

    // Calculate statistics
    const totalQuizzes = scores.length;
    const passedQuizzes = scores.filter((s) => s.passed).length;
    const passRate = (passedQuizzes / totalQuizzes) * 100;

    const avgClarity = scores.reduce((sum, s) => sum + s.clarity, 0) / totalQuizzes;
    const avgRelevance = scores.reduce((sum, s) => sum + s.relevance, 0) / totalQuizzes;
    const avgDifficulty = scores.reduce((sum, s) => sum + s.difficulty, 0) / totalQuizzes;
    const avgEducational = scores.reduce((sum, s) => sum + s.educational, 0) / totalQuizzes;
    const avgTotal = scores.reduce((sum, s) => sum + s.total, 0) / totalQuizzes;

    return {
      period: { start: startDate, end: endDate },
      totalQuizzes,
      passedQuizzes,
      passRate: passRate.toFixed(2) + '%',
      averageScores: {
        clarity: avgClarity.toFixed(2),
        relevance: avgRelevance.toFixed(2),
        difficulty: avgDifficulty.toFixed(2),
        educational: avgEducational.toFixed(2),
        total: avgTotal.toFixed(2),
      },
      distribution: {
        excellent: scores.filter((s) => s.total >= 90).length, // S grade
        good: scores.filter((s) => s.total >= 80 && s.total < 90).length, // A grade
        fair: scores.filter((s) => s.total >= 70 && s.total < 80).length, // B grade
        pass: scores.filter((s) => s.total >= 60 && s.total < 70).length, // C grade
        fail: scores.filter((s) => s.total < 60).length, // D grade
      },
    };
  }

  /**
   * Example 4: Quiz improvement workflow
   *
   * Evaluates quiz and provides detailed improvement suggestions.
   */
  async getImprovementReport(quizId: string): Promise<string> {
    const quiz = await this.quizRepository.findOne({ where: { quizId } });

    if (!quiz) {
      throw new Error(`Quiz not found: ${quizId}`);
    }

    // Generate quality report
    const report = await this.qualityScorer.generateQualityReport(quiz, quiz.infraContext);

    return report;
  }

  /**
   * Example 5: Automatic quiz activation/deactivation
   *
   * Activates high-quality quizzes and deactivates low-quality ones.
   */
  async autoManageQuizActivation(threshold: number = 60): Promise<void> {
    const quizzes = await this.quizRepository.find();

    for (const quiz of quizzes) {
      const score = await this.qualityScorer.scoreQuiz(quiz, quiz.infraContext);

      if (score.total >= threshold && !quiz.isActive) {
        // Activate high-quality quiz
        quiz.isActive = true;
        quiz.qualityScore = score.total;
        await this.quizRepository.save(quiz);
        this.logger.log(`✅ Activated quiz ${quiz.quizId} (score: ${score.total})`);
      } else if (score.total < threshold && quiz.isActive) {
        // Deactivate low-quality quiz
        quiz.isActive = false;
        quiz.qualityScore = score.total;
        await this.quizRepository.save(quiz);
        this.logger.warn(`❌ Deactivated quiz ${quiz.quizId} (score: ${score.total})`);
      }
    }
  }

  /**
   * Example 6: Quality-based quiz selection
   *
   * Selects the best quality quiz from available options.
   */
  async selectBestQuiz(difficulty: QuizDifficulty, infraContext: string[]): Promise<Quiz> {
    // Get candidate quizzes
    const candidates = await this.quizRepository.find({
      where: {
        difficulty,
        isActive: true,
      },
    });

    if (candidates.length === 0) {
      throw new Error('No active quizzes found');
    }

    // Score all candidates
    const scoredCandidates = await Promise.all(
      candidates.map(async (quiz) => {
        const score = await this.qualityScorer.scoreQuiz(quiz, infraContext);
        return { quiz, score };
      }),
    );

    // Sort by total score (descending)
    scoredCandidates.sort((a, b) => b.score.total - a.score.total);

    // Return best quality quiz
    const bestQuiz = scoredCandidates[0];
    this.logger.log(`Selected best quiz with score ${bestQuiz.score.total}/100`);

    return bestQuiz.quiz;
  }
}

/**
 * Example usage in game flow:
 *
 * 1. Player reaches quiz turn
 * 2. Generate quiz with quality validation
 * 3. If quality < 60, retry or use fallback
 * 4. Present quiz to player
 * 5. Record quality score for analytics
 * 6. Monitor quality trends over time
 * 7. Auto-deactivate low-quality quizzes
 */

/**
 * Example monitoring alert:
 *
 * IF average_quality_score < 70 OVER last_24h
 * THEN alert "Quiz quality degrading - check LLM service"
 *
 * IF pass_rate < 80% OVER last_24h
 * THEN alert "Low quiz pass rate - review generation prompts"
 */
