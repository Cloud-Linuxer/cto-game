import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameService } from './game.service';
import { Game, GameStatus } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventService } from '../event/event.service';
import { TrustHistoryService } from './trust-history.service';
import { AlternativeInvestmentService } from './alternative-investment.service';

describe('GameService', () => {
  let service: GameService;
  let gameRepository: Repository<Game>;
  let choiceRepository: Repository<Choice>;
  let historyRepository: Repository<ChoiceHistory>;

  const mockGameRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockChoiceRepository = {
    findOne: jest.fn(),
  };

  const mockHistoryRepository = {
    save: jest.fn(),
  };

  const mockEventService = {
    checkRandomEvent: jest.fn().mockResolvedValue(null), // No events by default
    initializeEventSeed: jest.fn(),
  };

  const mockTrustHistoryService = {
    record: jest.fn(),
    recordTrustChange: jest.fn(),
    deleteHistory: jest.fn(), // EPIC-04 Feature 7: Added missing method
  };

  const mockAlternativeInvestmentService = {
    canUseBridgeFinancing: jest.fn().mockReturnValue(true),
    canUseGovernmentGrant: jest.fn().mockReturnValue(true),
    executeBridgeFinancing: jest.fn(),
    executeGovernmentGrant: jest.fn(),
    submitGovernmentReport: jest.fn(),
    needsAlternativeInvestment: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: getRepositoryToken(Game),
          useValue: mockGameRepository,
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
          provide: EventService,
          useValue: mockEventService,
        },
        {
          provide: TrustHistoryService,
          useValue: mockTrustHistoryService,
        },
        {
          provide: AlternativeInvestmentService,
          useValue: mockAlternativeInvestmentService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    gameRepository = module.get<Repository<Game>>(getRepositoryToken(Game));
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

  describe('startGame', () => {
    it('새 게임을 시작하고 초기 상태를 반환해야 함', async () => {
      const savedGame: Game = {
        gameId: 'test-game-id',
        currentTurn: 1,
        users: 0,
        cash: 10000000,
        trust: 40,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 10000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false,
        consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGameRepository.save.mockResolvedValue(savedGame);

      const result = await service.startGame();

      expect(result.gameId).toBe('test-game-id');
      expect(result.currentTurn).toBe(1);
      expect(result.users).toBe(0);
      expect(result.cash).toBe(10000000);
      expect(result.trust).toBe(40);
      expect(result.infrastructure).toEqual(['EC2']);
      expect(result.status).toBe(GameStatus.PLAYING);
      expect(mockGameRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getGame', () => {
    it('게임 ID로 게임을 조회해야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 5,
        users: 1000,
        cash: 50000000,
        trust: 75,
        infrastructure: ['EC2', 'Aurora'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 5000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false,
        consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGameRepository.findOne.mockResolvedValue(game);

      const result = await service.getGame('test-game-id');

      expect(result.gameId).toBe('test-game-id');
      expect(result.currentTurn).toBe(5);
      expect(mockGameRepository.findOne).toHaveBeenCalledWith({
        where: { gameId: 'test-game-id' },
      });
    });

    it('게임을 찾을 수 없으면 NotFoundException을 던져야 함', async () => {
      mockGameRepository.findOne.mockResolvedValue(null);

      await expect(service.getGame('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('executeChoice', () => {
    it('선택을 실행하고 게임 상태를 업데이트해야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 1,
        users: 0,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 5000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false,
        consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const choice: Choice = {
        choiceId: 1,
        turnNumber: 1,
        text: '투자자 피칭 실행',
        effects: {
          users: 1000,
          cash: 5000000,
          trust: 10,
          infra: ['Aurora'],
        },
        nextTurn: 2,
        category: 'business',
        description: '투자 유치',
      };

      const updatedGame: Game = {
        ...game,
        currentTurn: 2,
        users: 1000,
        cash: 15000000,
        trust: 60,
        infrastructure: ['EC2', 'Aurora'],
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(choice);
      mockHistoryRepository.save.mockResolvedValue({});
      mockGameRepository.save.mockResolvedValue(updatedGame);

      const result = await service.executeChoice('test-game-id', 1);

      expect(result.currentTurn).toBe(2);
      expect(result.users).toBe(1000);
      expect(result.cash).toBe(15000000);
      expect(result.trust).toBe(60);
      expect(result.infrastructure).toContain('Aurora');
      expect(mockHistoryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('게임이 종료되었으면 BadRequestException을 던져야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 10,
        users: 0,
        cash: 0,
        trust: 0,
        infrastructure: ['EC2'],
        status: GameStatus.LOST_BANKRUPT,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 5000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false,
        consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGameRepository.findOne.mockResolvedValue(game);

      await expect(
        service.executeChoice('test-game-id', 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('잘못된 턴의 선택지면 BadRequestException을 던져야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 1,
        users: 0,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 5000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false,
        consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const choice: Choice = {
        choiceId: 5,
        turnNumber: 2, // 현재 턴(1)과 다름
        text: '선택지',
        effects: { users: 0, cash: 0, trust: 0, infra: [] },
        nextTurn: 3,
        category: '',
        description: '',
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(choice);

      await expect(
        service.executeChoice('test-game-id', 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('자금이 파산 임계값(-3천만원) 미만이 되면 파산 상태로 변경해야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 1,
        users: 0,
        cash: 1000000, // 100만원
        trust: 50,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 5000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false,
        consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const choice: Choice = {
        choiceId: 1,
        turnNumber: 1,
        text: '대규모 투자',
        effects: {
          users: 100,
          cash: -35000000, // -3500만원 (파산 임계값 -3000만원 초과)
          trust: -10,
          infra: [],
        },
        nextTurn: 2,
        category: 'business',
        description: '',
      };

      const bankruptGame: Game = {
        ...game,
        cash: -34000000,
        trust: 40,
        users: 100,
        currentTurn: 2,
        status: GameStatus.LOST_BANKRUPT,
        difficultyMode: 'NORMAL',
        grade: 'F',
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(choice);
      mockHistoryRepository.save.mockResolvedValue({});
      mockGameRepository.save.mockResolvedValue(bankruptGame);

      const result = await service.executeChoice('test-game-id', 1);

      expect(result.status).toBe(GameStatus.LOST_BANKRUPT);
    });
  });

  describe('deleteGame', () => {
    it('게임을 삭제해야 함', async () => {
      mockGameRepository.delete.mockResolvedValue({ affected: 1 });
      mockTrustHistoryService.deleteHistory.mockResolvedValue(undefined); // EPIC-04 Feature 7: Mock the deleteHistory call

      await service.deleteGame('test-game-id');

      expect(mockTrustHistoryService.deleteHistory).toHaveBeenCalledWith('test-game-id'); // EPIC-04 Feature 7: Verify deleteHistory is called
      expect(mockGameRepository.delete).toHaveBeenCalledWith({
        gameId: 'test-game-id',
      });
    });

    it('게임을 찾을 수 없으면 NotFoundException을 던져야 함', async () => {
      mockGameRepository.delete.mockResolvedValue({ affected: 0 });
      mockTrustHistoryService.deleteHistory.mockResolvedValue(undefined); // EPIC-04 Feature 7: Mock the deleteHistory call

      await expect(service.deleteGame('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('EPIC-04 Feature 2: Capacity Warning System', () => {
    it('첫 용량 초과 시 50% 감소된 페널티를 적용하고 경고 메시지를 반환해야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 1,
        users: 0,
        cash: 10000000,
        trust: 50,
        infrastructure: ['EC2'], // EC2 = 10000 capacity + 5000 base = 15000 total
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 15000, // Will be recalculated to 15000 (5000 base + 10000 EC2)
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 0,
        resilienceStacks: 0,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false,
        consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Choice that pushes users over capacity (0 + 17000 = 17000 > 15000, about 13% over)
      const choice: Choice = {
        choiceId: 1,
        turnNumber: 1,
        text: '마케팅 캠페인',
        effects: {
          users: 17000, // This will exceed capacity by ~13%
          cash: -1000000,
          trust: 0,
          infra: [],
        },
        nextTurn: 2,
        category: 'business',
        description: '',
      };

      const updatedGame: Game = {
        ...game,
        currentTurn: 2,
        users: 17000,
        cash: 9000000,
        trust: 49, // 50 - 1 (50% of 2 penalty for ~13% excess)
        capacityWarningActive: true,
        consecutiveCapacityExceeded: 1,
        capacityExceededCount: 1,
        resilienceStacks: 1,
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(choice);
      mockHistoryRepository.save.mockResolvedValue({});
      mockGameRepository.save.mockResolvedValue(updatedGame);

      const result = await service.executeChoice('test-game-id', 1);

      expect(result.capacityExceeded).toBe(true);
      expect(result.capacityWarningMessage).toContain('⚠️ 서비스 응답 지연 발생');
      expect(result.capacityWarningMessage).toContain('다음 턴까지 인프라를 개선하세요');
    });

    it('두 번째 연속 용량 초과 시 전체 페널티를 적용해야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 2,
        users: 17000, // Already over capacity
        cash: 9000000,
        trust: 49,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 15000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 1,
        resilienceStacks: 1,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: true,
        consecutiveCapacityExceeded: 1, // Already in warning state
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const choice: Choice = {
        choiceId: 2,
        turnNumber: 2,
        text: '사용자 확대',
        effects: {
          users: 3000, // 17000 + 3000 = 20000 (33% over 15000 capacity)
          cash: 0,
          trust: 0,
          infra: [],
        },
        nextTurn: 3,
        category: 'business',
        description: '',
      };

      const updatedGame: Game = {
        ...game,
        currentTurn: 3,
        users: 20000,
        trust: 45, // 49 - 4 (full penalty for 33% excess)
        consecutiveCapacityExceeded: 2,
        capacityExceededCount: 2,
        resilienceStacks: 2,
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(choice);
      mockHistoryRepository.save.mockResolvedValue({});
      mockGameRepository.save.mockResolvedValue(updatedGame);

      const result = await service.executeChoice('test-game-id', 2);

      expect(result.capacityExceeded).toBe(true);
      expect(result.capacityWarningMessage).toContain('🔥 서비스 장애 발생!');
      expect(result.capacityWarningMessage).toContain('연속 2회');
    });

    it('용량 정상화 후 다시 초과 시 다시 경고부터 시작해야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 3,
        users: 8000, // Normalized capacity
        cash: 10000000,
        trust: 45,
        infrastructure: ['EC2', 'Aurora'], // Increased capacity to 70000
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 70000, // Much higher now
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 2,
        resilienceStacks: 2,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: false, // Reset after normalization
        consecutiveCapacityExceeded: 0, // Reset
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const choice: Choice = {
        choiceId: 3,
        turnNumber: 3,
        text: '대규모 마케팅',
        effects: {
          users: 70000, // 8000 + 70000 = 78000 > 70000
          cash: -5000000,
          trust: 0,
          infra: [],
        },
        nextTurn: 4,
        category: 'business',
        description: '',
      };

      const updatedGame: Game = {
        ...game,
        currentTurn: 4,
        users: 78000,
        cash: 5000000,
        trust: 44, // 45 - 1 (50% of 2 penalty for 11% excess)
        capacityWarningActive: true,
        consecutiveCapacityExceeded: 1, // Back to first warning
        capacityExceededCount: 3,
        resilienceStacks: 3,
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(choice);
      mockHistoryRepository.save.mockResolvedValue({});
      mockGameRepository.save.mockResolvedValue(updatedGame);

      const result = await service.executeChoice('test-game-id', 3);

      expect(result.capacityExceeded).toBe(true);
      expect(result.capacityWarningMessage).toContain('⚠️ 서비스 응답 지연 발생');
      expect(result.capacityWarningMessage).not.toContain('연속');
    });

    it('연속 3회 용량 초과 시 누적 카운터가 증가해야 함', async () => {
      const game: Game = {
        gameId: 'test-game-id',
        currentTurn: 3,
        users: 20000, // Already over capacity (2nd time)
        cash: 9000000,
        trust: 45,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        trustMultiplier: 1.0,
        maxUserCapacity: 15000,
        hasConsultingEffect: false,
        hiredStaff: [],
        ipoConditionMet: false,
        ipoAchievedTurn: null,
        difficultyMode: 'NORMAL',
        grade: null,
        capacityExceededCount: 2,
        resilienceStacks: 2,
        consecutiveNegativeCashTurns: 0,
        capacityWarningActive: true,
        consecutiveCapacityExceeded: 2,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
        activeEvents: [],

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const choice: Choice = {
        choiceId: 3,
        turnNumber: 3,
        text: '계속 증가',
        effects: {
          users: 3000, // 20000 + 3000 = 23000 (53% over 15000)
          cash: 0,
          trust: 0,
          infra: [],
        },
        nextTurn: 4,
        category: 'business',
        description: '',
      };

      const updatedGame: Game = {
        ...game,
        currentTurn: 4,
        users: 23000,
        trust: 39, // 45 - 6 (full penalty for 53% excess)
        consecutiveCapacityExceeded: 3,
        capacityExceededCount: 3,
        resilienceStacks: 3,
      };

      mockGameRepository.findOne.mockResolvedValue(game);
      mockChoiceRepository.findOne.mockResolvedValue(choice);
      mockHistoryRepository.save.mockResolvedValue({});
      mockGameRepository.save.mockResolvedValue(updatedGame);

      const result = await service.executeChoice('test-game-id', 3);

      expect(result.capacityExceeded).toBe(true);
      expect(result.capacityWarningMessage).toContain('🔥 서비스 장애 발생!');
      expect(result.capacityWarningMessage).toContain('연속 3회');
    });
  });

  // ========================================================================
  // EPIC-04 Feature 3: Trust Recovery Mechanisms Tests
  // ========================================================================

  describe('EPIC-04 Feature 3: Trust Recovery Mechanisms', () => {
    describe('Stable Operations Bonus', () => {
      it('3턴 연속 용량 80% 이하 유지 시 신뢰도 +3 보너스를 획득해야 함', async () => {
        // Turn 1: 60% capacity
        let game: Game = {
          gameId: 'test-game-id',
          currentTurn: 1,
          users: 6000, // 60% of 10000
          cash: 10000000,
          trust: 50,
          infrastructure: ['EC2'],
          status: GameStatus.PLAYING,
          hasDR: false,
          investmentRounds: 0,
          equityPercentage: 100,
          multiChoiceEnabled: false,
          userAcquisitionMultiplier: 1.0,
          trustMultiplier: 1.0,
          maxUserCapacity: 10000,
          hasConsultingEffect: false,
          hiredStaff: [],
          ipoConditionMet: false,
          ipoAchievedTurn: null,
          difficultyMode: 'NORMAL',
          grade: null,
          capacityExceededCount: 0,
          resilienceStacks: 0,
          consecutiveNegativeCashTurns: 0,
          capacityWarningActive: false,
          consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
          activeEvents: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const choice1: Choice = {
          choiceId: 101,
          turnNumber: 1,
          text: '안정적 운영 1',
          effects: {
            users: 1000, // 7000 total (70% of 10000)
            cash: 0,
            trust: 0,
            infra: [],
          },
          nextTurn: 2,
          category: 'business',
          description: '',
        };

        mockGameRepository.findOne.mockResolvedValue(game);
        mockChoiceRepository.findOne.mockResolvedValue(choice1);
        mockHistoryRepository.save.mockResolvedValue({});

        const updatedGame1: Game = {
          ...game,
          currentTurn: 2,
          users: 7000,
          consecutiveStableTurns: 1,
        };
        mockGameRepository.save.mockResolvedValue(updatedGame1);

        const result1 = await service.executeChoice('test-game-id', 101);
        expect(result1.trust).toBe(50); // No bonus yet
        expect(result1.recoveryMessages).not.toContainEqual(expect.stringContaining('안정적 서비스 운영'));

        // Turn 2: continue stable operations
        game = {
          ...updatedGame1,
          currentTurn: 2,
          users: 7000,
          trust: 50,
          consecutiveStableTurns: 1,
        };

        const choice2: Choice = {
          choiceId: 102,
          turnNumber: 2,
          text: '안정적 운영 2',
          effects: {
            users: 500, // 7500 total (75% of 10000)
            cash: 0,
            trust: 0,
            infra: [],
          },
          nextTurn: 3,
          category: 'business',
          description: '',
        };

        mockGameRepository.findOne.mockResolvedValue(game);
        mockChoiceRepository.findOne.mockResolvedValue(choice2);

        const updatedGame2: Game = {
          ...game,
          currentTurn: 3,
          users: 7500,
          consecutiveStableTurns: 2,
        };
        mockGameRepository.save.mockResolvedValue(updatedGame2);

        const result2 = await service.executeChoice('test-game-id', 102);
        expect(result2.trust).toBe(50); // Still no bonus
        expect(result2.recoveryMessages).not.toContainEqual(expect.stringContaining('안정적 서비스 운영'));

        // Turn 3: 3rd consecutive stable turn - should trigger bonus
        game = {
          ...updatedGame2,
          currentTurn: 3,
          users: 7500,
          trust: 50,
          consecutiveStableTurns: 2,
        };

        const choice3: Choice = {
          choiceId: 103,
          turnNumber: 3,
          text: '안정적 운영 3',
          effects: {
            users: 500, // 8000 total (80% of 10000)
            cash: 0,
            trust: 0,
            infra: [],
          },
          nextTurn: 4,
          category: 'business',
          description: '',
        };

        mockGameRepository.findOne.mockResolvedValue(game);
        mockChoiceRepository.findOne.mockResolvedValue(choice3);

        const updatedGame3: Game = {
          ...game,
          currentTurn: 4,
          users: 8000,
          trust: 53, // 50 + 3 bonus
          consecutiveStableTurns: 0, // Reset after bonus
        };
        mockGameRepository.save.mockResolvedValue(updatedGame3);

        const result3 = await service.executeChoice('test-game-id', 103);
        expect(result3.trust).toBe(53);
        expect(result3.recoveryMessages).toContainEqual(expect.stringContaining('안정적 서비스 운영'));
      });

      it('용량이 80%를 초과하면 안정 운영 카운터가 리셋되어야 함', async () => {
        const game: Game = {
          gameId: 'test-game-id',
          currentTurn: 1,
          users: 10000, // 66.7% of 15000 (base 5000 + EC2 10000)
          cash: 10000000,
          trust: 50,
          infrastructure: ['EC2'], // Total: 15000
          status: GameStatus.PLAYING,
          hasDR: false,
          investmentRounds: 0,
          equityPercentage: 100,
          multiChoiceEnabled: false,
          userAcquisitionMultiplier: 1.0,
          trustMultiplier: 1.0,
          maxUserCapacity: 15000,
          hasConsultingEffect: false,
          hiredStaff: [],
          ipoConditionMet: false,
          ipoAchievedTurn: null,
          difficultyMode: 'NORMAL',
          grade: null,
          capacityExceededCount: 0,
          resilienceStacks: 0,
          consecutiveNegativeCashTurns: 0,
          capacityWarningActive: false,
          consecutiveCapacityExceeded: 0,
          consecutiveStableTurns: 2, // Already 2 consecutive stable turns
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
          activeEvents: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const choice: Choice = {
          choiceId: 104,
          turnNumber: 1,
          text: '급격한 성장',
          effects: {
            users: 3000, // 13000 total (86.7% of 15000, clearly above 80% threshold)
            cash: 0,
            trust: 0,
            infra: [],
          },
          nextTurn: 2,
          category: 'business',
          description: '',
        };

        const updatedGame: Game = {
          ...game,
          currentTurn: 2,
          users: 13000,
          consecutiveStableTurns: 0, // Reset because above 80%
        };

        mockGameRepository.findOne.mockResolvedValue(game);
        mockChoiceRepository.findOne.mockResolvedValue(choice);
        mockHistoryRepository.save.mockResolvedValue({});
        mockGameRepository.save.mockResolvedValue(updatedGame);

        const result = await service.executeChoice('test-game-id', 104);
        expect(result.trust).toBe(50); // No bonus
        expect(result.recoveryMessages).not.toContainEqual(expect.stringContaining('안정적 서비스 운영'));
      });
    });

    describe('Transparency Bonus', () => {
      it('장애 발생 후 투명성 태그 선택지로 신뢰도 회복 시 1.5배 보너스를 받아야 함', async () => {
        const game: Game = {
          gameId: 'test-game-id',
          currentTurn: 10,
          users: 15000, // Over capacity (10000)
          cash: 10000000,
          trust: 40, // Low trust after capacity exceeded
          infrastructure: ['EC2'],
          status: GameStatus.PLAYING,
          hasDR: false,
          investmentRounds: 0,
          equityPercentage: 100,
          multiChoiceEnabled: false,
          userAcquisitionMultiplier: 1.0,
          trustMultiplier: 1.0,
          maxUserCapacity: 10000,
          hasConsultingEffect: false,
          hiredStaff: [],
          ipoConditionMet: false,
          ipoAchievedTurn: null,
          difficultyMode: 'NORMAL',
          grade: null,
          capacityExceededCount: 1,
          resilienceStacks: 1,
          consecutiveNegativeCashTurns: 0,
          capacityWarningActive: true, // Warning is active
          consecutiveCapacityExceeded: 1,
          consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
          activeEvents: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const transparencyChoice: Choice = {
          choiceId: 201,
          turnNumber: 10,
          text: '고객에게 투명하게 장애 상황 공개',
          effects: {
            users: 0,
            cash: 0,
            trust: 4, // Base trust recovery
            infra: [],
          },
          nextTurn: 11,
          category: 'communication',
          description: '투명한 소통으로 신뢰 회복',
          tags: ['transparency'], // Transparency tag
        };

        const updatedGame: Game = {
          ...game,
          currentTurn: 11,
          trust: 46, // 40 + (4 * 1.5) = 40 + 6 = 46
        };

        mockGameRepository.findOne.mockResolvedValue(game);
        mockChoiceRepository.findOne.mockResolvedValue(transparencyChoice);
        mockHistoryRepository.save.mockResolvedValue({});
        mockGameRepository.save.mockResolvedValue(updatedGame);

        const result = await service.executeChoice('test-game-id', 201);
        expect(result.trust).toBe(46);
        expect(result.recoveryMessages).toContainEqual(expect.stringContaining('투명한 소통이 신뢰 회복을 가속화'));
      });

      it('용량 경고가 없을 때는 투명성 보너스가 적용되지 않아야 함', async () => {
        const game: Game = {
          gameId: 'test-game-id',
          currentTurn: 5,
          users: 5000, // Below capacity
          cash: 10000000,
          trust: 50,
          infrastructure: ['EC2'],
          status: GameStatus.PLAYING,
          hasDR: false,
          investmentRounds: 0,
          equityPercentage: 100,
          multiChoiceEnabled: false,
          userAcquisitionMultiplier: 1.0,
          trustMultiplier: 1.0,
          maxUserCapacity: 10000,
          hasConsultingEffect: false,
          hiredStaff: [],
          ipoConditionMet: false,
          ipoAchievedTurn: null,
          difficultyMode: 'NORMAL',
          grade: null,
          capacityExceededCount: 0,
          resilienceStacks: 0,
          consecutiveNegativeCashTurns: 0,
          capacityWarningActive: false, // No warning active
          consecutiveCapacityExceeded: 0,
        consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
          activeEvents: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const transparencyChoice: Choice = {
          choiceId: 202,
          turnNumber: 5,
          text: '투명한 커뮤니케이션',
          effects: {
            users: 0,
            cash: 0,
            trust: 4,
            infra: [],
          },
          nextTurn: 6,
          category: 'communication',
          description: '',
          tags: ['transparency'],
        };

        const updatedGame: Game = {
          ...game,
          currentTurn: 6,
          trust: 54, // 50 + 4 (no multiplier)
        };

        mockGameRepository.findOne.mockResolvedValue(game);
        mockChoiceRepository.findOne.mockResolvedValue(transparencyChoice);
        mockHistoryRepository.save.mockResolvedValue({});
        mockGameRepository.save.mockResolvedValue(updatedGame);

        const result = await service.executeChoice('test-game-id', 202);
        expect(result.trust).toBe(54);
        expect(result.recoveryMessages).not.toContainEqual(expect.stringContaining('투명한 소통'));
      });
    });

    describe('Crisis Recovery Bonus', () => {
      it('용량 초과 후 복원력 스택 획득 시 신뢰도 +5 보너스를 받아야 함', async () => {
        const game: Game = {
          gameId: 'test-game-id',
          currentTurn: 8,
          users: 13000, // Already high usage
          cash: 10000000,
          trust: 35,
          infrastructure: ['EC2'], // Total capacity: 5000 (base) + 10000 (EC2) = 15000
          status: GameStatus.PLAYING,
          hasDR: false,
          investmentRounds: 0,
          equityPercentage: 100,
          multiChoiceEnabled: false,
          userAcquisitionMultiplier: 1.0,
          trustMultiplier: 1.0,
          maxUserCapacity: 15000,
          hasConsultingEffect: false,
          hiredStaff: [],
          ipoConditionMet: false,
          ipoAchievedTurn: null,
          difficultyMode: 'NORMAL',
          grade: null,
          capacityExceededCount: 0,
          resilienceStacks: 0,
          consecutiveNegativeCashTurns: 0,
          capacityWarningActive: false,
          consecutiveCapacityExceeded: 0,
          consecutiveStableTurns: 0,
          bridgeFinancingUsed: 0,
          governmentGrantUsed: false,
          governmentReportRequired: false,
          eventSeed: null,
          activeEvents: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const choice: Choice = {
          choiceId: 301,
          turnNumber: 8,
          text: '사용자 급증',
          effects: {
            users: 3000, // 16000 total, exceeds capacity (15000)
            cash: 0,
            trust: 0,
            infra: [],
          },
          nextTurn: 9,
          category: 'business',
          description: '',
        };

        // After capacity exceeded:
        // - Excess ratio: 6.67% (1000/15000)
        // - Penalty tier: 10% -> -2 trust
        // - First time: 50% penalty -> -1 trust
        // - Resilience stack: +1
        // - Crisis recovery bonus: +5
        // Final trust: 35 - 1 + 5 = 39
        const updatedGame: Game = {
          ...game,
          currentTurn: 9,
          users: 16000,
          trust: 39,
          capacityExceededCount: 1,
          resilienceStacks: 1,
          capacityWarningActive: true,
          consecutiveCapacityExceeded: 1,
        };

        mockGameRepository.findOne.mockResolvedValue(game);
        mockChoiceRepository.findOne.mockResolvedValue(choice);
        mockHistoryRepository.save.mockResolvedValue({});
        mockGameRepository.save.mockResolvedValue(updatedGame);

        const result = await service.executeChoice('test-game-id', 301);
        expect(result.capacityExceeded).toBe(true);
        expect(result.trust).toBe(39); // 35 - 1 (penalty) + 5 (crisis recovery)
        expect(result.recoveryMessages).toContainEqual(expect.stringContaining('장애 극복으로 신뢰도가 회복'));
      });
    });
  });
});
