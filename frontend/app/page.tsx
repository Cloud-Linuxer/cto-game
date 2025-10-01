'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { gameApi } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGame = async () => {
    try {
      setLoading(true);
      setError(null);

      const gameState = await gameApi.startGame();

      // 게임 페이지로 이동
      router.push(`/game/${gameState.gameId}`);
    } catch (err) {
      console.error('게임 시작 실패:', err);
      setError('게임을 시작할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          AWS 스타트업 타이쿤
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          턴 기반 경영 시뮬레이션 게임
        </p>
        <p className="text-gray-500 max-w-md">
          스타트업 CTO가 되어 비즈니스 의사결정과 AWS 인프라 설계를 동시에 수행하세요.
          <br />
          목표: IPO 성공 (기업가치 1조원, 유저 10만명, 월 매출 3억원)
        </p>

        <div className="mt-12">
          <button
            onClick={handleStartGame}
            disabled={loading}
            className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '게임 시작 중...' : '🚀 새 게임 시작'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          <p>초기 자금: 10,000,000원 | 목표: IPO 달성</p>
          <p className="mt-2">
            <a
              href="http://localhost:3000/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              API 문서 보기
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
