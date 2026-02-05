import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * QuizHistory Entity
 *
 * 게임별 퀴즈 이력을 추적합니다.
 * 플레이어가 어떤 퀴즈를 풀었는지, 정답/오답 여부를 기록합니다.
 */
@Entity('quiz_history')
@Index(['gameId', 'turnNumber'])
@Index(['gameId', 'quizId'])
@Index(['quizId'])
export class QuizHistory {
  @PrimaryGeneratedColumn()
  historyId: number;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  gameId: string;

  @Column({ type: 'varchar', length: 36 })
  quizId: string;

  @Column({ type: 'int' })
  turnNumber: number;

  @Column({ type: 'varchar', length: 10 })
  playerAnswer: string; // 'A', 'B', 'C', 'D' for MULTIPLE_CHOICE / 'true', 'false' for OX

  @Column({ type: 'boolean' })
  isCorrect: boolean;

  @Column({ type: 'int', nullable: true })
  timeTaken: number; // 답변까지 소요 시간 (초) - Phase 2 타이머 기능 추가 시 사용

  @Column({ type: 'varchar', length: 20 })
  quizType: string; // 'MULTIPLE_CHOICE' or 'OX'

  @Column({ type: 'varchar', length: 10 })
  difficulty: string; // 'EASY', 'MEDIUM', 'HARD'

  @Column({ type: 'simple-json', nullable: true })
  infraContext: string[]; // 퀴즈 당시의 인프라 컨텍스트 (통계용)

  @CreateDateColumn()
  createdAt: Date;
}
