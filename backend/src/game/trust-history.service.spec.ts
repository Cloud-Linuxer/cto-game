import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrustHistoryService } from './trust-history.service';
import { TrustHistory, TrustChangeFactor } from '../database/entities/trust-history.entity';

describe('TrustHistoryService', () => {
  let service: TrustHistoryService;
  let repository: Repository<TrustHistory>;

  const mockRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrustHistoryService,
        {
          provide: getRepositoryToken(TrustHistory),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TrustHistoryService>(TrustHistoryService);
    repository = module.get<Repository<TrustHistory>>(getRepositoryToken(TrustHistory));

    jest.clearAllMocks();
  });

  describe('record', () => {
    it('신뢰도 변화를 기록해야 함', async () => {
      const request = {
        gameId: 'test-game-id',
        turnNumber: 5,
        trustBefore: 50,
        trustAfter: 60,
        change: 10,
        factors: [
          {
            type: 'choice' as const,
            amount: 10,
            message: '선택: 인프라 업그레이드',
          },
        ],
      };

      const savedHistory = {
        id: 1,
        ...request,
        createdAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(savedHistory);

      const result = await service.record(request);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: request.gameId,
          turnNumber: request.turnNumber,
          trustBefore: request.trustBefore,
          trustAfter: request.trustAfter,
          change: request.change,
          factors: request.factors,
        }),
      );
      expect(result).toEqual(savedHistory);
    });

    it('변화가 없고 요인도 없으면 기록하지 않아야 함', async () => {
      const request = {
        gameId: 'test-game-id',
        turnNumber: 5,
        trustBefore: 50,
        trustAfter: 50,
        change: 0,
        factors: [],
      };

      const result = await service.record(request);

      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('변화는 없지만 요인이 있으면 기록해야 함', async () => {
      const request = {
        gameId: 'test-game-id',
        turnNumber: 5,
        trustBefore: 50,
        trustAfter: 50,
        change: 0,
        factors: [
          {
            type: 'penalty' as const,
            amount: -10,
            message: '용량 초과',
          },
          {
            type: 'recovery' as const,
            amount: 10,
            message: '회복 메커니즘',
          },
        ],
      };

      const savedHistory = {
        id: 1,
        ...request,
        createdAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(savedHistory);

      const result = await service.record(request);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(savedHistory);
    });
  });

  describe('getHistory', () => {
    it('게임의 전체 신뢰도 히스토리를 조회해야 함', async () => {
      const gameId = 'test-game-id';
      const mockHistories = [
        {
          id: 1,
          gameId,
          turnNumber: 1,
          trustBefore: 50,
          trustAfter: 55,
          change: 5,
          factors: [],
          createdAt: new Date(),
        },
        {
          id: 2,
          gameId,
          turnNumber: 2,
          trustBefore: 55,
          trustAfter: 50,
          change: -5,
          factors: [],
          createdAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockHistories);

      const result = await service.getHistory(gameId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { gameId },
        order: { turnNumber: 'ASC' },
        take: 25,
      });
      expect(result).toHaveLength(2);
      expect(result[0].turnNumber).toBe(1);
      expect(result[1].turnNumber).toBe(2);
    });
  });

  describe('getHistoryForTurn', () => {
    it('특정 턴의 신뢰도 히스토리를 조회해야 함', async () => {
      const gameId = 'test-game-id';
      const turnNumber = 5;
      const mockHistory = {
        id: 1,
        gameId,
        turnNumber,
        trustBefore: 50,
        trustAfter: 60,
        change: 10,
        factors: [],
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockHistory);

      const result = await service.getHistoryForTurn(gameId, turnNumber);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { gameId, turnNumber },
      });
      expect(result).toEqual(expect.objectContaining({ turnNumber }));
    });

    it('히스토리가 없으면 null을 반환해야 함', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getHistoryForTurn('test-game-id', 999);

      expect(result).toBeNull();
    });
  });

  describe('deleteHistory', () => {
    it('게임의 모든 신뢰도 히스토리를 삭제해야 함', async () => {
      const gameId = 'test-game-id';

      await service.deleteHistory(gameId);

      expect(mockRepository.delete).toHaveBeenCalledWith({ gameId });
    });
  });

  describe('generateLesson', () => {
    it('선택지 효과에 대한 교육적 메시지를 생성해야 함', () => {
      const factors: TrustChangeFactor[] = [
        {
          type: 'choice',
          amount: 10,
          message: '인프라 투자',
        },
      ];

      const lesson = service.generateLesson(factors);

      // Choice type에 대한 메시지 중 하나를 포함해야 함
      expect(lesson.length).toBeGreaterThan(0);
      expect(
        lesson.includes('전략적 선택') ||
        lesson.includes('비즈니스 의사결정') ||
        lesson.includes('투자자')
      ).toBe(true);
    });

    it('페널티에 대한 교육적 메시지를 생성해야 함', () => {
      const factors: TrustChangeFactor[] = [
        {
          type: 'penalty',
          amount: -15,
          message: '용량 초과',
        },
      ];

      const lesson = service.generateLesson(factors);

      expect(lesson).toContain('서비스 장애');
    });

    it('보너스에 대한 교육적 메시지를 생성해야 함', () => {
      const factors: TrustChangeFactor[] = [
        {
          type: 'bonus',
          amount: 5,
          message: '안정 운영',
        },
      ];

      const lesson = service.generateLesson(factors);

      expect(lesson).toContain('안정');
    });

    it('회복 메커니즘에 대한 교육적 메시지를 생성해야 함', () => {
      const factors: TrustChangeFactor[] = [
        {
          type: 'recovery',
          amount: 5,
          message: '장애 극복',
        },
      ];

      const lesson = service.generateLesson(factors);

      // Recovery type에 대한 메시지 중 하나를 포함해야 함
      expect(lesson.length).toBeGreaterThan(0);
      expect(
        lesson.includes('회복') ||
        lesson.includes('복구') ||
        lesson.includes('대응')
      ).toBe(true);
    });

    it('요인이 없으면 기본 메시지를 반환해야 함', () => {
      const factors: TrustChangeFactor[] = [];

      const lesson = service.generateLesson(factors);

      expect(lesson).toBe('신뢰도 변화가 없습니다.');
    });

    it('가장 큰 영향을 준 요인에 대한 메시지를 우선해야 함', () => {
      const factors: TrustChangeFactor[] = [
        {
          type: 'choice',
          amount: 5,
          message: '작은 선택',
        },
        {
          type: 'penalty',
          amount: -20,
          message: '큰 페널티',
        },
        {
          type: 'bonus',
          amount: 3,
          message: '작은 보너스',
        },
      ];

      const lesson = service.generateLesson(factors);

      // 가장 큰 영향(-20)을 준 penalty에 대한 메시지
      expect(lesson).toContain('서비스 장애');
    });
  });
});
