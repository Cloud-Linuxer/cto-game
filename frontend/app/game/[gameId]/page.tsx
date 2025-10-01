'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gameApi } from '@/lib/api';
import type { GameState, Turn } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import MetricsPanel from '@/components/MetricsPanel';
import CompactMetricsBar from '@/components/CompactMetricsBar';
import StoryPanel from '@/components/StoryPanel';
import InfraList from '@/components/InfraList';
import GameSkeleton from '@/components/GameSkeleton';
import EmergencyEventModal from '@/components/EmergencyEventModal';

export default function GameBoard() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<Turn | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    const loadGameData = async () => {
      try {
        setLoading(true);
        setError(null);

        const game = await gameApi.getGame(gameId);
        setGameState(game);

        const turn = await gameApi.getTurn(game.currentTurn);
        setCurrentTurn(turn);

        // 긴급 이벤트 감지 (턴 번호가 888-890 범위)
        const isEmergencyEvent = game.currentTurn >= 888 && game.currentTurn <= 890;
        if (isEmergencyEvent) {
          setShowEmergencyModal(true);
        }
      } catch (err) {
        console.error('게임 데이터 로드 실패:', err);
        setError('게임 데이터를 불러올 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      loadGameData();
    }
  }, [gameId]);

  // 선택 실행
  const handleChoiceSelect = async (choiceId: number) => {
    if (!gameState || executing) return;

    try {
      setExecuting(true);
      setError(null);

      // 선택 실행
      const updatedGame = await gameApi.executeChoice(gameId, choiceId);
      setGameState(updatedGame);

      // 게임이 계속 진행 중이면 다음 턴 로드
      if (updatedGame.status === GameStatus.PLAYING) {
        const nextTurn = await gameApi.getTurn(updatedGame.currentTurn);
        setCurrentTurn(nextTurn);

        // 긴급 이벤트 감지 (턴 번호가 888-890 범위)
        const isEmergencyEvent = updatedGame.currentTurn >= 888 && updatedGame.currentTurn <= 890;
        if (isEmergencyEvent) {
          setShowEmergencyModal(true);
        }
      }
    } catch (err) {
      console.error('선택 실행 실패:', err);
      setError('선택을 실행할 수 없습니다. 다시 시도해주세요.');
    } finally {
      setExecuting(false);
    }
  };

  // 새 게임 시작
  const handleNewGame = async () => {
    try {
      const newGame = await gameApi.startGame();
      router.push(`/game/${newGame.gameId}`);
    } catch (err) {
      console.error('새 게임 시작 실패:', err);
      setError('새 게임을 시작할 수 없습니다.');
    }
  };

  // 로딩 상태
  if (loading) {
    return <GameSkeleton />;
  }

  // 에러 상태
  if (error && !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl text-red-600">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 게임 종료 상태
  if (gameState && gameState.status !== GameStatus.PLAYING) {
    const getEndMessage = () => {
      switch (gameState.status) {
        case GameStatus.WON_IPO:
          return {
            emoji: '🎉',
            title: 'IPO 성공!',
            message: '축하합니다! 성공적으로 기업공개를 달성했습니다!',
            color: 'text-green-600',
          };
        case GameStatus.LOST_BANKRUPT:
          return {
            emoji: '💸',
            title: '파산',
            message: '자금이 바닥났습니다. 회사가 파산했습니다.',
            color: 'text-red-600',
          };
        case GameStatus.LOST_OUTAGE:
          return {
            emoji: '🔥',
            title: '서버 장애',
            message: '신뢰도가 너무 낮아 서비스가 중단되었습니다.',
            color: 'text-red-600',
          };
        case GameStatus.LOST_FAILED_IPO:
          return {
            emoji: '📉',
            title: 'IPO 실패',
            message: '목표를 달성하지 못해 IPO에 실패했습니다.',
            color: 'text-red-600',
          };
        default:
          return {
            emoji: '❓',
            title: '게임 종료',
            message: '게임이 종료되었습니다.',
            color: 'text-gray-600',
          };
      }
    };

    const endInfo = getEndMessage();

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-6 p-8 bg-white rounded-2xl shadow-xl max-w-2xl">
          <div className="text-6xl mb-4">{endInfo.emoji}</div>
          <h1 className={`text-4xl font-bold ${endInfo.color}`}>{endInfo.title}</h1>
          <p className="text-xl text-gray-700">{endInfo.message}</p>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">최종 메트릭</h2>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <div className="text-sm text-gray-600">턴</div>
                <div className="text-2xl font-bold">{gameState.currentTurn} / 25</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">유저</div>
                <div className="text-2xl font-bold">{gameState.users.toLocaleString()}명</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">자금</div>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(gameState.cash)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">신뢰도</div>
                <div className="text-2xl font-bold">{gameState.trust}%</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleNewGame}
            className="mt-6 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            🚀 새 게임 시작
          </button>
        </div>
      </div>
    );
  }

  // 게임 진행 중
  if (!gameState || !currentTurn) {
    return null;
  }

  return (
    <>
      {/* 긴급 이벤트 모달 */}
      {showEmergencyModal && currentTurn && (
        <EmergencyEventModal
          turn={currentTurn}
          onClose={() => setShowEmergencyModal(false)}
        />
      )}

      <div className="h-screen flex flex-col bg-gray-100">
        {/* 헤더 */}
        <header className="bg-indigo-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">AWS 스타트업 타이쿤</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-indigo-700 rounded hover:bg-indigo-800 transition-colors"
          >
            홈으로
          </button>
        </div>
      </header>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
          {error}
        </div>
      )}

      {/* 3패널 레이아웃 - 반응형 */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(240px,280px)_1fr_minmax(240px,280px)] gap-0 overflow-hidden">
        {/* 모바일: 상단 메트릭 바 */}
        <div className="lg:hidden sticky top-0 z-10">
          <CompactMetricsBar gameState={gameState} />
        </div>

        {/* 데스크탑: 좌측 메트릭 패널 */}
        <div className="hidden lg:block">
          <MetricsPanel gameState={gameState} />
        </div>

        {/* 중앙: 스토리 패널 */}
        <StoryPanel
          turn={currentTurn}
          onSelectChoice={handleChoiceSelect}
          disabled={executing}
        />

        {/* 우측: 인프라 패널 */}
        <InfraList infrastructure={gameState.infrastructure} />
      </div>
    </div>
    </>
  );
}
