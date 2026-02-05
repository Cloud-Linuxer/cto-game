import { Test, TestingModule } from '@nestjs/testing';
import { LLMEventGeneratorService } from '../../services/llm-event-generator.service';
import { VLLMClientService } from '../../services/vllm-client.service';
import { PromptBuilderService } from '../../services/prompt-builder.service';
import { EventCacheService } from '../../services/event-cache.service';
import { LLMResponseValidatorService } from '../../validators/llm-response-validator.service';

// Mock LLMConfig to enable LLM events
jest.mock('../../../config/llm.config', () => ({
  LLMConfig: {
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
      triggerRate: 1.0,
    },
  },
}));

/**
 * LLM Event System Performance Tests
 *
 * EPIC-06 Feature 2 Requirements:
 * - p95 response time < 3s
 * - Average response time < 1.5s
 * - Cache hit rate > 60% (after 100 requests)
 *
 * Test methodology:
 * 1. Warm-up: 20 requests to populate cache
 * 2. Main test: 100 requests with varied game states
 * 3. Measure: p50, p95, p99, average, cache hit rate
 */
describe('LLM Performance Tests', () => {
  let llmGenerator: LLMEventGeneratorService;
  let vllmClient: VLLMClientService;

  const mockLLMResponse = JSON.stringify({
    eventType: 'MARKET_OPPORTUNITY',
    title: '새로운 시장 진출 기회',
    description: 'B2B SaaS 시장에서 수요가 발생했습니다.',
    choices: [
      {
        text: '마케팅 투자 확대',
        effects: { usersDelta: 2000, cashDelta: -50000000, trustDelta: 5 },
        resultText: '유저 확보 성공',
      },
      {
        text: '신중하게 진입',
        effects: { usersDelta: 500, cashDelta: -10000000, trustDelta: 3 },
        resultText: '안정적 진입',
      },
    ],
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMEventGeneratorService,
        {
          provide: VLLMClientService,
          useValue: {
            generateCompletion: jest.fn(),
          },
        },
        {
          provide: PromptBuilderService,
          useValue: {
            buildEventPrompt: jest.fn(() => 'test prompt'),
            extractJsonFromResponse: jest.fn((response) => response),
          },
        },
        EventCacheService, // Use real cache service
        {
          provide: LLMResponseValidatorService,
          useValue: {
            validate: jest.fn(() => ({ isValid: true, errors: [] })),
          },
        },
      ],
    }).compile();

    llmGenerator = module.get<LLMEventGeneratorService>(LLMEventGeneratorService);
    vllmClient = module.get<VLLMClientService>(VLLMClientService);
  });

  beforeEach(async () => {
    // Reset metrics and clear cache before each test
    llmGenerator.resetMetrics();
    const eventCache = (llmGenerator as any).eventCache;
    if (eventCache) {
      // Clear in-memory cache
      const inMemoryCache = (eventCache as any).inMemoryCache;
      if (inMemoryCache) {
        inMemoryCache.clear();
      }
    }
  });

  describe('Performance Benchmark: 100 Requests', () => {
    it('should achieve p95 < 3s and average < 1.5s', async () => {
      // Mock vLLM with realistic response time (2-2.5s)
      jest.spyOn(vllmClient, 'generateCompletion').mockImplementation(() => {
        const delay = 2000 + Math.random() * 500; // 2-2.5s
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockLLMResponse), delay);
        });
      });

      const responseTimes: number[] = [];

      // Warm-up: 20 requests to populate cache
      console.log('🔥 Warm-up: 20 requests...');
      for (let i = 0; i < 20; i++) {
        const gameState = generateGameState(i);
        await llmGenerator.generateEvent({ gameState });
      }

      // Main test: 100 requests
      console.log('⚡ Main test: 100 requests...');
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const gameState = generateGameState(i);
        const reqStartTime = Date.now();

        await llmGenerator.generateEvent({ gameState });

        const reqDuration = Date.now() - reqStartTime;
        responseTimes.push(reqDuration);
      }

      const totalDuration = Date.now() - startTime;

      // Calculate metrics
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
      const average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      const metrics = llmGenerator.getMetrics();
      const cacheHitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);

      // Print report
      console.log('\n📊 Performance Test Results:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Total requests:    100`);
      console.log(`Total duration:    ${(totalDuration / 1000).toFixed(2)}s`);
      console.log(`Throughput:        ${(100 / (totalDuration / 1000)).toFixed(2)} req/s`);
      console.log('');
      console.log('Response Time:');
      console.log(`  Average:         ${average.toFixed(0)}ms`);
      console.log(`  p50 (median):    ${p50.toFixed(0)}ms`);
      console.log(`  p95:             ${p95.toFixed(0)}ms ${p95 < 3000 ? '✅' : '❌'}`);
      console.log(`  p99:             ${p99.toFixed(0)}ms`);
      console.log('');
      console.log('Cache Performance:');
      console.log(`  Hits:            ${metrics.cacheHits}`);
      console.log(`  Misses:          ${metrics.cacheMisses}`);
      console.log(`  Hit rate:        ${(cacheHitRate * 100).toFixed(1)}% ${cacheHitRate > 0.6 ? '✅' : '❌'}`);
      console.log('');
      console.log('Validation:');
      console.log(`  Successful:      ${metrics.successfulValidations}`);
      console.log(`  Failed:          ${metrics.failedValidations}`);
      console.log(`  LLM failures:    ${metrics.llmFailures}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Assertions (EPIC-06 requirements)
      expect(p95).toBeLessThan(3000); // p95 < 3s
      expect(average).toBeLessThan(1500); // average < 1.5s
      expect(cacheHitRate).toBeGreaterThan(0.6); // cache hit rate > 60%
    }, 300000); // 5min timeout
  });

  describe('Cache Effectiveness Test', () => {
    it('should achieve >60% cache hit rate with repeated game states', async () => {
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(mockLLMResponse);

      // Generate 10 unique game states
      const uniqueStates = Array.from({ length: 10 }, (_, i) => generateGameState(i));

      // Request each state 10 times (total 100 requests)
      // Note: Due to cache key bucketing, similar states may map to same cache key
      // Expected: >60% hit rate overall
      for (let round = 0; round < 10; round++) {
        for (const state of uniqueStates) {
          await llmGenerator.generateEvent({ gameState: state });
        }
      }

      const metrics = llmGenerator.getMetrics();
      const hitRate = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);

      console.log('\n📊 Cache Effectiveness Test:');
      console.log(`  Total requests:   100`);
      console.log(`  Cache hits:       ${metrics.cacheHits}`);
      console.log(`  Cache misses:     ${metrics.cacheMisses}`);
      console.log(`  Hit rate:         ${(hitRate * 100).toFixed(1)}%\n`);

      // Main requirement: >60% hit rate
      expect(hitRate).toBeGreaterThan(0.6);

      // Cache misses should be low (but exact number depends on bucketing logic)
      expect(metrics.cacheMisses).toBeLessThanOrEqual(40); // At least 60% hits
    });
  });

  describe('Load Test: Concurrent Requests', () => {
    it('should handle 20 concurrent requests without degradation', async () => {
      jest.spyOn(vllmClient, 'generateCompletion').mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockLLMResponse), 2000);
        });
      });

      const concurrentRequests = 20;
      const responseTimes: number[] = [];

      const startTime = Date.now();

      // Execute 20 requests concurrently
      const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
        const gameState = generateGameState(i);
        const reqStartTime = Date.now();
        await llmGenerator.generateEvent({ gameState });
        const reqDuration = Date.now() - reqStartTime;
        responseTimes.push(reqDuration);
      });

      await Promise.all(promises);

      const totalDuration = Date.now() - startTime;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      console.log('\n📊 Concurrent Load Test:');
      console.log(`  Concurrent requests: ${concurrentRequests}`);
      console.log(`  Total duration:      ${(totalDuration / 1000).toFixed(2)}s`);
      console.log(`  Avg response time:   ${avgResponseTime.toFixed(0)}ms\n`);

      // Should complete within reasonable time (not 20 * 2s = 40s)
      // With concurrency, should be closer to 2s
      expect(totalDuration).toBeLessThan(5000); // < 5s for 20 concurrent requests
    }, 10000);
  });

  describe('Stress Test: Cache Overflow', () => {
    it('should handle cache overflow gracefully (>1000 unique states)', async () => {
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(mockLLMResponse);

      // Generate 1200 unique game states (exceeds cache max size of 1000)
      const uniqueStatesCount = 1200;

      for (let i = 0; i < uniqueStatesCount; i++) {
        const gameState = generateUniqueGameState(i);
        await llmGenerator.generateEvent({ gameState });
      }

      const metrics = llmGenerator.getMetrics();

      console.log('\n📊 Cache Overflow Stress Test:');
      console.log(`  Total requests:      ${uniqueStatesCount}`);
      console.log(`  Cache hits:          ${metrics.cacheHits}`);
      console.log(`  Cache misses:        ${metrics.cacheMisses}`);
      console.log(`  LLM calls:           ${(vllmClient.generateCompletion as jest.Mock).mock.calls.length}\n`);

      // Should not crash
      expect(metrics.totalGenerated).toBe(uniqueStatesCount);
    }, 60000); // 1min timeout
  });
});

/**
 * Generate game state for testing
 * Uses bucketing to create cache-friendly states
 * Note: Cache keys group states into buckets (turn/5, cash tier, user tier, trust tier)
 * To ensure 10 unique cache keys, we vary multiple dimensions
 */
function generateGameState(index: number) {
  // Vary turn (in steps of 5 to create different turn buckets)
  // Vary users (to create different user tiers)
  const turnOffset = Math.floor(index / 3) * 5; // 0-2: turn 10, 3-5: turn 15, 6-8: turn 20, 9: turn 25
  const users = 1000 + index * 2000; // 1K, 3K, 5K, 7K, 9K, 11K, ... (varies user tier)

  return {
    currentTurn: 10 + turnOffset,
    cash: 100000000,
    users,
    trust: 60,
    infrastructure: ['EC2', 'Aurora'],
  };
}

/**
 * Generate unique game state for stress testing
 */
function generateUniqueGameState(index: number) {
  return {
    currentTurn: 10 + Math.floor(index / 100), // Varies slowly
    cash: 100000000 + index * 1000000, // Unique cash for each request
    users: 5000 + index,
    trust: 50 + (index % 20),
    infrastructure: index % 2 === 0 ? ['EC2'] : ['EC2', 'Aurora'],
  };
}
