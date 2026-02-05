import { ApiProperty } from '@nestjs/swagger';
import { QuizDifficulty, QuizType } from '../../database/entities/quiz.entity';

/**
 * 문제 품질 플래그
 */
export enum QuestionQualityFlag {
  TOO_EASY = 'TOO_EASY', // 정답률 85% 이상
  TOO_HARD = 'TOO_HARD', // 정답률 25% 이하
  BALANCED = 'BALANCED', // 정답률 25-85%
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA', // 10회 미만 시도
}

/**
 * 문제 품질 메트릭 DTO
 * Question quality metrics for quiz optimization
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 5 (Analytics & Insights)
 * Task: #28
 */
export class QuestionQualityDto {
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
    description: '난이도',
    enum: QuizDifficulty,
    example: QuizDifficulty.MEDIUM,
  })
  difficulty: QuizDifficulty;

  @ApiProperty({
    description: '퀴즈 유형',
    enum: QuizType,
    example: QuizType.MULTIPLE_CHOICE,
  })
  type: QuizType;

  @ApiProperty({
    description: '사용 횟수',
    example: 45,
  })
  usageCount: number;

  @ApiProperty({
    description: '정답률 (%) - null이면 데이터 부족',
    example: 72.5,
    nullable: true,
  })
  accuracyRate: number | null;

  @ApiProperty({
    description: '품질 플래그',
    enum: QuestionQualityFlag,
    example: QuestionQualityFlag.BALANCED,
  })
  qualityFlag: QuestionQualityFlag;

  @ApiProperty({
    description: '관련 AWS 서비스 컨텍스트',
    type: [String],
    example: ['EC2', 'ALB', 'EKS'],
  })
  infraContext: string[];

  @ApiProperty({
    description: '생성일',
    example: '2026-02-05T12:00:00Z',
  })
  createdAt: Date;
}
