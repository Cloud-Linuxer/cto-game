import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EventType, EventSeverity } from '../../common/interfaces/random-event.interface';

/**
 * Event State Entity
 *
 * Tracks the state of random events per game instance.
 * Used to manage event cooldowns, one-time events, and event history.
 */
@Entity('event_states')
@Index(['gameId', 'eventId'])
export class EventState {
  @PrimaryGeneratedColumn('uuid')
  stateId: string;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  gameId: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  eventId: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: EventType;

  @Column({ type: 'varchar', length: 20 })
  severity: EventSeverity;

  // --- Trigger State ---

  @Column({ type: 'int', default: 0 })
  triggerCount: number;

  @Column({ type: 'int', nullable: true })
  lastTriggeredTurn: number;

  @Column({ type: 'int', default: 0 })
  cooldownRemaining: number;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  // --- Choice State ---

  @Column({ type: 'varchar', length: 100, nullable: true })
  selectedChoiceId: string;

  @Column({ type: 'int', nullable: true })
  choiceSelectedTurn: number;

  // --- Effect Tracking ---

  @Column({ type: 'simple-json', nullable: true })
  appliedEffects: {
    usersDelta?: number;
    cashDelta?: number;
    trustDelta?: number;
    infrastructureAdded?: string[];
    infrastructureRemoved?: string[];
  };

  // --- Metadata ---

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
