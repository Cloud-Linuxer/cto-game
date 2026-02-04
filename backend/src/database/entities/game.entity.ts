import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GameStatus {
  PLAYING = 'PLAYING',
  WON_IPO = 'WON_IPO',
  WON_ACQUISITION = 'WON_ACQUISITION',
  WON_PROFITABILITY = 'WON_PROFITABILITY',
  WON_TECH_LEADER = 'WON_TECH_LEADER',
  LOST_BANKRUPT = 'LOST_BANKRUPT',
  LOST_OUTAGE = 'LOST_OUTAGE',
  LOST_FAILED_IPO = 'LOST_FAILED_IPO',
  LOST_EQUITY = 'LOST_EQUITY',
  LOST_FIRED_CTO = 'LOST_FIRED_CTO',
}

export type GameGrade = 'S' | 'A' | 'B' | 'C' | 'F';
export type CapacityWarningLevel = 'GREEN' | 'YELLOW' | 'RED';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  gameId: string;

  @Column({ type: 'int', default: 1 })
  currentTurn: number;

  @Column({ type: 'int', default: 0 })
  users: number;

  @Column({
    type: 'bigint',
    default: 10000000,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  cash: number;

  @Column({ type: 'int', default: 0 })
  trust: number;

  @Column({ type: 'simple-json', default: '["EC2"]' })
  infrastructure: string[];

  @Column({
    type: 'text',
    default: GameStatus.PLAYING,
  })
  status: GameStatus;

  @Column({ type: 'boolean', default: false })
  hasDR: boolean;

  @Column({ type: 'int', default: 0 })
  investmentRounds: number;

  @Column({ type: 'int', default: 100 })
  equityPercentage: number;

  @Column({ type: 'boolean', default: false })
  multiChoiceEnabled: boolean;

  @Column({ type: 'float', default: 1.0 })
  userAcquisitionMultiplier: number;

  @Column({ type: 'float', default: 1.0 })
  trustMultiplier: number;

  @Column({ type: 'int', default: 5000 })
  maxUserCapacity: number;

  @Column({ type: 'boolean', default: false })
  hasConsultingEffect: boolean;

  @Column({ type: 'simple-json', default: '[]' })
  hiredStaff: string[];

  @Column({ type: 'boolean', default: false })
  ipoConditionMet: boolean;

  @Column({ type: 'int', nullable: true })
  ipoAchievedTurn: number;

  // --- Phase 1: New fields ---

  @Column({ type: 'varchar', length: 10, default: 'NORMAL' })
  difficultyMode: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  grade: string; // S, A, B, C, F - set on game end

  @Column({ type: 'int', default: 0 })
  capacityExceededCount: number; // track how many times capacity was exceeded

  // --- Phase 3: Recovery & Resilience fields ---

  @Column({ type: 'int', default: 0 })
  resilienceStacks: number; // earned by surviving capacity exceeded events

  @Column({ type: 'int', default: 0 })
  consecutiveNegativeCashTurns: number; // tracks turns with negative cash for grace period

  // --- Event System fields ---

  @Column({ type: 'int', nullable: true })
  eventSeed: number; // Seed for deterministic random event generation

  @Column({ type: 'simple-json', default: '[]' })
  activeEvents: string[]; // Array of active event IDs

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
