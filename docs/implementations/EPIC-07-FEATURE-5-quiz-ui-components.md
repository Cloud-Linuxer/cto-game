# Implementation Plan: Feature 5 - Quiz UI Components

**EPIC**: EPIC-07 - LLM 기반 AWS 퀴즈 시스템
**Feature**: Feature 5 - Quiz UI Components
**담당**: Client AI
**상태**: Completed (Design)
**작성일**: 2026-02-05

---

## 목표

게임 중 퀴즈 팝업 UI 컴포넌트를 구현하여 플레이어가 직관적으로 퀴즈를 풀고 결과를 확인할 수 있도록 한다.

---

## 컴포넌트 구조 (6개)

```
frontend/components/quiz/
├── QuizPopup.tsx                 # 메인 퀴즈 팝업 컨테이너
├── MultipleChoiceQuiz.tsx        # 4지선다 문제 UI
├── OXQuiz.tsx                    # OX 퀴즈 UI
├── QuizResult.tsx                # 정답/오답 피드백 화면
├── QuizSummary.tsx               # 게임 종료 시 퀴즈 결과 요약
├── QuizTimer.tsx                 # 제한 시간 표시 (Phase 2)
├── QuizPopup.module.css          # 스타일
└── __tests__/
    ├── QuizPopup.test.tsx
    ├── MultipleChoiceQuiz.test.tsx
    └── OXQuiz.test.tsx
```

---

## 1. QuizPopup.tsx (메인 컨테이너)

**역할**: 퀴즈 팝업의 최상위 컨테이너, 상태 관리 및 애니메이션

```typescript
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import OXQuiz from './OXQuiz';
import QuizResult from './QuizResult';

export interface QuizData {
  quizId: string;
  type: 'MULTIPLE_CHOICE' | 'OX';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options?: string[];  // 4지선다만
}

export interface QuizPopupProps {
  quizData: QuizData;
  gameId: string;
  onSubmitAnswer: (answer: string) => Promise<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  }>;
  onClose: () => void;
}

type PopupState = 'quiz' | 'result';

const QuizPopup: React.FC<QuizPopupProps> = ({
  quizData,
  gameId,
  onSubmitAnswer,
  onClose,
}) => {
  const [state, setState] = useState<PopupState>('quiz');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    setIsSubmitting(true);
    try {
      const response = await onSubmitAnswer(selectedAnswer);
      setResult(response);
      setState('result');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Popup Container */}
        <motion.div
          className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Quiz Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium opacity-90">
                  {quizData.type === 'MULTIPLE_CHOICE' ? '4지선다' : 'OX 퀴즈'}
                </span>
                <h2 className="text-2xl font-bold mt-1">AWS 퀴즈</h2>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
                <span className="text-sm font-semibold">
                  {quizData.difficulty === 'EASY' && '⭐ 쉬움'}
                  {quizData.difficulty === 'MEDIUM' && '⭐⭐ 보통'}
                  {quizData.difficulty === 'HARD' && '⭐⭐⭐ 어려움'}
                </span>
              </div>
            </div>
          </div>

          {/* Quiz Content */}
          <div className="p-6">
            {state === 'quiz' && (
              <>
                {quizData.type === 'MULTIPLE_CHOICE' ? (
                  <MultipleChoiceQuiz
                    question={quizData.question}
                    options={quizData.options || []}
                    selectedAnswer={selectedAnswer}
                    onSelectAnswer={handleSelectAnswer}
                  />
                ) : (
                  <OXQuiz
                    question={quizData.question}
                    selectedAnswer={selectedAnswer}
                    onSelectAnswer={handleSelectAnswer}
                  />
                )}

                {/* Submit Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer || isSubmitting}
                    className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                      selectedAnswer && !isSubmitting
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? '제출 중...' : '제출하기'}
                  </button>
                </div>
              </>
            )}

            {state === 'result' && result && (
              <QuizResult
                isCorrect={result.isCorrect}
                correctAnswer={result.correctAnswer}
                explanation={result.explanation}
                quizType={quizData.type}
                onConfirm={handleConfirm}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuizPopup;
```

---

## 2. MultipleChoiceQuiz.tsx (4지선다)

**역할**: 4지선다 문제 UI, 선택지 버튼 렌더링

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MultipleChoiceQuizProps {
  question: string;
  options: string[];
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
}

const MultipleChoiceQuiz: React.FC<MultipleChoiceQuizProps> = ({
  question,
  options,
  selectedAnswer,
  onSelectAnswer,
}) => {
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div>
      {/* Question */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 leading-relaxed">
          {question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => {
          const letter = letters[index];
          const isSelected = selectedAnswer === letter;

          return (
            <motion.button
              key={letter}
              onClick={() => onSelectAnswer(letter)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-3">
                {/* Letter Badge */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {letter}
                </div>

                {/* Option Text */}
                <div className="flex-1 pt-0.5">
                  <p className="text-gray-800 font-medium">{option}</p>
                </div>

                {/* Checkmark */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex-shrink-0 text-blue-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MultipleChoiceQuiz;
```

---

## 3. OXQuiz.tsx (OX 퀴즈)

**역할**: OX 퀴즈 UI, O/X 버튼

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface OXQuizProps {
  question: string;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
}

const OXQuiz: React.FC<OXQuizProps> = ({
  question,
  selectedAnswer,
  onSelectAnswer,
}) => {
  return (
    <div>
      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 leading-relaxed">
          {question}
        </h3>
      </div>

      {/* OX Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* O Button */}
        <motion.button
          onClick={() => onSelectAnswer('true')}
          className={`p-8 rounded-2xl border-2 transition-all ${
            selectedAnswer === 'true'
              ? 'border-green-600 bg-green-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-center">
            <div
              className={`text-6xl font-bold mb-2 ${
                selectedAnswer === 'true' ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              O
            </div>
            <p
              className={`text-sm font-semibold ${
                selectedAnswer === 'true' ? 'text-green-700' : 'text-gray-500'
              }`}
            >
              맞습니다
            </p>
          </div>
        </motion.button>

        {/* X Button */}
        <motion.button
          onClick={() => onSelectAnswer('false')}
          className={`p-8 rounded-2xl border-2 transition-all ${
            selectedAnswer === 'false'
              ? 'border-red-600 bg-red-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="text-center">
            <div
              className={`text-6xl font-bold mb-2 ${
                selectedAnswer === 'false' ? 'text-red-600' : 'text-gray-400'
              }`}
            >
              X
            </div>
            <p
              className={`text-sm font-semibold ${
                selectedAnswer === 'false' ? 'text-red-700' : 'text-gray-500'
              }`}
            >
              틀렸습니다
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default OXQuiz;
```

---

## 4. QuizResult.tsx (결과 피드백)

**역할**: 정답/오답 피드백 + 해설

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface QuizResultProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  quizType: 'MULTIPLE_CHOICE' | 'OX';
  onConfirm: () => void;
}

const QuizResult: React.FC<QuizResultProps> = ({
  isCorrect,
  correctAnswer,
  explanation,
  quizType,
  onConfirm,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      {/* Result Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="mb-6"
      >
        {isCorrect ? (
          <div className="inline-block p-6 bg-green-100 rounded-full">
            <svg
              className="w-16 h-16 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ) : (
          <div className="inline-block p-6 bg-red-100 rounded-full">
            <svg
              className="w-16 h-16 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </motion.div>

      {/* Result Message */}
      <h2
        className={`text-3xl font-bold mb-2 ${
          isCorrect ? 'text-green-700' : 'text-red-700'
        }`}
      >
        {isCorrect ? '정답입니다!' : '틀렸습니다'}
      </h2>

      {!isCorrect && (
        <p className="text-gray-600 mb-4">
          정답은{' '}
          <span className="font-bold text-gray-800">
            {quizType === 'MULTIPLE_CHOICE' ? `${correctAnswer}번` : correctAnswer === 'true' ? 'O' : 'X'}
          </span>
          {' '}입니다.
        </p>
      )}

      {/* Explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 bg-gray-50 rounded-xl text-left"
      >
        <h3 className="text-sm font-semibold text-gray-600 mb-2">💡 해설</h3>
        <p className="text-gray-700 leading-relaxed">{explanation}</p>
      </motion.div>

      {/* Confirm Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onConfirm}
        className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
      >
        확인
      </motion.button>
    </motion.div>
  );
};

export default QuizResult;
```

---

## 5. QuizSummary.tsx (게임 종료 시 요약)

**역할**: 게임 종료 화면에서 퀴즈 결과 표시

```typescript
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface QuizHistoryItem {
  turnNumber: number;
  quizType: string;
  difficulty: string;
  question: string;
  isCorrect: boolean;
}

interface QuizSummaryProps {
  totalQuizzes: number;
  correctCount: number;
  accuracyRate: number;
  quizBonus: number;
  grade: string;
  quizHistory: QuizHistoryItem[];
}

const QuizSummary: React.FC<QuizSummaryProps> = ({
  totalQuizzes,
  correctCount,
  accuracyRate,
  quizBonus,
  grade,
  quizHistory,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          📝 AWS 퀴즈 결과
        </h2>
        <p className="text-gray-600">게임 중 풀었던 퀴즈를 확인하세요</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-xl">
          <div className="text-2xl font-bold text-blue-600">
            {correctCount}/{totalQuizzes}
          </div>
          <div className="text-sm text-gray-600 mt-1">정답 개수</div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-xl">
          <div className="text-2xl font-bold text-green-600">
            {accuracyRate.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 mt-1">정답률</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-xl">
          <div className="text-2xl font-bold text-purple-600">+{quizBonus}</div>
          <div className="text-sm text-gray-600 mt-1">보너스 점수</div>
        </div>

        <div className="text-center p-4 bg-yellow-50 rounded-xl">
          <div className="text-xl font-bold text-yellow-600">{grade}</div>
          <div className="text-sm text-gray-600 mt-1">등급</div>
        </div>
      </div>

      {/* Quiz History */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          퀴즈 이력
        </h3>

        {quizHistory.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border-2 ${
              item.isCorrect
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  item.isCorrect
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {item.isCorrect ? '✓' : '✗'}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500">
                    Turn {item.turnNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                    {item.difficulty}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                    {item.quizType === 'MULTIPLE_CHOICE' ? '4지선다' : 'OX'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {item.question}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default QuizSummary;
```

---

## Redux 상태 관리

### quizSlice.ts

```typescript
// frontend/store/slices/quizSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface QuizState {
  currentQuiz: {
    quizId: string;
    type: 'MULTIPLE_CHOICE' | 'OX';
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    question: string;
    options?: string[];
  } | null;
  selectedAnswer: string | null;
  quizHistory: Array<{
    quizId: string;
    turnNumber: number;
    isCorrect: boolean;
  }>;
  correctCount: number;
  isQuizPopupOpen: boolean;
}

const initialState: QuizState = {
  currentQuiz: null,
  selectedAnswer: null,
  quizHistory: [],
  correctCount: 0,
  isQuizPopupOpen: false,
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setCurrentQuiz: (state, action: PayloadAction<QuizState['currentQuiz']>) => {
      state.currentQuiz = action.payload;
      state.selectedAnswer = null;
      state.isQuizPopupOpen = true;
    },
    setSelectedAnswer: (state, action: PayloadAction<string>) => {
      state.selectedAnswer = action.payload;
    },
    submitQuizAnswer: (
      state,
      action: PayloadAction<{ quizId: string; turnNumber: number; isCorrect: boolean }>,
    ) => {
      state.quizHistory.push(action.payload);
      if (action.payload.isCorrect) {
        state.correctCount += 1;
      }
    },
    closeQuizPopup: (state) => {
      state.isQuizPopupOpen = false;
      state.currentQuiz = null;
      state.selectedAnswer = null;
    },
    resetQuiz: (state) => {
      return initialState;
    },
  },
});

export const {
  setCurrentQuiz,
  setSelectedAnswer,
  submitQuizAnswer,
  closeQuizPopup,
  resetQuiz,
} = quizSlice.actions;

export default quizSlice.reducer;
```

---

## 사용 예시

### game/[gameId]/page.tsx 통합

```typescript
'use client';

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import QuizPopup from '@/components/quiz/QuizPopup';
import { setCurrentQuiz, submitQuizAnswer, closeQuizPopup } from '@/store/slices/quizSlice';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const dispatch = useAppDispatch();
  const { currentQuiz, isQuizPopupOpen } = useAppSelector((state) => state.quiz);
  const { currentTurn } = useAppSelector((state) => state.game);

  // 턴 진행 시 퀴즈 확인
  useEffect(() => {
    const checkQuiz = async () => {
      const response = await fetch(
        `/api/game/${params.gameId}/quiz/next?turnNumber=${currentTurn}`,
      );
      const data = await response.json();

      if (data.hasQuiz) {
        dispatch(setCurrentQuiz(data.quiz));
      }
    };

    checkQuiz();
  }, [currentTurn, params.gameId, dispatch]);

  const handleSubmitAnswer = async (answer: string) => {
    if (!currentQuiz) return;

    const response = await fetch(
      `/api/game/${params.gameId}/quiz/${currentQuiz.quizId}/answer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAnswer: answer,
          turnNumber: currentTurn,
        }),
      },
    );

    const result = await response.json();

    dispatch(
      submitQuizAnswer({
        quizId: currentQuiz.quizId,
        turnNumber: currentTurn,
        isCorrect: result.isCorrect,
      }),
    );

    return result;
  };

  const handleCloseQuiz = () => {
    dispatch(closeQuizPopup());
  };

  return (
    <div>
      {/* Game content */}

      {/* Quiz Popup */}
      {isQuizPopupOpen && currentQuiz && (
        <QuizPopup
          quizData={currentQuiz}
          gameId={params.gameId}
          onSubmitAnswer={handleSubmitAnswer}
          onClose={handleCloseQuiz}
        />
      )}
    </div>
  );
}
```

---

## 스타일링 (TailwindCSS)

### 주요 색상 팔레트

```css
/* 정답 */
.correct-bg: bg-green-50
.correct-border: border-green-600
.correct-text: text-green-700

/* 오답 */
.wrong-bg: bg-red-50
.wrong-border: border-red-600
.wrong-text: text-red-700

/* 선택 */
.selected-bg: bg-blue-50
.selected-border: border-blue-600
.selected-text: text-blue-700

/* 난이도 */
.easy-badge: bg-green-100 text-green-700
.medium-badge: bg-yellow-100 text-yellow-700
.hard-badge: bg-red-100 text-red-700
```

---

## 애니메이션 (Framer Motion)

### Variants

```typescript
// utils/quizAnimations.ts
export const popupVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.9, y: 20 },
};

export const resultVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 },
  },
};

export const choiceVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};
```

---

## 테스트

### Unit Tests

```typescript
// __tests__/QuizPopup.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuizPopup from '../QuizPopup';

describe('QuizPopup', () => {
  const mockQuizData = {
    quizId: 'test-quiz-1',
    type: 'MULTIPLE_CHOICE' as const,
    difficulty: 'EASY' as const,
    question: 'EC2란 무엇인가?',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
  };

  it('should render quiz question', () => {
    render(
      <QuizPopup
        quizData={mockQuizData}
        gameId="test-game"
        onSubmitAnswer={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('EC2란 무엇인가?')).toBeInTheDocument();
  });

  it('should enable submit button when answer is selected', () => {
    render(
      <QuizPopup
        quizData={mockQuizData}
        gameId="test-game"
        onSubmitAnswer={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const submitButton = screen.getByText('제출하기');
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByText('Option A'));

    expect(submitButton).not.toBeDisabled();
  });

  it('should call onSubmitAnswer when submit button is clicked', async () => {
    const onSubmitAnswer = jest.fn().mockResolvedValue({
      isCorrect: true,
      correctAnswer: 'A',
      explanation: 'Test explanation',
    });

    render(
      <QuizPopup
        quizData={mockQuizData}
        gameId="test-game"
        onSubmitAnswer={onSubmitAnswer}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Option A'));
    fireEvent.click(screen.getByText('제출하기'));

    await waitFor(() => {
      expect(onSubmitAnswer).toHaveBeenCalledWith('A');
    });
  });
});
```

---

## 성능 최적화

1. **Lazy Loading**: 퀴즈 팝업은 필요할 때만 렌더링
2. **Memoization**: React.memo로 불필요한 리렌더링 방지
3. **Animation Performance**: Framer Motion의 GPU 가속 활용

---

## 접근성 (a11y)

1. **키보드 네비게이션**: 1-4 키로 선택지 선택, Enter로 제출
2. **ARIA 라벨**: 스크린 리더 지원
3. **포커스 관리**: 팝업 열릴 때 첫 번째 선택지에 포커스

---

## 다음 단계

1. **실제 컴포넌트 파일 작성** (6개)
2. **Redux quizSlice 통합**
3. **Unit Test 작성**
4. **E2E 테스트** (Playwright)
5. **Task #6 (Game Integration)** 시작

---

**작성자**: Client AI
**검토자**: Tech Lead
**상태**: Completed (Design)
