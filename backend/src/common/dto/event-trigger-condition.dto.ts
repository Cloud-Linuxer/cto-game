import {
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DifficultyMode } from '../../game/game-constants';

/**
 * Event Trigger Condition DTO
 *
 * Validates event trigger conditions with class-validator decorators.
 * Used for API requests to create or update event triggers.
 */
export class EventTriggerConditionDto {
  // --- Turn Range ---

  @ApiProperty({
    description: '이벤트 발생 최소 턴',
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minTurn?: number;

  @ApiProperty({
    description: '이벤트 발생 최대 턴',
    required: false,
    example: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTurn?: number;

  // --- User Thresholds ---

  @ApiProperty({
    description: '최소 유저 수',
    required: false,
    example: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minUsers?: number;

  @ApiProperty({
    description: '최대 유저 수',
    required: false,
    example: 100000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;

  // --- Cash Thresholds ---

  @ApiProperty({
    description: '최소 자금 (원)',
    required: false,
    example: 50000000,
  })
  @IsOptional()
  @IsInt()
  minCash?: number;

  @ApiProperty({
    description: '최대 자금 (원)',
    required: false,
    example: 500000000,
  })
  @IsOptional()
  @IsInt()
  maxCash?: number;

  // --- Trust Thresholds ---

  @ApiProperty({
    description: '최소 신뢰도 (0-100)',
    required: false,
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minTrust?: number;

  @ApiProperty({
    description: '최대 신뢰도 (0-100)',
    required: false,
    example: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxTrust?: number;

  // --- Infrastructure Requirements ---

  @ApiProperty({
    description: '필수 인프라 목록',
    type: [String],
    required: false,
    example: ['EC2', 'RDS'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredInfra?: string[];

  @ApiProperty({
    description: '제외할 인프라 목록',
    type: [String],
    required: false,
    example: ['Aurora Global DB'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedInfra?: string[];

  @ApiProperty({
    description: '최소 인프라 개수',
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minInfraCount?: number;

  @ApiProperty({
    description: '최대 인프라 개수',
    required: false,
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxInfraCount?: number;

  // --- Staff Requirements ---

  @ApiProperty({
    description: '필수 직원 목록',
    type: [String],
    required: false,
    example: ['DEVELOPER', 'DESIGNER'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredStaff?: string[];

  @ApiProperty({
    description: '최소 직원 수',
    required: false,
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStaffCount?: number;

  // --- Game State Flags ---

  @ApiProperty({
    description: '용량 초과 상태 필요 여부',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  capacityExceeded?: boolean;

  @ApiProperty({
    description: '투자 실패 상태 필요 여부',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  investmentFailed?: boolean;

  @ApiProperty({
    description: '다중 선택 활성화 필요 여부',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  multiChoiceEnabled?: boolean;

  // --- Difficulty-Specific ---

  @ApiProperty({
    description: '이벤트 발생 가능한 난이도 목록',
    enum: ['EASY', 'NORMAL', 'HARD'],
    isArray: true,
    required: false,
    example: ['NORMAL', 'HARD'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['EASY', 'NORMAL', 'HARD'], { each: true })
  difficulties?: DifficultyMode[];

  // --- Probability & Cooldown ---

  @ApiProperty({
    description: '이벤트 발생 확률 (0-100)',
    required: false,
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiProperty({
    description: '재발생 쿨다운 (턴)',
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownTurns?: number;
}

/**
 * Difficulty-specific event configuration DTO
 */
export class DifficultyEventConfigDto {
  @ApiProperty({
    description: '난이도',
    enum: ['EASY', 'NORMAL', 'HARD'],
  })
  @IsEnum(['EASY', 'NORMAL', 'HARD'])
  difficulty: DifficultyMode;

  @ApiProperty({
    description: '이벤트 ID',
  })
  @IsString()
  eventId: string;

  @ApiProperty({
    description: '트리거 조건 오버라이드',
    type: EventTriggerConditionDto,
    required: false,
  })
  @IsOptional()
  triggerCondition?: Partial<EventTriggerConditionDto>;

  @ApiProperty({
    description: '효과 배율 (1.0 = 기본)',
    required: false,
    example: 1.5,
  })
  @IsOptional()
  @Min(0)
  effectMultiplier?: number;

  @ApiProperty({
    description: '발생 확률 오버라이드 (0-100)',
    required: false,
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;
}
