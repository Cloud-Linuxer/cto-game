import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  QuizType,
  QuizDifficulty,
} from '../../database/entities/quiz.entity';

/**
 * 퀴즈 응답 DTO
 * 클라이언트에게 전달되는 퀴즈 정보
 * correctAnswer는 정답 제출 전에는 제외됨
 */
export class QuizResponseDto {
  @ApiProperty({
    description: '퀴즈 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  quizId: string;

  @ApiProperty({
    enum: QuizType,
    description: '퀴즈 유형 (MULTIPLE_CHOICE, OX)',
    example: QuizType.MULTIPLE_CHOICE,
  })
  type: QuizType;

  @ApiProperty({
    enum: QuizDifficulty,
    description: '퀴즈 난이도 (EASY, MEDIUM, HARD)',
    example: QuizDifficulty.MEDIUM,
  })
  difficulty: QuizDifficulty;

  @ApiProperty({
    description: '퀴즈 문제',
    example: 'EC2 인스턴스를 Auto Scaling Group에 추가할 때 필요한 필수 구성 요소는?',
  })
  question: string;

  @ApiPropertyOptional({
    type: [String],
    description: '선택지 (4지선다만 해당)',
    example: ['Launch Template', 'VPC', 'IAM Role', 'CloudWatch Alarm'],
  })
  options?: string[];

  @ApiPropertyOptional({
    description: '정답 (정답 제출 후에만 포함)',
    example: 'A',
  })
  correctAnswer?: string;

  @ApiProperty({
    description: '해설',
    example:
      'Auto Scaling Group을 생성하려면 Launch Template 또는 Launch Configuration이 필수입니다.',
  })
  explanation: string;

  @ApiPropertyOptional({
    type: [String],
    description: '관련 AWS 서비스',
    example: ['EC2', 'Auto Scaling'],
  })
  infraContext?: string[];
}
