/**
 * Redux Store Configuration
 *
 * Combines all slices and RTK Query APIs
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import eventReducer from './slices/eventSlice';
import { gameApiRTK } from './api/gameApi';

/**
 * Configure Redux store with slices and RTK Query
 */
export const store = configureStore({
  reducer: {
    // Slices
    event: eventReducer,

    // RTK Query APIs
    [gameApiRTK.reducerPath]: gameApiRTK.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(gameApiRTK.middleware),
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Root state type inferred from store
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Dispatch type inferred from store
 */
export type AppDispatch = typeof store.dispatch;
