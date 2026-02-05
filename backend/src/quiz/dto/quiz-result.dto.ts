import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 퀴즈 답변 결과 DTO
 * 정답 제출 후 반환되는 결과 정보
 */
export class QuizResultDto {
  @ApiProperty({
    description: '정답 여부',
    example: true,
  })
  isCorrect: boolean;

  @ApiProperty({
    description: '정답',
    example: 'A',
  })
  correctAnswer: string;

  @ApiProperty({
    description: '해설',
    example:
      'Auto Scaling Group을 생성하려면 Launch Template 또는 Launch Configuration이 필수입니다.',
  })
  explanation: string;

  @ApiPropertyOptional({
    description: '퀴즈 보너스 점수 (correctQuizCount 업데이트 시)',
    example: 5,
  })
  quizBonus?: number;

  @ApiPropertyOptional({
    description: '현재까지 맞춘 퀴즈 개수',
    example: 3,
  })
  correctQuizCount?: number;
}
