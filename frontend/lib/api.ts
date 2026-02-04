import axios from 'axios';
import type {
  GameState,
  Turn,
  LeaderboardEntry,
  LeaderboardSubmitResponse,
  LeaderboardResponse,
  LeaderboardStatistics,
  TrustHistoryEntry,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

export const gameApi = {
  // 새 게임 시작
  startGame: async (difficulty?: 'EASY' | 'NORMAL' | 'HARD'): Promise<GameState> => {
    const response = await api.post<GameState>('/game/start', {
      difficulty: difficulty || 'NORMAL',
    });
    return response.data;
  },

  // 게임 상태 조회
  getGame: async (gameId: string): Promise<GameState> => {
    const response = await api.get<GameState>(`/game/${gameId}`);
    return response.data;
  },

  // 선택 실행
  executeChoice: async (gameId: string, choiceId: number | number[]): Promise<GameState> => {
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

  // 신뢰도 히스토리 조회 (EPIC-04 Feature 5)
  getTrustHistory: async (gameId: string): Promise<TrustHistoryEntry[]> => {
    const response = await api.get<TrustHistoryEntry[]>(`/game/${gameId}/trust-history`);
    return response.data;
  },
};

export const leaderboardApi = {
  // 리더보드에 점수 제출
  submitScore: async (playerName: string, gameId: string): Promise<LeaderboardSubmitResponse> => {
    const response = await api.post<LeaderboardSubmitResponse>('/leaderboard/submit', {
      playerName,
      gameId,
    });
    return response.data;
  },

  // 상위 점수 조회
  getTopScores: async (limit: number = 10): Promise<LeaderboardEntry[]> => {
    const response = await api.get<LeaderboardEntry[]>(`/leaderboard/top?limit=${limit}`);
    return response.data;
  },

  // 전체 리더보드 조회
  getLeaderboard: async (page: number = 1, limit: number = 20): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>(
      `/leaderboard?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // 최근 기록 조회
  getRecentScores: async (limit: number = 10): Promise<LeaderboardEntry[]> => {
    const response = await api.get<LeaderboardEntry[]>(`/leaderboard/recent?limit=${limit}`);
    return response.data;
  },

  // 통계 조회
  getStatistics: async (): Promise<LeaderboardStatistics> => {
    const response = await api.get<LeaderboardStatistics>('/leaderboard/statistics');
    return response.data;
  },

  // 특정 점수의 순위 조회
  getRank: async (score: number): Promise<number> => {
    const response = await api.get<{ rank: number }>(`/leaderboard/rank/${score}`);
    return response.data.rank;
  },
};

export default api;
