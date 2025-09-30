# CTO Game Backend

Backend server for the AWS CTO Infrastructure Strategy Game - a turn-based educational game where players manage cloud infrastructure.

## Features

- **Config-Driven Design**: All game balancing in YAML for easy tuning
- **Deterministic Simulation**: Reproducible gameplay using seeded PRNG
- **Turn-Based Strategy**: 36 turns (months) with action phases and events
- **Complete Tech Tree**: 5 tiers from MVP to Multi-Region architecture
- **Event System**: Major/micro events with player choices
- **PostgreSQL Storage**: State snapshots, action logs, event history
- **REST API**: Full game state management with idempotent operations

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Create database**:
```bash
createdb cto_game
```

4. **Run migrations**:
```bash
npm run migrate
```

5. **Start server**:
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Game Management

#### Create New Game
```
POST /api/games
Content-Type: application/json

{
  "player_name": "John Doe"  // optional
}

Response:
{
  "success": true,
  "data": {
    "game_uuid": "uuid-here",
    "state": { ... }
  }
}
```

#### Get Game State
```
GET /api/games/:game_uuid

Response:
{
  "success": true,
  "data": {
    "game": { /* metadata */ },
    "state": { /* current state */ }
  }
}
```

#### Get Current State Only
```
GET /api/games/:game_uuid/state

Response:
{
  "success": true,
  "data": {
    "turn": 1,
    "mau": 10000,
    "latency_ms": 280,
    "security": 40,
    "cash": 500,
    "burn_monthly": 50,
    "action_cap": 1,
    "resources": { ... },
    "modifiers": { ... }
  }
}
```

### Actions

#### Get Available Actions
```
GET /api/games/:game_uuid/available-actions

Response:
{
  "success": true,
  "data": [
    {
      "type": "ec2_add",
      "name": "Add EC2 Instance",
      "description": "Add additional compute capacity",
      "cost": 0,
      "tier": 1
    },
    ...
  ]
}
```

#### Execute Action
```
POST /api/games/:game_uuid/actions
Content-Type: application/json

{
  "action_type": "alb_enable",
  "params": {}  // optional action-specific parameters
}

Response:
{
  "success": true,
  "data": {
    "state": { /* updated state */ },
    "result": { /* action result */ }
  }
}
```

### Turn Management

#### End Turn
```
POST /api/games/:game_uuid/end-turn

Response:
{
  "success": true,
  "data": {
    "state": { /* updated state */ },
    "turnResult": {
      "turn": 2,
      "events": [
        {
          "type": "major",
          "code": "traffic_surge",
          "title": "Traffic Surge",
          "description": "Viral content causes 50% MAU increase"
        }
      ],
      "warnings": [],
      "mauChange": 1000,
      "gameOver": false
    }
  }
}
```

### History

#### Get Game History
```
GET /api/games/:game_uuid/history

Response:
{
  "success": true,
  "data": {
    "snapshots": [ /* turn snapshots */ ],
    "actions": [ /* action logs */ ],
    "events": [ /* event history */ ]
  }
}
```

## Action Types

### Basic Actions (Tier 1)
- `ec2_add` - Add EC2 instance
- `ec2_remove` - Remove EC2 instance

### Service Actions (Tier 2)
- `alb_enable/disable` - Application Load Balancer
- `rds_enable/disable` - Managed Database

### Advanced Services (Tier 3)
- `rds_multi_az_enable/disable` - Database High Availability
- `elasticache_enable/disable` - In-Memory Caching
- `cloudfront_enable/disable` - CDN
- `waf_enable/disable` - Web Application Firewall
- `net_private_nat_enable/disable` - Private Networking

### Operations (Tier 4)
- `autoscaling_enable/disable` - Auto Scaling
- `obs_enable/disable` - Observability Tools
- `graviton_migration` - ARM Processors (20% cost reduction)
- `ri_purchase` - Reserved Instances (20% cost reduction)

### Strategy (Tier 5)
- `hire_engineer` - Increase action capacity
- `fundraising` - Raise capital (requires 50K MAU)

## Game Rules

### Core Metrics
- **MAU**: Monthly Active Users (growth depends on latency)
- **Latency**: Response time in ms (affects MAU growth and SLA)
- **Security**: 0-100 score (decays over time)
- **Cash**: Available capital
- **Burn**: Monthly infrastructure costs

### Victory Conditions
- Survive 36 turns
- Final score: `MAU + (100 - latency/5) + security + cash/10`
- Grade: S (50K+), A (30K+), B (15K+), C (8K+), D (5K+), F (<5K)

### Failure Conditions
- **Bankruptcy**: Cash < 0 for 2 consecutive turns
- **SLA Failure**: Latency > 350ms for 3 consecutive turns

## Configuration

Game balancing is configured in `config/game_config.yaml`:

```yaml
game:
  max_turns: 36
  major_event_interval: 3
  starting:
    mau: 10000
    latency_ms: 280
    security: 40
    cash: 500

cost:
  ec2_monthly: 50
  rds_monthly: 60
  elasticache_monthly: 80

performance:
  elasticache_bonus_ms: -70
  cloudfront_bonus_ms: -40
```

## Project Structure

```
backend/
├── config/
│   └── game_config.yaml      # Game balancing configuration
├── migrations/
│   ├── 001_initial_schema.sql
│   └── run.js
├── src/
│   ├── config/
│   │   ├── config.js         # Load YAML config
│   │   └── database.js       # PostgreSQL connection
│   ├── models/
│   │   └── GameState.js      # State model
│   ├── services/
│   │   ├── ActionProcessor.js    # Action validation/execution
│   │   ├── FormulaEngine.js      # Metric calculations
│   │   ├── GameService.js        # Business logic
│   │   └── TurnProcessor.js      # Turn cycle orchestration
│   ├── routes/
│   │   └── games.js          # REST API routes
│   └── app.js                # Express application
├── .env.example
├── package.json
└── README.md
```

## Development

### Run Migrations
```bash
npm run migrate
```

### Start Development Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, game rules violations)
- `404` - Not Found (game doesn't exist)
- `500` - Internal Server Error

## References

- `BACKEND_POLICY.md` - Complete technical specification
- `GAME_RULES.md` - Game design document
- `AWS_ICONS_MAPPING.md` - AWS service icon reference