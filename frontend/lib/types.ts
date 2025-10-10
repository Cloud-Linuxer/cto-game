// Game 관련 타입 정의

export interface GameState {
  gameId: string;
  currentTurn: number;
  users: number;
  cash: number;
  trust: number;
  infrastructure: string[];
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  maxUserCapacity?: number;
  capacityExceeded?: boolean;
  capacityExceededMessage?: string;
  hiredStaff?: string[];
  multiChoiceEnabled?: boolean;
  consultingMessage?: string;
}

export enum GameStatus {
  PLAYING = 'PLAYING',
  WON_IPO = 'WON_IPO',
  LOST_BANKRUPT = 'LOST_BANKRUPT',
  LOST_OUTAGE = 'LOST_OUTAGE',
  LOST_FAILED_IPO = 'LOST_FAILED_IPO',
  LOST_FIRED_CTO = 'LOST_FIRED_CTO',
}

export interface ChoiceEffects {
  users: number;
  cash: number;
  trust: number;
  infra: string[];
}

export interface Choice {
  choiceId: number;
  turnNumber: number;
  text: string;
  effects: ChoiceEffects;
  nextTurn: number;
  category?: string;
  description?: string;
}

export interface Turn {
  turnId: number;
  turnNumber: number;
  eventText: string;
  description?: string;
  choices: Choice[];
}

// 리더보드 관련 타입
export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  finalTurn: number;
  finalUsers: number;
  finalCash: number;
  finalTrust: number;
  finalInfrastructure: string[];
  teamSize: number;
  difficulty: string;
  achievedAt: string;
}

export interface LeaderboardSubmitResponse {
  entry: LeaderboardEntry;
  rank: number;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface LeaderboardStatistics {
  totalGames: number;
  averageScore: number;
  highestScore: number;
  averageTurn: number;
}
