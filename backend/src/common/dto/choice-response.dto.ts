import { ApiProperty } from '@nestjs/swagger';

export class ChoiceEffectsDto {
  @ApiProperty({ description: '유저 수 변화' })
  users: number;

  @ApiProperty({ description: '자금 변화' })
  cash: number;

  @ApiProperty({ description: '신뢰도 변화' })
  trust: number;

  @ApiProperty({ description: '추가될 인프라', type: [String] })
  infra: string[];
}

export class ChoiceResponseDto {
  @ApiProperty({ description: '선택지 ID' })
  choiceId: number;

  @ApiProperty({ description: '턴 번호' })
  turnNumber: number;

  @ApiProperty({ description: '선택지 텍스트' })
  text: string;

  @ApiProperty({ description: '선택 효과' })
  effects: ChoiceEffectsDto;

  @ApiProperty({ description: '다음 턴 번호' })
  nextTurn: number;

  @ApiProperty({ description: '카테고리', required: false })
  category?: string;

  @ApiProperty({ description: '설명', required: false })
  description?: string;
}
