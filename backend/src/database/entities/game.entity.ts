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
  LOST_BANKRUPT = 'LOST_BANKRUPT',
  LOST_OUTAGE = 'LOST_OUTAGE',
  LOST_FAILED_IPO = 'LOST_FAILED_IPO',
  LOST_EQUITY = 'LOST_EQUITY', // 투자자에게 지분 빼앗김
}

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

  @Column({ type: 'int', default: 50 })
  trust: number;

  @Column({ type: 'simple-json', default: '["EC2"]' })
  infrastructure: string[];

  @Column({
    type: 'text',
    default: GameStatus.PLAYING,
  })
  status: GameStatus;

  @Column({ type: 'boolean', default: false })
  hasDR: boolean; // DR 구성 여부

  @Column({ type: 'int', default: 0 })
  investmentRounds: number; // 투자 라운드 횟수

  @Column({ type: 'int', default: 100 })
  equityPercentage: number; // 남은 지분율 (%)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
