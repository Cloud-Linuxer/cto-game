/**
 * Random Event System Interfaces
 *
 * Type-safe interfaces for random events that can occur during gameplay.
 * Events are triggered based on game state conditions and affect metrics.
 */

import { DifficultyMode } from '../../game/game-constants';

/**
 * Event types categorized by impact area
 */
export enum EventType {
  // Business events
  MARKET_OPPORTUNITY = 'MARKET_OPPORTUNITY',
  COMPETITOR_ACTION = 'COMPETITOR_ACTION',
  MEDIA_COVERAGE = 'MEDIA_COVERAGE',
  PARTNERSHIP_OFFER = 'PARTNERSHIP_OFFER',

  // Technical events
  INFRASTRUCTURE_ISSUE = 'INFRASTRUCTURE_ISSUE',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  PERFORMANCE_ISSUE = 'PERFORMANCE_ISSUE',
  DATA_LOSS = 'DATA_LOSS',

  // Market events
  ECONOMIC_CHANGE = 'ECONOMIC_CHANGE',
  REGULATORY_CHANGE = 'REGULATORY_CHANGE',
  INVESTOR_INTEREST = 'INVESTOR_INTEREST',

  // Team events
  KEY_HIRE = 'KEY_HIRE',
  TEAM_CONFLICT = 'TEAM_CONFLICT',
  TALENT_LOSS = 'TALENT_LOSS',
}

/**
 * Event severity levels
 */
export enum EventSeverity {
  CRITICAL = 'CRITICAL',    // Major impact, requires immediate attention
  HIGH = 'HIGH',            // Significant impact
  MEDIUM = 'MEDIUM',        // Moderate impact
  LOW = 'LOW',              // Minor impact
  POSITIVE = 'POSITIVE',    // Beneficial event
}

/**
 * Event trigger conditions
 * Defines when an event can occur based on game state
 */
export interface EventTriggerCondition {
  // Turn range
  minTurn?: number;
  maxTurn?: number;

  // User thresholds
  minUsers?: number;
  maxUsers?: number;

  // Cash thresholds
  minCash?: number;
  maxCash?: number;

  // Trust thresholds
  minTrust?: number;
  maxTrust?: number;

  // Infrastructure requirements
  requiredInfra?: string[];
  excludedInfra?: string[];
  minInfraCount?: number;
  maxInfraCount?: number;

  // Staff requirements
  requiredStaff?: string[];
  minStaffCount?: number;

  // Game state
  capacityExceeded?: boolean;
  investmentFailed?: boolean;
  multiChoiceEnabled?: boolean;

  // Difficulty-specific
  difficulties?: DifficultyMode[];

  // Probability (0-100)
  probability?: number;

  // Cooldown (turns before event can trigger again)
  cooldownTurns?: number;
}

/**
 * Effect on game metrics
 */
export interface EventEffect {
  // User impact
  usersDelta?: number;
  usersMultiplier?: number;

  // Cash impact
  cashDelta?: number;
  cashMultiplier?: number;

  // Trust impact
  trustDelta?: number;
  trustMultiplier?: number;

  // Infrastructure changes
  addInfrastructure?: string[];
  removeInfrastructure?: string[];

  // Capacity changes
  maxCapacityDelta?: number;
  maxCapacityMultiplier?: number;

  // Multiplier effects
  userAcquisitionMultiplierDelta?: number;
  trustMultiplierDelta?: number;

  // Special effects
  forceNextTurn?: number;
  endGame?: boolean;
  setStatus?: string;
}

/**
 * Player choice in response to event
 */
export interface EventChoice {
  choiceId: string;
  text: string;
  description?: string;

  // Effects of choosing this option
  effect: EventEffect;

  // Additional costs
  cashCost?: number;
  trustCost?: number;

  // Requirements to select this choice
  requiredCash?: number;
  requiredTrust?: number;
  requiredInfra?: string[];
  requiredStaff?: string[];
}

/**
 * Complete random event definition
 */
export interface RandomEvent {
  // Identification
  eventId: string;
  eventType: EventType;
  severity: EventSeverity;

  // Display text
  title: string;
  description: string;

  // Trigger conditions
  triggerCondition: EventTriggerCondition;

  // Player choices
  choices: EventChoice[];

  // Automatic effect (if no choices)
  autoEffect?: EventEffect;

  // Metadata
  isOneTime?: boolean;
  priority?: number;
  tags?: string[];
}

/**
 * Difficulty-specific event configuration
 * Allows events to scale with difficulty
 */
export interface DifficultyEventConfig {
  difficulty: DifficultyMode;
  eventId: string;

  // Override trigger conditions
  triggerCondition?: Partial<EventTriggerCondition>;

  // Override effects
  effectMultiplier?: number;

  // Override probability
  probability?: number;
}
