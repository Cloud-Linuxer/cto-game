import { ApiProperty } from '@nestjs/swagger';
import { ChoiceResponseDto } from './choice-response.dto';

export class TurnResponseDto {
  @ApiProperty({ description: '턴 ID' })
  turnId: number;

  @ApiProperty({ description: '턴 번호' })
  turnNumber: number;

  @ApiProperty({ description: '이벤트 텍스트' })
  eventText: string;

  @ApiProperty({ description: '설명', required: false })
  description?: string;

  @ApiProperty({ description: '선택 가능한 선택지 목록', type: [ChoiceResponseDto] })
  choices: ChoiceResponseDto[];
}
