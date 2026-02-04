import { Test, TestingModule } from '@nestjs/testing';
import { AlternativeInvestmentService, SeriesTier } from './alternative-investment.service';
import { Game, GameStatus } from '../database/entities/game.entity';
import { GAME_CONSTANTS } from './game-constants';

describe('AlternativeInvestmentService', () => {
  let service: AlternativeInvestmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlternativeInvestmentService],
    }).compile();

    service = module.get<AlternativeInvestmentService>(AlternativeInvestmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Bridge Financing', () => {
    let game: Game;

    beforeEach(() => {
      game = new Game();
      game.gameId = 'test-game-id';
      game.currentTurn = 12; // Series A turn
      game.users = 1000;
      game.cash = 5_000_000;
      game.trust = 20;
      game.infrastructure = ['EC2', 'RDS'];
      game.status = GameStatus.PLAYING;
      game.equityPercentage = 100;
      game.bridgeFinancingUsed = 0;
      game.governmentGrantUsed = false;
      game.governmentReportRequired = false;
    });

    it('should allow bridge financing when not used', () => {
      expect(service.canUseBridgeFinancing(game)).toBe(true);
    });

    it('should allow bridge financing when used once', () => {
      game.bridgeFinancingUsed = 1;
      expect(service.canUseBridgeFinancing(game)).toBe(true);
    });

    it('should not allow bridge financing when max uses exceeded', () => {
      game.bridgeFinancingUsed = 2;
      expect(service.canUseBridgeFinancing(game)).toBe(false);
    });

    it('should execute bridge financing correctly for Series A', () => {
      const initialCash = game.cash;
      const initialEquity = game.equityPercentage;

      const amount = service.executeBridgeFinancing(game, 'A');

      // Expected: 10억 * 0.3 = 3억
      const expectedAmount = 300_000_000;
      expect(amount).toBe(expectedAmount);
      expect(game.cash).toBe(initialCash + expectedAmount);
      expect(game.equityPercentage).toBe(initialEquity - 5);
      expect(game.bridgeFinancingUsed).toBe(1);
    });

    it('should execute bridge financing correctly for Series B', () => {
      game.bridgeFinancingUsed = 1;
      const initialCash = game.cash;

      const amount = service.executeBridgeFinancing(game, 'B');

      // Expected: 100억 * 0.3 = 30억
      const expectedAmount = 3_000_000_000;
      expect(amount).toBe(expectedAmount);
      expect(game.cash).toBe(initialCash + expectedAmount);
      expect(game.bridgeFinancingUsed).toBe(2);
    });

    it('should execute bridge financing correctly for Series C', () => {
      const initialCash = game.cash;

      const amount = service.executeBridgeFinancing(game, 'C');

      // Expected: 500억 * 0.3 = 150억
      const expectedAmount = 15_000_000_000;
      expect(amount).toBe(expectedAmount);
      expect(game.cash).toBe(initialCash + expectedAmount);
    });

    it('should throw error when bridge financing is used too many times', () => {
      game.bridgeFinancingUsed = 2;

      expect(() => service.executeBridgeFinancing(game, 'A')).toThrow(
        '브릿지 파이낸싱을 더 이상 사용할 수 없습니다',
      );
    });

    it('should generate correct bridge financing choice text', () => {
      const text = service.getBridgeFinancingChoiceText('A', game);

      expect(text).toContain('브릿지 파이낸싱');
      expect(text).toContain('3.0억 원'); // 10억 * 0.3
      expect(text).toContain('-5%'); // equity dilution
      expect(text).toContain('잔여: 2회'); // remaining uses
    });
  });

  describe('Government Grant', () => {
    let game: Game;

    beforeEach(() => {
      game = new Game();
      game.gameId = 'test-game-id';
      game.currentTurn = 12;
      game.users = 1000;
      game.cash = 5_000_000;
      game.trust = 20;
      game.infrastructure = ['EC2', 'RDS', 'EKS']; // Has EKS for grant eligibility
      game.status = GameStatus.PLAYING;
      game.equityPercentage = 100;
      game.bridgeFinancingUsed = 0;
      game.governmentGrantUsed = false;
      game.governmentReportRequired = false;
    });

    it('should allow government grant when infrastructure requirement met', () => {
      expect(service.canUseGovernmentGrant(game)).toBe(true);
    });

    it('should allow government grant with Bedrock infrastructure', () => {
      game.infrastructure = ['EC2', 'RDS', 'Bedrock'];
      expect(service.canUseGovernmentGrant(game)).toBe(true);
    });

    it('should allow government grant with SageMaker infrastructure', () => {
      game.infrastructure = ['EC2', 'RDS', 'SageMaker'];
      expect(service.canUseGovernmentGrant(game)).toBe(true);
    });

    it('should not allow government grant when infrastructure requirement not met', () => {
      game.infrastructure = ['EC2', 'RDS']; // No EKS or AI services
      expect(service.canUseGovernmentGrant(game)).toBe(false);
    });

    it('should not allow government grant when already used', () => {
      game.governmentGrantUsed = true;
      expect(service.canUseGovernmentGrant(game)).toBe(false);
    });

    it('should execute government grant correctly', () => {
      const initialCash = game.cash;
      const initialTrust = game.trust;
      const initialEquity = game.equityPercentage;

      const amount = service.executeGovernmentGrant(game);

      const expectedAmount = 200_000_000; // 2억
      const expectedTrustBonus = 3;

      expect(amount).toBe(expectedAmount);
      expect(game.cash).toBe(initialCash + expectedAmount);
      expect(game.trust).toBe(initialTrust + expectedTrustBonus);
      expect(game.equityPercentage).toBe(initialEquity); // No dilution
      expect(game.governmentGrantUsed).toBe(true);
      expect(game.governmentReportRequired).toBe(true);
    });

    it('should not exceed max trust (100) when executing grant', () => {
      game.trust = 98;

      service.executeGovernmentGrant(game);

      expect(game.trust).toBe(100); // Capped at 100
    });

    it('should throw error when government grant already used', () => {
      game.governmentGrantUsed = true;

      expect(() => service.executeGovernmentGrant(game)).toThrow(
        '정부 지원금을 사용할 수 없습니다',
      );
    });

    it('should throw error when infrastructure requirement not met', () => {
      game.infrastructure = ['EC2', 'RDS'];

      expect(() => service.executeGovernmentGrant(game)).toThrow(
        '정부 지원금을 사용할 수 없습니다',
      );
    });

    it('should submit government report correctly', () => {
      game.governmentReportRequired = true;

      service.submitGovernmentReport(game);

      expect(game.governmentReportRequired).toBe(false);
    });

    it('should throw error when submitting report without requirement', () => {
      game.governmentReportRequired = false;

      expect(() => service.submitGovernmentReport(game)).toThrow(
        '제출할 보고서가 없습니다',
      );
    });

    it('should generate correct government grant choice text', () => {
      const text = service.getGovernmentGrantChoiceText();

      expect(text).toContain('중소벤처기업부');
      expect(text).toContain('2.0억 원');
      expect(text).toContain('+3');
      expect(text).toContain('기술 보고서 제출 필요');
    });

    it('should generate correct government report choice text', () => {
      const text = service.getGovernmentReportChoiceText();

      expect(text).toContain('정부 기술 보고서 제출');
      expect(text).toContain('필수');
    });
  });

  describe('Alternative Investment Options', () => {
    let game: Game;

    beforeEach(() => {
      game = new Game();
      game.gameId = 'test-game-id';
      game.currentTurn = 12;
      game.users = 1000;
      game.cash = 5_000_000;
      game.trust = 20;
      game.infrastructure = ['EC2', 'RDS', 'EKS'];
      game.status = GameStatus.PLAYING;
      game.equityPercentage = 100;
      game.bridgeFinancingUsed = 0;
      game.governmentGrantUsed = false;
      game.governmentReportRequired = false;
    });

    it('should return available options when conditions met', () => {
      const options = service.getAvailableOptions(game);

      expect(options.bridgeFinancing.available).toBe(true);
      expect(options.bridgeFinancing.reason).toBeUndefined();
      expect(options.governmentGrant.available).toBe(true);
      expect(options.governmentGrant.reason).toBeUndefined();
    });

    it('should return unavailable bridge financing when max uses reached', () => {
      game.bridgeFinancingUsed = 2;

      const options = service.getAvailableOptions(game);

      expect(options.bridgeFinancing.available).toBe(false);
      expect(options.bridgeFinancing.reason).toContain('이미 2회 사용');
    });

    it('should return unavailable government grant when already used', () => {
      game.governmentGrantUsed = true;

      const options = service.getAvailableOptions(game);

      expect(options.governmentGrant.available).toBe(false);
      expect(options.governmentGrant.reason).toContain('이미 정부 지원금을 받았습니다');
    });

    it('should return unavailable government grant when infrastructure missing', () => {
      game.infrastructure = ['EC2', 'RDS'];

      const options = service.getAvailableOptions(game);

      expect(options.governmentGrant.available).toBe(false);
      expect(options.governmentGrant.reason).toContain('EKS 또는 AI 인프라');
    });
  });

  describe('Alternative Investment Trigger Logic', () => {
    it('should indicate need for alternative investment when trust is low', () => {
      // Series A requires 25 trust (NORMAL mode)
      // 60% of 25 = 15
      // If trust < 15, should need alternative investment

      expect(service.needsAlternativeInvestment(10, 25)).toBe(true);
      expect(service.needsAlternativeInvestment(14, 25)).toBe(true);
      expect(service.needsAlternativeInvestment(15, 25)).toBe(false);
      expect(service.needsAlternativeInvestment(20, 25)).toBe(false);
      expect(service.needsAlternativeInvestment(25, 25)).toBe(false);
    });

    it('should calculate correct threshold for Series B', () => {
      // Series B requires 45 trust (NORMAL mode)
      // 60% of 45 = 27

      expect(service.needsAlternativeInvestment(20, 45)).toBe(true);
      expect(service.needsAlternativeInvestment(26, 45)).toBe(true);
      expect(service.needsAlternativeInvestment(27, 45)).toBe(false);
      expect(service.needsAlternativeInvestment(45, 45)).toBe(false);
    });

    it('should calculate correct threshold for Series C', () => {
      // Series C requires 65 trust (NORMAL mode)
      // 60% of 65 = 39

      expect(service.needsAlternativeInvestment(30, 65)).toBe(true);
      expect(service.needsAlternativeInvestment(38, 65)).toBe(true);
      expect(service.needsAlternativeInvestment(39, 65)).toBe(false);
      expect(service.needsAlternativeInvestment(65, 65)).toBe(false);
    });
  });

  describe('Balance Validation', () => {
    it('should provide balanced alternative funding amounts', () => {
      const game = new Game();
      game.bridgeFinancingUsed = 0;
      game.governmentGrantUsed = false;

      // Bridge financing total (max 2 uses): Series A 기준
      const bridgeAmountA = Math.floor(1_000_000_000 * 0.3); // 3억
      const maxBridgeFunding = bridgeAmountA * 2; // 6억

      // Government grant (1 use)
      const governmentGrant = 200_000_000; // 2억

      // Total alternative funding available
      const totalAlternative = maxBridgeFunding + governmentGrant; // 8억

      // Regular Series A investment
      const regularSeriesA = 1_000_000_000; // 10억

      // Alternative funding should be 80% of regular investment
      expect(totalAlternative).toBe(regularSeriesA * 0.8);
    });

    it('should balance equity dilution properly', () => {
      const game = new Game();
      game.equityPercentage = 100;
      game.bridgeFinancingUsed = 0;

      // Two bridge financings
      service.executeBridgeFinancing(game, 'A');
      service.executeBridgeFinancing(game, 'A');

      // Should dilute 10% total (5% each)
      expect(game.equityPercentage).toBe(90);
    });
  });
});
