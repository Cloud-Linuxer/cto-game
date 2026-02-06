/**
 * Quiz Redux Slice
 *
 * 퀴즈 시스템 상태 관리
 * EPIC-07: LLM 기반 AWS 퀴즈 시스템
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  Quiz,
  QuizHistoryItem,
  QuizState,
  SubmitAnswerPayload,
} from '@/types/quiz.types';

/**
 * 초기 상태
 */
const initialState: QuizState = {
  currentQuiz: null,
  isQuizActive: false,
  selectedAnswer: null,
  hasSubmitted: false,
  isCorrect: null,
  correctAnswer: null,
  explanation: null,
  quizHistory: [],
  correctCount: 0,
  totalCount: 0,
  quizBonus: 0,
};

/**
 * 퀴즈 슬라이스
 */
export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    /**
     * 현재 퀴즈 설정 및 퀴즈 모드 활성화
     */
    setCurrentQuiz(state, action: PayloadAction<Quiz>) {
      state.currentQuiz = action.payload;
      state.isQuizActive = true;
      state.selectedAnswer = null;
      state.hasSubmitted = false;
      state.isCorrect = null;
    },

    /**
     * 선택한 답변 설정
     */
    selectAnswer(state, action: PayloadAction<string>) {
      state.selectedAnswer = action.payload;
    },

    /**
     * 답변 제출 및 결과 설정
     */
    submitAnswer(state, action: PayloadAction<SubmitAnswerPayload>) {
      state.hasSubmitted = true;
      state.isCorrect = action.payload.isCorrect;
      state.correctAnswer = action.payload.correctAnswer;
      state.explanation = action.payload.explanation;
    },

    /**
     * 퀴즈 닫기 (히스토리는 유지)
     */
    closeQuiz(state) {
      state.currentQuiz = null;
      state.isQuizActive = false;
      state.selectedAnswer = null;
      state.hasSubmitted = false;
      state.isCorrect = null;
      state.correctAnswer = null;
      state.explanation = null;
    },

    /**
     * 히스토리에 퀴즈 결과 추가
     */
    addToHistory(state, action: PayloadAction<QuizHistoryItem>) {
      state.quizHistory.push(action.payload);
      state.totalCount += 1;
      if (action.payload.isCorrect) {
        state.correctCount += 1;
      }
    },

    /**
     * 퀴즈 보너스 업데이트
     */
    updateQuizBonus(state, action: PayloadAction<number>) {
      state.quizBonus = action.payload;
    },

    /**
     * 전체 퀴즈 상태 초기화 (새 게임 시작 시)
     */
    resetQuiz(state) {
      return initialState;
    },
  },
});

/**
 * Actions
 */
export const {
  setCurrentQuiz,
  selectAnswer,
  submitAnswer,
  closeQuiz,
  addToHistory,
  updateQuizBonus,
  resetQuiz,
} = quizSlice.actions;

/**
 * Selectors
 */
export const selectCurrentQuiz = (state: { quiz: QuizState }) => state.quiz.currentQuiz;
export const selectIsQuizActive = (state: { quiz: QuizState }) => state.quiz.isQuizActive;
export const selectSelectedAnswer = (state: { quiz: QuizState }) => state.quiz.selectedAnswer;
export const selectHasSubmitted = (state: { quiz: QuizState }) => state.quiz.hasSubmitted;
export const selectIsCorrect = (state: { quiz: QuizState }) => state.quiz.isCorrect;
export const selectCorrectAnswer = (state: { quiz: QuizState }) => state.quiz.correctAnswer;
export const selectExplanation = (state: { quiz: QuizState }) => state.quiz.explanation;
export const selectQuizHistory = (state: { quiz: QuizState }) => state.quiz.quizHistory;
export const selectCorrectCount = (state: { quiz: QuizState }) => state.quiz.correctCount;
export const selectTotalCount = (state: { quiz: QuizState }) => state.quiz.totalCount;
export const selectQuizBonus = (state: { quiz: QuizState }) => state.quiz.quizBonus;

/**
 * Computed selectors
 */
export const selectAccuracyRate = (state: { quiz: QuizState }) => {
  const { correctCount, totalCount } = state.quiz;
  return totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
};

/**
 * Reducer
 */
export default quizSlice.reducer;
