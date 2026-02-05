import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizDifficulty } from '../../database/entities/quiz.entity';

/**
 * 가장 많이 틀린 문제 정보
 */
export class MostMissedQuestionDto {
  @ApiProperty({
    description: '퀴즈 ID',
    example: 'quiz-uuid-123',
  })
  quizId: string;

  @ApiProperty({
    description: '문제 내용 (100자 제한)',
    example: 'EC2 인스턴스 유형 중 범용 컴퓨팅에 가장 적합한 것은?',
  })
  question: string;

  @ApiProperty({
    description: '총 시도 횟수',
    example: 45,
  })
  totalAttempts: number;

  @ApiProperty({
    description: '정답 횟수',
    example: 12,
  })
  correctAttempts: number;

  @ApiProperty({
    description: '오답률 (%)',
    example: 73.33,
  })
  missRate: number;
}

/**
 * 난이도별 퀴즈 통계 DTO
 * Difficulty-specific quiz statistics
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 5 (Analytics & Insights)
 * Task: #28
 */
export class DifficultyStatsDto {
  @ApiProperty({
    description: '난이도',
    enum: QuizDifficulty,
    example: QuizDifficulty.MEDIUM,
  })
  difficulty: QuizDifficulty;

  @ApiProperty({
    description: '해당 난이도의 총 퀴즈 수',
    example: 80,
  })
  totalQuizzes: number;

  @ApiProperty({
    description: '총 답변 수',
    example: 350,
  })
  totalAnswers: number;

  @ApiProperty({
    description: '정답 수',
    example: 245,
  })
  correctAnswers: number;

  @ApiProperty({
    description: '정답률 (%)',
    example: 70.0,
  })
  accuracyRate: number;

  @ApiProperty({
    type: [MostMissedQuestionDto],
    description: '가장 많이 틀린 문제 Top 5 (최소 5회 이상 시도된 문제)',
  })
  mostMissedQuestions: MostMissedQuestionDto[];

  @ApiPropertyOptional({
    description: '평균 완료 시간 (초) - Phase 2에서 구현',
    example: 30.5,
    nullable: true,
  })
  averageCompletionTime: number | null;
}
