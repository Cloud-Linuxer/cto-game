import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 퀴즈 난이도
 */
export enum QuizDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/**
 * 퀴즈 유형
 */
export enum QuizType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // 4지선다
  OX = 'OX', // True/False
}

/**
 * 퀴즈 소스
 */
export enum QuizSource {
  LLM = 'LLM', // vLLM 생성
  FALLBACK = 'FALLBACK', // 사전 생성 풀
  MANUAL = 'MANUAL', // 수동 작성
}

/**
 * Quiz Entity
 *
 * AWS 퀴즈 문제 정보를 저장합니다.
 * LLM으로 생성되거나 사전에 작성된 퀴즈 풀을 관리합니다.
 */
@Entity('quizzes')
@Index(['difficulty', 'type'])
@Index(['source'])
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  quizId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: QuizType.MULTIPLE_CHOICE,
  })
  type: QuizType;

  @Column({
    type: 'varchar',
    length: 10,
    default: QuizDifficulty.MEDIUM,
  })
  difficulty: QuizDifficulty;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'simple-json', nullable: true })
  options: string[]; // ['Option A', 'Option B', 'Option C', 'Option D'] - 4지선다만

  @Column({ type: 'varchar', length: 10 })
  correctAnswer: string; // 'A', 'B', 'C', 'D' for MULTIPLE_CHOICE / 'true', 'false' for OX

  @Column({ type: 'text' })
  explanation: string;

  @Column({ type: 'simple-json', default: '[]' })
  infraContext: string[]; // ['EC2', 'Aurora', 'ALB'] - 관련 AWS 서비스

  @Column({ type: 'int', nullable: true })
  turnRangeStart: number; // 이 퀴즈가 적합한 턴 범위 시작 (예: 1)

  @Column({ type: 'int', nullable: true })
  turnRangeEnd: number; // 이 퀴즈가 적합한 턴 범위 끝 (예: 10)

  @Column({ type: 'varchar', length: 20, default: QuizSource.LLM })
  source: QuizSource;

  @Column({ type: 'int', nullable: true })
  qualityScore: number; // 0-100 (LLM 생성 퀴즈의 품질 평가 점수)

  @Column({ type: 'int', default: 0 })
  usageCount: number; // 이 퀴즈가 사용된 횟수 (통계용)

  @Column({ type: 'int', default: 0 })
  correctAnswerCount: number; // 정답 맞춘 플레이어 수 (통계용)

  @Column({ type: 'int', default: 0 })
  totalAnswerCount: number; // 총 답변 수 (정답률 계산용)

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 퀴즈 활성화 여부 (품질 문제 시 비활성화)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 정답률 계산
   */
  get accuracyRate(): number {
    if (this.totalAnswerCount === 0) return 0;
    return (this.correctAnswerCount / this.totalAnswerCount) * 100;
  }
}
