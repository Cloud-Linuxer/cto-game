import { IsString, IsUUID, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 퀴즈 정답 제출 DTO
 */
export class SubmitAnswerDto {
  @ApiProperty({
    description: '게임 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  gameId: string;

  @ApiProperty({
    description: '퀴즈 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  quizId: string;

  @ApiProperty({
    description: '플레이어 답변 (A/B/C/D for MULTIPLE_CHOICE, true/false for OX)',
    example: 'A',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(A|B|C|D|true|false)$/, {
    message: 'Answer must be A, B, C, D, true, or false',
  })
  answer: string;
}
