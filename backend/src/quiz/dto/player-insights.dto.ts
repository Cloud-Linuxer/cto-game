import { ApiProperty } from '@nestjs/swagger';

/**
 * 학습 곡선 데이터 포인트
 */
export class LearningCurvePoint {
  @ApiProperty({
    description: '턴 번호',
    example: 5,
  })
  turnNumber: number;

  @ApiProperty({
    description: '정답 여부',
    example: true,
  })
  isCorrect: boolean;

  @ApiProperty({
    description: '누적 정답률 (%)',
    example: 80.0,
  })
  cumulativeAccuracy: number;
}

/**
 * 컨텍스트별 성과 정보
 */
export class ContextPerformance {
  @ApiProperty({
    description: 'AWS 서비스 컨텍스트',
    example: 'EC2',
  })
  context: string;

  @ApiProperty({
    description: '정답률 (%)',
    example: 85.5,
  })
  accuracy: number;

  @ApiProperty({
    description: '해당 컨텍스트 문제 수',
    example: 12,
  })
  totalQuestions: number;
}

/**
 * 플레이어 학습 인사이트 DTO
 * Player-specific quiz insights and learning patterns
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Feature: Feature 5 (Analytics & Insights)
 * Task: #28
 */
export class PlayerInsightsDto {
  @ApiProperty({
    description: '게임 ID',
    example: 'game-uuid-123',
  })
  gameId: string;

  @ApiProperty({
    description: '총 풀이한 퀴즈 수',
    example: 5,
  })
  totalQuizzes: number;

  @ApiProperty({
    description: '정답 수',
    example: 4,
  })
  correctCount: number;

  @ApiProperty({
    description: '정답률 (%)',
    example: 80.0,
  })
  accuracyRate: number;

  @ApiProperty({
    description: '획득한 퀴즈 보너스',
    example: 40,
  })
  quizBonus: number;

  @ApiProperty({
    type: [LearningCurvePoint],
    description: '학습 곡선 데이터 (턴별 누적 정답률)',
  })
  learningCurve: LearningCurvePoint[];

  @ApiProperty({
    type: [ContextPerformance],
    description: '가장 성과가 좋은 AWS 컨텍스트 Top 3',
  })
  bestPerformingContexts: ContextPerformance[];

  @ApiProperty({
    description: '난이도별 정답률 (%)',
    example: {
      EASY: 100.0,
      MEDIUM: 75.0,
      HARD: 50.0,
    },
  })
  difficultyAccuracy: Record<string, number>;

  @ApiProperty({
    type: [String],
    description: '학습 개선 추천 사항',
    example: [
      'Focus on architectural decisions and service integration patterns',
      'Improve knowledge in: Aurora, EKS',
    ],
  })
  recommendations: string[];
}
