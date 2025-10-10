'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gameApi, leaderboardApi } from '@/lib/api';
import type { GameState, Turn } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import MetricsPanel from '@/components/MetricsPanel';
import CompactMetricsBar from '@/components/CompactMetricsBar';
import StoryPanel from '@/components/StoryPanel';
import InfraList from '@/components/InfraList';
import TeamPanel from '@/components/TeamPanel';
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
  const [showInvestmentFailedModal, setShowInvestmentFailedModal] = useState(false);
  const [investmentFailureMessage, setInvestmentFailureMessage] = useState('');
  const [showCapacityExceededModal, setShowCapacityExceededModal] = useState(false);
  const [capacityExceededMessage, setCapacityExceededMessage] = useState('');
  const [showConsultingModal, setShowConsultingModal] = useState(false);
  const [consultingMessage, setConsultingMessage] = useState('');
  const [showNameInputModal, setShowNameInputModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

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

  // IPO 성공 시 이름 입력 모달 표시 (자동으로 한 번만)
  useEffect(() => {
    if (gameState && gameState.status === GameStatus.WON_IPO && !playerRank) {
      console.log('[Auto-show modal] IPO success detected');
      // 자동으로 모달 표시는 제거 - 사용자가 버튼을 클릭할 때만 표시
    }
  }, [gameState?.status, playerRank]);

  // 선택 실행
  const handleChoiceSelect = async (choiceId: number | number[]) => {
    if (!gameState || executing) return;

    try {
      setExecuting(true);
      setError(null);

      // 선택 실행
      const updatedGame = await gameApi.executeChoice(gameId, choiceId);
      setGameState(updatedGame);

      // 성공 시 에러 메시지 제거
      setError(null);

      // 투자 실패 체크
      if ((updatedGame as any).investmentFailed) {
        setInvestmentFailureMessage((updatedGame as any).investmentFailureMessage || '투자에 실패하였습니다.');
        setShowInvestmentFailedModal(true);
      }

      // 용량 초과 체크
      if ((updatedGame as any).capacityExceeded) {
        setCapacityExceededMessage((updatedGame as any).capacityExceededMessage || '인프라 용량을 초과하였습니다.');
        setShowCapacityExceededModal(true);
      }

      // 컨설팅 메시지 체크
      console.log('[Frontend] Choice executed - consultingMessage:', updatedGame.consultingMessage);
      if (updatedGame.consultingMessage) {
        setConsultingMessage(updatedGame.consultingMessage);
        setShowConsultingModal(true);
      }

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

  // IPO 성공 시 이름 입력 처리
  const handleScoreSubmit = async () => {
    if (!playerName.trim()) return;

    try {
      setSubmittingScore(true);
      const result = await leaderboardApi.submitScore(playerName, gameId);
      setPlayerRank(result.rank);
      setShowNameInputModal(false);
    } catch (error) {
      console.error('점수 제출 실패:', error);
      alert('점수 제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmittingScore(false);
    }
  };

  // 게임 종료 상태
  if (gameState && gameState.status !== GameStatus.PLAYING) {
    const getEndMessage = () => {
      switch (gameState.status) {
        case GameStatus.WON_IPO:
          return {
            emoji: '🎉',
            title: 'IPO 성공!',
            message: playerRank
              ? `축하합니다! 성공적으로 기업공개를 달성했습니다! 리더보드 ${playerRank}위에 등록되었습니다!`
              : '축하합니다! 성공적으로 기업공개를 달성했습니다!',
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
        case GameStatus.LOST_FIRED_CTO:
          return {
            emoji: '🚪',
            title: 'CTO 해고',
            message: '25턴까지 IPO 목표를 달성하지 못해 이사회로부터 해고되었습니다.',
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
      <>
        {/* IPO 성공 시 이름 입력 모달 - 게임 종료 화면 위에 표시 */}
        {showNameInputModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
            <div className="bg-gradient-to-br from-yellow-50 to-green-50 border-4 border-green-500 rounded-2xl shadow-2xl p-8 max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-bold text-green-600 mb-2">IPO 성공!</h2>
                <p className="text-lg text-gray-700">리더보드에 기록을 남겨주세요!</p>
              </div>

              <div className="mb-6">
                <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                  이름을 입력하세요
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScoreSubmit()}
                  placeholder="플레이어 이름"
                  maxLength={50}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-lg"
                  autoFocus
                />
              </div>

              {gameState && (
                <div className="bg-white rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">달성 기록</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">유저 수:</div>
                    <div className="font-semibold">{gameState.users.toLocaleString()}명</div>
                    <div className="text-gray-600">자금:</div>
                    <div className="font-semibold">
                      {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(gameState.cash)}
                    </div>
                    <div className="text-gray-600">신뢰도:</div>
                    <div className="font-semibold">{gameState.trust}%</div>
                    <div className="text-gray-600">달성 턴:</div>
                    <div className="font-semibold">{gameState.currentTurn}턴</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleScoreSubmit}
                  disabled={!playerName.trim() || submittingScore}
                  className="flex-1 px-6 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submittingScore ? '제출 중...' : '리더보드 등록'}
                </button>
                <button
                  onClick={() => {
                    setShowNameInputModal(false);
                  }}
                  disabled={submittingScore}
                  className="px-6 py-3 bg-gray-500 text-white text-lg font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:cursor-not-allowed"
                >
                  건너뛰기
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700">
        <div className="text-center space-y-6 p-10 bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl max-w-3xl border border-white/20">
          {/* 상단 타이틀 섹션 */}
          <div className="mb-6">
            <div className="text-7xl mb-4 animate-bounce">{endInfo.emoji}</div>
            <h1 className={`text-5xl font-black ${endInfo.color} mb-3`}>{endInfo.title}</h1>
            <p className="text-xl text-gray-700 font-medium">{endInfo.message}</p>
          </div>

          {/* 최종 메트릭 - 깔끔하고 세련된 스타일 */}
          <div className="mt-8 p-8 bg-gray-50 rounded-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              최종 성과
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* 턴 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">진행 턴</div>
                <div className="text-2xl font-bold text-gray-900">
                  {gameState.currentTurn} / 25
                </div>
              </div>

              {/* 유저 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">총 유저</div>
                <div className="text-2xl font-bold text-gray-900">
                  {gameState.users.toLocaleString()}명
                </div>
              </div>

              {/* 자금 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">보유 자금</div>
                <div className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(gameState.cash)}
                </div>
              </div>

              {/* 신뢰도 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">신뢰도</div>
                <div className="text-2xl font-bold text-gray-900">
                  {gameState.trust}%
                </div>
              </div>
            </div>

            {/* 최종 점수 표시 (IPO 성공 시) */}
            {gameState.status === GameStatus.WON_IPO && (
              <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="text-sm font-medium text-gray-600 mb-2">최종 점수</div>
                <div className="text-4xl font-black text-gray-900">
                  {(gameState.users + Math.floor(gameState.cash / 10000) + (gameState.trust * 1000)).toLocaleString()}점
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-center mt-6">
            {gameState.status === GameStatus.WON_IPO && !playerRank && (
              <button
                type="button"
                onClick={() => {
                  console.log('[Debug] Score button clicked');
                  // Force state update
                  setShowNameInputModal(prev => {
                    console.log('[Debug] Previous state:', prev, '-> New state: true');
                    return true;
                  });
                }}
                className="px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors animate-pulse"
              >
                📝 점수 기록하기
              </button>
            )}
            <button
              onClick={handleNewGame}
              className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              🚀 새 게임 시작
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              🏆 리더보드 보기
            </button>
          </div>
        </div>
      </div>
      </>
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

      {/* 투자 실패 모달 */}
      {showInvestmentFailedModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
          <div className="bg-white border-4 border-red-500 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
            <div className="text-6xl mb-4">💸</div>
            <h2 className="text-3xl font-bold text-red-600 mb-4">투자 실패</h2>
            <p className="text-xl text-gray-700 mb-6">
              {investmentFailureMessage}
            </p>
            <button
              onClick={() => setShowInvestmentFailedModal(false)}
              className="px-8 py-3 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 용량 초과 모달 */}
      {showCapacityExceededModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
          <div className="bg-white border-4 border-orange-500 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-3xl font-bold text-orange-600 mb-4">용량 초과</h2>
            <p className="text-xl text-gray-700 mb-4">
              {capacityExceededMessage}
            </p>
            <p className="text-lg text-orange-600 font-semibold mb-6">
              신뢰도 -10%
            </p>
            <button
              onClick={() => setShowCapacityExceededModal(false)}
              className="px-8 py-3 bg-orange-600 text-white text-lg font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 컨설팅 효과 모달 */}
      {showConsultingModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
          <div className="bg-white border-4 border-blue-500 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold text-blue-600">컨설팅 효과 발동!</h2>
            </div>
            <div className="text-lg text-gray-700 whitespace-pre-line mb-6">
              {consultingMessage}
            </div>
            <div className="text-center">
              <button
                onClick={() => setShowConsultingModal(false)}
                className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
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

        {/* 메인 컨텐츠: 스토리 패널 + 인프라 + 팀 (모바일에서 스크롤) */}
        <div className="flex-1 overflow-y-auto">
          {/* 중앙: 스토리 패널 */}
          <StoryPanel
            turn={currentTurn}
            onSelectChoice={handleChoiceSelect}
            disabled={executing}
            multiChoiceEnabled={gameState.multiChoiceEnabled}
            hiredStaff={gameState.hiredStaff}
          />

          {/* 모바일: 인프라 패널 (스크롤 아래) */}
          <div className="lg:hidden">
            <InfraList infrastructure={gameState.infrastructure} />
          </div>

          {/* 모바일: 팀 패널 (스크롤 아래) */}
          <div className="lg:hidden">
            <TeamPanel gameState={gameState} />
          </div>
        </div>

        {/* 데스크탑: 우측 사이드바 (인프라 + 팀 구성) */}
        <div className="hidden lg:block overflow-y-auto">
          <InfraList infrastructure={gameState.infrastructure} />
          <TeamPanel gameState={gameState} />
        </div>
      </div>
    </div>
    </>
  );
}
