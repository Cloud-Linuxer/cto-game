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
      triggerRate: 1.0, // Always trigger for E2E tests
    },
  },
}));

/**
 * LLM Event System E2E Tests
 *
 * Tests the integration of LLM services without DB dependency:
 * - LLMEventGeneratorService
 * - VLLMClientService (mocked)
 * - EventCacheService (in-memory)
 * - PromptBuilderService
 * - LLMResponseValidatorService
 */
describe('LLM Event Integration (E2E)', () => {
  let llmGenerator: LLMEventGeneratorService;
  let vllmClient: VLLMClientService;
  let promptBuilder: PromptBuilderService;
  let eventCache: EventCacheService;
  let validator: LLMResponseValidatorService;

  const mockLLMResponse = JSON.stringify({
    eventType: 'MARKET_OPPORTUNITY',
    title: '새로운 시장 진출 기회',
    description: 'B2B SaaS 시장에서 예상치 못한 수요가 발생했습니다.',
    choices: [
      {
        text: '즉시 마케팅 투자 확대',
        effects: {
          usersDelta: 2000,
          cashDelta: -50000000,
          trustDelta: 5,
        },
        resultText: '공격적인 마케팅으로 유저 확보에 성공했습니다.',
      },
      {
        text: '신중하게 시장 조사 후 진입',
        effects: {
          usersDelta: 500,
          cashDelta: -10000000,
          trustDelta: 3,
        },
        resultText: '안정적으로 시장에 진입했습니다.',
      },
    ],
  });

  beforeEach(async () => {
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
        {
          provide: EventCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: LLMResponseValidatorService,
          useValue: {
            validate: jest.fn(),
          },
        },
      ],
    }).compile();

    llmGenerator = module.get<LLMEventGeneratorService>(LLMEventGeneratorService);
    vllmClient = module.get<VLLMClientService>(VLLMClientService);
    promptBuilder = module.get<PromptBuilderService>(PromptBuilderService);
    eventCache = module.get<EventCacheService>(EventCacheService);
    validator = module.get<LLMResponseValidatorService>(LLMResponseValidatorService);

    // Reset metrics
    llmGenerator.resetMetrics();
  });

  describe('Scenario 1: 전체 플로우 - LLM 이벤트 생성부터 검증까지', () => {
    it('should generate LLM event, validate, and cache', async () => {
      // Setup mocks
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(mockLLMResponse);
      jest.spyOn(validator, 'validate').mockResolvedValue({ isValid: true, errors: [] });

      const gameState = {
        currentTurn: 10,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2', 'Aurora'],
      };

      // Execute
      const event = await llmGenerator.generateEvent({ gameState });

      // Assertions
      expect(event).toBeDefined();
      expect(event.title).toBe('새로운 시장 진출 기회');
      expect(event.choices).toHaveLength(2);
      expect(event.choices[0].effects.usersDelta).toBe(2000);

      // Verify flow
      expect(eventCache.get).toHaveBeenCalled();
      expect(vllmClient.generateCompletion).toHaveBeenCalled();
      expect(validator.validate).toHaveBeenCalled();
      expect(eventCache.set).toHaveBeenCalled();

      // Check metrics
      const metrics = llmGenerator.getMetrics();
      expect(metrics.totalGenerated).toBe(1);
      expect(metrics.successfulValidations).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });
  });

  describe('Scenario 2: 캐시 히트 - 동일 게임 상태에서 캐시된 이벤트 재사용', () => {
    it('should return cached event on second request', async () => {
      const cachedEvent = JSON.parse(mockLLMResponse);

      // First request - cache miss
      jest.spyOn(eventCache, 'get')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(cachedEvent);
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(mockLLMResponse);
      jest.spyOn(validator, 'validate').mockResolvedValue({ isValid: true, errors: [] });

      const gameState = {
        currentTurn: 10,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2', 'Aurora'],
      };

      // First request
      const event1 = await llmGenerator.generateEvent({ gameState });
      expect(event1).toBeDefined();

      // Second request - should hit cache
      const event2 = await llmGenerator.generateEvent({ gameState });
      expect(event2).toBeDefined();
      expect(event2.title).toBe(event1.title);

      // Verify LLM was only called once
      expect(vllmClient.generateCompletion).toHaveBeenCalledTimes(1);

      // Check metrics
      const metrics = llmGenerator.getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });
  });

  describe('Scenario 3: 검증 실패 및 Auto-fix', () => {
    it('should handle validation failure with auto-fix', async () => {
      const fixedEvent = JSON.parse(mockLLMResponse);
      fixedEvent.title = 'Fixed Event';

      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(mockLLMResponse);
      jest.spyOn(validator, 'validate').mockResolvedValue({
        isValid: true,
        errors: [],
        fixedEvent,
      });

      const gameState = {
        currentTurn: 10,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2'],
      };

      const event = await llmGenerator.generateEvent({ gameState });

      expect(event).toBeDefined();
      expect(event.title).toBe('Fixed Event');

      const metrics = llmGenerator.getMetrics();
      expect(metrics.successfulValidations).toBe(1);
    });

    it('should return null when validation fails without auto-fix', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(mockLLMResponse);
      jest.spyOn(validator, 'validate').mockResolvedValue({
        isValid: false,
        errors: ['Balance check failed'],
      });

      const gameState = {
        currentTurn: 10,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2'],
      };

      const event = await llmGenerator.generateEvent({ gameState });

      expect(event).toBeNull();

      const metrics = llmGenerator.getMetrics();
      expect(metrics.failedValidations).toBe(1);
    });
  });

  describe('Scenario 4: vLLM 실패 및 Fallback', () => {
    it('should return null when vLLM fails', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(vllmClient, 'generateCompletion').mockRejectedValue(new Error('Timeout'));

      const gameState = {
        currentTurn: 10,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2'],
      };

      const event = await llmGenerator.generateEvent({ gameState });

      expect(event).toBeNull();

      const metrics = llmGenerator.getMetrics();
      expect(metrics.llmFailures).toBe(1);
    });

    it('should use fallback function when LLM fails', async () => {
      jest.spyOn(llmGenerator, 'generateEvent').mockResolvedValue(null);

      const fallbackEvent = { type: 'static', content: 'Fallback event' };
      const fallbackFn = jest.fn().mockResolvedValue(fallbackEvent);

      const result = await llmGenerator.generateEventWithFallback(
        { gameState: { currentTurn: 1, cash: 10000000, users: 0, trust: 50, infrastructure: [] } },
        fallbackFn,
      );

      expect(result).toEqual(fallbackEvent);
      expect(fallbackFn).toHaveBeenCalled();
    });
  });

  describe('Scenario 5: 품질 보증 - 게임 규칙 준수', () => {
    it('should validate event follows balance rules', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(mockLLMResponse);
      jest.spyOn(validator, 'validate').mockResolvedValue({ isValid: true, errors: [] });

      const gameState = {
        currentTurn: 10,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2', 'Aurora'],
      };

      const event = await llmGenerator.generateEvent({ gameState });

      expect(event).toBeDefined();

      // Validate balance rules (EPIC-06 criteria)
      event.choices.forEach((choice) => {
        const { usersDelta, cashDelta, trustDelta } = choice.effects;

        // Cash: -200M ~ +200M
        expect(cashDelta).toBeGreaterThanOrEqual(-200000000);
        expect(cashDelta).toBeLessThanOrEqual(200000000);

        // Users: -5K ~ +5K
        expect(usersDelta).toBeGreaterThanOrEqual(-5000);
        expect(usersDelta).toBeLessThanOrEqual(5000);

        // Trust: -10 ~ +10
        expect(trustDelta).toBeGreaterThanOrEqual(-10);
        expect(trustDelta).toBeLessThanOrEqual(10);
      });

      // Korean content
      expect(event.title).toMatch(/[\u3131-\uD79D]/);
      expect(event.description).toMatch(/[\u3131-\uD79D]/);
    });
  });

  describe('Performance: 응답 시간 검증', () => {
    it('should complete within p95 target (3 seconds)', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(vllmClient, 'generateCompletion').mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockLLMResponse), 2000);
        });
      });
      jest.spyOn(validator, 'validate').mockResolvedValue({ isValid: true, errors: [] });

      const gameState = {
        currentTurn: 10,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2', 'Aurora'],
      };

      const startTime = Date.now();
      const event = await llmGenerator.generateEvent({ gameState });
      const duration = Date.now() - startTime;

      expect(event).toBeDefined();
      expect(duration).toBeLessThan(3000); // p95 < 3s
    }, 10000); // 10s test timeout
  });
});
