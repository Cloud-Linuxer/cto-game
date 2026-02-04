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

  @ApiProperty({ description: '투자 실패 여부', required: false })
  investmentFailed?: boolean;

  @ApiProperty({ description: '투자 실패 메시지', required: false })
  investmentFailureMessage?: string;

  @ApiProperty({ description: '최대 수용 유저수', required: false })
  maxUserCapacity?: number;

  @ApiProperty({ description: '용량 초과 여부', required: false })
  capacityExceeded?: boolean;

  @ApiProperty({ description: '용량 초과 메시지', required: false })
  capacityExceededMessage?: string;

  @ApiProperty({ description: '채용된 인원 목록', type: [String], required: false })
  hiredStaff?: string[];

  @ApiProperty({ description: '다중 선택 가능 여부 (개발자 채용 효과)', required: false })
  multiChoiceEnabled?: boolean;

  @ApiProperty({ description: '컨설팅 효과 메시지', required: false })
  consultingMessage?: string;

  // --- Phase 1 additions ---

  @ApiProperty({ description: '난이도 모드', enum: ['EASY', 'NORMAL', 'HARD'], required: false })
  difficultyMode?: string;

  @ApiProperty({ description: '등급 (S/A/B/C/F)', required: false })
  grade?: string;

  @ApiProperty({ description: '최대 턴 수 (난이도에 따라 다름)', required: false })
  maxTurns?: number;

  @ApiProperty({ description: '용량 경고 레벨', enum: ['GREEN', 'YELLOW', 'RED'], required: false })
  capacityWarningLevel?: string;

  @ApiProperty({ description: '경고 메시지 목록', type: [String], required: false })
  warnings?: string[];

  @ApiProperty({ description: '용량 사용률 (%)', required: false })
  capacityUsagePercent?: number;

  // --- Phase 2 additions ---

  @ApiProperty({ description: '달성한 승리 경로', required: false })
  victoryPath?: string;

  @ApiProperty({ description: '승리 경로별 진행률 (%)', required: false })
  victoryPathProgress?: Record<string, number>;

  // --- Phase 3 additions ---

  @ApiProperty({ description: '복원력 스택 수 (0-3)', required: false })
  resilienceStacks?: number;

  @ApiProperty({ description: '파산 유예 잔여 턴 (0이면 유예 없음)', required: false })
  bankruptcyGraceTurns?: number;

  @ApiProperty({ description: '컴백 보너스 활성 여부', required: false })
  comebackActive?: boolean;

  @ApiProperty({ description: '회복/복원 이벤트 메시지 목록', type: [String], required: false })
  recoveryMessages?: string[];
}
