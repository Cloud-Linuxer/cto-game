import type { DifficultyMode, VictoryPath } from './types';

// IPO 목표는 난이도에 따라 다르므로 NORMAL 기준 기본값
export const GAME_GOALS = {
  USERS: 80000,
  CASH: 200000000,
  TRUST: 65,
  MAX_TURNS: 25,
} as const;

// 난이도별 목표
export const DIFFICULTY_GOALS: Record<DifficultyMode, {
  users: number;
  cash: number;
  trust: number;
  maxTurns: number;
}> = {
  EASY: { users: 70000, cash: 200000000, trust: 60, maxTurns: 30 },
  NORMAL: { users: 80000, cash: 200000000, trust: 65, maxTurns: 25 },
  HARD: { users: 120000, cash: 400000000, trust: 85, maxTurns: 22 },
};

export const IPO_REQUIRED_INFRA = ['RDS', 'EKS'] as const;

export const MAX_MULTI_CHOICES = 2;

export const CHOICE_CATEGORIES = {
  ALL: '전체',
  MARKETING: '마케팅',
  INFRA: '인프라',
  FINANCE: '재무',
} as const;

export type ChoiceCategory = typeof CHOICE_CATEGORIES[keyof typeof CHOICE_CATEGORIES];

// 승리 경로 목표 (난이도별)
export const VICTORY_PATH_GOALS: Record<DifficultyMode, Record<VictoryPath, {
  users: number; cash: number; trust: number; infraCount?: number;
}>> = {
  EASY: {
    IPO: { users: 70000, cash: 200000000, trust: 60 },
    ACQUISITION: { users: 50000, cash: 50000000, trust: 60, infraCount: 7 },
    PROFITABILITY: { users: 25000, cash: 400000000, trust: 40 },
    TECH_LEADER: { users: 30000, cash: 50000000, trust: 75, infraCount: 9 },
  },
  NORMAL: {
    IPO: { users: 80000, cash: 200000000, trust: 65 },
    ACQUISITION: { users: 60000, cash: 80000000, trust: 70, infraCount: 8 },
    PROFITABILITY: { users: 30000, cash: 500000000, trust: 50 },
    TECH_LEADER: { users: 40000, cash: 80000000, trust: 85, infraCount: 10 },
  },
  HARD: {
    IPO: { users: 120000, cash: 400000000, trust: 85 },
    ACQUISITION: { users: 80000, cash: 150000000, trust: 80, infraCount: 10 },
    PROFITABILITY: { users: 50000, cash: 800000000, trust: 60 },
    TECH_LEADER: { users: 60000, cash: 150000000, trust: 95, infraCount: 12 },
  },
};

// 용량 경고 색상
export const CAPACITY_WARNING_COLORS = {
  GREEN: 'text-green-500',
  YELLOW: 'text-yellow-500',
  RED: 'text-red-500',
} as const;
