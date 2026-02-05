import { Injectable, Logger } from '@nestjs/common';
import { Game } from '../../database/entities/game.entity';
import {
  ValidationResult,
  EventQualityScore,
  DEFAULT_VALIDATION_LIMITS,
  FORBIDDEN_WORDS,
  ValidationLimits,
} from './validation.types';

import { LLMGeneratedEvent } from '../dto/llm-response.dto';

@Injectable()
export class LLMResponseValidatorService {
  private readonly logger = new Logger(LLMResponseValidatorService.name);
  private readonly limits: ValidationLimits = DEFAULT_VALIDATION_LIMITS;

  /**
   * 전체 검증 파이프라인 실행
   */
  async validate(llmEvent: LLMGeneratedEvent, gameState: any): Promise<{isValid: boolean; errors: string[]; fixedEvent?: LLMGeneratedEvent}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Stage 1: 구조 검증
    const structureResult = this.validateStructure(llmEvent);
    if (!structureResult.passed) {
      this.logger.warn(`Stage 1 실패: ${structureResult.errors.join(', ')}`);
      errors.push(...structureResult.errors);
    }

    // Stage 2: 밸런스 검증
    const balanceResult = this.validateBalance(llmEvent, gameState);
    if (!balanceResult.passed) {
      this.logger.warn(`Stage 2 실패: ${balanceResult.errors.join(', ')}`);
      errors.push(...balanceResult.errors);
    }

    // Stage 3: 콘텐츠 품질 검증
    const contentResult = this.validateContent(llmEvent);
    if (!contentResult.passed) {
      this.logger.warn(`Stage 3 실패: ${contentResult.errors.join(', ')}`);
      errors.push(...contentResult.errors);
    }

    // 품질 점수 계산
    const qualityScore = this.calculateQualityScore(llmEvent, gameState);

    // 모든 스테이지의 경고 누적
    warnings.push(...structureResult.warnings, ...balanceResult.warnings, ...contentResult.warnings);

    // Auto-fix attempt if there are errors
    let fixedEvent: LLMGeneratedEvent | undefined;
    if (errors.length > 0) {
      fixedEvent = this.attemptAutoFix(llmEvent, errors);
      if (fixedEvent) {
        this.logger.log('Auto-fix applied successfully');
        return { isValid: true, errors: [], fixedEvent };
      }
    }

    // 최종 판정
    if (qualityScore.overall < 60) {
      errors.push(`품질 점수 부족: ${qualityScore.overall}/100`);
    }

    const isValid = errors.length === 0;

    if (isValid) {
      this.logger.log(`검증 통과: ${llmEvent.eventType}, 품질 ${qualityScore.overall}/100`);
    }

    return { isValid, errors };
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
    if (!event.title || typeof event.title !== 'string') {
      errors.push('title 누락 또는 잘못된 타입');
    }
    if (!event.description || typeof event.description !== 'string') {
      errors.push('description 텍스트 누락 또는 잘못된 타입');
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
        // Optional fields - check types only if present
        if (choice.effects.usersDelta !== undefined && typeof choice.effects.usersDelta !== 'number') {
          errors.push(`선택지 ${idx + 1}: effects.usersDelta가 숫자가 아님`);
        }
        if (choice.effects.cashDelta !== undefined && typeof choice.effects.cashDelta !== 'number') {
          errors.push(`선택지 ${idx + 1}: effects.cashDelta가 숫자가 아님`);
        }
        if (choice.effects.trustDelta !== undefined && typeof choice.effects.trustDelta !== 'number') {
          errors.push(`선택지 ${idx + 1}: effects.trustDelta가 숫자가 아님`);
        }
        if (choice.effects.addInfrastructure && !Array.isArray(choice.effects.addInfrastructure)) {
          errors.push(`선택지 ${idx + 1}: effects.addInfrastructure가 배열이 아님`);
        }
      }
    });

    // 텍스트 길이 검증
    if (event.description) {
      if (event.description.length < this.limits.eventTextMinLength) {
        warnings.push(`이벤트 텍스트 너무 짧음: ${event.description.length}자`);
      }
      if (event.description.length > this.limits.eventTextMaxLength) {
        warnings.push(`이벤트 텍스트 너무 김: ${event.description.length}자`);
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
  private validateBalance(event: LLMGeneratedEvent, gameState: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    event.choices.forEach((choice, idx) => {
      const { usersDelta = 0, cashDelta = 0, trustDelta = 0 } = choice.effects;

      // 효과 범위 검증
      if (usersDelta < this.limits.users.min || usersDelta > this.limits.users.max) {
        errors.push(
          `선택지 ${idx + 1}: 유저 변화 범위 초과 (${usersDelta}, 허용: ${this.limits.users.min}~${this.limits.users.max})`,
        );
      }

      if (cashDelta < this.limits.cash.min || cashDelta > this.limits.cash.max) {
        errors.push(
          `선택지 ${idx + 1}: 현금 변화 범위 초과 (${cashDelta}, 허용: ${this.limits.cash.min}~${this.limits.cash.max})`,
        );
      }

      if (trustDelta < this.limits.trust.min || trustDelta > this.limits.trust.max) {
        errors.push(
          `선택지 ${idx + 1}: 신뢰도 변화 범위 초과 (${trustDelta}, 허용: ${this.limits.trust.min}~${this.limits.trust.max})`,
        );
      }

      // 파산 위험 체크
      if (gameState.cash) {
        const projectedCash = gameState.cash + cashDelta;
        if (projectedCash < 0) {
          warnings.push(
            `선택지 ${idx + 1}: 파산 위험 (현재 현금 ${gameState.cash} + ${cashDelta} = ${projectedCash})`,
          );
        }
      }

      // 신뢰도 게임오버 위험
      if (gameState.trust) {
        const projectedTrust = gameState.trust + trustDelta;
        if (projectedTrust < 20) {
          warnings.push(
            `선택지 ${idx + 1}: 신뢰도 게임오버 위험 (현재 ${gameState.trust} + ${trustDelta} = ${projectedTrust})`,
          );
        }
      }
    });

    // 모든 선택지가 파산으로 이어지면 에러
    if (gameState.cash) {
      const allBankrupt = event.choices.every((choice) => gameState.cash + (choice.effects.cashDelta || 0) < 0);
      if (allBankrupt) {
        errors.push('모든 선택지가 파산으로 이어짐 (탈출 불가능)');
      }
    }

    // 선택지 간 밸런스 체크
    const cashEffects = event.choices.map((c) => c.effects.cashDelta || 0);
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
      event.description,
      event.title,
      ...event.choices.map((c) => c.text),
      ...event.choices.map((c) => c.resultText).filter(Boolean),
    ].join(' ');

    for (const forbidden of FORBIDDEN_WORDS) {
      if (allText.includes(forbidden)) {
        errors.push(`금지 단어 발견: "${forbidden}"`);
      }
    }

    // AWS/클라우드 용어 적절성 체크 (relaxed for general events)
    const hasAWSContext =
      /AWS|클라우드|EC2|S3|Lambda|RDS|Aurora|EKS|CloudFront|서버|인프라|데이터베이스|스케일링/i.test(allText);
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
  private calculateQualityScore(event: LLMGeneratedEvent, gameState: any): EventQualityScore {
    let coherence = 100;
    let balance = 100;
    let entertainment = 100;
    let educational = 100;

    // 1. Coherence (문맥 일관성)
    // - 이벤트 타입과 내용 일치도
    if (event.eventType.includes('CRISIS') && !/(장애|사고|위기|긴급)/.test(event.description)) {
      coherence -= 20;
    }
    if (event.eventType.includes('OPPORTUNITY') && !/(기회|투자|제안|제휴)/.test(event.description)) {
      coherence -= 20;
    }

    // 2. Balance (밸런스 적정성)
    // - 효과 크기 적정성
    const avgCashEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.cashDelta || 0), 0) / event.choices.length;
    const avgTrustEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.trustDelta || 0), 0) / event.choices.length;

    // 현금 효과가 너무 크거나 작으면 감점
    if (avgCashEffect > 80000000) balance -= 20; // 너무 큼
    if (avgCashEffect < 1000000) balance -= 20; // 너무 작음 (< 1M)
    else if (avgCashEffect < 5000000) balance -= 10; // 작음 (< 5M)

    // 신뢰도 효과가 너무 크면 감점
    if (avgTrustEffect > 40) balance -= 15;

    // 3. Entertainment (재미 요소)
    // - 텍스트 길이 적정성
    const eventLength = event.description.length;
    if (eventLength < 30) entertainment -= 30; // 너무 짧으면 큰 감점
    else if (eventLength < 50 || eventLength > 400) entertainment -= 10;

    // - 선택지 다양성
    if (event.choices.length >= 3) entertainment += 10;

    // - 선택지 텍스트 품질 (단순 문자 선택지는 감점)
    const hasLowQualityChoice = event.choices.some((c) => c.text.length < 10);
    if (hasLowQualityChoice) entertainment -= 25;

    // 4. Educational (교육 가치)
    // - AWS 서비스 언급
    const allText = event.description + ' ' + event.choices.map(c => c.text).join(' ');
    const awsServices =
      (
        allText.match(
          /EC2|S3|Lambda|RDS|Aurora|EKS|CloudFront|Route53|VPC|DynamoDB/g,
        ) || []
      ).length;
    educational = Math.min(100, 60 + awsServices * 10);

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
   * Auto-fix attempt
   */
  private attemptAutoFix(event: LLMGeneratedEvent, errors: string[]): LLMGeneratedEvent | null {
    // Only attempt auto-fix for balance issues
    const hasBalanceIssues = errors.some(e => e.includes('범위 초과'));
    if (!hasBalanceIssues) {
      return null;
    }

    const fixed = JSON.parse(JSON.stringify(event)); // Deep clone

    // Fix out-of-range effects
    fixed.choices = fixed.choices.map(choice => ({
      ...choice,
      effects: {
        ...choice.effects,
        usersDelta: this.clamp(choice.effects.usersDelta || 0, this.limits.users.min, this.limits.users.max),
        cashDelta: this.clamp(choice.effects.cashDelta || 0, this.limits.cash.min, this.limits.cash.max),
        trustDelta: this.clamp(choice.effects.trustDelta || 0, this.limits.trust.min, this.limits.trust.max),
      },
    }));

    // Filter forbidden words
    fixed.description = this.filterForbiddenWords(fixed.description);
    fixed.title = this.filterForbiddenWords(fixed.title);
    fixed.choices = fixed.choices.map((choice) => ({
      ...choice,
      text: this.filterForbiddenWords(choice.text),
      resultText: choice.resultText ? this.filterForbiddenWords(choice.resultText) : undefined,
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
