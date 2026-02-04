import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventCacheService } from './event-cache.service';
import { Choice } from '../database/entities/choice.entity';
import { Turn } from '../database/entities/turn.entity';

describe('EventCacheService', () => {
  let service: EventCacheService;
  let choiceRepository: Repository<Choice>;
  let turnRepository: Repository<Turn>;

  const mockChoices: Partial<Choice>[] = [
    {
      choiceId: 1,
      turnNumber: 1,
      text: '개발자 채용하기',
      effects: { users: 0, cash: -1000000, trust: 5, infra: [] },
      nextTurn: 2,
    },
    {
      choiceId: 2,
      turnNumber: 1,
      text: '시드 투자 피칭',
      effects: { users: 0, cash: 5000000, trust: 10, infra: [] },
      nextTurn: 2,
    },
    {
      choiceId: 3,
      turnNumber: 1,
      text: 'Aurora 마이그레이션',
      effects: { users: 0, cash: -500000, trust: 0, infra: ['Aurora'] },
      nextTurn: 2,
    },
    {
      choiceId: 4,
      turnNumber: 2,
      text: 'AWS Solutions Architect 컨설팅',
      effects: { users: 0, cash: -2000000, trust: 15, infra: [] },
      nextTurn: 3,
    },
  ];

  const mockTurns: Partial<Turn>[] = [
    {
      turnId: 1,
      turnNumber: 1,
      eventText: '스타트업 창업',
      description: '첫 턴',
    },
    {
      turnId: 2,
      turnNumber: 2,
      eventText: '성장기',
      description: '두 번째 턴',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCacheService,
        {
          provide: getRepositoryToken(Choice),
          useValue: {
            find: jest.fn().mockResolvedValue(mockChoices),
          },
        },
        {
          provide: getRepositoryToken(Turn),
          useValue: {
            find: jest.fn().mockResolvedValue(mockTurns),
          },
        },
      ],
    }).compile();

    service = module.get<EventCacheService>(EventCacheService);
    choiceRepository = module.get<Repository<Choice>>(getRepositoryToken(Choice));
    turnRepository = module.get<Repository<Turn>>(getRepositoryToken(Turn));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should load all choices and turns into cache', async () => {
      await service.onModuleInit();

      expect(choiceRepository.find).toHaveBeenCalled();
      expect(turnRepository.find).toHaveBeenCalled();

      const choice = service.getChoice(1);
      expect(choice).toBeDefined();
      expect(choice?.text).toBe('개발자 채용하기');
    });

    it('should compute performance metrics on load', async () => {
      const start = Date.now();
      await service.onModuleInit();
      const duration = Date.now() - start;

      const metrics = service.getPerformanceMetrics();

      expect(metrics.cachedChoices).toBe(4);
      expect(metrics.cachedTurns).toBe(2);
      expect(duration).toBeLessThan(100); // Should load in < 100ms
    });
  });

  describe('getChoice', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return cached choice in O(1) time', () => {
      const start = performance.now();
      const choice = service.getChoice(1);
      const duration = performance.now() - start;

      expect(choice).toBeDefined();
      expect(choice?.choiceId).toBe(1);
      expect(duration).toBeLessThan(1); // O(1) lookup < 1ms
    });

    it('should return undefined for non-existent choice', () => {
      const choice = service.getChoice(999);
      expect(choice).toBeUndefined();
    });

    it('should track cache hits', () => {
      service.getChoice(1);
      service.getChoice(2);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.cacheHits).toBeGreaterThan(0);
    });
  });

  describe('getChoicesForTurn', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return all choices for a turn', () => {
      const choices = service.getChoicesForTurn(1);

      expect(choices).toHaveLength(3);
      expect(choices.every(c => c.turnNumber === 1)).toBe(true);
    });

    it('should return choices sorted by effect magnitude', () => {
      const choices = service.getChoicesForTurn(1);

      // Verify descending order
      for (let i = 0; i < choices.length - 1; i++) {
        expect(choices[i].metadata.effectMagnitude)
          .toBeGreaterThanOrEqual(choices[i + 1].metadata.effectMagnitude);
      }
    });

    it('should return empty array for non-existent turn', () => {
      const choices = service.getChoicesForTurn(999);
      expect(choices).toEqual([]);
    });
  });

  describe('getTurn', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return cached turn information', () => {
      const turn = service.getTurn(1);

      expect(turn).toBeDefined();
      expect(turn?.turnNumber).toBe(1);
      expect(turn?.eventText).toBe('스타트업 창업');
    });

    it('should include choice IDs in turn info', () => {
      const turn = service.getTurn(1);

      expect(turn?.choiceIds).toBeDefined();
      expect(turn?.choiceIds.length).toBe(3);
    });
  });

  describe('Secondary indexes', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should detect investment choices', () => {
      expect(service.isInvestmentChoice(2)).toBe(true); // 시드 투자
      expect(service.isInvestmentChoice(1)).toBe(false); // 개발자 채용
    });

    it('should detect infrastructure upgrades', () => {
      expect(service.hasInfraUpgrade(3)).toBe(true); // Aurora
      expect(service.hasInfraUpgrade(1)).toBe(false);
    });

    it('should detect staff hiring', () => {
      expect(service.isStaffHiringChoice(1)).toBe(true); // 개발자 채용
      expect(service.isStaffHiringChoice(2)).toBe(false);
    });

    it('should detect consulting', () => {
      expect(service.isConsultingChoice(4)).toBe(true);
      expect(service.isConsultingChoice(1)).toBe(false);
    });
  });

  describe('getHighImpactChoices', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return top N choices by effect magnitude', () => {
      const topChoices = service.getHighImpactChoices(1, 2);

      expect(topChoices).toHaveLength(2);
      expect(topChoices[0].metadata.effectMagnitude)
        .toBeGreaterThanOrEqual(topChoices[1].metadata.effectMagnitude);
    });
  });

  describe('Performance targets', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should meet memory usage target (< 5MB for 50 events)', () => {
      const metrics = service.getPerformanceMetrics();
      const memoryMB = parseFloat(metrics.estimatedMemoryMB);

      expect(memoryMB).toBeLessThan(5);
    });

    it('should achieve > 95% cache hit rate', () => {
      // Perform 100 lookups
      for (let i = 0; i < 100; i++) {
        service.getChoice(1);
        service.getChoicesForTurn(1);
      }

      const metrics = service.getPerformanceMetrics();
      const hitRate = parseFloat(metrics.hitRate);

      expect(hitRate).toBeGreaterThan(95);
    });

    it('should complete lookups in < 1ms (p95)', () => {
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        service.getChoice(1);
        const duration = performance.now() - start;
        durations.push(duration);
      }

      durations.sort((a, b) => a - b);
      const p95 = durations[Math.floor(durations.length * 0.95)];

      expect(p95).toBeLessThan(1);
    });
  });

  describe('clearCache and reloadCache', () => {
    it('should clear all cached data', async () => {
      await service.onModuleInit();

      service.clearCache();

      const choice = service.getChoice(1);
      expect(choice).toBeUndefined();
    });

    it('should reload cache from database', async () => {
      await service.onModuleInit();
      service.clearCache();

      await service.reloadCache();

      const choice = service.getChoice(1);
      expect(choice).toBeDefined();
    });
  });
});
