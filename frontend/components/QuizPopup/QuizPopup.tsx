'use client';

/**
 * QuizPopup Component
 *
 * 메인 퀴즈 팝업 컨테이너
 * EPIC-07 Feature 5: Quiz UI Components - Task #16
 *
 * Features:
 * - Framer Motion overlay with backdrop blur
 * - Slide-in animation from center (scale 0.95 → 1.0, opacity 0 → 1)
 * - Responsive design (mobile-first)
 * - Z-index: 50 for proper layering
 * - Accessibility: focus trap, ESC key to close, ARIA labels
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { Quiz } from '@/types/quiz.types';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import OXQuiz from './OXQuiz';
import QuizResult from './QuizResult';

export interface QuizPopupProps {
  isOpen: boolean;
  quiz: Quiz | null;
  selectedAnswer: string | null;
  hasSubmitted: boolean;
  isCorrect: boolean | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  onSelectAnswer: (answer: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * 애니메이션 variants
 */
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const popupVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * 퀴즈 팝업 컴포넌트
 */
const QuizPopup: React.FC<QuizPopupProps> = ({
  isOpen,
  quiz,
  selectedAnswer,
  hasSubmitted,
  isCorrect,
  correctAnswer,
  explanation,
  onSelectAnswer,
  onSubmit,
  onClose,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  /**
   * 팝업 열릴 때 포커스 관리 (focus trap)
   */
  useEffect(() => {
    if (isOpen && popupRef.current) {
      // 첫 번째 포커스 가능한 요소로 포커스 이동
      const firstButton = popupRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [isOpen]);

  /**
   * ESC 키로 닫기
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /**
   * 배경 클릭 시 닫기
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !quiz) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* 배경 블러 오버레이 */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* 팝업 컨테이너 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-4">
            <motion.div
              ref={popupRef}
              className="relative w-full max-w-[calc(100vw-2rem)] xs:max-w-md sm:max-w-lg md:max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
              variants={popupVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quiz-title"
              aria-describedby="quiz-description"
            >
              {/* 닫기 버튼 (항상 표시) */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-700/90 hover:bg-white dark:hover:bg-slate-700 shadow-md transition-all hover:shadow-lg"
                aria-label="퀴즈 닫기"
                ref={firstFocusableRef}
              >
                <svg
                  className="w-6 h-6 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* 헤더 */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium opacity-90">
                      {quiz.type === 'MULTIPLE_CHOICE' ? '4지선다' : 'OX 퀴즈'}
                    </span>
                    <h2 id="quiz-title" className="text-responsive-xl sm:text-2xl font-bold mt-1">
                      AWS 퀴즈
                    </h2>
                  </div>
                  <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
                    <span className="text-sm font-semibold">
                      {quiz.difficulty === 'EASY' && '⭐ 쉬움'}
                      {quiz.difficulty === 'MEDIUM' && '⭐⭐ 보통'}
                      {quiz.difficulty === 'HARD' && '⭐⭐⭐ 어려움'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 본문 컨텐츠 */}
              <div className="p-3 xs:p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {!hasSubmitted ? (
                  // 퀴즈 문제 화면
                  <div>
                    {quiz.type === 'MULTIPLE_CHOICE' ? (
                      <MultipleChoiceQuiz
                        question={quiz.question}
                        options={quiz.options || []}
                        selectedOption={selectedAnswer}
                        onSelect={onSelectAnswer}
                        disabled={false}
                        showResult={false}
                      />
                    ) : (
                      <OXQuiz
                        question={quiz.question}
                        selectedAnswer={selectedAnswer as 'true' | 'false' | null}
                        onSelect={onSelectAnswer as (answer: 'true' | 'false') => void}
                        disabled={false}
                        showResult={false}
                      />
                    )}

                    {/* 제출 버튼 */}
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={onSubmit}
                        disabled={!selectedAnswer}
                        className={`px-4 xs:px-6 sm:px-8 py-3.5 min-h-[44px] rounded-lg font-semibold transition-all ${
                          selectedAnswer
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        제출하기
                      </button>
                    </div>
                  </div>
                ) : (
                  // 퀴즈 결과 화면 (QuizResult 컴포넌트 사용)
                  <div className="space-y-6">
                    <QuizResult
                      isCorrect={isCorrect || false}
                      correctAnswer={correctAnswer || '정답 정보 없음'}
                      explanation={explanation || '해설 정보가 없습니다.'}
                      playerAnswer={selectedAnswer || ''}
                    />

                    {/* 확인 버튼 */}
                    <div className="flex justify-end">
                      <button
                        onClick={onClose}
                        className="px-4 xs:px-6 sm:px-8 py-3.5 min-h-[44px] bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                      >
                        확인
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default React.memo(QuizPopup);
