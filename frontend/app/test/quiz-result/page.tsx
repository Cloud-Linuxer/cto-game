'use client';

/**
 * QuizResult Component Test Page
 *
 * EPIC-07 Task #19: QuizResult 컴포넌트 시각적 테스트 페이지
 */

import React, { useState } from 'react';
import { QuizResult } from '@/components/QuizPopup';

export default function QuizResultTestPage() {
  const [activeExample, setActiveExample] = useState<'correct' | 'incorrect' | 'multiple' | 'ox'>(
    'correct'
  );

  const examples = {
    correct: {
      isCorrect: true,
      correctAnswer: 'Amazon Aurora',
      explanation:
        'Amazon Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형 데이터베이스로, 표준 MySQL보다 최대 5배 빠른 성능을 제공합니다. 고가용성과 내구성을 갖춘 엔터프라이즈급 데이터베이스입니다.',
      playerAnswer: 'Amazon Aurora',
    },
    incorrect: {
      isCorrect: false,
      correctAnswer: 'Amazon EKS (Elastic Kubernetes Service)',
      explanation:
        'Amazon EKS는 AWS에서 Kubernetes를 쉽게 실행할 수 있도록 하는 관리형 서비스입니다. 컨테이너화된 애플리케이션의 배포, 관리 및 확장을 자동화하며, AWS의 다른 서비스들과 긴밀하게 통합됩니다.',
      playerAnswer: 'Amazon ECS (Elastic Container Service)',
    },
    multiple: {
      isCorrect: false,
      correctAnswer: '2) Amazon CloudFront',
      explanation:
        'Amazon CloudFront는 AWS의 CDN(Content Delivery Network) 서비스입니다. 전 세계에 분산된 엣지 로케이션을 통해 콘텐츠를 캐싱하여 사용자에게 더 빠르게 전달하고, DDoS 공격으로부터 보호합니다. CloudWatch는 모니터링 서비스이며, Route 53은 DNS 서비스입니다.',
      playerAnswer: '3) Amazon Route 53',
    },
    ox: {
      isCorrect: true,
      correctAnswer: 'O (맞음)',
      explanation:
        '맞습니다. Amazon S3는 99.999999999%(11 9\'s)의 내구성을 제공합니다. 이는 객체 10,000,000개를 S3에 저장하는 경우 평균적으로 10,000년마다 하나의 객체를 손실할 수 있다는 의미입니다.',
      playerAnswer: 'O (맞음)',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            QuizResult Component Test
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            EPIC-07 Task #19: 퀴즈 결과 UI 컴포넌트
          </p>
        </div>

        {/* Example Selector */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              예시 선택
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveExample('correct')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  activeExample === 'correct'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                정답 예시
              </button>
              <button
                onClick={() => setActiveExample('incorrect')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  activeExample === 'incorrect'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                오답 예시
              </button>
              <button
                onClick={() => setActiveExample('multiple')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  activeExample === 'multiple'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                4지선다
              </button>
              <button
                onClick={() => setActiveExample('ox')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  activeExample === 'ox'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                OX 퀴즈
              </button>
            </div>
          </div>
        </div>

        {/* QuizResult Preview */}
        <div className="mb-8">
          <QuizResult {...examples[activeExample]} />
        </div>

        {/* Component Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            컴포넌트 정보
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                상태:
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {examples[activeExample].isCorrect ? '✅ 정답' : '❌ 오답'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                정답:
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {examples[activeExample].correctAnswer}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                선택한 답:
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {examples[activeExample].playerAnswer}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                해설 길이:
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {examples[activeExample].explanation.length}자
              </span>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            구현된 기능
          </h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              정답/오답 상태 배너 (녹색/빨간색)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              정답 및 선택한 답 표시
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              해설 텍스트 표시 (100-500자)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              페이드인 애니메이션 (Framer Motion)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              접근성 지원 (ARIA labels)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              다크 모드 지원
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              100% 테스트 커버리지 (19/19 tests)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
