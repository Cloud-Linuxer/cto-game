import { Test, TestingModule } from '@nestjs/testing';
import { LLMEventGeneratorService } from './llm-event-generator.service';
import { VLLMClientService } from './vllm-client.service';
import { PromptBuilderService } from './prompt-builder.service';
import { EventCacheService } from './event-cache.service';
import { LLMResponseValidatorService } from '../validators/llm-response-validator.service';

// Mock LLMConfig to enable LLM events in tests
jest.mock('../../config/llm.config', () => ({
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
      enabled: true, // Enable for tests
      triggerRate: 0.1,
    },
  },
}));

describe('LLMEventGeneratorService', () => {
  let service: LLMEventGeneratorService;
  let vllmClient: VLLMClientService;
  let promptBuilder: PromptBuilderService;
  let eventCache: EventCacheService;
  let validator: LLMResponseValidatorService;

  const mockLLMEvent = {
    eventType: 'MARKET_OPPORTUNITY',
    title: 'Test Event',
    description: 'Test description',
    choices: [
      {
        text: 'Choice 1',
        effects: { usersDelta: 1000, cashDelta: -10000000, trustDelta: 5 },
        resultText: 'Result 1',
      },
      {
        text: 'Choice 2',
        effects: { usersDelta: -500, cashDelta: 5000000, trustDelta: -2 },
        resultText: 'Result 2',
      },
    ],
  };

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
            buildEventPrompt: jest.fn(),
            extractJsonFromResponse: jest.fn(),
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

    service = module.get<LLMEventGeneratorService>(LLMEventGeneratorService);
    vllmClient = module.get<VLLMClientService>(VLLMClientService);
    promptBuilder = module.get<PromptBuilderService>(PromptBuilderService);
    eventCache = module.get<EventCacheService>(EventCacheService);
    validator = module.get<LLMResponseValidatorService>(LLMResponseValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEvent', () => {
    const mockRequest = {
      gameState: {
        currentTurn: 5,
        cash: 100000000,
        users: 5000,
        trust: 60,
        infrastructure: ['EC2', 'Aurora'],
      },
    };

    it('should return cached event if available', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(mockLLMEvent);

      const result = await service.generateEvent(mockRequest);

      expect(result).toEqual(mockLLMEvent);
      expect(eventCache.get).toHaveBeenCalledWith(mockRequest.gameState);
      expect(vllmClient.generateCompletion).not.toHaveBeenCalled();

      const metrics = service.getMetrics();
      expect(metrics.cacheHits).toBe(1);
    });

    it('should generate new event on cache miss', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(promptBuilder, 'buildEventPrompt').mockReturnValue('test prompt');
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(JSON.stringify(mockLLMEvent));
      jest.spyOn(promptBuilder, 'extractJsonFromResponse').mockReturnValue(JSON.stringify(mockLLMEvent));
      jest.spyOn(validator, 'validate').mockResolvedValue({ isValid: true, errors: [] });
      jest.spyOn(eventCache, 'set').mockResolvedValue();

      const result = await service.generateEvent(mockRequest);

      expect(result).toEqual(mockLLMEvent);
      expect(eventCache.get).toHaveBeenCalled();
      expect(vllmClient.generateCompletion).toHaveBeenCalled();
      expect(eventCache.set).toHaveBeenCalledWith(mockRequest.gameState, mockLLMEvent);

      const metrics = service.getMetrics();
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.successfulValidations).toBe(1);
    });

    it('should return null on LLM failure', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(promptBuilder, 'buildEventPrompt').mockReturnValue('test prompt');
      jest.spyOn(vllmClient, 'generateCompletion').mockRejectedValue(new Error('LLM timeout'));

      const result = await service.generateEvent(mockRequest);

      expect(result).toBeNull();

      const metrics = service.getMetrics();
      expect(metrics.llmFailures).toBe(1);
    });

    it('should return null on validation failure', async () => {
      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(promptBuilder, 'buildEventPrompt').mockReturnValue('test prompt');
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(JSON.stringify(mockLLMEvent));
      jest.spyOn(promptBuilder, 'extractJsonFromResponse').mockReturnValue(JSON.stringify(mockLLMEvent));
      jest.spyOn(validator, 'validate').mockResolvedValue({
        isValid: false,
        errors: ['Balance check failed'],
      });

      const result = await service.generateEvent(mockRequest);

      expect(result).toBeNull();

      const metrics = service.getMetrics();
      expect(metrics.failedValidations).toBe(1);
    });

    it('should use auto-fixed event if available', async () => {
      const badEvent = {
        ...mockLLMEvent,
        choices: [
          {
            ...mockLLMEvent.choices[0],
            effects: { ...mockLLMEvent.choices[0].effects, cashDelta: -999999999 }, // Out of range
          },
        ],
      };
      const fixedEvent = { ...mockLLMEvent, title: 'Fixed Event' };

      jest.spyOn(eventCache, 'get').mockResolvedValue(null);
      jest.spyOn(promptBuilder, 'buildEventPrompt').mockReturnValue('test prompt');
      jest.spyOn(vllmClient, 'generateCompletion').mockResolvedValue(JSON.stringify(badEvent));
      jest.spyOn(promptBuilder, 'extractJsonFromResponse').mockReturnValue(JSON.stringify(badEvent));
      jest.spyOn(validator, 'validate').mockResolvedValue({
        isValid: true,
        errors: [],
        fixedEvent,
      });
      jest.spyOn(eventCache, 'set').mockResolvedValue();

      const result = await service.generateEvent(mockRequest);

      expect(result).toEqual(fixedEvent);

      const metrics = service.getMetrics();
      expect(metrics.successfulValidations).toBe(1);
    });
  });

  describe('generateEventWithFallback', () => {
    it('should call fallback when LLM generation fails', async () => {
      const fallbackEvent = { type: 'static', content: 'Fallback event' };
      const fallbackFn = jest.fn().mockResolvedValue(fallbackEvent);

      jest.spyOn(service, 'generateEvent').mockResolvedValue(null);

      const result = await service.generateEventWithFallback(
        { gameState: { currentTurn: 1, cash: 10000000, users: 0, trust: 50, infrastructure: [] } },
        fallbackFn,
      );

      expect(result).toEqual(fallbackEvent);
      expect(fallbackFn).toHaveBeenCalled();
    });

    it('should not call fallback when LLM succeeds', async () => {
      const fallbackFn = jest.fn();

      jest.spyOn(service, 'generateEvent').mockResolvedValue(mockLLMEvent);

      const result = await service.generateEventWithFallback(
        { gameState: { currentTurn: 1, cash: 10000000, users: 0, trust: 50, infrastructure: [] } },
        fallbackFn,
      );

      expect(result).toBeDefined();
      expect(result.generatedByLLM).toBe(true);
      expect(fallbackFn).not.toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('should track generation metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('totalGenerated');
      expect(metrics).toHaveProperty('successfulValidations');
      expect(metrics).toHaveProperty('failedValidations');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('averageGenerationTimeMs');
      expect(metrics).toHaveProperty('llmFailures');
    });

    it('should reset metrics', () => {
      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(metrics.totalGenerated).toBe(0);
      expect(metrics.successfulValidations).toBe(0);
      expect(metrics.failedValidations).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.averageGenerationTimeMs).toBe(0);
      expect(metrics.llmFailures).toBe(0);
    });
  });
});
