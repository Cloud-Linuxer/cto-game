import { Test, TestingModule } from '@nestjs/testing';
import { LLMResponseValidatorService, LLMGeneratedEvent } from './llm-response-validator.service';
import { Game } from '../../database/entities/game.entity';

describe('LLMResponseValidatorService', () => {
  let service: LLMResponseValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LLMResponseValidatorService],
    }).compile();

    service = module.get<LLMResponseValidatorService>(LLMResponseValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Stage 1: Structure Validation', () => {
    it('should pass with valid structure', async () => {
      const validEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 85,
        event: '🚨 AWS 장애 발생! 서비스 다운 중...',
        choices: [
          {
            text: '긴급 복구 시도 (₩10,000,000)',
            effects: { users: 0, cash: -10000000, trust: 5, infra: [] },
          },
          {
            text: '대기 (유저 이탈 위험)',
            effects: { users: -30000, cash: 0, trust: -20, infra: [] },
          },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(validEvent, game);

      expect(result.passed).toBe(true);
      expect(result.stage).toBe('approved');
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with missing eventType', async () => {
      const invalidEvent: any = {
        event: 'Some event',
        choices: [
          { text: 'Choice 1', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(invalidEvent, game);

      expect(result.passed).toBe(false);
      expect(result.stage).toBe('structure');
      expect(result.errors).toContain('eventType 누락');
    });

    it('should fail with insufficient choices', async () => {
      const invalidEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Only one choice', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(invalidEvent, game);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('선택지 부족'))).toBe(true);
    });

    it('should fail with too many choices', async () => {
      const invalidEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Choice 1', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: 'Choice 2', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: 'Choice 3', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: 'Choice 4', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: 'Choice 5', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(invalidEvent, game);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('선택지 과다'))).toBe(true);
    });

    it('should fail with missing effects field', async () => {
      const invalidEvent: any = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Choice 1' }, // effects 누락
          { text: 'Choice 2', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(invalidEvent, game);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('effects 누락'))).toBe(true);
    });
  });

  describe('Stage 2: Balance Validation', () => {
    it('should fail with excessive user change', async () => {
      const invalidEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Bad choice', effects: { users: 200000, cash: 0, trust: 0, infra: [] } }, // 범위 초과
          { text: 'Normal choice', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(invalidEvent, game);

      expect(result.passed).toBe(false);
      expect(result.stage).toBe('balance');
      expect(result.errors.some((e) => e.includes('유저 변화 범위 초과'))).toBe(true);
    });

    it('should fail with excessive cash change', async () => {
      const invalidEvent: LLMGeneratedEvent = {
        eventType: 'opportunity',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Too much cash', effects: { users: 0, cash: 200000000, trust: 0, infra: [] } }, // 범위 초과
          { text: 'Normal', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(invalidEvent, game);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('현금 변화 범위 초과'))).toBe(true);
    });

    it('should fail with excessive trust change', async () => {
      const invalidEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Too negative', effects: { users: 0, cash: 0, trust: -80, infra: [] } }, // 범위 초과
          { text: 'Normal', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(invalidEvent, game);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('신뢰도 변화 범위 초과'))).toBe(true);
    });

    it('should warn about bankruptcy risk', async () => {
      const riskEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Expensive', effects: { users: 0, cash: -45000000, trust: 0, infra: [] } }, // 현재 40M인데 -45M = -5M
          { text: 'Safe', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame({ cash: 40000000 });
      const result = await service.validate(riskEvent, game);

      expect(result.passed).toBe(true); // 경고는 통과
      expect(result.warnings.some((w) => w.includes('파산 위험'))).toBe(true);
    });

    it('should fail when all choices lead to bankruptcy', async () => {
      const bankruptEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: 'Choice 1', effects: { users: 0, cash: -30000000, trust: 0, infra: [] } },
          { text: 'Choice 2', effects: { users: 0, cash: -35000000, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame({ cash: 20000000 }); // 모든 선택지가 파산 유발
      const result = await service.validate(bankruptEvent, game);

      expect(result.passed).toBe(false);
      expect(result.errors).toContain('모든 선택지가 파산으로 이어짐 (탈출 불가능)');
    });
  });

  describe('Stage 3: Content Quality Validation', () => {
    it('should fail with forbidden words', async () => {
      const badEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: '씨발 AWS 장애 발생!', // 금지어 포함
        choices: [
          { text: 'Choice 1', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: 'Choice 2', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(badEvent, game);

      expect(result.passed).toBe(false);
      expect(result.stage).toBe('content');
      expect(result.errors.some((e) => e.includes('금지 단어 발견'))).toBe(true);
    });

    it('should warn without AWS context', async () => {
      const noAWSEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: '일반적인 문제가 발생했습니다', // AWS 컨텍스트 없음
        choices: [
          { text: 'Choice 1', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: 'Choice 2', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(noAWSEvent, game);

      expect(result.passed).toBe(true); // 경고만
      expect(result.warnings.some((w) => w.includes('AWS/클라우드 관련 컨텍스트 부족'))).toBe(
        true,
      );
    });

    it('should fail with duplicate choice texts', async () => {
      const duplicateEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event text',
        choices: [
          { text: '같은 선택지', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: '같은 선택지', effects: { users: 0, cash: -10000, trust: 0, infra: [] } },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(duplicateEvent, game);

      expect(result.passed).toBe(false);
      expect(result.errors).toContain('선택지 텍스트 중복 발견');
    });
  });

  describe('Quality Score Calculation', () => {
    it('should give high score for quality event', async () => {
      const qualityEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 90,
        event:
          '🚨 AWS ap-northeast-2 리전 장애 발생!\n\n현재 유저: 85,000명\n현재 현금: ₩50,000,000\n현재 신뢰도: 65%\n\nEC2 인스턴스 전체 다운!',
        choices: [
          {
            text: '멀티 리전 긴급 구축 (₩40,000,000)',
            effects: { users: 0, cash: -40000000, trust: 20, infra: ['multi-region'] },
            reasoning: '장기적으로 안정성을 확보하지만 초기 비용 부담이 큽니다.',
          },
          {
            text: '복구 대기 (유저 이탈 위험)',
            effects: { users: -30000, cash: 0, trust: -25, infra: [] },
            reasoning: '비용은 절감되지만 유저 신뢰도가 크게 하락합니다.',
          },
        ],
      };

      const game = createMockGame({ users: 85000, cash: 50000000, trust: 65 });
      const result = await service.validate(qualityEvent, game);

      expect(result.passed).toBe(true);
      expect(result.qualityScore).toBeDefined();
      expect(result.qualityScore!.overall).toBeGreaterThanOrEqual(70);
      expect(result.qualityScore!.coherence).toBeGreaterThan(80);
      expect(result.qualityScore!.educational).toBeGreaterThan(70);
    });

    it('should give low score for poor quality event', async () => {
      const poorEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: '문제 발생', // 너무 짧음, 이모지 없음, 게임 상황 반영 없음
        choices: [
          {
            text: 'A',
            effects: { users: 0, cash: -1000000, trust: 0, infra: [] },
          },
          {
            text: 'B',
            effects: { users: 0, cash: 0, trust: 0, infra: [] },
          },
        ],
      };

      const game = createMockGame();
      const result = await service.validate(poorEvent, game);

      expect(result.passed).toBe(false); // 품질 점수 60 미만
      expect(result.qualityScore).toBeDefined();
      expect(result.qualityScore!.overall).toBeLessThan(60);
    });
  });

  describe('AutoFix', () => {
    it('should clamp excessive effects', async () => {
      const excessiveEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: 'Event',
        choices: [
          {
            text: 'Excessive',
            effects: { users: 500000, cash: -500000000, trust: 100, infra: [] },
          },
          { text: 'Normal', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const fixed = await service.autoFix(excessiveEvent);

      expect(fixed.choices[0].effects.users).toBe(100000); // clamped
      expect(fixed.choices[0].effects.cash).toBe(-100000000); // clamped
      expect(fixed.choices[0].effects.trust).toBe(50); // clamped
    });

    it('should filter forbidden words', async () => {
      const badEvent: LLMGeneratedEvent = {
        eventType: 'disaster',
        priority: 50,
        event: '씨발 AWS 장애',
        choices: [
          { text: '병신 같은 선택', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
          { text: 'Normal', effects: { users: 0, cash: 0, trust: 0, infra: [] } },
        ],
      };

      const fixed = await service.autoFix(badEvent);

      expect(fixed.event).toBe('*** AWS 장애');
      expect(fixed.choices[0].text).toBe('*** 같은 선택');
    });
  });
});

// 헬퍼 함수
function createMockGame(overrides?: Partial<Game>): Game {
  const game = new Game();
  game.gameId = 'test-game-id';
  game.currentTurn = 10;
  game.users = 50000;
  game.cash = 40000000;
  game.trust = 60;
  game.infrastructure = ['EC2', 'Aurora'];
  game.status = 'PLAYING' as any;

  return { ...game, ...overrides };
}
