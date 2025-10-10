'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaderboardApi } from '@/lib/api';
import type { LeaderboardEntry, LeaderboardStatistics } from '@/lib/types';

export default function LeaderboardPage() {
  const router = useRouter();
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [recentScores, setRecentScores] = useState<LeaderboardEntry[]>([]);
  const [statistics, setStatistics] = useState<LeaderboardStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'top' | 'recent'>('top');

  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        setLoading(true);

        // 병렬로 데이터 로드
        const [top, recent, stats] = await Promise.all([
          leaderboardApi.getTopScores(20),
          leaderboardApi.getRecentScores(10),
          leaderboardApi.getStatistics(),
        ]);

        setTopScores(top);
        setRecentScores(recent);
        setStatistics(stats);
      } catch (error) {
        console.error('리더보드 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboardData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'NORMAL':
        return 'bg-green-100 text-green-800';
      case 'HARD':
        return 'bg-yellow-100 text-yellow-800';
      case 'EXTREME':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-lg text-gray-600">리더보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-indigo-600 text-white p-6 shadow-lg">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">🏆 리더보드</h1>
              <span className="text-sm opacity-80">AWS 스타트업 타이쿤</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-indigo-700 rounded-lg hover:bg-indigo-800 transition-colors"
              >
                홈으로
              </button>
              <button
                onClick={() => router.push(`/game/${crypto.randomUUID()}`)}
                className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                새 게임 시작
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* 통계 카드 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-sm text-gray-500">총 게임 수</div>
              <div className="text-3xl font-bold text-indigo-600">
                {statistics.totalGames.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-sm text-gray-500">최고 점수</div>
              <div className="text-3xl font-bold text-green-600">
                {statistics.highestScore.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-sm text-gray-500">평균 점수</div>
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(statistics.averageScore).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-sm text-gray-500">평균 달성 턴</div>
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(statistics.averageTurn)}턴
              </div>
            </div>
          </div>
        )}

        {/* 탭 선택 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('top')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'top'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🥇 Top 20
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'recent'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🕐 최근 기록
          </button>
        </div>

        {/* 리더보드 테이블 */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    플레이어
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    점수
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    턴
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유저 수
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    자금
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    신뢰도
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    팀 규모
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    난이도
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    달성일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeTab === 'top' ? topScores : recentScores).map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index === 0 && activeTab === 'top' ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {activeTab === 'top' && (
                          <span className="text-lg font-bold text-gray-900">
                            {index === 0 && '🥇'}
                            {index === 1 && '🥈'}
                            {index === 2 && '🥉'}
                            {index > 2 && `${index + 1}`}
                          </span>
                        )}
                        {activeTab === 'recent' && (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.playerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-indigo-600">
                        {entry.score.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{entry.finalTurn}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {entry.finalUsers.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {new Intl.NumberFormat('ko-KR', {
                          style: 'currency',
                          currency: 'KRW',
                          maximumFractionDigits: 0,
                        }).format(entry.finalCash)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{entry.finalTrust}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{entry.teamSize}명</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getDifficultyBadgeColor(
                          entry.difficulty
                        )}`}
                      >
                        {entry.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-xs text-gray-500">{formatDate(entry.achievedAt)}</div>
                    </td>
                  </tr>
                ))}
                {(activeTab === 'top' ? topScores : recentScores).length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      아직 기록이 없습니다. 첫 번째 도전자가 되어보세요!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 점수 계산 방식 설명 */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 shadow-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 점수 계산 방식</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">유저 수</span>
                <span className="ml-2 text-gray-600">: 1명당 1점</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">자금</span>
                <span className="ml-2 text-gray-600">: 1만원당 1점</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">🛡️</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">신뢰도</span>
                <span className="ml-2 text-gray-600">: 1%당 1,000점</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
              <div className="text-sm text-gray-600">
                <strong>총 점수 = 유저수 + (자금 ÷ 10,000) + (신뢰도 × 1,000)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}