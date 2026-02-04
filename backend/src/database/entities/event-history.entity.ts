import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EventType, EventSeverity } from '../../common/interfaces/random-event.interface';

/**
 * Event History Entity
 *
 * Immutable log of all events that occurred during gameplay.
 * Used for analytics, debugging, and replay functionality.
 */
@Entity('event_history')
@Index(['gameId', 'turnNumber'])
@Index(['eventType', 'createdAt'])
export class EventHistory {
  @PrimaryGeneratedColumn()
  historyId: number;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  gameId: string;

  @Column({ type: 'varchar', length: 100 })
  eventId: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: EventType;

  @Column({ type: 'varchar', length: 20 })
  severity: EventSeverity;

  // --- Turn Context ---

  @Column({ type: 'int' })
  turnNumber: number;

  // --- Event Details ---

  @Column({ type: 'text' })
  eventTitle: string;

  @Column({ type: 'text' })
  eventDescription: string;

  // --- Player Choice ---

  @Column({ type: 'varchar', length: 100, nullable: true })
  selectedChoiceId: string;

  @Column({ type: 'text', nullable: true })
  selectedChoiceText: string;

  // --- Game State Before Event ---

  @Column({ type: 'int' })
  usersBefore: number;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  cashBefore: number;

  @Column({ type: 'int' })
  trustBefore: number;

  @Column({ type: 'simple-json' })
  infrastructureBefore: string[];

  // --- Game State After Event ---

  @Column({ type: 'int' })
  usersAfter: number;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  cashAfter: number;

  @Column({ type: 'int' })
  trustAfter: number;

  @Column({ type: 'simple-json' })
  infrastructureAfter: string[];

  // --- Effect Deltas (for easy analytics) ---

  @Column({ type: 'int' })
  usersDelta: number;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  cashDelta: number;

  @Column({ type: 'int' })
  trustDelta: number;

  // --- Difficulty Context ---

  @Column({ type: 'varchar', length: 10 })
  difficultyMode: string;

  // --- Additional Context ---

  @Column({ type: 'simple-json', nullable: true })
  triggerConditions: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  appliedEffects: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
