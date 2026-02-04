/**
 * RTK Query API for Game Operations
 *
 * Provides type-safe API calls with automatic caching, refetching,
 * optimistic updates, and error handling.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { EventData } from '@/types/event.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Game state returned from backend
 */
export interface GameState {
  gameId: string;
  currentTurn: number;
  users: number;
  cash: number;
  trust: number;
  infrastructure: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  maxUserCapacity?: number;
  hiredStaff?: string[];
  multiChoiceEnabled?: boolean;
  difficultyMode?: string;
  grade?: string;
  maxTurns?: number;
  warnings?: string[];

  // Event system fields
  randomEventTriggered?: boolean;
  randomEventData?: EventData;
}

/**
 * Request to execute a regular choice
 */
export interface ExecuteChoiceRequest {
  gameId: string;
  choiceId: number | number[];
}

/**
 * Request to execute an event choice
 */
export interface ExecuteEventChoiceRequest {
  gameId: string;
  choiceId: string;
  eventId: string;
}

/**
 * Event history entry
 */
export interface EventHistoryEntry {
  eventId: string;
  eventType: string;
  turnNumber: number;
  selectedChoiceId: string;
  timestamp: string;
  usersBefore?: number;
  usersAfter?: number;
  cashBefore?: number;
  cashAfter?: number;
  trustBefore?: number;
  trustAfter?: number;
}

// ---------------------------------------------------------------------------
// API Definition
// ---------------------------------------------------------------------------

/**
 * Game API with RTK Query
 *
 * Provides endpoints for:
 * - Starting games
 * - Getting game state
 * - Executing choices
 * - Executing event choices
 * - Getting event history
 */
export const gameApiRTK = createApi({
  reducerPath: 'gameApiRTK',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    timeout: 30000,
  }),
  tagTypes: ['Game', 'EventHistory'],
  endpoints: (builder) => ({
    // -------------------------------------------------------------------------
    // Game Operations
    // -------------------------------------------------------------------------

    /**
     * Start a new game
     */
    startGame: builder.mutation<GameState, { difficulty?: 'EASY' | 'NORMAL' | 'HARD' }>({
      query: ({ difficulty = 'NORMAL' }) => ({
        url: '/game/start',
        method: 'POST',
        body: { difficulty },
      }),
      invalidatesTags: ['Game'],
    }),

    /**
     * Get game state by ID
     */
    getGame: builder.query<GameState, string>({
      query: (gameId) => `/game/${gameId}`,
      providesTags: (result, error, gameId) => [{ type: 'Game', id: gameId }],
    }),

    /**
     * Execute a regular choice
     */
    executeChoice: builder.mutation<GameState, ExecuteChoiceRequest>({
      query: ({ gameId, choiceId }) => ({
        url: `/game/${gameId}/choice`,
        method: 'POST',
        body: { choiceId },
      }),
      // Optimistic update
      async onQueryStarted({ gameId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedGame } = await queryFulfilled;

          // Update cache with new game state
          dispatch(
            gameApiRTK.util.updateQueryData('getGame', gameId, (draft) => {
              Object.assign(draft, updatedGame);
            })
          );
        } catch (error) {
          // Optimistic update failed, cache will revert automatically
          console.error('Failed to execute choice:', error);
        }
      },
      invalidatesTags: (result, error, { gameId }) => [{ type: 'Game', id: gameId }],
    }),

    // -------------------------------------------------------------------------
    // Event Operations
    // -------------------------------------------------------------------------

    /**
     * Execute an event choice
     *
     * Handles event-specific choice execution with optimistic updates
     * and automatic cache invalidation.
     */
    executeEventChoice: builder.mutation<GameState, ExecuteEventChoiceRequest>({
      query: ({ gameId, choiceId, eventId }) => ({
        url: `/game/${gameId}/event-choice`,
        method: 'POST',
        body: { choiceId, eventId },
      }),
      // Optimistic update
      async onQueryStarted({ gameId, choiceId, eventId }, { dispatch, queryFulfilled, getState }) {
        // Start optimistic update
        const patchResult = dispatch(
          gameApiRTK.util.updateQueryData('getGame', gameId, (draft) => {
            // Clear event trigger flag optimistically
            draft.randomEventTriggered = false;
            draft.randomEventData = undefined;
          })
        );

        try {
          const { data: updatedGame } = await queryFulfilled;

          // Update cache with actual response
          dispatch(
            gameApiRTK.util.updateQueryData('getGame', gameId, (draft) => {
              Object.assign(draft, updatedGame);
            })
          );

          // Add to event history
          const historyEntry: EventHistoryEntry = {
            eventId,
            eventType: updatedGame.randomEventData?.eventType || 'UNKNOWN',
            turnNumber: updatedGame.currentTurn,
            selectedChoiceId: choiceId,
            timestamp: new Date().toISOString(),
          };

          // Invalidate event history to refetch
          dispatch(
            gameApiRTK.util.invalidateTags([{ type: 'EventHistory', id: gameId }])
          );

        } catch (error) {
          // Revert optimistic update on error
          patchResult.undo();
          console.error('Failed to execute event choice:', error);
        }
      },
      invalidatesTags: (result, error, { gameId }) => [
        { type: 'Game', id: gameId },
        { type: 'EventHistory', id: gameId },
      ],
    }),

    /**
     * Get event history for a game
     */
    getEventHistory: builder.query<EventHistoryEntry[], string>({
      query: (gameId) => `/event/history/${gameId}`,
      providesTags: (result, error, gameId) => [{ type: 'EventHistory', id: gameId }],
    }),
  }),
});

// ---------------------------------------------------------------------------
// Hooks Export
// ---------------------------------------------------------------------------

/**
 * Auto-generated hooks for use in React components
 */
export const {
  useStartGameMutation,
  useGetGameQuery,
  useExecuteChoiceMutation,
  useExecuteEventChoiceMutation,
  useGetEventHistoryQuery,
} = gameApiRTK;
