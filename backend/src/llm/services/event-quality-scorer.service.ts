import { Injectable, Logger } from '@nestjs/common';
import { LLMGeneratedEvent } from '../dto/llm-response.dto';
import { EventQualityScore } from '../validators/validation.types';

/**
 * Event Quality Scoring Service
 *
 * LLM으로 생성된 이벤트의 품질을 4가지 차원에서 평가:
 * 1. Coherence (일관성): 이벤트 타입/내용/효과의 논리적 일치도
 * 2. Balance (밸런스): 게임 밸런스 내에서 효과의 적정성
 * 3. Entertainment (재미): 흥미로운 시나리오와 선택지 품질
 * 4. Educational (교육성): AWS 인프라 개념 학습 요소
 *
 * EPIC-06 Feature 3 목표: 평균 품질 점수 >80점
 */
@Injectable()
export class EventQualityScorerService {
  private readonly logger = new Logger(EventQualityScorerService.name);

  /**
   * 이벤트 품질 점수 계산 (공개 API)
   */
  calculateQualityScore(event: LLMGeneratedEvent, gameState?: any): EventQualityScore {
    const coherence = this.scoreCoherence(event);
    const balance = this.scoreBalance(event, gameState);
    const entertainment = this.scoreEntertainment(event);
    const educational = this.scoreEducational(event);

    const overall = Math.round((coherence + balance + entertainment + educational) / 4);

    this.logger.debug(
      `Quality Score: ${overall}/100 (coherence: ${coherence}, balance: ${balance}, entertainment: ${entertainment}, educational: ${educational})`,
    );

    return {
      coherence: Math.max(0, Math.min(100, coherence)),
      balance: Math.max(0, Math.min(100, balance)),
      entertainment: Math.max(0, Math.min(100, entertainment)),
      educational: Math.max(0, Math.min(100, educational)),
      overall: Math.max(0, Math.min(100, overall)),
    };
  }

  /**
   * 1. Coherence (일관성) 평가 (0-100점)
   *
   * 평가 기준:
   * - 이벤트 타입과 내용의 일치도
   * - 선택지 텍스트와 효과의 논리성
   * - 게임 세계관 일치도 (스타트업/AWS 컨텍스트)
   */
  private scoreCoherence(event: LLMGeneratedEvent): number {
    let score = 100;

    // 이벤트 타입과 내용 일치도
    if (event.eventType.includes('CRISIS')) {
      if (!/장애|사고|위기|긴급|장애|문제|버그|해킹|공격/.test(event.description)) {
        score -= 25;
        this.logger.debug('Coherence: CRISIS 타입이지만 위기 상황 키워드 없음');
      }
      // CRISIS는 부정적 효과가 있어야 함
      const hasNegativeEffect = event.choices.some(
        (c) => (c.effects.cashDelta || 0) < 0 || (c.effects.trustDelta || 0) < 0,
      );
      if (!hasNegativeEffect) {
        score -= 15;
        this.logger.debug('Coherence: CRISIS인데 모든 선택지가 긍정적 효과');
      }
    }

    if (event.eventType.includes('OPPORTUNITY')) {
      if (!/기회|투자|제안|제휴|성장|확장|수익|파트너/.test(event.description)) {
        score -= 25;
        this.logger.debug('Coherence: OPPORTUNITY 타입이지만 기회 키워드 없음');
      }
      // OPPORTUNITY는 긍정적 효과가 있어야 함
      const hasPositiveEffect = event.choices.some(
        (c) => (c.effects.cashDelta || 0) > 0 || (c.effects.usersDelta || 0) > 0,
      );
      if (!hasPositiveEffect) {
        score -= 15;
        this.logger.debug('Coherence: OPPORTUNITY인데 모든 선택지가 부정적 효과');
      }
    }

    // 게임 세계관 일치도 (스타트업/AWS 컨텍스트)
    const allText = `${event.title} ${event.description} ${event.choices.map((c) => c.text).join(' ')}`;
    const hasStartupContext = /스타트업|서비스|유저|고객|투자|매출|수익|팀|개발|배포/.test(allText);
    if (!hasStartupContext) {
      score -= 20;
      this.logger.debug('Coherence: 스타트업 컨텍스트 부족');
    }

    // 선택지 텍스트와 효과의 논리성
    event.choices.forEach((choice, idx) => {
      const choiceText = choice.text.toLowerCase();
      const { cashDelta = 0, usersDelta = 0, trustDelta = 0 } = choice.effects;

      // "투자" 키워드는 cash가 음수여야 논리적
      if (/(투자|구매|확보|채용|광고)/.test(choiceText) && cashDelta >= 0) {
        score -= 10;
        this.logger.debug(`Coherence: 선택지 ${idx + 1} - 투자/구매인데 cash가 음수가 아님`);
      }

      // "절감/축소" 키워드는 효과가 작아야 논리적
      if (/(절감|축소|감소|최소화)/.test(choiceText)) {
        if (Math.abs(cashDelta) > 50000000) {
          score -= 10;
          this.logger.debug(`Coherence: 선택지 ${idx + 1} - 절감/축소인데 효과가 너무 큼`);
        }
      }

      // "공격적/대규모" 키워드는 효과가 커야 논리적
      if (/(공격적|대규모|전면|대대적)/.test(choiceText)) {
        if (Math.abs(cashDelta) < 20000000 && Math.abs(usersDelta) < 1000) {
          score -= 10;
          this.logger.debug(`Coherence: 선택지 ${idx + 1} - 공격적/대규모인데 효과가 작음`);
        }
      }
    });

    return Math.max(0, score);
  }

  /**
   * 2. Balance (밸런스) 평가 (0-100점)
   *
   * 평가 기준:
   * - 효과 크기의 적정성 (너무 크거나 작지 않은지)
   * - 선택지 간 밸런스 (한 선택지가 압도적으로 유리하지 않은지)
   * - 게임 상태 고려 (파산/게임오버 위험 방지)
   */
  private scoreBalance(event: LLMGeneratedEvent, gameState?: any): number {
    let score = 100;

    // 효과 크기 적정성
    const avgCashEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.cashDelta || 0), 0) / event.choices.length;
    const avgUserEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.usersDelta || 0), 0) / event.choices.length;
    const avgTrustEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.trustDelta || 0), 0) / event.choices.length;

    // Cash 효과 크기 검증 (적정 범위: 5M-80M)
    if (avgCashEffect > 80000000) {
      score -= 25;
      this.logger.debug(`Balance: 평균 cash 효과 너무 큼 (${avgCashEffect})`);
    } else if (avgCashEffect < 5000000) {
      score -= 15;
      this.logger.debug(`Balance: 평균 cash 효과 너무 작음 (${avgCashEffect})`);
    }

    // User 효과 크기 검증 (적정 범위: 500-3000)
    if (avgUserEffect > 3000) {
      score -= 20;
      this.logger.debug(`Balance: 평균 user 효과 너무 큼 (${avgUserEffect})`);
    } else if (avgUserEffect < 500 && avgUserEffect > 0) {
      score -= 10;
      this.logger.debug(`Balance: 평균 user 효과 너무 작음 (${avgUserEffect})`);
    }

    // Trust 효과 크기 검증 (적정 범위: 3-8)
    if (avgTrustEffect > 8) {
      score -= 15;
      this.logger.debug(`Balance: 평균 trust 효과 너무 큼 (${avgTrustEffect})`);
    }

    // 선택지 간 밸런스 검증
    const cashEffects = event.choices.map((c) => c.effects.cashDelta || 0);
    const maxCash = Math.max(...cashEffects);
    const minCash = Math.min(...cashEffects);
    const cashGap = maxCash - minCash;

    if (cashGap > 150000000) {
      score -= 20;
      this.logger.debug(`Balance: 선택지 간 cash 차이 과다 (${cashGap})`);
    }

    // 게임 상태 고려 (gameState 있을 경우)
    if (gameState) {
      // 파산 위험 체크
      if (gameState.cash) {
        const allBankrupt = event.choices.every((c) => gameState.cash + (c.effects.cashDelta || 0) < 0);
        if (allBankrupt) {
          score -= 30;
          this.logger.debug('Balance: 모든 선택지가 파산으로 이어짐');
        }
      }

      // 신뢰도 게임오버 위험
      if (gameState.trust) {
        const allTrustFail = event.choices.every((c) => gameState.trust + (c.effects.trustDelta || 0) < 20);
        if (allTrustFail) {
          score -= 30;
          this.logger.debug('Balance: 모든 선택지가 신뢰도 게임오버로 이어짐');
        }
      }
    }

    // 모든 선택지가 동일한 효과면 선택의 의미 없음
    if (cashGap === 0 && event.choices.every((c) => c.effects.usersDelta === event.choices[0].effects.usersDelta)) {
      score -= 25;
      this.logger.debug('Balance: 모든 선택지 효과가 동일함');
    }

    return Math.max(0, score);
  }

  /**
   * 3. Entertainment (재미) 평가 (0-100점)
   *
   * 평가 기준:
   * - 이벤트 텍스트 길이 및 품질
   * - 선택지 다양성 및 명확성
   * - 트레이드오프의 존재 (선택의 의미)
   */
  private scoreEntertainment(event: LLMGeneratedEvent): number {
    let score = 100;

    // 이벤트 텍스트 길이 검증
    const descLength = event.description.length;
    if (descLength < 30) {
      score -= 35;
      this.logger.debug(`Entertainment: 이벤트 텍스트 너무 짧음 (${descLength}자)`);
    } else if (descLength < 50) {
      score -= 15;
      this.logger.debug(`Entertainment: 이벤트 텍스트 짧음 (${descLength}자)`);
    } else if (descLength > 400) {
      score -= 10;
      this.logger.debug(`Entertainment: 이벤트 텍스트 너무 김 (${descLength}자)`);
    }

    // 제목 품질
    const titleLength = event.title.length;
    if (titleLength < 5) {
      score -= 10;
      this.logger.debug(`Entertainment: 제목 너무 짧음 (${titleLength}자)`);
    } else if (titleLength > 50) {
      score -= 5;
      this.logger.debug(`Entertainment: 제목 너무 김 (${titleLength}자)`);
    }

    // 선택지 다양성 (3개 이상이면 보너스)
    if (event.choices.length >= 3) {
      score += 10;
      this.logger.debug('Entertainment: 선택지 3개 이상 (다양성 보너스)');
    }

    // 선택지 텍스트 품질
    event.choices.forEach((choice, idx) => {
      const choiceTextLength = choice.text.length;
      if (choiceTextLength < 10) {
        score -= 25;
        this.logger.debug(`Entertainment: 선택지 ${idx + 1} 텍스트 너무 짧음 (${choiceTextLength}자)`);
      } else if (choiceTextLength > 150) {
        score -= 10;
        this.logger.debug(`Entertainment: 선택지 ${idx + 1} 텍스트 너무 김 (${choiceTextLength}자)`);
      }

      // 단순 선택지 감점 (예: "예", "아니오")
      if (/^(예|아니오|네|아뇨|예스|노|확인|취소)$/.test(choice.text)) {
        score -= 20;
        this.logger.debug(`Entertainment: 선택지 ${idx + 1} 단순 답변 (창의성 부족)`);
      }
    });

    // 트레이드오프 존재 여부 (한 선택지가 모든 효과에서 우월하지 않은지)
    const hasMeaningfulTradeoff = this.checkTradeoff(event);
    if (!hasMeaningfulTradeoff) {
      score -= 20;
      this.logger.debug('Entertainment: 의미 있는 트레이드오프 없음 (선택의 의미 부족)');
    }

    // resultText 존재 여부 (피드백 품질)
    const allHaveResultText = event.choices.every((c) => c.resultText && c.resultText.length > 10);
    if (allHaveResultText) {
      score += 10;
      this.logger.debug('Entertainment: 모든 선택지에 결과 텍스트 존재 (피드백 우수)');
    }

    return Math.max(0, score);
  }

  /**
   * 4. Educational (교육성) 평가 (0-100점)
   *
   * 평가 기준:
   * - AWS 서비스 언급 (실제 인프라 개념)
   * - 클라우드 아키텍처 개념 포함
   * - 기술적 의사결정 요소
   */
  private scoreEducational(event: LLMGeneratedEvent): number {
    let score = 60; // 기본 60점

    const allText = `${event.title} ${event.description} ${event.choices.map((c) => c.text).join(' ')}`;

    // AWS 서비스 언급 (각 서비스 +8점, 최대 40점)
    const awsServices = allText.match(
      /EC2|S3|Lambda|RDS|Aurora|EKS|CloudFront|Route53|VPC|DynamoDB|ElastiCache|ALB|CloudWatch|IAM|KMS/g,
    );
    const awsServiceCount = awsServices ? new Set(awsServices).size : 0;
    const awsBonus = Math.min(40, awsServiceCount * 8);
    score += awsBonus;
    this.logger.debug(`Educational: AWS 서비스 ${awsServiceCount}개 언급 (+${awsBonus}점)`);

    // 인프라 변경 효과 (addInfrastructure)
    const hasInfraChange = event.choices.some((c) => c.effects.addInfrastructure && c.effects.addInfrastructure.length > 0);
    if (hasInfraChange) {
      score += 15;
      this.logger.debug('Educational: 인프라 변경 효과 포함 (+15점)');
    }

    // 클라우드 아키텍처 개념
    const architectureConcepts = allText.match(
      /스케일링|확장성|가용성|내구성|성능|최적화|보안|백업|복구|장애조치|다중화|로드밸런싱|캐싱|모니터링/g,
    );
    if (architectureConcepts && architectureConcepts.length >= 2) {
      score += 10;
      this.logger.debug('Educational: 아키텍처 개념 2개 이상 포함 (+10점)');
    }

    // 비용 관련 언급 (FinOps 교육)
    if (/비용|요금|가격|절감|최적화|예산/.test(allText)) {
      score += 5;
      this.logger.debug('Educational: 비용 관련 내용 포함 (+5점)');
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 트레이드오프 존재 여부 확인
   * 모든 효과에서 한 선택지가 압도적으로 우월하지 않은지 체크
   */
  private checkTradeoff(event: LLMGeneratedEvent): boolean {
    if (event.choices.length < 2) return true;

    // 각 선택지의 종합 점수 계산 (cash, users, trust를 정규화하여 합산)
    const scores = event.choices.map((choice) => {
      const cash = (choice.effects.cashDelta || 0) / 10000000; // 10M = 1점
      const users = (choice.effects.usersDelta || 0) / 100; // 100 users = 1점
      const trust = (choice.effects.trustDelta || 0) * 2; // trust 1 = 2점
      return cash + users + trust;
    });

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 최고 점수와 최저 점수 차이가 너무 크면 (10점 이상) 트레이드오프 없음
    if (maxScore - minScore > 10) {
      this.logger.debug(`Tradeoff check: 점수 차이 과다 (max: ${maxScore}, min: ${minScore})`);
      return false;
    }

    // 모든 선택지가 동일 점수면 의미 있는 선택 아님
    if (maxScore === minScore) {
      this.logger.debug('Tradeoff check: 모든 선택지 동일 점수');
      return false;
    }

    return true;
  }

  /**
   * 품질 리포트 생성 (상세 분석)
   */
  generateQualityReport(event: LLMGeneratedEvent, gameState?: any): string {
    const score = this.calculateQualityScore(event, gameState);

    const report = `
=== LLM Event Quality Report ===

Event: ${event.title}
Type: ${event.eventType}

Scores:
- Coherence (일관성):     ${score.coherence}/100
- Balance (밸런스):       ${score.balance}/100
- Entertainment (재미):   ${score.entertainment}/100
- Educational (교육성):   ${score.educational}/100
----------------------------------------
Overall (종합):          ${score.overall}/100

Grade: ${this.getGrade(score.overall)}

${score.overall >= 80 ? '✅ 품질 기준 통과 (>80점)' : '❌ 품질 기준 미달 (<80점)'}
    `.trim();

    return report;
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'S (Excellent)';
    if (score >= 80) return 'A (Good)';
    if (score >= 70) return 'B (Fair)';
    if (score >= 60) return 'C (Poor)';
    return 'D (Fail)';
  }
}
