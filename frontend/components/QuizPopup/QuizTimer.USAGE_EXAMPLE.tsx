/**
 * QuizTimer Usage Examples
 *
 * Phase 2 feature: 실제 사용 예시 및 통합 가이드
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import QuizTimer from './QuizTimer';

/* ============================================
 * Example 1: Basic Timer
 * ============================================ */
export function BasicTimerExample() {
  const [isPaused, setIsPaused] = useState(false);

  const handleTimeout = () => {
    alert('Time is up!');
  };

  return (
    <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Example 1: Basic Timer</h2>

      <div className="flex flex-col items-center gap-4">
        <QuizTimer
          duration={60}
          onTimeout={handleTimeout}
          isPaused={isPaused}
        />

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {isPaused ? '재개' : '일시정지'}
        </button>
      </div>
    </div>
  );
}

/* ============================================
 * Example 2: Custom Duration & Size
 * ============================================ */
export function CustomTimerExample() {
  const [duration, setDuration] = useState(30);
  const [size, setSize] = useState(120);
  const [isPaused, setIsPaused] = useState(false);

  const handleTimeout = () => {
    console.log(`Timer finished for duration: ${duration}s`);
  };

  return (
    <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Example 2: Custom Timer</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Timer Display */}
        <div className="flex items-center justify-center">
          <QuizTimer
            duration={duration}
            onTimeout={handleTimeout}
            isPaused={isPaused}
            size={size}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Duration: {duration}s
            </label>
            <input
              type="range"
              min="10"
              max="180"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Size: {size}px
            </label>
            <input
              type="range"
              min="80"
              max="200"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {isPaused ? '재개' : '일시정지'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================
 * Example 3: Multiple Timers
 * ============================================ */
export function MultipleTimersExample() {
  const handleTimeout = (name: string) => {
    console.log(`${name} timer finished!`);
  };

  return (
    <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Example 3: Multiple Timers</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Easy - 120s */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4 text-green-600">Easy</h3>
          <QuizTimer
            duration={120}
            onTimeout={() => handleTimeout('Easy')}
            isPaused={false}
            size={100}
            warningThreshold={20}
          />
          <p className="mt-2 text-sm text-slate-600">2 minutes</p>
        </div>

        {/* Normal - 60s */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">Normal</h3>
          <QuizTimer
            duration={60}
            onTimeout={() => handleTimeout('Normal')}
            isPaused={false}
            size={100}
          />
          <p className="mt-2 text-sm text-slate-600">60 seconds</p>
        </div>

        {/* Hard - 30s */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4 text-red-600">Hard</h3>
          <QuizTimer
            duration={30}
            onTimeout={() => handleTimeout('Hard')}
            isPaused={false}
            size={100}
            warningThreshold={5}
          />
          <p className="mt-2 text-sm text-slate-600">30 seconds</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================
 * Example 4: Quiz Integration
 * ============================================ */
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export function QuizWithTimerExample() {
  const [isPaused, setIsPaused] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [timeExpired, setTimeExpired] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const questions: QuizQuestion[] = [
    {
      id: 'q1',
      question: 'What is the default region for AWS services?',
      options: ['us-east-1', 'eu-west-1', 'ap-northeast-1', 'No default'],
      correctAnswer: 3,
    },
    {
      id: 'q2',
      question: 'Which service is used for serverless compute?',
      options: ['EC2', 'Lambda', 'RDS', 'S3'],
      correctAnswer: 1,
    },
    {
      id: 'q3',
      question: 'What does S3 stand for?',
      options: [
        'Simple Storage Service',
        'Secure Storage System',
        'Standard Storage Solution',
        'Scalable Storage Service',
      ],
      correctAnswer: 0,
    },
  ];

  const handleTimeout = useCallback(() => {
    console.log('Time expired! Auto-submitting...');
    setTimeExpired(true);
    setIsPaused(true);
    calculateScore();
  }, [selectedAnswers]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (!timeExpired) {
      const newAnswers = [...selectedAnswers];
      newAnswers[currentQuestionIndex] = answerIndex;
      setSelectedAnswers(newAnswers);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    setIsPaused(true);
    calculateScore();
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === questions[index]?.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
  };

  const handleReset = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setTimeExpired(false);
    setScore(null);
    setIsPaused(false);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-center">AWS Quiz Challenge</h2>

      {/* Header with Timer */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-slate-200 dark:border-slate-700">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          <div className="flex gap-2 mt-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-8 h-2 rounded-full ${
                  index === currentQuestionIndex
                    ? 'bg-indigo-600'
                    : selectedAnswers[index] !== undefined
                    ? 'bg-green-500'
                    : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        <QuizTimer
          duration={90}
          onTimeout={handleTimeout}
          isPaused={isPaused}
          size={80}
          warningThreshold={15}
        />
      </div>

      {/* Quiz Content */}
      {score === null ? (
        <div className="space-y-6">
          {/* Question */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">{currentQuestion.question}</h3>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={timeExpired}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswers[currentQuestionIndex] === index
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                  } ${
                    timeExpired ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                  }`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span>{' '}
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0 || timeExpired}
              className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={timeExpired}
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                disabled={timeExpired}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            )}
          </div>

          {/* Time Expired Warning */}
          {timeExpired && (
            <div className="p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-600 rounded-lg text-center">
              <p className="text-red-600 dark:text-red-400 font-semibold">
                ⏰ Time Expired! Your answers have been auto-submitted.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Results */
        <div className="text-center space-y-6">
          <div className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
            <h3 className="text-2xl font-bold mb-4">Quiz Complete!</h3>
            <div className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              {score} / {questions.length}
            </div>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {score === questions.length
                ? '🎉 Perfect Score!'
                : score >= questions.length * 0.7
                ? '👍 Great Job!'
                : score >= questions.length * 0.5
                ? '👌 Not Bad!'
                : '📚 Keep Learning!'}
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================
 * Example 5: Timer with Callbacks
 * ============================================ */
export function TimerCallbacksExample() {
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const handleTimeout = () => {
    addLog('⏰ Timer finished!');
    alert('Time is up!');
  };

  useEffect(() => {
    if (isPaused) {
      addLog('⏸️ Timer paused');
    } else {
      addLog('▶️ Timer started/resumed');
    }
  }, [isPaused]);

  return (
    <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Example 5: Timer with Callbacks</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Timer */}
        <div className="flex flex-col items-center gap-4">
          <QuizTimer
            duration={30}
            onTimeout={handleTimeout}
            isPaused={isPaused}
          />

          <div className="flex gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => {
                setLogs([]);
                addLog('🗑️ Logs cleared');
              }}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-slate-800 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
          <div className="font-bold mb-2 text-green-300">Event Log:</div>
          {logs.length === 0 ? (
            <div className="text-slate-500">No events yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="py-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================
 * Demo Page Component
 * ============================================ */
export default function QuizTimerDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 py-12">
      <div className="max-w-6xl mx-auto space-y-8 px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">QuizTimer Component Demo</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Phase 2 Feature: 퀴즈 제한시간 타이머 사용 예시
          </p>
        </header>

        <BasicTimerExample />
        <CustomTimerExample />
        <MultipleTimersExample />
        <QuizWithTimerExample />
        <TimerCallbacksExample />
      </div>
    </div>
  );
}
