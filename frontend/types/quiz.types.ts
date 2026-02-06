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
  turnNumber?: number;
  quizType?: QuizType;
  difficulty: QuizDifficulty;
  question: string;
  playerAnswer: string;        // 플레이어가 선택한 답변
  correctAnswer: string;       // 정답
  isCorrect: boolean;
  timestamp?: string;
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

/**
 * Redux 상태용 타입
 * (quizSlice.ts에서 사용)
 */
export interface QuizState {
  currentQuiz: Quiz | null;
  isQuizActive: boolean;
  selectedAnswer: string | null; // 'A', 'B', 'C', 'D' or 'true', 'false'
  hasSubmitted: boolean;
  isCorrect: boolean | null;
  correctAnswer: string | null; // 정답
  explanation: string | null; // 퀴즈 해설
  quizHistory: QuizHistoryItem[];
  correctCount: number;
  totalCount: number;
  quizBonus: number;
}

/**
 * 정답 제출 페이로드
 * (Redux action에서 사용)
 */
export interface SubmitAnswerPayload {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}
