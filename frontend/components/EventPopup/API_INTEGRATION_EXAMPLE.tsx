/**
 * EventPopup API Integration Example
 *
 * Shows how to use EventPopup with RTK Query API
 */

'use client';

import React, { useEffect } from 'react';
import EventPopup from './EventPopup';
import { useEventPopup } from '@/hooks/useEventPopup';
import { useGetGameQuery } from '@/store/api/gameApi';

/**
 * Example: Game Page with Event Popup
 */
export default function GamePageExample({ gameId }: { gameId: string }) {
  // Get game state with RTK Query
  const {
    data: gameState,
    isLoading: isLoadingGame,
    error: gameError,
  } = useGetGameQuery(gameId, {
    pollingInterval: 0, // Disable polling (update via mutations)
    refetchOnMountOrArgChange: true,
  });

  // Get event popup state and actions
  const {
    currentEvent,
    isOpen,
    isProcessing,
    error: eventError,
    openPopup,
    handleSelectChoice,
  } = useEventPopup(gameId);

  /**
   * Automatically open popup when event is triggered
   */
  useEffect(() => {
    if (gameState?.randomEventTriggered && gameState.randomEventData) {
      openPopup(gameState.randomEventData);
    }
  }, [gameState?.randomEventTriggered, gameState?.randomEventData, openPopup]);

  /**
   * Render loading state
   */
  if (isLoadingGame) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-lg text-slate-600 dark:text-slate-400">게임 로딩 중...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (gameError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-lg text-red-600">게임을 불러올 수 없습니다</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render game UI with event popup
   */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Game UI */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">
          AWS 스타트업 타이쿤
        </h1>

        {/* Game metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
            <p className="text-sm text-slate-600 dark:text-slate-400">유저</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {gameState?.users.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
            <p className="text-sm text-slate-600 dark:text-slate-400">자금</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {gameState?.cash.toLocaleString()}원
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
            <p className="text-sm text-slate-600 dark:text-slate-400">신뢰도</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {gameState?.trust}%
            </p>
          </div>
        </div>

        {/* Game content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
          <p className="text-slate-700 dark:text-slate-300">
            Turn {gameState?.currentTurn}
          </p>
          {/* Add your game content here */}
        </div>
      </div>

      {/* Event Popup (automatically shown when event triggers) */}
      {isOpen && currentEvent && (
        <EventPopup
          eventData={currentEvent}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
          isProcessing={isProcessing}
          error={eventError}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Example 2: Manual Event Trigger
// ---------------------------------------------------------------------------

/**
 * Example: Manually trigger event popup
 */
export function ManualEventTriggerExample({ gameId }: { gameId: string }) {
  const { openPopup, isOpen, currentEvent, handleSelectChoice } = useEventPopup(gameId);

  const triggerTestEvent = () => {
    openPopup({
      eventId: 'test-event-001',
      eventType: 'CRISIS',
      eventText: '테스트 이벤트가 발생했습니다!',
      title: '위기 상황',
      choices: [
        {
          choiceId: 'choice-1',
          text: '긴급 대응',
          effects: {
            cash: -10000000,
            trust: 15,
          },
        },
        {
          choiceId: 'choice-2',
          text: '대기',
          effects: {
            users: -5000,
            trust: -10,
          },
        },
      ],
    });
  };

  return (
    <div>
      <button
        onClick={triggerTestEvent}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        테스트 이벤트 발생
      </button>

      {isOpen && currentEvent && (
        <EventPopup
          eventData={currentEvent}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Example 3: With Error Handling
// ---------------------------------------------------------------------------

/**
 * Example: Event popup with comprehensive error handling
 */
export function EventPopupWithErrorHandlingExample({ gameId }: { gameId: string }) {
  const {
    currentEvent,
    isOpen,
    isProcessing,
    error,
    handleSelectChoice,
    retryLastChoice,
    clearError,
  } = useEventPopup(gameId);

  const handleRetry = async () => {
    clearError();
    await retryLastChoice();
  };

  return (
    <>
      {isOpen && currentEvent && (
        <EventPopup
          eventData={currentEvent}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
          isProcessing={isProcessing}
          error={error}
          onComplete={() => {
            console.log('Event choice completed successfully');
          }}
        />
      )}

      {/* Custom error toast */}
      {error && !isOpen && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">⚠️ 오류 발생</p>
          <p className="text-sm mb-3">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-white text-red-600 rounded hover:bg-red-50"
            >
              다시 시도
            </button>
            <button
              onClick={clearError}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
