import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventService } from './event.service';
import { DynamicEvent, EventType, EventSeverity } from '../database/entities/dynamic-event.entity';
import { Game, GameStatus } from '../database/entities/game.entity';
import { EventState } from '../database/entities/event-state.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { SecureRandomService } from '../security/secure-random.service';
import { LLMEventGeneratorService } from '../llm/services/llm-event-generator.service';
import * as seedrandom from 'seedrandom';

describe('EventService', () => {
  let service: EventService;
  let eventRepository: Repository<DynamicEvent>;
  let gameRepository: Repository<Game>;
  let eventStateRepository: Repository<EventState>;

  const mockEventRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockGameRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockEventStateRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockEventHistoryRepository = {
    save: jest.fn(),
  };

  const mockSecureRandomService = {
    generateSecureRandom: jest.fn(() => 0.5),
  };

  const mockLLMEventGenerator = {
    generateEventWithFallback: jest.fn((request, fallbackFn) => fallbackFn()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getRepositoryToken(DynamicEvent),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(Game),
          useValue: mockGameRepository,
        },
        {
          provide: getRepositoryToken(EventState),
          useValue: mockEventStateRepository,
        },
        {
          provide: getRepositoryToken(EventHistory),
          useValue: mockEventHistoryRepository,
        },
        {
          provide: SecureRandomService,
          useValue: mockSecureRandomService,
        },
        {
          provide: LLMEventGeneratorService,
          useValue: mockLLMEventGenerator,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    eventRepository = module.get<Repository<DynamicEvent>>(
      getRepositoryToken(DynamicEvent),
    );
    gameRepository = module.get<Repository<Game>>(
      getRepositoryToken(Game),
    );
    eventStateRepository = module.get<Repository<EventState>>(
      getRepositoryToken(EventState),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('이벤트 조건 검증', () => {
    it('턴 범위 조건이 충족되면 이벤트가 트리거 가능해야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2', 'Aurora'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'TEST_EVENT_01',
        triggerCondition: {
          minTurn: 5,
          maxTurn: 15,
          minUsers: 1000,
          probability: 50,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(true);
    });

    it('턴이 범위를 벗어나면 이벤트가 트리거되지 않아야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 20,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'TEST_EVENT_01',
        triggerCondition: {
          minTurn: 5,
          maxTurn: 15,
          probability: 50,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(false);
    });

    it('유저 수 조건이 충족되어야 트리거 가능해야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 500,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'TEST_EVENT_01',
        triggerCondition: {
          minTurn: 5,
          maxTurn: 15,
          minUsers: 1000,
          probability: 50,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(false);
    });

    it('필수 인프라가 모두 있어야 트리거 가능해야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2', 'Aurora'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'TECH_AWS_OUTAGE',
        triggerCondition: {
          minTurn: 5,
          maxTurn: 23,
          requiredInfra: ['Aurora'],
          probability: 6,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(true);
    });

    it('제외 인프라가 있으면 트리거되지 않아야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2', 'Redis'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'TECH_PERFORMANCE_BOTTLENECK',
        triggerCondition: {
          minTurn: 6,
          maxTurn: 22,
          excludedInfra: ['Redis'],
          probability: 15,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(false);
    });
  });

  describe('확률 기반 트리거 테스트', () => {
    it('기본 확률 50%로 반복 테스트 시 약 50% 발생해야 함', () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
        eventSeed: 12345,
      };

      const probability = 50;
      let triggeredCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const testGame = { ...game, eventSeed: 12345 + i };
        const rng = seedrandom(`${testGame.gameId}-${testGame.eventSeed}-${testGame.currentTurn}`);
        const roll = rng();

        if (roll < probability / 100) {
          triggeredCount++;
        }
      }

      const actualRate = triggeredCount / iterations;
      expect(actualRate).toBeGreaterThan(0.45);
      expect(actualRate).toBeLessThan(0.55);
    });

    it('확률 0%인 이벤트는 절대 발생하지 않아야 함', () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        eventSeed: 12345,
      };

      const probability = 0;

      for (let i = 0; i < 100; i++) {
        const testGame = { ...game, eventSeed: 12345 + i };
        const rng = seedrandom(`${testGame.gameId}-${testGame.eventSeed}-${testGame.currentTurn}`);
        const roll = rng();

        expect(roll < probability / 100).toBe(false);
      }
    });

    it('확률 100%인 이벤트는 항상 발생해야 함', () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        eventSeed: 12345,
      };

      const probability = 100;

      for (let i = 0; i < 100; i++) {
        const testGame = { ...game, eventSeed: 12345 + i };
        const rng = seedrandom(`${testGame.gameId}-${testGame.eventSeed}-${testGame.currentTurn}`);
        const roll = rng();

        expect(roll < probability / 100).toBe(true);
      }
    });
  });

  describe('중복 이벤트 방지', () => {
    it('isOneTime이 true인 이벤트는 한 번만 트리거되어야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'MARKET_COMPETITOR_LAUNCH',
        eventType: EventType.COMPETITOR_ACTION,
        isOneTime: true,
        triggerCondition: {
          minTurn: 5,
          maxTurn: 15,
          probability: 100,
        },
      };

      // First time - no event state
      mockEventStateRepository.findOne.mockResolvedValueOnce(null);
      const canTriggerFirst = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );
      expect(canTriggerFirst).toBe(true);

      // Second time - event already completed
      mockEventStateRepository.findOne.mockResolvedValueOnce({
        isCompleted: true,
      } as any);
      const canTriggerSecond = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );
      expect(canTriggerSecond).toBe(false);
    });

    it('isOneTime이 false인 이벤트는 반복 발생 가능해야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'SEASONAL_EVENT',
        eventType: EventType.ECONOMIC_CHANGE,
        isOneTime: false,
        triggerCondition: {
          minTurn: 1,
          maxTurn: 25,
          probability: 100,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue({
        hasTriggered: true,
      });

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(true);
    });
  });

  describe('checkRandomEvent', () => {
    it('조건에 맞는 이벤트가 없으면 null 반환', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 1,
        users: 0,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
        eventSeed: 12345,
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'HIGH_TURN_EVENT',
        triggerCondition: {
          minTurn: 20,
          maxTurn: 25,
          probability: 100,
        },
      };

      mockEventRepository.find.mockResolvedValue([event]);
      mockEventStateRepository.findOne.mockResolvedValue(null);

      const result = await service.checkRandomEvent(game as Game);

      expect(result).toBeNull();
    });

    it('확률 조건을 통과하면 이벤트 반환', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
        eventSeed: 1, // Specific seed for predictable result
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'MARKET_EVENT',
        eventType: EventType.MARKET_OPPORTUNITY,
        triggerCondition: {
          minTurn: 1,
          maxTurn: 25,
          probability: 100, // 100% probability
        },
      };

      mockEventRepository.find.mockResolvedValue([event]);
      mockEventStateRepository.findOne.mockResolvedValue(null);

      const result = await service.checkRandomEvent(game as Game);

      expect(result).toBeDefined();
      expect(result?.eventId).toBe('MARKET_EVENT');
    });
  });
});
