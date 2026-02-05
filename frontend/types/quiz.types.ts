/**
 * Quiz System Type Definitions
 *
 * 퀴즈 시스템의 타입 정의
 * EPIC-07: LLM 기반 AWS 퀴즈 시스템
 */

/**
 * 퀴즈 타입
 */
export type QuizType = 'MULTIPLE_CHOICE' | 'OX';

/**
 * 퀴즈 난이도
 */
export type QuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * 퀴즈 데이터 (백엔드 응답)
 */
export interface Quiz {
  quizId: string;
  type: QuizType;
  difficulty: QuizDifficulty;
  question: string;
  options?: string[]; // 4지선다만 사용
}

/**
 * 퀴즈 제출 결과
 */
export interface QuizResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

/**
 * 퀴즈 히스토리 항목
 */
export interface QuizHistoryItem {
  quizId: string;
  turnNumber: number;
  quizType: QuizType;
  difficulty: QuizDifficulty;
  question: string;
  isCorrect: boolean;
  timestamp: string;
}

/**
 * 퀴즈 통계
 */
export interface QuizStats {
  totalQuizzes: number;
  correctCount: number;
  accuracyRate: number;
  quizBonus: number;
  grade: string;
}
