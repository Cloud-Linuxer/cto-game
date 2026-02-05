'use client';

import { useEffect, useReducer } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { gameApi, leaderboardApi } from '@/lib/api';
import type { GameState, Turn } from '@/lib/types';
import { GameStatus, VICTORY_PATH_INFO } from '@/lib/types';
import MetricsPanel from '@/components/MetricsPanel';
import CompactMetricsBar from '@/components/CompactMetricsBar';
import StoryPanel from '@/components/StoryPanel';
import InfraList from '@/components/InfraList';
import TeamPanel from '@/components/TeamPanel';
import GameSkeleton from '@/components/GameSkeleton';
import EmergencyEventModal from '@/components/EmergencyEventModal';
import EventPopup from '@/components/EventPopup/EventPopupLazy';
import { useEventPopup } from '@/hooks/useEventPopup';
import { QuizPopup, QuizSummary } from '@/components/QuizPopup';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  setCurrentQuiz,
  selectAnswer,
  submitAnswer,
  closeQuiz,
  addToHistory,
  updateQuizBonus,
  selectIsQuizActive,
  selectCurrentQuiz,
  selectSelectedAnswer,
  selectHasSubmitted,
  selectIsCorrect,
  selectQuizHistory,
  selectCorrectCount,
  selectQuizBonus,
} from '@/store/slices/quizSlice';

// -- State & Reducer definitions --

interface GamePageState {
  gameState: GameState | null;
  currentTurn: Turn | null;
  loading: boolean;
  executing: boolean;
  error: string | null;
  modals: {
    emergency: boolean;
    investmentFailed: boolean;
    capacityExceeded: boolean;
    consulting: boolean;
    nameInput: boolean;
    recovery: boolean;
  };
  messages: {
    investmentFailure: string;
    capacityExceeded: string;
    consulting: string;
    recovery: string;
  };
  playerName: string;
  submittingScore: boolean;
  playerRank: number | null;
}

type GamePageAction =
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_CURRENT_TURN'; payload: Turn | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EXECUTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SHOW_MODAL'; modal: keyof GamePageState['modals']; message?: string }
  | { type: 'HIDE_MODAL'; modal: keyof GamePageState['modals'] }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'SET_SUBMITTING_SCORE'; payload: boolean }
  | { type: 'SET_PLAYER_RANK'; payload: number | null }
  | { type: 'GAME_LOADED'; gameState: GameState; turn: Turn };

const messageKeyForModal: Partial<Record<keyof GamePageState['modals'], keyof GamePageState['messages']>> = {
  investmentFailed: 'investmentFailure',
  capacityExceeded: 'capacityExceeded',
  consulting: 'consulting',
  recovery: 'recovery',
};

function gamePageReducer(state: GamePageState, action: GamePageAction): GamePageState {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };
    case 'SET_CURRENT_TURN':
      return { ...state, currentTurn: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_EXECUTING':
      return { ...state, executing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SHOW_MODAL': {
      const msgKey = messageKeyForModal[action.modal];
      return {
        ...state,
        modals: { ...state.modals, [action.modal]: true },
        messages: msgKey && action.message
          ? { ...state.messages, [msgKey]: action.message }
          : state.messages,
      };
    }
    case 'HIDE_MODAL':
      return { ...state, modals: { ...state.modals, [action.modal]: false } };
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };
    case 'SET_SUBMITTING_SCORE':
      return { ...state, submittingScore: action.payload };
    case 'SET_PLAYER_RANK':
      return { ...state, playerRank: action.payload };
    case 'GAME_LOADED':
      return { ...state, gameState: action.gameState, currentTurn: action.turn, loading: false, error: null };
    default:
      return state;
  }
}

const initialState: GamePageState = {
  gameState: null,
  currentTurn: null,
  loading: true,
  executing: false,
  error: null,
  modals: {
    emergency: false,
    investmentFailed: false,
    capacityExceeded: false,
    consulting: false,
    nameInput: false,
    recovery: false,
  },
  messages: {
    investmentFailure: '',
    capacityExceeded: '',
    consulting: '',
    recovery: '',
  },
  playerName: '',
  submittingScore: false,
  playerRank: null,
};

// -- Component --

export default function GameBoard() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [state, dispatch] = useReducer(gamePageReducer, initialState);
  const reduxDispatch = useAppDispatch();

  // EventPopup 훅
  const {
    currentEvent,
    isOpen: isEventPopupOpen,
    isProcessing: isEventProcessing,
    error: eventError,
    openPopup: openEventPopup,
    handleSelectChoice: handleEventChoice,
  } = useEventPopup(gameId);

  // Quiz state
  const isQuizActive = useAppSelector(selectIsQuizActive);
  const currentQuiz = useAppSelector(selectCurrentQuiz);
  const selectedAnswer = useAppSelector(selectSelectedAnswer);
  const hasSubmitted = useAppSelector(selectHasSubmitted);
  const isCorrect = useAppSelector(selectIsCorrect);
  const quizHistory = useAppSelector(selectQuizHistory);
  const correctQuizCount = useAppSelector(selectCorrectCount);
  const quizBonus = useAppSelector(selectQuizBonus);

  // 초기 데이터 로드
  useEffect(() => {
    const loadGameData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        const game = await gameApi.getGame(gameId);
        const turn = await gameApi.getTurn(game.currentTurn);

        dispatch({ type: 'GAME_LOADED', gameState: game, turn });

        // 긴급 이벤트 감지 (턴 번호가 888-890 범위)
        const isEmergencyEvent = game.currentTurn >= 888 && game.currentTurn <= 890;
        if (isEmergencyEvent) {
          dispatch({ type: 'SHOW_MODAL', modal: 'emergency' });
        }

        // Check for quiz at current turn
        await checkForQuiz();
      } catch {
        dispatch({ type: 'SET_ERROR', payload: '게임 데이터를 불러올 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    if (gameId) {
      loadGameData();
    }
  }, [gameId]);

  // Check for quiz when turn changes
  useEffect(() => {
    if (state.gameState?.gameId) {
      checkForQuiz();
    }
  }, [state.gameState?.currentTurn]);

  // 랜덤 이벤트 자동 팝업
  useEffect(() => {
    if (state.gameState?.randomEventTriggered && state.gameState.randomEventData) {
      // EventData 타입으로 변환
      const eventData = {
        eventId: state.gameState.randomEventData.eventId,
        eventType: state.gameState.randomEventData.eventType as any,
        eventText: state.gameState.randomEventData.eventText,
        title: state.gameState.randomEventData.title,
        severity: state.gameState.randomEventData.severity,
        choices: state.gameState.randomEventData.choices.map((choice) => ({
          choiceId: choice.choiceId,
          text: choice.text,
          effects: {
            users: choice.effects.usersDelta,
            cash: choice.effects.cashDelta,
            trust: choice.effects.trustDelta,
            infra: choice.effects.addInfrastructure || [],
          },
        })),
      };
      openEventPopup(eventData);
    }
  }, [state.gameState?.randomEventTriggered, state.gameState?.randomEventData, openEventPopup]);

  // Quiz check after choice execution
  const checkForQuiz = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/game/${gameId}/quiz/next`);

      if (response.status === 204) {
        // No quiz for this turn
        return;
      }

      if (response.ok) {
        const quiz = await response.json();
        reduxDispatch(setCurrentQuiz(quiz));
      }
    } catch (error) {
      console.error('Quiz check failed:', error);
    }
  };

  // 선택 실행
  const handleChoiceSelect = async (choiceId: number | number[]) => {
    if (!state.gameState || state.executing) return;

    try {
      dispatch({ type: 'SET_EXECUTING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // 선택 실행
      const updatedGame = await gameApi.executeChoice(gameId, choiceId);
      dispatch({ type: 'SET_GAME_STATE', payload: updatedGame });

      // Check for quiz at new turn
      await checkForQuiz();

      // 투자 실패 체크
      if (updatedGame.investmentFailed) {
        dispatch({
          type: 'SHOW_MODAL',
          modal: 'investmentFailed',
          message: updatedGame.investmentFailureMessage || '투자에 실패하였습니다.',
        });
      }

      // 용량 초과 체크
      if (updatedGame.capacityExceeded) {
        dispatch({
          type: 'SHOW_MODAL',
          modal: 'capacityExceeded',
          message: updatedGame.capacityExceededMessage || '인프라 용량을 초과하였습니다.',
        });
      }

      // 컨설팅 메시지 체크
      if (updatedGame.consultingMessage) {
        dispatch({
          type: 'SHOW_MODAL',
          modal: 'consulting',
          message: updatedGame.consultingMessage,
        });
      }

      // 회복/복원 메시지 체크 - 모달 대신 콘솔 로그로 표시 (너무 자주 뜨지 않도록)
      // if (updatedGame.recoveryMessages && updatedGame.recoveryMessages.length > 0) {
      //   console.log('Recovery:', updatedGame.recoveryMessages.join('\n'));
      // }

      // 게임이 계속 진행 중이면 다음 턴 로드
      if (updatedGame.status === GameStatus.PLAYING) {
        const nextTurn = await gameApi.getTurn(updatedGame.currentTurn);
        dispatch({ type: 'SET_CURRENT_TURN', payload: nextTurn });

        // 긴급 이벤트 감지 (턴 번호가 888-890 범위)
        const isEmergencyEvent = updatedGame.currentTurn >= 888 && updatedGame.currentTurn <= 890;
        if (isEmergencyEvent) {
          dispatch({ type: 'SHOW_MODAL', modal: 'emergency' });
        }
      }
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '선택을 실행할 수 없습니다. 다시 시도해주세요.' });
    } finally {
      dispatch({ type: 'SET_EXECUTING', payload: false });
    }
  };

  // 새 게임 시작
  const handleNewGame = async () => {
    try {
      const newGame = await gameApi.startGame();
      router.push(`/game/${newGame.gameId}`);
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '새 게임을 시작할 수 없습니다.' });
    }
  };

  // Quiz answer handlers
  const handleSelectAnswer = (answer: string) => {
    reduxDispatch(selectAnswer(answer));
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz || !selectedAnswer) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/game/${gameId}/quiz/${currentQuiz.quizId}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: selectedAnswer }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Update quiz state
        reduxDispatch(
          submitAnswer({
            isCorrect: result.isCorrect,
            correctAnswer: result.correctAnswer,
          })
        );

        // Add to history
        reduxDispatch(
          addToHistory({
            quizId: currentQuiz.quizId,
            question: currentQuiz.question,
            difficulty: currentQuiz.difficulty,
            playerAnswer: selectedAnswer,
            correctAnswer: result.correctAnswer,
            isCorrect: result.isCorrect,
            turnNumber: state.gameState?.currentTurn || 0,
          })
        );

        // Update bonus
        if (result.quizBonus !== undefined) {
          reduxDispatch(updateQuizBonus(result.quizBonus));
        }

        // Auto-close after 3 seconds
        setTimeout(() => {
          reduxDispatch(closeQuiz());
        }, 3000);
      }
    } catch (error) {
      console.error('Quiz submission failed:', error);
      dispatch({ type: 'SET_ERROR', payload: '퀴즈 제출에 실패했습니다. 다시 시도해주세요.' });
    }
  };

  const handleCloseQuiz = () => {
    if (hasSubmitted) {
      reduxDispatch(closeQuiz());
    }
  };

  // 로딩 상태
  if (state.loading) {
    return <GameSkeleton />;
  }

  // 에러 상태
  if (state.error && !state.gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl text-red-600">{state.error}</div>
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

  // 승리 시 이름 입력 처리
  const handleScoreSubmit = async () => {
    if (!state.playerName.trim()) return;

    try {
      dispatch({ type: 'SET_SUBMITTING_SCORE', payload: true });
      const result = await leaderboardApi.submitScore(state.playerName, gameId);
      dispatch({ type: 'SET_PLAYER_RANK', payload: result.rank });
      dispatch({ type: 'HIDE_MODAL', modal: 'nameInput' });
    } catch {
      alert('점수 제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      dispatch({ type: 'SET_SUBMITTING_SCORE', payload: false });
    }
  };

  // 게임 종료 상태
  if (state.gameState && state.gameState.status !== GameStatus.PLAYING) {
    const isWon = state.gameState!.status.startsWith('WON_');
    const maxTurns = state.gameState!.maxTurns || 25;

    const getEndMessage = () => {
      switch (state.gameState!.status) {
        case GameStatus.WON_IPO:
          return {
            emoji: '🎉',
            title: 'IPO 성공!',
            message: state.playerRank
              ? `축하합니다! 성공적으로 기업공개를 달성했습니다! 리더보드 ${state.playerRank}위에 등록되었습니다!`
              : '축하합니다! 성공적으로 기업공개를 달성했습니다!',
            color: 'text-green-600',
          };
        case GameStatus.WON_ACQUISITION:
          return {
            emoji: '🤝',
            title: '인수합병 성공!',
            message: state.playerRank
              ? `축하합니다! 대기업에 성공적으로 인수되었습니다! 리더보드 ${state.playerRank}위에 등록되었습니다!`
              : '축하합니다! 대기업에 성공적으로 인수되어 엑싯에 성공했습니다!',
            color: 'text-blue-600',
          };
        case GameStatus.WON_PROFITABILITY:
          return {
            emoji: '💰',
            title: '흑자 전환 성공!',
            message: state.playerRank
              ? `축하합니다! 지속 가능한 수익 모델을 달성했습니다! 리더보드 ${state.playerRank}위에 등록되었습니다!`
              : '축하합니다! 안정적인 수익 모델로 지속 가능한 성장을 이루었습니다!',
            color: 'text-amber-600',
          };
        case GameStatus.WON_TECH_LEADER:
          return {
            emoji: '🔬',
            title: '기술 선도 달성!',
            message: state.playerRank
              ? `축하합니다! 업계 최고의 기술력을 인정받았습니다! 리더보드 ${state.playerRank}위에 등록되었습니다!`
              : '축하합니다! 뛰어난 기술력으로 업계를 선도하게 되었습니다!',
            color: 'text-purple-600',
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
            message: `${maxTurns}턴까지 승리 조건을 달성하지 못해 이사회로부터 해고되었습니다.`,
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
        {/* 승리 시 이름 입력 모달 - 게임 종료 화면 위에 표시 */}
        {state.modals.nameInput && (
          <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
            <div className="bg-gradient-to-br from-yellow-50 to-green-50 border-4 border-green-500 rounded-2xl shadow-2xl p-8 max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className={`text-3xl font-bold mb-2 ${endInfo.color}`}>{endInfo.title}</h2>
                <p className="text-lg text-gray-700">리더보드에 기록을 남겨주세요!</p>
              </div>

              <div className="mb-6">
                <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                  이름을 입력하세요
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={state.playerName}
                  onChange={(e) => dispatch({ type: 'SET_PLAYER_NAME', payload: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleScoreSubmit()}
                  placeholder="플레이어 이름"
                  maxLength={50}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-lg"
                  autoFocus
                />
              </div>

              {state.gameState && (
                <div className="bg-white rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">달성 기록</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">유저 수:</div>
                    <div className="font-semibold">{state.gameState.users.toLocaleString()}명</div>
                    <div className="text-gray-600">자금:</div>
                    <div className="font-semibold">
                      {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(state.gameState.cash)}
                    </div>
                    <div className="text-gray-600">신뢰도:</div>
                    <div className="font-semibold">{state.gameState.trust}%</div>
                    <div className="text-gray-600">달성 턴:</div>
                    <div className="font-semibold">{state.gameState.currentTurn}턴</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleScoreSubmit}
                  disabled={!state.playerName.trim() || state.submittingScore}
                  className="flex-1 px-6 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {state.submittingScore ? '제출 중...' : '리더보드 등록'}
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: 'HIDE_MODAL', modal: 'nameInput' });
                  }}
                  disabled={state.submittingScore}
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
              {/* 등급 카드 */}
              {state.gameState.grade && (
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow col-span-2">
                  <div className="text-sm font-medium text-gray-500 mb-1">최종 등급</div>
                  <div className={`text-4xl font-black ${
                    state.gameState.grade === 'S' ? 'text-yellow-500' :
                    state.gameState.grade === 'A' ? 'text-purple-500' :
                    state.gameState.grade === 'B' ? 'text-blue-500' :
                    state.gameState.grade === 'C' ? 'text-green-500' : 'text-gray-400'
                  }`}>
                    {state.gameState.grade}
                  </div>
                </div>
              )}

              {/* 턴 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">진행 턴</div>
                <div className="text-2xl font-bold text-gray-900">
                  {state.gameState.currentTurn} / {state.gameState.maxTurns || 25}
                </div>
              </div>

              {/* 유저 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">총 유저</div>
                <div className="text-2xl font-bold text-gray-900">
                  {state.gameState.users.toLocaleString()}명
                </div>
              </div>

              {/* 자금 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">보유 자금</div>
                <div className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(state.gameState.cash)}
                </div>
              </div>

              {/* 신뢰도 카드 */}
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-gray-500 mb-1">신뢰도</div>
                <div className="text-2xl font-bold text-gray-900">
                  {state.gameState.trust}%
                </div>
              </div>
            </div>

            {/* 최종 점수 표시 (승리 시) */}
            {isWon && (
              <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="text-sm font-medium text-gray-600 mb-2">최종 점수</div>
                <div className="text-4xl font-black text-gray-900">
                  {(state.gameState.users + Math.floor(state.gameState.cash / 10000) + (state.gameState.trust * 1000)).toLocaleString()}점
                </div>
                {state.gameState.victoryPath && state.gameState.victoryPath !== 'IPO' && (
                  <div className="text-xs text-gray-500 mt-1">
                    승리 경로: {VICTORY_PATH_INFO[state.gameState.victoryPath]?.label}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quiz Summary Section */}
          {quizHistory.length > 0 && (
            <div className="mt-8">
              <QuizSummary
                quizHistory={quizHistory.map((quiz) => ({
                  quizId: quiz.quizId,
                  question: quiz.question,
                  difficulty: quiz.difficulty,
                  isCorrect: quiz.isCorrect,
                  playerAnswer: quiz.playerAnswer,
                  correctAnswer: quiz.correctAnswer,
                }))}
                correctCount={correctQuizCount}
                totalCount={quizHistory.length}
                bonusScore={quizBonus}
              />
            </div>
          )}

          <div className="flex gap-4 justify-center mt-6">
            {isWon && !state.playerRank && (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'SHOW_MODAL', modal: 'nameInput' });
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
  if (!state.gameState || !state.currentTurn) {
    return null;
  }

  return (
    <>
      {/* 긴급 이벤트 모달 */}
      {state.modals.emergency && state.currentTurn && (
        <EmergencyEventModal
          turn={state.currentTurn}
          onClose={() => dispatch({ type: 'HIDE_MODAL', modal: 'emergency' })}
        />
      )}

      {/* 투자 실패 모달 */}
      {state.modals.investmentFailed && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
          <div className="bg-white border-4 border-red-500 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
            <div className="text-6xl mb-4">💸</div>
            <h2 className="text-3xl font-bold text-red-600 mb-4">투자 실패</h2>
            <p className="text-xl text-gray-700 mb-6">
              {state.messages.investmentFailure}
            </p>
            <button
              onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'investmentFailed' })}
              className="px-8 py-3 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 용량 초과 모달 */}
      {state.modals.capacityExceeded && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
          <div className="bg-white border-4 border-orange-500 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-3xl font-bold text-orange-600 mb-4">용량 초과</h2>
            <p className="text-xl text-gray-700 mb-4">
              {state.messages.capacityExceeded}
            </p>
            <p className="text-lg text-orange-600 font-semibold mb-6">
              {state.messages.capacityExceeded}
            </p>
            <button
              onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'capacityExceeded' })}
              className="px-8 py-3 bg-orange-600 text-white text-lg font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 컨설팅 효과 모달 */}
      {state.modals.consulting && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
          <div className="bg-white border-4 border-blue-500 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold text-blue-600">컨설팅 효과 발동!</h2>
            </div>
            <div className="text-lg text-gray-700 whitespace-pre-line mb-6">
              {state.messages.consulting}
            </div>
            <div className="text-center">
              <button
                onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'consulting' })}
                className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 회복/복원 모달 */}
      {state.modals.recovery && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/50 p-4">
          <div className="bg-white border-4 border-teal-500 rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🛡️</div>
              <h2 className="text-3xl font-bold text-teal-600">회복 이벤트</h2>
            </div>
            <div className="text-lg text-gray-700 whitespace-pre-line mb-6">
              {state.messages.recovery}
            </div>
            <div className="text-center">
              <button
                onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'recovery' })}
                className="px-8 py-3 bg-teal-600 text-white text-lg font-semibold rounded-lg hover:bg-teal-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        {/* 모던 헤더 */}
        <header className="relative bg-gradient-to-r from-purple-900 via-indigo-800 to-blue-900 text-white shadow-xl">
          {/* 배경 효과 */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-indigo-600/20"></div>

          <div className="relative z-10 container mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between">
              {/* 로고와 타이틀 */}
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur rounded-xl">
                  <span className="text-2xl">🚀</span>
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    AWS 스타트업 타이쿤
                  </h1>
                  <p className="text-xs text-purple-200 hidden md:block">Turn {state.gameState.currentTurn}/{state.gameState.maxTurns || 25}</p>
                </div>
              </div>

              {/* 우측 버튼 그룹 */}
              <div className="flex items-center gap-2">
                {/* 현재 상태 뱃지 */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-lg">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-purple-200">유저</span>
                    <span className="text-sm font-bold text-white">{state.gameState.users.toLocaleString()}</span>
                  </div>
                  <div className="w-px h-4 bg-white/20"></div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-purple-200">신뢰도</span>
                    <span className="text-sm font-bold text-white">{state.gameState.trust}%</span>
                  </div>
                </div>

                {/* 홈 버튼 */}
                <button
                  onClick={() => router.push('/')}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="hidden md:inline">홈으로</span>
                </button>

                {/* 리더보드 버튼 */}
                <button
                  onClick={() => router.push('/leaderboard')}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden md:inline">리더보드</span>
                </button>
              </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="mt-3 md:hidden">
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-green-400 to-blue-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(state.gameState.currentTurn / (state.gameState.maxTurns || 25)) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-purple-200 mt-1 text-center">Turn {state.gameState.currentTurn} / {state.gameState.maxTurns || 25}</p>
            </div>
          </div>
        </header>

      {/* 에러 메시지 */}
      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
          {state.error}
        </div>
      )}

      {/* 3패널 레이아웃 - 반응형 */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(240px,280px)_1fr_minmax(240px,280px)] gap-0 h-full max-h-screen">
        {/* 모바일: 상단 메트릭 바 */}
        <div className="lg:hidden sticky top-0 z-10">
          <CompactMetricsBar gameState={state.gameState} />
        </div>

        {/* 데스크탑: 좌측 메트릭 패널 */}
        <div className="hidden lg:block overflow-y-auto">
          <MetricsPanel gameState={state.gameState} />
        </div>

        {/* 메인 컨텐츠: 스토리 패널 + 인프라 + 팀 (모바일에서 스크롤) */}
        <div className="flex-1 overflow-y-auto">
          {/* 중앙: 스토리 패널 */}
          <StoryPanel
            turn={state.currentTurn}
            onSelectChoice={handleChoiceSelect}
            onSelectMultipleChoices={handleChoiceSelect}
            disabled={state.executing}
            multiChoiceEnabled={state.gameState.multiChoiceEnabled}
            hiredStaff={state.gameState.hiredStaff}
          />

          {/* 모바일: 인프라 패널 (스크롤 아래) */}
          <div className="lg:hidden">
            <InfraList infrastructure={state.gameState.infrastructure} />
          </div>

          {/* 모바일: 팀 패널 (스크롤 아래) */}
          <div className="lg:hidden">
            <TeamPanel gameState={state.gameState} />
          </div>
        </div>

        {/* 데스크탑: 우측 사이드바 (인프라 + 팀 구성) */}
        <div className="hidden lg:block overflow-y-auto">
          <InfraList infrastructure={state.gameState.infrastructure} />
          <TeamPanel gameState={state.gameState} />
        </div>
      </div>
    </div>

      {/* 랜덤 이벤트 팝업 */}
      {isEventPopupOpen && currentEvent && (
        <EventPopup
          eventData={currentEvent}
          gameId={gameId}
          onSelectChoice={handleEventChoice}
          isProcessing={isEventProcessing}
          error={eventError}
          onComplete={() => {
            // 이벤트 처리 완료 후 게임 상태 새로고침
            if (state.gameState) {
              gameApi.getGame(gameId).then((updatedGame) => {
                dispatch({ type: 'SET_GAME_STATE', payload: updatedGame });
                // 다음 턴 로드
                if (updatedGame.status === GameStatus.PLAYING) {
                  gameApi.getTurn(updatedGame.currentTurn).then((nextTurn) => {
                    dispatch({ type: 'SET_CURRENT_TURN', payload: nextTurn });
                  });
                }
              });
            }
          }}
        />
      )}

      {/* Quiz Popup */}
      <QuizPopup
        isOpen={isQuizActive}
        quiz={currentQuiz}
        selectedAnswer={selectedAnswer}
        hasSubmitted={hasSubmitted}
        isCorrect={isCorrect}
        onSelectAnswer={handleSelectAnswer}
        onSubmit={handleSubmitQuiz}
        onClose={handleCloseQuiz}
      />
    </>
  );
}
