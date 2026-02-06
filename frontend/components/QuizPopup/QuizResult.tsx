'use client';

/**
 * QuizResult Component
 *
 * 퀴즈 결과 표시 컴포넌트
 * EPIC-07 Task #19: QuizResult UI 구현
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface QuizResultProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  playerAnswer: string;
}

/**
 * 퀴즈 결과 컴포넌트
 *
 * 정답/오답 상태, 정답 표시, 해설 제공
 */
const QuizResult: React.FC<QuizResultProps> = ({
  isCorrect,
  correctAnswer,
  explanation,
  playerAnswer,
}) => {
  // 페이드인 애니메이션
  const fadeInVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden"
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      role="region"
      aria-live="polite"
      aria-label={isCorrect ? '정답입니다' : '오답입니다'}
    >
      {/* 상태 배너 */}
      <div
        className={`w-full py-3 xs:py-4 px-4 xs:px-6 ${
          isCorrect
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl xs:text-2xl" aria-hidden="true">
            {isCorrect ? '✓' : '✗'}
          </span>
          <h2 className="text-responsive-lg xs:text-xl font-bold">
            {isCorrect ? '정답입니다!' : '오답입니다'}
          </h2>
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-4 xs:p-6">
        {/* 오답인 경우 정답/선택한 답 표시 */}
        {!isCorrect && (
          <div className="mb-6 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400 min-w-fit">
                정답:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                {correctAnswer}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-red-600 dark:text-red-400 min-w-fit">
                선택한 답:
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {playerAnswer}
              </span>
            </div>
          </div>
        )}

        {/* 정답인 경우 간단한 확인 메시지 */}
        {isCorrect && (
          <div className="mb-6">
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-green-600 dark:text-green-400 min-w-fit">
                정답:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                {correctAnswer}
              </span>
            </div>
          </div>
        )}

        {/* 해설 섹션 */}
        <div className="mt-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
            해설
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {explanation}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(QuizResult);
