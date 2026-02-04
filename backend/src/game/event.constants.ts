/**
 * Event System Constants
 *
 * Defines event types, special turn numbers, and event-related thresholds.
 * Centralized constants for the random event system.
 */

import { EventType, EventSeverity } from '../common/interfaces/random-event.interface';

// ---------------------------------------------------------------------------
// Event Turn Numbers
// ---------------------------------------------------------------------------

export const EVENT_TURNS = {
  // Early game events (turns 1-8)
  EARLY_GAME_START: 1,
  EARLY_GAME_END: 8,

  // Mid game events (turns 9-16)
  MID_GAME_START: 9,
  MID_GAME_END: 16,

  // Late game events (turns 17-25)
  LATE_GAME_START: 17,
  LATE_GAME_END: 25,

  // Special event turns
  FIRST_MILESTONE: 5,
  SERIES_A_WINDOW: 12,
  GROWTH_CRISIS: 15,
  SERIES_B_WINDOW: 18,
  PRE_IPO: 23,
  IPO_DECISION: 950,
  IPO_FINAL: 999,

  // Emergency events
  EMERGENCY_START: 888,
  EMERGENCY_END: 890,
} as const;

// ---------------------------------------------------------------------------
// Event Type Categories
// ---------------------------------------------------------------------------

export const EVENT_CATEGORIES = {
  BUSINESS: [
    EventType.MARKET_OPPORTUNITY,
    EventType.COMPETITOR_ACTION,
    EventType.MEDIA_COVERAGE,
    EventType.PARTNERSHIP_OFFER,
  ],
  TECHNICAL: [
    EventType.INFRASTRUCTURE_ISSUE,
    EventType.SECURITY_INCIDENT,
    EventType.PERFORMANCE_ISSUE,
    EventType.DATA_LOSS,
  ],
  MARKET: [
    EventType.ECONOMIC_CHANGE,
    EventType.REGULATORY_CHANGE,
    EventType.INVESTOR_INTEREST,
  ],
  TEAM: [
    EventType.KEY_HIRE,
    EventType.TEAM_CONFLICT,
    EventType.TALENT_LOSS,
  ],
} as const;

// ---------------------------------------------------------------------------
// Event Probability Modifiers
// ---------------------------------------------------------------------------

export const EVENT_PROBABILITY = {
  // Base probabilities by severity
  BASE_PROBABILITY: {
    [EventSeverity.CRITICAL]: 5,   // 5% base
    [EventSeverity.HIGH]: 15,      // 15% base
    [EventSeverity.MEDIUM]: 30,    // 30% base
    [EventSeverity.LOW]: 50,       // 50% base
    [EventSeverity.POSITIVE]: 25,  // 25% base
  },

  // Multipliers based on game state
  STATE_MULTIPLIERS: {
    // When trust is low, increase negative event probability
    LOW_TRUST_THRESHOLD: 30,
    LOW_TRUST_NEGATIVE_MULTIPLIER: 1.5,

    // When trust is high, increase positive event probability
    HIGH_TRUST_THRESHOLD: 70,
    HIGH_TRUST_POSITIVE_MULTIPLIER: 1.5,

    // When capacity exceeded, technical events more likely
    CAPACITY_EXCEEDED_TECH_MULTIPLIER: 2.0,

    // When investment failed, market events more likely
    INVESTMENT_FAILED_MARKET_MULTIPLIER: 1.8,

    // Early game has fewer events
    EARLY_GAME_MULTIPLIER: 0.5,

    // Late game has more events
    LATE_GAME_MULTIPLIER: 1.5,
  },

  // Max events per turn
  MAX_EVENTS_PER_TURN: 2,

  // Min turns between same event
  DEFAULT_COOLDOWN: 5,
} as const;

// ---------------------------------------------------------------------------
// Event Effect Thresholds
// ---------------------------------------------------------------------------

export const EVENT_EFFECTS = {
  // User impact ranges
  USERS: {
    CRITICAL_LOSS: -50000,    // Massive user loss
    HIGH_LOSS: -20000,        // Significant loss
    MEDIUM_LOSS: -5000,       // Moderate loss
    LOW_LOSS: -1000,          // Minor loss
    LOW_GAIN: 2000,           // Minor gain
    MEDIUM_GAIN: 10000,       // Moderate gain
    HIGH_GAIN: 30000,         // Significant gain
    CRITICAL_GAIN: 80000,     // Massive gain
  },

  // Cash impact ranges
  CASH: {
    CRITICAL_LOSS: -100_000_000,   // 1억 손실
    HIGH_LOSS: -30_000_000,        // 3천만 손실
    MEDIUM_LOSS: -10_000_000,      // 1천만 손실
    LOW_LOSS: -3_000_000,          // 3백만 손실
    LOW_GAIN: 5_000_000,           // 5백만 수익
    MEDIUM_GAIN: 20_000_000,       // 2천만 수익
    HIGH_GAIN: 80_000_000,         // 8천만 수익
    CRITICAL_GAIN: 300_000_000,    // 3억 수익
  },

  // Trust impact ranges
  TRUST: {
    CRITICAL_LOSS: -30,       // Catastrophic
    HIGH_LOSS: -15,           // Severe
    MEDIUM_LOSS: -8,          // Moderate
    LOW_LOSS: -3,             // Minor
    LOW_GAIN: 5,              // Minor gain
    MEDIUM_GAIN: 10,          // Moderate gain
    HIGH_GAIN: 20,            // Significant gain
    CRITICAL_GAIN: 35,        // Exceptional
  },

  // Multiplier ranges
  MULTIPLIER: {
    SEVERE_PENALTY: 0.5,      // Half effectiveness
    MODERATE_PENALTY: 0.75,   // 25% reduction
    MINOR_PENALTY: 0.9,       // 10% reduction
    MINOR_BONUS: 1.1,         // 10% bonus
    MODERATE_BONUS: 1.3,      // 30% bonus
    SIGNIFICANT_BONUS: 1.5,   // 50% bonus
  },
} as const;

// ---------------------------------------------------------------------------
// Event Cooldown Settings
// ---------------------------------------------------------------------------

export const EVENT_COOLDOWNS = {
  ONE_TIME: -1,              // Event can only occur once
  NO_COOLDOWN: 0,            // Event can occur every turn
  SHORT: 3,                  // 3 turns cooldown
  MEDIUM: 5,                 // 5 turns cooldown
  LONG: 8,                   // 8 turns cooldown
  VERY_LONG: 12,             // 12 turns cooldown
} as const;

// ---------------------------------------------------------------------------
// Special Event IDs
// ---------------------------------------------------------------------------

export const SPECIAL_EVENTS = {
  // Critical infrastructure events
  MAJOR_OUTAGE: 'major_outage',
  DATA_BREACH: 'data_breach',
  DDOS_ATTACK: 'ddos_attack',

  // Positive milestone events
  VIRAL_GROWTH: 'viral_growth',
  TECH_AWARD: 'tech_award',
  MEDIA_SPOTLIGHT: 'media_spotlight',

  // Investor events
  VC_APPROACH: 'vc_approach',
  ACQUISITION_OFFER: 'acquisition_offer',
  STRATEGIC_PARTNERSHIP: 'strategic_partnership',

  // Team events
  KEY_EMPLOYEE_LEAVES: 'key_employee_leaves',
  TALENT_POACHING: 'talent_poaching',
  STAR_HIRE: 'star_hire',

  // Market events
  COMPETITOR_FUNDING: 'competitor_funding',
  MARKET_CRASH: 'market_crash',
  REGULATORY_APPROVAL: 'regulatory_approval',
} as const;

// ---------------------------------------------------------------------------
// Event Tag Categories
// ---------------------------------------------------------------------------

export const EVENT_TAGS = {
  // Impact tags
  HIGH_IMPACT: 'high_impact',
  LOW_IMPACT: 'low_impact',
  PERMANENT: 'permanent',
  TEMPORARY: 'temporary',

  // Type tags
  CRISIS: 'crisis',
  OPPORTUNITY: 'opportunity',
  MILESTONE: 'milestone',
  CHALLENGE: 'challenge',

  // Gameplay tags
  TUTORIAL: 'tutorial',
  STORY: 'story',
  RANDOM: 'random',
  SCRIPTED: 'scripted',
} as const;

// ---------------------------------------------------------------------------
// Event Priority Levels
// ---------------------------------------------------------------------------

export const EVENT_PRIORITY = {
  CRITICAL: 100,    // Always trigger if conditions met
  HIGH: 75,         // High priority
  NORMAL: 50,       // Normal priority
  LOW: 25,          // Low priority
  BACKGROUND: 10,   // Background events
} as const;

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type EventTurnNumber = (typeof EVENT_TURNS)[keyof typeof EVENT_TURNS];
export type SpecialEventId = (typeof SPECIAL_EVENTS)[keyof typeof SPECIAL_EVENTS];
export type EventTag = (typeof EVENT_TAGS)[keyof typeof EVENT_TAGS];
export type EventPriority = (typeof EVENT_PRIORITY)[keyof typeof EVENT_PRIORITY];
