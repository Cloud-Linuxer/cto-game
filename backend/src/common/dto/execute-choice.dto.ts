import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ExecuteChoiceDto {
  @ApiProperty({
    description: '선택한 선택지 ID (단일 또는 배열)',
    oneOf: [
      { type: 'number' },
      { type: 'array', items: { type: 'number' } }
    ],
    example: 1
  })
  @IsNotEmpty()
  choiceId: number | number[];
}
