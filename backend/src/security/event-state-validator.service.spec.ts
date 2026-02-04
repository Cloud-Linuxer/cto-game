import { Test, TestingModule } from '@nestjs/testing';
import { EventStateValidatorService } from './event-state-validator.service';
import { Game, GameStatus } from '../database/entities/game.entity';

describe('EventStateValidatorService', () => {
  let service: EventStateValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventStateValidatorService],
    }).compile();

    service = module.get<EventStateValidatorService>(EventStateValidatorService);
  });

  const createValidGame = (): Game => {
    const game = new Game();
    game.gameId = '123e4567-e89b-12d3-a456-426614174000';
    game.currentTurn = 5;
    game.users = 1000;
    game.cash = 10_000_000;
    game.trust = 70;
    game.infrastructure = ['EC2', 'Aurora'];
    game.status = GameStatus.PLAYING;
    game.maxUserCapacity = 5000;
    game.hiredStaff = ['개발자'];
    game.equityPercentage = 80;
    game.userAcquisitionMultiplier = 1.2;
    game.trustMultiplier = 1.1;
    game.resilienceStacks = 1;
    game.consecutiveNegativeCashTurns = 0;
    game.createdAt = new Date();
    game.updatedAt = new Date();
    return game;
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateGameState', () => {
    it('should pass validation for valid game state', () => {
      const game = createValidGame();
      const result = service.validateGameState(game);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.gameId).toBe(game.gameId);
    });

    it('should fail validation for missing gameId', () => {
      const game = createValidGame();
      game.gameId = '';

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('gameId is required');
    });

    it('should fail validation for users out of range', () => {
      const game = createValidGame();
      game.users = -100;

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('users out of range'))).toBe(true);
    });

    it('should fail validation for excessive users', () => {
      const game = createValidGame();
      game.users = 200_000_000; // 2억 (한계 초과)

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('users out of range'))).toBe(true);
    });

    it('should fail validation for cash out of range', () => {
      const game = createValidGame();
      game.cash = -200_000_000_000; // -2000억 (최대 부채 초과)

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('cash out of range'))).toBe(true);
    });

    it('should fail validation for trust out of range', () => {
      const game = createValidGame();
      game.trust = 150; // 100 초과

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('trust out of range'))).toBe(true);
    });

    it('should fail validation for invalid turn', () => {
      const game = createValidGame();
      game.currentTurn = 0; // 최소 1

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('currentTurn out of range'))).toBe(true);
    });

    it('should fail validation for excessive infrastructure', () => {
      const game = createValidGame();
      game.infrastructure = Array(60).fill('EC2'); // 50개 초과

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('infrastructure array too large'))).toBe(true);
    });

    it('should fail validation for suspicious user capacity ratio', () => {
      const game = createValidGame();
      game.users = 100_000;
      game.maxUserCapacity = 100; // 1000배 초과

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('10x maxUserCapacity'))).toBe(true);
    });

    it('should fail validation for invalid equity percentage', () => {
      const game = createValidGame();
      game.equityPercentage = 150; // 100 초과

      const result = service.validateGameState(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('equityPercentage out of range'))).toBe(true);
    });
  });

  describe('validateStateTransition', () => {
    it('should pass validation for valid state transition', () => {
      const before = createValidGame();
      const after = createValidGame();
      after.currentTurn = 6;
      after.users = 1500;
      after.cash = 12_000_000;
      after.trust = 75;
      after.updatedAt = new Date(before.updatedAt.getTime() + 1000);

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for gameId mismatch', () => {
      const before = createValidGame();
      const after = createValidGame();
      after.gameId = 'different-game-id';

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('gameId mismatch'))).toBe(true);
    });

    it('should fail validation for invalid turn progression', () => {
      const before = createValidGame();
      before.currentTurn = 5;

      const after = createValidGame();
      after.currentTurn = 3; // 턴 역행

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid turn progression'))).toBe(true);
    });

    it('should fail validation for excessive turn jump', () => {
      const before = createValidGame();
      before.currentTurn = 5;

      const after = createValidGame();
      after.currentTurn = 15; // 10턴 점프 (최대 5턴)

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid turn progression'))).toBe(true);
    });

    it('should fail validation for suspicious user change', () => {
      const before = createValidGame();
      before.users = 1000;

      const after = createValidGame();
      after.users = 10_000_000; // 1000만 증가 (한계 초과)
      after.currentTurn = 6;

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Suspicious user change'))).toBe(true);
    });

    it('should fail validation for suspicious cash change', () => {
      const before = createValidGame();
      before.cash = 10_000_000;

      const after = createValidGame();
      after.cash = 200_000_000_000; // 2000억 증가 (한계 초과)
      after.currentTurn = 6;

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Suspicious cash change'))).toBe(true);
    });

    it('should fail validation for suspicious trust change', () => {
      const before = createValidGame();
      before.trust = 60;

      const after = createValidGame();
      after.trust = 0; // -60 변화 (MAX_TRUST_CHANGE=50 초과)
      after.currentTurn = 6;

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Suspicious trust change'))).toBe(true);
    });

    it('should fail validation for resuming finished game', () => {
      const before = createValidGame();
      before.status = GameStatus.WON_IPO;

      const after = createValidGame();
      after.status = GameStatus.PLAYING;

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid status transition'))).toBe(true);
    });

    it('should fail validation for timestamp regression', () => {
      const before = createValidGame();
      before.updatedAt = new Date('2025-01-10T10:00:00Z');

      const after = createValidGame();
      after.updatedAt = new Date('2025-01-10T09:00:00Z'); // 1시간 전
      after.currentTurn = 6;

      const result = service.validateStateTransition(before, after);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Timestamp regression'))).toBe(true);
    });
  });

  describe('generateStateHash', () => {
    it('should generate consistent hash for same state', () => {
      const game = createValidGame();

      const hash1 = service.generateStateHash(game);
      const hash2 = service.generateStateHash(game);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256
    });

    it('should generate different hash for different states', () => {
      const game1 = createValidGame();
      const game2 = createValidGame();
      game2.users = 2000; // 변경

      const hash1 = service.generateStateHash(game1);
      const hash2 = service.generateStateHash(game2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash regardless of infrastructure order', () => {
      const game1 = createValidGame();
      game1.infrastructure = ['EC2', 'Aurora', 'Redis'];

      const game2 = createValidGame();
      game2.infrastructure = ['Redis', 'EC2', 'Aurora']; // 순서 다름

      const hash1 = service.generateStateHash(game1);
      const hash2 = service.generateStateHash(game2);

      expect(hash1).toBe(hash2); // 정렬 후 해싱하므로 동일
    });
  });

  describe('verifyStateHash', () => {
    it('should verify correct hash', () => {
      const game = createValidGame();
      const hash = service.generateStateHash(game);

      const isValid = service.verifyStateHash(game, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect hash', () => {
      const game = createValidGame();
      const wrongHash = 'a'.repeat(64);

      const isValid = service.verifyStateHash(game, wrongHash);

      expect(isValid).toBe(false);
    });
  });

  describe('canExecuteEvent', () => {
    it('should allow event execution for valid game', () => {
      const game = createValidGame();

      const result = service.canExecuteEvent(game);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should deny event execution for finished game', () => {
      const game = createValidGame();
      game.status = GameStatus.WON_IPO;

      const result = service.canExecuteEvent(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('not in PLAYING state'))).toBe(true);
    });

    it('should deny event execution for bankrupt game', () => {
      const game = createValidGame();
      game.cash = -150_000_000_000; // 최소값 이하

      const result = service.canExecuteEvent(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Cash below minimum'))).toBe(true);
    });

    it('should deny event execution for invalid turn', () => {
      const game = createValidGame();
      game.currentTurn = 0;

      const result = service.canExecuteEvent(game);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Current turn out of bounds'))).toBe(true);
    });
  });
});
