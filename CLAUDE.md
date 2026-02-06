# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**AWS 스타트업 타이쿤 (AWS Startup Tycoon)** - A text-based business simulation game where players become a startup CTO making both business decisions and AWS infrastructure design choices.

**Game Concept**: Business choices directly impact infrastructure requirements. Failed infrastructure decisions lead to outages, lost investments, and bankruptcy endings. Success leads to IPO with 1T+ valuation.

**Current Phase**: Phase 1 (Advanced Features - 87% complete)

**Implementation Status**:
- **Backend**: Phase 1 90% complete (7 modules, 27 API endpoints, 41 game.service tests passing)
- **Frontend**: Phase 1 65% complete (3-panel layout, EventPopup, AWS icons ✅, integration in progress)
- **Completed EPICs**:
  - ✅ EPIC-04 (Trust System Overhaul) - 100% complete, production ready
  - ✅ EPIC-08 (Trust System Rebalancing) - 100% complete, deployed
  - ✅ EPIC-09 (Late-Game Capacity Balance) - 100% complete, tests passing
  - ✅ EPIC-10 (Frontend Interface Cleanup) - 100% complete, type system unified, AWS icons integrated
  - ✅ EPIC-07 (Quiz System) - 100% complete, bonus scoring integrated
  - 🚧 EPIC-03 (Dynamic Events) - 85% complete (Backend done, Frontend EventPopup done)
  - 🚧 EPIC-06 (LLM Production) - 80% complete (Feature 5 remaining)

---

## Core Architecture

### Game Design Structure

This is a **turn-based choice-driven simulation** combining:
- **Business Layer**: Marketing, fundraising, team hiring, monetization, global expansion
- **Infrastructure Layer**: AWS resource management (EC2→Aurora→EKS→Global DB)
- **Metrics System**: Users, revenue, cash, team size, SLA, trust score

### Data Models

**Game State Database** (`game_choices_db.json` ✅ Imported):
- **turns table**: 25 turns with event descriptions
- **choices table**: 253 choices with effects (users, cash, trust, infrastructure)
- Each choice modifies: user count, cash flow, infrastructure stack, trust metric
- Imported into SQLite via `npm run import-data`

**Dynamic Event System** (EPIC-03):
- **14 event types**: RANDOM, CHAIN, CRISIS, OPPORTUNITY, MILESTONE, SEASONAL, COMPETITION, REGULATION, TECHNICAL_DEBT, TEAM_MORALE, INVESTOR_PRESSURE, MARKET_SHIFT, INFRASTRUCTURE_STRESS, AUTO_DEFENSE
- **Seeded Random System**: Reproducible event generation using game seed
- **Automatic Defense**: CloudFront, Aurora Multi-AZ, DR plan, Multi-region auto-activation
- **Event Matching**: Optimized matcher service (<50ms performance)

**Trust System** (EPIC-04 + EPIC-08):
- **Warning System**: Consecutive capacity exceeded tracking (3+ strikes = investor warning)
- **Recovery Mechanisms**: Stability bonus (+3), crisis recovery bonus (+5), transparency 1.5x, natural recovery (+1-2)
- **Alternative Investment**: Bridge financing (max 2), government grants (once)
- **History Tracking**: TrustHistory entity with change reasons and context
- **Balance Adjustments (EPIC-08)**:
  - Multiplier cap: 2.0x maximum (prevents extreme stacking)
  - Investment thresholds: Series A/B/C/IPO requirements increased by 15-60%
  - Diminishing returns: Progressive tiers (1.0x → 0.7x → 0.5x → 0.3x at trust 0/60/75/85)
  - Perfect play: 160 → 85-95 trust (45% reduction)
  - IPO requirement: 65 → 80 (NORMAL mode)

**LLM Event Generation** (EPIC-05/06):
- **vLLM Integration**: gpt-oss-20b model for dynamic event creation
- **Redis Caching**: 60%+ hit rate, 5-minute TTL
- **3-Stage Validation**: Structure → Balance → Content quality checks
- **Quality Scoring**: 4 dimensions (consistency, balance, fun, educational) averaging 80.5/100

**Quiz System** (EPIC-07):
- **AWS Knowledge Quiz**: 5 random quizzes per game (turns 5, 9, 13, 17, 21 with ±2 variation)
- **Difficulty Scaling**: 3 tiers (EASY/MEDIUM/HARD) based on turn number
- **Bonus Scoring**: Progressive rewards scaled ×1000 (2 correct: 5K pts, 3: 15K pts, 4: 30K pts, 5: 50K pts)
- **Score Impact**: 5/5 correct = +50,000 points (+26% boost on typical ~190K base score)
- **LLM Generation**: Dynamic quiz creation with fallback to curated questions
- **Redis Caching**: Quiz content cached for performance (5-min TTL)
- **✅ Fixed (2026-02-06)**: Quiz bonus now properly integrated into leaderboard score calculation

**Infrastructure Progression** (6 stages):
1. EC2 single instance + MySQL (~500 users)
2. Aurora MySQL Serverless (~5K users)
3. ALB + AutoScaling + Redis (~50K users)
4. EKS + Karpenter (~1M users)
5. Aurora Global DB + Bedrock/SageMaker (~10M users)
6. IPO-ready MSA architecture (unlimited scale)

### Tech Stack Plan (from `tech_stack_architecture.md`)

**Frontend**: Next.js + TypeScript + TailwindCSS + Redux Toolkit
- 3-panel layout: Left (metrics), Center (story/choices), Right (AWS diagram viewer)
- Internationalization: next-intl (default locale: ko-KR)
- CloudFront + S3 static hosting

**Backend**: **NestJS (TypeScript)** ✅ Phase 1 80% complete
- REST API (Phase 1 ✅) + WebSocket (Phase 2) + gRPC (Phase 2+)
- SQLite (dev ✅) → Aurora MySQL Serverless v2 (planned)
- 7 modules implemented: Game, Turn, Event, Leaderboard, Security, LLM, Config
- 27 API endpoints, 9 database entities, 317 tests (99.68% pass)

**Data**: Aurora MySQL Serverless v2 (planned), ElastiCache Redis (LLM caching ✅), S3, Athena/Glue/QuickSight

**ML/AI**:
- vLLM (gpt-oss-20b) ✅ Integrated for dynamic event generation
- Redis caching ✅ 60%+ hit rate
- Amazon Bedrock (planned), SageMaker (planned)

**Infrastructure**: EKS + Karpenter, ALB Ingress, ECR, ArgoCD (GitOps), GitHub Actions (CI)

**Security**: WAF + Shield, IAM least privilege, Secrets Manager, GuardDuty, VPC private subnets

---

## AWS Icon Assets

**Location**: `aws_image/` directory contains official AWS architecture icons:
- `Architecture-Group-Icons_02072025/`: VPC, subnets, regions, auto-scaling groups
- `Architecture-Service-Icons_02072025/`: Service icons organized by category (Analytics, App-Integration, AI, etc.)
- `Category-Icons_02072025/`: Category-level grouping icons
- `Resource-Icons_02072025/`: Individual resource-level icons

**Icon Sizes**: 16px, 32px, 48px, 64px available in both PNG and SVG formats

**Usage**: For real-time AWS infrastructure diagram visualization in the game's right panel

---

## Game Mechanics

### Turn System
- Each turn presents 5-6 choices to the player
- Early game: 1 choice per turn → Late game: 2 choices (after team expansion)
- Choices affect: users, revenue, cash, team, infrastructure, SLA, trust

### Resource Management Variables
- **Users**: Traffic driver, revenue/load source
- **Revenue**: Freemium, ads, B2B, AI model monetization
- **Cash**: Funding rounds + profit
- **Team**: Unlocks multi-choice capability and execution speed
- **Infrastructure**: Represented as AWS resource stack
- **SLA**: Must maintain 99%+ to avoid investor failure
- **Trust**: Investor/market confidence metric

### Win/Lose Conditions

**Success**: IPO with 1T+ valuation
- Requirements: 100K+ users, 300M+ monthly revenue, 99.9% SLA

**Failure Scenarios**:
1. Server outage → user churn → bankruptcy
2. Failed fundraising → cash depletion
3. Team collapse → development stagnation → competitor defeat

---

## AI Agent Structure

The project follows a systematic development process based on 6 AI roles and task-driven workflows.

### AI Roles (6개)

1. **Producer AI** (`.ai/roles/producer.md`)
   - EPIC decomposition into Features and Tasks
   - Release strategy and milestone planning
   - Task creation with clear acceptance criteria

2. **Designer AI** (`.ai/roles/designer.md`)
   - Game rule design and balancing
   - Numerical models (trust, revenue, costs)
   - User experience flow design

3. **Client Dev AI** (`.ai/roles/client.md`)
   - Frontend architecture (Next.js, React, Redux)
   - UI/UX component implementation
   - E2E testing and accessibility

4. **Server Dev AI** (`.ai/roles/server.md`)
   - Backend API design (NestJS, TypeORM)
   - Database schema and optimization
   - Security and performance

5. **QA AI** (`.ai/roles/qa.md`)
   - Test strategy (unit, integration, E2E)
   - Quality gates and coverage requirements
   - Release verification checklists

6. **LiveOps AI** (`.ai/roles/liveops.md`)
   - Monitoring and alerting setup
   - Infrastructure management
   - Hotfix procedures and rollback plans

### Workflow (Task-Based)

```
1. PO defines goal (3-line summary)
   ↓
2. Producer AI: EPIC breakdown + Task creation
   ↓
3. Designer/Server/Client AI: Feature implementation (Task tracking)
   ↓
4. QA AI: Verification + Release Checklist
   ↓
5. LiveOps AI: Deployment + Monitoring
```

### Skills (5 Procedures)

- **epic-breakdown.md**: Decompose EPIC into Features (1-2 weeks each)
- **feature-spec.md**: Detailed feature specification with acceptance criteria
- **implementation-plan.md**: Implementation strategy and file changes
- **test-plan.md**: Test scenario generation for features
- **release-check.md**: Pre-deployment verification checklist

### Context Documents

- **vision.md**: Game vision, target audience, differentiation
- **gdd.md**: Game system rules and mechanics
- **trust-balance.md**: Trust system detailed specification
- **workflow.md**: Complete task-based workflow explanation

### Related Files

- AI Roles: `.ai/roles/`
- Skills: `.ai/skills/`
- Context: `.ai/context/`
- Templates: `.ai/templates/`
- Full workflow: `.ai/context/workflow.md`

---

## Development Priorities

### Phase 0 - MVP (✅ **COMPLETED** - 2026-02-04)

**Backend implementation completed** - Fully functional NestJS API with game engine core.

**Implemented features**:
1. ✅ NestJS + TypeScript + TypeORM + SQLite
2. ✅ Game engine (turn processor, choice evaluator, win/lose conditions)
3. ✅ REST API endpoints (game CRUD, turn info, choice execution)
4. ✅ Data import (25 turns, 253 choices from game_choices_db.json)
5. ✅ Unit tests (GameService 87.87%, TurnService 100%)
6. ✅ Swagger API documentation (http://localhost:3000/api-docs)

**Location**: `/backend/` directory
**Quick start**: `cd backend && npm install && npm run import-data && npm run start:dev`

---

### Phase 1 - Advanced Features (🚧 **IN PROGRESS** - 85% complete)

**Completed EPICs**:

#### ✅ EPIC-08: Trust System Rebalancing (100% complete, deployed)
- **Status**: ✅ Deployed to production
- **Completion Date**: 2026-02-06
- **Features**:
  - **Phase 1**: Multiplier cap (2.0x limit) - prevents extreme stacking
  - **Phase 2**: Investment threshold increases (Series A/B/C/IPO +15-60%)
  - **Phase 3**: Diminishing returns system (4 progressive tiers)
- **Impact**:
  - Perfect play: 160 → 85-95 trust (45% reduction)
  - Max multiplier: 6.09x → 2.0x (67% reduction)
  - IPO requirement: 65 → 80 (NORMAL mode, +23%)
- **Backend**: 85/85 tests passing (100%), 3 files modified, 7 files created
- **Documentation**: Complete implementation summary with verification scripts
- **Result**: Balanced progression, strategic depth increased, IPO achievable with effort

#### ✅ EPIC-04: Trust System Overhaul (100% complete, production ready)
- **Status**: Awaiting PO/Tech Lead approval for production deployment
- **Completion Date**: 2026-02-05
- **Features**:
  - Data rebalancing for game progression
  - Capacity overflow warning system (consecutiveCapacityExceeded tracking)
  - Recovery mechanisms: stability bonus (+3), crisis recovery (+5), transparency 1.5x, natural recovery (+1-2)
  - TrustGauge visualization (5-tier color system)
  - Trust history tracking (TrustHistory entity + service)
  - Alternative investment paths (bridge financing, government grants)
  - GDD documentation update
- **Backend**: 261/267 tests passing (97.8% coverage), 6 services
- **Frontend**: 3 components (TrustGauge, TrustHistoryChart, TrustChangeExplanation)
- **Documentation**: Features, Implementations, Verifications, Release Notes
- **Next Step**: Production deployment after approval

#### 🚧 EPIC-03: Dynamic Event System (85% complete)
- **Status**: Backend complete, Frontend EventPopup complete, game integration pending
- **Features**:
  - 14 event types implemented (RANDOM, CHAIN, CRISIS, OPPORTUNITY, etc.)
  - Seeded random system for reproducibility
  - Conditional event triggering based on game state
  - Automatic defense mechanisms (CloudFront, Aurora Multi-AZ, DR, Multi-region)
  - Event history tracking (EventHistory entity)
  - Difficulty-based multipliers
  - EventPopup UI component (100% implemented with 6 sub-components)
- **Backend**: 207/214 tests passing (96.7% coverage), EventService 487 lines
- **Frontend**: EventPopup fully implemented (EventHeader, EventContent, EffectPreview, EventFooter, EventTypeIcon)
- **Remaining Work**:
  - Integrate EventPopup into game/[gameId]/page.tsx
  - Create 20+ event content entries
  - E2E testing

#### 🚧 EPIC-07: AWS Quiz System (90% complete)
- **Status**: Core implementation complete, score integration pending
- **Completion Date**: 2026-02-05
- **Features**:
  - **Quiz Generation**: 5 random AWS knowledge quizzes per game
  - **Turn Distribution**: Turns 5, 9, 13, 17, 21 (±2 variation for randomness)
  - **Difficulty Tiers**: EASY (turn 1-8), MEDIUM (9-16), HARD (17-25)
  - **Bonus System**: Progressive rewards (0/0/5/15/30/50 for 0-5 correct)
  - **LLM Integration**: Dynamic quiz generation with fallback to curated questions
  - **Redis Caching**: Quiz content cached (5-min TTL, 60%+ hit rate)
  - **Quality Scoring**: 4-dimension evaluation (consistency, balance, fun, educational)
- **Backend**: Quiz module complete, GameService integration done
- **⚠️ Pending Work**:
  - Quiz bonus integration into final score calculation (leaderboard.service.ts)
  - Frontend quiz UI component
- **Next Step**: Fix score integration → Frontend UI → E2E testing

#### 🚧 EPIC-06: LLM Production Readiness (80% complete)
- **Status**: Features 1-4 complete, Feature 5 (deployment infrastructure) remaining
- **Completed Features**:
  - **Feature 1**: Test stabilization & E2E (284/284 tests passing, 100%)
  - **Feature 2**: Performance optimization (p95 <3s achieved at 2.47s, avg <1.5s, cache hit >60%)
  - **Feature 3**: Quality assurance system (EventQualityScorerService, 4-dimension evaluation, avg 80.5/100)
  - **Feature 4**: Monitoring & alerting (LLMController with 3 endpoints: metrics, health, config; 7 alert rules)
- **Backend**: 317 tests passing (100%), 6 services
  - vLLMClientService (95% coverage)
  - PromptBuilderService (100% coverage)
  - EventCacheService (90% coverage)
  - LLMEventGeneratorService (83% coverage)
  - EventQualityScorerService (96% coverage)
  - LLMResponseValidatorService (2.87% - high complexity)
- **Remaining Work (Feature 5)**:
  - vLLM Dockerfile
  - docker-compose.yml for local development
  - Environment variable management (.env.example)
  - Operational documentation (API guide, troubleshooting, rollback procedures)
- **Next Step**: Complete Feature 5 → Staging deployment → 72-hour stability test

**In Progress**:
- 📋 EPIC-07 Quiz bonus score integration
- 📋 Frontend 3-panel layout integration (60% complete)
- 📋 AWS Diagram Generator (infrastructure visualization)
- 📋 EPIC-06 Feature 5 (deployment infrastructure)

**Upcoming Phase 1 Work**:
- EPIC-07 Frontend quiz UI component
- Aurora MySQL Serverless v2 migration
- AWS Cognito authentication
- WebSocket real-time communication

---

### Phase 2 - Production (📋 **PLANNED**)
- Aurora MySQL migration from SQLite
- Redis caching layer for game state
- CloudFront + S3 static hosting
- EKS deployment with Karpenter autoscaling
- Observability stack (CloudWatch, X-Ray, Datadog)

### Data Integration
- `game_choices_db.json`: 3700+ lines of turn-based choices and effects
- `game_choices_db_rebalanced.json`: Rebalanced version with EPIC-04 improvements
- `game_choices_db.sql`: SQLite schema with turns/choices tables
- Import this data into the game engine on initialization

---

## NFR (Non-Functional Requirements)

From `tech_stack_architecture.md`:

- **Availability (SLO)**: 99.9% (growth), 99.95% (scale-up), 99.99% (IPO prep)
- **Performance p95**: MVP ≤300ms, Growth ≤200ms, Scale-up ≤150ms
- **Security**: ISMS-P / SOC 2 compliance, KMS encryption, IAM least privilege
- **Observability**: MTTD < 3min, MTTR < 30min
- **Scaling**: Auto-scale for event-driven traffic spikes (minutes)
- **FinOps**: Tagging/dashboards/alerts for budget overrun prevention

---

## Key Design Principles

1. **Business ⇔ Infrastructure Coupling**: Every business decision must meaningfully impact infrastructure requirements
2. **Realistic AWS Costs**: Infrastructure costs should follow actual AWS pricing models (EC2, Aurora, EKS tiers)
3. **Educational Value**: Players learn cloud architecture patterns through gameplay
4. **Korean as Primary Language**: Default language is Korean (한글). Multi-language support (i18n) is planned using next-intl, but all core content, UI, and game text should be developed in Korean first
5. **Visual Feedback**: Real-time AWS diagram updates when infrastructure changes

---

## Future Architecture Modules (IaC Structure)

Planned infrastructure-as-code organization:
```
infra/
├─ envs/ (dev, staging, prod)
├─ modules/
│   ├─ vpc, eks, karpenter, alb-ingress
│   ├─ aurora, elasticache
│   ├─ s3-cloudfront
│   ├─ kinesis-firehose, glue-athena-quicksight
│   ├─ cognito, waf
│   └─ o11y (CloudWatch, X-Ray, Datadog)
└─ pipelines/ (GitHub Actions, ArgoCD)
```

---

## Observability Strategy

**Metrics**: Request count, error rates (5xx/4xx), p50/p95/p99, DB CPU/connections, Redis hit rate

**Tracing**: OpenTelemetry → X-Ray/Datadog

**Logging**: Structured JSON (with TraceID) → CloudWatch Logs → Athena

**Alerts**:
- p95 > SLO for 5min
- Error rate > 1% for 3min
- RDS CPU > 80% for 10min
- Redis miss rate > 30% for 10min
- Budget alerts at 80/90/100%

---

## Cost Model (Monthly Estimates)

| Stage | Compute | DB | Redis | Network | O11y | Total |
|-------|---------|----|----|---------|------|-------|
| MVP | $100 | $300 | $50 | $30 | $20 | **$500** |
| Growth (50K users) | $1200 | $800 | $200 | $150 | $100 | **$2450** |
| Scale-up (150K+) | $4000 | $1800 | $600 | $400 | $300 | **$7100** |
| Global | $6000 | $2600 | $800 | $700 | $400 | **$10500** |

**FinOps**: Savings Plans (1-3yr), Graviton instances, CloudFront caching, weekly DB/Redis sizing reviews

---

## Backend Implementation Details

**API Base URL**: `http://localhost:3000/api`

### Module Structure (7 Modules)

```
backend/src/
├── app.module.ts (Root Module)
├── main.ts (Bootstrap with Swagger)
│
├── game/ (GameModule - Core game logic)
│   ├── game.module.ts
│   ├── game.controller.ts (5 endpoints)
│   ├── game.service.ts (91% coverage)
│   ├── trust-history.service.ts (95% coverage - EPIC-04)
│   ├── alternative-investment.service.ts (96% coverage - EPIC-04)
│   ├── event-cache.service.ts (88% coverage)
│   ├── optimized-event-matcher.service.ts (95% coverage)
│   └── performance-monitor.service.ts (95% coverage)
│
├── turn/ (TurnModule - Turn management)
│   ├── turn.module.ts
│   ├── turn.controller.ts (2 endpoints)
│   └── turn.service.ts (96% coverage)
│
├── event/ (EventModule - Dynamic event system - EPIC-03)
│   ├── event.module.ts
│   └── event.service.ts (93% coverage, 14 event types, 487 lines)
│
├── leaderboard/ (LeaderboardModule - Rankings)
│   ├── leaderboard.module.ts
│   ├── leaderboard.controller.ts (8 endpoints)
│   └── leaderboard.service.ts
│
├── security/ (SecurityModule - Security services)
│   ├── security.module.ts
│   ├── secure-random.service.ts (96% coverage - seeded random)
│   ├── input-sanitizer.service.ts (94% coverage - XSS protection)
│   ├── event-state-validator.service.ts (91% coverage - state validation)
│   └── event-guard.service.ts (0% unit, E2E covered - access control)
│
├── llm/ (LLMModule - AI event generation - EPIC-05/06)
│   ├── llm.module.ts
│   ├── llm.controller.ts (3 monitoring endpoints)
│   ├── services/
│   │   ├── vllm-client.service.ts (95% coverage)
│   │   ├── prompt-builder.service.ts (100% coverage)
│   │   ├── event-cache.service.ts (90% coverage - Redis)
│   │   ├── llm-event-generator.service.ts (83% coverage - orchestrator)
│   │   └── event-quality-scorer.service.ts (96% coverage - 4-dimension scoring)
│   ├── validators/
│   │   └── llm-response-validator.service.ts (2.87% - high complexity, 3-stage validation)
│   ├── dto/ (Data Transfer Objects)
│   ├── templates/ (Prompt templates)
│   └── tests/ (8 test files)
│
├── config/
│   └── llm.config.ts (vLLM, Redis, Feature Flags)
│
└── database/
    └── entities/ (9 TypeORM Entities)
        ├── game.entity.ts (42 fields, GameStatus enum)
        ├── turn.entity.ts
        ├── choice.entity.ts
        ├── choice-history.entity.ts
        ├── dynamic-event.entity.ts (14 EventType enum, EventSeverity)
        ├── event-state.entity.ts
        ├── event-history.entity.ts
        ├── trust-history.entity.ts (EPIC-04)
        └── leaderboard.entity.ts
```

**Summary**: 7 modules, 20 services, 27 API endpoints, 9 entities, 317 tests (99.68% pass)

---

### API Endpoints (27 Total)

#### GameController (`/api/game`) - 5 endpoints
- `POST /api/game/start` - Create new game with difficulty selection
- `GET /api/game/:gameId` - Get current game state (42 fields)
- `POST /api/game/:gameId/choice` - Execute choice(s) with multi-choice support
- `DELETE /api/game/:gameId` - Delete game
- `GET /api/game/:gameId/trust-history` - Get trust change history (EPIC-04)

#### TurnController (`/api/turn`) - 2 endpoints
- `GET /api/turn` - Get all 25 turns
- `GET /api/turn/:turnNumber` - Get specific turn with available choices

#### LeaderboardController (`/api/leaderboard`) - 8 endpoints
- `POST /api/leaderboard/submit` - Submit final score
- `GET /api/leaderboard/top` - Top rankings (configurable limit)
- `GET /api/leaderboard` - Full leaderboard with pagination
- `GET /api/leaderboard/recent` - Recent entries
- `GET /api/leaderboard/statistics` - Global statistics
- `GET /api/leaderboard/rank/:score` - Calculate rank for score
- `POST /api/leaderboard/clear` - Clear all entries (dev only)
- Additional ranking queries

#### LLMController (`/api/llm`) - 3 monitoring endpoints (EPIC-06)
- `GET /api/llm/metrics` - Generation/cache/quality metrics
- `GET /api/llm/health` - Health status (healthy/degraded/unhealthy)
- `GET /api/llm/config` - System configuration and feature flags

#### PerformanceController (`/api/performance`) - 9 endpoints (commented out)
- Performance monitoring and benchmarking endpoints (future activation)

---

### Database Schema (9 Entities)

**Core Game Entities**:
- **Game**: 42 fields including gameId (UUID), currentTurn, users, cash, revenue, trust, infrastructure[], team, sla, difficulty, status (GameStatus enum), win/lose conditions
- **Turn**: turnId, turnNumber (1-25), eventText, description, choices[]
- **Choice**: choiceId, turnNumber, text, effects{users, cash, trust, revenue, infrastructure[]}, requiredInfrastructure, nextTurn
- **ChoiceHistory**: historyId, gameId, turnNumber, choiceId, timestamp, effectsApplied

**Dynamic Event System (EPIC-03)**:
- **DynamicEvent**: eventId, eventType (14 types), severity (LOW/MEDIUM/HIGH/CRITICAL), title, description, choices[], effects, conditions, chainTo
- **EventState**: stateId, gameId, availableEvents[], triggeredEvents[], eventCooldowns
- **EventHistory**: historyId, gameId, eventId, choiceIndex, timestamp, outcome

**Trust System (EPIC-04)**:
- **TrustHistory**: historyId, gameId, turnNumber, oldTrust, newTrust, change, reason, category, context, timestamp

**Leaderboard**:
- **Leaderboard**: leaderboardId, playerName, score, users, cash, trust, infrastructure, turn, difficulty, timestamp, rank

---

### Game Logic

**Initial State**:
- Cash: 10,000,000 (10M KRW seed funding)
- Users: 0
- Trust: 50 (neutral investor confidence)
- Infrastructure: ["EC2"]
- Team: 1 (solo founder)
- SLA: 99.0%

**Win Conditions** (IPO Success):
- Users ≥ 100,000
- Monthly Revenue ≥ 300,000,000 (300M KRW)
- Trust ≥ 99
- Infrastructure includes: Aurora Global DB + EKS

**Lose Conditions**:
- **Bankruptcy**: cash < 0
- **Server Outage**: trust < 20
- **Failed IPO**: Reached Turn 25 without meeting win conditions

**Difficulty Levels**:
- EASY: 1.2x revenue, 0.8x costs, 1.1x trust gain
- NORMAL: 1.0x multipliers (balanced)
- HARD: 0.8x revenue, 1.2x costs, 0.9x trust gain

---

### Test Coverage (Jest)

**Overall Statistics**:
- **Total Tests**: 317
- **Passing**: 316 (99.68%)
- **Failing**: 1 (LLM integration test - known flaky)
- **Test Suites**: 22 files
- **Coverage**: 52.67% overall
  - Core services: 90%+ (Game, Trust, Alternative Investment, Event)
  - LLM services: 83-100% (except validator at 2.87% due to complexity)
  - Controllers: Tested via E2E (not included in unit coverage)

**High Coverage Services** (90%+):
- GameService: 91%
- TrustHistoryService: 95%
- AlternativeInvestmentService: 96%
- OptimizedEventMatcherService: 95%
- PerformanceMonitorService: 95%
- SecureRandomService: 96%
- EventQualityScorerService: 96%
- PromptBuilderService: 100%

**Target**: 80% overall coverage (53% achieved, core services exceeding target)

---

### LLM Event Generation System (EPIC-05/06)

**Architecture**:
- **vLLM Server**: gpt-oss-20b model for Korean event generation
- **Redis Cache**: 5-minute TTL, 60%+ hit rate achieved
- **3-Stage Validation**:
  1. Structure validation (JSON schema)
  2. Balance validation (effect ranges, cash limits)
  3. Content quality validation (length, language, profanity)

**Quality Scoring System**:
- **4 Dimensions**: Consistency (0-25), Balance (0-25), Fun (0-25), Educational (0-25)
- **Average Score**: 80.5/100 across 20 sample events
- **Thresholds**: Minimum 60/100 for production use

**Performance Metrics**:
- **p95 Latency**: 2.47s (target <3s) ✅
- **Average Latency**: <1.5s ✅
- **Cache Hit Rate**: 95%+ (target >60%) ✅
- **Success Rate**: 284/284 tests passing (100%)

**Monitoring**:
- **Endpoints**: `/api/llm/metrics`, `/api/llm/health`, `/api/llm/config`
- **Alert Rules**: 7 defined (latency, error rate, cache performance, quality scores)
- **Dashboard**: Grafana/CloudWatch integration guide provided

---

### Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **API Guide**: `/backend/src/llm/README.md`
- **Architecture Docs**: `/docs/implementations/`
- **EPIC Documents**: `/docs/epics/`, `/docs/features/`

---

## Frontend Implementation Details

**Base URL**: `http://localhost:3001`

### Application Structure (Next.js 15 App Router)

```
frontend/
├── app/ (Next.js App Router)
│   ├── layout.tsx (Root layout with Redux Provider)
│   ├── page.tsx (Landing page)
│   ├── game/
│   │   ├── layout.tsx (Game layout)
│   │   └── [gameId]/page.tsx (Game play screen - 3-panel layout)
│   ├── leaderboard/
│   │   └── page.tsx (Leaderboard page)
│   └── test/
│       └── trust-gauge/page.tsx (TrustGauge component test page)
│
├── components/ (19 Components)
│   ├── MetricsPanel.tsx (Left panel - game metrics display)
│   ├── StoryPanel.tsx (Center panel - story + choice cards)
│   ├── ChoiceCard.tsx (Individual choice card)
│   ├── InfraList.tsx (Infrastructure list display with AWS official icons ✅)
│   ├── CompactMetricsBar.tsx (Compact metrics bar)
│   ├── GameSkeleton.tsx (Loading skeleton)
│   ├── GameLog.tsx (Game action log)
│   ├── Tooltip.tsx (Tooltip component)
│   ├── EmergencyEventModal.tsx (Emergency event modal)
│   ├── TeamPanel.tsx (Team management panel)
│   ├── ErrorBoundary.tsx (Error boundary wrapper - standard Props naming ✅)
│   │
│   ├── metrics/ (EPIC-04 Trust System UI)
│   │   ├── TrustGauge.tsx (5-tier color gauge: Critical/Warning/Stable/Good/Excellent)
│   │   ├── TrustHistoryChart.tsx (Trust change history visualization)
│   │   └── TrustChangeExplanation.tsx (Detailed change explanation)
│   │
│   └── EventPopup/ (EPIC-03 Dynamic Event UI - 100% complete)
│       ├── index.ts (Barrel export)
│       ├── EventPopup.tsx (Main popup component with Framer Motion)
│       ├── EventHeader.tsx (Event type icon + title)
│       ├── EventContent.tsx (Description + choice options)
│       ├── EffectPreview.tsx (Effect preview with color coding)
│       ├── EventFooter.tsx (Action buttons)
│       ├── EventTypeIcon.tsx (14 event type icons)
│       ├── USAGE_EXAMPLE.tsx (Component usage examples)
│       ├── API_INTEGRATION_EXAMPLE.tsx (Backend integration guide)
│       └── __tests__/ (Component tests)
│
├── store/ (Redux Toolkit State Management)
│   ├── index.ts (Store configuration)
│   ├── ReduxProvider.tsx (Provider wrapper)
│   ├── hooks.ts (Typed useAppDispatch, useAppSelector)
│   ├── slices/
│   │   ├── gameSlice.ts (Game state: gameId, turn, metrics, choices, events)
│   │   └── uiSlice.ts (UI state: loading, modals, notifications)
│   ├── api/
│   │   └── gameApi.ts (RTK Query API slice)
│   └── __tests__/
│
├── hooks/ (Custom React Hooks)
│   └── useGame.ts (Game state management hook)
│
├── lib/ (Utility Functions & Helpers)
│   ├── icons/ (EPIC-10 AWS Icon System ✅)
│   │   ├── infrastructure-icon-map.ts (15 AWS services mapped)
│   │   ├── infrastructure-icon-helpers.ts (7 helper functions)
│   │   └── index.ts (Barrel export)
│   └── ... (other utilities)
│
├── types/ (TypeScript Type Definitions - Unified ✅)
│   ├── quiz.types.ts (Quiz + QuizState + SubmitAnswerPayload - no duplicates)
│   ├── event.types.ts (EventData, EventType, EventChoice)
│   ├── infrastructure.types.ts (SupportedInfrastructure, IconConfig ✅)
│   └── ... (other type definitions)
│
├── e2e/ (Playwright E2E Tests)
│   └── game.spec.ts (End-to-end game flow tests)
│
├── package.json
│   ├── next: 15.1.5
│   ├── react: 19.0.0
│   ├── @reduxjs/toolkit: 2.2.1
│   ├── framer-motion: 12.31.0
│   ├── @playwright/test: E2E testing
│   └── tailwindcss: 3.4.17
│
└── Configuration Files
    ├── next.config.ts (Next.js configuration)
    ├── tailwind.config.ts (TailwindCSS configuration)
    ├── tsconfig.json (TypeScript configuration)
    ├── jest.config.js (Jest unit test configuration)
    └── playwright.config.ts (E2E test configuration)
```

**Summary**: 5 pages, 19 components, Redux Toolkit store, E2E test setup

---

### Implementation Status

**Completed** (60%):
- ✅ 3-panel layout (MetricsPanel, StoryPanel, InfraList)
- ✅ Game flow pages (landing, game play, leaderboard)
- ✅ Redux state management (gameSlice, uiSlice, RTK Query)
- ✅ EPIC-04 Trust UI (TrustGauge, TrustHistoryChart, TrustChangeExplanation)
- ✅ EPIC-03 EventPopup (6 sub-components, fully implemented)
- ✅ E2E test framework setup (Playwright)

**In Progress** (40%):
- 📋 EventPopup integration into game/[gameId]/page.tsx
- 📋 AWS Diagram Viewer (right panel)
- 📋 WebSocket integration for real-time updates
- 📋 Comprehensive E2E test scenarios

---

### Tech Stack Details

**Framework**: Next.js 15.1.5 (App Router, React Server Components)

**State Management**: Redux Toolkit 2.2.1
- RTK Query for API calls
- Slices: game state, UI state
- Typed hooks (useAppDispatch, useAppSelector)

**Styling**: TailwindCSS 3.4.17
- Custom color palette for AWS branding
- Responsive design (mobile-first)
- Dark mode support (planned)

**Animation**: Framer Motion 12.31.0
- EventPopup transitions
- Metric change animations
- Loading states

**Testing**:
- Unit: Jest + React Testing Library
- E2E: Playwright
- Coverage: Component tests for critical paths

---

## EPIC Progress Tracking

| EPIC | Topic | Features | Completion | Status | Notes |
|------|-------|----------|------------|--------|-------|
| **EPIC-03** | Dynamic Event System | 7 | 85% | 🚧 In Progress | Backend 100%, EventPopup 100%, game integration pending |
| **EPIC-04** | Trust System Overhaul | 7 | 100% | ✅ Production Ready | Deployed, production ready |
| **EPIC-06** | LLM Production Readiness | 5 | 80% | 🚧 In Progress | Feature 5 (deployment infra) remaining |
| **EPIC-07** | AWS Quiz System | 4 | 100% | ✅ Completed | Bonus scoring integrated, ×1000 scaling applied |
| **EPIC-08** | Trust System Rebalancing | 3 | 100% | ✅ Deployed | All 3 phases complete, tests passing |
| **EPIC-09** | Late-Game Capacity Balance | 3 | 100% | ✅ Completed | Data + penalty adjustments, tests 41/41 passing |
| **EPIC-10** | Frontend Interface Cleanup | 2 | 100% | ✅ Completed | Type system unified, AWS icon system integrated |

### EPIC-03: Dynamic Event System (85%)
```
✅ Feature 1: Event evaluation engine (100%)
✅ Feature 2: Conditional event system (100%)
✅ Feature 3: 14 event types (100%)
✅ Feature 4: Automatic defense mechanisms (100%)
✅ Feature 5: Event history tracking (100%)
✅ Feature 6: Difficulty multipliers (100%)
🚧 Feature 7: UI integration (70%)
   ✅ EventPopup component (100%)
   ✅ API integration examples (100%)
   📋 Game screen integration (pending)
```

**Next Steps**:
1. Integrate EventPopup into `game/[gameId]/page.tsx`
2. Create 20+ event content entries
3. E2E testing for event flows

### EPIC-04: Trust System Overhaul (100%)
```
✅ Feature 1: Data rebalancing (100%)
✅ Feature 2: Capacity overflow warnings (100%)
✅ Feature 3: Recovery mechanisms (100%)
✅ Feature 4: TrustGauge visualization (100%)
✅ Feature 5: Trust history tracking (100%)
✅ Feature 6: Alternative investment paths (100%)
✅ Feature 7: GDD documentation (100%)
```

**Status**: Production deployment ready
**Next Step**: PO/Tech Lead approval → Production deployment

### EPIC-06: LLM Production Readiness (80%)
```
✅ Feature 1: Test stabilization (100%) - 284/284 tests passing
✅ Feature 2: Performance optimization (100%) - p95 2.47s, cache 95%+
✅ Feature 3: Quality assurance system (100%) - 4-dimension scoring, avg 80.5
✅ Feature 4: Monitoring & alerting (100%) - 3 endpoints, 7 alert rules
📋 Feature 5: Deployment infrastructure (0%)
   📋 vLLM Dockerfile
   📋 docker-compose.yml
   📋 Environment management
   📋 Operational documentation
```

**Next Steps**:
1. Complete Feature 5 (deployment infrastructure)
2. Staging environment deployment
3. 72-hour stability testing
4. Production rollout

### EPIC-07: AWS Quiz System (100%) ✅
```
✅ Feature 1: Quiz generation system (100%)
✅ Feature 2: Turn distribution & difficulty (100%)
✅ Feature 3: Bonus calculation (100%)
✅ Feature 4: Score integration (100%) - Fixed 2026-02-06
   ✅ Backend calculation complete
   ✅ Leaderboard integration complete (×1000 scaling)
   ✅ Quiz bonus properly added to final score
```

**Results**:
- 5/5 correct: +50,000 points (+26% boost)
- 4/5 correct: +30,000 points (+16% boost)
- 3/5 correct: +15,000 points (+8% boost)
- Score scaling: ×1000 multiplier for meaningful impact
- All tests passing: Quiz integration tests 14/14 (100%)

**Next Steps** (Optional enhancements):
1. Frontend quiz UI component
2. Quiz statistics dashboard
3. E2E testing scenarios

### EPIC-08: Trust System Rebalancing (100%)
```
✅ Phase 1: Multiplier cap (100%) - 2.0x limit
✅ Phase 2: Investment thresholds (100%) - +15-60% increases
✅ Phase 3: Diminishing returns (100%) - 4 progressive tiers
```

**Results**:
- Perfect play: 160 → 85-95 trust (45% reduction)
- Max multiplier: 6.09x → 2.0x (67% reduction)
- IPO requirement: 65 → 80 (NORMAL mode)
- All tests passing: 85/85 (100%)

### EPIC-09: Late-Game Capacity Balance (100%)
```
✅ Phase 1: Data adjustments (100%) - ID 157/160 user values reduced
✅ Phase 2: Penalty tier rebalancing (100%) - Max penalty 8 → 6
✅ Phase 3: Progressive penalty scaling (100%) - 33% → 67% → 100%
```

**Results**:
- ID 157 users: 500K → 120K (-76%)
- ID 160 users: 800K → 150K (-81%)
- Max capacity penalty: -8 → -6 (-25%)
- Progressive scaling: First 33%, Second 67%, Third+ 100%
- Aggressive path IPO rate: 15% → 55% (+40%p)
- All tests passing: 41/41 (100%)

### EPIC-10: Frontend Interface Cleanup & AWS Icon System (100%)
```
✅ Phase 1: Type System Cleanup (100%)
   ✅ Quiz types unified in types/quiz.types.ts
   ✅ EventData type reused from event.types.ts
   ✅ ErrorBoundary standard Props naming
   ✅ TypeScript compilation errors: 0

✅ Phase 2: AWS Icon System (100%)
   ✅ SupportedInfrastructure type (15 services)
   ✅ INFRASTRUCTURE_ICON_CONFIG mapping table
   ✅ 7 helper functions implemented
   ✅ InfraList component integrated with AWS icons
   ✅ Fallback emoji system for load failures
```

**Implementation**:
- **New Files**:
  - `types/infrastructure.types.ts` (60 lines)
  - `lib/icons/infrastructure-icon-map.ts` (140 lines)
  - `lib/icons/infrastructure-icon-helpers.ts` (130 lines)
  - `lib/icons/index.ts` (barrel export)
- **Modified Files**:
  - `types/quiz.types.ts` (+30 lines - Redux state types)
  - `store/slices/quizSlice.ts` (-35 lines - removed duplicates)
  - `lib/types.ts` (-15 lines - EventData import)
  - `components/ErrorBoundary.tsx` (Props naming)
  - `components/InfraList.tsx` (+40 lines - AWS icons)

**Features**:
- 15 AWS services with official icon paths
- Smart fallback system (AWS icon → emoji)
- Type-safe infrastructure handling
- `useAwsIcons` prop for toggle between icons/emojis
- Support for 4 icon sizes (16/32/48/64px)
- Category-based infrastructure grouping

**Benefits**:
- Code quality: 72/100 → 85/100 (+18%)
- Type consistency: 100% (no duplicates)
- Educational value: AWS official branding
- Maintainability: Centralized icon management
- Performance: Lazy loading with error handling

---

### Priority Roadmap

**Immediate (This Week)**:
1. ✅ EPIC-08 production deployment (COMPLETED)
2. ✅ EPIC-09 late-game capacity balance (COMPLETED)
3. ✅ EPIC-10 Frontend interface cleanup & AWS icon system (COMPLETED)
4. 🚧 EPIC-07 quiz bonus score integration
5. 🚧 EPIC-06 Feature 5 completion (deployment infrastructure)
6. 🚧 EPIC-03 EventPopup integration into game screen

**Short-term (Next 2 Weeks)**:
1. EPIC-07 Frontend quiz UI component
2. AWS Diagram Generator (right panel visualization)
3. EPIC-03 event content creation (20+ events)
4. Frontend E2E test suite expansion

**Mid-term (Next Month)**:
1. Aurora MySQL migration from SQLite
2. Redis caching layer for game state
3. AWS Cognito authentication
4. WebSocket real-time updates

---

## Important Notes

### Implementation Status
- **Backend**: ✅ Phase 1 85% complete (7 modules, 27 endpoints, 85 core tests passing)
- **Frontend**: 🚧 Phase 1 60% complete (3-panel layout, EventPopup, Redux store)
- **Current Phase**: Phase 1 (Advanced Features) - 85% overall
- **Completed EPICs**:
  - ✅ EPIC-04 (Trust System Overhaul) - 100%
  - ✅ EPIC-08 (Trust Rebalancing) - 100%
  - 🚧 EPIC-07 (Quiz System) - 90%
  - 🚧 EPIC-03 (Dynamic Events) - 85%
  - 🚧 EPIC-06 (LLM Production) - 80%

### AI-Driven Development Process
- **Workflow**: Task-based development following `.ai/context/workflow.md`
- **Roles**: 6 AI roles (Producer, Designer, Client, Server, QA, LiveOps)
- **Skills**: 5 standard procedures (epic-breakdown, feature-spec, implementation-plan, test-plan, release-check)
- **Documentation Structure**:
  - EPICs: `docs/epics/EPIC-XX-*.md`
  - Features: `docs/features/epic-XX/FEATURE-X-*.md`
  - Implementations: `docs/implementations/EPIC-XX-FEATURE-X-*.md`
  - Verifications: `docs/verification/EPIC-XX-*.md`
- **Quality Gates**: Phase-specific test coverage requirements, release checklists

### Language Strategy
- **Primary/Default Language**: Korean (한글) - all game content, UI, and text should be in Korean
- **i18n Support**: Multi-language support is being developed using next-intl, but Korean is the base language
- **Documentation**: Technical architecture in English, game content in Korean
- **LLM Generation**: Korean language event generation using vLLM (gpt-oss-20b)

### Data Strategy
- **Original Data**: `game_choices_db.json` (3700+ lines, 253 choices, 25 turns)
- **Rebalanced Data**: `game_choices_db_rebalanced.json` (EPIC-04 improvements)
- **Dynamic Events**: LLM-generated events cached in Redis (60%+ hit rate)
- **Data-First Approach**: Pre-generated choices drive core gameplay, LLM augments with variety

### Asset Management
- **AWS Icons**: `aws_image/` directory with official AWS architecture icons
  - 16px, 32px, 48px, 64px sizes
  - PNG and SVG formats
  - Organized by category (Service, Resource, Group, Category)
- **Usage**: Real-time AWS diagram visualization in right panel

### Design Principles
1. **Business ⇔ Infrastructure Coupling**: Every business decision meaningfully impacts infrastructure
2. **Realistic AWS Costs**: Follow actual AWS pricing models (EC2, Aurora, EKS tiers)
3. **Educational Value**: Players learn cloud architecture patterns through gameplay
4. **Visual Feedback**: Real-time AWS diagram updates when infrastructure changes
5. **Quality Focus**: 80%+ test coverage, comprehensive E2E scenarios, production-grade code

### Key File Locations
- **Backend**: `/backend/src/` (7 modules)
- **Frontend**: `/frontend/app/`, `/frontend/components/`
- **AI Structure**: `.ai/roles/`, `.ai/skills/`, `.ai/context/`, `.ai/templates/`
- **Documentation**: `docs/epics/`, `docs/features/`, `docs/implementations/`, `docs/verification/`
- **Tests**: `/backend/src/**/*.spec.ts`, `/frontend/e2e/`
- **Config**: `/backend/src/config/`, `/frontend/next.config.ts`
