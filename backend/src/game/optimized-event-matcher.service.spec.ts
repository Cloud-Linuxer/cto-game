import { Test, TestingModule } from '@nestjs/testing';
import { OptimizedEventMatcherService } from './optimized-event-matcher.service';
import { EventCacheService } from './event-cache.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { Game, GameStatus } from '../database/entities/game.entity';

describe('OptimizedEventMatcherService', () => {
  let service: OptimizedEventMatcherService;
  let eventCache: EventCacheService;
  let performanceMonitor: PerformanceMonitorService;

  const mockCachedChoices = [
    {
      choiceId: 1,
      turnNumber: 1,
      text: '개발자 채용',
      effects: { users: 0, cash: -1000000, trust: 5, infra: [] },
      nextTurn: 2,
      metadata: {
        isInvestment: false,
        isInfraUpgrade: false,
        isStaffHiring: true,
        isConsulting: false,
        effectMagnitude: 1000005,
        infraTags: new Set<string>(),
      },
    },
    {
      choiceId: 2,
      turnNumber: 1,
      text: '시드 투자 피칭',
      effects: { users: 0, cash: 10000000, trust: 15, infra: [] },
      nextTurn: 2,
      metadata: {
        isInvestment: true,
        isInfraUpgrade: false,
        isStaffHiring: false,
        isConsulting: false,
        effectMagnitude: 10000015,
        infraTags: new Set<string>(),
      },
    },
    {
      choiceId: 3,
      turnNumber: 1,
      text: 'Aurora 마이그레이션',
      effects: { users: 0, cash: -500000, trust: 0, infra: ['Aurora'] },
      nextTurn: 2,
      metadata: {
        isInvestment: false,
        isInfraUpgrade: true,
        isStaffHiring: false,
        isConsulting: false,
        effectMagnitude: 500000,
        infraTags: new Set(['Aurora']),
      },
    },
  ];

  // Additional mock choices for turn 5 (for testing staff hiring validation)
  const mockTurn5Choices = [
    {
      choiceId: 50,
      turnNumber: 5,
      text: 'CTO 채용',
      effects: { users: 0, cash: -5000000, trust: 10, infra: [] },
      nextTurn: 6,
      metadata: {
        isInvestment: false,
        isInfraUpgrade: false,
        isStaffHiring: true,
        isConsulting: false,
        effectMagnitude: 5000010,
        infraTags: new Set<string>(),
      },
    },
    {
      choiceId: 51,
      turnNumber: 5,
      text: 'Series A 투자',
      effects: { users: 0, cash: 50000000, trust: 20, infra: [] },
      nextTurn: 6,
      metadata: {
        isInvestment: true,
        isInfraUpgrade: false,
        isStaffHiring: false,
        isConsulting: false,
        effectMagnitude: 50000020,
        infraTags: new Set<string>(),
      },
    },
    {
      choiceId: 52,
      turnNumber: 5,
      text: 'EKS 마이그레이션',
      effects: { users: 0, cash: -2000000, trust: 0, infra: ['EKS'] },
      nextTurn: 6,
      metadata: {
        isInvestment: false,
        isInfraUpgrade: true,
        isStaffHiring: false,
        isConsulting: false,
        effectMagnitude: 2000000,
        infraTags: new Set(['EKS']),
      },
    },
  ];

  // Game with sufficient resources for all choices
  const mockGame: Game = {
    gameId: 'test-game-1',
    currentTurn: 1,
    users: 1000,
    cash: 10000000, // High cash to pass all validations
    trust: 50, // Sufficient trust for investment (>= 30)
    infrastructure: ['EC2'],
    status: GameStatus.PLAYING,
    maxUserCapacity: 5000,
    multiChoiceEnabled: false,
    investmentRounds: 0,
    equityPercentage: 100,
    userAcquisitionMultiplier: 1.0,
    trustMultiplier: 1.0,
    hasConsultingEffect: false,
    hiredStaff: [],
    hasDR: false,
    ipoConditionMet: false,
    difficultyMode: 'NORMAL',
    grade: null,
    capacityExceededCount: 0,
    resilienceStacks: 0,
    consecutiveNegativeCashTurns: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Game;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizedEventMatcherService,
        {
          provide: EventCacheService,
          useValue: {
            getChoice: jest.fn((id) => {
              // Find in both turn 1 and turn 5 choices
              return [...mockCachedChoices, ...mockTurn5Choices].find(c => c.choiceId === id);
            }),
            getChoicesForTurn: jest.fn((turn) => {
              // Return appropriate choices based on turn number
              if (turn === 5) return mockTurn5Choices;
              return mockCachedChoices;
            }),
            getHighImpactChoices: jest.fn((turn, limit) => {
              const choices = turn === 5 ? mockTurn5Choices : mockCachedChoices;
              return choices.slice(0, limit);
            }),
            isInvestmentChoice: jest.fn((id) => {
              const choice = [...mockCachedChoices, ...mockTurn5Choices].find(c => c.choiceId === id);
              return choice?.metadata.isInvestment || false;
            }),
            hasInfraUpgrade: jest.fn((id) => {
              const choice = [...mockCachedChoices, ...mockTurn5Choices].find(c => c.choiceId === id);
              return choice?.metadata.isInfraUpgrade || false;
            }),
            isStaffHiringChoice: jest.fn((id) => {
              const choice = [...mockCachedChoices, ...mockTurn5Choices].find(c => c.choiceId === id);
              return choice?.metadata.isStaffHiring || false;
            }),
            isConsultingChoice: jest.fn(() => false),
          },
        },
        {
          provide: PerformanceMonitorService,
          useValue: {
            measureSync: jest.fn((op, fn) => fn()),
            getStats: jest.fn(),
            checkPerformanceTargets: jest.fn(() => ({ passed: true, violations: [] })),
            getSystemMetrics: jest.fn(() => ({
              memoryUsageMB: 2.5,
              activeGames: 10,
              requestsPerSecond: 50,
            })),
          },
        },
      ],
    }).compile();

    service = module.get<OptimizedEventMatcherService>(OptimizedEventMatcherService);
    eventCache = module.get<EventCacheService>(EventCacheService);
    performanceMonitor = module.get<PerformanceMonitorService>(PerformanceMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getValidChoices', () => {
    it('should return valid choices for game state', () => {
      const choices = service.getValidChoices(mockGame);

      expect(choices).toBeDefined();
      expect(Array.isArray(choices)).toBe(true);
      expect(performanceMonitor.measureSync).toHaveBeenCalledWith(
        'eventCheck',
        expect.any(Function),
        expect.objectContaining({ turnNumber: 1 })
      );
    });

    it('should return empty array for invalid turn', () => {
      const invalidGame = { ...mockGame, currentTurn: 999 };
      const choices = service.getValidChoices(invalidGame);

      expect(choices).toEqual([]);
    });

    it('should filter out choices that do not meet basic criteria', () => {
      // Low trust game should filter out investment
      const lowTrustGame = { ...mockGame, trust: 20 };
      const choices = service.getValidChoices(lowTrustGame);

      const investmentChoice = choices.find(c => c.choiceId === 2);
      expect(investmentChoice).toBeUndefined();
    });

    it('should filter out infrastructure upgrades when cash is low', () => {
      const lowCashGame = { ...mockGame, cash: 100000 };
      const choices = service.getValidChoices(lowCashGame);

      const infraChoice = choices.find(c => c.choiceId === 3);
      expect(infraChoice).toBeUndefined();
    });

    it('should sort choices by relevance score', () => {
      const choices = service.getValidChoices(mockGame);

      // Verify descending order
      for (let i = 0; i < choices.length - 1; i++) {
        expect(choices[i].score).toBeGreaterThanOrEqual(choices[i + 1].score);
      }
    });

    it('should limit results to maximum 6 choices per turn', () => {
      const manyChoices = Array.from({ length: 10 }, (_, i) => ({
        ...mockCachedChoices[0],
        choiceId: i + 1,
      }));

      jest.spyOn(eventCache, 'getChoicesForTurn').mockReturnValue(manyChoices as any);

      const choices = service.getValidChoices(mockGame);
      expect(choices.length).toBeLessThanOrEqual(6);
    });
  });

  describe('isChoiceValid', () => {
    it('should validate choice for game state in O(1) time', () => {
      // Use turn 5 game with turn 5 choice (staff hiring is valid at turn >= 3)
      const validGame = {
        ...mockGame,
        currentTurn: 5, // Must match choice turnNumber
        cash: 10000000, // Sufficient cash for staff hiring
        trust: 50,
      };

      const start = performance.now();
      // Use choice ID 50 which is from turn 5
      const isValid = service.isChoiceValid(50, validGame);
      const duration = performance.now() - start;

      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(1); // O(1) check < 1ms
      expect(performanceMonitor.measureSync).toHaveBeenCalledWith(
        'choiceValidation',
        expect.any(Function),
        expect.objectContaining({ choiceId: 50 })
      );
    });

    it('should return false for non-existent choice', () => {
      const isValid = service.isChoiceValid(999, mockGame);
      expect(isValid).toBe(false);
    });

    it('should return false for choice from wrong turn', () => {
      const wrongTurnGame = { ...mockGame, currentTurn: 2 };
      const isValid = service.isChoiceValid(1, wrongTurnGame);
      expect(isValid).toBe(false);
    });

    it('should apply basic criteria checks', () => {
      // Investment choice with low trust
      const lowTrustGame = { ...mockGame, trust: 20 };
      const isValid = service.isChoiceValid(2, lowTrustGame);
      expect(isValid).toBe(false);
    });
  });

  describe('validateChoices (batch validation)', () => {
    it('should validate multiple choices efficiently', () => {
      // Use turn 5 game with turn 5 choices
      const resourcefulGame = {
        ...mockGame,
        cash: 10000000, // High cash for infra and staff
        trust: 50,      // Good trust for investment
        currentTurn: 5, // Must match choice turnNumbers
      };

      // Use turn 5 choice IDs (50, 51, 52)
      const choiceIds = [50, 51, 52];
      const results = service.validateChoices(choiceIds, resourcefulGame);

      expect(results.size).toBe(3);

      // All choices should pass with sufficient resources and matching turn
      expect(results.get(50)).toBe(true); // Staff hiring: turn >= 3, cash >= 1M
      expect(results.get(51)).toBe(true); // Investment: trust >= 30
      expect(results.get(52)).toBe(true); // Infra: cash >= 500K
    });

    it('should handle mix of valid and invalid choices', () => {
      const choiceIds = [1, 999, 3];
      const results = service.validateChoices(choiceIds, mockGame);

      // Choice 1: staff hiring - fails because currentTurn (1) < 3
      expect(results.get(1)).toBe(false);
      // Choice 999: non-existent
      expect(results.get(999)).toBe(false);
      // Choice 3: infra - passes (cash >= 500K and is infra upgrade)
      expect(results.get(3)).toBe(true);
    });

    it('should be more efficient than individual validation', () => {
      const choiceIds = [1, 2, 3];

      const batchStart = performance.now();
      service.validateChoices(choiceIds, mockGame);
      const batchDuration = performance.now() - batchStart;

      const individualStart = performance.now();
      choiceIds.forEach(id => service.isChoiceValid(id, mockGame));
      const individualDuration = performance.now() - individualStart;

      // Batch should be at least as fast (allowing for measurement overhead)
      expect(batchDuration).toBeLessThanOrEqual(individualDuration * 2);
    });
  });

  describe('getRecommendedChoices', () => {
    it('should return top N recommended choices', () => {
      const recommended = service.getRecommendedChoices(mockGame, 2);

      expect(recommended).toHaveLength(2);
      expect(performanceMonitor.measureSync).toHaveBeenCalledWith(
        'recommendedChoices',
        expect.any(Function),
        expect.objectContaining({ count: 2 })
      );
    });

    it('should prioritize choices based on game state', () => {
      // Low cash game should prioritize investment
      const lowCashGame = { ...mockGame, cash: 1000000 };
      const recommended = service.getRecommendedChoices(lowCashGame, 3);

      // Investment choice (choiceId 2) should be highly scored
      const investmentChoice = recommended.find(c => c.choiceId === 2);
      expect(investmentChoice).toBeDefined();
    });
  });

  describe('getHighPriorityEvents', () => {
    it('should return high-impact events quickly', () => {
      const events = service.getHighPriorityEvents(1, 3);

      expect(events).toHaveLength(3);
      expect(events[0].reason).toBe('High impact');
      expect(performanceMonitor.measureSync).toHaveBeenCalledWith(
        'highPriorityEvents',
        expect.any(Function),
        expect.objectContaining({ turnNumber: 1, limit: 3 })
      );
    });
  });

  describe('matchEvents (advanced filtering)', () => {
    it('should filter events by criteria', () => {
      const criteria = {
        turnNumber: 1,
        filters: {
          includeInvestment: true,
          includeInfraUpgrade: false,
        },
      };

      const matched = service.matchEvents(criteria);

      // Should include investment (choice 2), exclude infra (choice 3)
      expect(matched.some(e => e.choiceId === 2)).toBe(true);
      expect(matched.some(e => e.choiceId === 3)).toBe(false);
    });

    it('should filter by minimum effect magnitude', () => {
      const criteria = {
        turnNumber: 1,
        filters: {
          minEffectMagnitude: 5000000,
        },
      };

      const matched = service.matchEvents(criteria);

      // Only high-magnitude choices (investment)
      expect(matched.every(e => e.score >= 5000000)).toBe(true);
    });
  });

  describe('getPerformanceHealth', () => {
    it('should report healthy status when targets are met', () => {
      jest.spyOn(performanceMonitor, 'getStats').mockReturnValue({
        operation: 'eventCheck',
        count: 100,
        totalMs: 50,
        avgMs: 0.5,
        minMs: 0.1,
        maxMs: 1.0,
        p50Ms: 0.4,
        p95Ms: 0.8,
        p99Ms: 0.9,
      });

      const health = service.getPerformanceHealth();

      expect(health.status).toBe('healthy');
      expect(health.details.eventCheckP95Ms).toBe(0.8);
    });

    it('should report degraded status when p95 is between 1-2ms', () => {
      jest.spyOn(performanceMonitor, 'getStats').mockReturnValue({
        operation: 'eventCheck',
        count: 100,
        totalMs: 150,
        avgMs: 1.5,
        minMs: 0.5,
        maxMs: 3.0,
        p50Ms: 1.2,
        p95Ms: 1.8,
        p99Ms: 2.5,
      });

      const health = service.getPerformanceHealth();

      expect(health.status).toBe('degraded');
    });

    it('should report critical status when p95 exceeds 2ms', () => {
      jest.spyOn(performanceMonitor, 'getStats').mockReturnValue({
        operation: 'eventCheck',
        count: 100,
        totalMs: 300,
        avgMs: 3.0,
        minMs: 1.0,
        maxMs: 5.0,
        p50Ms: 2.5,
        p95Ms: 4.0,
        p99Ms: 4.5,
      });

      const health = service.getPerformanceHealth();

      expect(health.status).toBe('critical');
    });
  });

  describe('Performance targets', () => {
    it('should meet < 1ms p95 target for event checks', () => {
      const durations: number[] = [];

      // Perform 100 event checks
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        service.getValidChoices(mockGame);
        const duration = performance.now() - start;
        durations.push(duration);
      }

      durations.sort((a, b) => a - b);
      const p95 = durations[Math.floor(durations.length * 0.95)];

      expect(p95).toBeLessThan(1);
    });

    it('should handle 1000 concurrent game simulations efficiently', () => {
      const start = Date.now();

      // Simulate 1000 games making choices
      for (let i = 0; i < 1000; i++) {
        const game = { ...mockGame, gameId: `game-${i}` };
        service.getValidChoices(game);
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 1 second for 1000 games)
      expect(duration).toBeLessThan(1000);
    });
  });
});
