import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  preferences: {
    language: 'en',
    sound: true,
    animations: true,
    theme: 'light',
  },
  profile: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLanguage: (state, action) => {
      state.preferences.language = action.payload;
    },
    setSound: (state, action) => {
      state.preferences.sound = action.payload;
    },
    setAnimations: (state, action) => {
      state.preferences.animations = action.payload;
    },
    setUserTheme: (state, action) => {
      state.preferences.theme = action.payload;
    },
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
  },
});

export const {
  setLanguage,
  setSound,
  setAnimations,
  setUserTheme,
  setProfile,
  updatePreferences,
} = userSlice.actions;

export default userSlice.reducer;