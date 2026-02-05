/**
 * Quiz Slice Tests
 *
 * quizSlice의 모든 리듀서 및 셀렉터 테스트
 */

import quizReducer, {
  QuizState,
  QuizHistory,
  setCurrentQuiz,
  selectAnswer,
  submitAnswer,
  closeQuiz,
  addToHistory,
  updateQuizBonus,
  resetQuiz,
  selectCurrentQuiz,
  selectIsQuizActive,
  selectSelectedAnswer,
  selectHasSubmitted,
  selectIsCorrect,
  selectQuizHistory,
  selectCorrectCount,
  selectTotalCount,
  selectQuizBonus,
  selectAccuracyRate,
} from '../quizSlice';
import type { Quiz } from '@/types/quiz.types';

/**
 * 테스트용 퀴즈 데이터
 */
const mockMultipleChoiceQuiz: Quiz = {
  quizId: 'quiz-001',
  type: 'MULTIPLE_CHOICE',
  difficulty: 'MEDIUM',
  question: 'AWS에서 제공하는 관리형 NoSQL 데이터베이스는?',
  options: ['A. RDS', 'B. DynamoDB', 'C. Aurora', 'D. Redshift'],
};

const mockOXQuiz: Quiz = {
  quizId: 'quiz-002',
  type: 'OX',
  difficulty: 'EASY',
  question: 'AWS Lambda는 서버리스 컴퓨팅 서비스이다.',
};

const mockQuizHistory: QuizHistory = {
  quizId: 'quiz-001',
  question: 'AWS에서 제공하는 관리형 NoSQL 데이터베이스는?',
  difficulty: 'MEDIUM',
  playerAnswer: 'B',
  correctAnswer: 'B',
  isCorrect: true,
  turnNumber: 5,
};

describe('quizSlice', () => {
  let initialState: QuizState;

  beforeEach(() => {
    initialState = {
      currentQuiz: null,
      isQuizActive: false,
      selectedAnswer: null,
      hasSubmitted: false,
      isCorrect: null,
      quizHistory: [],
      correctCount: 0,
      totalCount: 0,
      quizBonus: 0,
    };
  });

  describe('reducers', () => {
    describe('setCurrentQuiz', () => {
      it('should set current quiz and activate quiz mode', () => {
        const nextState = quizReducer(
          initialState,
          setCurrentQuiz(mockMultipleChoiceQuiz)
        );

        expect(nextState.currentQuiz).toEqual(mockMultipleChoiceQuiz);
        expect(nextState.isQuizActive).toBe(true);
        expect(nextState.selectedAnswer).toBeNull();
        expect(nextState.hasSubmitted).toBe(false);
        expect(nextState.isCorrect).toBeNull();
      });

      it('should reset quiz state when setting new quiz', () => {
        const stateWithData: QuizState = {
          ...initialState,
          currentQuiz: mockOXQuiz,
          isQuizActive: true,
          selectedAnswer: 'true',
          hasSubmitted: true,
          isCorrect: true,
        };

        const nextState = quizReducer(
          stateWithData,
          setCurrentQuiz(mockMultipleChoiceQuiz)
        );

        expect(nextState.currentQuiz).toEqual(mockMultipleChoiceQuiz);
        expect(nextState.selectedAnswer).toBeNull();
        expect(nextState.hasSubmitted).toBe(false);
        expect(nextState.isCorrect).toBeNull();
      });
    });

    describe('selectAnswer', () => {
      it('should set selected answer for multiple choice', () => {
        const nextState = quizReducer(initialState, selectAnswer('B'));

        expect(nextState.selectedAnswer).toBe('B');
      });

      it('should set selected answer for OX quiz', () => {
        const nextState = quizReducer(initialState, selectAnswer('true'));

        expect(nextState.selectedAnswer).toBe('true');
      });

      it('should update selected answer', () => {
        let state = quizReducer(initialState, selectAnswer('A'));
        expect(state.selectedAnswer).toBe('A');

        state = quizReducer(state, selectAnswer('C'));
        expect(state.selectedAnswer).toBe('C');
      });
    });

    describe('submitAnswer', () => {
      it('should mark as submitted and set correct result', () => {
        const nextState = quizReducer(
          initialState,
          submitAnswer({ isCorrect: true, correctAnswer: 'B' })
        );

        expect(nextState.hasSubmitted).toBe(true);
        expect(nextState.isCorrect).toBe(true);
      });

      it('should mark as submitted and set incorrect result', () => {
        const nextState = quizReducer(
          initialState,
          submitAnswer({ isCorrect: false, correctAnswer: 'B' })
        );

        expect(nextState.hasSubmitted).toBe(true);
        expect(nextState.isCorrect).toBe(false);
      });
    });

    describe('closeQuiz', () => {
      it('should reset quiz state but keep history', () => {
        const stateWithData: QuizState = {
          currentQuiz: mockMultipleChoiceQuiz,
          isQuizActive: true,
          selectedAnswer: 'B',
          hasSubmitted: true,
          isCorrect: true,
          quizHistory: [mockQuizHistory],
          correctCount: 1,
          totalCount: 1,
          quizBonus: 100,
        };

        const nextState = quizReducer(stateWithData, closeQuiz());

        expect(nextState.currentQuiz).toBeNull();
        expect(nextState.isQuizActive).toBe(false);
        expect(nextState.selectedAnswer).toBeNull();
        expect(nextState.hasSubmitted).toBe(false);
        expect(nextState.isCorrect).toBeNull();

        // Keep history and stats
        expect(nextState.quizHistory).toEqual([mockQuizHistory]);
        expect(nextState.correctCount).toBe(1);
        expect(nextState.totalCount).toBe(1);
        expect(nextState.quizBonus).toBe(100);
      });
    });

    describe('addToHistory', () => {
      it('should add correct answer to history and increment counts', () => {
        const nextState = quizReducer(initialState, addToHistory(mockQuizHistory));

        expect(nextState.quizHistory).toHaveLength(1);
        expect(nextState.quizHistory[0]).toEqual(mockQuizHistory);
        expect(nextState.totalCount).toBe(1);
        expect(nextState.correctCount).toBe(1);
      });

      it('should add incorrect answer to history and increment only total count', () => {
        const incorrectHistory: QuizHistory = {
          ...mockQuizHistory,
          playerAnswer: 'A',
          isCorrect: false,
        };

        const nextState = quizReducer(initialState, addToHistory(incorrectHistory));

        expect(nextState.quizHistory).toHaveLength(1);
        expect(nextState.totalCount).toBe(1);
        expect(nextState.correctCount).toBe(0);
      });

      it('should handle multiple history entries', () => {
        let state = quizReducer(initialState, addToHistory(mockQuizHistory));

        const secondHistory: QuizHistory = {
          quizId: 'quiz-002',
          question: 'AWS Lambda는 서버리스 컴퓨팅 서비스이다.',
          difficulty: 'EASY',
          playerAnswer: 'false',
          correctAnswer: 'true',
          isCorrect: false,
          turnNumber: 6,
        };

        state = quizReducer(state, addToHistory(secondHistory));

        expect(state.quizHistory).toHaveLength(2);
        expect(state.totalCount).toBe(2);
        expect(state.correctCount).toBe(1);
      });
    });

    describe('updateQuizBonus', () => {
      it('should update quiz bonus', () => {
        const nextState = quizReducer(initialState, updateQuizBonus(150));

        expect(nextState.quizBonus).toBe(150);
      });

      it('should overwrite previous bonus', () => {
        let state = quizReducer(initialState, updateQuizBonus(100));
        expect(state.quizBonus).toBe(100);

        state = quizReducer(state, updateQuizBonus(200));
        expect(state.quizBonus).toBe(200);
      });

      it('should handle zero bonus', () => {
        const nextState = quizReducer(initialState, updateQuizBonus(0));

        expect(nextState.quizBonus).toBe(0);
      });
    });

    describe('resetQuiz', () => {
      it('should reset entire state to initial state', () => {
        const stateWithData: QuizState = {
          currentQuiz: mockMultipleChoiceQuiz,
          isQuizActive: true,
          selectedAnswer: 'B',
          hasSubmitted: true,
          isCorrect: true,
          quizHistory: [mockQuizHistory],
          correctCount: 1,
          totalCount: 1,
          quizBonus: 100,
        };

        const nextState = quizReducer(stateWithData, resetQuiz());

        expect(nextState).toEqual(initialState);
      });
    });
  });

  describe('selectors', () => {
    const mockRootState = {
      quiz: {
        currentQuiz: mockMultipleChoiceQuiz,
        isQuizActive: true,
        selectedAnswer: 'B',
        hasSubmitted: true,
        isCorrect: true,
        quizHistory: [mockQuizHistory],
        correctCount: 3,
        totalCount: 5,
        quizBonus: 150,
      },
    };

    it('selectCurrentQuiz should return current quiz', () => {
      expect(selectCurrentQuiz(mockRootState)).toEqual(mockMultipleChoiceQuiz);
    });

    it('selectIsQuizActive should return quiz active state', () => {
      expect(selectIsQuizActive(mockRootState)).toBe(true);
    });

    it('selectSelectedAnswer should return selected answer', () => {
      expect(selectSelectedAnswer(mockRootState)).toBe('B');
    });

    it('selectHasSubmitted should return submitted state', () => {
      expect(selectHasSubmitted(mockRootState)).toBe(true);
    });

    it('selectIsCorrect should return correctness state', () => {
      expect(selectIsCorrect(mockRootState)).toBe(true);
    });

    it('selectQuizHistory should return quiz history', () => {
      expect(selectQuizHistory(mockRootState)).toEqual([mockQuizHistory]);
    });

    it('selectCorrectCount should return correct count', () => {
      expect(selectCorrectCount(mockRootState)).toBe(3);
    });

    it('selectTotalCount should return total count', () => {
      expect(selectTotalCount(mockRootState)).toBe(5);
    });

    it('selectQuizBonus should return quiz bonus', () => {
      expect(selectQuizBonus(mockRootState)).toBe(150);
    });

    it('selectAccuracyRate should calculate accuracy rate', () => {
      expect(selectAccuracyRate(mockRootState)).toBe(60); // 3/5 * 100
    });

    it('selectAccuracyRate should return 0 when totalCount is 0', () => {
      const emptyState = {
        quiz: {
          ...mockRootState.quiz,
          correctCount: 0,
          totalCount: 0,
        },
      };

      expect(selectAccuracyRate(emptyState)).toBe(0);
    });

    it('selectAccuracyRate should handle 100% accuracy', () => {
      const perfectState = {
        quiz: {
          ...mockRootState.quiz,
          correctCount: 5,
          totalCount: 5,
        },
      };

      expect(selectAccuracyRate(perfectState)).toBe(100);
    });

    it('selectAccuracyRate should handle 0% accuracy', () => {
      const zeroState = {
        quiz: {
          ...mockRootState.quiz,
          correctCount: 0,
          totalCount: 5,
        },
      };

      expect(selectAccuracyRate(zeroState)).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete quiz flow', () => {
      // 1. Set quiz
      let state = quizReducer(initialState, setCurrentQuiz(mockMultipleChoiceQuiz));
      expect(state.isQuizActive).toBe(true);
      expect(state.currentQuiz).toEqual(mockMultipleChoiceQuiz);

      // 2. Select answer
      state = quizReducer(state, selectAnswer('B'));
      expect(state.selectedAnswer).toBe('B');

      // 3. Submit answer
      state = quizReducer(state, submitAnswer({ isCorrect: true, correctAnswer: 'B' }));
      expect(state.hasSubmitted).toBe(true);
      expect(state.isCorrect).toBe(true);

      // 4. Add to history
      state = quizReducer(state, addToHistory(mockQuizHistory));
      expect(state.quizHistory).toHaveLength(1);
      expect(state.correctCount).toBe(1);
      expect(state.totalCount).toBe(1);

      // 5. Update bonus
      state = quizReducer(state, updateQuizBonus(100));
      expect(state.quizBonus).toBe(100);

      // 6. Close quiz
      state = quizReducer(state, closeQuiz());
      expect(state.isQuizActive).toBe(false);
      expect(state.currentQuiz).toBeNull();
      expect(state.selectedAnswer).toBeNull();

      // History and stats should persist
      expect(state.quizHistory).toHaveLength(1);
      expect(state.correctCount).toBe(1);
      expect(state.totalCount).toBe(1);
      expect(state.quizBonus).toBe(100);
    });

    it('should handle multiple quiz rounds', () => {
      let state = initialState;

      // First quiz
      state = quizReducer(state, setCurrentQuiz(mockMultipleChoiceQuiz));
      state = quizReducer(state, selectAnswer('B'));
      state = quizReducer(state, submitAnswer({ isCorrect: true, correctAnswer: 'B' }));
      state = quizReducer(state, addToHistory(mockQuizHistory));
      state = quizReducer(state, closeQuiz());

      // Second quiz
      const secondQuizHistory: QuizHistory = {
        quizId: 'quiz-002',
        question: 'Second question',
        difficulty: 'EASY',
        playerAnswer: 'false',
        correctAnswer: 'true',
        isCorrect: false,
        turnNumber: 6,
      };

      state = quizReducer(state, setCurrentQuiz(mockOXQuiz));
      state = quizReducer(state, selectAnswer('false'));
      state = quizReducer(state, submitAnswer({ isCorrect: false, correctAnswer: 'true' }));
      state = quizReducer(state, addToHistory(secondQuizHistory));
      state = quizReducer(state, updateQuizBonus(150));
      state = quizReducer(state, closeQuiz());

      // Verify accumulated stats
      expect(state.quizHistory).toHaveLength(2);
      expect(state.totalCount).toBe(2);
      expect(state.correctCount).toBe(1);
      expect(state.quizBonus).toBe(150);
    });

    it('should handle changing answer before submission', () => {
      let state = quizReducer(initialState, setCurrentQuiz(mockMultipleChoiceQuiz));

      // Change answer multiple times
      state = quizReducer(state, selectAnswer('A'));
      expect(state.selectedAnswer).toBe('A');

      state = quizReducer(state, selectAnswer('C'));
      expect(state.selectedAnswer).toBe('C');

      state = quizReducer(state, selectAnswer('B'));
      expect(state.selectedAnswer).toBe('B');

      // Submit final answer
      state = quizReducer(state, submitAnswer({ isCorrect: true, correctAnswer: 'B' }));
      expect(state.hasSubmitted).toBe(true);
      expect(state.isCorrect).toBe(true);
    });
  });
});
