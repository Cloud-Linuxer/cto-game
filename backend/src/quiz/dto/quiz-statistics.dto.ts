import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizDifficulty } from '../../database/entities/quiz.entity';

/**
 * 난이도별 퀴즈 통계
 */
export class QuizStatisticsByDifficulty {
  @ApiProperty({ description: '퀴즈 난이도', example: QuizDifficulty.MEDIUM })
  difficulty: QuizDifficulty;

  @ApiProperty({ description: '총 퀴즈 수', example: 50 })
  totalQuizzes: number;

  @ApiProperty({ description: '총 답변 수', example: 150 })
  totalAnswers: number;

  @ApiProperty({ description: '정답률 (%)', example: 75.5 })
  accuracyRate: number;

  @ApiProperty({ description: '평균 보너스', example: 5000 })
  averageBonus: number;
}

/**
 * 퀴즈 통계 DTO
 * 전체 퀴즈 시스템의 통계 정보
 */
export class QuizStatisticsDto {
  @ApiProperty({
    description: '총 퀴즈 수 (활성화된 퀴즈)',
    example: 150,
  })
  totalQuizzes: number;

  @ApiProperty({
    description: '총 답변 수 (모든 플레이어)',
    example: 500,
  })
  totalAnswers: number;

  @ApiProperty({
    description: '전체 정답률 (%)',
    example: 72.5,
  })
  accuracyRate: number;

  @ApiProperty({
    description: '평균 보너스 (모든 난이도)',
    example: 6000,
  })
  averageBonus: number;

  @ApiPropertyOptional({
    type: [QuizStatisticsByDifficulty],
    description: '난이도별 통계',
  })
  byDifficulty?: QuizStatisticsByDifficulty[];

  @ApiPropertyOptional({
    description: '통계 생성 시각',
    example: '2026-02-05T12:00:00Z',
  })
  generatedAt?: Date;
}
