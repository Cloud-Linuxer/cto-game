# LLM Dynamic Event Generation System (EPIC-05)

## Overview

This module integrates local vLLM (gpt-oss-20b model at http://localhost:8000) to generate dynamic, context-aware game events, making the game more engaging and replayable.

**Goal**: Replace static event generation with AI-powered dynamic events while maintaining game balance and achieving <3 second response time.

## Architecture

```
EventService.checkRandomEvent()
  ↓
LLMEventGeneratorService (orchestrator)
  ├─→ EventCacheService (check cache first, <100ms on hit)
  ├─→ PromptBuilderService (build context-aware prompt with few-shot examples)
  ├─→ VLLMClientService (call vLLM API, 2-3s on miss)
  ├─→ LLMResponseValidatorService (3-stage validation + auto-fix)
  └─→ EventCacheService (store validated event for 5min TTL)
```

## Modules

### 1. VLLMClientService (`services/vllm-client.service.ts`)
- HTTP client for vLLM OpenAI-compatible API
- Configurable endpoint, timeout (3s), retries (1)
- Health check endpoint
- Error handling with graceful degradation

### 2. PromptBuilderService (`services/prompt-builder.service.ts`)
- Constructs prompts from templates + game state
- Includes few-shot examples (3 high-quality existing choices)
- Context formatting: turn number, cash, users, trust, infrastructure
- JSON extraction from LLM responses (handles markdown, extra text)

### 3. EventCacheService (`services/event-cache.service.ts`)
- Redis-based cache with 5-minute TTL
- Cache key: normalized game state bucket (turn range, cash tier, user tier, trust tier)
- Target 60%+ hit rate for <1.5s average response
- LRU eviction, graceful fallback if Redis unavailable

### 4. LLMEventGeneratorService (`services/llm-event-generator.service.ts`)
- Orchestrates event generation pipeline
- Fallback to static events if LLM fails
- Metrics tracking (generation time, cache hits, validation failures)
- Feature flag support (LLM_EVENTS_ENABLED)

### 5. LLMResponseValidatorService (`validators/llm-response-validator.service.ts`)
- 3-stage validation pipeline:
  1. **Structure**: Required fields, choice count, field types
  2. **Balance**: Effect ranges (cash: ±50-200M, users: ±1K-5K, trust: ±3-10)
  3. **Content**: Forbidden words, Korean ratio, choice uniqueness
- Auto-fix capabilities for balance issues
- Quality score calculation (coherence, balance, entertainment, educational)

## Configuration

### Environment Variables (`.env`)

```bash
# LLM Configuration
VLLM_ENDPOINT=http://localhost:8000
VLLM_TIMEOUT_MS=3000
VLLM_MAX_RETRIES=1
VLLM_MODEL_NAME=gpt-oss-20b

# Event Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
EVENT_CACHE_TTL_SECONDS=300
EVENT_CACHE_MAX_SIZE=1000

# Feature Flags
LLM_EVENTS_ENABLED=true
LLM_EVENTS_TRIGGER_RATE=0.1
```

### LLM Config (`config/llm.config.ts`)

```typescript
export const LLMConfig = {
  vllm: {
    endpoint: 'http://localhost:8000',
    timeoutMs: 3000,
    maxRetries: 1,
    modelName: 'gpt-oss-20b',
  },
  cache: {
    ttlSeconds: 300,
    maxSize: 1000,
  },
  features: {
    enabled: true,
    triggerRate: 0.1,
  },
};
```

## Prompt Engineering

### System Prompt
- Game rules: cash (±50M~200M), users (±1K~5K), trust (±3~10)
- Infrastructure: EC2, Aurora, ALB, EKS, Redis, Aurora Global DB
- Event requirements: realistic scenario, 2-3 choices, clear trade-offs
- Response format: JSON only (no markdown)

### Few-Shot Examples
- 3 curated examples from existing 253 choices
- Different event types: MARKET_OPPORTUNITY, INFRASTRUCTURE_CRISIS, FUNDING_OPPORTUNITY
- Diverse game stages: early, growth, scale-up

### Context Prompt
- Current turn, cash, users, trust, infrastructure
- Game stage: 초기 스타트업, 성장기, 확장기, 스케일업, IPO 준비

## Caching Strategy

### Cache Key Normalization
```typescript
function getCacheKey(gameState) {
  const turnBucket = Math.floor(gameState.currentTurn / 5); // 0-4, 5-9, etc.
  const cashTier = getCashTier(gameState.cash); // 'low', 'medium', 'high', 'very-high'
  const userTier = getUserTier(gameState.users); // 'startup', 'growth', 'scale', 'large', 'massive'
  const trustTier = getTrustTier(gameState.trust); // 'critical', 'low', 'medium', 'high', 'excellent'

  return `event:${turnBucket}:${cashTier}:${userTier}:${trustTier}`;
}
```

### Expected Performance
- Cache hit: <100ms (Redis lookup)
- Cache miss: 2-3s (LLM generation + validation)
- Target average: <1.5s with 60% hit rate

## Integration with EventService

The `EventService.checkRandomEvent()` method now:
1. Checks if event should trigger (10% probability by default)
2. Tries LLM event generation first (with cache)
3. Falls back to static events if LLM fails or is disabled
4. Returns `DynamicEvent` entity (compatible with existing code)

### Fallback Logic
```typescript
const llmEvent = await this.llmEventGenerator.generateEventWithFallback(
  { gameState },
  async () => this.selectStaticEvent(game),
);
```

## Testing

### Unit Tests
- **PromptBuilderService**: 10 tests (prompt formatting, JSON extraction)
- **EventCacheService**: 9 tests (cache keys, tier classification, metrics)
- **VLLMClientService**: 6 tests (API calls, retries, health checks)
- **LLMEventGeneratorService**: 10 tests (generation pipeline, fallback, metrics)

### Test Coverage
- All LLM services: 90%+ coverage
- Focus on edge cases: timeouts, invalid responses, balance violations

### Running Tests
```bash
npm test -- src/llm --testTimeout=10000
```

## Metrics Tracking

### EventCacheService Metrics
- `hits`: Number of cache hits
- `misses`: Number of cache misses
- `sets`: Number of cache writes
- `hitRate`: Cache hit ratio (0-1)

### LLMEventGeneratorService Metrics
- `totalGenerated`: Total events generated
- `successfulValidations`: Events that passed validation
- `failedValidations`: Events that failed validation
- `cacheHits`: Cache hits
- `cacheMisses`: Cache misses
- `averageGenerationTimeMs`: Average generation time
- `llmFailures`: LLM API failures

### Accessing Metrics
```typescript
const cacheMetrics = eventCacheService.getMetrics();
const generatorMetrics = llmEventGenerator.getMetrics();
```

## Feature Flags

### Disabling LLM Events
```bash
LLM_EVENTS_ENABLED=false
```
When disabled, only static events are used.

### Adjusting Trigger Rate
```bash
LLM_EVENTS_TRIGGER_RATE=0.15  # 15% probability per turn
```

## Error Handling

### Graceful Degradation
- vLLM service down → fallback to static events
- Redis unavailable → cache disabled, direct LLM calls
- Timeout (3s) → fallback to static events
- Invalid response → validation fails, fallback to static events

### Logging
- All services use NestJS Logger
- Errors logged with context (service name, error details)
- Debug logs for development (disabled in production)

## Performance Targets

- **Response Time**: Average <1.5s, p95 <3s
- **Cache Hit Rate**: >60% within 20 games
- **Quality**: >90% of generated events pass validation
- **Reliability**: <5% fallback to static events under normal operation

## Future Enhancements (Out of Scope)

1. **Player Choice Learning**: Track which choices players prefer, adjust generation
2. **Difficulty Adaptation**: Generate harder/easier events based on player performance
3. **Multi-turn Event Chains**: Events that span 2-3 turns with consequences
4. **Personalized Events**: Use player history to generate tailored scenarios
5. **LLM Fine-tuning**: Fine-tune gpt-oss-20b on game-specific data for better quality

## Dependencies

```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "axios": "^1.6.0"
  }
}
```

## File Structure

```
backend/src/llm/
├── llm.module.ts                          # Module container
├── config/
├── services/
│   ├── vllm-client.service.ts             # vLLM API client
│   ├── llm-event-generator.service.ts     # Event generation orchestrator
│   ├── prompt-builder.service.ts          # Prompt construction
│   └── event-cache.service.ts             # Redis caching
├── templates/
│   ├── system-prompt.template.ts          # System prompt with game rules
│   ├── few-shot-examples.ts               # Curated examples
│   └── event-schemas.ts                   # (Not implemented)
├── dto/
│   ├── llm-request.dto.ts                 # Request interfaces
│   └── llm-response.dto.ts                # Response interfaces
├── validators/
│   ├── llm-response-validator.service.ts  # 3-stage validation
│   └── validation.types.ts                # Validation type definitions
└── tests/
    ├── vllm-client.service.spec.ts
    ├── llm-event-generator.service.spec.ts
    ├── prompt-builder.service.spec.ts
    └── event-cache.service.spec.ts
```

## Verification Checklist

- ✅ vllm health check endpoint
- ✅ Unit tests: 35 tests passing (100%)
- ✅ TypeScript compilation: 0 errors
- ✅ Integration with EventService
- ⏳ E2E test: Play full game (requires vLLM service running)
- ⏳ Performance test: 100 requests, p95 <3s (requires vLLM + Redis)
- ⏳ Quality test: Manual review of 20 events (requires vLLM)
- ✅ Fallback test: Service works without vLLM/Redis
- ✅ Documentation: Complete

## Next Steps

1. Start vLLM service: `vllm serve gpt-oss-20b --host localhost --port 8000`
2. Start Redis: `redis-server`
3. Run backend: `npm run start:dev`
4. Test event generation: Play a few turns and observe LLM-generated events
5. Monitor metrics and tune cache settings for optimal hit rate
6. Review generated events for quality and balance
