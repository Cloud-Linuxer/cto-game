import { Test, TestingModule } from '@nestjs/testing';
import { LLMController } from './llm.controller';
import { LLMEventGeneratorService } from './services/llm-event-generator.service';
import { EventCacheService } from './services/event-cache.service';

// Mock LLMConfig
jest.mock('../config/llm.config', () => ({
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
      triggerRate: 0.1,
    },
  },
}));

describe('LLMController', () => {
  let controller: LLMController;
  let llmGenerator: LLMEventGeneratorService;
  let eventCache: EventCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LLMController],
      providers: [
        {
          provide: LLMEventGeneratorService,
          useValue: {
            getMetrics: jest.fn(),
          },
        },
        {
          provide: EventCacheService,
          useValue: {
            getMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LLMController>(LLMController);
    llmGenerator = module.get<LLMEventGeneratorService>(LLMEventGeneratorService);
    eventCache = module.get<EventCacheService>(EventCacheService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/llm/metrics', () => {
    it('should return complete metrics', () => {
      // Mock data
      jest.spyOn(llmGenerator, 'getMetrics').mockReturnValue({
        totalGenerated: 100,
        successfulValidations: 85,
        failedValidations: 10,
        llmFailures: 5,
        averageGenerationTimeMs: 1500,
        cacheHits: 60,
        cacheMisses: 40,
      });

      jest.spyOn(eventCache, 'getMetrics').mockReturnValue({
        hits: 60,
        misses: 40,
        sets: 40,
        hitRate: 0.6,
      });

      const metrics = controller.getMetrics();

      expect(metrics).toHaveProperty('generation');
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('timestamp');

      expect(metrics.generation.totalGenerated).toBe(100);
      expect(metrics.generation.successfulValidations).toBe(85);
      expect(metrics.generation.failedValidations).toBe(10);
      expect(metrics.generation.llmFailures).toBe(5);
      expect(metrics.generation.averageGenerationTimeMs).toBe(1500);
      expect(metrics.generation.successRate).toBe(0.85); // 85/100
      expect(metrics.generation.failureRate).toBe(0.15); // (10+5)/100

      expect(metrics.cache.hits).toBe(60);
      expect(metrics.cache.misses).toBe(40);
      expect(metrics.cache.hitRate).toBe(0.6);

      expect(metrics.system.llmEnabled).toBe(true);
      expect(metrics.system.vllmEndpoint).toBe('http://localhost:8000');
    });

    it('should calculate success and failure rates correctly', () => {
      jest.spyOn(llmGenerator, 'getMetrics').mockReturnValue({
        totalGenerated: 200,
        successfulValidations: 180,
        failedValidations: 15,
        llmFailures: 5,
        averageGenerationTimeMs: 2000,
        cacheHits: 120,
        cacheMisses: 80,
      });

      jest.spyOn(eventCache, 'getMetrics').mockReturnValue({
        hits: 120,
        misses: 80,
        sets: 80,
        hitRate: 0.6,
      });

      const metrics = controller.getMetrics();

      expect(metrics.generation.successRate).toBe(0.9); // 180/200
      expect(metrics.generation.failureRate).toBe(0.1); // (15+5)/200
    });

    it('should handle zero attempts gracefully', () => {
      jest.spyOn(llmGenerator, 'getMetrics').mockReturnValue({
        totalGenerated: 0,
        successfulValidations: 0,
        failedValidations: 0,
        llmFailures: 0,
        averageGenerationTimeMs: 0,
        cacheHits: 0,
        cacheMisses: 0,
      });

      jest.spyOn(eventCache, 'getMetrics').mockReturnValue({
        hits: 0,
        misses: 0,
        sets: 0,
        hitRate: 0,
      });

      const metrics = controller.getMetrics();

      expect(metrics.generation.successRate).toBe(0);
      expect(metrics.generation.failureRate).toBe(0);
    });
  });

  describe('GET /api/llm/health', () => {
    it('should return healthy status with good metrics', () => {
      jest.spyOn(llmGenerator, 'getMetrics').mockReturnValue({
        totalGenerated: 100,
        successfulValidations: 95,
        failedValidations: 3,
        llmFailures: 2,
        averageGenerationTimeMs: 1500,
        cacheHits: 70,
        cacheMisses: 30,
      });

      jest.spyOn(eventCache, 'getMetrics').mockReturnValue({
        hits: 70,
        misses: 30,
        sets: 30,
        hitRate: 0.7,
      });

      const health = controller.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.checks.llmEnabled).toBe(true);
      expect(health.checks.recentFailureRate).toBe(0.05); // (3+2)/100
      expect(health.checks.cacheHitRate).toBe(0.7);
      expect(health.checks.averageLatency).toBe(1500);
    });

    it('should return unhealthy status with high failure rate', () => {
      jest.spyOn(llmGenerator, 'getMetrics').mockReturnValue({
        totalGenerated: 100,
        successfulValidations: 85,
        failedValidations: 10,
        llmFailures: 5,
        averageGenerationTimeMs: 2000,
        cacheHits: 50,
        cacheMisses: 50,
      });

      jest.spyOn(eventCache, 'getMetrics').mockReturnValue({
        hits: 50,
        misses: 50,
        sets: 50,
        hitRate: 0.5,
      });

      const health = controller.getHealth();

      expect(health.status).toBe('unhealthy'); // failure rate = 15/100 = 0.15 > 0.1
      expect(health.checks.recentFailureRate).toBe(0.15);
    });

    it('should return degraded status with low cache hit rate', () => {
      jest.spyOn(llmGenerator, 'getMetrics').mockReturnValue({
        totalGenerated: 100,
        successfulValidations: 95,
        failedValidations: 3,
        llmFailures: 2,
        averageGenerationTimeMs: 1500,
        cacheHits: 30,
        cacheMisses: 70,
      });

      jest.spyOn(eventCache, 'getMetrics').mockReturnValue({
        hits: 30,
        misses: 70,
        sets: 70,
        hitRate: 0.3, // < 0.4
      });

      const health = controller.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.checks.cacheHitRate).toBe(0.3);
    });

    it('should return degraded status with high latency', () => {
      jest.spyOn(llmGenerator, 'getMetrics').mockReturnValue({
        totalGenerated: 100,
        successfulValidations: 95,
        failedValidations: 3,
        llmFailures: 2,
        averageGenerationTimeMs: 3500, // > 3000ms
        cacheHits: 60,
        cacheMisses: 40,
      });

      jest.spyOn(eventCache, 'getMetrics').mockReturnValue({
        hits: 60,
        misses: 40,
        sets: 40,
        hitRate: 0.6,
      });

      const health = controller.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.checks.averageLatency).toBe(3500);
    });
  });

  describe('GET /api/llm/config', () => {
    it('should return system configuration', () => {
      const config = controller.getConfig();

      expect(config).toHaveProperty('vllm');
      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('features');

      expect(config.vllm.endpoint).toBe('http://localhost:8000');
      expect(config.vllm.timeoutMs).toBe(3000);
      expect(config.vllm.maxRetries).toBe(1);
      expect(config.vllm.modelName).toBe('gpt-oss-20b');

      expect(config.cache.ttlSeconds).toBe(300);
      expect(config.cache.maxSize).toBe(1000);

      expect(config.features.enabled).toBe(true);
      expect(config.features.triggerRate).toBe(0.1);
    });
  });
});
