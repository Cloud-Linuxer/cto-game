import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('choice_history')
@Index(['gameId'])
export class ChoiceHistory {
  @PrimaryGeneratedColumn()
  historyId: number;

  @Column({ type: 'varchar' })
  gameId: string;

  @Column({ type: 'int' })
  turnNumber: number;

  @Column({ type: 'int' })
  choiceId: number;

  @CreateDateColumn()
  timestamp: Date;
}
