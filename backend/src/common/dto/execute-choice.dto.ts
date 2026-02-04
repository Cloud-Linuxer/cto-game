import { IsNotEmpty, IsNumber, IsArray, ValidateIf, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteChoiceDto {
  @ApiProperty({
    description: '선택지 ID (단일 또는 배열)',
    example: 1,
    oneOf: [{ type: 'number' }, { type: 'array', items: { type: 'number' } }],
  })
  @IsNotEmpty()
  choiceId: number | number[];
}
