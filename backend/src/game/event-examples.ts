/**
 * Event System Usage Examples
 *
 * Demonstrates how to define and use random events with type safety.
 * These are reference examples - actual events should be stored in database or configuration.
 */

import {
  RandomEvent,
  EventType,
  EventSeverity,
  EventTriggerCondition,
  EventChoice,
  EventEffect,
} from '../common/interfaces/random-event.interface';
import { EVENT_EFFECTS, EVENT_COOLDOWNS, SPECIAL_EVENTS, EVENT_TAGS } from './event.constants';

// ---------------------------------------------------------------------------
// Example 1: Simple Positive Event
// ---------------------------------------------------------------------------

export const VIRAL_GROWTH_EVENT: RandomEvent = {
  eventId: SPECIAL_EVENTS.VIRAL_GROWTH,
  eventType: EventType.MEDIA_COVERAGE,
  severity: EventSeverity.POSITIVE,

  title: '바이럴 성장 돌파',
  description: '소셜 미디어에서 서비스가 입소문을 타며 폭발적인 성장을 기록하고 있습니다!',

  triggerCondition: {
    minTurn: 5,
    maxTurn: 15,
    minUsers: 5000,
    maxUsers: 30000,
    minTrust: 60,
    probability: 15,
    cooldownTurns: EVENT_COOLDOWNS.LONG,
  },

  autoEffect: {
    usersDelta: EVENT_EFFECTS.USERS.HIGH_GAIN,
    trustDelta: EVENT_EFFECTS.TRUST.MEDIUM_GAIN,
    cashDelta: EVENT_EFFECTS.CASH.LOW_GAIN,
  },

  choices: [],
  isOneTime: false,
  priority: 75,
  tags: [EVENT_TAGS.OPPORTUNITY, EVENT_TAGS.RANDOM],
};

// ---------------------------------------------------------------------------
// Example 2: Crisis Event with Choices
// ---------------------------------------------------------------------------

export const MAJOR_OUTAGE_EVENT: RandomEvent = {
  eventId: SPECIAL_EVENTS.MAJOR_OUTAGE,
  eventType: EventType.INFRASTRUCTURE_ISSUE,
  severity: EventSeverity.CRITICAL,

  title: '대규모 서비스 장애',
  description:
    'EC2 인스턴스가 예기치 않게 종료되어 서비스가 중단되었습니다. 빠른 대응이 필요합니다!',

  triggerCondition: {
    minTurn: 3,
    maxTurn: 20,
    requiredInfra: ['EC2'],
    excludedInfra: ['Aurora Global DB', 'multi-region'],
    capacityExceeded: true,
    probability: 30,
    cooldownTurns: EVENT_COOLDOWNS.VERY_LONG,
  },

  choices: [
    {
      choiceId: 'outage_quick_fix',
      text: '긴급 복구 (빠르지만 불안정)',
      description: 'EC2를 재시작하여 빠르게 서비스를 복구합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.MEDIUM_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.HIGH_LOSS,
      },
      cashCost: 0,
      trustCost: 0,
    },
    {
      choiceId: 'outage_proper_fix',
      text: '전문가 투입 (느리지만 안정적)',
      description: '외부 전문가를 고용하여 근본 원인을 파악하고 해결합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.HIGH_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.MEDIUM_LOSS,
        cashDelta: EVENT_EFFECTS.CASH.MEDIUM_LOSS,
        addInfrastructure: ['CloudWatch'],
      },
      cashCost: 20_000_000,
      requiredCash: 20_000_000,
    },
    {
      choiceId: 'outage_upgrade',
      text: 'Auto Scaling 도입 (고비용, 장기적 해결)',
      description: 'Auto Scaling을 구축하여 미래의 장애를 예방합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.HIGH_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.LOW_LOSS,
        cashDelta: EVENT_EFFECTS.CASH.HIGH_LOSS,
        addInfrastructure: ['Auto Scaling', 'CloudWatch'],
        maxCapacityMultiplier: 1.5,
      },
      cashCost: 50_000_000,
      requiredCash: 50_000_000,
      requiredInfra: ['RDS'],
    },
  ],

  isOneTime: false,
  priority: 100,
  tags: [EVENT_TAGS.CRISIS, EVENT_TAGS.HIGH_IMPACT],
};

// ---------------------------------------------------------------------------
// Example 3: Investor Event
// ---------------------------------------------------------------------------

export const VC_APPROACH_EVENT: RandomEvent = {
  eventId: SPECIAL_EVENTS.VC_APPROACH,
  eventType: EventType.INVESTOR_INTEREST,
  severity: EventSeverity.POSITIVE,

  title: 'VC 투자 제안',
  description:
    '유명 벤처캐피탈에서 귀사의 성장세를 주목하고 투자 의향을 밝혔습니다.',

  triggerCondition: {
    minTurn: 8,
    maxTurn: 20,
    minUsers: 10000,
    minTrust: 50,
    minCash: 30_000_000,
    difficulties: ['NORMAL', 'HARD'],
    probability: 25,
    cooldownTurns: EVENT_COOLDOWNS.MEDIUM,
  },

  choices: [
    {
      choiceId: 'vc_accept',
      text: '투자 수락 (지분 희석)',
      description: '50억 투자를 받고 지분 20%를 양도합니다.',
      effect: {
        cashDelta: 5_000_000_000,
        trustDelta: EVENT_EFFECTS.TRUST.HIGH_GAIN,
        usersDelta: EVENT_EFFECTS.USERS.MEDIUM_GAIN,
      },
      trustCost: 0,
    },
    {
      choiceId: 'vc_negotiate',
      text: '조건 협상 (더 나은 조건 시도)',
      description: '더 유리한 조건을 협상합니다. (신뢰도 70 이상 필요)',
      effect: {
        cashDelta: 5_000_000_000,
        trustDelta: EVENT_EFFECTS.TRUST.MEDIUM_GAIN,
        usersDelta: EVENT_EFFECTS.USERS.LOW_GAIN,
      },
      requiredTrust: 70,
    },
    {
      choiceId: 'vc_decline',
      text: '정중히 거절 (독립성 유지)',
      description: '지분 희석 없이 자력 성장을 선택합니다.',
      effect: {
        trustDelta: EVENT_EFFECTS.TRUST.LOW_GAIN,
      },
    },
  ],

  isOneTime: false,
  priority: 60,
  tags: [EVENT_TAGS.OPPORTUNITY, EVENT_TAGS.STORY],
};

// ---------------------------------------------------------------------------
// Example 4: Team Event with Multiple Conditions
// ---------------------------------------------------------------------------

export const TALENT_POACHING_EVENT: RandomEvent = {
  eventId: SPECIAL_EVENTS.TALENT_POACHING,
  eventType: EventType.TALENT_LOSS,
  severity: EventSeverity.HIGH,

  title: '핵심 인재 스카우트 제안',
  description:
    '경쟁사에서 핵심 개발자에게 2배 연봉을 제시하며 스카우트를 시도하고 있습니다.',

  triggerCondition: {
    minTurn: 10,
    maxTurn: 22,
    minUsers: 20000,
    minStaffCount: 2,
    requiredStaff: ['DEVELOPER'],
    difficulties: ['NORMAL', 'HARD'],
    probability: 20,
    cooldownTurns: EVENT_COOLDOWNS.MEDIUM,
  },

  choices: [
    {
      choiceId: 'poaching_match_offer',
      text: '연봉 매칭 (비용 부담)',
      description: '경쟁사 제안과 동일한 연봉을 제시하여 인재를 붙잡습니다.',
      effect: {
        cashDelta: EVENT_EFFECTS.CASH.MEDIUM_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.LOW_GAIN,
      },
      cashCost: 30_000_000,
      requiredCash: 30_000_000,
    },
    {
      choiceId: 'poaching_equity_offer',
      text: '스톡옵션 제공 (장기적 유인)',
      description: '스톡옵션을 제공하여 장기적 동기를 부여합니다.',
      effect: {
        trustDelta: EVENT_EFFECTS.TRUST.MEDIUM_GAIN,
        userAcquisitionMultiplierDelta: 0.1,
      },
      requiredTrust: 60,
    },
    {
      choiceId: 'poaching_let_go',
      text: '보내주기 (단기적 타격)',
      description: '개인의 선택을 존중하고 새로운 인재를 영입합니다.',
      effect: {
        trustDelta: EVENT_EFFECTS.TRUST.HIGH_LOSS,
        usersDelta: EVENT_EFFECTS.USERS.LOW_LOSS,
        cashDelta: EVENT_EFFECTS.CASH.LOW_LOSS,
      },
    },
  ],

  isOneTime: false,
  priority: 70,
  tags: [EVENT_TAGS.CHALLENGE, EVENT_TAGS.HIGH_IMPACT],
};

// ---------------------------------------------------------------------------
// Example 5: Difficulty-Specific Event
// ---------------------------------------------------------------------------

export const DATA_BREACH_EVENT: RandomEvent = {
  eventId: SPECIAL_EVENTS.DATA_BREACH,
  eventType: EventType.SECURITY_INCIDENT,
  severity: EventSeverity.CRITICAL,

  title: '데이터 보안 침해',
  description:
    '해커가 데이터베이스에 무단 접근을 시도했습니다. 즉각적인 보안 조치가 필요합니다!',

  triggerCondition: {
    minTurn: 12,
    maxTurn: 24,
    minUsers: 30000,
    requiredInfra: ['RDS'],
    excludedInfra: ['WAF', 'GuardDuty'],
    difficulties: ['NORMAL', 'HARD'],
    probability: 10,
    cooldownTurns: EVENT_COOLDOWNS.ONE_TIME,
  },

  choices: [
    {
      choiceId: 'breach_emergency_patch',
      text: '긴급 패치 적용',
      description: '보안 패치를 즉시 적용하지만 서비스 중단이 발생합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.CRITICAL_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.CRITICAL_LOSS,
        cashDelta: EVENT_EFFECTS.CASH.HIGH_LOSS,
      },
    },
    {
      choiceId: 'breach_security_overhaul',
      text: '전면적 보안 강화',
      description: 'WAF, GuardDuty 등 종합 보안 시스템을 구축합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.HIGH_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.HIGH_LOSS,
        cashDelta: EVENT_EFFECTS.CASH.CRITICAL_LOSS,
        addInfrastructure: ['WAF', 'GuardDuty'],
        trustMultiplierDelta: 0.2,
      },
      cashCost: 100_000_000,
      requiredCash: 100_000_000,
    },
    {
      choiceId: 'breach_pr_damage_control',
      text: 'PR 위기 관리',
      description: '피해를 최소화하고 투명하게 대응하여 신뢰를 회복합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.MEDIUM_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.MEDIUM_LOSS,
        cashDelta: EVENT_EFFECTS.CASH.MEDIUM_LOSS,
      },
      requiredTrust: 70,
    },
  ],

  isOneTime: true,
  priority: 100,
  tags: [EVENT_TAGS.CRISIS, EVENT_TAGS.HIGH_IMPACT, EVENT_TAGS.PERMANENT],
};

// ---------------------------------------------------------------------------
// Example 6: Tutorial Event (Early Game)
// ---------------------------------------------------------------------------

export const FIRST_USERS_EVENT: RandomEvent = {
  eventId: 'first_users',
  eventType: EventType.MARKET_OPPORTUNITY,
  severity: EventSeverity.POSITIVE,

  title: '첫 사용자 유입!',
  description:
    '드디어 첫 사용자들이 서비스에 가입하기 시작했습니다. 초기 성장 전략을 선택하세요.',

  triggerCondition: {
    minTurn: 2,
    maxTurn: 4,
    maxUsers: 1000,
    difficulties: ['EASY'],
    probability: 100,
  },

  choices: [
    {
      choiceId: 'first_users_organic',
      text: '오가닉 성장 집중',
      description: '광고 없이 자연스러운 성장에 집중합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.LOW_GAIN,
        trustDelta: EVENT_EFFECTS.TRUST.MEDIUM_GAIN,
      },
    },
    {
      choiceId: 'first_users_paid',
      text: '유료 마케팅 시작',
      description: '초기 마케팅 비용을 투자하여 빠르게 성장합니다.',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.MEDIUM_GAIN,
        cashDelta: EVENT_EFFECTS.CASH.LOW_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.LOW_GAIN,
      },
      cashCost: 5_000_000,
      requiredCash: 5_000_000,
    },
  ],

  isOneTime: true,
  priority: 90,
  tags: [EVENT_TAGS.TUTORIAL, EVENT_TAGS.MILESTONE],
};

// ---------------------------------------------------------------------------
// Export all example events
// ---------------------------------------------------------------------------

export const EXAMPLE_EVENTS: RandomEvent[] = [
  VIRAL_GROWTH_EVENT,
  MAJOR_OUTAGE_EVENT,
  VC_APPROACH_EVENT,
  TALENT_POACHING_EVENT,
  DATA_BREACH_EVENT,
  FIRST_USERS_EVENT,
];

// ---------------------------------------------------------------------------
// Helper Functions for Event Validation
// ---------------------------------------------------------------------------

/**
 * Validates if an event can trigger based on game state
 */
export function canEventTrigger(
  event: RandomEvent,
  gameState: {
    currentTurn: number;
    users: number;
    cash: number;
    trust: number;
    infrastructure: string[];
    hiredStaff: string[];
    difficultyMode: string;
    capacityExceeded?: boolean;
    investmentFailed?: boolean;
    multiChoiceEnabled?: boolean;
  },
): boolean {
  const condition = event.triggerCondition;

  // Turn range check
  if (condition.minTurn && gameState.currentTurn < condition.minTurn) return false;
  if (condition.maxTurn && gameState.currentTurn > condition.maxTurn) return false;

  // User thresholds
  if (condition.minUsers && gameState.users < condition.minUsers) return false;
  if (condition.maxUsers && gameState.users > condition.maxUsers) return false;

  // Cash thresholds
  if (condition.minCash && gameState.cash < condition.minCash) return false;
  if (condition.maxCash && gameState.cash > condition.maxCash) return false;

  // Trust thresholds
  if (condition.minTrust && gameState.trust < condition.minTrust) return false;
  if (condition.maxTrust && gameState.trust > condition.maxTrust) return false;

  // Infrastructure checks
  if (condition.requiredInfra) {
    const hasAllRequired = condition.requiredInfra.every((infra) =>
      gameState.infrastructure.includes(infra),
    );
    if (!hasAllRequired) return false;
  }

  if (condition.excludedInfra) {
    const hasExcluded = condition.excludedInfra.some((infra) =>
      gameState.infrastructure.includes(infra),
    );
    if (hasExcluded) return false;
  }

  if (
    condition.minInfraCount &&
    gameState.infrastructure.length < condition.minInfraCount
  )
    return false;
  if (
    condition.maxInfraCount &&
    gameState.infrastructure.length > condition.maxInfraCount
  )
    return false;

  // Staff checks
  if (condition.requiredStaff) {
    const hasAllRequired = condition.requiredStaff.every((staff) =>
      gameState.hiredStaff.includes(staff),
    );
    if (!hasAllRequired) return false;
  }

  if (
    condition.minStaffCount &&
    gameState.hiredStaff.length < condition.minStaffCount
  )
    return false;

  // Game state flags
  if (
    condition.capacityExceeded !== undefined &&
    gameState.capacityExceeded !== condition.capacityExceeded
  )
    return false;
  if (
    condition.investmentFailed !== undefined &&
    gameState.investmentFailed !== condition.investmentFailed
  )
    return false;
  if (
    condition.multiChoiceEnabled !== undefined &&
    gameState.multiChoiceEnabled !== condition.multiChoiceEnabled
  )
    return false;

  // Difficulty check
  if (
    condition.difficulties &&
    !condition.difficulties.includes(gameState.difficultyMode as any)
  )
    return false;

  return true;
}

/**
 * Calculates actual probability considering game state
 */
export function calculateEventProbability(
  event: RandomEvent,
  gameState: {
    trust: number;
    capacityExceeded?: boolean;
    currentTurn: number;
  },
): number {
  let baseProbability = event.triggerCondition.probability || 50;

  // Adjust based on trust
  if (gameState.trust < 30 && event.severity === EventSeverity.CRITICAL) {
    baseProbability *= 1.5;
  } else if (gameState.trust > 70 && event.severity === EventSeverity.POSITIVE) {
    baseProbability *= 1.5;
  }

  // Adjust based on capacity
  if (
    gameState.capacityExceeded &&
    event.eventType === EventType.INFRASTRUCTURE_ISSUE
  ) {
    baseProbability *= 2.0;
  }

  // Adjust based on game phase
  if (gameState.currentTurn <= 8) {
    baseProbability *= 0.5;
  } else if (gameState.currentTurn >= 17) {
    baseProbability *= 1.5;
  }

  return Math.min(100, Math.max(0, baseProbability));
}
