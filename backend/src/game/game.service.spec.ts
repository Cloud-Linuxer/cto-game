import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameService } from './game.service';
import { Game, GameStatus } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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
        trust: 50,
        infrastructure: ['EC2'],
        status: GameStatus.PLAYING,
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        maxUserCapacity: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGameRepository.save.mockResolvedValue(savedGame);

      const result = await service.startGame();

      expect(result.gameId).toBe('test-game-id');
      expect(result.currentTurn).toBe(1);
      expect(result.users).toBe(0);
      expect(result.cash).toBe(10000000);
      expect(result.trust).toBe(50);
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
        maxUserCapacity: 10000,
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
        maxUserCapacity: 10000,
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
        createdAt: new Date(),
        hasDR: false,
        investmentRounds: 0,
        equityPercentage: 100,
        multiChoiceEnabled: false,
        userAcquisitionMultiplier: 1.0,
        maxUserCapacity: 10000,
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
        maxUserCapacity: 10000,
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

    it('자금이 음수가 되면 파산 상태로 변경해야 함', async () => {
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
        maxUserCapacity: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const choice: Choice = {
        choiceId: 1,
        turnNumber: 1,
        text: '대규모 투자',
        effects: {
          users: 10000,
          cash: -5000000, // -500만원
          trust: -10,
          infra: [],
        },
        nextTurn: 2,
        category: 'business',
        description: '',
      };

      const bankruptGame: Game = {
        ...game,
        cash: -4000000,
        trust: 40,
        users: 10000,
        currentTurn: 2,
        status: GameStatus.LOST_BANKRUPT,
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

      await service.deleteGame('test-game-id');

      expect(mockGameRepository.delete).toHaveBeenCalledWith({
        gameId: 'test-game-id',
      });
    });

    it('게임을 찾을 수 없으면 NotFoundException을 던져야 함', async () => {
      mockGameRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteGame('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
