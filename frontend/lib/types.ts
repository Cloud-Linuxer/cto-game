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
}

export enum GameStatus {
  PLAYING = 'PLAYING',
  WON_IPO = 'WON_IPO',
  LOST_BANKRUPT = 'LOST_BANKRUPT',
  LOST_OUTAGE = 'LOST_OUTAGE',
  LOST_FAILED_IPO = 'LOST_FAILED_IPO',
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
