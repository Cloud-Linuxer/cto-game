import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gameService } from '@/api/gameService';

export const createNewGame = createAsyncThunk(
  'game/createNew',
  async (config, { rejectWithValue }) => {
    try {
      const response = await gameService.createGame(config);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const loadGameState = createAsyncThunk(
  'game/loadState',
  async (gameId, { rejectWithValue }) => {
    try {
      const response = await gameService.getGameState(gameId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const executeGameAction = createAsyncThunk(
  'game/executeAction',
  async ({ gameId, actionCode, payload }, { rejectWithValue }) => {
    try {
      const response = await gameService.executeAction(gameId, actionCode, payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const endGameTurn = createAsyncThunk(
  'game/endTurn',
  async (gameId, { rejectWithValue }) => {
    try {
      const response = await gameService.endTurn(gameId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const loadAvailableActions = createAsyncThunk(
  'game/loadAvailableActions',
  async (gameId, { rejectWithValue }) => {
    try {
      const response = await gameService.getAvailableActions(gameId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  gameId: null,
  state: null,
  availableActions: [],
  history: [],
  loading: false,
  error: null,
  turnInProgress: false,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    resetGame: () => initialState,
    setGameId: (state, action) => {
      state.gameId = action.payload;
    },
    updateGameState: (state, action) => {
      state.state = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createNewGame.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewGame.fulfilled, (state, action) => {
        state.loading = false;
        state.gameId = action.payload.game_id;
        state.state = action.payload.state;
      })
      .addCase(createNewGame.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadGameState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadGameState.fulfilled, (state, action) => {
        state.loading = false;
        state.state = action.payload.state;
      })
      .addCase(loadGameState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(executeGameAction.pending, (state) => {
        state.turnInProgress = true;
        state.error = null;
      })
      .addCase(executeGameAction.fulfilled, (state, action) => {
        state.turnInProgress = false;
        state.state = action.payload.state;
      })
      .addCase(executeGameAction.rejected, (state, action) => {
        state.turnInProgress = false;
        state.error = action.payload;
      })
      .addCase(endGameTurn.pending, (state) => {
        state.turnInProgress = true;
        state.error = null;
      })
      .addCase(endGameTurn.fulfilled, (state, action) => {
        state.turnInProgress = false;
        state.state = action.payload.state;
      })
      .addCase(endGameTurn.rejected, (state, action) => {
        state.turnInProgress = false;
        state.error = action.payload;
      })
      .addCase(loadAvailableActions.fulfilled, (state, action) => {
        state.availableActions = action.payload.actions;
      });
  },
});

export const { resetGame, setGameId, updateGameState, clearError } = gameSlice.actions;
export default gameSlice.reducer;