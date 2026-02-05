'use client';

/**
 * QuizSummary Component
 *
 * 게임 종료 시 전체 퀴즈 결과 요약 표시
 * - 정답/총 문제 수
 * - 정확도 퍼센티지
 * - 보너스 점수
 * - 난이도별 결과 분석
 * - 개별 퀴즈 결과 목록
 */

import React, { useMemo } from 'react';

export interface QuizHistoryItem {
  quizId: string;
  question: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isCorrect: boolean;
  playerAnswer: string;
  correctAnswer: string;
}

export interface QuizSummaryProps {
  quizHistory: QuizHistoryItem[];
  correctCount: number;
  totalCount: number;
  bonusScore: number;
  className?: string;
}

interface DifficultyStats {
  total: number;
  correct: number;
  accuracy: number;
}

/**
 * 난이도별 색상 설정
 */
const DIFFICULTY_COLORS = {
  EASY: {
    badge: 'bg-green-100 text-green-700 border-green-300',
    text: 'text-green-600',
    icon: '🟢',
    label: '쉬움',
  },
  MEDIUM: {
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    text: 'text-yellow-600',
    icon: '🟡',
    label: '보통',
  },
  HARD: {
    badge: 'bg-red-100 text-red-700 border-red-300',
    text: 'text-red-600',
    icon: '🔴',
    label: '어려움',
  },
} as const;

/**
 * QuizSummary 컴포넌트
 */
const QuizSummary: React.FC<QuizSummaryProps> = ({
  quizHistory,
  correctCount,
  totalCount,
  bonusScore,
  className = '',
}) => {
  // 정확도 계산
  const accuracy = useMemo(() => {
    if (totalCount === 0) return 0;
    return (correctCount / totalCount) * 100;
  }, [correctCount, totalCount]);

  // 난이도별 통계 계산
  const difficultyStats = useMemo(() => {
    const stats: Record<string, DifficultyStats> = {
      EASY: { total: 0, correct: 0, accuracy: 0 },
      MEDIUM: { total: 0, correct: 0, accuracy: 0 },
      HARD: { total: 0, correct: 0, accuracy: 0 },
    };

    quizHistory.forEach((quiz) => {
      const difficulty = quiz.difficulty;
      stats[difficulty].total++;
      if (quiz.isCorrect) {
        stats[difficulty].correct++;
      }
    });

    // 정확도 계산
    Object.keys(stats).forEach((key) => {
      const stat = stats[key];
      stat.accuracy = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
    });

    return stats;
  }, [quizHistory]);

  // 정확도 등급 계산
  const accuracyGrade = useMemo(() => {
    if (accuracy >= 90) return { label: '최고', color: 'text-green-600', emoji: '🏆' };
    if (accuracy >= 75) return { label: '우수', color: 'text-blue-600', emoji: '⭐' };
    if (accuracy >= 60) return { label: '양호', color: 'text-yellow-600', emoji: '👍' };
    if (accuracy >= 40) return { label: '보통', color: 'text-orange-600', emoji: '📚' };
    return { label: '노력 필요', color: 'text-red-600', emoji: '💪' };
  }, [accuracy]);

  // 질문 텍스트 자르기 (최대 60자)
  const truncateQuestion = (question: string, maxLength: number = 60): string => {
    if (question.length <= maxLength) return question;
    return question.substring(0, maxLength) + '...';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header Section */}
      <div className="border-b-2 border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📊 퀴즈 결과 요약
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 정답 개수 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">정답 수</div>
            <div className="text-3xl font-bold text-blue-600">
              {correctCount} <span className="text-lg text-gray-500">/ {totalCount}</span>
            </div>
          </div>

          {/* 정확도 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-gray-600 mb-1">정확도</div>
            <div className={`text-3xl font-bold ${accuracyGrade.color} flex items-center gap-2`}>
              {accuracy.toFixed(1)}%
              <span className="text-2xl">{accuracyGrade.emoji}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{accuracyGrade.label}</div>
          </div>

          {/* 보너스 점수 */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-gray-600 mb-1">보너스 점수</div>
            <div className="text-3xl font-bold text-green-600">
              +{bonusScore}
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          🎯 난이도별 분석
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['EASY', 'MEDIUM', 'HARD'] as const).map((difficulty) => {
            const stats = difficultyStats[difficulty];
            const config = DIFFICULTY_COLORS[difficulty];

            return (
              <div
                key={difficulty}
                className={`rounded-lg p-4 border ${config.badge}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{config.icon}</span>
                  <span className="font-semibold">{config.label}</span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm">
                    정답: <span className="font-bold">{stats.correct}</span> / {stats.total}
                  </div>
                  {stats.total > 0 && (
                    <div className="text-sm">
                      정확도: <span className="font-bold">{stats.accuracy.toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {stats.total > 0 && (
                  <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        difficulty === 'EASY'
                          ? 'bg-green-500'
                          : difficulty === 'MEDIUM'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${stats.accuracy}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiz List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          📝 퀴즈 상세 결과
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {quizHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              퀴즈 기록이 없습니다.
            </div>
          ) : (
            quizHistory.map((quiz, index) => {
              const config = DIFFICULTY_COLORS[quiz.difficulty];

              return (
                <div
                  key={quiz.quizId}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                    quiz.isCorrect
                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                      : 'bg-red-50 border-red-200 hover:bg-red-100'
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-2xl">
                      {quiz.isCorrect ? '✅' : '❌'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        #{index + 1}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>

                    <div className="text-sm text-gray-800 mb-1">
                      {truncateQuestion(quiz.question)}
                    </div>

                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>
                        선택: <span className={quiz.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {quiz.playerAnswer}
                        </span>
                      </div>
                      {!quiz.isCorrect && (
                        <div>
                          정답: <span className="text-green-600 font-semibold">
                            {quiz.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Summary Message */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className={`text-center text-sm ${accuracyGrade.color} font-medium`}>
          {accuracy >= 90 && '놀라운 성과입니다! 퀴즈 마스터입니다! 🎉'}
          {accuracy >= 75 && accuracy < 90 && '훌륭합니다! AWS 지식이 뛰어나시네요! 🌟'}
          {accuracy >= 60 && accuracy < 75 && '잘 하셨습니다! 계속 학습하세요! 👏'}
          {accuracy >= 40 && accuracy < 60 && '좋은 시작입니다! 조금 더 공부해보세요! 📖'}
          {accuracy < 40 && '괜찮습니다! 다시 도전하면 더 잘할 수 있어요! 💪'}
        </div>
      </div>
    </div>
  );
};

export default QuizSummary;
