import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TurnService } from './turn.service';
import { Turn } from '../database/entities/turn.entity';
import { Choice } from '../database/entities/choice.entity';
import { NotFoundException } from '@nestjs/common';

describe('TurnService', () => {
  let service: TurnService;
  let turnRepository: Repository<Turn>;
  let choiceRepository: Repository<Choice>;

  const mockTurnRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockChoiceRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnService,
        {
          provide: getRepositoryToken(Turn),
          useValue: mockTurnRepository,
        },
        {
          provide: getRepositoryToken(Choice),
          useValue: mockChoiceRepository,
        },
      ],
    }).compile();

    service = module.get<TurnService>(TurnService);
    turnRepository = module.get<Repository<Turn>>(getRepositoryToken(Turn));
    choiceRepository = module.get<Repository<Choice>>(
      getRepositoryToken(Choice),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTurnInfo', () => {
    it('특정 턴 정보와 선택지를 조회해야 함', async () => {
      const turn: Turn = {
        turnId: 1,
        turnNumber: 1,
        eventText: '1턴 이벤트',
        description: '스타트업 시작',
      };

      const choices: Choice[] = [
        {
          choiceId: 1,
          turnNumber: 1,
          text: '선택지 1',
          effects: { users: 100, cash: 1000000, trust: 5, infra: [] },
          nextTurn: 2,
          category: 'business',
          description: '',
        },
        {
          choiceId: 2,
          turnNumber: 1,
          text: '선택지 2',
          effects: { users: 50, cash: 500000, trust: 10, infra: ['Aurora'] },
          nextTurn: 2,
          category: 'tech',
          description: '',
        },
      ];

      mockTurnRepository.findOne.mockResolvedValue(turn);
      mockChoiceRepository.find.mockResolvedValue(choices);

      const result = await service.getTurnInfo(1);

      expect(result.turnNumber).toBe(1);
      expect(result.eventText).toBe('1턴 이벤트');
      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].choiceId).toBe(1);
      expect(mockTurnRepository.findOne).toHaveBeenCalledWith({
        where: { turnNumber: 1 },
      });
      expect(mockChoiceRepository.find).toHaveBeenCalledWith({
        where: { turnNumber: 1 },
      });
    });

    it('턴을 찾을 수 없으면 NotFoundException을 던져야 함', async () => {
      mockTurnRepository.findOne.mockResolvedValue(null);

      await expect(service.getTurnInfo(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllTurns', () => {
    it('모든 턴과 선택지를 조회해야 함', async () => {
      const turns: Turn[] = [
        {
          turnId: 1,
          turnNumber: 1,
          eventText: '1턴 이벤트',
          description: '',
        },
        {
          turnId: 2,
          turnNumber: 2,
          eventText: '2턴 이벤트',
          description: '',
        },
      ];

      const choices1: Choice[] = [
        {
          choiceId: 1,
          turnNumber: 1,
          text: '선택지 1',
          effects: { users: 100, cash: 0, trust: 0, infra: [] },
          nextTurn: 2,
          category: '',
          description: '',
        },
      ];

      const choices2: Choice[] = [
        {
          choiceId: 2,
          turnNumber: 2,
          text: '선택지 2',
          effects: { users: 200, cash: 0, trust: 0, infra: [] },
          nextTurn: 3,
          category: '',
          description: '',
        },
      ];

      mockTurnRepository.find.mockResolvedValue(turns);
      mockChoiceRepository.find.mockResolvedValue([...choices1, ...choices2]);

      const result = await service.getAllTurns();

      expect(result).toHaveLength(2);
      expect(result[0].turnNumber).toBe(1);
      expect(result[1].turnNumber).toBe(2);
      expect(result[0].choices).toHaveLength(1);
      expect(result[1].choices).toHaveLength(1);
      expect(result[0].choices[0].choiceId).toBe(1);
      expect(result[1].choices[0].choiceId).toBe(2);
      expect(mockTurnRepository.find).toHaveBeenCalledWith({
        order: { turnNumber: 'ASC' },
      });
      expect(mockChoiceRepository.find).toHaveBeenCalledWith({
        order: { choiceId: 'ASC' },
      });
    });
  });
});
