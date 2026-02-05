import { ApiProperty } from '@nestjs/swagger';

/**
 * 전체 퀴즈 시스템 통계 DTO
 * Overall statistics for the entire quiz system
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 5 (Analytics & Insights)
 * Task: #28
 */
export class OverallStatsDto {
  @ApiProperty({
    description: '총 퀴즈 수',
    example: 250,
  })
  totalQuizzes: number;

  @ApiProperty({
    description: '총 답변 수 (모든 플레이어)',
    example: 1250,
  })
  totalAnswers: number;

  @ApiProperty({
    description: '정답 수',
    example: 875,
  })
  correctAnswers: number;

  @ApiProperty({
    description: '전체 정답률 (%)',
    example: 70.0,
  })
  accuracyRate: number;

  @ApiProperty({
    description: '게임당 평균 퀴즈 보너스',
    example: 32.5,
  })
  averageBonus: number;
}
