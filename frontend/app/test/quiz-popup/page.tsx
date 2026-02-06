'use client';

/**
 * QuizPopup Full Test Page
 * EPIC-12 Mobile Responsive Testing (390x844)
 *
 * Tests:
 * - QuizPopup modal at 390x844
 * - OX Quiz layout (1-col mobile, 2-col desktop)
 * - Multiple Choice Quiz
 * - Touch target sizes (44px minimum)
 * - Responsive text sizing
 */

import React, { useState } from 'react';
import QuizPopup from '@/components/QuizPopup/QuizPopup';
import type { Quiz } from '@/types/quiz.types';

export default function QuizPopupTestPage() {
  const [isOXOpen, setIsOXOpen] = useState(false);
  const [isMultipleOpen, setIsMultipleOpen] = useState(false);

  const [oxSelected, setOxSelected] = useState<string | null>(null);
  const [oxSubmitted, setOxSubmitted] = useState(false);

  const [multiSelected, setMultiSelected] = useState<string | null>(null);
  const [multiSubmitted, setMultiSubmitted] = useState(false);

  // OX Quiz
  const oxQuiz: Quiz = {
    quizId: 'test-ox-1',
    type: 'OX',
    difficulty: 'EASY',
    question: 'Amazon S3는 객체 스토리지 서비스이다.',
    options: [],
    correctAnswer: 'true',
    explanation: 'Amazon S3는 업계 최고의 확장성, 데이터 가용성, 보안 및 성능을 제공하는 객체 스토리지 서비스입니다.',
    tags: ['S3', 'Storage', 'Basic'],
    turnNumber: 5,
    metadata: {},
  };

  // Multiple Choice Quiz
  const multipleQuiz: Quiz = {
    quizId: 'test-multiple-1',
    type: 'MULTIPLE_CHOICE',
    difficulty: 'MEDIUM',
    question: 'AWS에서 서버리스 컴퓨팅을 제공하는 서비스는?',
    options: [
      'Amazon EC2 - 가상 서버 인스턴스',
      'Amazon S3 - 객체 스토리지 서비스',
      'AWS Lambda - 서버리스 함수 실행',
      'Amazon RDS - 관리형 관계형 데이터베이스',
    ],
    correctAnswer: 'C',
    explanation: 'AWS Lambda는 서버를 프로비저닝하거나 관리할 필요 없이 코드를 실행할 수 있는 서버리스 컴퓨팅 서비스입니다. 사용한 컴퓨팅 시간에 대해서만 비용을 지불합니다.',
    tags: ['Lambda', 'Serverless', 'Compute'],
    turnNumber: 9,
    metadata: {},
  };

  const handleOXSubmit = () => {
    setOxSubmitted(true);
  };

  const handleOXClose = () => {
    setIsOXOpen(false);
    setOxSelected(null);
    setOxSubmitted(false);
  };

  const handleMultipleSubmit = () => {
    setMultiSubmitted(true);
  };

  const handleMultipleClose = () => {
    setIsMultipleOpen(false);
    setMultiSelected(null);
    setMultiSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Quiz Popup Mobile Test
          </h1>
          <p className="text-lg text-slate-600 mb-2">
            EPIC-12 Mobile Responsive (390x844)
          </p>
          <p className="text-sm text-slate-500">
            Test the quiz UI at mobile resolution (390x844)
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Test Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OX Quiz Button */}
            <button
              onClick={() => setIsOXOpen(true)}
              className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="text-left">
                <div className="text-xl mb-1">OX 퀴즈 열기</div>
                <div className="text-sm opacity-90">True/False Quiz Test</div>
              </div>
            </button>

            {/* Multiple Choice Button */}
            <button
              onClick={() => setIsMultipleOpen(true)}
              className="px-6 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="text-left">
                <div className="text-xl mb-1">객관식 퀴즈 열기</div>
                <div className="text-sm opacity-90">Multiple Choice Quiz Test</div>
              </div>
            </button>
          </div>
        </div>

        {/* Test Checklist */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">390x844 Test Checklist</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                1
              </div>
              <div>
                <div className="font-semibold text-slate-900">Modal Fit</div>
                <div className="text-sm text-slate-600">Modal should fit viewport without horizontal scroll (358px modal width)</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                2
              </div>
              <div>
                <div className="font-semibold text-slate-900">OX Layout</div>
                <div className="text-sm text-slate-600">OX buttons should stack vertically (1-col) on mobile, 2-col on desktop</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                3
              </div>
              <div>
                <div className="font-semibold text-slate-900">Touch Targets</div>
                <div className="text-sm text-slate-600">All buttons should be ≥44px height (WCAG 2.5.5)</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                4
              </div>
              <div>
                <div className="font-semibold text-slate-900">Text Sizing</div>
                <div className="text-sm text-slate-600">Text should use clamp() responsive sizing (readable without zoom)</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                5
              </div>
              <div>
                <div className="font-semibold text-slate-900">Padding</div>
                <div className="text-sm text-slate-600">Mobile padding: p-3 (12px), Desktop: p-6 (24px)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Device Instructions */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">How to Test</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-bold">1.</span>
              <span>Open Chrome DevTools (F12 or Cmd+Option+I)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-bold">2.</span>
              <span>Toggle Device Toolbar (Cmd+Shift+M or Ctrl+Shift+M)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-bold">3.</span>
              <span>Select &quot;iPhone 12 Mini&quot; or set custom 390x844 resolution</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-bold">4.</span>
              <span>Click &quot;OX 퀴즈 열기&quot; or &quot;객관식 퀴즈 열기&quot;</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 font-bold">5.</span>
              <span>Verify all checklist items above</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>
            EPIC-12 Implementation Complete |{' '}
            <a href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </a>
          </p>
        </div>
      </div>

      {/* Quiz Popups */}
      <QuizPopup
        isOpen={isOXOpen}
        quiz={oxQuiz}
        selectedAnswer={oxSelected}
        hasSubmitted={oxSubmitted}
        isCorrect={oxSubmitted ? oxSelected === oxQuiz.correctAnswer : null}
        correctAnswer={oxSubmitted ? oxQuiz.correctAnswer : null}
        explanation={oxSubmitted ? oxQuiz.explanation : null}
        onSelectAnswer={setOxSelected}
        onSubmit={handleOXSubmit}
        onClose={handleOXClose}
      />

      <QuizPopup
        isOpen={isMultipleOpen}
        quiz={multipleQuiz}
        selectedAnswer={multiSelected}
        hasSubmitted={multiSubmitted}
        isCorrect={multiSubmitted ? multiSelected === multipleQuiz.correctAnswer : null}
        correctAnswer={multiSubmitted ? multipleQuiz.correctAnswer : null}
        explanation={multiSubmitted ? multipleQuiz.explanation : null}
        onSelectAnswer={setMultiSelected}
        onSubmit={handleMultipleSubmit}
        onClose={handleMultipleClose}
      />
    </div>
  );
}
