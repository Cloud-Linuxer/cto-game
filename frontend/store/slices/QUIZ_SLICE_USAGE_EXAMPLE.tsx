/**
 * Quiz Slice Usage Examples
 *
 * 실제 컴포넌트에서 quizSlice를 사용하는 예제 코드
 * EPIC-07: LLM 기반 AWS 퀴즈 시스템
 */

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
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
  selectAccuracyRate,
  selectQuizBonus,
} from './quizSlice';
import type { Quiz, QuizHistoryItem } from '@/types/quiz.types';

/**
 * Example 1: 퀴즈 시작 버튼
 */
export function QuizStartButton({ gameId }: { gameId: string }) {
  const dispatch = useAppDispatch();
  const isQuizActive = useAppSelector(selectIsQuizActive);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartQuiz = async () => {
    setIsLoading(true);
    try {
      // API에서 퀴즈 가져오기
      const response = await fetch(`/api/game/${gameId}/quiz`);
      const quiz: Quiz = await response.json();

      // Redux에 퀴즈 설정
      dispatch(setCurrentQuiz(quiz));
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isQuizActive) {
    return null; // 퀴즈 활성화 중에는 버튼 숨김
  }

  return (
    <button
      onClick={handleStartQuiz}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      {isLoading ? '퀴즈 불러오는 중...' : '🧠 퀴즈 도전'}
    </button>
  );
}

/**
 * Example 2: 4지선다 퀴즈 컴포넌트
 */
export function MultipleChoiceQuizComponent({ gameId, currentTurn }: { gameId: string; currentTurn: number }) {
  const dispatch = useAppDispatch();
  const currentQuiz = useAppSelector(selectCurrentQuiz);
  const selectedAnswer = useAppSelector(selectSelectedAnswer);
  const hasSubmitted = useAppSelector(selectHasSubmitted);
  const isCorrect = useAppSelector(selectIsCorrect);
  const correctAnswer = useAppSelector((state) => state.quiz.correctAnswer);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentQuiz || currentQuiz.type !== 'MULTIPLE_CHOICE') {
    return null;
  }

  const handleSelectAnswer = (answer: string) => {
    if (hasSubmitted) return; // 제출 후에는 변경 불가
    dispatch(selectAnswer(answer));
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    setIsSubmitting(true);
    try {
      // API로 답변 제출
      const response = await fetch(`/api/game/${gameId}/quiz/${currentQuiz.quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: selectedAnswer }),
      });

      const result = await response.json();

      // Redux에 결과 반영
      dispatch(submitAnswer({
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation || '해설 정보가 없습니다.',
      }));

      // 히스토리 추가
      const historyItem: QuizHistoryItem = {
        quizId: currentQuiz.quizId,
        question: currentQuiz.question,
        difficulty: currentQuiz.difficulty,
        playerAnswer: selectedAnswer,
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
        turnNumber: currentTurn,
      };
      dispatch(addToHistory(historyItem));

      // 보너스 업데이트
      if (result.bonus) {
        dispatch(updateQuizBonus(result.bonus));
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      {/* 난이도 배지 */}
      <div className="mb-4">
        <span className={`px-2 py-1 rounded text-sm font-semibold ${
          currentQuiz.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
          currentQuiz.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {currentQuiz.difficulty}
        </span>
      </div>

      {/* 문제 */}
      <h3 className="text-xl font-bold mb-4">{currentQuiz.question}</h3>

      {/* 선택지 */}
      <div className="space-y-3 mb-6">
        {currentQuiz.options?.map((option) => {
          const optionLetter = option.split('.')[0]; // 'A', 'B', 'C', 'D'
          const isSelected = selectedAnswer === optionLetter;
          const isCorrectOption = hasSubmitted && correctAnswer && option.startsWith(correctAnswer);
          const isWrongOption = hasSubmitted && isSelected && !isCorrect;

          return (
            <button
              key={option}
              onClick={() => handleSelectAnswer(optionLetter)}
              disabled={hasSubmitted}
              className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                isCorrectOption ? 'border-green-500 bg-green-50' :
                isWrongOption ? 'border-red-500 bg-red-50' :
                isSelected ? 'border-blue-500 bg-blue-50' :
                'border-gray-200 hover:border-gray-300'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* 결과 메시지 */}
      {hasSubmitted && (
        <div className={`p-4 rounded-lg mb-4 ${
          isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isCorrect ? '✅ 정답입니다!' : '❌ 틀렸습니다.'}
        </div>
      )}

      {/* 제출/닫기 버튼 */}
      <div className="flex gap-3">
        {!hasSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isSubmitting ? '제출 중...' : '답변 제출'}
          </button>
        ) : (
          <button
            onClick={() => dispatch(closeQuiz())}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            닫기
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Example 3: OX 퀴즈 컴포넌트
 */
export function OXQuizComponent({ gameId, currentTurn }: { gameId: string; currentTurn: number }) {
  const dispatch = useAppDispatch();
  const currentQuiz = useAppSelector(selectCurrentQuiz);
  const selectedAnswer = useAppSelector(selectSelectedAnswer);
  const hasSubmitted = useAppSelector(selectHasSubmitted);
  const isCorrect = useAppSelector(selectIsCorrect);

  if (!currentQuiz || currentQuiz.type !== 'OX') {
    return null;
  }

  const handleSelectAnswer = async (answer: 'true' | 'false') => {
    if (hasSubmitted) return;

    dispatch(selectAnswer(answer));

    // OX 퀴즈는 선택과 동시에 제출
    try {
      const response = await fetch(`/api/game/${gameId}/quiz/${currentQuiz.quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });

      const result = await response.json();

      dispatch(submitAnswer({
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation || '해설 정보가 없습니다.',
      }));

      const historyItem: QuizHistoryItem = {
        quizId: currentQuiz.quizId,
        question: currentQuiz.question,
        difficulty: currentQuiz.difficulty,
        playerAnswer: answer,
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
        turnNumber: currentTurn,
      };
      dispatch(addToHistory(historyItem));

      if (result.bonus) {
        dispatch(updateQuizBonus(result.bonus));
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-6">{currentQuiz.question}</h3>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => handleSelectAnswer('true')}
          disabled={hasSubmitted}
          className={`flex-1 p-6 rounded-lg border-2 text-2xl font-bold transition-colors ${
            selectedAnswer === 'true' && isCorrect ? 'border-green-500 bg-green-50' :
            selectedAnswer === 'true' && !isCorrect ? 'border-red-500 bg-red-50' :
            'border-gray-200 hover:border-green-300'
          }`}
        >
          O (맞음)
        </button>
        <button
          onClick={() => handleSelectAnswer('false')}
          disabled={hasSubmitted}
          className={`flex-1 p-6 rounded-lg border-2 text-2xl font-bold transition-colors ${
            selectedAnswer === 'false' && isCorrect ? 'border-green-500 bg-green-50' :
            selectedAnswer === 'false' && !isCorrect ? 'border-red-500 bg-red-50' :
            'border-gray-200 hover:border-red-300'
          }`}
        >
          X (틀림)
        </button>
      </div>

      {hasSubmitted && (
        <>
          <div className={`p-4 rounded-lg mb-4 ${
            isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isCorrect ? '✅ 정답입니다!' : '❌ 틀렸습니다.'}
          </div>
          <button
            onClick={() => dispatch(closeQuiz())}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            닫기
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Example 4: 퀴즈 통계 패널
 */
export function QuizStatsPanel() {
  const history = useAppSelector(selectQuizHistory);
  const correctCount = useAppSelector(selectCorrectCount);
  const totalCount = useAppSelector(selectTotalCount);
  const accuracyRate = useAppSelector(selectAccuracyRate);
  const quizBonus = useAppSelector(selectQuizBonus);

  if (totalCount === 0) {
    return null; // 퀴즈를 풀지 않았으면 패널 숨김
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="text-lg font-bold mb-3">📊 퀴즈 통계</h4>

      {/* 전체 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-white rounded">
          <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
          <div className="text-sm text-gray-600">총 퀴즈</div>
        </div>
        <div className="text-center p-3 bg-white rounded">
          <div className="text-2xl font-bold text-green-600">{correctCount}</div>
          <div className="text-sm text-gray-600">정답</div>
        </div>
        <div className="text-center p-3 bg-white rounded">
          <div className="text-2xl font-bold text-purple-600">{accuracyRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">정답률</div>
        </div>
      </div>

      {/* 보너스 */}
      {quizBonus > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
          <span className="text-yellow-800 font-semibold">
            💰 퀴즈 보너스: +{quizBonus.toLocaleString()} 원
          </span>
        </div>
      )}

      {/* 최근 히스토리 */}
      <div>
        <h5 className="text-sm font-semibold mb-2 text-gray-700">최근 퀴즈</h5>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {history.slice(-5).reverse().map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 bg-white rounded text-sm"
            >
              <span className="text-lg">{item.isCorrect ? '✅' : '❌'}</span>
              <span className="text-gray-500">Turn {item.turnNumber}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                item.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                item.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {item.difficulty}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: 새 게임 시작 시 퀴즈 초기화
 */
export function NewGameButton() {
  const dispatch = useAppDispatch();

  const handleNewGame = () => {
    // 퀴즈 상태 완전 초기화
    dispatch(resetQuiz());

    // 게임 로직 초기화 (예시)
    // dispatch(resetGame());

    console.log('새 게임이 시작되었습니다. 퀴즈 상태가 초기화되었습니다.');
  };

  return (
    <button
      onClick={handleNewGame}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      🔄 새 게임 시작
    </button>
  );
}

/**
 * Example 6: 퀴즈 모달 래퍼
 */
export function QuizModalWrapper({ gameId, currentTurn }: { gameId: string; currentTurn: number }) {
  const dispatch = useAppDispatch();
  const isQuizActive = useAppSelector(selectIsQuizActive);
  const currentQuiz = useAppSelector(selectCurrentQuiz);

  if (!isQuizActive || !currentQuiz) {
    return null;
  }

  const handleClose = () => {
    dispatch(closeQuiz());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative max-w-2xl w-full mx-4">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        {/* 퀴즈 타입에 따라 다른 컴포넌트 렌더링 */}
        {currentQuiz.type === 'MULTIPLE_CHOICE' ? (
          <MultipleChoiceQuizComponent gameId={gameId} currentTurn={currentTurn} />
        ) : (
          <OXQuizComponent gameId={gameId} currentTurn={currentTurn} />
        )}
      </div>
    </div>
  );
}
