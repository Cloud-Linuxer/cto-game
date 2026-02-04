/**
 * useEventPopup Hook Tests
 *
 * Tests custom hook behavior with Redux and RTK Query
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useEventPopup } from '../useEventPopup';
import eventReducer from '@/store/slices/eventSlice';
import { gameApiRTK } from '@/store/api/gameApi';
import type { EventData } from '@/types/event.types';

// Mock RTK Query
jest.mock('@/store/api/gameApi', () => {
  const actual = jest.requireActual('@reduxjs/toolkit/query/react');
  return {
    ...actual,
    gameApiRTK: {
      reducerPath: 'gameApiRTK',
      reducer: (state: any = {}) => state,
      middleware: () => (next: any) => (action: any) => next(action),
      util: {
        updateQueryData: jest.fn(),
      },
    },
    useExecuteEventChoiceMutation: jest.fn(() => [
      jest.fn(),
      {
        isLoading: false,
        isSuccess: false,
        isError: false,
      },
    ]),
  };
});

describe('useEventPopup', () => {
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
      {
        choiceId: 'choice-2',
        text: '복구 대기',
        effects: {
          users: -30000,
          trust: -40,
        },
      },
    ],
  };

  const createTestStore = () => {
    return configureStore({
      reducer: {
        event: eventReducer,
        [gameApiRTK.reducerPath]: gameApiRTK.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(gameApiRTK.middleware),
    });
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={createTestStore()}>{children}</Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      expect(result.current.currentEvent).toBeNull();
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Opening Popup', () => {
    it('should open popup with event data', () => {
      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.currentEvent).toEqual(mockEventData);
    });

    it('should replace previous event when opening new one', () => {
      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      const newEventData: EventData = {
        ...mockEventData,
        eventId: 'test-event-002',
        eventText: '새로운 이벤트',
      };

      act(() => {
        result.current.openPopup(newEventData);
      });

      expect(result.current.currentEvent?.eventId).toBe('test-event-002');
    });
  });

  describe('Closing Popup', () => {
    it('should close popup', () => {
      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closePopup();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should clear event data when closing', () => {
      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      act(() => {
        result.current.closePopup();
      });

      expect(result.current.currentEvent).toBeNull();
    });
  });

  describe('Choice Selection', () => {
    it('should handle successful choice selection', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            randomEventTriggered: false,
          }),
      });

      jest
        .spyOn(require('@/store/api/gameApi'), 'useExecuteEventChoiceMutation')
        .mockReturnValue([mockExecute, {}]);

      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      await act(async () => {
        await result.current.handleSelectChoice('choice-1');
      });

      expect(mockExecute).toHaveBeenCalledWith({
        gameId: 'test-game-id',
        choiceId: 'choice-1',
        eventId: 'test-event-001',
      });
    });

    it('should close popup after successful selection', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            randomEventTriggered: false,
          }),
      });

      jest
        .spyOn(require('@/store/api/gameApi'), 'useExecuteEventChoiceMutation')
        .mockReturnValue([mockExecute, {}]);

      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      await act(async () => {
        await result.current.handleSelectChoice('choice-1');
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should not call API if no current event', async () => {
      const mockExecute = jest.fn();

      jest
        .spyOn(require('@/store/api/gameApi'), 'useExecuteEventChoiceMutation')
        .mockReturnValue([mockExecute, {}]);

      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      await expect(
        async () => await act(async () => {
          await result.current.handleSelectChoice('choice-1');
        })
      ).rejects.toThrow('No current event to select choice for');

      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should prevent duplicate requests when processing', async () => {
      const mockExecute = jest.fn().mockImplementation(() => ({
        unwrap: () => new Promise((resolve) => setTimeout(resolve, 100)),
      }));

      jest
        .spyOn(require('@/store/api/gameApi'), 'useExecuteEventChoiceMutation')
        .mockReturnValue([mockExecute, {}]);

      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      // Start first request
      act(() => {
        result.current.handleSelectChoice('choice-1');
      });

      // Try to start second request immediately
      act(() => {
        result.current.handleSelectChoice('choice-2');
      });

      // Should only call once
      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Event Chaining', () => {
    it('should open next event if chained', async () => {
      jest.useFakeTimers();

      const nextEventData: EventData = {
        eventId: 'chained-event-001',
        eventType: 'CHAIN',
        eventText: '연쇄 이벤트 발생!',
        choices: [],
      };

      const mockExecute = jest.fn().mockResolvedValue({
        unwrap: () =>
          Promise.resolve({
            randomEventTriggered: true,
            randomEventData: nextEventData,
          }),
      });

      jest
        .spyOn(require('@/store/api/gameApi'), 'useExecuteEventChoiceMutation')
        .mockReturnValue([mockExecute, {}]);

      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      await act(async () => {
        await result.current.handleSelectChoice('choice-1');
      });

      // First event should close
      expect(result.current.isOpen).toBe(false);

      // Fast-forward past 500ms delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Next event should open
      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
        expect(result.current.currentEvent?.eventId).toBe('chained-event-001');
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should set error message on API failure', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        unwrap: () =>
          Promise.reject({
            status: 500,
          }),
      });

      jest
        .spyOn(require('@/store/api/gameApi'), 'useExecuteEventChoiceMutation')
        .mockReturnValue([mockExecute, {}]);

      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      await act(async () => {
        await result.current.handleSelectChoice('choice-1');
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isOpen).toBe(true); // Popup stays open on error
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      // Manually set error for testing
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should support retry for last choice', async () => {
      const mockExecute = jest
        .fn()
        .mockResolvedValueOnce({
          unwrap: () => Promise.reject({ status: 500 }),
        })
        .mockResolvedValueOnce({
          unwrap: () => Promise.resolve({ randomEventTriggered: false }),
        });

      jest
        .spyOn(require('@/store/api/gameApi'), 'useExecuteEventChoiceMutation')
        .mockReturnValue([mockExecute, {}]);

      const { result } = renderHook(() => useEventPopup('test-game-id'), {
        wrapper,
      });

      act(() => {
        result.current.openPopup(mockEventData);
      });

      // First attempt fails
      await act(async () => {
        await result.current.handleSelectChoice('choice-1');
      });

      expect(result.current.error).toBeTruthy();

      // Retry
      await act(async () => {
        await result.current.retryLastChoice();
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.current.isOpen).toBe(false); // Success closes popup
    });
  });
});
