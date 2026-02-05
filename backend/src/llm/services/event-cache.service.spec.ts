import { Test, TestingModule } from '@nestjs/testing';
import { EventCacheService } from './event-cache.service';

describe('EventCacheService', () => {
  let service: EventCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventCacheService],
    }).compile();

    service = module.get<EventCacheService>(EventCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCacheKey', () => {
    it('should generate consistent keys for similar game states', () => {
      const state1 = { currentTurn: 3, cash: 100000000, users: 5000, trust: 60 };
      const state2 = { currentTurn: 4, cash: 120000000, users: 5500, trust: 62 };

      // Both should map to same bucket
      const key1 = service['getCacheKey'](state1);
      const key2 = service['getCacheKey'](state2);

      expect(key1).toBe(key2); // Same turn bucket (0), cash (medium), users (growth), trust (medium)
    });

    it('should generate different keys for different game stages', () => {
      const earlyGame = { currentTurn: 3, cash: 50000000, users: 1000, trust: 50 };
      const lateGame = { currentTurn: 18, cash: 500000000, users: 100000, trust: 80 };

      const key1 = service['getCacheKey'](earlyGame);
      const key2 = service['getCacheKey'](lateGame);

      expect(key1).not.toBe(key2);
    });
  });

  describe('getTier methods', () => {
    it('should correctly classify cash tiers', () => {
      expect(service['getCashTier'](30000000)).toBe('low');
      expect(service['getCashTier'](150000000)).toBe('medium');
      expect(service['getCashTier'](500000000)).toBe('high');
      expect(service['getCashTier'](2000000000)).toBe('very-high');
    });

    it('should correctly classify user tiers', () => {
      expect(service['getUserTier'](500)).toBe('startup');
      expect(service['getUserTier'](5000)).toBe('growth');
      expect(service['getUserTier'](50000)).toBe('scale');
      expect(service['getUserTier'](500000)).toBe('large');
      expect(service['getUserTier'](5000000)).toBe('massive');
    });

    it('should correctly classify trust tiers', () => {
      expect(service['getTrustTier'](20)).toBe('critical');
      expect(service['getTrustTier'](40)).toBe('low');
      expect(service['getTrustTier'](60)).toBe('medium');
      expect(service['getTrustTier'](80)).toBe('high');
      expect(service['getTrustTier'](95)).toBe('excellent');
    });
  });

  describe('metrics', () => {
    it('should track cache metrics correctly', () => {
      const initialMetrics = service.getMetrics();
      expect(initialMetrics.hits).toBe(0);
      expect(initialMetrics.misses).toBe(0);
      expect(initialMetrics.hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      // Simulate hits and misses
      service['metrics'].hits = 6;
      service['metrics'].misses = 4;
      service['updateHitRate']();

      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBe(0.6); // 6/10
    });

    it('should reset metrics', () => {
      service['metrics'] = {
        hits: 10,
        misses: 5,
        sets: 8,
        hitRate: 0.67,
      };

      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.sets).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });
  });
});
