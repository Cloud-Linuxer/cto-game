import { IsEnum, IsArray, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizDifficulty } from '../../database/entities/quiz.entity';

/**
 * 퀴즈 생성 요청 DTO
 */
export class GenerateQuizDto {
  @ApiProperty({
    enum: QuizDifficulty,
    description: '퀴즈 난이도 (EASY, MEDIUM, HARD)',
    example: QuizDifficulty.MEDIUM,
  })
  @IsEnum(QuizDifficulty)
  difficulty: QuizDifficulty;

  @ApiPropertyOptional({
    type: [String],
    description: '현재 게임의 인프라 컨텍스트 (관련 AWS 서비스)',
    example: ['EC2', 'Aurora', 'ALB'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  infraContext: string[];
}
