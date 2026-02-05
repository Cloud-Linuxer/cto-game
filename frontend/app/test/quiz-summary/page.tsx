'use client';

/**
 * QuizSummary Test Page
 *
 * Visual testing page for QuizSummary component
 */

import React, { useState } from 'react';
import { QuizSummary, QuizHistoryItem } from '@/components/QuizPopup';

const testCases = {
  perfect: {
    name: '완벽한 점수 (100%)',
    quizHistory: [
      {
        quizId: 'quiz-1',
        question: 'EC2 인스턴스의 기본 가격 모델은?',
        difficulty: 'EASY' as const,
        isCorrect: true,
        playerAnswer: '온디맨드',
        correctAnswer: '온디맨드',
      },
      {
        quizId: 'quiz-2',
        question: 'Aurora는 몇 개의 AZ에 데이터를 복제하나요?',
        difficulty: 'MEDIUM' as const,
        isCorrect: true,
        playerAnswer: '3개',
        correctAnswer: '3개',
      },
      {
        quizId: 'quiz-3',
        question: 'EKS의 컨트롤 플레인은 몇 개의 AZ에서 실행되나요?',
        difficulty: 'HARD' as const,
        isCorrect: true,
        playerAnswer: '3개',
        correctAnswer: '3개',
      },
    ],
    correctCount: 3,
    totalCount: 3,
    bonusScore: 50,
  },
  mixed: {
    name: '혼합 결과 (60%)',
    quizHistory: [
      {
        quizId: 'quiz-1',
        question: 'S3 스토리지 클래스 중 가장 저렴한 것은?',
        difficulty: 'EASY' as const,
        isCorrect: true,
        playerAnswer: 'Glacier Deep Archive',
        correctAnswer: 'Glacier Deep Archive',
      },
      {
        quizId: 'quiz-2',
        question: 'Lambda의 최대 실행 시간은?',
        difficulty: 'MEDIUM' as const,
        isCorrect: false,
        playerAnswer: '5분',
        correctAnswer: '15분',
      },
      {
        quizId: 'quiz-3',
        question: 'DynamoDB의 기본 읽기 일관성 모델은?',
        difficulty: 'EASY' as const,
        isCorrect: true,
        playerAnswer: 'Eventually Consistent',
        correctAnswer: 'Eventually Consistent',
      },
      {
        quizId: 'quiz-4',
        question: 'VPC에서 인터넷 게이트웨이는 몇 개의 AZ에 배치되나요?',
        difficulty: 'HARD' as const,
        isCorrect: false,
        playerAnswer: '1개',
        correctAnswer: '리전 전체',
      },
      {
        quizId: 'quiz-5',
        question: 'CloudFront의 기본 TTL은?',
        difficulty: 'MEDIUM' as const,
        isCorrect: true,
        playerAnswer: '24시간',
        correctAnswer: '24시간',
      },
    ],
    correctCount: 3,
    totalCount: 5,
    bonusScore: 30,
  },
  poor: {
    name: '낮은 점수 (20%)',
    quizHistory: [
      {
        quizId: 'quiz-1',
        question: 'RDS 백업의 최대 보관 기간은?',
        difficulty: 'EASY' as const,
        isCorrect: false,
        playerAnswer: '7일',
        correctAnswer: '35일',
      },
      {
        quizId: 'quiz-2',
        question: 'ECS Fargate의 최대 CPU는?',
        difficulty: 'MEDIUM' as const,
        isCorrect: false,
        playerAnswer: '8 vCPU',
        correctAnswer: '16 vCPU',
      },
      {
        quizId: 'quiz-3',
        question: 'Route 53의 헬스 체크 최소 간격은?',
        difficulty: 'HARD' as const,
        isCorrect: false,
        playerAnswer: '10초',
        correctAnswer: '30초',
      },
      {
        quizId: 'quiz-4',
        question: 'SNS는 몇 개의 프로토콜을 지원하나요?',
        difficulty: 'MEDIUM' as const,
        isCorrect: true,
        playerAnswer: '6개',
        correctAnswer: '6개',
      },
      {
        quizId: 'quiz-5',
        question: 'S3 Standard-IA의 최소 스토리지 기간은?',
        difficulty: 'EASY' as const,
        isCorrect: false,
        playerAnswer: '7일',
        correctAnswer: '30일',
      },
    ],
    correctCount: 1,
    totalCount: 5,
    bonusScore: 10,
  },
  empty: {
    name: '빈 퀴즈',
    quizHistory: [],
    correctCount: 0,
    totalCount: 0,
    bonusScore: 0,
  },
  many: {
    name: '많은 퀴즈 (12개)',
    quizHistory: Array.from({ length: 12 }, (_, i) => ({
      quizId: `quiz-${i + 1}`,
      question: `퀴즈 질문 #${i + 1}: AWS 서비스에 대한 질문입니다.`,
      difficulty: (['EASY', 'MEDIUM', 'HARD'] as const)[i % 3],
      isCorrect: i % 2 === 0,
      playerAnswer: `답변 ${i + 1}`,
      correctAnswer: i % 2 === 0 ? `답변 ${i + 1}` : `정답 ${i + 1}`,
    })),
    correctCount: 6,
    totalCount: 12,
    bonusScore: 35,
  },
};

export default function QuizSummaryTestPage() {
  const [selectedCase, setSelectedCase] = useState<keyof typeof testCases>('mixed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            QuizSummary 컴포넌트 테스트
          </h1>
          <p className="text-gray-600">
            다양한 시나리오에서 QuizSummary 컴포넌트의 동작을 확인합니다.
          </p>
        </div>

        {/* Test Case Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">테스트 케이스 선택</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(testCases).map(([key, testCase]) => (
              <button
                key={key}
                onClick={() => setSelectedCase(key as keyof typeof testCases)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCase === key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {testCase.name}
              </button>
            ))}
          </div>

          {/* Current Case Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-semibold text-blue-800 mb-2">
              현재 선택: {testCases[selectedCase].name}
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <div>총 퀴즈 수: {testCases[selectedCase].totalCount}개</div>
              <div>정답 수: {testCases[selectedCase].correctCount}개</div>
              <div>보너스 점수: {testCases[selectedCase].bonusScore}점</div>
              <div>
                정확도:{' '}
                {testCases[selectedCase].totalCount > 0
                  ? (
                      (testCases[selectedCase].correctCount /
                        testCases[selectedCase].totalCount) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>

        {/* Component Preview */}
        <div>
          <QuizSummary
            quizHistory={testCases[selectedCase].quizHistory}
            correctCount={testCases[selectedCase].correctCount}
            totalCount={testCases[selectedCase].totalCount}
            bonusScore={testCases[selectedCase].bonusScore}
          />
        </div>

        {/* Implementation Notes */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">구현 노트</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-semibold">정확도 등급:</span>
              <ul className="ml-6 mt-1 list-disc space-y-1">
                <li>90%+ → 최고 (녹색 🏆)</li>
                <li>75-89% → 우수 (파란색 ⭐)</li>
                <li>60-74% → 양호 (노란색 👍)</li>
                <li>40-59% → 보통 (주황색 📚)</li>
                <li>&lt;40% → 노력 필요 (빨간색 💪)</li>
              </ul>
            </div>
            <div>
              <span className="font-semibold">난이도별 색상:</span>
              <ul className="ml-6 mt-1 list-disc space-y-1">
                <li>EASY: 녹색 🟢</li>
                <li>MEDIUM: 노란색 🟡</li>
                <li>HARD: 빨간색 🔴</li>
              </ul>
            </div>
            <div>
              <span className="font-semibold">주요 기능:</span>
              <ul className="ml-6 mt-1 list-disc space-y-1">
                <li>난이도별 정확도 계산 및 시각화</li>
                <li>개별 퀴즈 결과 목록 (스크롤 가능)</li>
                <li>질문 텍스트 자동 자르기 (60자)</li>
                <li>반응형 디자인 (모바일/데스크톱)</li>
                <li>동기부여 메시지 표시</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
