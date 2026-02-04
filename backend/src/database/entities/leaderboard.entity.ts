import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('leaderboard')
export class Leaderboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  playerName: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  finalTurn: number;

  @Column({ type: 'int' })
  finalUsers: number;

  @Column({ type: 'bigint' })
  finalCash: number;

  @Column({ type: 'int' })
  finalTrust: number;

  @Column({ type: 'simple-array' })
  finalInfrastructure: string[];

  @Column({ type: 'int' })
  teamSize: number;

  @Column({ type: 'varchar', length: 20 })
  difficulty: string; // 'EASY', 'NORMAL', 'HARD'

  @Column({ type: 'varchar', length: 30, default: 'WON_IPO' })
  victoryPath: string; // 'WON_IPO', 'WON_ACQUISITION', 'WON_PROFITABILITY', 'WON_TECH_LEADER'

  @CreateDateColumn({ type: 'timestamptz' })
  achievedAt: Date;
}