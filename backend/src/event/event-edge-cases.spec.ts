import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventService } from './event.service';
import { DynamicEvent, EventType, EventSeverity } from '../database/entities/dynamic-event.entity';
import { Game, GameStatus } from '../database/entities/game.entity';
import { EventState } from '../database/entities/event-state.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { SecureRandomService } from '../security/secure-random.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * 이벤트 시스템 엣지 케이스 테스트
 *
 * 테스트 범위:
 * - 중복 이벤트 방지
 * - 이벤트 중 게임 종료 조건
 * - 인프라 조건 엣지 케이스
 * - 잘못된 이벤트 데이터 처리
 */
describe('EventService Edge Cases', () => {
  let service: EventService;
  let eventRepository: Repository<DynamicEvent>;

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
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    eventRepository = module.get<Repository<DynamicEvent>>(
      getRepositoryToken(DynamicEvent),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('중복 이벤트 방지', () => {
    it('이미 활성화된 이벤트는 다시 트리거되지 않아야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 5000,
        activeEvents: ['EVENT_A', 'EVENT_B'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'EVENT_A',
        eventType: EventType.MARKET_OPPORTUNITY,
        isOneTime: false,
        triggerCondition: {
          probability: 100,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(false);
    });

    it('isOneTime: false 이벤트는 완료 후 절대 재발생하지 않아야 함', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 15,
        users: 10000,
        cash: 20000000,
        trust: 50,
        activeEvents: [],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'MARKET_COMPETITOR_LAUNCH',
        eventType: EventType.COMPETITOR_ACTION,
        isOneTime: true,
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

      expect(canTrigger).toBe(false);
    });

    it('같은 턴에 여러 이벤트 조건 충족 시 우선순위에 따라 1개만 발생', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 15000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2', 'Aurora'],
        activeEvents: [],
        eventSeed: 1,
      };

      const highPriorityEvent: Partial<DynamicEvent> = {
        eventId: 'HIGH_PRIORITY',
        eventType: EventType.INFRASTRUCTURE_ISSUE,
        severity: EventSeverity.CRITICAL,
        priority: 100,
        triggerCondition: {
          probability: 100,
        },
      };

      const lowPriorityEvent: Partial<DynamicEvent> = {
        eventId: 'LOW_PRIORITY',
        eventType: EventType.MARKET_OPPORTUNITY,
        severity: EventSeverity.MEDIUM,
        priority: 10,
        triggerCondition: {
          probability: 100,
        },
      };

      mockEventRepository.find.mockResolvedValue([
        lowPriorityEvent,
        highPriorityEvent,
      ]);
      mockEventStateRepository.findOne.mockResolvedValue(null);

      const selectedEvent = await service.checkRandomEvent(game as Game);

      // 우선순위 높은 이벤트 선택
      expect(selectedEvent?.eventId).toBe('HIGH_PRIORITY');
    });
  });

  describe('인프라 조건 엣지 케이스', () => {
    it('빈 배열의 필수 인프라는 항상 충족', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        infrastructure: ['EC2'],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'NO_INFRA_REQUIREMENT',
        triggerCondition: {
          requiredInfra: [],
          probability: 100,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(true);
    });

    it('인프라가 하나도 없어도 excludedInfra 조건은 충족', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        infrastructure: [],
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'NO_REDIS_REQUIRED',
        triggerCondition: {
          excludedInfra: ['Redis'],
          probability: 100,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(true);
    });

    it('대소문자가 다른 인프라 이름은 다른 것으로 취급', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        infrastructure: ['ec2'], // 소문자
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'CASE_SENSITIVE',
        triggerCondition: {
          requiredInfra: ['EC2'], // 대문자
          probability: 100,
        },
      };

      mockEventStateRepository.findOne.mockResolvedValue(null);

      const canTrigger = await service['evaluateTriggerCondition'](
        game as Game,
        event as DynamicEvent,
      );

      expect(canTrigger).toBe(false);
    });

    it('인프라 배열이 null인 경우 빈 배열로 처리', async () => {
      const game: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        infrastructure: null as any,
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'NULL_INFRA_CHECK',
        triggerCondition: {
          requiredInfra: ['EC2'],
          probability: 100,
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

  describe('잘못된 이벤트 데이터 처리', () => {
    it('존재하지 않는 이벤트 ID로 실행 시 예외 발생', async () => {
      const game: Partial<Game> = {
        gameId: 'invalid-event',
        currentTurn: 10,
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockEventRepository.findOne.mockResolvedValue(null);

      await expect(
        service['applyEventChoice'](game as Game, 'NONEXISTENT_EVENT', 'CHOICE_1'),
      ).rejects.toThrow();
    });

    it('존재하지 않는 응답 ID로 실행 시 예외 발생', async () => {
      const game: Partial<Game> = {
        gameId: 'invalid-response',
        currentTurn: 10,
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'VALID_EVENT',
        choices: [
          {
            choiceId: 'CHOICE_A',
            text: '응답 A',
            effect: {
              usersDelta: 100,
              cashDelta: 0,
              trustDelta: 0,
            },
          },
        ],
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockEventRepository.findOne.mockResolvedValue(event);

      await expect(
        service['applyEventChoice'](game as Game, 'VALID_EVENT', 'INVALID_CHOICE'),
      ).rejects.toThrow();
    });

    it('이벤트 응답 배열이 비어있는 경우 예외 발생', async () => {
      const game: Partial<Game> = {
        gameId: 'empty-responses',
        currentTurn: 10,
      };

      const event: Partial<DynamicEvent> = {
        eventId: 'NO_CHOICES',
        choices: [],
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockEventRepository.findOne.mockResolvedValue(event);

      await expect(
        service['applyEventChoice'](game as Game, 'NO_CHOICES', 'ANY_CHOICE'),
      ).rejects.toThrow();
    });
  });
});
