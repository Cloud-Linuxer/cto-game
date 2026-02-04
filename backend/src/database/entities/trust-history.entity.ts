import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 신뢰도 변화 요인 타입
 */
export type TrustChangeFactorType =
  | 'choice' // 선택지 직접 효과
  | 'recovery' // 회복 메커니즘
  | 'penalty' // 페널티
  | 'bonus'; // 보너스

/**
 * 신뢰도 변화 요인 상세 정보
 */
export interface TrustChangeFactor {
  type: TrustChangeFactorType;
  amount: number;
  message: string;
}

/**
 * TrustHistory Entity
 *
 * 게임 진행 중 신뢰도 변화 히스토리를 추적합니다.
 * 각 턴마다 신뢰도 변화 요인을 기록하여 플레이어의 학습 효과를 높입니다.
 */
@Entity('trust_history')
@Index(['gameId', 'turnNumber'])
export class TrustHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  gameId: string;

  @Column({ type: 'int' })
  turnNumber: number;

  @Column({ type: 'int' })
  trustBefore: number;

  @Column({ type: 'int' })
  trustAfter: number;

  @Column({ type: 'int' })
  change: number;

  @Column('simple-json')
  factors: TrustChangeFactor[];

  @CreateDateColumn()
  createdAt: Date;
}
