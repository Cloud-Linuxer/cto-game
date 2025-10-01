import axios from 'axios';
import type { GameState, Turn } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const gameApi = {
  // 새 게임 시작
  startGame: async (): Promise<GameState> => {
    const response = await api.post<GameState>('/game/start');
    return response.data;
  },

  // 게임 상태 조회
  getGame: async (gameId: string): Promise<GameState> => {
    const response = await api.get<GameState>(`/game/${gameId}`);
    return response.data;
  },

  // 선택 실행
  executeChoice: async (gameId: string, choiceId: number): Promise<GameState> => {
    const response = await api.post<GameState>(`/game/${gameId}/choice`, {
      choiceId,
    });
    return response.data;
  },

  // 턴 정보 조회
  getTurn: async (turnNumber: number): Promise<Turn> => {
    const response = await api.get<Turn>(`/turn/${turnNumber}`);
    return response.data;
  },

  // 모든 턴 조회
  getAllTurns: async (): Promise<Turn[]> => {
    const response = await api.get<Turn[]>('/turn');
    return response.data;
  },
};

export default api;
