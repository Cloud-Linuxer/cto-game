import apiClient from './client';

export const gameService = {
  async createGame(config = {}) {
    const response = await apiClient.post('/games', {
      config_version: config.version || 1,
      seed: config.seed,
    });
    return response.data;
  },

  async getGameState(gameId) {
    const response = await apiClient.get(`/games/${gameId}/state`);
    return response.data;
  },

  async getGame(gameId) {
    const response = await apiClient.get(`/games/${gameId}`);
    return response.data;
  },

  async executeAction(gameId, actionCode, payload = {}) {
    const response = await apiClient.post(`/games/${gameId}/actions`, {
      code: actionCode,
      payload,
    });
    return response.data;
  },

  async endTurn(gameId) {
    const response = await apiClient.post(`/games/${gameId}/end-turn`);
    return response.data;
  },

  async getAvailableActions(gameId) {
    const response = await apiClient.get(`/games/${gameId}/available-actions`);
    return response.data;
  },

  async getHistory(gameId, from, to) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const response = await apiClient.get(
      `/games/${gameId}/history${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  },

  async handleEventChoice(gameId, eventId, choiceCode, payload = {}) {
    const response = await apiClient.post(`/games/${gameId}/events/${eventId}/choice`, {
      choice_code: choiceCode,
      payload,
    });
    return response.data;
  },
};