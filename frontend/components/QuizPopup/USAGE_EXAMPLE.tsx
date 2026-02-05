/**
 * MultipleChoiceQuiz Component Usage Examples
 *
 * EPIC-07 Feature 1 Task #17
 */

import React, { useState } from 'react';
import { MultipleChoiceQuiz } from './index';

/**
 * Example 1: Basic Quiz Flow
 */
export function BasicQuizExample() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = 'AWS에서 서버리스 컴퓨팅 서비스로 가장 적합한 것은?';
  const options = [
    'Amazon EC2 인스턴스',
    'Amazon S3 버킷',
    'AWS Lambda 함수',
    'Amazon RDS 데이터베이스',
  ];
  const correctAnswer = 'C'; // AWS Lambda

  const handleSelect = (option: string) => {
    if (!isSubmitting && !showResult) {
      setSelectedOption(option);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setShowResult(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setShowResult(false);
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <MultipleChoiceQuiz
        question={question}
        options={options}
        selectedOption={selectedOption}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={handleSelect}
        disabled={isSubmitting || showResult}
        showResult={showResult}
      />

      <div className="mt-6 flex gap-3">
        {!showResult && (
          <button
            onClick={handleSubmit}
            disabled={!selectedOption || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '제출 중...' : '정답 확인'}
          </button>
        )}

        {showResult && (
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg"
          >
            다시 풀기
          </button>
        )}
      </div>

      {showResult && (
        <div className="mt-4 p-4 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-900">
            {selectedOption === correctAnswer
              ? '정답입니다! AWS Lambda는 서버 관리 없이 코드를 실행할 수 있는 서버리스 컴퓨팅 서비스입니다.'
              : '오답입니다. AWS Lambda가 정답입니다.'}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Quiz with Time Limit
 */
export function TimedQuizExample() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds

  const question = 'Amazon S3의 스토리지 클래스 중 가장 저렴한 것은?';
  const options = [
    'S3 Standard',
    'S3 Intelligent-Tiering',
    'S3 Glacier Deep Archive',
    'S3 One Zone-IA',
  ];
  const correctAnswer = 'C';

  // Timer effect
  React.useEffect(() => {
    if (timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      setShowResult(true);
    }
  }, [timeLeft, showResult]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Timer Display */}
      <div className="mb-4 text-center">
        <span className="text-2xl font-bold text-blue-600">{timeLeft}초</span>
      </div>

      <MultipleChoiceQuiz
        question={question}
        options={options}
        selectedOption={selectedOption}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={setSelectedOption}
        disabled={showResult || timeLeft === 0}
        showResult={showResult}
      />

      {showResult && (
        <div className="mt-4 p-4 rounded-lg bg-yellow-50">
          <p className="text-sm text-yellow-900">
            {timeLeft === 0 ? '시간이 초과되었습니다!' : '제출 완료!'}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: Multiple Quiz Sequence
 */
export function QuizSequenceExample() {
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [showResults, setShowResults] = useState<boolean[]>([false, false, false]);
  const [score, setScore] = useState(0);

  const quizzes = [
    {
      question: 'AWS의 관계형 데이터베이스 서비스는?',
      options: ['Amazon DynamoDB', 'Amazon RDS', 'Amazon Redshift', 'Amazon Neptune'],
      correctAnswer: 'B',
    },
    {
      question: 'AWS의 콘텐츠 전송 네트워크(CDN) 서비스는?',
      options: ['Amazon Route 53', 'Amazon CloudFront', 'AWS Direct Connect', 'Amazon VPC'],
      correctAnswer: 'B',
    },
    {
      question: 'AWS의 컨테이너 오케스트레이션 서비스는?',
      options: ['Amazon ECS', 'Amazon EC2', 'AWS Lambda', 'Amazon Lightsail'],
      correctAnswer: 'A',
    },
  ];

  const currentQuiz = quizzes[currentQuizIndex];

  const handleSelect = (option: string) => {
    const newOptions = [...selectedOptions];
    newOptions[currentQuizIndex] = option;
    setSelectedOptions(newOptions);
  };

  const handleSubmit = () => {
    const newResults = [...showResults];
    newResults[currentQuizIndex] = true;
    setShowResults(newResults);

    // Calculate score
    if (selectedOptions[currentQuizIndex] === currentQuiz.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    }
  };

  const isLastQuiz = currentQuizIndex === quizzes.length - 1;
  const allCompleted = showResults.every((result) => result);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            문제 {currentQuizIndex + 1} / {quizzes.length}
          </span>
          <span>점수: {score}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuizIndex + 1) / quizzes.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Quiz */}
      <MultipleChoiceQuiz
        question={currentQuiz.question}
        options={currentQuiz.options}
        selectedOption={selectedOptions[currentQuizIndex]}
        correctAnswer={showResults[currentQuizIndex] ? currentQuiz.correctAnswer : undefined}
        onSelect={handleSelect}
        disabled={showResults[currentQuizIndex]}
        showResult={showResults[currentQuizIndex]}
      />

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        {!showResults[currentQuizIndex] && (
          <button
            onClick={handleSubmit}
            disabled={!selectedOptions[currentQuizIndex]}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            정답 확인
          </button>
        )}

        {showResults[currentQuizIndex] && !isLastQuiz && (
          <button onClick={handleNext} className="px-6 py-2 bg-green-600 text-white rounded-lg">
            다음 문제
          </button>
        )}

        {allCompleted && (
          <div className="w-full p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-lg font-bold text-blue-900">
              퀴즈 완료! 최종 점수: {score} / {quizzes.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example 4: Quiz with Explanation
 */
export function QuizWithExplanationExample() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const question = 'AWS Well-Architected Framework의 5가지 기둥에 포함되지 않는 것은?';
  const options = [
    '운영 우수성 (Operational Excellence)',
    '보안 (Security)',
    '비용 절감 (Cost Reduction)',
    '성능 효율성 (Performance Efficiency)',
  ];
  const correctAnswer = 'C';
  const explanation = {
    C: 'AWS Well-Architected Framework는 운영 우수성, 보안, 안정성, 성능 효율성, 비용 최적화의 5가지 기둥으로 구성됩니다. "비용 절감"이 아닌 "비용 최적화"가 올바른 기둥입니다.',
    A: '운영 우수성은 AWS Well-Architected Framework의 첫 번째 기둥입니다.',
    B: '보안은 AWS Well-Architected Framework의 두 번째 기둥입니다.',
    D: '성능 효율성은 AWS Well-Architected Framework의 네 번째 기둥입니다.',
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <MultipleChoiceQuiz
        question={question}
        options={options}
        selectedOption={selectedOption}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={setSelectedOption}
        disabled={showResult}
        showResult={showResult}
      />

      <div className="mt-6">
        <button
          onClick={() => setShowResult(true)}
          disabled={!selectedOption || showResult}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          정답 확인
        </button>
      </div>

      {showResult && selectedOption && (
        <div className="mt-4 p-4 rounded-lg bg-blue-50">
          <h4 className="font-bold text-blue-900 mb-2">해설</h4>
          <p className="text-sm text-blue-800">{explanation[selectedOption as keyof typeof explanation]}</p>
        </div>
      )}
    </div>
  );
}
