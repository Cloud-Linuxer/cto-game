'use client';

/**
 * MultipleChoiceQuiz Component
 *
 * 4지선다형 퀴즈 UI 컴포넌트
 * EPIC-07 Feature 1 Task #17
 */

import React from 'react';

export interface MultipleChoiceQuizProps {
  question: string;
  options: string[]; // 4 options (A, B, C, D)
  selectedOption: string | null; // 'A', 'B', 'C', 'D'
  correctAnswer?: string; // Only provided after submission
  onSelect: (option: string) => void;
  disabled: boolean;
  showResult: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

/**
 * 4지선다형 퀴즈 컴포넌트
 */
const MultipleChoiceQuiz: React.FC<MultipleChoiceQuizProps> = ({
  question,
  options,
  selectedOption,
  correctAnswer,
  onSelect,
  disabled,
  showResult,
}) => {
  // Validate options length
  if (options.length !== 4) {
    console.warn('MultipleChoiceQuiz: Expected 4 options, received', options.length);
  }

  /**
   * 옵션 스타일 결정
   */
  const getOptionStyles = (label: string): string => {
    const isSelected = selectedOption === label;
    const isCorrect = correctAnswer === label;
    const isWrong = isSelected && !isCorrect && showResult;

    // Show result state
    if (showResult) {
      if (isCorrect) {
        return 'bg-green-100 border-green-500 text-green-900 border-2';
      }
      if (isWrong) {
        return 'bg-red-100 border-red-500 text-red-900 border-2';
      }
      return 'bg-gray-50 border-gray-200 text-gray-500 border';
    }

    // Selection state (before result)
    if (isSelected) {
      return 'bg-white border-blue-500 border-2 shadow-md';
    }

    // Default state
    if (disabled) {
      return 'bg-white border-gray-200 border transition-colors duration-200';
    }
    return 'bg-white border-gray-200 border hover:border-blue-400 transition-colors duration-200';
  };

  /**
   * 옵션 클릭 핸들러
   */
  const handleOptionClick = (label: string) => {
    if (disabled) return;
    onSelect(label);
  };

  /**
   * 키보드 이벤트 핸들러
   */
  const handleKeyDown = (e: React.KeyboardEvent, label: string) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(label);
    }
  };

  return (
    <div className="w-full">
      {/* Question Section */}
      <div className="mb-6">
        <h3 className="text-responsive-lg xs:text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
          {question}
        </h3>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((optionText, index) => {
          const label = OPTION_LABELS[index];
          const styles = getOptionStyles(label);
          const isSelected = selectedOption === label;
          const isCorrect = correctAnswer === label;
          const isWrong = isSelected && !isCorrect && showResult;

          return (
            <div
              key={label}
              className={`
                relative rounded-lg p-3 xs:p-4 cursor-pointer
                ${styles}
                ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
              `}
              onClick={() => handleOptionClick(label)}
              onKeyDown={(e) => handleKeyDown(e, label)}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-pressed={isSelected}
              aria-disabled={disabled}
            >
              {/* Option Label Badge */}
              <div className="flex items-start gap-3">
                <div
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${
                      showResult && isCorrect
                        ? 'bg-green-500 text-white'
                        : showResult && isWrong
                        ? 'bg-red-500 text-white'
                        : isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }
                  `}
                >
                  {label}
                </div>

                {/* Option Text */}
                <div className="flex-1 pt-1">
                  <p
                    className={`
                      text-responsive-sm xs:text-base leading-relaxed
                      ${
                        showResult && isCorrect
                          ? 'text-green-900 font-semibold'
                          : showResult && isWrong
                          ? 'text-red-900 font-semibold'
                          : isSelected
                          ? 'text-slate-900 dark:text-slate-100 font-medium'
                          : 'text-slate-700 dark:text-slate-300'
                      }
                    `}
                  >
                    {optionText}
                  </p>
                </div>

                {/* Result Icons */}
                {showResult && (
                  <div className="flex-shrink-0">
                    {isCorrect && (
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-label="정답"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {isWrong && (
                      <svg
                        className="w-6 h-6 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-label="오답"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Keyboard Hint (when not disabled and no result) */}
      {!disabled && !showResult && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            클릭하거나 키보드 번호 키를 사용하세요
          </p>
        </div>
      )}
    </div>
  );
};

export default MultipleChoiceQuiz;
