// Game 관련 타입 정의

export type DifficultyMode = 'EASY' | 'NORMAL' | 'HARD';
export type GameGrade = 'S' | 'A' | 'B' | 'C' | 'F';
export type CapacityWarningLevel = 'GREEN' | 'YELLOW' | 'RED';

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
  investmentFailed?: boolean;
  investmentFailureMessage?: string;
  capacityExceeded?: boolean;
  capacityExceededMessage?: string;
  hiredStaff?: string[];
  multiChoiceEnabled?: boolean;
  consultingMessage?: string;
  // Phase 1 additions
  difficultyMode?: DifficultyMode;
  grade?: GameGrade;
  maxTurns?: number;
  capacityWarningLevel?: CapacityWarningLevel;
  warnings?: string[];
  capacityUsagePercent?: number;
  // Phase 2 additions
  victoryPath?: VictoryPath;
  victoryPathProgress?: Record<string, number>;
  // Phase 3 additions
  resilienceStacks?: number;
  bankruptcyGraceTurns?: number;
  comebackActive?: boolean;
  recoveryMessages?: string[];
  // Event system
  randomEventTriggered?: boolean;
  randomEventData?: {
    eventId: string;
    eventType: string;
    eventText: string;
    title?: string;
    severity?: string;
    choices: Array<{
      choiceId: string;
      text: string;
      effects: {
        usersDelta?: number;
        cashDelta?: number;
        trustDelta?: number;
        addInfrastructure?: string[];
      };
    }>;
  };
}

export enum GameStatus {
  PLAYING = 'PLAYING',
  WON_IPO = 'WON_IPO',
  WON_ACQUISITION = 'WON_ACQUISITION',
  WON_PROFITABILITY = 'WON_PROFITABILITY',
  WON_TECH_LEADER = 'WON_TECH_LEADER',
  LOST_BANKRUPT = 'LOST_BANKRUPT',
  LOST_OUTAGE = 'LOST_OUTAGE',
  LOST_FAILED_IPO = 'LOST_FAILED_IPO',
  LOST_FIRED_CTO = 'LOST_FIRED_CTO',
}

export type VictoryPath = 'IPO' | 'ACQUISITION' | 'PROFITABILITY' | 'TECH_LEADER';

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

// 난이도 설정 정보
export interface DifficultyInfo {
  mode: DifficultyMode;
  label: string;
  description: string;
  scoreMultiplier: number;
}

export const DIFFICULTY_OPTIONS: DifficultyInfo[] = [
  {
    mode: 'EASY',
    label: '학습 모드',
    description: 'AWS 아키텍처를 배우며 플레이 (30턴, 완화된 조건)',
    scoreMultiplier: 0.6,
  },
  {
    mode: 'NORMAL',
    label: '도전 모드',
    description: '균형 잡힌 전략 경험 (25턴)',
    scoreMultiplier: 1.0,
  },
  {
    mode: 'HARD',
    label: '전문가 모드',
    description: '실제 CTO의 의사결정을 경험 (22턴, 강화된 조건)',
    scoreMultiplier: 1.5,
  },
];

// 승리 경로 정보
export const VICTORY_PATH_INFO: Record<VictoryPath, { label: string; emoji: string; color: string; description: string }> = {
  IPO: { label: 'IPO 상장', emoji: '🎉', color: 'text-green-600', description: '기업공개를 통해 주식시장에 상장' },
  ACQUISITION: { label: '인수합병', emoji: '🤝', color: 'text-blue-600', description: '대기업에 인수되어 성공적 엑싯' },
  PROFITABILITY: { label: '흑자 전환', emoji: '💰', color: 'text-amber-600', description: '지속 가능한 수익 모델 달성' },
  TECH_LEADER: { label: '기술 선도', emoji: '🔬', color: 'text-purple-600', description: '업계 최고 기술력으로 시장 리드' },
};

// 등급 정보
export const GRADE_INFO: Record<GameGrade, { label: string; color: string; description: string }> = {
  S: { label: 'S등급', color: 'text-yellow-500', description: '전설적인 CTO' },
  A: { label: 'A등급', color: 'text-purple-500', description: '뛰어난 경영' },
  B: { label: 'B등급', color: 'text-blue-500', description: '안정적인 성장' },
  C: { label: 'C등급', color: 'text-green-500', description: '기본적인 운영' },
  F: { label: 'F등급', color: 'text-gray-500', description: '아쉬운 결과' },
};

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
  victoryPath?: string;
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

// Trust History 관련 타입 (EPIC-04 Feature 5)
export type TrustChangeFactorType = 'choice' | 'recovery' | 'penalty' | 'bonus';

export interface TrustChangeFactor {
  type: TrustChangeFactorType;
  amount: number;
  message: string;
}

export interface TrustHistoryEntry {
  id: number;
  gameId: string;
  turnNumber: number;
  trustBefore: number;
  trustAfter: number;
  change: number;
  factors: TrustChangeFactor[];
  createdAt: string;
}
