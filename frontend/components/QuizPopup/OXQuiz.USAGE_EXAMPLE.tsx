/**
 * OXQuiz Component Usage Examples
 *
 * Task #18: OXQuiz component integration guide
 * Demonstrates various use cases and integration patterns
 */

import React, { useState } from 'react';
import { OXQuiz } from './index';

/**
 * Example 1: Basic Usage
 * Simple O/X quiz with state management
 */
export const BasicExample: React.FC = () => {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer: 'true' | 'false' = 'false';

  const handleSelect = (answer: 'true' | 'false') => {
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    setShowResult(true);
  };

  const handleReset = () => {
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <OXQuiz
        question="AWS EC2는 서버리스 컴퓨팅 서비스이다."
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={handleSelect}
        disabled={false}
        showResult={showResult}
      />

      {!showResult ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="mt-6 w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
        >
          제출하기
        </button>
      ) : (
        <button
          onClick={handleReset}
          className="mt-6 w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
};

/**
 * Example 2: Integration with Quiz System
 * Full quiz flow with backend API integration
 */
interface QuizQuestion {
  questionId: string;
  question: string;
  correctAnswer: 'true' | 'false';
  explanation?: string;
}

export const QuizSystemExample: React.FC = () => {
  const [currentQuestion] = useState<QuizQuestion>({
    questionId: 'q1',
    question: 'Amazon Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형 데이터베이스이다.',
    correctAnswer: 'true',
    explanation: 'Aurora는 MySQL 및 PostgreSQL과 완전 호환되며, 최대 5배 빠른 성능을 제공합니다.',
  });

  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (answer: 'true' | 'false') => {
    if (!isSubmitting && !showResult) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // In real implementation:
      // const response = await fetch('/api/quiz/submit', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     questionId: currentQuestion.questionId,
      //     answer: selectedAnswer,
      //   }),
      // });
      // const data = await response.json();

      setShowResult(true);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          AWS 지식 퀴즈
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          정답을 선택하고 제출하세요.
        </p>
      </div>

      <OXQuiz
        question={currentQuestion.question}
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? currentQuestion.correctAnswer : undefined}
        onSelect={handleSelect}
        disabled={isSubmitting}
        showResult={showResult}
      />

      {showResult && currentQuestion.explanation && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
            설명
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {!showResult ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || isSubmitting}
          className="mt-6 w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
        >
          {isSubmitting ? '제출 중...' : '제출하기'}
        </button>
      ) : (
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors"
        >
          다음 문제
        </button>
      )}
    </div>
  );
};

/**
 * Example 3: Multiple Choice Quiz with Timer
 * Quiz with countdown timer and auto-submit
 */
export const TimedQuizExample: React.FC = () => {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds
  const correctAnswer: 'true' | 'false' = 'true';

  React.useEffect(() => {
    if (showResult || timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResult, timeLeft]);

  const handleSelect = (answer: 'true' | 'false') => {
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    setShowResult(true);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          시간 제한 퀴즈
        </h2>
        <div className={`
          text-2xl font-bold px-4 py-2 rounded-lg
          ${timeLeft > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        `}>
          ⏱️ {timeLeft}초
        </div>
      </div>

      <OXQuiz
        question="AWS Lambda는 이벤트 기반 서버리스 컴퓨팅 서비스이다."
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={handleSelect}
        disabled={timeLeft === 0}
        showResult={showResult}
      />

      {!showResult && timeLeft > 0 ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="mt-6 w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
        >
          제출하기
        </button>
      ) : showResult && (
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {timeLeft === 0 && !selectedAnswer
              ? '시간 초과! 답을 선택하지 않았습니다.'
              : `${timeLeft === 0 ? '시간 초과로 자동 제출되었습니다.' : '제출 완료!'}`
            }
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Example 4: Quiz Rewards Display
 * Quiz with reward feedback on correct answer
 */
export const QuizWithRewardsExample: React.FC = () => {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer: 'true' | 'false' = 'false';

  const rewards = {
    cash: 50000,
    trust: 2,
  };

  const handleSelect = (answer: 'true' | 'false') => {
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    setShowResult(true);
  };

  const isCorrect = selectedAnswer === correctAnswer;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          보상 퀴즈
        </h2>
        <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
          <span>💰 보상: {rewards.cash.toLocaleString()}원</span>
          <span>🎯 신뢰도: +{rewards.trust}</span>
        </div>
      </div>

      <OXQuiz
        question="Amazon S3는 블록 스토리지 서비스이다."
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={handleSelect}
        disabled={false}
        showResult={showResult}
      />

      {showResult && isCorrect && (
        <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-green-50 dark:from-yellow-900/20 dark:to-green-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="font-bold text-yellow-900 dark:text-yellow-100 mb-3 text-center text-lg">
            🎉 보상 획득!
          </h4>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                +{rewards.cash.toLocaleString()}원
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">현금</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                +{rewards.trust}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">신뢰도</div>
            </div>
          </div>
        </div>
      )}

      {!showResult ? (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="mt-6 w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
        >
          제출하기
        </button>
      ) : (
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full py-3 px-6 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors"
        >
          {isCorrect ? '다음 문제' : '다시 시도'}
        </button>
      )}
    </div>
  );
};

/**
 * Example 5: Accessibility Features Demo
 * Demonstrates keyboard navigation and screen reader support
 */
export const AccessibilityExample: React.FC = () => {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer: 'true' | 'false' = 'true';

  const handleSelect = (answer: 'true' | 'false') => {
    setSelectedAnswer(answer);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
          접근성 기능 안내
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Tab 키로 버튼 간 이동</li>
          <li>• Enter 또는 Space 키로 선택</li>
          <li>• ARIA 레이블을 통한 스크린 리더 지원</li>
          <li>• 고대비 색상으로 시각적 피드백 제공</li>
        </ul>
      </div>

      <OXQuiz
        question="AWS CloudFront는 콘텐츠 전송 네트워크(CDN) 서비스이다."
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={handleSelect}
        disabled={false}
        showResult={showResult}
      />

      <button
        onClick={() => setShowResult(!showResult)}
        className="mt-6 w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
      >
        {showResult ? '결과 숨기기' : '제출하기'}
      </button>
    </div>
  );
};

export default {
  BasicExample,
  QuizSystemExample,
  TimedQuizExample,
  QuizWithRewardsExample,
  AccessibilityExample,
};
