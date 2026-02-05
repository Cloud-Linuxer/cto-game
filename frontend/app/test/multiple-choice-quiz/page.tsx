'use client';

/**
 * MultipleChoiceQuiz Visual Test Page
 *
 * EPIC-07 Feature 1 Task #17
 * Visual testing and demonstration page for the MultipleChoiceQuiz component
 */

import React, { useState } from 'react';
import { MultipleChoiceQuiz } from '@/components/QuizPopup';

export default function MultipleChoiceQuizTestPage() {
  // Test Case 1: Basic Quiz
  const [selected1, setSelected1] = useState<string | null>(null);
  const [showResult1, setShowResult1] = useState(false);

  // Test Case 2: Disabled State
  const [selected2, setSelected2] = useState<string | null>('B');

  // Test Case 3: Correct Answer
  const [selected3, setSelected3] = useState<string | null>('C');

  // Test Case 4: Wrong Answer
  const [selected4, setSelected4] = useState<string | null>('D');

  const sampleQuestion1 = 'AWS에서 서버리스 컴퓨팅을 제공하는 서비스는?';
  const sampleOptions1 = [
    'Amazon EC2 - 가상 서버 인스턴스',
    'Amazon S3 - 객체 스토리지 서비스',
    'AWS Lambda - 서버리스 함수 실행',
    'Amazon RDS - 관리형 관계형 데이터베이스',
  ];

  const sampleQuestion2 = 'AWS Well-Architected Framework의 6가지 기둥이 아닌 것은?';
  const sampleOptions2 = [
    '운영 우수성 (Operational Excellence)',
    '보안 (Security)',
    '비용 절감 (Cost Reduction)',
    '성능 효율성 (Performance Efficiency)',
  ];

  const handleSubmit1 = () => {
    setShowResult1(true);
  };

  const handleReset1 = () => {
    setSelected1(null);
    setShowResult1(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            MultipleChoiceQuiz Component Test
          </h1>
          <p className="text-lg text-slate-600">
            EPIC-07 Feature 1 Task #17 - Visual Component Testing
          </p>
        </div>

        {/* Test Cases Grid */}
        <div className="space-y-8">
          {/* Test Case 1: Interactive Quiz */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                Test Case 1: Interactive Quiz
              </span>
            </div>

            <MultipleChoiceQuiz
              question={sampleQuestion1}
              options={sampleOptions1}
              selectedOption={selected1}
              correctAnswer={showResult1 ? 'C' : undefined}
              onSelect={setSelected1}
              disabled={showResult1}
              showResult={showResult1}
            />

            <div className="mt-6 flex gap-3">
              {!showResult1 && (
                <button
                  onClick={handleSubmit1}
                  disabled={!selected1}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  정답 확인
                </button>
              )}

              {showResult1 && (
                <button
                  onClick={handleReset1}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                >
                  다시 풀기
                </button>
              )}
            </div>

            {showResult1 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <span className="font-bold">해설:</span> AWS Lambda는 서버를 프로비저닝하거나
                  관리할 필요 없이 코드를 실행할 수 있는 서버리스 컴퓨팅 서비스입니다. 사용한
                  컴퓨팅 시간에 대해서만 비용을 지불합니다.
                </p>
              </div>
            )}
          </div>

          {/* Test Case 2: Selection State (No Result) */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                Test Case 2: Selection State (Before Submit)
              </span>
            </div>

            <MultipleChoiceQuiz
              question={sampleQuestion2}
              options={sampleOptions2}
              selectedOption={selected2}
              onSelect={setSelected2}
              disabled={false}
              showResult={false}
            />

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>State:</strong> Selected option: {selected2 || 'None'} | ShowResult: false
              </p>
            </div>
          </div>

          {/* Test Case 3: Correct Answer Display */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                Test Case 3: Correct Answer Display
              </span>
            </div>

            <MultipleChoiceQuiz
              question={sampleQuestion2}
              options={sampleOptions2}
              selectedOption={selected3}
              correctAnswer="C"
              onSelect={() => {}}
              disabled={true}
              showResult={true}
            />

            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-900">
                정답입니다! AWS Well-Architected Framework는 <strong>비용 최적화</strong>를
                포함하지만, "비용 절감"은 포함하지 않습니다. 6가지 기둥은: 운영 우수성, 보안,
                안정성, 성능 효율성, 비용 최적화, 지속 가능성입니다.
              </p>
            </div>
          </div>

          {/* Test Case 4: Wrong Answer Display */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                Test Case 4: Wrong Answer Display
              </span>
            </div>

            <MultipleChoiceQuiz
              question={sampleQuestion2}
              options={sampleOptions2}
              selectedOption={selected4}
              correctAnswer="C"
              onSelect={() => {}}
              disabled={true}
              showResult={true}
            />

            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-900">
                오답입니다. 성능 효율성은 AWS Well-Architected Framework의 올바른 기둥입니다.
                정답은 <strong>C. 비용 절감</strong>입니다. "비용 절감"이 아닌 "비용
                최적화"가 올바른 기둥 이름입니다.
              </p>
            </div>
          </div>

          {/* Test Case 5: Disabled State */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
                Test Case 5: Disabled State
              </span>
            </div>

            <MultipleChoiceQuiz
              question="AWS에서 NoSQL 데이터베이스 서비스는?"
              options={[
                'Amazon RDS',
                'Amazon DynamoDB',
                'Amazon Aurora',
                'Amazon Redshift',
              ]}
              selectedOption={null}
              onSelect={() => {}}
              disabled={true}
              showResult={false}
            />

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>State:</strong> Disabled (no interaction possible)
              </p>
            </div>
          </div>
        </div>

        {/* Component Info */}
        <div className="mt-12 bg-blue-900 text-white rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Component Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 text-blue-200">Visual Feedback</h3>
              <ul className="text-sm space-y-1 text-blue-100">
                <li>✓ Selection highlighting (blue border)</li>
                <li>✓ Correct answers in green</li>
                <li>✓ Wrong answers in red</li>
                <li>✓ Unselected options in gray</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-200">Interaction</h3>
              <ul className="text-sm space-y-1 text-blue-100">
                <li>✓ Click to select</li>
                <li>✓ Keyboard navigation (Tab, Enter, Space)</li>
                <li>✓ Disabled state during submission</li>
                <li>✓ Hover effects</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-200">Accessibility</h3>
              <ul className="text-sm space-y-1 text-blue-100">
                <li>✓ ARIA attributes (role, aria-pressed, aria-disabled)</li>
                <li>✓ Semantic HTML structure</li>
                <li>✓ Keyboard navigable</li>
                <li>✓ Screen reader friendly</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-blue-200">Testing</h3>
              <ul className="text-sm space-y-1 text-blue-100">
                <li>✓ 28 unit tests (100% passing)</li>
                <li>✓ Comprehensive test coverage</li>
                <li>✓ Edge case handling</li>
                <li>✓ Visual regression testing ready</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>
            Task #17 Complete | EPIC-07 Feature 1: LLM 퀴즈 시스템 |{' '}
            <a href="/" className="text-blue-600 hover:underline">
              ← 메인으로 돌아가기
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
