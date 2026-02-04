# Event System Type-Safe Refactoring

## Overview

This document describes the type-safe refactoring of the event system data structures. All types are now strictly defined with TypeScript, validated with class-validator, and documented with Swagger decorators.

## Created Files

### 1. Interface Definition

**File**: `src/common/interfaces/random-event.interface.ts`

Type-safe interfaces for the random event system:

- `EventType` enum - 14 categorized event types (MARKET_OPPORTUNITY, INFRASTRUCTURE_ISSUE, etc.)
- `EventSeverity` enum - 5 severity levels (CRITICAL, HIGH, MEDIUM, LOW, POSITIVE)
- `EventTriggerCondition` interface - Comprehensive trigger conditions
- `EventEffect` interface - Game metric effects
- `EventChoice` interface - Player choice options
- `RandomEvent` interface - Complete event definition
- `DifficultyEventConfig` interface - Difficulty-specific overrides

**Key Features**:
- Zero `any` types - 100% type safe
- Optional fields properly typed
- Readonly arrays where appropriate
- Comprehensive documentation

### 2. Validation DTOs

**File**: `src/common/dto/event-trigger-condition.dto.ts`

Request validation with class-validator decorators:

- `EventTriggerConditionDto` - Validates all trigger conditions
- `DifficultyEventConfigDto` - Validates difficulty configs
- Swagger API documentation
- Range validation (Min/Max)
- Array validation
- Enum validation

**Validation Examples**:
```typescript
@IsInt()
@Min(0)
@Max(100)
minTrust?: number;

@IsArray()
@IsString({ each: true })
requiredInfra?: string[];

@IsEnum(['EASY', 'NORMAL', 'HARD'], { each: true })
difficulties?: DifficultyMode[];
```

### 3. Event State Entity

**File**: `src/database/entities/event-state.entity.ts`

Tracks event state per game instance:

**Fields**:
- `stateId` (UUID) - Primary key
- `gameId`, `eventId` - Indexed for fast lookups
- `eventType`, `severity` - Event classification
- `triggerCount`, `lastTriggeredTurn` - Trigger tracking
- `cooldownRemaining` - Cooldown management
- `isActive`, `isCompleted` - State flags
- `selectedChoiceId`, `choiceSelectedTurn` - Player choice tracking
- `appliedEffects` - JSON effects log
- `metadata` - Extensible metadata
- `createdAt`, `updatedAt` - Timestamps

**Indexes**:
- Composite index on `(gameId, eventId)` for efficient queries
- Individual indexes on `gameId` and `eventId`

### 4. Event History Entity

**File**: `src/database/entities/event-history.entity.ts`

Immutable log of all event occurrences:

**Fields**:
- `historyId` - Auto-increment primary key
- `gameId`, `turnNumber` - Context
- Event details (id, type, severity, title, description)
- Player choice (id, text)
- Before state (users, cash, trust, infrastructure)
- After state (users, cash, trust, infrastructure)
- Deltas (calculated for analytics)
- Difficulty context
- Trigger conditions snapshot
- Applied effects snapshot
- Metadata

**Indexes**:
- Composite index on `(gameId, turnNumber)` for timeline queries
- Index on `(eventType, createdAt)` for analytics

**Use Cases**:
- Game replay functionality
- Analytics and reporting
- Debugging event logic
- Player history viewing

### 5. Event Constants

**File**: `src/game/event.constants.ts`

Centralized event system constants:

**Sections**:

1. **Event Turn Numbers**
   - Game phase definitions (early/mid/late game)
   - Special event turns (milestones, investments, IPO)
   - Emergency event turns

2. **Event Type Categories**
   - BUSINESS events (4 types)
   - TECHNICAL events (4 types)
   - MARKET events (3 types)
   - TEAM events (3 types)

3. **Event Probability Modifiers**
   - Base probabilities by severity
   - State-based multipliers (trust, capacity, phase)
   - Max events per turn limits
   - Default cooldown settings

4. **Event Effect Thresholds**
   - User impact ranges (8 levels: CRITICAL_LOSS to CRITICAL_GAIN)
   - Cash impact ranges (8 levels with actual KRW amounts)
   - Trust impact ranges (8 levels: -30 to +35)
   - Multiplier ranges (6 levels: 0.5x to 1.5x)

5. **Event Cooldown Settings**
   - ONE_TIME (-1), NO_COOLDOWN (0), SHORT (3), MEDIUM (5), LONG (8), VERY_LONG (12)

6. **Special Event IDs**
   - 15 predefined special events (major_outage, viral_growth, etc.)

7. **Event Tag Categories**
   - Impact tags, Type tags, Gameplay tags

8. **Event Priority Levels**
   - CRITICAL (100) to BACKGROUND (10)

### 6. Event Examples

**File**: `src/game/event-examples.ts`

Comprehensive examples demonstrating event system usage:

**6 Example Events**:

1. **VIRAL_GROWTH_EVENT** - Simple positive event with auto-effect
2. **MAJOR_OUTAGE_EVENT** - Crisis with 3 player choices (quick fix, proper fix, upgrade)
3. **VC_APPROACH_EVENT** - Investor event with conditional choices
4. **TALENT_POACHING_EVENT** - Team event with staff requirements
5. **DATA_BREACH_EVENT** - Critical one-time event with difficulty filtering
6. **FIRST_USERS_EVENT** - Tutorial event for easy mode

**Helper Functions**:
- `canEventTrigger()` - Validates if event can trigger based on game state
- `calculateEventProbability()` - Calculates actual probability with modifiers

## Type Safety Achievements

### 1. No `any` Types
All types are explicitly defined. No implicit any or explicit any types.

### 2. Strict TypeScript Compliance
- All enums properly typed
- Optional fields marked with `?`
- Readonly arrays where applicable
- Proper transformer functions for bigint

### 3. Validation Coverage
- Range validation (Min/Max)
- Required field validation (IsNotEmpty)
- Type validation (IsInt, IsBoolean, IsString, IsArray)
- Enum validation (IsIn, IsEnum)
- Array element validation (each: true)

### 4. Database Integrity
- Primary keys (UUID, auto-increment)
- Foreign key relationships (gameId)
- Composite indexes for performance
- JSON transformers for complex types
- Timestamp tracking

## Integration with Existing System

### Imports Required

```typescript
// Interfaces
import {
  RandomEvent,
  EventType,
  EventSeverity,
  EventTriggerCondition,
  EventEffect,
  EventChoice,
} from '../common/interfaces/random-event.interface';

// DTOs
import {
  EventTriggerConditionDto,
  DifficultyEventConfigDto,
} from '../common/dto/event-trigger-condition.dto';

// Entities
import { EventState } from '../database/entities/event-state.entity';
import { EventHistory } from '../database/entities/event-history.entity';

// Constants
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
```

### Database Migration

Add to TypeORM configuration:

```typescript
// src/database/database.config.ts
import { EventState } from './entities/event-state.entity';
import { EventHistory } from './entities/event-history.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  // ... existing config
  entities: [
    // ... existing entities
    EventState,
    EventHistory,
  ],
};
```

### Export Updates

Already completed:
- `src/common/dto/index.ts` - Exports EventTriggerConditionDto
- `src/common/interfaces/index.ts` - Exports random-event.interface
- `src/database/index.ts` - Exports event entities

## Usage Examples

### Creating an Event

```typescript
const event: RandomEvent = {
  eventId: 'server_crash',
  eventType: EventType.INFRASTRUCTURE_ISSUE,
  severity: EventSeverity.CRITICAL,
  title: '서버 장애',
  description: 'EC2 인스턴스가 다운되었습니다',
  triggerCondition: {
    minTurn: 5,
    maxTurn: 20,
    requiredInfra: ['EC2'],
    capacityExceeded: true,
    probability: 30,
  },
  choices: [
    {
      choiceId: 'fix_quick',
      text: '긴급 복구',
      effect: {
        usersDelta: EVENT_EFFECTS.USERS.MEDIUM_LOSS,
        trustDelta: EVENT_EFFECTS.TRUST.HIGH_LOSS,
      },
    },
  ],
  isOneTime: false,
  priority: EVENT_PRIORITY.CRITICAL,
  tags: [EVENT_TAGS.CRISIS],
};
```

### Checking Event Trigger

```typescript
import { canEventTrigger } from '../game/event-examples';

const gameState = {
  currentTurn: 10,
  users: 25000,
  cash: 100_000_000,
  trust: 60,
  infrastructure: ['EC2', 'RDS'],
  hiredStaff: ['DEVELOPER', 'DESIGNER'],
  difficultyMode: 'NORMAL',
  capacityExceeded: false,
};

if (canEventTrigger(event, gameState)) {
  // Trigger event logic
}
```

### Recording Event History

```typescript
const history = new EventHistory();
history.gameId = game.gameId;
history.eventId = event.eventId;
history.eventType = event.eventType;
history.severity = event.severity;
history.turnNumber = game.currentTurn;
history.eventTitle = event.title;
history.eventDescription = event.description;
history.usersBefore = game.users;
history.cashBefore = game.cash;
history.trustBefore = game.trust;
history.infrastructureBefore = [...game.infrastructure];

// Apply effects...

history.usersAfter = game.users;
history.cashAfter = game.cash;
history.trustAfter = game.trust;
history.infrastructureAfter = [...game.infrastructure];
history.usersDelta = history.usersAfter - history.usersBefore;
history.cashDelta = history.cashAfter - history.cashBefore;
history.trustDelta = history.trustAfter - history.trustBefore;
history.difficultyMode = game.difficultyMode;

await eventHistoryRepository.save(history);
```

## Difficulty-Specific Configuration

Events can be configured differently per difficulty:

```typescript
const easyConfig: DifficultyEventConfig = {
  difficulty: 'EASY',
  eventId: 'major_outage',
  triggerCondition: {
    probability: 15, // Lower probability in easy mode
  },
  effectMultiplier: 0.6, // 40% reduced negative impact
};

const hardConfig: DifficultyEventConfig = {
  difficulty: 'HARD',
  eventId: 'major_outage',
  triggerCondition: {
    probability: 45, // Higher probability in hard mode
  },
  effectMultiplier: 1.4, // 40% increased negative impact
};
```

## Next Steps

### 1. Event Service Implementation
Create `src/event/event.service.ts` to:
- Load events from database/configuration
- Check trigger conditions each turn
- Apply event effects
- Manage event state and cooldowns
- Record event history

### 2. Event Controller
Create `src/event/event.controller.ts` for:
- GET `/api/events/:gameId/active` - Get active events
- GET `/api/events/:gameId/history` - Get event history
- POST `/api/events/:gameId/choice` - Execute event choice
- GET `/api/events/available` - List all available events

### 3. Event Data Seeding
Create event definitions in:
- Database table or JSON file
- Cover all game phases and scenarios
- Balance difficulty configurations

### 4. Testing
- Unit tests for trigger condition evaluation
- Unit tests for effect application
- Integration tests for event flow
- E2E tests for player experience

## Benefits

1. **Type Safety**: 100% typed, no any types, compile-time checking
2. **Validation**: Request validation with class-validator decorators
3. **Documentation**: Comprehensive Swagger API documentation
4. **Maintainability**: Clear structure, separation of concerns
5. **Extensibility**: Easy to add new events, conditions, effects
6. **Performance**: Indexed queries, efficient lookups
7. **Analytics**: Complete history tracking for analysis
8. **Debugging**: Detailed state tracking and logging

## File Locations

```
backend/src/
├── common/
│   ├── dto/
│   │   ├── event-trigger-condition.dto.ts (NEW)
│   │   └── index.ts (UPDATED)
│   └── interfaces/
│       ├── random-event.interface.ts (NEW)
│       └── index.ts (NEW)
├── database/
│   ├── entities/
│   │   ├── event-state.entity.ts (NEW)
│   │   ├── event-history.entity.ts (NEW)
│   │   └── ... (existing entities)
│   └── index.ts (UPDATED)
└── game/
    ├── event.constants.ts (NEW)
    ├── event-examples.ts (NEW)
    └── game-constants.ts (EXISTING)
```

## Compilation Status

All new files compile successfully:
- TypeScript strict mode compliant
- No compilation errors
- Compatible with existing codebase
- Ready for integration

---

**Created**: 2026-02-04
**Status**: Ready for Review and Integration
