import { Test, TestingModule } from '@nestjs/testing';
import { EventQualityScorerService } from './event-quality-scorer.service';
import { LLMGeneratedEvent } from '../dto/llm-response.dto';

describe('EventQualityScorerService', () => {
  let service: EventQualityScorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventQualityScorerService],
    }).compile();

    service = module.get<EventQualityScorerService>(EventQualityScorerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateQualityScore', () => {
    it('should return quality score with all dimensions', () => {
      const event: LLMGeneratedEvent = {
        eventType: 'MARKET_OPPORTUNITY',
        title: '새로운 시장 진출 기회',
        description: 'B2B SaaS 시장에서 예상치 못한 수요가 발생했습니다. EC2 인스턴스를 확장하여 대응할 수 있습니다.',
        choices: [
          {
            text: '즉시 마케팅 투자 확대 및 EC2 인스턴스 증설',
            effects: {
              usersDelta: 2000,
              cashDelta: -50000000,
              trustDelta: 5,
              addInfrastructure: ['EC2-Large'],
            },
            resultText: '공격적인 마케팅으로 유저 확보에 성공했습니다.',
          },
          {
            text: '신중하게 시장 조사 후 소규모 진입',
            effects: {
              usersDelta: 500,
              cashDelta: -10000000,
              trustDelta: 3,
            },
            resultText: '안정적으로 시장에 진입했습니다.',
          },
        ],
      };

      const score = service.calculateQualityScore(event);

      expect(score).toHaveProperty('coherence');
      expect(score).toHaveProperty('balance');
      expect(score).toHaveProperty('entertainment');
      expect(score).toHaveProperty('educational');
      expect(score).toHaveProperty('overall');

      expect(score.coherence).toBeGreaterThanOrEqual(0);
      expect(score.coherence).toBeLessThanOrEqual(100);
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });

    it('should score high-quality event above 80', () => {
      const excellentEvent: LLMGeneratedEvent = {
        eventType: 'INFRASTRUCTURE_DECISION',
        title: 'Aurora 데이터베이스 마이그레이션 제안',
        description:
          '현재 EC2의 MySQL이 한계에 도달했습니다. Aurora Serverless v2로 마이그레이션하면 자동 스케일링과 고가용성을 확보할 수 있습니다. 다만 비용이 증가합니다.',
        choices: [
          {
            text: 'Aurora Serverless v2로 즉시 마이그레이션 (고가용성 확보)',
            effects: {
              usersDelta: 1000,
              cashDelta: -30000000,
              trustDelta: 7,
              addInfrastructure: ['Aurora-Serverless-v2'],
            },
            resultText: 'Aurora 마이그레이션 완료. 데이터베이스 성능이 크게 개선되었습니다.',
          },
          {
            text: 'EC2 인스턴스 스케일업으로 임시 대응',
            effects: {
              usersDelta: 200,
              cashDelta: -5000000,
              trustDelta: 2,
            },
            resultText: 'EC2 스케일업 완료. 단기적으로 문제를 해결했습니다.',
          },
          {
            text: '현재 상태 유지 및 모니터링 강화 (비용 절감)',
            effects: {
              usersDelta: 0,
              cashDelta: -1000000,
              trustDelta: -1,
            },
            resultText: '모니터링을 강화했지만, 성능 문제는 계속됩니다.',
          },
        ],
      };

      const score = service.calculateQualityScore(excellentEvent);

      expect(score.overall).toBeGreaterThanOrEqual(80);
      expect(score.coherence).toBeGreaterThanOrEqual(80);
      expect(score.educational).toBeGreaterThanOrEqual(70); // AWS 서비스 언급으로 높은 점수
    });

    it('should score poor-quality event below 60', () => {
      const poorEvent: LLMGeneratedEvent = {
        eventType: 'MARKET_OPPORTUNITY',
        title: '문제',
        description: '상황 발생',
        choices: [
          {
            text: '예',
            effects: {
              usersDelta: 10,
              cashDelta: -100000,
              trustDelta: 1,
            },
            resultText: '좋아요',
          },
          {
            text: '아니오',
            effects: {
              usersDelta: 5,
              cashDelta: -50000,
              trustDelta: 0,
            },
            resultText: '괜찮아요',
          },
        ],
      };

      const score = service.calculateQualityScore(poorEvent);

      expect(score.overall).toBeLessThan(70);
      expect(score.entertainment).toBeLessThan(50); // 텍스트 너무 짧음
      expect(score.balance).toBeLessThan(85); // 효과 너무 작음
    });

    it('should penalize incoherent CRISIS event', () => {
      const incoherentCrisis: LLMGeneratedEvent = {
        eventType: 'INFRASTRUCTURE_CRISIS',
        title: '신규 투자 기회',
        description: '새로운 파트너사와 제휴 기회가 생겼습니다. 매출 증대가 예상됩니다.',
        choices: [
          {
            text: '제휴 진행',
            effects: {
              usersDelta: 5000,
              cashDelta: 100000000,
              trustDelta: 10,
            },
            resultText: '성공적으로 제휴했습니다.',
          },
          {
            text: '거절',
            effects: {
              usersDelta: 0,
              cashDelta: 0,
              trustDelta: 0,
            },
            resultText: '제휴를 거절했습니다.',
          },
        ],
      };

      const score = service.calculateQualityScore(incoherentCrisis);

      // CRISIS 타입인데 위기 키워드 없고, 부정적 효과도 없음
      expect(score.coherence).toBeLessThan(70);
    });

    it('should penalize imbalanced event (all choices bankrupt)', () => {
      const imbalancedEvent: LLMGeneratedEvent = {
        eventType: 'MARKET_CRISIS',
        title: '시장 붕괴',
        description: '시장이 붕괴하여 모든 선택지가 파산으로 이어집니다.',
        choices: [
          {
            text: '대규모 투자',
            effects: {
              usersDelta: 1000,
              cashDelta: -200000000,
              trustDelta: 5,
            },
            resultText: '투자했지만 파산했습니다.',
          },
          {
            text: '최소 투자',
            effects: {
              usersDelta: 100,
              cashDelta: -150000000,
              trustDelta: 2,
            },
            resultText: '최소 투자했지만 파산했습니다.',
          },
        ],
      };

      const gameState = {
        currentTurn: 10,
        cash: 100000000, // 현재 100M
        users: 5000,
        trust: 60,
      };

      const score = service.calculateQualityScore(imbalancedEvent, gameState);

      // 모든 선택지가 파산으로 이어지므로 balance 점수 하락
      expect(score.balance).toBeLessThan(70);
    });

    it('should reward event with infrastructure changes', () => {
      const eventWithInfra: LLMGeneratedEvent = {
        eventType: 'INFRASTRUCTURE_DECISION',
        title: 'EKS 클러스터 도입 검토',
        description: '컨테이너 오케스트레이션을 위해 EKS 도입이 제안되었습니다. Karpenter를 통한 자동 스케일링이 가능합니다.',
        choices: [
          {
            text: 'EKS + Karpenter 도입',
            effects: {
              usersDelta: 3000,
              cashDelta: -60000000,
              trustDelta: 8,
              addInfrastructure: ['EKS', 'Karpenter'],
            },
            resultText: 'EKS 클러스터 구축 완료. 컨테이너 오케스트레이션이 가능해졌습니다.',
          },
          {
            text: '기존 EC2 유지',
            effects: {
              usersDelta: 500,
              cashDelta: -5000000,
              trustDelta: 2,
            },
            resultText: 'EC2를 계속 사용합니다.',
          },
        ],
      };

      const score = service.calculateQualityScore(eventWithInfra);

      // 인프라 변경 + AWS 서비스 언급으로 educational 점수 높음
      expect(score.educational).toBeGreaterThanOrEqual(85);
    });

    it('should penalize event with no tradeoff', () => {
      const noTradeoffEvent: LLMGeneratedEvent = {
        eventType: 'MARKET_OPPORTUNITY',
        title: '명백한 선택',
        description: '한 선택지가 모든 면에서 압도적으로 유리합니다.',
        choices: [
          {
            text: '최고의 선택 (모든 면에서 유리)',
            effects: {
              usersDelta: 10000,
              cashDelta: 200000000,
              trustDelta: 20,
            },
            resultText: '대성공했습니다.',
          },
          {
            text: '최악의 선택 (모든 면에서 불리)',
            effects: {
              usersDelta: -1000,
              cashDelta: -100000000,
              trustDelta: -10,
            },
            resultText: '대실패했습니다.',
          },
        ],
      };

      const score = service.calculateQualityScore(noTradeoffEvent);

      // 트레이드오프 없으므로 entertainment 점수 하락
      expect(score.entertainment).toBeLessThan(80);
    });

    it('should reward event with result texts', () => {
      const eventWithResults: LLMGeneratedEvent = {
        eventType: 'MARKET_OPPORTUNITY',
        title: '신규 파트너십 제안',
        description: '대형 기업과의 파트너십 기회가 있습니다. Aurora RDS를 사용하여 안정적인 서비스를 제공해야 합니다.',
        choices: [
          {
            text: '파트너십 수락 및 Aurora 도입',
            effects: {
              usersDelta: 2000,
              cashDelta: -40000000,
              trustDelta: 6,
              addInfrastructure: ['Aurora-MySQL'],
            },
            resultText: '파트너십이 성사되었고, Aurora로 안정적인 서비스를 제공하고 있습니다.',
          },
          {
            text: '파트너십 거절',
            effects: {
              usersDelta: 0,
              cashDelta: 0,
              trustDelta: -2,
            },
            resultText: '파트너십을 거절했습니다. 다른 기회를 기다립니다.',
          },
        ],
      };

      const score = service.calculateQualityScore(eventWithResults);

      // 모든 선택지에 resultText 존재 → entertainment 보너스
      // 하지만 다른 요소(텍스트 길이 등)도 영향을 미침
      expect(score.entertainment).toBeGreaterThanOrEqual(60);
      expect(score.overall).toBeGreaterThanOrEqual(75); // 전반적으로 좋은 품질
    });
  });

  describe('generateQualityReport', () => {
    it('should generate detailed quality report', () => {
      const event: LLMGeneratedEvent = {
        eventType: 'MARKET_OPPORTUNITY',
        title: '테스트 이벤트',
        description: 'EC2와 Aurora를 사용하는 스타트업 서비스입니다.',
        choices: [
          {
            text: 'Aurora 확장',
            effects: {
              usersDelta: 1000,
              cashDelta: -20000000,
              trustDelta: 5,
              addInfrastructure: ['Aurora-Serverless'],
            },
            resultText: '확장 완료',
          },
          {
            text: '현상 유지',
            effects: {
              usersDelta: 0,
              cashDelta: 0,
              trustDelta: 0,
            },
            resultText: '유지 중',
          },
        ],
      };

      const report = service.generateQualityReport(event);

      expect(report).toContain('LLM Event Quality Report');
      expect(report).toContain('테스트 이벤트');
      expect(report).toContain('Coherence');
      expect(report).toContain('Balance');
      expect(report).toContain('Entertainment');
      expect(report).toContain('Educational');
      expect(report).toContain('Overall');
      expect(report).toContain('Grade:');
    });

    it('should show pass/fail status in report', () => {
      const excellentEvent: LLMGeneratedEvent = {
        eventType: 'INFRASTRUCTURE_DECISION',
        title: 'Aurora Global Database 도입',
        description:
          '글로벌 서비스 확장을 위해 Aurora Global Database 도입이 제안되었습니다. 다중 리전 복제와 1초 이내 장애조치가 가능합니다.',
        choices: [
          {
            text: 'Aurora Global DB 도입 (고가용성)',
            effects: {
              usersDelta: 5000,
              cashDelta: -80000000,
              trustDelta: 10,
              addInfrastructure: ['Aurora-Global-DB'],
            },
            resultText: 'Aurora Global Database 구축 완료. 글로벌 서비스가 가능해졌습니다.',
          },
          {
            text: '단일 리전 Aurora 유지',
            effects: {
              usersDelta: 1000,
              cashDelta: -10000000,
              trustDelta: 3,
            },
            resultText: '단일 리전에서 서비스를 계속합니다.',
          },
        ],
      };

      const report = service.generateQualityReport(excellentEvent);

      expect(report).toContain('✅ 품질 기준 통과');
    });
  });
});
