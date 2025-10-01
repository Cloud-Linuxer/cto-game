import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('turns')
export class Turn {
  @PrimaryGeneratedColumn()
  turnId: number;

  @Column({ type: 'int', unique: true })
  turnNumber: number;

  @Column({ type: 'text' })
  eventText: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
