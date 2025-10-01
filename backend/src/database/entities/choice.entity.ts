import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

export interface ChoiceEffects {
  users: number;
  cash: number;
  trust: number;
  infra: string[];
}

@Entity('choices')
@Index(['turnNumber'])
export class Choice {
  @PrimaryColumn({ type: 'int' })
  choiceId: number;

  @Column({ type: 'int' })
  turnNumber: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'simple-json' })
  effects: ChoiceEffects;

  @Column({ type: 'int' })
  nextTurn: number;

  @Column({ type: 'text', nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
