import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '@/features/game/gameSlice';
import diagramReducer from '@/features/diagram/diagramSlice';
import uiReducer from '@/features/ui/uiSlice';
import userReducer from '@/features/user/userSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    diagram: diagramReducer,
    ui: uiReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['diagram/updateNodes', 'diagram/updateEdges'],
        ignoredPaths: ['diagram.nodes', 'diagram.edges'],
      },
    }),
});

export default store;