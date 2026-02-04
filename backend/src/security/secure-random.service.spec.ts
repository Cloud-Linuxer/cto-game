import { Test, TestingModule } from '@nestjs/testing';
import { SecureRandomService } from './secure-random.service';

describe('SecureRandomService', () => {
  let service: SecureRandomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecureRandomService],
    }).compile();

    service = module.get<SecureRandomService>(SecureRandomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSecureInt', () => {
    it('should generate random integer within range', () => {
      const max = 100;
      const results = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        const value = service.generateSecureInt(max);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(max);
        expect(Number.isInteger(value)).toBe(true);
        results.add(value);
      }

      // 1000번 실행 시 중복 없이 다양한 값 생성 확인
      expect(results.size).toBeGreaterThan(50);
    });

    it('should throw error for invalid max value', () => {
      expect(() => service.generateSecureInt(0)).toThrow();
      expect(() => service.generateSecureInt(-10)).toThrow();
      expect(() => service.generateSecureInt(1.5)).toThrow();
    });

    it('should handle edge cases', () => {
      const value = service.generateSecureInt(1);
      expect(value).toBe(0);

      const value2 = service.generateSecureInt(2);
      expect([0, 1]).toContain(value2);
    });
  });

  describe('generateSecureFloat', () => {
    it('should generate float between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const value = service.generateSecureFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should generate different values', () => {
      const values = new Set<number>();
      for (let i = 0; i < 100; i++) {
        values.add(service.generateSecureFloat());
      }

      // 100번 생성 시 대부분 다른 값
      expect(values.size).toBeGreaterThan(95);
    });
  });

  describe('generateEventSeed', () => {
    it('should generate valid SHA-256 seed', () => {
      const seed = service.generateEventSeed('game-123', 5, 1000, 50000000);

      expect(seed).toBeDefined();
      expect(seed).toHaveLength(64); // SHA-256 = 64 hex chars
      expect(/^[a-f0-9]{64}$/.test(seed)).toBe(true);
    });

    it('should generate different seeds for different inputs', () => {
      const seed1 = service.generateEventSeed('game-1', 1, 100, 1000);
      const seed2 = service.generateEventSeed('game-1', 2, 100, 1000);
      const seed3 = service.generateEventSeed('game-2', 1, 100, 1000);

      expect(seed1).not.toBe(seed2);
      expect(seed1).not.toBe(seed3);
      expect(seed2).not.toBe(seed3);
    });

    it('should generate different seeds even with same inputs (due to timestamp)', async () => {
      const seed1 = service.generateEventSeed('game-1', 1, 100, 1000);
      await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms 대기
      const seed2 = service.generateEventSeed('game-1', 1, 100, 1000);

      expect(seed1).not.toBe(seed2);
    });
  });

  describe('selectWeightedIndex', () => {
    it('should select index based on weights', () => {
      const seed = 'test-seed-12345';
      const weights = [10, 20, 30, 40]; // 총합 100

      const index = service.selectWeightedIndex(seed, weights);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(weights.length);
    });

    it('should normalize weights automatically', () => {
      const seed = 'test-seed-67890';
      const weights = [1, 2, 3, 4]; // 총합 10 (자동 정규화)

      const index = service.selectWeightedIndex(seed, weights);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(weights.length);
    });

    it('should be deterministic with same seed', () => {
      const seed = 'deterministic-seed';
      const weights = [25, 25, 25, 25];

      const index1 = service.selectWeightedIndex(seed, weights);
      const index2 = service.selectWeightedIndex(seed, weights);

      expect(index1).toBe(index2);
    });

    it('should throw error for invalid weights', () => {
      expect(() => service.selectWeightedIndex('seed', [])).toThrow();
      expect(() => service.selectWeightedIndex('seed', [1, -1, 2])).toThrow();
      expect(() => service.selectWeightedIndex('seed', [0, 0, 0])).toThrow();
    });

    it('should handle single weight', () => {
      const index = service.selectWeightedIndex('seed', [100]);
      expect(index).toBe(0);
    });
  });

  describe('generateSeededInt', () => {
    it('should generate int within range', () => {
      const seed = 'range-test-seed';
      const value = service.generateSeededInt(seed, 10, 20);

      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
      expect(Number.isInteger(value)).toBe(true);
    });

    it('should be deterministic with same seed', () => {
      const seed = 'deterministic-int';
      const value1 = service.generateSeededInt(seed, 0, 100);
      const value2 = service.generateSeededInt(seed, 0, 100);

      expect(value1).toBe(value2);
    });

    it('should generate different values with different seeds', () => {
      const value1 = service.generateSeededInt('seed1', 0, 1000);
      const value2 = service.generateSeededInt('seed2', 0, 1000);

      expect(value1).not.toBe(value2);
    });

    it('should throw error for invalid range', () => {
      expect(() => service.generateSeededInt('seed', 10, 10)).toThrow();
      expect(() => service.generateSeededInt('seed', 20, 10)).toThrow();
      expect(() => service.generateSeededInt('seed', 1.5, 10)).toThrow();
    });
  });

  describe('generateSecureUUID', () => {
    it('should generate valid UUID v4', () => {
      const uuid = service.generateSecureUUID();

      expect(uuid).toBeDefined();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(service.generateSecureUUID());
      }

      expect(uuids.size).toBe(100);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token32 = service.generateSecureToken(32);
      const token64 = service.generateSecureToken(64);

      expect(token32).toBeDefined();
      expect(token64).toBeDefined();
      expect(token32.length).toBeGreaterThan(0);
      expect(token64.length).toBeGreaterThan(token32.length);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(service.generateSecureToken(16));
      }

      expect(tokens.size).toBe(100);
    });

    it('should throw error for invalid length', () => {
      expect(() => service.generateSecureToken(0)).toThrow();
      expect(() => service.generateSecureToken(-10)).toThrow();
      expect(() => service.generateSecureToken(2000)).toThrow();
    });
  });

  describe('validateSeed', () => {
    it('should validate correct SHA-256 seed', () => {
      const validSeed = 'a'.repeat(64);
      expect(service.validateSeed(validSeed)).toBe(true);

      const realSeed = service.generateEventSeed('test', 1, 100, 1000);
      expect(service.validateSeed(realSeed)).toBe(true);
    });

    it('should reject invalid seeds', () => {
      expect(service.validateSeed('too-short')).toBe(false);
      expect(service.validateSeed('x'.repeat(64))).toBe(false); // x는 16진수 아님
      expect(service.validateSeed('a'.repeat(63))).toBe(false); // 길이 부족
      expect(service.validateSeed('a'.repeat(65))).toBe(false); // 길이 초과
    });
  });
});
