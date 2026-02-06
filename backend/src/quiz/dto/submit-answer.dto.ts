import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 퀴즈 정답 제출 DTO
 * Note: gameId and quizId are extracted from URL path params, not body
 */
export class SubmitAnswerDto {
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
