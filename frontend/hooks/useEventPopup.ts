/**
 * useEventPopup Hook
 *
 * Custom hook for managing event popup state with RTK Query API
 */

import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useExecuteEventChoiceMutation } from '@/store/api/gameApi';
import {
  selectCurrentEvent,
  selectIsPopupOpen,
  selectIsProcessing,
  selectError,
  openEventPopup,
  closeEventPopup,
  setProcessing,
  setError,
  clearError,
} from '@/store/slices/eventSlice';
import type { EventData } from '@/types/event.types';

/**
 * Return type for useEventPopup hook
 */
export interface UseEventPopupReturn {
  // State
  currentEvent: EventData | null;
  isOpen: boolean;
  isProcessing: boolean;
  error: string | null;

  // Actions
  openPopup: (eventData: EventData) => void;
  closePopup: () => void;
  handleSelectChoice: (choiceId: string) => Promise<void>;
  retryLastChoice: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for event popup management
 *
 * Provides state and actions for displaying and interacting with
 * event popups, including API integration with optimistic updates.
 *
 * @param gameId - Current game ID
 * @returns Event popup state and actions
 *
 * @example
 * ```tsx
 * const { currentEvent, isOpen, handleSelectChoice } = useEventPopup(gameId);
 *
 * return (
 *   <>
 *     {isOpen && currentEvent && (
 *       <EventPopup
 *         eventData={currentEvent}
 *         gameId={gameId}
 *         onSelectChoice={handleSelectChoice}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */
export function useEventPopup(gameId: string): UseEventPopupReturn {
  const dispatch = useAppDispatch();

  // Selectors
  const currentEvent = useAppSelector(selectCurrentEvent);
  const isOpen = useAppSelector(selectIsPopupOpen);
  const isProcessing = useAppSelector(selectIsProcessing);
  const error = useAppSelector(selectError);

  // RTK Query mutation
  const [executeEventChoice] = useExecuteEventChoiceMutation();

  // Track last attempted choice for retry
  let lastChoiceId: string | null = null;

  /**
   * Open event popup with event data
   */
  const openPopup = useCallback(
    (eventData: EventData) => {
      dispatch(openEventPopup(eventData));
    },
    [dispatch]
  );

  /**
   * Close event popup
   */
  const closePopup = useCallback(() => {
    dispatch(closeEventPopup());
    lastChoiceId = null;
  }, [dispatch]);

  /**
   * Handle choice selection with API call
   */
  const handleSelectChoice = useCallback(
    async (choiceId: string): Promise<void> => {
      if (!currentEvent) {
        throw new Error('No current event to select choice for');
      }

      if (isProcessing) {
        return; // Prevent duplicate requests
      }

      lastChoiceId = choiceId;
      dispatch(setProcessing(true));
      dispatch(clearError());

      try {
        // Execute event choice via API
        const result = await executeEventChoice({
          gameId,
          choiceId,
          eventId: currentEvent.eventId,
        }).unwrap();

        // Success - close popup
        dispatch(closeEventPopup());

        // Check if another event was triggered
        if (result.randomEventTriggered && result.randomEventData) {
          // Chain to next event
          setTimeout(() => {
            dispatch(openEventPopup(result.randomEventData!));
          }, 500); // Small delay for better UX
        }

      } catch (err: any) {
        // Handle different error types
        const errorMessage = getErrorMessage(err);
        dispatch(setError(errorMessage));

        // Log for debugging
        console.error('Event choice execution failed:', err);

        // Don't close popup on error - allow retry
      }
    },
    [gameId, currentEvent, isProcessing, dispatch, executeEventChoice]
  );

  /**
   * Retry last failed choice
   */
  const retryLastChoice = useCallback(async (): Promise<void> => {
    if (lastChoiceId) {
      await handleSelectChoice(lastChoiceId);
    }
  }, [handleSelectChoice]);

  /**
   * Clear error message
   */
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // State
    currentEvent,
    isOpen,
    isProcessing,
    error,

    // Actions
    openPopup,
    closePopup,
    handleSelectChoice,
    retryLastChoice,
    clearError: handleClearError,
  };
}

/**
 * Extract user-friendly error message from API error
 */
function getErrorMessage(error: any): string {
  // RTK Query error structure
  if (error.status) {
    switch (error.status) {
      case 400:
        return '잘못된 선택입니다. 다시 시도해주세요.';
      case 404:
        return '게임 또는 이벤트를 찾을 수 없습니다.';
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 'TIMEOUT_ERROR':
        return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
      case 'FETCH_ERROR':
        return '네트워크 연결을 확인해주세요.';
      default:
        return '선택 처리 중 오류가 발생했습니다.';
    }
  }

  // Generic error
  if (error.message) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}
