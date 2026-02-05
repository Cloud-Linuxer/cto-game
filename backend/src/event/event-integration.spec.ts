import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventService } from './event.service';
import { GameService } from '../game/game.service';
import { DynamicEvent, EventType, EventSeverity } from '../database/entities/dynamic-event.entity';
import { Game, GameStatus } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { EventState } from '../database/entities/event-state.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { SecureRandomService } from '../security/secure-random.service';
import { LLMEventGeneratorService } from '../llm/services/llm-event-generator.service';
import { TrustHistoryService } from '../game/trust-history.service';
import { AlternativeInvestmentService } from '../game/alternative-investment.service';

/**
 * 이벤트 시스템 통합 테스트
 *
 * 테스트 범위:
 * - 이벤트 발생 → 응답 선택 → 효과 적용 전체 플로우
 * - 이벤트와 기존 턴 시스템 통합
 */
describe('EventService Integration Tests', () => {
  let eventService: EventService;
  let gameService: GameService;
  let gameRepository: Repository<Game>;
  let eventRepository: Repository<DynamicEvent>;
  let choiceRepository: Repository<Choice>;
  let historyRepository: Repository<ChoiceHistory>;

  const mockGameRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockEventRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockChoiceRepository = {
    findOne: jest.fn(),
  };

  const mockHistoryRepository = {
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

  const mockTrustHistoryService = {
    record: jest.fn(),
    recordTrustChange: jest.fn(),
  };

  const mockAlternativeInvestmentService = {
    canUseBridgeFinancing: jest.fn().mockReturnValue(true),
    canUseGovernmentGrant: jest.fn().mockReturnValue(true),
    executeBridgeFinancing: jest.fn(),
    executeGovernmentGrant: jest.fn(),
    submitGovernmentReport: jest.fn(),
    needsAlternativeInvestment: jest.fn().mockReturnValue(false),
  };

  const mockLLMEventGenerator = {
    generateEventWithFallback: jest.fn((request, fallbackFn) => fallbackFn()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        GameService,
        {
          provide: getRepositoryToken(Game),
          useValue: mockGameRepository,
        },
        {
          provide: getRepositoryToken(DynamicEvent),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(Choice),
          useValue: mockChoiceRepository,
        },
        {
          provide: getRepositoryToken(ChoiceHistory),
          useValue: mockHistoryRepository,
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
          provide: TrustHistoryService,
          useValue: mockTrustHistoryService,
        },
        {
          provide: AlternativeInvestmentService,
          useValue: mockAlternativeInvestmentService,
        },
        {
          provide: LLMEventGeneratorService,
          useValue: mockLLMEventGenerator,
        },
      ],
    }).compile();

    eventService = module.get<EventService>(EventService);
    gameService = module.get<GameService>(GameService);
    gameRepository = module.get<Repository<Game>>(getRepositoryToken(Game));
    eventRepository = module.get<Repository<DynamicEvent>>(
      getRepositoryToken(DynamicEvent),
    );
    choiceRepository = module.get<Repository<Choice>>(
      getRepositoryToken(Choice),
    );
    historyRepository = module.get<Repository<ChoiceHistory>>(
      getRepositoryToken(ChoiceHistory),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('전체 이벤트 플로우 테스트', () => {
    it('이벤트 트리거 → 응답 선택 → 효과 적용', async () => {
      // Given: 턴 10에서 바이럴 모멘트 이벤트 조건 충족
      const initialGame: Partial<Game> = {
        gameId: 'test-game',
        currentTurn: 10,
        users: 1000,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        activeEvents: [],
      };

      const viralEvent: Partial<DynamicEvent> = {
        eventId: 'MARKET_VIRAL_MOMENT',
        eventType: EventType.MARKET_OPPORTUNITY,
        severity: EventSeverity.HIGH,
        title: '서비스 바이럴 발생!',
        description: '유명 인플루언서가 우리 서비스를 소개...',
        triggerCondition: {
          minTurn: 3,
          maxTurn: 20,
          minUsers: 500,
          minTrust: 30,
          probability: 100, // 테스트용 100% 확률
        },
        choices: [
          {
            choiceId: 'M02_R1',
            text: 'Auto Scaling 긴급 설정',
            effect: {
              usersDelta: 15000,
              cashDelta: -8000000,
              trustDelta: 10,
              addInfrastructure: ['Auto Scaling'],
            },
          },
          {
            choiceId: 'M02_R2',
            text: '트래픽 제한',
            effect: {
              usersDelta: 3000,
              cashDelta: -1000000,
              trustDelta: 5,
            },
          },
        ],
        isOneTime: false,
      };

      mockGameRepository.findOne.mockResolvedValue(initialGame);
      mockEventRepository.find.mockResolvedValue([viralEvent]);
      mockEventStateRepository.findOne.mockResolvedValue(null);

      // When: 이벤트 평가 및 트리거
      const triggeredEvent = await eventService.checkRandomEvent(
        initialGame as Game,
      );

      // Then: 이벤트가 트리거됨
      expect(triggeredEvent).toBeDefined();
      expect(triggeredEvent?.eventId).toBe('MARKET_VIRAL_MOMENT');
    });
  });

  describe('이벤트와 기존 턴 시스템 통합', () => {
    it('이벤트 발생 후 다음 턴 정상 선택지 제공', async () => {
      // Given: 턴 10에서 이벤트 완료
      const game: Partial<Game> = {
        gameId: 'integration-test',
        currentTurn: 10,
        users: 5000,
        cash: 15000000,
        trust: 50,
        infrastructure: ['EC2', 'Aurora'],
        status: GameStatus.PLAYING,
        activeEvents: [],
        hiredStaff: [],
        maxUserCapacity: 50000,
        bridgeFinancingUsed: 0,
        governmentGrantUsed: false,
        governmentReportRequired: false,
      };

      // When: 일반 선택지 실행
      const normalChoice: Partial<Choice> = {
        choiceId: 100,
        turnNumber: 10,
        text: '디자이너 채용',
        effects: {
          users: 500,
          cash: -3000000,
          trust: 3,
          infra: [],
        },
        nextTurn: 11,
        category: 'team',
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(normalChoice);
      mockHistoryRepository.save.mockResolvedValue({});

      const updatedGame = {
        ...game,
        currentTurn: 11,
        users: 5500,
        cash: 12000000,
        trust: 53,
        userAcquisitionMultiplier: 1.2,
      };

      mockGameRepository.save.mockResolvedValue(updatedGame);

      const result = await gameService.executeChoice('integration-test', 100);

      // Then: 정상적으로 다음 턴으로 진행
      expect(result.currentTurn).toBe(11);
      expect(result.users).toBe(5500);
    });
  });
});
