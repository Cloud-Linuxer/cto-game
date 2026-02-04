/**
 * Event Redux Slice
 *
 * 이벤트 팝업 상태 관리
 * Redux Toolkit 기반 (설치 필요: @reduxjs/toolkit react-redux)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EventData, EventHistoryEntry } from '@/types/event.types';

/**
 * 이벤트 상태 인터페이스
 */
export interface EventState {
  currentEvent: EventData | null;
  isPopupOpen: boolean;
  isProcessing: boolean;
  error: string | null;
  eventHistory: EventHistoryEntry[];
}

/**
 * 초기 상태
 */
const initialState: EventState = {
  currentEvent: null,
  isPopupOpen: false,
  isProcessing: false,
  error: null,
  eventHistory: [],
};

/**
 * 이벤트 슬라이스
 */
export const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    /**
     * 이벤트 팝업 열기
     */
    openEventPopup(state, action: PayloadAction<EventData>) {
      state.currentEvent = action.payload;
      state.isPopupOpen = true;
      state.error = null;
    },

    /**
     * 이벤트 팝업 닫기
     */
    closeEventPopup(state) {
      state.isPopupOpen = false;
      state.currentEvent = null;
      state.isProcessing = false;
      state.error = null;
    },

    /**
     * 처리 상태 설정
     */
    setProcessing(state, action: PayloadAction<boolean>) {
      state.isProcessing = action.payload;
    },

    /**
     * 에러 설정
     */
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isProcessing = false;
    },

    /**
     * 히스토리에 추가
     */
    addToHistory(state, action: PayloadAction<EventHistoryEntry>) {
      state.eventHistory.push(action.payload);
    },

    /**
     * 에러 초기화
     */
    clearError(state) {
      state.error = null;
    },
  },
});

/**
 * Actions
 */
export const {
  openEventPopup,
  closeEventPopup,
  setProcessing,
  setError,
  addToHistory,
  clearError,
} = eventSlice.actions;

/**
 * Selectors
 */
export const selectCurrentEvent = (state: { event: EventState }) => state.event.currentEvent;
export const selectIsPopupOpen = (state: { event: EventState }) => state.event.isPopupOpen;
export const selectIsProcessing = (state: { event: EventState }) => state.event.isProcessing;
export const selectError = (state: { event: EventState }) => state.event.error;
export const selectEventHistory = (state: { event: EventState }) => state.event.eventHistory;

/**
 * Reducer
 */
export default eventSlice.reducer;
