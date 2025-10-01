# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**AWS 스타트업 타이쿤 (AWS Startup Tycoon)** - A text-based business simulation game where players become a startup CTO making both business decisions and AWS infrastructure design choices.

**Game Concept**: Business choices directly impact infrastructure requirements. Failed infrastructure decisions lead to outages, lost investments, and bankruptcy endings. Success leads to IPO with 1T+ valuation.

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

**Backend**: **NestJS (TypeScript)** ✅ Selected and implemented
- REST API (Phase 0 ✅) + WebSocket (Phase 1) + gRPC (Phase 2+)
- SQLite (dev ✅) → Aurora MySQL Serverless v2 (Phase 1)
- Cognito authentication (Phase 1) + JWT

**Data**: Aurora MySQL Serverless v2, ElastiCache Redis, S3, Athena/Glue/QuickSight

**ML/AI**: Amazon Bedrock (LLM), SageMaker (recommendation models)

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

## Development Priorities

### Phase 0 - MVP (✅ **COMPLETED**)

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

**Next priorities** (Phase 1):
1. Frontend UI (Next.js) with 3-panel layout
2. AWS diagram generator (infrastructure visualization)
3. Aurora MySQL migration + Redis caching
4. AWS Cognito authentication

### Data Integration
- `game_choices_db.json`: 3700+ lines of turn-based choices and effects
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

**Implemented Endpoints** (Phase 0):
- `POST /api/game/start` - Create new game (returns gameId)
- `GET /api/game/:gameId` - Get game state
- `POST /api/game/:gameId/choice` - Execute choice (body: `{"choiceId": number}`)
- `DELETE /api/game/:gameId` - Delete game
- `GET /api/turn/:turnNumber` - Get turn info with available choices
- `GET /api/turn` - Get all turns

**Database Schema** (TypeORM Entities):
- `Game`: gameId (UUID), currentTurn, users, cash, trust, infrastructure[], status
- `Turn`: turnId, turnNumber, eventText, description
- `Choice`: choiceId, turnNumber, text, effects{users, cash, trust, infra[]}, nextTurn
- `ChoiceHistory`: historyId, gameId, turnNumber, choiceId, timestamp

**Game Logic**:
- Initial state: 10M cash, 0 users, 50 trust, ["EC2"] infrastructure
- Win condition: 100K+ users, 300M+ cash, 99+ trust, Aurora Global DB + EKS
- Lose conditions: Bankruptcy (cash < 0), Server outage (trust < 20), Failed IPO

**Test Coverage** (Jest):
- Overall: 44.79% (below 80% target, but core services well-tested)
- GameService: 87.87% (11 test cases)
- TurnService: 100% (1 test case)

**Documentation**: Swagger UI at http://localhost:3000/api-docs

---

## Important Notes

- **Backend Status**: ✅ Phase 0 MVP completed and tested (see `/backend/` directory)
- **Frontend Status**: 📋 Design documents only (see `frontend_architecture.md`)
- **Language Strategy**:
  - **Primary/Default Language**: Korean (한글) - all game content, UI, and text should be in Korean
  - **i18n Support**: Multi-language support is being developed using next-intl, but Korean is the base language
  - Documentation may be in English for technical architecture, but game content is Korean-first
- **Data-First Approach**: 3700+ lines of pre-generated choices must drive gameplay
- **AWS Official Icons**: Must use provided AWS architecture icons for authenticity
- **Educational Game**: Balance entertainment with teaching real cloud architecture patterns
