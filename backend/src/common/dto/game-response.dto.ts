import { ApiProperty } from '@nestjs/swagger';
import { GameStatus } from '../../database/entities/game.entity';

export class GameResponseDto {
  @ApiProperty({ description: '게임 ID' })
  gameId: string;

  @ApiProperty({ description: '현재 턴 번호' })
  currentTurn: number;

  @ApiProperty({ description: '유저 수' })
  users: number;

  @ApiProperty({ description: '자금 (원)' })
  cash: number;

  @ApiProperty({ description: '신뢰도 (0-100)' })
  trust: number;

  @ApiProperty({ description: '인프라 목록', type: [String] })
  infrastructure: string[];

  @ApiProperty({
    description: '게임 상태',
    enum: GameStatus,
  })
  status: GameStatus;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각' })
  updatedAt: Date;
}
