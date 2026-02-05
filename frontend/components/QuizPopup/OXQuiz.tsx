'use client';

/**
 * OXQuiz Component
 *
 * O/X (True/False) 퀴즈 컴포넌트
 * Task #18: Create OXQuiz component
 *
 * Features:
 * - Large O (True) and X (False) buttons with icons
 * - Color feedback on correct/wrong answers
 * - Hover scale animation
 * - Disabled state during processing
 */

import React from 'react';

export interface OXQuizProps {
  question: string;
  selectedAnswer: 'true' | 'false' | null;
  correctAnswer?: 'true' | 'false'; // Only provided after submission
  onSelect: (answer: 'true' | 'false') => void;
  disabled: boolean;
  showResult: boolean;
}

/**
 * OX 퀴즈 컴포넌트
 *
 * @param question - 퀴즈 질문 텍스트
 * @param selectedAnswer - 사용자가 선택한 답변 ('true' | 'false' | null)
 * @param correctAnswer - 정답 (제출 후에만 제공)
 * @param onSelect - 답변 선택 핸들러
 * @param disabled - 버튼 비활성화 여부
 * @param showResult - 결과 표시 여부
 */
const OXQuiz: React.FC<OXQuizProps> = ({
  question,
  selectedAnswer,
  correctAnswer,
  onSelect,
  disabled,
  showResult,
}) => {
  /**
   * 버튼 스타일 결정 함수
   * @param answerType - 'true' 또는 'false'
   * @returns TailwindCSS 클래스명 문자열
   */
  const getButtonStyle = (answerType: 'true' | 'false'): string => {
    const baseStyle = 'py-6 px-8 rounded-xl font-bold text-xl transition-all duration-200 flex flex-col items-center justify-center gap-3 border-2';

    if (!showResult) {
      // 결과 표시 전: 기본 스타일 + 선택 상태
      if (selectedAnswer === answerType) {
        return `${baseStyle} bg-indigo-100 border-indigo-500 text-indigo-900 shadow-lg`;
      }
      return `${baseStyle} bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:scale-105 hover:border-gray-400 shadow-md`;
    }

    // 결과 표시: 정답/오답 피드백
    if (correctAnswer === answerType) {
      // 정답 버튼
      return `${baseStyle} bg-green-500 border-green-600 text-white shadow-xl`;
    }

    if (selectedAnswer === answerType && selectedAnswer !== correctAnswer) {
      // 선택했지만 오답인 버튼
      return `${baseStyle} bg-red-500 border-red-600 text-white shadow-xl`;
    }

    // 선택되지 않은 버튼
    return `${baseStyle} bg-gray-200 border-gray-300 text-gray-700`;
  };

  /**
   * 버튼 클릭 핸들러
   * @param answerType - 'true' 또는 'false'
   */
  const handleClick = (answerType: 'true' | 'false') => {
    if (!disabled && !showResult) {
      onSelect(answerType);
    }
  };

  /**
   * 키보드 이벤트 핸들러
   * @param e - 키보드 이벤트
   * @param answerType - 'true' 또는 'false'
   */
  const handleKeyDown = (e: React.KeyboardEvent, answerType: 'true' | 'false') => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !showResult) {
      e.preventDefault();
      onSelect(answerType);
    }
  };

  return (
    <div className="w-full">
      {/* Question Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed text-center">
          {question}
        </h3>
      </div>

      {/* O/X Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* O (True) Button */}
        <button
          onClick={() => handleClick('true')}
          onKeyDown={(e) => handleKeyDown(e, 'true')}
          disabled={disabled || showResult}
          className={getButtonStyle('true')}
          aria-label="참 (True)"
          aria-pressed={selectedAnswer === 'true'}
          type="button"
        >
          <span className="text-5xl font-black">✓</span>
          <span className="text-lg font-bold">참 (True)</span>

          {showResult && correctAnswer === 'true' && (
            <span className="text-sm font-semibold mt-1">정답!</span>
          )}
        </button>

        {/* X (False) Button */}
        <button
          onClick={() => handleClick('false')}
          onKeyDown={(e) => handleKeyDown(e, 'false')}
          disabled={disabled || showResult}
          className={getButtonStyle('false')}
          aria-label="거짓 (False)"
          aria-pressed={selectedAnswer === 'false'}
          type="button"
        >
          <span className="text-5xl font-black">✗</span>
          <span className="text-lg font-bold">거짓 (False)</span>

          {showResult && correctAnswer === 'false' && (
            <span className="text-sm font-semibold mt-1">정답!</span>
          )}
        </button>
      </div>

      {/* Result Feedback */}
      {showResult && selectedAnswer && correctAnswer && (
        <div className="mt-6 text-center">
          {selectedAnswer === correctAnswer ? (
            <div className="text-green-600 dark:text-green-400 font-bold text-lg">
              🎉 정답입니다!
            </div>
          ) : (
            <div className="text-red-600 dark:text-red-400 font-bold text-lg">
              ❌ 오답입니다. 정답은 {correctAnswer === 'true' ? '참 (True)' : '거짓 (False)'}입니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(OXQuiz);
