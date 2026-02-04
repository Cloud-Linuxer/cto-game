# Phase 1 상세 설계: LLM 품질 관리 + 이벤트 다양성

## 목차
1. [LLM 품질 관리 시스템](#1-llm-품질-관리-시스템)
2. [이벤트 다양성 및 중복 방지](#2-이벤트-다양성-및-중복-방지)
3. [통합 아키텍처](#3-통합-아키텍처)
4. [구현 체크리스트](#4-구현-체크리스트)

---

## 1. LLM 품질 관리 시스템

### 1.1 3단계 검증 파이프라인

**아키텍처**:

```
LLM 응답 (JSON)
    ↓
┌──────────────────────────────────────┐
│ Stage 1: 구조 검증                    │
│ - JSON 파싱 가능?                     │
│ - 필수 필드 존재?                     │
│ - 선택지 2개 이상?                    │
└──────────────────────────────────────┘
    ↓ PASS
┌──────────────────────────────────────┐
│ Stage 2: 밸런스 검증                  │
│ - 효과 범위 적정?                     │
│ - 게임 밸런스 위험?                   │
│ - 파산 가능성?                        │
└──────────────────────────────────────┘
    ↓ PASS
┌──────────────────────────────────────┐
│ Stage 3: 콘텐츠 품질 검증              │
│ - 욕설/부적절한 내용?                 │
│ - 게임 세계관 부합?                   │
│ - 텍스트 품질?                        │
└──────────────────────────────────────┘
    ↓ PASS
✅ 이벤트 승인
```

**구현**: `backend/src/llm/validators/llm-response-validator.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { LLMGeneratedEvent } from '../llm-event-generator.service';
import { Game } from '../../database/entities/game.entity';

export interface ValidationResult {
  passed: boolean;
  stage: 'structure' | 'balance' | 'content' | 'approved';
  errors: string[];
  warnings: string[];
  qualityScore?: EventQualityScore;
}

export interface EventQualityScore {
  coherence: number;      // 문맥 일관성 (0~100)
  balance: number;        // 밸런스 적정성 (0~100)
  entertainment: number;  // 재미 요소 (0~100)
  educational: number;    // 교육 가치 (0~100)
  overall: number;        // 종합 점수
}

@Injectable()
export class LLMResponseValidatorService {
  private readonly logger = new Logger(LLMResponseValidatorService.name);

  // 허용 범위 설정
  private readonly LIMITS = {
    users: { min: -100000, max: 100000 },
    cash: { min: -100000000, max: 100000000 },
    trust: { min: -50, max: 50 },
    maxChoices: 4,
    minChoices: 2,
    eventTextMinLength: 20,
    eventTextMaxLength: 500,
    choiceTextMinLength: 10,
    choiceTextMaxLength: 150,
  };

  // 금지 단어 목록
  private readonly FORBIDDEN_WORDS = [
    '씨발', '개새끼', '병신', '좆', '엿먹어',
    // ... 추가 금지어
  ];

  /**
   * 전체 검증 파이프라인 실행
   */
  async validate(
    llmEvent: LLMGeneratedEvent,
    game: Game,
  ): Promise<ValidationResult> {
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

    // 최종 판정
    if (qualityScore.overall < 60) {
      return {
        passed: false,
        stage: 'content',
        errors: [`품질 점수 부족: ${qualityScore.overall}/100`],
        warnings: [],
        qualityScore,
      };
    }

    this.logger.log(
      `검증 통과: ${llmEvent.eventType}, 품질 ${qualityScore.overall}/100`,
    );

    return {
      passed: true,
      stage: 'approved',
      errors: [],
      warnings: contentResult.warnings,
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
      if (event.choices.length < this.LIMITS.minChoices) {
        errors.push(`선택지 부족: ${event.choices.length}개 (최소 ${this.LIMITS.minChoices}개)`);
      }
      if (event.choices.length > this.LIMITS.maxChoices) {
        errors.push(`선택지 과다: ${event.choices.length}개 (최대 ${this.LIMITS.maxChoices}개)`);
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
      if (event.event.length < this.LIMITS.eventTextMinLength) {
        warnings.push(`이벤트 텍스트 너무 짧음: ${event.event.length}자`);
      }
      if (event.event.length > this.LIMITS.eventTextMaxLength) {
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
  private validateBalance(
    event: LLMGeneratedEvent,
    game: Game,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    event.choices.forEach((choice, idx) => {
      const { users, cash, trust } = choice.effects;

      // 효과 범위 검증
      if (users < this.LIMITS.users.min || users > this.LIMITS.users.max) {
        errors.push(
          `선택지 ${idx + 1}: 유저 변화 범위 초과 (${users}, 허용: ${this.LIMITS.users.min}~${this.LIMITS.users.max})`,
        );
      }

      if (cash < this.LIMITS.cash.min || cash > this.LIMITS.cash.max) {
        errors.push(
          `선택지 ${idx + 1}: 현금 변화 범위 초과 (${cash}, 허용: ${this.LIMITS.cash.min}~${this.LIMITS.cash.max})`,
        );
      }

      if (trust < this.LIMITS.trust.min || trust > this.LIMITS.trust.max) {
        errors.push(
          `선택지 ${idx + 1}: 신뢰도 변화 범위 초과 (${trust}, 허용: ${this.LIMITS.trust.min}~${this.LIMITS.trust.max})`,
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
    const allBankrupt = event.choices.every(
      (choice) => game.cash + choice.effects.cash < 0,
    );
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

    for (const forbidden of this.FORBIDDEN_WORDS) {
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
    const koreanRatio = koreanChars / totalChars;

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
  private calculateQualityScore(
    event: LLMGeneratedEvent,
    game: Game,
  ): EventQualityScore {
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
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.cash), 0) /
      event.choices.length;
    const avgTrustEffect =
      event.choices.reduce((sum, c) => sum + Math.abs(c.effects.trust), 0) /
      event.choices.length;

    // 현금 효과가 너무 크거나 작으면 감점
    if (avgCashEffect > 80000000) balance -= 20; // 너무 큼
    if (avgCashEffect < 5000000) balance -= 10; // 너무 작음

    // 신뢰도 효과가 너무 크면 감점
    if (avgTrustEffect > 40) balance -= 15;

    // 3. Entertainment (재미 요소)
    // - 텍스트 길이 적정성
    const eventLength = event.event.length;
    if (eventLength < 50 || eventLength > 400) entertainment -= 10;

    // - 드라마틱한 표현
    const hasDrama = /(!!|🚨|💰|📈|⚠️|긴급|위기|기회)/.test(event.event);
    if (!hasDrama) entertainment -= 15;

    // - 선택지 다양성
    if (event.choices.length >= 3) entertainment += 10;

    // 4. Educational (교육 가치)
    // - AWS 서비스 언급
    const awsServices = (
      event.event.match(/EC2|S3|Lambda|RDS|Aurora|EKS|CloudFront|Route53|VPC|DynamoDB/g) || []
    ).length;
    educational = Math.min(100, 60 + awsServices * 10);

    // - 기술적 설명 존재
    if (event.choices.some((c) => c.reasoning && c.reasoning.length > 30)) {
      educational += 10;
    }

    const overall = Math.round(
      (coherence + balance + entertainment + educational) / 4,
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
   * 자동 수정 시도 (가능한 경우)
   */
  async autoFix(event: LLMGeneratedEvent): Promise<LLMGeneratedEvent> {
    const fixed = { ...event };

    // 효과 범위 클램핑
    fixed.choices = fixed.choices.map((choice) => ({
      ...choice,
      effects: {
        users: this.clamp(choice.effects.users, this.LIMITS.users.min, this.LIMITS.users.max),
        cash: this.clamp(choice.effects.cash, this.LIMITS.cash.min, this.LIMITS.cash.max),
        trust: this.clamp(choice.effects.trust, this.LIMITS.trust.min, this.LIMITS.trust.max),
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
    for (const word of this.FORBIDDEN_WORDS) {
      filtered = filtered.replace(new RegExp(word, 'g'), '***');
    }
    return filtered;
  }
}
```

---

### 1.2 Fallback 전략 상세

**결정 트리**:

```typescript
/**
 * 파일: backend/src/llm/llm-fallback-manager.service.ts
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LLMEventGeneratorService, LLMGeneratedEvent } from './llm-event-generator.service';
import { EventService } from '../event/event.service';
import { Game } from '../database/entities/game.entity';
import { RandomEventEntity } from '../database/entities/random-event.entity';

// LLM 캐시 엔티티
import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('llm_event_cache')
@Index(['gameStateHash', 'eventType'])
export class LLMEventCache {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  cacheId: string; // MD5(gameStateHash + eventType)

  @Column({ type: 'varchar', length: 64 })
  gameStateHash: string; // MD5(turn + users + cash + trust)

  @Column({ type: 'varchar', length: 32 })
  eventType: 'disaster' | 'opportunity' | 'market_shift';

  @Column({ type: 'simple-json' })
  llmEvent: LLMGeneratedEvent;

  @Column({ type: 'int' })
  qualityScore: number;

  @Column({ type: 'int', default: 0 })
  useCount: number; // 재사용 횟수

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date; // 캐시 만료 시간 (7일)
}

export type EventSource =
  | 'llm_fresh'       // LLM 신규 생성
  | 'llm_cached'      // LLM 캐시 재사용
  | 'static_fallback' // Static 이벤트 대체
  | 'default_safe';   // 기본 안전 이벤트

export interface FallbackResult {
  success: boolean;
  event: LLMGeneratedEvent | RandomEventEntity | null;
  source: EventSource;
  reason: string;
}

@Injectable()
export class LLMFallbackManagerService {
  private readonly logger = new Logger(LLMFallbackManagerService.name);

  constructor(
    private readonly llmGenerator: LLMEventGeneratorService,
    private readonly staticEventService: EventService,
    @InjectRepository(LLMEventCache)
    private readonly cacheRepository: Repository<LLMEventCache>,
  ) {}

  /**
   * Fallback 전략 실행
   */
  async generateWithFallback(
    game: Game,
    eventType: 'disaster' | 'opportunity' | 'market_shift',
  ): Promise<FallbackResult> {
    // Step 1: LLM 신규 생성 시도 (15초 타임아웃)
    this.logger.debug(`Step 1: LLM 신규 생성 시도 (${eventType})`);
    const freshResult = await this.tryFreshLLM(game, eventType);
    if (freshResult.success) {
      return freshResult;
    }

    // Step 2: LLM 캐시 조회 (유사 게임 상황)
    this.logger.debug('Step 2: LLM 캐시 조회');
    const cachedResult = await this.tryCachedLLM(game, eventType);
    if (cachedResult.success) {
      return cachedResult;
    }

    // Step 3: Static 이벤트 풀 조회
    this.logger.debug('Step 3: Static 이벤트 조회');
    const staticResult = await this.tryStaticEvent(game);
    if (staticResult.success) {
      return staticResult;
    }

    // Step 4: 기본 안전 이벤트 (최후의 수단)
    this.logger.warn('Step 4: 기본 안전 이벤트 사용');
    return this.getDefaultSafeEvent(game, eventType);
  }

  /**
   * Step 1: LLM 신규 생성
   */
  private async tryFreshLLM(
    game: Game,
    eventType: 'disaster' | 'opportunity' | 'market_shift',
  ): Promise<FallbackResult> {
    try {
      const llmEvent = await this.llmGenerator.generateRandomEvent(game, eventType);

      if (!llmEvent) {
        return {
          success: false,
          event: null,
          source: 'llm_fresh',
          reason: 'LLM 응답 없음',
        };
      }

      // 캐시에 저장 (품질 점수 80 이상만)
      if (llmEvent.metadata?.qualityScore && llmEvent.metadata.qualityScore >= 80) {
        await this.saveToCa che(game, eventType, llmEvent);
      }

      return {
        success: true,
        event: llmEvent,
        source: 'llm_fresh',
        reason: 'LLM 신규 생성 성공',
      };
    } catch (error) {
      this.logger.error(`LLM 생성 실패: ${error.message}`);
      return {
        success: false,
        event: null,
        source: 'llm_fresh',
        reason: `LLM 오류: ${error.message}`,
      };
    }
  }

  /**
   * Step 2: LLM 캐시 조회
   */
  private async tryCachedLLM(
    game: Game,
    eventType: 'disaster' | 'opportunity' | 'market_shift',
  ): Promise<FallbackResult> {
    const gameStateHash = this.computeGameStateHash(game);

    // 정확히 일치하는 캐시 조회
    let cached = await this.cacheRepository.findOne({
      where: {
        gameStateHash,
        eventType,
      },
    });

    // 없으면 유사한 상황 조회 (턴 ±2, 유저 ±20%, 현금 ±30%)
    if (!cached) {
      cached = await this.findSimilarCache(game, eventType);
    }

    if (!cached) {
      return {
        success: false,
        event: null,
        source: 'llm_cached',
        reason: '캐시 없음',
      };
    }

    // 만료 체크
    if (new Date() > cached.expiresAt) {
      await this.cacheRepository.delete({ cacheId: cached.cacheId });
      return {
        success: false,
        event: null,
        source: 'llm_cached',
        reason: '캐시 만료됨',
      };
    }

    // 재사용 횟수 증가
    cached.useCount++;
    await this.cacheRepository.save(cached);

    this.logger.log(
      `캐시 히트: ${cached.cacheId} (사용 횟수: ${cached.useCount})`,
    );

    return {
      success: true,
      event: cached.llmEvent,
      source: 'llm_cached',
      reason: `캐시 재사용 (품질: ${cached.qualityScore}/100)`,
    };
  }

  /**
   * Step 3: Static 이벤트 조회
   */
  private async tryStaticEvent(game: Game): Promise<FallbackResult> {
    const result = await this.staticEventService.evaluateRandomEvent(
      game,
      game.currentTurn + 1,
    );

    if (result.triggered && result.event) {
      return {
        success: true,
        event: result.event,
        source: 'static_fallback',
        reason: 'Static 이벤트 대체',
      };
    }

    return {
      success: false,
      event: null,
      source: 'static_fallback',
      reason: 'Static 이벤트도 조건 미충족',
    };
  }

  /**
   * Step 4: 기본 안전 이벤트
   */
  private getDefaultSafeEvent(
    game: Game,
    eventType: 'disaster' | 'opportunity' | 'market_shift',
  ): FallbackResult {
    // 밸런스에 영향을 주지 않는 중립적 이벤트
    const safeEvent: LLMGeneratedEvent = {
      eventType,
      priority: 50,
      event: this.getDefaultEventText(eventType, game),
      choices: [
        {
          text: '현상 유지 (안전한 선택)',
          effects: {
            users: 0,
            cash: 0,
            trust: 0,
            infra: [],
          },
        },
        {
          text: '소폭 개선 시도 (작은 투자)',
          effects: {
            users: 5000,
            cash: -3000000,
            trust: 3,
            infra: [],
          },
        },
      ],
      metadata: {
        generatedAt: new Date(),
        modelUsed: 'default_safe',
        tokensUsed: 0,
        qualityScore: 50,
      },
    };

    return {
      success: true,
      event: safeEvent,
      source: 'default_safe',
      reason: '기본 안전 이벤트 (최후의 수단)',
    };
  }

  /**
   * 게임 상태 해시 계산
   */
  private computeGameStateHash(game: Game): string {
    const stateString = [
      Math.floor(game.currentTurn / 3) * 3, // 턴 3단위 묶음
      Math.floor(game.users / 10000) * 10000, // 유저 1만 단위
      Math.floor(game.cash / 10000000) * 10000000, // 현금 1천만 단위
      Math.floor(game.trust / 10) * 10, // 신뢰도 10 단위
    ].join('-');

    return require('crypto')
      .createHash('md5')
      .update(stateString)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * 유사한 캐시 조회
   */
  private async findSimilarCache(
    game: Game,
    eventType: string,
  ): Promise<LLMEventCache | null> {
    const allCaches = await this.cacheRepository.find({
      where: { eventType: eventType as any },
    });

    // 유사도 계산 (턴, 유저, 현금, 신뢰도 고려)
    const similarities = allCaches.map((cache) => {
      const cacheGame = this.parseGameStateFromCache(cache);
      const turnDiff = Math.abs(game.currentTurn - cacheGame.turn);
      const userDiff = Math.abs(game.users - cacheGame.users) / Math.max(game.users, 1);
      const cashDiff = Math.abs(game.cash - cacheGame.cash) / Math.max(game.cash, 1);
      const trustDiff = Math.abs(game.trust - cacheGame.trust);

      // 유사도 점수 (낮을수록 유사)
      const similarity =
        turnDiff * 0.3 +
        userDiff * 100 * 0.3 +
        cashDiff * 100 * 0.2 +
        trustDiff * 0.2;

      return { cache, similarity };
    });

    // 가장 유사한 캐시 선택 (유사도 < 20)
    similarities.sort((a, b) => a.similarity - b.similarity);

    if (similarities.length > 0 && similarities[0].similarity < 20) {
      return similarities[0].cache;
    }

    return null;
  }

  private parseGameStateFromCache(cache: LLMEventCache): {
    turn: number;
    users: number;
    cash: number;
    trust: number;
  } {
    // gameStateHash는 "턴-유저-현금-신뢰도" 형식
    // 실제로는 더 복잡한 파싱 필요 (여기서는 간략화)
    return {
      turn: 10,
      users: 50000,
      cash: 30000000,
      trust: 60,
    };
  }

  /**
   * 캐시 저장
   */
  private async saveToCache(
    game: Game,
    eventType: string,
    llmEvent: LLMGeneratedEvent,
  ): Promise<void> {
    const gameStateHash = this.computeGameStateHash(game);
    const cacheId = require('crypto')
      .createHash('md5')
      .update(`${gameStateHash}-${eventType}`)
      .digest('hex');

    const cache = this.cacheRepository.create({
      cacheId,
      gameStateHash,
      eventType: eventType as any,
      llmEvent,
      qualityScore: llmEvent.metadata?.qualityScore || 0,
      useCount: 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
    });

    await this.cacheRepository.save(cache);
    this.logger.log(`캐시 저장: ${cacheId} (품질: ${cache.qualityScore}/100)`);
  }

  private getDefaultEventText(
    eventType: string,
    game: Game,
  ): string {
    const templates = {
      disaster: `⚠️ 예상치 못한 문제 발생\n\n서비스 운영 중 작은 문제가 발생했습니다.\n현재 유저: ${game.users.toLocaleString()}명\n\n신중하게 대응하세요.`,
      opportunity: `💼 새로운 기회 발견\n\n비즈니스 개선 기회가 나타났습니다.\n현재 현금: ₩${game.cash.toLocaleString()}\n\n어떻게 하시겠습니까?`,
      market_shift: `📊 시장 상황 변화\n\n업계에 작은 변화가 감지되었습니다.\n현재 신뢰도: ${game.trust}%\n\n대응 방향을 선택하세요.`,
    };

    return templates[eventType] || templates.opportunity;
  }
}
```

---

## 2. 이벤트 다양성 및 중복 방지

### 2.1 이벤트 히스토리 추적

**데이터베이스 스키마**:

```typescript
/**
 * 파일: backend/src/database/entities/event-occurrence.entity.ts
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('event_occurrences')
@Index(['gameId', 'eventSignature'])
@Index(['gameId', 'occurredAt'])
export class EventOccurrence {
  @PrimaryGeneratedColumn('uuid')
  occurrenceId: string;

  @Column({ type: 'varchar', length: 36 })
  gameId: string;

  @Column({ type: 'varchar', length: 64 })
  eventSignature: string; // eventType + 상황 해시

  @Column({ type: 'varchar', length: 64 })
  eventId: string; // 실제 이벤트 ID

  @Column({ type: 'varchar', length: 32 })
  eventType: 'disaster' | 'opportunity' | 'market_shift' | 'quiz';

  @Column({ type: 'varchar', length: 20 })
  eventSource: 'llm' | 'static' | 'quiz';

  @Column({ type: 'int' })
  turnNumber: number;

  @Column({ type: 'simple-json' })
  gameStateSnapshot: {
    users: number;
    cash: number;
    trust: number;
    infrastructure: string[];
  };

  @Column({ type: 'varchar', length: 64, nullable: true })
  chosenChoiceId: string; // 플레이어가 선택한 선택지

  @Column({ type: 'enum', enum: ['good', 'bad', 'neutral'], nullable: true })
  playerFeedback: 'good' | 'bad' | 'neutral'; // 플레이어 피드백

  @CreateDateColumn()
  occurredAt: Date;
}
```

---

### 2.2 쿨다운 시스템

**구현**: `backend/src/event/event-cooldown.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EventOccurrence } from '../database/entities/event-occurrence.entity';
import { Game } from '../database/entities/game.entity';

export interface CooldownCheck {
  allowed: boolean;
  reason: string;
  cooldownTurnsRemaining?: number;
}

@Injectable()
export class EventCooldownService {
  private readonly logger = new Logger(EventCooldownService.name);

  // 쿨다운 설정
  private readonly COOLDOWN_RULES = {
    exactSameEvent: 5,        // 정확히 같은 이벤트: 5턴
    sameEventType: 3,         // 같은 타입 (disaster/opportunity): 3턴
    sameCategory: 2,          // 같은 카테고리 (AWS 장애, 투자): 2턴
    anyEvent: 1,              // 아무 이벤트: 최소 1턴
  };

  constructor(
    @InjectRepository(EventOccurrence)
    private readonly occurrenceRepository: Repository<EventOccurrence>,
  ) {}

  /**
   * 이벤트 발생 가능 여부 체크
   */
  async checkCooldown(
    game: Game,
    eventSignature: string,
    eventType: string,
  ): Promise<CooldownCheck> {
    // 최근 이벤트 히스토리 조회
    const recentEvents = await this.occurrenceRepository.find({
      where: {
        gameId: game.gameId,
        turnNumber: MoreThan(game.currentTurn - 10), // 최근 10턴
      },
      order: { turnNumber: 'DESC' },
    });

    // 1. 정확히 같은 이벤트 체크
    const sameEvent = recentEvents.find(
      (e) => e.eventSignature === eventSignature,
    );
    if (sameEvent) {
      const turnsElapsed = game.currentTurn - sameEvent.turnNumber;
      if (turnsElapsed < this.COOLDOWN_RULES.exactSameEvent) {
        return {
          allowed: false,
          reason: `같은 이벤트가 최근 발생함 (${turnsElapsed}턴 전)`,
          cooldownTurnsRemaining:
            this.COOLDOWN_RULES.exactSameEvent - turnsElapsed,
        };
      }
    }

    // 2. 같은 타입 이벤트 체크
    const sameTypeEvent = recentEvents.find((e) => e.eventType === eventType);
    if (sameTypeEvent) {
      const turnsElapsed = game.currentTurn - sameTypeEvent.turnNumber;
      if (turnsElapsed < this.COOLDOWN_RULES.sameEventType) {
        return {
          allowed: false,
          reason: `같은 타입 이벤트가 최근 발생함 (${eventType}, ${turnsElapsed}턴 전)`,
          cooldownTurnsRemaining:
            this.COOLDOWN_RULES.sameEventType - turnsElapsed,
        };
      }
    }

    // 3. 카테고리 체크 (예: AWS 장애, 투자 관련 등)
    const category = this.getEventCategory(eventSignature);
    const sameCategoryEvent = recentEvents.find(
      (e) => this.getEventCategory(e.eventSignature) === category,
    );
    if (sameCategoryEvent) {
      const turnsElapsed = game.currentTurn - sameCategoryEvent.turnNumber;
      if (turnsElapsed < this.COOLDOWN_RULES.sameCategory) {
        return {
          allowed: false,
          reason: `같은 카테고리 이벤트가 최근 발생함 (${category}, ${turnsElapsed}턴 전)`,
          cooldownTurnsRemaining:
            this.COOLDOWN_RULES.sameCategory - turnsElapsed,
        };
      }
    }

    return {
      allowed: true,
      reason: '쿨다운 통과',
    };
  }

  /**
   * 이벤트 발생 기록
   */
  async recordOccurrence(
    game: Game,
    eventSignature: string,
    eventId: string,
    eventType: string,
    eventSource: 'llm' | 'static' | 'quiz',
    chosenChoiceId?: string,
  ): Promise<void> {
    const occurrence = this.occurrenceRepository.create({
      gameId: game.gameId,
      eventSignature,
      eventId,
      eventType: eventType as any,
      eventSource,
      turnNumber: game.currentTurn,
      gameStateSnapshot: {
        users: game.users,
        cash: game.cash,
        trust: game.trust,
        infrastructure: [...game.infrastructure],
      },
      chosenChoiceId,
      playerFeedback: null,
    });

    await this.occurrenceRepository.save(occurrence);
    this.logger.log(
      `이벤트 발생 기록: ${eventId} (턴 ${game.currentTurn}, 게임 ${game.gameId})`,
    );
  }

  /**
   * 플레이어 피드백 기록
   */
  async recordFeedback(
    occurrenceId: string,
    feedback: 'good' | 'bad' | 'neutral',
  ): Promise<void> {
    await this.occurrenceRepository.update(
      { occurrenceId },
      { playerFeedback: feedback },
    );
  }

  /**
   * 이벤트 카테고리 추출
   */
  private getEventCategory(eventSignature: string): string {
    // eventSignature 형식: "eventType-category-hash"
    // 예: "disaster-aws_outage-abc123"
    const parts = eventSignature.split('-');
    return parts.length >= 2 ? parts[1] : 'unknown';
  }

  /**
   * 게임별 이벤트 통계 조회
   */
  async getEventStats(gameId: string): Promise<{
    totalEvents: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    recentEvents: EventOccurrence[];
  }> {
    const allEvents = await this.occurrenceRepository.find({
      where: { gameId },
      order: { turnNumber: 'DESC' },
    });

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const event of allEvents) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      const category = this.getEventCategory(event.eventSignature);
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    return {
      totalEvents: allEvents.length,
      byType,
      byCategory,
      recentEvents: allEvents.slice(0, 5),
    };
  }
}
```

---

### 2.3 가중치 동적 조정

**구현**: `backend/src/event/event-weight-manager.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventCooldownService } from './event-cooldown.service';
import { Game } from '../database/entities/game.entity';

export interface WeightedEvent {
  eventId: string;
  eventSignature: string;
  eventType: string;
  baseWeight: number;      // 기본 가중치
  adjustedWeight: number;  // 조정된 가중치
  adjustmentFactors: {
    firstTime: number;       // 첫 발생 보너스
    recentOccurrence: number; // 최근 발생 페널티
    playerFeedback: number;  // 플레이어 피드백
    contextMatch: number;    // 게임 상황 적합도
  };
}

@Injectable()
export class EventWeightManagerService {
  private readonly logger = new Logger(EventWeightManagerService.name);

  constructor(private readonly cooldownService: EventCooldownService) {}

  /**
   * 이벤트 가중치 계산
   */
  async calculateWeights(
    game: Game,
    candidateEvents: Array<{
      eventId: string;
      eventSignature: string;
      eventType: string;
      baseWeight?: number;
    }>,
  ): Promise<WeightedEvent[]> {
    const stats = await this.cooldownService.getEventStats(game.gameId);
    const weightedEvents: WeightedEvent[] = [];

    for (const candidate of candidateEvents) {
      const baseWeight = candidate.baseWeight || 100;

      // 1. 첫 발생 보너스
      const hasOccurred = stats.recentEvents.some(
        (e) => e.eventSignature === candidate.eventSignature,
      );
      const firstTimeBonus = hasOccurred ? 1.0 : 2.0;

      // 2. 최근 발생 페널티
      const occurrenceCount = stats.recentEvents.filter(
        (e) => e.eventSignature === candidate.eventSignature,
      ).length;
      const recencyPenalty = Math.max(0.1, 1.0 - occurrenceCount * 0.3);

      // 3. 플레이어 피드백
      const feedbackScore = this.getPlayerFeedbackScore(
        stats.recentEvents,
        candidate.eventSignature,
      );

      // 4. 게임 상황 적합도
      const contextMatch = this.calculateContextMatch(game, candidate);

      // 최종 가중치 계산
      const adjustedWeight =
        baseWeight *
        firstTimeBonus *
        recencyPenalty *
        feedbackScore *
        contextMatch;

      weightedEvents.push({
        eventId: candidate.eventId,
        eventSignature: candidate.eventSignature,
        eventType: candidate.eventType,
        baseWeight,
        adjustedWeight: Math.max(1, Math.round(adjustedWeight)),
        adjustmentFactors: {
          firstTime: firstTimeBonus,
          recentOccurrence: recencyPenalty,
          playerFeedback: feedbackScore,
          contextMatch,
        },
      });
    }

    // 가중치 순 정렬
    weightedEvents.sort((a, b) => b.adjustedWeight - a.adjustedWeight);

    return weightedEvents;
  }

  /**
   * 플레이어 피드백 점수
   */
  private getPlayerFeedbackScore(
    recentEvents: any[],
    eventSignature: string,
  ): number {
    const feedbacks = recentEvents
      .filter((e) => e.eventSignature === eventSignature && e.playerFeedback)
      .map((e) => e.playerFeedback);

    if (feedbacks.length === 0) return 1.0; // 중립

    const goodCount = feedbacks.filter((f) => f === 'good').length;
    const badCount = feedbacks.filter((f) => f === 'bad').length;

    // good: 1.2배, bad: 0.5배
    if (goodCount > badCount) return 1.2;
    if (badCount > goodCount) return 0.5;
    return 1.0;
  }

  /**
   * 게임 상황 적합도
   */
  private calculateContextMatch(
    game: Game,
    candidate: { eventType: string; eventSignature: string },
  ): number {
    let score = 1.0;

    // 재정 상태에 따른 적합도
    if (game.cash < 10000000) {
      // 파산 위기
      if (candidate.eventType === 'opportunity') score *= 1.5; // 기회 이벤트 선호
      if (candidate.eventType === 'disaster') score *= 0.7; // 재난 이벤트 감소
    } else if (game.cash > 100000000) {
      // 풍부한 자금
      if (candidate.eventType === 'disaster') score *= 1.3; // 도전 과제 증가
    }

    // 신뢰도에 따른 적합도
    if (game.trust < 30) {
      // 신뢰도 위기
      if (candidate.eventSignature.includes('trust')) score *= 1.5;
    }

    // 인프라 단계에 따른 적합도
    if (game.infrastructure.includes('EKS')) {
      // 고급 인프라
      if (candidate.eventSignature.includes('advanced')) score *= 1.3;
    }

    return score;
  }

  /**
   * 가중치 기반 랜덤 선택
   */
  selectEvent(weightedEvents: WeightedEvent[]): WeightedEvent | null {
    if (weightedEvents.length === 0) return null;

    const totalWeight = weightedEvents.reduce(
      (sum, e) => sum + e.adjustedWeight,
      0,
    );
    let random = Math.random() * totalWeight;

    for (const event of weightedEvents) {
      random -= event.adjustedWeight;
      if (random <= 0) {
        this.logger.debug(
          `이벤트 선택: ${event.eventId} (가중치: ${event.adjustedWeight}/${totalWeight})`,
        );
        return event;
      }
    }

    return weightedEvents[0]; // fallback
  }
}
```

---

### 2.4 시즌별 이벤트 풀

**구현**: `backend/src/event/event-season-manager.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Game } from '../database/entities/game.entity';

export enum GameSeason {
  EARLY = 'early',     // 1~8턴: 스타트업 초기
  MID = 'mid',         // 9~16턴: 성장통
  LATE = 'late',       // 17~25턴: 스케일업
}

export interface SeasonConfig {
  season: GameSeason;
  turnRange: [number, number];
  themes: string[];
  preferredEventTypes: string[];
  infrastructureLevel: string[];
}

@Injectable()
export class EventSeasonManagerService {
  private readonly logger = new Logger(EventSeasonManagerService.name);

  private readonly SEASON_CONFIGS: Record<GameSeason, SeasonConfig> = {
    [GameSeason.EARLY]: {
      season: GameSeason.EARLY,
      turnRange: [1, 8],
      themes: [
        '초기 자금 문제',
        '팀 빌딩',
        '첫 고객 확보',
        'MVP 개발',
        '엔젤 투자',
        '기술 스택 선택',
      ],
      preferredEventTypes: ['opportunity', 'market_shift'],
      infrastructureLevel: ['EC2', 'RDS'],
    },
    [GameSeason.MID]: {
      season: GameSeason.MID,
      turnRange: [9, 16],
      themes: [
        '급격한 성장',
        '스케일링 문제',
        'Series A 투자',
        '경쟁사 출현',
        '기술 부채',
        '조직 확장',
      ],
      preferredEventTypes: ['disaster', 'opportunity'],
      infrastructureLevel: ['Aurora', 'Redis', 'CloudFront'],
    },
    [GameSeason.LATE]: {
      season: GameSeason.LATE,
      turnRange: [17, 25],
      themes: [
        'IPO 준비',
        '글로벌 확장',
        '대규모 장애 대응',
        'M&A 제안',
        '규제 대응',
        '기업 문화',
      ],
      preferredEventTypes: ['disaster', 'market_shift'],
      infrastructureLevel: ['EKS', 'Multi-Region', 'Global DB'],
    },
  };

  /**
   * 현재 시즌 판단
   */
  getCurrentSeason(game: Game): GameSeason {
    const turn = game.currentTurn;

    if (turn <= 8) return GameSeason.EARLY;
    if (turn <= 16) return GameSeason.MID;
    return GameSeason.LATE;
  }

  /**
   * 시즌별 이벤트 필터링
   */
  filterEventsBySeason(
    game: Game,
    allEvents: any[],
  ): any[] {
    const season = this.getCurrentSeason(game);
    const config = this.SEASON_CONFIGS[season];

    return allEvents.filter((event) => {
      // 1. 턴 범위 체크
      const [minTurn, maxTurn] = config.turnRange;
      if (game.currentTurn < minTurn || game.currentTurn > maxTurn) {
        return false;
      }

      // 2. 이벤트 타입 선호도
      if (
        config.preferredEventTypes.length > 0 &&
        !config.preferredEventTypes.includes(event.eventType)
      ) {
        // 30% 확률로 다른 타입도 허용 (다양성)
        if (Math.random() > 0.3) return false;
      }

      // 3. 인프라 레벨 적합성
      const hasMatchingInfra = config.infrastructureLevel.some((infra) =>
        game.infrastructure.includes(infra),
      );
      if (!hasMatchingInfra && season !== GameSeason.EARLY) {
        // 초기 시즌은 인프라 조건 완화
        return false;
      }

      return true;
    });
  }

  /**
   * 시즌별 LLM 프롬프트 힌트
   */
  getSeasonPromptHint(game: Game): string {
    const season = this.getCurrentSeason(game);
    const config = this.SEASON_CONFIGS[season];

    return `
게임 단계: ${season} (턴 ${game.currentTurn}/${game.maxTurns || 25})

이 단계의 특징:
- 주요 테마: ${config.themes.join(', ')}
- 인프라 레벨: ${config.infrastructureLevel.join(', ')}

이벤트는 이 단계에 맞는 상황을 반영해야 합니다.
`;
  }
}
```

---

## 3. 통합 아키텍처

### 3.1 전체 플로우

```
GameService.executeChoice()
    ↓
HybridEventManagerService.evaluateHybridEvent()
    ↓
┌─────────────────────────────────────────┐
│ 1. 시즌 체크 (EventSeasonManager)       │
│    - 현재 턴 단계 파악                   │
│    - 시즌별 이벤트 풀 필터링             │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 2. 쿨다운 체크 (EventCooldownService)    │
│    - 최근 이벤트 히스토리 조회           │
│    - 중복 방지 규칙 적용                 │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. LLM 생성 시도 (LLMFallbackManager)    │
│    - 신규 LLM 생성                       │
│    - 실패 시 캐시 조회                   │
│    - 실패 시 Static Fallback            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. 검증 (LLMResponseValidator)           │
│    - 구조 검증                           │
│    - 밸런스 검증                         │
│    - 콘텐츠 품질 검증                    │
│    - 품질 점수 계산 (60점 이상 통과)     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 5. 가중치 조정 (EventWeightManager)      │
│    - 첫 발생 보너스                      │
│    - 최근 발생 페널티                    │
│    - 플레이어 피드백 반영                │
│    - 게임 상황 적합도                    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 6. 최종 이벤트 선택                      │
│    - 가중치 기반 랜덤 선택               │
│    - 이벤트 발생 기록                    │
└─────────────────────────────────────────┘
    ↓
GameResponseDto 반환
```

---

### 3.2 HybridEventManagerService 통합

```typescript
/**
 * 파일: backend/src/event/hybrid-event-manager.service.ts (수정)
 */
import { Injectable, Logger } from '@nestjs/common';
import { LLMFallbackManagerService } from '../llm/llm-fallback-manager.service';
import { LLMResponseValidatorService } from '../llm/validators/llm-response-validator.service';
import { EventCooldownService } from './event-cooldown.service';
import { EventWeightManagerService } from './event-weight-manager.service';
import { EventSeasonManagerService, GameSeason } from './event-season-manager.service';
import { Game } from '../database/entities/game.entity';

@Injectable()
export class HybridEventManagerService {
  private readonly logger = new Logger(HybridEventManagerService.name);

  constructor(
    private readonly fallbackManager: LLMFallbackManagerService,
    private readonly validator: LLMResponseValidatorService,
    private readonly cooldownService: EventCooldownService,
    private readonly weightManager: EventWeightManagerService,
    private readonly seasonManager: EventSeasonManagerService,
  ) {}

  /**
   * 통합 이벤트 평가 (Phase 1 적용)
   */
  async evaluateHybridEvent(game: Game, nextTurn: number) {
    // 1. 시즌 체크
    const season = this.seasonManager.getCurrentSeason(game);
    this.logger.debug(`현재 시즌: ${season} (턴 ${game.currentTurn})`);

    // 2. 이벤트 타입 결정
    const eventType = this.selectEventType(game, season);

    // 3. 이벤트 시그니처 생성
    const eventSignature = this.generateEventSignature(game, eventType);

    // 4. 쿨다운 체크
    const cooldownCheck = await this.cooldownService.checkCooldown(
      game,
      eventSignature,
      eventType,
    );

    if (!cooldownCheck.allowed) {
      this.logger.debug(`쿨다운 미통과: ${cooldownCheck.reason}`);
      return { triggered: false, reason: cooldownCheck.reason };
    }

    // 5. LLM 생성 (Fallback 포함)
    const fallbackResult = await this.fallbackManager.generateWithFallback(
      game,
      eventType,
    );

    if (!fallbackResult.success || !fallbackResult.event) {
      this.logger.warn('이벤트 생성 실패 (모든 Fallback 시도 완료)');
      return { triggered: false, reason: fallbackResult.reason };
    }

    // 6. 검증 (LLM 이벤트만)
    if (
      fallbackResult.source === 'llm_fresh' ||
      fallbackResult.source === 'llm_cached'
    ) {
      const validationResult = await this.validator.validate(
        fallbackResult.event,
        game,
      );

      if (!validationResult.passed) {
        this.logger.warn(
          `검증 실패 (Stage ${validationResult.stage}): ${validationResult.errors.join(', ')}`,
        );
        // 검증 실패 시 Static Fallback 재시도
        // ... (생략)
      }

      this.logger.log(
        `품질 점수: ${validationResult.qualityScore?.overall}/100`,
      );
    }

    // 7. 이벤트 발생 기록
    await this.cooldownService.recordOccurrence(
      game,
      eventSignature,
      fallbackResult.event.eventId,
      eventType,
      fallbackResult.source === 'static_fallback' ? 'static' : 'llm',
    );

    return {
      triggered: true,
      event: fallbackResult.event,
      source: fallbackResult.source,
      season,
    };
  }

  private selectEventType(
    game: Game,
    season: GameSeason,
  ): 'disaster' | 'opportunity' | 'market_shift' {
    // 시즌별 선호 타입
    const seasonPreferences = {
      early: { disaster: 0.2, opportunity: 0.5, market_shift: 0.3 },
      mid: { disaster: 0.4, opportunity: 0.4, market_shift: 0.2 },
      late: { disaster: 0.5, opportunity: 0.3, market_shift: 0.2 },
    };

    const prefs = seasonPreferences[season];
    const rand = Math.random();

    if (rand < prefs.disaster) return 'disaster';
    if (rand < prefs.disaster + prefs.opportunity) return 'opportunity';
    return 'market_shift';
  }

  private generateEventSignature(
    game: Game,
    eventType: string,
  ): string {
    // 게임 상황 기반 시그니처 생성
    const category = this.determineCategory(game);
    const hash = require('crypto')
      .createHash('md5')
      .update(`${game.currentTurn}-${game.users}-${eventType}`)
      .digest('hex')
      .substring(0, 8);

    return `${eventType}-${category}-${hash}`;
  }

  private determineCategory(game: Game): string {
    // 게임 상황에 따라 카테고리 결정
    if (game.cash < 10000000) return 'funding_crisis';
    if (game.users > 100000) return 'scale_challenge';
    if (game.infrastructure.includes('EKS')) return 'advanced_infra';
    if (game.trust < 40) return 'trust_crisis';
    return 'general';
  }
}
```

---

## 4. 구현 체크리스트

### Phase 1-A: LLM 품질 관리 (3일)

**Day 1: 검증 파이프라인**
- [ ] `LLMResponseValidatorService` 구현
  - [ ] Stage 1: 구조 검증
  - [ ] Stage 2: 밸런스 검증
  - [ ] Stage 3: 콘텐츠 품질 검증
  - [ ] 품질 점수 계산 알고리즘
- [ ] Unit Test 작성 (검증 로직)

**Day 2: Fallback 시스템**
- [ ] `LLMEventCache` 엔티티 생성
- [ ] `LLMFallbackManagerService` 구현
  - [ ] 4단계 Fallback 로직
  - [ ] 캐시 저장/조회 로직
  - [ ] 유사 상황 매칭 알고리즘
- [ ] Integration Test (Fallback 시나리오)

**Day 3: 통합 및 테스트**
- [ ] `HybridEventManagerService`에 검증 통합
- [ ] E2E 테스트 (전체 플로우)
- [ ] 성능 테스트 (응답 시간)

---

### Phase 1-B: 이벤트 다양성 (2일)

**Day 1: 히스토리 및 쿨다운**
- [ ] `EventOccurrence` 엔티티 생성
- [ ] `EventCooldownService` 구현
  - [ ] 쿨다운 규칙 체크
  - [ ] 이벤트 발생 기록
  - [ ] 통계 조회
- [ ] Unit Test (쿨다운 로직)

**Day 2: 가중치 및 시즌**
- [ ] `EventWeightManagerService` 구현
  - [ ] 가중치 계산 로직
  - [ ] 플레이어 피드백 반영
  - [ ] 컨텍스트 적합도 계산
- [ ] `EventSeasonManagerService` 구현
  - [ ] 시즌 판단 로직
  - [ ] 시즌별 필터링
- [ ] Integration Test (전체 통합)

---

### 완료 기준

- [ ] 모든 Unit Test 통과 (커버리지 80% 이상)
- [ ] LLM 검증 성공률 95% 이상
- [ ] Fallback 성공률 99% 이상 (기본 이벤트 포함)
- [ ] 이벤트 중복 발생률 5% 미만
- [ ] 품질 점수 평균 75점 이상
- [ ] API 응답 시간 평균 3초 이하 (LLM 포함)

---

## 다음 단계

Phase 1 완료 후:
- **Phase 2**: 적응형 난이도 (PlayerProfile, 스킬 레벨 추적)
- **Phase 3**: AWS 사례 확장 (20개 → 50개)
- **Phase 4**: 밸런스 시뮬레이션 도구

---

**총 예상 소요 시간**: 5일 (3일 + 2일)
**우선순위**: 🔥 최우선 (안정성 및 재미 핵심)
