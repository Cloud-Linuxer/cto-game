import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class ExecuteChoiceDto {
  @ApiProperty({ description: '선택한 선택지 ID' })
  @IsInt()
  @IsPositive()
  choiceId: number;
}
