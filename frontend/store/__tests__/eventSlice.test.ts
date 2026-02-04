/**
 * eventSlice Integration Tests
 *
 * Tests Redux slice reducers and actions
 */

import eventReducer, {
  openEventPopup,
  closeEventPopup,
  setProcessing,
  setError,
  clearError,
  addToHistory,
  selectCurrentEvent,
  selectIsPopupOpen,
  selectIsProcessing,
  selectError,
  selectEventHistory,
} from '../slices/eventSlice';
import type { EventData, EventState } from '@/types/event.types';

describe('eventSlice', () => {
  const mockEventData: EventData = {
    eventId: 'test-event-001',
    eventType: 'CRISIS',
    eventText: 'AWS 리전 장애 발생!',
    title: '위기 상황',
    choices: [
      {
        choiceId: 'choice-1',
        text: '멀티 리전 구축',
        effects: {
          cash: -50000000,
          trust: 15,
        },
      },
    ],
  };

  const initialState: EventState = {
    currentEvent: null,
    isPopupOpen: false,
    isProcessing: false,
    error: null,
    eventHistory: [],
  };

  describe('Reducers', () => {
    describe('openEventPopup', () => {
      it('should open popup with event data', () => {
        const nextState = eventReducer(
          initialState,
          openEventPopup(mockEventData)
        );

        expect(nextState.isPopupOpen).toBe(true);
        expect(nextState.currentEvent).toEqual(mockEventData);
      });

      it('should clear error when opening popup', () => {
        const stateWithError: EventState = {
          ...initialState,
          error: '이전 오류',
        };

        const nextState = eventReducer(
          stateWithError,
          openEventPopup(mockEventData)
        );

        expect(nextState.error).toBeNull();
      });

      it('should replace previous event', () => {
        const stateWithEvent: EventState = {
          ...initialState,
          isPopupOpen: true,
          currentEvent: mockEventData,
        };

        const newEvent: EventData = {
          ...mockEventData,
          eventId: 'test-event-002',
          eventText: '새로운 이벤트',
        };

        const nextState = eventReducer(stateWithEvent, openEventPopup(newEvent));

        expect(nextState.currentEvent?.eventId).toBe('test-event-002');
      });
    });

    describe('closeEventPopup', () => {
      it('should close popup', () => {
        const stateWithOpenPopup: EventState = {
          ...initialState,
          isPopupOpen: true,
          currentEvent: mockEventData,
        };

        const nextState = eventReducer(stateWithOpenPopup, closeEventPopup());

        expect(nextState.isPopupOpen).toBe(false);
      });

      it('should clear event data', () => {
        const stateWithOpenPopup: EventState = {
          ...initialState,
          isPopupOpen: true,
          currentEvent: mockEventData,
        };

        const nextState = eventReducer(stateWithOpenPopup, closeEventPopup());

        expect(nextState.currentEvent).toBeNull();
      });

      it('should reset processing state', () => {
        const stateWithProcessing: EventState = {
          ...initialState,
          isPopupOpen: true,
          currentEvent: mockEventData,
          isProcessing: true,
        };

        const nextState = eventReducer(stateWithProcessing, closeEventPopup());

        expect(nextState.isProcessing).toBe(false);
      });
    });

    describe('setProcessing', () => {
      it('should set processing to true', () => {
        const nextState = eventReducer(initialState, setProcessing(true));

        expect(nextState.isProcessing).toBe(true);
      });

      it('should set processing to false', () => {
        const stateWithProcessing: EventState = {
          ...initialState,
          isProcessing: true,
        };

        const nextState = eventReducer(stateWithProcessing, setProcessing(false));

        expect(nextState.isProcessing).toBe(false);
      });
    });

    describe('setError', () => {
      it('should set error message', () => {
        const errorMessage = '네트워크 오류가 발생했습니다';
        const nextState = eventReducer(initialState, setError(errorMessage));

        expect(nextState.error).toBe(errorMessage);
      });

      it('should stop processing when error is set', () => {
        const stateWithProcessing: EventState = {
          ...initialState,
          isProcessing: true,
        };

        const nextState = eventReducer(
          stateWithProcessing,
          setError('오류 발생')
        );

        expect(nextState.isProcessing).toBe(false);
      });
    });

    describe('clearError', () => {
      it('should clear error message', () => {
        const stateWithError: EventState = {
          ...initialState,
          error: '이전 오류',
        };

        const nextState = eventReducer(stateWithError, clearError());

        expect(nextState.error).toBeNull();
      });
    });

    describe('addToHistory', () => {
      it('should add event to history', () => {
        const historyEntry = {
          eventId: 'test-event-001',
          eventType: 'CRISIS' as const,
          selectedChoiceId: 'choice-1',
          timestamp: new Date().toISOString(),
        };

        const nextState = eventReducer(initialState, addToHistory(historyEntry));

        expect(nextState.eventHistory).toHaveLength(1);
        expect(nextState.eventHistory[0]).toEqual(historyEntry);
      });

      it('should append to existing history', () => {
        const existingHistory = [
          {
            eventId: 'test-event-000',
            eventType: 'RANDOM' as const,
            selectedChoiceId: 'choice-0',
            timestamp: new Date().toISOString(),
          },
        ];

        const stateWithHistory: EventState = {
          ...initialState,
          eventHistory: existingHistory,
        };

        const newEntry = {
          eventId: 'test-event-001',
          eventType: 'CRISIS' as const,
          selectedChoiceId: 'choice-1',
          timestamp: new Date().toISOString(),
        };

        const nextState = eventReducer(stateWithHistory, addToHistory(newEntry));

        expect(nextState.eventHistory).toHaveLength(2);
        expect(nextState.eventHistory[1]).toEqual(newEntry);
      });
    });
  });

  describe('Selectors', () => {
    const mockRootState = {
      event: {
        currentEvent: mockEventData,
        isPopupOpen: true,
        isProcessing: false,
        error: null,
        eventHistory: [],
      },
    };

    it('should select current event', () => {
      expect(selectCurrentEvent(mockRootState as any)).toEqual(mockEventData);
    });

    it('should select popup open state', () => {
      expect(selectIsPopupOpen(mockRootState as any)).toBe(true);
    });

    it('should select processing state', () => {
      expect(selectIsProcessing(mockRootState as any)).toBe(false);
    });

    it('should select error', () => {
      expect(selectError(mockRootState as any)).toBeNull();
    });

    it('should select event history', () => {
      expect(selectEventHistory(mockRootState as any)).toEqual([]);
    });
  });

  describe('State Transitions', () => {
    it('should handle complete event lifecycle', () => {
      let state = initialState;

      // Open popup
      state = eventReducer(state, openEventPopup(mockEventData));
      expect(state.isPopupOpen).toBe(true);
      expect(state.currentEvent).toEqual(mockEventData);

      // Start processing
      state = eventReducer(state, setProcessing(true));
      expect(state.isProcessing).toBe(true);

      // Stop processing
      state = eventReducer(state, setProcessing(false));
      expect(state.isProcessing).toBe(false);

      // Add to history
      state = eventReducer(
        state,
        addToHistory({
          eventId: mockEventData.eventId,
          eventType: mockEventData.eventType,
          selectedChoiceId: 'choice-1',
          timestamp: new Date().toISOString(),
        })
      );
      expect(state.eventHistory).toHaveLength(1);

      // Close popup
      state = eventReducer(state, closeEventPopup());
      expect(state.isPopupOpen).toBe(false);
      expect(state.currentEvent).toBeNull();
    });

    it('should handle error recovery', () => {
      let state = initialState;

      // Open popup
      state = eventReducer(state, openEventPopup(mockEventData));

      // Start processing
      state = eventReducer(state, setProcessing(true));

      // Error occurs
      state = eventReducer(state, setError('네트워크 오류'));
      expect(state.error).toBe('네트워크 오류');
      expect(state.isProcessing).toBe(false);

      // Clear error
      state = eventReducer(state, clearError());
      expect(state.error).toBeNull();

      // Retry
      state = eventReducer(state, setProcessing(true));
      state = eventReducer(state, setProcessing(false));

      // Success - close popup
      state = eventReducer(state, closeEventPopup());
      expect(state.isPopupOpen).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle closing already closed popup', () => {
      const nextState = eventReducer(initialState, closeEventPopup());

      expect(nextState).toEqual(initialState);
    });

    it('should handle clearing non-existent error', () => {
      const nextState = eventReducer(initialState, clearError());

      expect(nextState).toEqual(initialState);
    });

    it('should handle multiple consecutive errors', () => {
      let state = initialState;

      state = eventReducer(state, setError('오류 1'));
      expect(state.error).toBe('오류 1');

      state = eventReducer(state, setError('오류 2'));
      expect(state.error).toBe('오류 2');

      state = eventReducer(state, setError('오류 3'));
      expect(state.error).toBe('오류 3');
    });

    it('should maintain history order', () => {
      let state = initialState;

      const entries = [
        {
          eventId: 'event-1',
          eventType: 'RANDOM' as const,
          selectedChoiceId: 'c1',
          timestamp: '2026-01-01T00:00:00Z',
        },
        {
          eventId: 'event-2',
          eventType: 'CRISIS' as const,
          selectedChoiceId: 'c2',
          timestamp: '2026-01-01T00:01:00Z',
        },
        {
          eventId: 'event-3',
          eventType: 'OPPORTUNITY' as const,
          selectedChoiceId: 'c3',
          timestamp: '2026-01-01T00:02:00Z',
        },
      ];

      entries.forEach((entry) => {
        state = eventReducer(state, addToHistory(entry));
      });

      expect(state.eventHistory).toEqual(entries);
    });
  });
});
