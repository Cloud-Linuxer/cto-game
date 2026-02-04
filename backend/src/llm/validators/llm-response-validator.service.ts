import { Injectable, Logger } from '@nestjs/common';
import { Game } from '../../database/entities/game.entity';
import {
  ValidationResult,
  EventQualityScore,
  DEFAULT_VALIDATION_LIMITS,
  FORBIDDEN_WORDS,
  ValidationLimits,
} from './validation.types';

// LLM 생성 이벤트 인터페이스 (임시 - 나중에 실제 파일에서 import)
export interface LLMGeneratedEvent {
  eventType: 'disaster' | 'opportunity' | 'market_shift' | 'investor_crisis' | 'aws_incident_quiz';
  priority: number;
  event: string;
  choices: Array<{
    text: string;
    effects: {
      users: number;
      cash: number;
      trust: number;
      infra: string[];
    };
    reasoning?: string;
  }>;
  metadata?: {
    generatedAt: Date;
    modelUsed: string;
    tokensUsed: number;
    qualityScore?: number;
  };
}

@Injectable()
export class LLMResponseValidatorService {
  private readonly logger = new Logger(LLMResponseValidatorService.name);
  private readonly limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS;

  /**
   * 전체 검증 파이프라인 실행
   */
  async validate(llmEvent: LLMGeneratedEvent, game: Game): Promise<ValidationResult> {
    // Stage 1: 구조 검증
    const structureResult = this.validateStructure(llmEvent);
    if (!structureResult.passed) {
      this.logger.warn(`Stage 1 실패: ${structureResult.errors.join(', ')}`);
      return structureResult;
    }

    // Stage 2: 밸런스 검증
    const balanceResult = this.validateBalance(llmEvent, game);
    if (!balanceResult.passed) {
      this.logger.warn(`Stage 2 실패: ${balanceResult.errors.join(', ')}`);
      return balanceResult;
    }

    // Stage 3: 콘텐츠 품질 검증
    const contentResult = this.validateContent(llmEvent);
    if (!contentResult.passed) {
      this.logger.warn(`Stage 3 실패: ${contentResult.errors.join(', ')}`);
      return contentResult;
    }

    // 품질 점수 계산
    const qualityScore = this.calculateQualityScore(llmEvent, game);

    // 모든 스테이지의 경고 누적
    const allWarnings = [
      ...structureResult.warnings,
      ...balanceResult.warnings,
      ...contentResult.warnings,
    ];

    // 최종 판정
    if (qualityScore.overall < 60) {
      return {
        passed: false,
        stage: 'content',
        errors: [`품질 점수 부족: ${qualityScore.overall}/100`],
        warnings: allWarnings,
        qualityScore,
      };
    }

    this.logger.log(`검증 통과: ${llmEvent.eventType}, 품질 ${qualityScore.overall}/100`);

    return {
      passed: true,
      stage: 'approved',
      errors: [],
      warnings: allWarnings,
      qualityScore,
    };
  }

  /**
   * Stage 1: 구조 검증
   */
  private validateStructure(event: LLMGeneratedEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 필수 필드 존재 여부
    if (!event.eventType) {
      errors.push('eventType 누락');
    }
    if (!event.event || typeof event.event !== 'string') {
      errors.push('event 텍스트 누락 또는 잘못된 타입');
    }
    if (!event.choices || !Array.isArray(event.choices)) {
      errors.push('choices 배열 누락');
    }

    // 선택지 개수 검증
    if (event.choices) {
      if (event.choices.length < this.limits.minChoices) {
        errors.push(
          `선택지 부족: ${event.choices.length}개 (최소 ${this.limits.minChoices}개)`,
        );
      }
      if (event.choices.length > this.limits.maxChoices) {
        errors.push(
          `선택지 과다: ${event.choices.length}개 (최대 ${this.limits.maxChoices}개)`,
        );
      }
    }

    // 각 선택지 필드 검증
    event.choices?.forEach((choice, idx) => {
      if (!choice.text) {
        errors.push(`선택지 ${idx + 1}: text 누락`);
      }
      if (!choice.effects) {
        errors.push(`선택지 ${idx + 1}: effects 누락`);
      } else {
        // effects 필드 검증
        if (typeof choice.effects.users !== 'number') {
          errors.push(`선택지 ${idx + 1}: effects.users가 숫자가 아님`);
        }
        if (typeof choice.effects.cash !== 'number') {
          errors.push(`선택지 ${idx + 1}: effects.cash가 숫자가 아님`);
        }
        if (typeof choice.effects.trust !== 'number') {
          errors.push(`선택지 ${idx + 1}: effects.trust가 숫자가 아님`);
        }
        if (!Array.isArray(choice.effects.infra)) {
          errors.push(`선택지 ${idx + 1}: effects.infra가 배열이 아님`);
        }
      }
    });

    // 텍스트 길이 검증
    if (event.event) {
      if (event.event.length < this.limits.eventTextMinLength) {
        warnings.push(`이벤트 텍스트 너무 짧음: ${event.event.length}자`);
      }
      if (event.event.length > this.limits.eventTextMaxLength) {
        warnings.push(`이벤트 텍스트 너무 김: ${event.event.length}자`);
      }
    }

    return {
      passed: errors.length === 0,
      stage: 'structure',
      errors,
      warnings,
    };
  }

  /**
   * Stage 2: 밸런스 검증
   */
  private validateBalance(event: LLMGeneratedEvent, game: Game): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    event.choices.forEach((choice, idx) => {
      const { users, cash, trust } = choice.effects;

      // 효과 범위 검증
      if (users < this.limits.users.min || users > this.limits.users.max) {
        errors.push(
          `선택지 ${idx + 1}: 유저 변화 범위 초과 (${users}, 허용: ${this.limits.users.min}~${this.limits.users.max})`,
        );
      }

      if (cash < this.limits.cash.min || cash > this.limits.cash.max) {
        errors.push(
          `선택지 ${idx + 1}: 현금 변화 범위 초과 (${cash}, 허용: ${this.limits.cash.min}~${this.limits.cash.max})`,
        );
      }

      if (trust < this.limits.trust.min || trust > this.limits.trust.max) {
        errors.push(
          `선택지 ${idx + 1}: 신뢰도 변화 범위 초과 (${trust}, 허용: ${this.limits.trust.min}~${this.limits.trust.max})`,
        );
      }

      // 파산 위험 체크
      const projectedCash = game.cash + cash;
      if (projectedCash < 0) {
        warnings.push(
          `선택지 ${idx + 1}: 파산 위험 (현재 현금 ${game.cash} + ${cash} = ${projectedCash})`,
        );
      }

      // 신뢰도 게임오버 위험
      const projectedTrust = game.trust + trust;
      if (projectedTrust < 20) {
        warnings.push(
          `선택지 ${idx + 1}: 신뢰도 게임오버 위험 (현재 ${game.trust} + ${trust} = ${projectedTrust})`,
        );
      }
    });

    // 모든 선택지가 파산으로 이어지면 에러
    const allBankrupt = event.choices.every((choice) => game.cash + choice.effects.cash < 0);
    if (allBankrupt) {
      errors.push('모든 선택지가 파산으로 이어짐 (탈출 불가능)');
    }

    // 선택지 간 밸런스 체크
    const cashEffects = event.choices.map((c) => c.effects.cash);
    const maxCash = Math.max(...cashEffects);
    const minCash = Math.min(...cashEffects);

    if (maxCash - minCash > 150000000) {
      warnings.push(
        `선택지 간 현금 차이 과다: ${maxCash - minCash} (한 선택지가 너무 유리)`,
      );
    }

    return {
      passed: errors.length === 0,
      stage: 'balance',
      errors,
      warnings,
    };
  }

  /**
   * Stage 3: 콘텐츠 품질 검증
   */
  private validateContent(event: LLMGeneratedEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 금지 단어 검사
    const allText = [
      event.event,
      ...event.choices.map((c) => c.text),
      ...(event.choices.map((c) => c.reasoning).filter(Boolean) as string[]),
    ].join(' ');

    for (const forbidden of FORBIDDEN_WORDS) {
      if (allText.includes(forbidden)) {
        errors.push(`금지 단어 발견: "${forbidden}"`);
      }
    }

    // AWS/클라우드 용어 적절성 체크
    const hasAWSContext =
      /AWS|클라우드|EC2|S3|Lambda|RDS|Aurora|EKS|CloudFront/i.test(allText);
    if (!hasAWSContext) {
      warnings.push('AWS/클라우드 관련 컨텍스트 부족 (게임 세계관 이탈 가능)');
    }

    // 한글 비율 체크 (최소 50%)
    const koreanChars = allText.match(/[가-힣]/g)?.length || 0;
    const totalChars = allText.replace(/\s/g, '').length;
    const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0;

    if (koreanRatio < 0.5) {
      warnings.push(`한글 비율 낮음: ${(koreanRatio * 100).toFixed(1)}%`);
    }

    // 이모지 존재 여부 (시각적 강조)
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(event.event);
    if (!hasEmoji) {
      warnings.push('이벤트 텍스트에 이모지 없음 (시각적 강조 부족)');
    }

    // 선택지 텍스트 중복 체크
    const choiceTexts = event.choices.map((c) => c.text);
    const uniqueTexts = new Set(choiceTexts);
    if (uniqueTexts.size !== choiceTexts.length) {
      errors.push('선택지 텍스트 중복 발견');
    }

    return {
      passed: errors.length === 0,
      stage: 'content',
      errors,
      warnings,
    };
  }

  /**
   * 품질 점수 계산
   */
  private calculateQualityScore(event: LLMGeneratedEvent, game: Game): EventQualityScore {
    let coherence = 100;
    let balance = 100;
    let entertainment = 100;
    let educational = 100;

    // 1. Coherence (문맥 일관성)
    // - 이벤트 타입과 내용 일치도
    if (event.eventType === 'disaster' && !/(장애|사고|위기|긴급)/.test(event.event)) {
      coherence -= 20;
    }
    if (event.eventType === 'opportunity' && !/(기회|투자|제안|제휴)/.test(event.event)) {
      coherence -= 20;
    }

    // - 게임 상황 반영도
    const hasGameContext =
      event.event.includes(game.users.toLocaleString()) ||
      event.event.includes(game.cash.toLocaleString()) ||
      event.event.includes(`${game.trust}`);

    if (!hasGameContext) {
      coherence -= 15;
    }

    // 2. Balance (밸런스 적정성)
    // - 효과 크기 적정성
    const avgCashEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.cash), 0) / event.choices.length;
    const avgTrustEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.trust), 0) / event.choices.length;

    // 현금 효과가 너무 크거나 작으면 감점
    if (avgCashEffect > 80000000) balance -= 20; // 너무 큼
    if (avgCashEffect < 1000000) balance -= 20; // 너무 작음 (< 1M)
    else if (avgCashEffect < 5000000) balance -= 10; // 작음 (< 5M)

    // 신뢰도 효과가 너무 크면 감점
    if (avgTrustEffect > 40) balance -= 15;

    // 3. Entertainment (재미 요소)
    // - 텍스트 길이 적정성
    const eventLength = event.event.length;
    if (eventLength < 30) entertainment -= 30; // 너무 짧으면 큰 감점
    else if (eventLength < 50 || eventLength > 400) entertainment -= 10;

    // - 드라마틱한 표현
    const hasDrama = /(!!|🚨|💰|📈|⚠️|긴급|위기|기회)/.test(event.event);
    if (!hasDrama) entertainment -= 20; // 감점 강화

    // - 선택지 다양성
    if (event.choices.length >= 3) entertainment += 10;

    // - 선택지 텍스트 품질 (단순 문자 선택지는 감점)
    const hasLowQualityChoice = event.choices.some((c) => c.text.length < 3);
    if (hasLowQualityChoice) entertainment -= 25;

    // 4. Educational (교육 가치)
    // - AWS 서비스 언급
    const awsServices =
      (
        event.event.match(
          /EC2|S3|Lambda|RDS|Aurora|EKS|CloudFront|Route53|VPC|DynamoDB/g,
        ) || []
      ).length;
    educational = Math.min(100, 60 + awsServices * 10);

    // - 기술적 설명 존재
    if (event.choices.some((c) => c.reasoning && c.reasoning.length > 30)) {
      educational += 10;
    }

    const overall = Math.round((coherence + balance + entertainment + educational) / 4);

    return {
      coherence: Math.max(0, Math.min(100, coherence)),
      balance: Math.max(0, Math.min(100, balance)),
      entertainment: Math.max(0, Math.min(100, entertainment)),
      educational: Math.max(0, Math.min(100, educational)),
      overall: Math.max(0, Math.min(100, overall)),
    };
  }

  /**
   * 자동 수정 시도 (가능한 경우)
   */
  async autoFix(event: LLMGeneratedEvent): Promise<LLMGeneratedEvent> {
    const fixed = { ...event };

    // 효과 범위 클램핑
    fixed.choices = fixed.choices.map((choice) => ({
      ...choice,
      effects: {
        users: this.clamp(choice.effects.users, this.limits.users.min, this.limits.users.max),
        cash: this.clamp(choice.effects.cash, this.limits.cash.min, this.limits.cash.max),
        trust: this.clamp(choice.effects.trust, this.limits.trust.min, this.limits.trust.max),
        infra: choice.effects.infra || [],
      },
    }));

    // 금지 단어 필터링
    fixed.event = this.filterForbiddenWords(fixed.event);
    fixed.choices = fixed.choices.map((choice) => ({
      ...choice,
      text: this.filterForbiddenWords(choice.text),
    }));

    return fixed;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private filterForbiddenWords(text: string): string {
    let filtered = text;
    for (const word of FORBIDDEN_WORDS) {
      filtered = filtered.replace(new RegExp(word, 'g'), '***');
    }
    return filtered;
  }
}
