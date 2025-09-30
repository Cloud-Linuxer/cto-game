import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: false,
  modals: {
    settings: false,
    eventDialog: null,
    actionConfirm: null,
    turnSummary: null,
  },
  toasts: [],
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    openModal: (state, action) => {
      const { modal, data } = action.payload;
      state.modals[modal] = data || true;
    },
    closeModal: (state, action) => {
      state.modals[action.payload] = null;
    },
    addToast: (state, action) => {
      state.toasts.push({
        id: Date.now() + Math.random(),
        ...action.payload,
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
  },
});

export const {
  setLoading,
  openModal,
  closeModal,
  addToast,
  removeToast,
  setTheme,
} = uiSlice.actions;

export default uiSlice.reducer;