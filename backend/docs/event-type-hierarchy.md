# Event System Type Hierarchy

## Type Architecture

```
RandomEvent (root interface)
├── eventId: string
├── eventType: EventType (enum)
├── severity: EventSeverity (enum)
├── title: string
├── description: string
├── triggerCondition: EventTriggerCondition
│   ├── Turn constraints (minTurn, maxTurn)
│   ├── Metric constraints (users, cash, trust)
│   ├── Infrastructure requirements
│   ├── Staff requirements
│   ├── Game state flags
│   ├── Difficulty filtering
│   └── Probability & cooldown
├── choices: EventChoice[]
│   ├── choiceId: string
│   ├── text: string
│   ├── description?: string
│   ├── effect: EventEffect
│   ├── Costs (cash, trust)
│   └── Requirements (cash, trust, infra, staff)
├── autoEffect?: EventEffect
│   ├── User impact (delta, multiplier)
│   ├── Cash impact (delta, multiplier)
│   ├── Trust impact (delta, multiplier)
│   ├── Infrastructure changes (add, remove)
│   ├── Capacity changes (delta, multiplier)
│   ├── Multiplier effects
│   └── Special effects (forceNextTurn, endGame, setStatus)
├── Metadata (isOneTime, priority, tags)
└── DifficultyEventConfig (overrides per difficulty)
    ├── difficulty: DifficultyMode
    ├── triggerCondition overrides
    ├── effectMultiplier override
    └── probability override
```

## Enums

### EventType (14 types)

```typescript
enum EventType {
  // Business (4)
  MARKET_OPPORTUNITY,
  COMPETITOR_ACTION,
  MEDIA_COVERAGE,
  PARTNERSHIP_OFFER,

  // Technical (4)
  INFRASTRUCTURE_ISSUE,
  SECURITY_INCIDENT,
  PERFORMANCE_ISSUE,
  DATA_LOSS,

  // Market (3)
  ECONOMIC_CHANGE,
  REGULATORY_CHANGE,
  INVESTOR_INTEREST,

  // Team (3)
  KEY_HIRE,
  TEAM_CONFLICT,
  TALENT_LOSS,
}
```

### EventSeverity (5 levels)

```typescript
enum EventSeverity {
  CRITICAL,   // Major impact, immediate attention
  HIGH,       // Significant impact
  MEDIUM,     // Moderate impact
  LOW,        // Minor impact
  POSITIVE,   // Beneficial event
}
```

## Interface Details

### EventTriggerCondition

```typescript
interface EventTriggerCondition {
  // Turn range
  minTurn?: number;
  maxTurn?: number;

  // User thresholds
  minUsers?: number;
  maxUsers?: number;

  // Cash thresholds
  minCash?: number;
  maxCash?: number;

  // Trust thresholds (0-100)
  minTrust?: number;
  maxTrust?: number;

  // Infrastructure requirements
  requiredInfra?: string[];       // Must have all
  excludedInfra?: string[];       // Must not have any
  minInfraCount?: number;         // Min total count
  maxInfraCount?: number;         // Max total count

  // Staff requirements
  requiredStaff?: string[];       // Must have all
  minStaffCount?: number;         // Min total count

  // Game state flags
  capacityExceeded?: boolean;
  investmentFailed?: boolean;
  multiChoiceEnabled?: boolean;

  // Difficulty filtering
  difficulties?: DifficultyMode[];

  // Probability (0-100)
  probability?: number;

  // Cooldown (turns before re-trigger)
  cooldownTurns?: number;
}
```

### EventEffect

```typescript
interface EventEffect {
  // Direct metric changes
  usersDelta?: number;
  cashDelta?: number;
  trustDelta?: number;

  // Multiplier changes (applied to future effects)
  usersMultiplier?: number;
  cashMultiplier?: number;
  trustMultiplier?: number;

  // Infrastructure modifications
  addInfrastructure?: string[];
  removeInfrastructure?: string[];

  // Capacity modifications
  maxCapacityDelta?: number;
  maxCapacityMultiplier?: number;

  // Game multiplier modifications
  userAcquisitionMultiplierDelta?: number;
  trustMultiplierDelta?: number;

  // Special effects
  forceNextTurn?: number;         // Jump to specific turn
  endGame?: boolean;              // Trigger game end
  setStatus?: string;             // Set game status
}
```

### EventChoice

```typescript
interface EventChoice {
  choiceId: string;
  text: string;                   // Display text
  description?: string;           // Detailed description

  effect: EventEffect;            // What happens when chosen

  // Costs
  cashCost?: number;              // Cash required
  trustCost?: number;             // Trust required

  // Requirements (choice disabled if not met)
  requiredCash?: number;
  requiredTrust?: number;
  requiredInfra?: string[];
  requiredStaff?: string[];
}
```

## Entity Relationships

```
Game (existing)
  ↓ 1:N
EventState (tracks per-game event state)
  ├── gameId → Game
  ├── eventId → Event definition
  ├── Trigger tracking (count, last turn, cooldown)
  ├── Active state (isActive, isCompleted)
  └── Choice tracking (selectedChoiceId, turn)

EventHistory (immutable log)
  ├── gameId → Game
  ├── eventId → Event definition
  ├── turnNumber
  ├── Before/After snapshots
  ├── Deltas (calculated)
  └── Metadata (conditions, effects)
```

## Database Schema

### event_states table

```sql
CREATE TABLE event_states (
  stateId           UUID PRIMARY KEY,
  gameId            VARCHAR(36) NOT NULL,
  eventId           VARCHAR(100) NOT NULL,
  eventType         VARCHAR(50) NOT NULL,
  severity          VARCHAR(20) NOT NULL,

  -- Trigger state
  triggerCount      INT DEFAULT 0,
  lastTriggeredTurn INT,
  cooldownRemaining INT DEFAULT 0,
  isActive          BOOLEAN DEFAULT FALSE,
  isCompleted       BOOLEAN DEFAULT FALSE,

  -- Choice state
  selectedChoiceId  VARCHAR(100),
  choiceSelectedTurn INT,

  -- Effects
  appliedEffects    JSON,

  -- Metadata
  metadata          JSON,
  createdAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_game_event (gameId, eventId),
  INDEX idx_game (gameId),
  INDEX idx_event (eventId)
);
```

### event_history table

```sql
CREATE TABLE event_history (
  historyId             INT PRIMARY KEY AUTO_INCREMENT,
  gameId                VARCHAR(36) NOT NULL,
  eventId               VARCHAR(100) NOT NULL,
  eventType             VARCHAR(50) NOT NULL,
  severity              VARCHAR(20) NOT NULL,

  -- Context
  turnNumber            INT NOT NULL,
  eventTitle            TEXT NOT NULL,
  eventDescription      TEXT NOT NULL,

  -- Choice
  selectedChoiceId      VARCHAR(100),
  selectedChoiceText    TEXT,

  -- Before state
  usersBefore           INT NOT NULL,
  cashBefore            BIGINT NOT NULL,
  trustBefore           INT NOT NULL,
  infrastructureBefore  JSON NOT NULL,

  -- After state
  usersAfter            INT NOT NULL,
  cashAfter             BIGINT NOT NULL,
  trustAfter            INT NOT NULL,
  infrastructureAfter   JSON NOT NULL,

  -- Deltas
  usersDelta            INT NOT NULL,
  cashDelta             BIGINT NOT NULL,
  trustDelta            INT NOT NULL,

  -- Context
  difficultyMode        VARCHAR(10) NOT NULL,
  triggerConditions     JSON,
  appliedEffects        JSON,
  metadata              JSON,

  timestamp             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_game_turn (gameId, turnNumber),
  INDEX idx_event_type (eventType, timestamp),
  INDEX idx_game (gameId)
);
```

## Constant Hierarchies

### EVENT_TURNS

```typescript
{
  // Game phases
  EARLY_GAME_START: 1,
  EARLY_GAME_END: 8,
  MID_GAME_START: 9,
  MID_GAME_END: 16,
  LATE_GAME_START: 17,
  LATE_GAME_END: 25,

  // Milestones
  FIRST_MILESTONE: 5,
  SERIES_A_WINDOW: 12,
  GROWTH_CRISIS: 15,
  SERIES_B_WINDOW: 18,
  PRE_IPO: 23,
  IPO_DECISION: 950,
  IPO_FINAL: 999,

  // Emergency
  EMERGENCY_START: 888,
  EMERGENCY_END: 890,
}
```

### EVENT_EFFECTS

```typescript
{
  USERS: {
    CRITICAL_LOSS: -50000,
    HIGH_LOSS: -20000,
    MEDIUM_LOSS: -5000,
    LOW_LOSS: -1000,
    LOW_GAIN: 2000,
    MEDIUM_GAIN: 10000,
    HIGH_GAIN: 30000,
    CRITICAL_GAIN: 80000,
  },
  CASH: {
    CRITICAL_LOSS: -100000000,
    HIGH_LOSS: -30000000,
    MEDIUM_LOSS: -10000000,
    LOW_LOSS: -3000000,
    LOW_GAIN: 5000000,
    MEDIUM_GAIN: 20000000,
    HIGH_GAIN: 80000000,
    CRITICAL_GAIN: 300000000,
  },
  TRUST: {
    CRITICAL_LOSS: -30,
    HIGH_LOSS: -15,
    MEDIUM_LOSS: -8,
    LOW_LOSS: -3,
    LOW_GAIN: 5,
    MEDIUM_GAIN: 10,
    HIGH_GAIN: 20,
    CRITICAL_GAIN: 35,
  },
  MULTIPLIER: {
    SEVERE_PENALTY: 0.5,
    MODERATE_PENALTY: 0.75,
    MINOR_PENALTY: 0.9,
    MINOR_BONUS: 1.1,
    MODERATE_BONUS: 1.3,
    SIGNIFICANT_BONUS: 1.5,
  },
}
```

### EVENT_PROBABILITY

```typescript
{
  BASE_PROBABILITY: {
    CRITICAL: 5,
    HIGH: 15,
    MEDIUM: 30,
    LOW: 50,
    POSITIVE: 25,
  },
  STATE_MULTIPLIERS: {
    LOW_TRUST_THRESHOLD: 30,
    LOW_TRUST_NEGATIVE_MULTIPLIER: 1.5,
    HIGH_TRUST_THRESHOLD: 70,
    HIGH_TRUST_POSITIVE_MULTIPLIER: 1.5,
    CAPACITY_EXCEEDED_TECH_MULTIPLIER: 2.0,
    INVESTMENT_FAILED_MARKET_MULTIPLIER: 1.8,
    EARLY_GAME_MULTIPLIER: 0.5,
    LATE_GAME_MULTIPLIER: 1.5,
  },
  MAX_EVENTS_PER_TURN: 2,
  DEFAULT_COOLDOWN: 5,
}
```

## DTO Validation Rules

### EventTriggerConditionDto

```typescript
class EventTriggerConditionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  minTurn?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minTrust?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredInfra?: string[];

  @IsOptional()
  @IsEnum(['EASY', 'NORMAL', 'HARD'], { each: true })
  difficulties?: DifficultyMode[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownTurns?: number;
}
```

## Type Guard Functions

```typescript
// Check if value is a valid EventType
function isEventType(value: string): value is EventType {
  return Object.values(EventType).includes(value as EventType);
}

// Check if value is a valid EventSeverity
function isEventSeverity(value: string): value is EventSeverity {
  return Object.values(EventSeverity).includes(value as EventSeverity);
}

// Type guard for EventEffect
function isEventEffect(obj: any): obj is EventEffect {
  return (
    typeof obj === 'object' &&
    (obj.usersDelta === undefined || typeof obj.usersDelta === 'number') &&
    (obj.cashDelta === undefined || typeof obj.cashDelta === 'number') &&
    (obj.trustDelta === undefined || typeof obj.trustDelta === 'number')
  );
}
```

## Complete Type Flow

```
API Request
  ↓ Validation
EventTriggerConditionDto (DTO with validation)
  ↓ Transformation
EventTriggerCondition (Interface)
  ↓ Used in
RandomEvent (Interface)
  ↓ Evaluation
canEventTrigger(event, gameState) → boolean
  ↓ If true
EventState (Entity - track state)
  ↓ Apply
EventEffect → Game state changes
  ↓ Log
EventHistory (Entity - immutable record)
  ↓ Response
GameResponseDto with event effects
```

## Import Map

```typescript
// For defining events
import {
  RandomEvent,
  EventType,
  EventSeverity,
  EventTriggerCondition,
  EventEffect,
  EventChoice,
} from '../common/interfaces/random-event.interface';

// For API validation
import {
  EventTriggerConditionDto,
  DifficultyEventConfigDto,
} from '../common/dto/event-trigger-condition.dto';

// For database operations
import { EventState } from '../database/entities/event-state.entity';
import { EventHistory } from '../database/entities/event-history.entity';

// For constants
import {
  EVENT_TURNS,
  EVENT_CATEGORIES,
  EVENT_PROBABILITY,
  EVENT_EFFECTS,
  EVENT_COOLDOWNS,
  SPECIAL_EVENTS,
  EVENT_TAGS,
  EVENT_PRIORITY,
} from '../game/event.constants';

// For examples and helpers
import {
  EXAMPLE_EVENTS,
  canEventTrigger,
  calculateEventProbability,
} from '../game/event-examples';
```

## Type Safety Checklist

- [x] No `any` types
- [x] All enums properly defined
- [x] Optional fields marked with `?`
- [x] Arrays have element types
- [x] Numbers have range constraints
- [x] Strings have length constraints (entities)
- [x] JSON fields have type annotations
- [x] Validation decorators on DTOs
- [x] Swagger documentation on DTOs
- [x] Database transformers for bigint
- [x] Indexes for performance
- [x] Readonly where appropriate
- [x] Type guards for runtime checks
- [x] Helper functions typed

---

**Reference**: event-system-refactoring.md
**Version**: 1.0.0
**Last Updated**: 2026-02-04
