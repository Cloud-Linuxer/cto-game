/**
 * Game constants with difficulty mode support.
 *
 * Centralizes all numeric thresholds, capacity maps, multiplier values,
 * and difficulty-mode-specific overrides.
 */

export type DifficultyMode = 'EASY' | 'NORMAL' | 'HARD';

// ---------------------------------------------------------------------------
// Difficulty-mode-specific overrides
// ---------------------------------------------------------------------------
export interface DifficultyConfig {
  label: string;
  description: string;

  // Initial state
  initialCash: number;
  initialTrust: number;
  initialMaxCapacity: number;

  // Turn limits
  maxTurns: number;

  // Investment thresholds
  earlyPitchTrustThreshold: number;
  seriesAMinTrust: number;
  seriesBMinTrust: number;
  seriesCMinTrust: number;

  // Penalties
  trustOutageThreshold: number;
  bankruptcyThreshold: number; // cash below this = bankrupt

  // IPO conditions
  ipoMinUsers: number;
  ipoMinCash: number;
  ipoMinTrust: number;

  // Effect modifiers
  positiveEffectMultiplier: number;
  negativeEffectMultiplier: number;

  // Leaderboard
  scoreMultiplier: number;
}

// ---------------------------------------------------------------------------
// Victory path conditions (per difficulty)
// ---------------------------------------------------------------------------
export type VictoryPath = 'IPO' | 'ACQUISITION' | 'PROFITABILITY' | 'TECH_LEADER';

export interface VictoryPathCondition {
  label: string;
  description: string;
  minUsers: number;
  minCash: number;
  minTrust: number;
  minInfraCount?: number;
  requiredInfra?: readonly string[];
  scoreMultiplier: number; // relative to IPO (1.0)
}

export const VICTORY_PATH_CONDITIONS: Record<DifficultyMode, Record<VictoryPath, VictoryPathCondition>> = {
  EASY: {
    IPO: {
      label: 'IPO 상장',
      description: '기업공개를 통해 주식시장에 상장합니다',
      minUsers: 70_000, minCash: 200_000_000, minTrust: 70, // EPIC-08 Phase 2: 60 → 70
      requiredInfra: ['RDS', 'EKS'],
      scoreMultiplier: 1.0,
    },
    ACQUISITION: {
      label: '인수합병',
      description: '대기업에 인수되어 성공적으로 엑싯합니다',
      minUsers: 50_000, minCash: 50_000_000, minTrust: 60,
      minInfraCount: 7,
      scoreMultiplier: 0.85,
    },
    PROFITABILITY: {
      label: '흑자 전환',
      description: '안정적인 수익 모델로 지속 가능한 성장을 달성합니다',
      minUsers: 25_000, minCash: 400_000_000, minTrust: 40,
      scoreMultiplier: 0.75,
    },
    TECH_LEADER: {
      label: '기술 선도',
      description: '업계 최고의 기술력으로 시장을 리드합니다',
      minUsers: 30_000, minCash: 50_000_000, minTrust: 75,
      minInfraCount: 9,
      scoreMultiplier: 0.9,
    },
  },
  NORMAL: {
    IPO: {
      label: 'IPO 상장',
      description: '기업공개를 통해 주식시장에 상장합니다',
      minUsers: 80_000, minCash: 200_000_000, minTrust: 80, // EPIC-08 Phase 2: 65 → 80
      requiredInfra: ['RDS', 'EKS'],
      scoreMultiplier: 1.0,
    },
    ACQUISITION: {
      label: '인수합병',
      description: '대기업에 인수되어 성공적으로 엑싯합니다',
      minUsers: 60_000, minCash: 80_000_000, minTrust: 70,
      minInfraCount: 8,
      scoreMultiplier: 0.85,
    },
    PROFITABILITY: {
      label: '흑자 전환',
      description: '안정적인 수익 모델로 지속 가능한 성장을 달성합니다',
      minUsers: 30_000, minCash: 500_000_000, minTrust: 50,
      scoreMultiplier: 0.75,
    },
    TECH_LEADER: {
      label: '기술 선도',
      description: '업계 최고의 기술력으로 시장을 리드합니다',
      minUsers: 40_000, minCash: 80_000_000, minTrust: 85,
      minInfraCount: 10,
      scoreMultiplier: 0.9,
    },
  },
  HARD: {
    IPO: {
      label: 'IPO 상장',
      description: '기업공개를 통해 주식시장에 상장합니다',
      minUsers: 120_000, minCash: 400_000_000, minTrust: 90, // EPIC-08 Phase 2: 85 → 90
      requiredInfra: ['RDS', 'EKS'],
      scoreMultiplier: 1.0,
    },
    ACQUISITION: {
      label: '인수합병',
      description: '대기업에 인수되어 성공적으로 엑싯합니다',
      minUsers: 80_000, minCash: 150_000_000, minTrust: 80,
      minInfraCount: 10,
      scoreMultiplier: 0.85,
    },
    PROFITABILITY: {
      label: '흑자 전환',
      description: '안정적인 수익 모델로 지속 가능한 성장을 달성합니다',
      minUsers: 50_000, minCash: 800_000_000, minTrust: 60,
      scoreMultiplier: 0.75,
    },
    TECH_LEADER: {
      label: '기술 선도',
      description: '업계 최고의 기술력으로 시장을 리드합니다',
      minUsers: 60_000, minCash: 150_000_000, minTrust: 95,
      minInfraCount: 12,
      scoreMultiplier: 0.9,
    },
  },
};

export const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  EASY: {
    label: '학습 모드',
    description: 'AWS 아키텍처를 배우며 플레이',
    initialCash: 15_000_000,
    initialTrust: 50,
    initialMaxCapacity: 15_000,
    maxTurns: 30,
    earlyPitchTrustThreshold: 3,
    seriesAMinTrust: 30,        // EPIC-08 Phase 2: 20 → 30 (+50%)
    seriesBMinTrust: 50,        // EPIC-08 Phase 2: 35 → 50 (+43%)
    seriesCMinTrust: 65,        // EPIC-08 Phase 2: 55 → 65 (+18%)
    trustOutageThreshold: 5,
    bankruptcyThreshold: -50_000_000,
    ipoMinUsers: 70_000,
    ipoMinCash: 200_000_000,
    ipoMinTrust: 70,            // EPIC-08 Phase 2: 60 → 70 (+17%)
    positiveEffectMultiplier: 1.3,
    negativeEffectMultiplier: 0.6,
    scoreMultiplier: 0.6,
  },
  NORMAL: {
    label: '도전 모드',
    description: '균형 잡힌 전략 경험',
    initialCash: 10_000_000,
    initialTrust: 50, // Updated from 40 to align with GDD (EPIC-04)
    initialMaxCapacity: 10_000,
    maxTurns: 25,
    earlyPitchTrustThreshold: 5,
    seriesAMinTrust: 40,        // EPIC-08 Phase 2: 25 → 40 (+60%)
    seriesBMinTrust: 60,        // EPIC-08 Phase 2: 45 → 60 (+33%)
    seriesCMinTrust: 75,        // EPIC-08 Phase 2: 65 → 75 (+15%)
    trustOutageThreshold: 10,
    bankruptcyThreshold: -30_000_000,
    ipoMinUsers: 80_000,
    ipoMinCash: 200_000_000,
    ipoMinTrust: 80,            // EPIC-08 Phase 2: 65 → 80 (+23%)
    positiveEffectMultiplier: 1.0,
    negativeEffectMultiplier: 1.0,
    scoreMultiplier: 1.0,
  },
  HARD: {
    label: '전문가 모드',
    description: '실제 CTO의 의사결정을 경험',
    initialCash: 7_000_000,
    initialTrust: 30, // Updated from 25 to align with GDD (EPIC-04)
    initialMaxCapacity: 5_000,
    maxTurns: 22,
    earlyPitchTrustThreshold: 8,
    seriesAMinTrust: 50,        // EPIC-08 Phase 2: 35 → 50 (+43%)
    seriesBMinTrust: 70,        // EPIC-08 Phase 2: 55 → 70 (+27%)
    seriesCMinTrust: 85,        // EPIC-08 Phase 2: 75 → 85 (+13%)
    trustOutageThreshold: 15,
    bankruptcyThreshold: 0,
    ipoMinUsers: 120_000,
    ipoMinCash: 400_000_000,
    ipoMinTrust: 90,            // EPIC-08 Phase 2: 85 → 90 (+6%)
    positiveEffectMultiplier: 0.8,
    negativeEffectMultiplier: 1.4,
    scoreMultiplier: 1.5,
  },
};

// ---------------------------------------------------------------------------
// Base constants (shared across all difficulty modes)
// ---------------------------------------------------------------------------
export const GAME_CONSTANTS = {
  // --- Initial game state (defaults, overridden by difficulty) ---
  INITIAL_CASH: 10_000_000,
  INITIAL_TRUST: 50, // Updated from 40 to align with GDD (EPIC-04)
  INITIAL_USERS: 0,
  INITIAL_MAX_CAPACITY: 10_000,
  INITIAL_INFRASTRUCTURE: ['EC2'] as readonly string[],
  INITIAL_EQUITY_PERCENTAGE: 100,
  INITIAL_INVESTMENT_ROUNDS: 0,
  INITIAL_USER_ACQUISITION_MULTIPLIER: 1.0,
  INITIAL_TRUST_MULTIPLIER: 1.0,

  // --- Turn limits (default, overridden by difficulty) ---
  MAX_TURNS: 25,

  // --- Investment thresholds (defaults, overridden by difficulty) ---
  EARLY_PITCH_TURN: 2,
  EARLY_PITCH_CHOICE_ID: 8,
  EARLY_PITCH_TRUST_THRESHOLD: 5,

  SERIES_A_TURN: 12,
  SERIES_A_MIN_CASH_EFFECT: 100_000_000,
  SERIES_A_MIN_TRUST: 40,        // EPIC-08 Phase 2: 25 → 40 (NORMAL baseline)

  SERIES_B_TURN: 18,
  SERIES_B_MIN_CASH_EFFECT: 1_000_000_000,
  SERIES_B_MIN_TRUST: 60,        // EPIC-08 Phase 2: 45 → 60 (NORMAL baseline)

  SERIES_C_TURN: 23,
  SERIES_C_MIN_CASH_EFFECT: 3_000_000_000,
  SERIES_C_MIN_TRUST: 75,        // EPIC-08 Phase 2: 65 → 75 (NORMAL baseline)

  // --- Capacity (graduated penalty system) ---
  // Old: flat -10 trust. New: ratio-based.
  CAPACITY_PENALTY_TIERS: [
    { excessRatio: 0.10, penalty: 2 },  // 10% over  -> -2 trust
    { excessRatio: 0.30, penalty: 3 },  // 30% over  -> -3 trust (reduced from 4)
    { excessRatio: 0.50, penalty: 5 },  // 50% over  -> -5 trust (reduced from 6)
    { excessRatio: 1.00, penalty: 6 },  // 100%+ over -> -6 trust (reduced from 8)
  ] as readonly { excessRatio: number; penalty: number }[],
  CAPACITY_EXCEEDED_TRUST_PENALTY: 8, // max penalty (kept for backward compat)

  // Additive capacity: base + sum of each infra contribution
  INFRASTRUCTURE_CAPACITY: {
    'EC2': 10_000,
    'Route53': 5_000,
    'CloudWatch': 5_000,
    'RDS': 15_000,
    'S3': 15_000,
    'Auto Scaling': 40_000,
    'ECS': 30_000,
    'Aurora': 50_000,
    'Redis': 30_000,
    'EKS': 60_000,
    'Karpenter': 40_000,
    'Lambda': 40_000,
    'Bedrock': 30_000,
    'Aurora Global DB': 80_000,
    'CloudFront': 50_000,
    'dr-configured': 30_000,
    'multi-region': 100_000,
  } as Record<string, number>,

  BASE_CAPACITY: 5_000, // base capacity before any infra
  DEFAULT_CAPACITY: 10_000,

  // Warning thresholds for capacity
  CAPACITY_WARNING_YELLOW: 0.70, // 70% usage
  CAPACITY_WARNING_RED: 0.90,    // 90% usage

  // --- Staff multipliers (graduated) ---
  STAFF_MULTIPLIERS: {
    DESIGNER_USERS: 1.5,   // was 2.0 -> now 1.5 (less binary)
    PLANNER_TRUST: 1.5,    // was 2.0 -> now 1.5
  },
  // Per-hire incremental bonus
  STAFF_HIRE_BONUS: 0.15, // each additional hire adds 0.15x

  // --- Consulting ---
  CONSULTING_CHOICE_ID: 68,
  CONSULTING_CAPACITY_MULTIPLIER: 3,

  // --- IPO conditions (defaults, overridden by difficulty) ---
  IPO_MIN_USERS: 80_000,
  IPO_MIN_CASH: 200_000_000,
  IPO_MIN_TRUST: 80,             // EPIC-08 Phase 2: 65 → 80 (NORMAL baseline)
  IPO_REQUIRED_INFRA: ['RDS', 'EKS'] as readonly string[],
  IPO_SELECTION_TURN: 950,
  IPO_FINAL_SUCCESS_TURN: 999,
  IPO_CONTINUE_CHOICE_ID: 9502,

  // --- Emergency events ---
  EMERGENCY_TURN_START: 888,
  EMERGENCY_TURN_END: 890,
  EMERGENCY_TRIGGER_NEXT_TURN: 19,
  EMERGENCY_REDIRECT_TURN: 888,

  // --- Failure thresholds (defaults, overridden by difficulty) ---
  TRUST_OUTAGE_THRESHOLD: 10,
  EQUITY_MIN_THRESHOLD: 20,
  BANKRUPTCY_THRESHOLD: -30_000_000, // was 0, now allows negative runway

  // --- Grade thresholds ---
  GRADE_THRESHOLDS: {
    S: { minUsers: 150_000, minCash: 500_000_000, minTrust: 90 },
    A: { minUsers: 100_000, minCash: 300_000_000, minTrust: 80 },
    B: { minUsers: 60_000,  minCash: 150_000_000, minTrust: 60 },
    C: { minUsers: 30_000,  minCash: 50_000_000,  minTrust: 40 },
  } as Record<string, { minUsers: number; minCash: number; minTrust: number }>,

  // --- Investment scaling ---
  // Instead of blocking, scale investment: clamp(trust / target, 0.3, 1.5)
  INVESTMENT_MIN_SCALE: 0.3,
  INVESTMENT_MAX_SCALE: 1.5,

  // --- Phase 3: Recovery & Resilience ---

  // Natural trust recovery each turn when trust is low
  TRUST_RECOVERY: {
    THRESHOLD: 30,           // trust below this triggers natural recovery
    RECOVERY_AMOUNT: 1,      // +1 trust per turn (market stabilization)
    DANGER_THRESHOLD: 15,    // below this = danger zone → faster recovery
    DANGER_RECOVERY_AMOUNT: 2, // +2 trust per turn in danger zone
    MAX_NATURAL: 30,         // natural recovery won't push trust above this
    CRISIS_RECOVERY_BONUS: 5, // EPIC-04 Feature 3: increased from 3 to 5
  },

  // Grace period before bankruptcy
  BANKRUPTCY_GRACE: {
    GRACE_TURNS: 3,          // 3 turns of negative cash before actual bankruptcy
    DEBT_INTEREST_RATE: 0.05, // 5% interest per turn on debt
  },

  // Resilience stacks from surviving capacity exceeded
  RESILIENCE: {
    CAPACITY_BONUS_PER_STACK: 0.05, // +5% capacity per stack
    MAX_STACKS: 3,                  // max 3 stacks (+15%)
    TRUST_RECOVERY_PER_STACK: 1,    // +1 trust recovery per stack
  },

  // Comeback multiplier when metrics are critically low
  COMEBACK: {
    DANGER_ZONE_RATIO: 0.30,     // below 30% of nearest victory goal
    COMEBACK_MULTIPLIER: 1.25,   // 1.25x positive effects in danger zone
  },

  // --- EPIC-04 Feature 3: Trust Recovery Mechanisms ---

  // Stable operations bonus (3 consecutive turns with capacity ≤ 80%)
  STABLE_OPERATIONS: {
    REQUIRED_TURNS: 3,           // consecutive turns needed
    CAPACITY_THRESHOLD: 0.80,    // must stay below 80% capacity
    TRUST_BONUS: 3,              // +3 trust bonus
  },

  // Transparency bonus (customer communication after outage)
  TRANSPARENCY: {
    EFFECT_MULTIPLIER: 1.5,      // 1.5x trust recovery for transparency-tagged choices
  },

  // --- EPIC-04 Feature 6: Alternative Investment Path ---

  ALTERNATIVE_INVESTMENT: {
    // Bridge financing limits
    BRIDGE_MAX_USES: 2,                 // Max 2 bridge rounds per game
    BRIDGE_FUNDING_RATIO: 0.3,          // 30% of regular series amount
    BRIDGE_EQUITY_DILUTION: 5,          // Additional 5% equity dilution

    // Government grant
    GOVERNMENT_GRANT_AMOUNT: 200_000_000,     // Fixed 2억 won
    GOVERNMENT_GRANT_TRUST_BONUS: 3,          // +3 trust (government certification)

    // Series base amounts for calculating bridge financing
    SERIES_BASE_AMOUNTS: {
      A: 1_000_000_000,    // 10억 won
      B: 10_000_000_000,   // 100억 won
      C: 50_000_000_000,   // 500억 won
    },

    // Trust threshold for triggering alternative investment options
    TRUST_THRESHOLD_RATIO: 0.6,  // If trust < 60% of required, show alternatives
  },

  // --- EPIC-08: Trust System Rebalancing ---

  // Phase 1: Trust multiplier cap (prevents extreme stacking)
  TRUST_MULTIPLIER_CAP: 2.0,  // Maximum effective multiplier for trust gains

  // Phase 3: Diminishing returns system (progressive growth curve)
  TRUST_DIMINISHING_RETURNS: {
    ENABLED: true,
    TIERS: [
      { minTrust: 0,  maxTrust: 60,  multiplier: 1.0 },   // Normal growth (0-60)
      { minTrust: 60, maxTrust: 75,  multiplier: 0.7 },   // 30% reduction (60-75)
      { minTrust: 75, maxTrust: 85,  multiplier: 0.5 },   // 50% reduction (75-85)
      { minTrust: 85, maxTrust: 100, multiplier: 0.3 },   // 70% reduction (85-100)
    ] as readonly { minTrust: number; maxTrust: number; multiplier: number }[],
  },
} as const;
