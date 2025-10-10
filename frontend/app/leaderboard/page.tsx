'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaderboardApi, gameApi } from '@/lib/api';
import type { LeaderboardEntry } from '@/lib/types';
import { Trophy, Clock, Users, DollarSign, Shield, Home, Rocket, Award } from 'lucide-react';

export default function LeaderboardPage() {
  const router = useRouter();
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [recentScores, setRecentScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'top' | 'recent'>('top');
  const [startingNewGame, setStartingNewGame] = useState(false);

  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        setLoading(true);

        const [top, recent] = await Promise.all([
          leaderboardApi.getTopScores(20),
          leaderboardApi.getRecentScores(10),
        ]);

        setTopScores(top);
        setRecentScores(recent);
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

  const handleNewGame = async () => {
    try {
      setStartingNewGame(true);
      const newGame = await gameApi.startGame();
      router.push(`/game/${newGame.gameId}`);
    } catch (error) {
      console.error('새 게임 시작 실패:', error);
      alert('새 게임을 시작할 수 없습니다. 다시 시도해주세요.');
    } finally {
      setStartingNewGame(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
          <p className="mt-4 text-lg text-purple-200">리더보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 애니메이션 배경 효과 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-pink-600/10" />
        <div className="absolute top-10 left-10 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-pulse" />
      </div>

      {/* 헤더 */}
      <header className="relative z-20 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              리더보드
            </h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-white/10 backdrop-blur border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>홈으로</span>
            </button>
            <button
              onClick={handleNewGame}
              disabled={startingNewGame}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Rocket className="w-4 h-4" />
              <span>{startingNewGame ? '시작 중...' : '새 게임 시작'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        {/* 탭 선택 */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setActiveTab('top')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'top'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 scale-105'
                : 'bg-white/10 backdrop-blur text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            🥇 Top 20
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'recent'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 scale-105'
                : 'bg-white/10 backdrop-blur text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            🕐 최근 기록
          </button>
        </div>

        {/* 리더보드 테이블 */}
        <div className="bg-black/30 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-purple-500/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-900/30 border-b border-purple-500/20">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    플레이어
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">
                    점수
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-medium text-purple-200 uppercase tracking-wider">
                    턴
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">
                    유저 수
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">
                    자금
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-medium text-purple-200 uppercase tracking-wider">
                    신뢰도
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-medium text-purple-200 uppercase tracking-wider">
                    팀 규모
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-medium text-purple-200 uppercase tracking-wider">
                    달성일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {(activeTab === 'top' ? topScores : recentScores).map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-purple-500/10 transition-colors ${
                      index === 0 && activeTab === 'top' ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {activeTab === 'top' && (
                          <span className="text-lg font-bold">
                            {index === 0 && <span className="text-3xl">🥇</span>}
                            {index === 1 && <span className="text-2xl">🥈</span>}
                            {index === 2 && <span className="text-xl">🥉</span>}
                            {index > 2 && <span className="text-purple-300">{index + 1}</span>}
                          </span>
                        )}
                        {activeTab === 'recent' && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{entry.playerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        {entry.score.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-300">{entry.finalTurn}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">
                        {entry.finalUsers.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">
                        {new Intl.NumberFormat('ko-KR', {
                          style: 'currency',
                          currency: 'KRW',
                          maximumFractionDigits: 0,
                        }).format(entry.finalCash)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-300">{entry.finalTrust}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-300">{entry.teamSize}명</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-xs text-gray-400">{formatDate(entry.achievedAt)}</div>
                    </td>
                  </tr>
                ))}
                {(activeTab === 'top' ? topScores : recentScores).length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      아직 기록이 없습니다. 첫 번째 도전자가 되어보세요!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 점수 계산 방식 - 컴팩트 디자인 */}
        <div className="mt-8 bg-black/30 backdrop-blur-md rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">유저 1명당 <span className="text-blue-400 font-semibold">1점</span></span>
            </div>
            <span className="text-gray-600">•</span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">1만원당 <span className="text-green-400 font-semibold">1점</span></span>
            </div>
            <span className="text-gray-600">•</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">신뢰도 1%당 <span className="text-purple-400 font-semibold">1,000점</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}