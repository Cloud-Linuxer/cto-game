# LLM 기반 동적 이벤트 시스템 설계

## 개요

로컬 LLM (gpt-oss-20b)을 활용하여 **게임 상황에 맞는 창의적이고 개인화된 이벤트**를 실시간 생성하는 시스템.

### 핵심 가치

- **동적 스토리텔링**: 플레이어의 선택 히스토리를 반영한 맞춤형 이벤트
- **창의적 판정**: 미리 정의되지 않은 상황에 대한 자연스러운 대응
- **적응형 난이도**: 플레이어 실력에 따라 이벤트 난이도 자동 조정
- **무한한 변주**: 같은 상황도 매번 다른 텍스트로 경험

### 하이브리드 전략

```
┌─────────────────────────────────────────────────────┐
│ Event Decision Layer                                 │
│                                                       │
│  ┌──────────────┐         ┌──────────────┐          │
│  │ Static Pool  │         │ LLM Generator│          │
│  │ (기존 시스템)│         │ (새로운 시스템)│          │
│  │              │         │              │          │
│  │ • 빠름 (0ms) │         │ • 창의적     │          │
│  │ • 안정적     │         │ • 개인화     │          │
│  │ • 밸런스 보장│         │ • 느림(2~5s) │          │
│  └──────┬───────┘         └──────┬───────┘          │
│         │                        │                   │
│         └────────┬───────────────┘                   │
│                  │                                    │
│         ┌────────▼────────┐                          │
│         │ Smart Selector  │                          │
│         │                 │                          │
│         │ 규칙 기반 라우팅  │                          │
│         └─────────────────┘                          │
└─────────────────────────────────────────────────────┘
```

**라우팅 규칙**:
1. **중요 이벤트** (파산 위기, IPO 직전) → Static Pool (밸런스 보장)
2. **일반 랜덤 이벤트** → LLM Generator (창의성 우선)
3. **LLM 실패 시** → Static Pool Fallback (안정성)

---

## 아키텍처

### 1. LLM 통신 레이어

**파일**: `backend/src/llm/llm-client.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface LLMResponse {
  text: string;
  finishReason: 'stop' | 'length' | 'error';
  tokensUsed: number;
}

@Injectable()
export class LLMClientService {
  private readonly logger = new Logger(LLMClientService.name);
  private client: AxiosInstance;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const llmHost = this.configService.get<string>('LLM_HOST', 'http://localhost:8080');
    const llmEnabled = this.configService.get<boolean>('LLM_ENABLED', true);

    this.enabled = llmEnabled;
    this.client = axios.create({
      baseURL: llmHost,
      timeout: 15000, // 15초 타임아웃
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`LLM 클라이언트 초기화: ${llmHost} (활성화: ${llmEnabled})`);
  }

  /**
   * LLM 텍스트 생성 (OpenAI 호환 API)
   */
  async generate(request: LLMRequest): Promise<LLMResponse | null> {
    if (!this.enabled) {
      this.logger.warn('LLM이 비활성화되어 있습니다');
      return null;
    }

    const startTime = Date.now();

    try {
      const response = await this.client.post('/v1/completions', {
        model: 'gpt-oss-20b', // 로컬 모델명
        prompt: request.prompt,
        max_tokens: request.maxTokens || 500,
        temperature: request.temperature || 0.8,
        stop: request.stopSequences || ['###', '\n\n\n'],
        n: 1,
      });

      const elapsedMs = Date.now() - startTime;
      const choice = response.data.choices[0];

      this.logger.debug(`LLM 응답 성공 (${elapsedMs}ms, ${choice.usage?.total_tokens || 0} tokens)`);

      return {
        text: choice.text.trim(),
        finishReason: choice.finish_reason === 'stop' ? 'stop' : choice.finish_reason === 'length' ? 'length' : 'error',
        tokensUsed: choice.usage?.total_tokens || 0,
      };
    } catch (error) {
      const elapsedMs = Date.now() - startTime;
      this.logger.error(`LLM 호출 실패 (${elapsedMs}ms): ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 건강 체크
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.client.get('/health', { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`LLM 서버 건강 체크 실패: ${error.message}`);
      return false;
    }
  }
}
```

---

### 2. 프롬프트 엔지니어링

**파일**: `backend/src/llm/prompts/event-generator.prompts.ts`

```typescript
import { Game } from '../../database/entities/game.entity';
import { ChoiceHistory } from '../../database/entities/choice-history.entity';

export interface GameContext {
  game: Game;
  recentChoices: ChoiceHistory[];
  eventHistory: string[];
}

/**
 * 이벤트 생성 프롬프트 빌더
 */
export class EventGeneratorPrompts {
  /**
   * 시스템 프롬프트 (게임 세계관 설명)
   */
  static getSystemPrompt(): string {
    return `당신은 "AWS 스타트업 타이쿤" 게임의 이벤트 생성 AI입니다.

게임 설정:
- 플레이어는 스타트업 CTO로서 비즈니스와 인프라 결정을 내립니다
- 목표: IPO 성공 (100K+ 유저, 300M+ 매출, 99+ 신뢰도)
- 실패 조건: 파산(현금 < 0), 장애(신뢰도 < 20), 턴 소진

게임 분위기:
- 한국어로 작성, 구어체 사용
- 현실적이면서도 드라마틱한 상황 연출
- AWS/클라우드 용어를 자연스럽게 활용
- 긴장감과 선택의 무게감 강조

이벤트 타입:
- disaster: 갑작스런 위기 (장애, 보안사고, 경쟁사 공격)
- opportunity: 예상치 못한 기회 (투자 제안, 제휴, 인재 영입)
- market_shift: 시장 변화 (규제, 트렌드, 경제 상황)

당신의 역할:
플레이어의 현재 상황을 분석하고, 게임 진행에 영향을 주는 창의적인 이벤트와 선택지를 생성하세요.`;
  }

  /**
   * 게임 상황 요약
   */
  static summarizeGameState(context: GameContext): string {
    const { game, recentChoices, eventHistory } = context;

    // 인프라 단계 판단
    let infraStage = 'MVP';
    if (game.infrastructure.includes('EKS')) infraStage = 'Scale-up';
    else if (game.infrastructure.includes('Aurora')) infraStage = 'Growth';

    // 재정 상태
    let financialHealth = '안정';
    if (game.cash < 5000000) financialHealth = '위험';
    else if (game.cash < 20000000) financialHealth = '불안';
    else if (game.cash > 100000000) financialHealth = '풍부';

    // 최근 선택 요약
    const recentDecisions = recentChoices
      .slice(-3)
      .map((ch) => `턴${ch.turnNumber}: 선택${ch.choiceId}`)
      .join(', ');

    return `현재 게임 상태:
- 턴: ${game.currentTurn}/${game.maxTurns || 25}
- 유저: ${game.users.toLocaleString()}명
- 현금: ₩${game.cash.toLocaleString()}
- 신뢰도: ${game.trust}%
- 인프라 단계: ${infraStage}
- 인프라 스택: ${game.infrastructure.join(', ')}
- 재정 상태: ${financialHealth}
- 난이도: ${game.difficultyMode || 'NORMAL'}
- 최근 선택: ${recentDecisions || '없음'}
- 이전 이벤트: ${eventHistory.join(', ') || '없음'}`;
  }

  /**
   * 재난 이벤트 생성 프롬프트
   */
  static generateDisasterPrompt(context: GameContext): string {
    return `${this.getSystemPrompt()}

${this.summarizeGameState(context)}

**요청**: 플레이어에게 발생할 재난(disaster) 이벤트를 생성하세요.

조건:
1. 현재 게임 상황(유저 수, 인프라, 재정)을 고려한 현실적인 위기
2. AWS/클라우드 관련 기술적 문제 또는 비즈니스 위기
3. 플레이어가 실제로 고민할 만한 2개의 선택지 제시
4. 각 선택지는 trade-off가 명확해야 함

출력 형식 (JSON):
\`\`\`json
{
  "eventType": "disaster",
  "priority": 85,
  "event": "🚨 이벤트 제목\\n\\n상황 설명 (2-3문장)\\n\\n현재 영향 또는 위험 요소",
  "choices": [
    {
      "text": "선택지 1 설명 (비용과 효과 명시)",
      "effects": {
        "users": 0,
        "cash": -50000000,
        "trust": 10,
        "infra": ["multi-region"]
      },
      "reasoning": "이 선택의 장단점 설명"
    },
    {
      "text": "선택지 2 설명 (비용과 효과 명시)",
      "effects": {
        "users": -30000,
        "cash": 0,
        "trust": -40,
        "infra": []
      },
      "reasoning": "이 선택의 장단점 설명"
    }
  ]
}
\`\`\`

이벤트를 생성하세요:`;
  }

  /**
   * 기회 이벤트 생성 프롬프트
   */
  static generateOpportunityPrompt(context: GameContext): string {
    return `${this.getSystemPrompt()}

${this.summarizeGameState(context)}

**요청**: 플레이어에게 발생할 기회(opportunity) 이벤트를 생성하세요.

조건:
1. 현재 상황에서 얻을 수 있는 예상치 못한 기회
2. 투자, 제휴, 인재, 기술 관련 긍정적 제안
3. 선택지는 "수락(리스크 있음)" vs "거절(안전)" 구조
4. 수락 시 단기 이득 vs 장기 리스크 trade-off

출력 형식 (JSON):
\`\`\`json
{
  "eventType": "opportunity",
  "priority": 75,
  "event": "💼 이벤트 제목\\n\\n기회 설명 (2-3문장)\\n\\n제안 내용 또는 조건",
  "choices": [
    {
      "text": "수락 - 구체적인 조건 명시",
      "effects": {
        "users": 50000,
        "cash": -20000000,
        "trust": -10,
        "infra": ["premium-tier"]
      },
      "reasoning": "수락 시 기대 효과와 리스크"
    },
    {
      "text": "거절 - 안전한 선택의 이유",
      "effects": {
        "users": 0,
        "cash": 5000000,
        "trust": 5,
        "infra": []
      },
      "reasoning": "거절 시 현상 유지 효과"
    }
  ]
}
\`\`\`

이벤트를 생성하세요:`;
  }

  /**
   * 시장 변화 이벤트 생성 프롬프트
   */
  static generateMarketShiftPrompt(context: GameContext): string {
    return `${this.getSystemPrompt()}

${this.summarizeGameState(context)}

**요청**: 플레이어에게 영향을 줄 시장 변화(market_shift) 이벤트를 생성하세요.

조건:
1. 규제 변화, 트렌드 전환, 경제 상황 등 외부 환경 변화
2. 플레이어가 대응 방식을 선택해야 하는 상황
3. "적극 대응" vs "보수적 대응" 또는 "선제 대응" vs "관망" 구조
4. 장기적 영향을 고려한 선택지

출력 형식 (JSON):
\`\`\`json
{
  "eventType": "market_shift",
  "priority": 70,
  "event": "📈 이벤트 제목\\n\\n시장 변화 설명 (2-3문장)\\n\\n예상 영향",
  "choices": [
    {
      "text": "적극 대응 - 투자 및 변화 수용",
      "effects": {
        "users": 80000,
        "cash": -40000000,
        "trust": 15,
        "infra": ["new-tech"]
      },
      "reasoning": "선제 대응의 장점과 비용"
    },
    {
      "text": "보수적 대응 - 관망 후 결정",
      "effects": {
        "users": 10000,
        "cash": -5000000,
        "trust": 0,
        "infra": []
      },
      "reasoning": "신중한 접근의 안정성"
    }
  ]
}
\`\`\`

이벤트를 생성하세요:`;
  }
}
```

---

### 3. LLM 이벤트 생성 서비스

**파일**: `backend/src/llm/llm-event-generator.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { LLMClientService } from './llm-client.service';
import { EventGeneratorPrompts, GameContext } from './prompts/event-generator.prompts';
import { Game } from '../database/entities/game.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface LLMGeneratedEvent {
  eventType: 'disaster' | 'opportunity' | 'market_shift';
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
  };
}

@Injectable()
export class LLMEventGeneratorService {
  private readonly logger = new Logger(LLMEventGeneratorService.name);

  constructor(
    private readonly llmClient: LLMClientService,
    @InjectRepository(ChoiceHistory)
    private readonly historyRepository: Repository<ChoiceHistory>,
  ) {}

  /**
   * 게임 컨텍스트 수집
   */
  private async collectGameContext(game: Game): Promise<GameContext> {
    const recentChoices = await this.historyRepository.find({
      where: { gameId: game.gameId },
      order: { turnNumber: 'DESC' },
      take: 5,
    });

    // TODO: EventHistory에서 이전 이벤트 목록 가져오기
    const eventHistory: string[] = [];

    return {
      game,
      recentChoices,
      eventHistory,
    };
  }

  /**
   * LLM 응답 파싱 및 검증
   */
  private parseAndValidate(llmText: string): LLMGeneratedEvent | null {
    try {
      // JSON 블록 추출
      const jsonMatch = llmText.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        this.logger.warn('LLM 응답에 JSON 블록이 없습니다');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[1]);

      // 필수 필드 검증
      if (!parsed.eventType || !parsed.event || !parsed.choices || parsed.choices.length !== 2) {
        this.logger.warn('LLM 응답 형식 오류: 필수 필드 누락');
        return null;
      }

      // 효과 범위 검증 (밸런스 보호)
      for (const choice of parsed.choices) {
        const { users, cash, trust } = choice.effects;

        // 유저 수 변화: -100K ~ +100K
        if (Math.abs(users) > 100000) {
          this.logger.warn(`유저 수 변화 과다: ${users}`);
          choice.effects.users = Math.max(-100000, Math.min(100000, users));
        }

        // 현금 변화: -100M ~ +100M
        if (Math.abs(cash) > 100000000) {
          this.logger.warn(`현금 변화 과다: ${cash}`);
          choice.effects.cash = Math.max(-100000000, Math.min(100000000, cash));
        }

        // 신뢰도 변화: -50 ~ +50
        if (Math.abs(trust) > 50) {
          this.logger.warn(`신뢰도 변화 과다: ${trust}`);
          choice.effects.trust = Math.max(-50, Math.min(50, trust));
        }
      }

      return {
        ...parsed,
        metadata: {
          generatedAt: new Date(),
          modelUsed: 'gpt-oss-20b',
          tokensUsed: 0, // LLMClientService에서 채워짐
        },
      };
    } catch (error) {
      this.logger.error(`LLM 응답 파싱 실패: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 재난 이벤트 생성
   */
  async generateDisaster(game: Game): Promise<LLMGeneratedEvent | null> {
    const context = await this.collectGameContext(game);
    const prompt = EventGeneratorPrompts.generateDisasterPrompt(context);

    const response = await this.llmClient.generate({
      prompt,
      maxTokens: 800,
      temperature: 0.85, // 창의성 높임
      stopSequences: ['###'],
    });

    if (!response) {
      return null;
    }

    const event = this.parseAndValidate(response.text);
    if (event && event.metadata) {
      event.metadata.tokensUsed = response.tokensUsed;
    }

    return event;
  }

  /**
   * 기회 이벤트 생성
   */
  async generateOpportunity(game: Game): Promise<LLMGeneratedEvent | null> {
    const context = await this.collectGameContext(game);
    const prompt = EventGeneratorPrompts.generateOpportunityPrompt(context);

    const response = await this.llmClient.generate({
      prompt,
      maxTokens: 800,
      temperature: 0.85,
      stopSequences: ['###'],
    });

    if (!response) {
      return null;
    }

    const event = this.parseAndValidate(response.text);
    if (event && event.metadata) {
      event.metadata.tokensUsed = response.tokensUsed;
    }

    return event;
  }

  /**
   * 시장 변화 이벤트 생성
   */
  async generateMarketShift(game: Game): Promise<LLMGeneratedEvent | null> {
    const context = await this.collectGameContext(game);
    const prompt = EventGeneratorPrompts.generateMarketShiftPrompt(context);

    const response = await this.llmClient.generate({
      prompt,
      maxTokens: 800,
      temperature: 0.75, // 시장 변화는 조금 더 일관성 있게
      stopSequences: ['###'],
    });

    if (!response) {
      return null;
    }

    const event = this.parseAndValidate(response.text);
    if (event && event.metadata) {
      event.metadata.tokensUsed = response.tokensUsed;
    }

    return event;
  }

  /**
   * 타입별 랜덤 이벤트 생성
   */
  async generateRandomEvent(
    game: Game,
    eventType: 'disaster' | 'opportunity' | 'market_shift',
  ): Promise<LLMGeneratedEvent | null> {
    switch (eventType) {
      case 'disaster':
        return this.generateDisaster(game);
      case 'opportunity':
        return this.generateOpportunity(game);
      case 'market_shift':
        return this.generateMarketShift(game);
      default:
        return null;
    }
  }
}
```

---

### 4. 하이브리드 이벤트 매니저

**파일**: `backend/src/event/hybrid-event-manager.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventService } from './event.service';
import { LLMEventGeneratorService, LLMGeneratedEvent } from '../llm/llm-event-generator.service';
import { Game } from '../database/entities/game.entity';
import { RandomEventEntity } from '../database/entities/random-event.entity';

export type EventSource = 'static' | 'llm';

export interface HybridEventResult {
  triggered: boolean;
  event?: RandomEventEntity | LLMGeneratedEvent;
  source?: EventSource;
  fallbackReason?: string;
}

@Injectable()
export class HybridEventManagerService {
  private readonly logger = new Logger(HybridEventManagerService.name);

  constructor(
    private readonly staticEventService: EventService,
    private readonly llmEventGenerator: LLMEventGeneratorService,
  ) {}

  /**
   * 이벤트 소스 결정 (Static vs LLM)
   */
  private shouldUseLLM(game: Game): boolean {
    // 1. 중요 턴 (파산 직전, IPO 직전) → Static 우선 (밸런스 보장)
    if (game.cash < 5000000 || game.currentTurn >= 23) {
      return false;
    }

    // 2. 초반 (1~5턴) → Static 우선 (빠른 진행)
    if (game.currentTurn <= 5) {
      return false;
    }

    // 3. 이벤트 모드 중 → Static 사용 (재귀 방지)
    if (game.eventMode) {
      return false;
    }

    // 4. 나머지 → LLM 사용 (창의성)
    return true;
  }

  /**
   * 하이브리드 이벤트 평가
   */
  async evaluateHybridEvent(game: Game, nextTurn: number): Promise<HybridEventResult> {
    const useLLM = this.shouldUseLLM(game);

    this.logger.debug(
      `이벤트 소스 결정: ${useLLM ? 'LLM' : 'Static'} (턴: ${game.currentTurn}, 현금: ${game.cash})`,
    );

    if (useLLM) {
      // LLM 시도
      const llmEvent = await this.tryLLMEvent(game);

      if (llmEvent) {
        return {
          triggered: true,
          event: llmEvent,
          source: 'llm',
        };
      } else {
        // LLM 실패 → Static Fallback
        this.logger.warn('LLM 이벤트 생성 실패, Static 이벤트로 대체');
        const staticResult = await this.staticEventService.evaluateRandomEvent(game, nextTurn);

        if (staticResult.triggered && staticResult.event) {
          return {
            triggered: true,
            event: staticResult.event,
            source: 'static',
            fallbackReason: 'LLM 실패',
          };
        } else {
          return { triggered: false };
        }
      }
    } else {
      // Static 우선
      const staticResult = await this.staticEventService.evaluateRandomEvent(game, nextTurn);

      if (staticResult.triggered && staticResult.event) {
        return {
          triggered: true,
          event: staticResult.event,
          source: 'static',
        };
      } else {
        return { triggered: false };
      }
    }
  }

  /**
   * LLM 이벤트 생성 시도 (확률 기반)
   */
  private async tryLLMEvent(game: Game): Promise<LLMGeneratedEvent | null> {
    // 이벤트 타입 랜덤 선택 (가중치)
    const rand = Math.random();
    let eventType: 'disaster' | 'opportunity' | 'market_shift';

    if (rand < 0.4) {
      eventType = 'disaster'; // 40%
    } else if (rand < 0.75) {
      eventType = 'opportunity'; // 35%
    } else {
      eventType = 'market_shift'; // 25%
    }

    this.logger.debug(`LLM 이벤트 타입 선택: ${eventType}`);

    const startTime = Date.now();
    const llmEvent = await this.llmEventGenerator.generateRandomEvent(game, eventType);
    const elapsedMs = Date.now() - startTime;

    if (llmEvent) {
      this.logger.log(
        `LLM 이벤트 생성 성공: ${eventType} (${elapsedMs}ms, ${llmEvent.metadata?.tokensUsed || 0} tokens)`,
      );
    } else {
      this.logger.warn(`LLM 이벤트 생성 실패: ${eventType} (${elapsedMs}ms)`);
    }

    return llmEvent;
  }

  /**
   * 이벤트를 RandomEventEntity 형식으로 변환 (GameService 호환)
   */
  convertToEventEntity(llmEvent: LLMGeneratedEvent, game: Game): RandomEventEntity {
    return {
      eventId: `llm_${Date.now()}`, // 고유 ID
      eventType: llmEvent.eventType,
      priority: llmEvent.priority,
      condition: {
        turnRange: [game.currentTurn, game.currentTurn],
        probability: 1.0, // 이미 발생 결정됨
      },
      event: llmEvent.event,
      choices: llmEvent.choices.map((choice, idx) => ({
        choiceId: `llm_choice_${idx}`,
        text: choice.text,
        effects: choice.effects,
      })),
      metadata: llmEvent.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any; // TypeORM 엔티티가 아니므로 any 사용
  }
}
```

---

### 5. GameService 통합

**파일**: `backend/src/game/game.service.ts` (수정)

```typescript
// 기존 imports...
import { HybridEventManagerService, EventSource } from '../event/hybrid-event-manager.service';

@Injectable()
export class GameService {
  // ...

  constructor(
    // ... 기존 의존성
    private readonly hybridEventManager: HybridEventManagerService, // ⭐ 추가
  ) {}

  /**
   * 선택 실행 (하이브리드 이벤트 체크)
   */
  async executeChoice(gameId: string, choiceId: number): Promise<GameResponseDto> {
    // ... 기존 코드 (게임 조회, 선택지 검증 등)

    // ⭐ 하이브리드 이벤트 체크 (기존 EventService 대체)
    const eventResult = await this.hybridEventManager.evaluateHybridEvent(game, nextTurn);

    if (eventResult.triggered && eventResult.event) {
      // 이벤트 발생
      game.eventMode = true;
      game.activeEventId = eventResult.event.eventId;
      game.returnTurn = nextTurn;

      this.logger.log(
        `${eventResult.source === 'llm' ? 'LLM' : 'Static'} 이벤트 발생: ${eventResult.event.eventId}`,
      );
    } else {
      // 이벤트 미발생
      game.currentTurn = nextTurn;
    }

    // ... 나머지 코드 동일

    const dto = this.toDto(updatedGame);

    // ⭐ 이벤트 데이터에 소스 정보 추가
    if (eventResult.triggered && eventResult.event) {
      dto.randomEventTriggered = true;
      dto.randomEventData = {
        eventId: eventResult.event.eventId,
        eventType: eventResult.event.eventType,
        eventText: this.renderEventText(eventResult.event, game),
        choices: eventResult.event.choices.map((c) => ({
          choiceId: c.choiceId,
          text: c.text,
        })),
        source: eventResult.source, // 'static' | 'llm'
        llmGenerated: eventResult.source === 'llm',
      };
    }

    return dto;
  }

  /**
   * 이벤트 텍스트 렌더링 (LLM 이벤트도 지원)
   */
  private renderEventText(event: any, game: Game): string {
    // LLM 이벤트는 이미 렌더링된 텍스트 제공
    if (event.metadata?.modelUsed) {
      return event.event;
    }

    // Static 이벤트는 템플릿 치환
    return event.event
      .replace(/{currentUsers}/g, game.users.toLocaleString())
      .replace(/{currentCash}/g, `₩${game.cash.toLocaleString()}`)
      .replace(/{currentTrust}/g, `${game.trust}%`)
      .replace(/{currentTurn}/g, game.currentTurn.toString());
  }
}
```

---

## 환경 설정

**파일**: `backend/.env`

```bash
# LLM 서버 설정
LLM_ENABLED=true
LLM_HOST=http://localhost:8080

# LLM 생성 확률 (0.0 ~ 1.0)
LLM_EVENT_PROBABILITY=0.7

# LLM 타임아웃 (ms)
LLM_TIMEOUT=15000

# LLM 캐싱 (향후 구현)
LLM_CACHE_ENABLED=false
LLM_CACHE_TTL=3600
```

---

## 모듈 등록

**파일**: `backend/src/llm/llm.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LLMClientService } from './llm-client.service';
import { LLMEventGeneratorService } from './llm-event-generator.service';
import { ChoiceHistory } from '../database/entities/choice-history.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ChoiceHistory])],
  providers: [LLMClientService, LLMEventGeneratorService],
  exports: [LLMClientService, LLMEventGeneratorService],
})
export class LLMModule {}
```

**파일**: `backend/src/event/event.module.ts` (수정)

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { HybridEventManagerService } from './hybrid-event-manager.service';
import { RandomEventEntity } from '../database/entities/random-event.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RandomEventEntity, EventHistory]),
    LLMModule, // ⭐ LLM 모듈 추가
  ],
  providers: [EventService, HybridEventManagerService],
  exports: [EventService, HybridEventManagerService],
})
export class EventModule {}
```

---

## 성능 최적화

### 1. 응답 시간 관리

```typescript
// LLMClientService에서 타임아웃 설정
timeout: 15000, // 15초 → 실패 시 Static Fallback
```

### 2. 캐싱 전략 (향후 구현)

```typescript
/**
 * 유사 게임 상황에 대한 LLM 응답 캐싱
 * 키: 게임 상태 해시 (턴, 유저, 현금, 신뢰도)
 */
interface EventCache {
  stateHash: string;
  event: LLMGeneratedEvent;
  expiresAt: Date;
}
```

### 3. 비동기 생성 (향후 구현)

```typescript
/**
 * 턴 시작 시 미리 이벤트 생성 (백그라운드)
 * 실제 이벤트 발생 시 캐시에서 즉시 제공
 */
async preGenerateEvents(game: Game): Promise<void> {
  // 백그라운드에서 disaster, opportunity, market_shift 3종 생성
  // Redis 캐시에 저장
}
```

---

## 테스트 전략

### 1. LLM 응답 검증 테스트

**파일**: `backend/src/llm/llm-event-generator.service.spec.ts`

```typescript
describe('LLMEventGeneratorService', () => {
  it('should parse valid JSON response', () => {
    const llmText = `\`\`\`json
{
  "eventType": "disaster",
  "priority": 85,
  "event": "Test event",
  "choices": [
    { "text": "Choice 1", "effects": { "users": 0, "cash": -10000, "trust": 5, "infra": [] } },
    { "text": "Choice 2", "effects": { "users": -5000, "cash": 0, "trust": -10, "infra": [] } }
  ]
}
\`\`\``;

    const result = service['parseAndValidate'](llmText);
    expect(result).toBeDefined();
    expect(result.eventType).toBe('disaster');
    expect(result.choices.length).toBe(2);
  });

  it('should reject invalid effects (over limit)', () => {
    const llmText = `\`\`\`json
{
  "eventType": "disaster",
  "event": "Test",
  "choices": [
    { "text": "Bad", "effects": { "users": 500000, "cash": -500000000, "trust": 100, "infra": [] } },
    { "text": "OK", "effects": { "users": 0, "cash": 0, "trust": 0, "infra": [] } }
  ]
}
\`\`\``;

    const result = service['parseAndValidate'](llmText);
    expect(result).toBeDefined();
    // 범위 제한 적용됨
    expect(result.choices[0].effects.users).toBeLessThanOrEqual(100000);
    expect(result.choices[0].effects.cash).toBeGreaterThanOrEqual(-100000000);
  });
});
```

### 2. 하이브리드 전환 테스트

```typescript
describe('HybridEventManagerService', () => {
  it('should use Static for critical turns', async () => {
    const game = new Game();
    game.cash = 3000000; // 파산 직전
    game.currentTurn = 10;

    const result = await service.evaluateHybridEvent(game, 11);

    expect(result.source).toBe('static'); // LLM 사용 안 함
  });

  it('should fallback to Static when LLM fails', async () => {
    jest.spyOn(llmGenerator, 'generateRandomEvent').mockResolvedValue(null);

    const game = new Game();
    game.cash = 50000000;
    game.currentTurn = 10;

    const result = await service.evaluateHybridEvent(game, 11);

    if (result.triggered) {
      expect(result.source).toBe('static');
      expect(result.fallbackReason).toBe('LLM 실패');
    }
  });
});
```

---

## 모니터링 및 분석

### 1. LLM 이벤트 품질 메트릭

```typescript
interface LLMEventMetrics {
  totalGenerated: number;
  successRate: number;
  avgResponseTimeMs: number;
  avgTokensUsed: number;
  fallbackCount: number;
  userFeedback?: {
    eventId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
  }[];
}
```

### 2. A/B 테스트 (향후)

```typescript
/**
 * 같은 게임 상황에서 Static vs LLM 이벤트 비교
 * 유저 만족도, 게임 밸런스 영향 분석
 */
interface ABTestConfig {
  groupA: 'static'; // 기존 시스템
  groupB: 'llm'; // LLM 시스템
  splitRatio: 0.5; // 50:50
}
```

---

## 프론트엔드 통합

**파일**: `frontend/lib/types.ts` (DTO 확장)

```typescript
export interface GameResponse {
  // ... 기존 필드

  randomEventTriggered?: boolean;
  randomEventData?: {
    eventId: string;
    eventType: string;
    eventText: string;
    choices: Array<{
      choiceId: string;
      text: string;
    }>;
    source: 'static' | 'llm'; // ⭐ 이벤트 소스
    llmGenerated: boolean; // ⭐ LLM 생성 여부
  };
}
```

**UI 표시 (옵션)**:

```tsx
{randomEventData?.llmGenerated && (
  <div className="text-xs text-purple-500 mt-2">
    ✨ AI 생성 이벤트
  </div>
)}
```

---

## 특수 이벤트 타입 (게임성 강화)

### 1. 투자금 회수 위기 이벤트 💰

**컨셉**: 갑작스런 투자자의 투자금 회수 요구로 파산 직전 위기 상황

**트리거 조건**:
- 턴: 10~20 (성장기)
- 현금: 20M~100M (중간 규모)
- 투자 받은 이력 있음 (choiceHistory에 투자 관련 선택)
- 확률: 5% (낮지만 임팩트 큼)

**LLM 프롬프트**:

```typescript
static generateInvestorWithdrawalPrompt(context: GameContext): string {
  const investmentAmount = context.game.cash * 1.5; // 현재 현금보다 많은 금액
  const shortfall = investmentAmount - context.game.cash;

  return `${this.getSystemPrompt()}

${this.summarizeGameState(context)}

**긴급 상황 시뮬레이션**:
주요 투자자가 갑작스럽게 투자금 회수를 요구하는 극한 상황을 생성하세요.

배경 설정:
- 요구 금액: ₩${investmentAmount.toLocaleString()}
- 현재 보유 현금: ₩${context.game.cash.toLocaleString()}
- 부족액: ₩${shortfall.toLocaleString()}
- 기한: 48시간

조건:
1. 투자자의 회수 이유를 현실적으로 설명 (경기 악화, 펀드 청산, LP 압박 등)
2. 3가지 해결 방안 제시 (각각 장단점 명확)
3. 모든 선택지가 고통스러운 trade-off (긴급 론, 자산 매각, 구조조정 등)
4. 선택 실패 시 게임 오버 가능성 경고

분위기: 긴박하고 절박한 상황, 플레이어가 진짜 고민하게 만들기

출력 형식 (JSON):
\`\`\`json
{
  "eventType": "investor_crisis",
  "priority": 95,
  "event": "📞 긴급 전화!\\n\\n[투자자 대화 내용]\\n\\n[현재 상황 요약]\\n\\n⏰ 48시간 내 해결 필요!",
  "choices": [
    {
      "text": "긴급 브릿지 론 (고금리 + 엄격한 조건)",
      "effects": {
        "users": 0,
        "cash": ${shortfall + 10000000},
        "trust": -20,
        "infra": [],
        "debt": ${shortfall * 1.5}
      },
      "reasoning": "단기 생존 가능하지만 고금리 부담, 향후 수익성 압박"
    },
    {
      "text": "자산 긴급 매각 (인프라 다운그레이드)",
      "effects": {
        "users": -30000,
        "cash": ${shortfall},
        "trust": -15,
        "infra": ["downgrade-aurora", "remove-redis"]
      },
      "reasoning": "즉시 현금 확보 가능하지만 서비스 품질 하락, 유저 이탈 위험"
    },
    {
      "text": "다른 투자자 긴급 컨택 (대신 지분 40% 양도)",
      "effects": {
        "users": 0,
        "cash": ${investmentAmount},
        "trust": -25,
        "infra": []
      },
      "reasoning": "자금 확보되지만 지분 희석, 경영권 약화"
    }
  ],
  "failureWarning": "48시간 내 해결 실패 시 파산 (Game Over)"
}
\`\`\`

이벤트를 생성하세요:`;
}
```

**효과**:
- 극도의 긴장감 (실제 스타트업에서 일어나는 일)
- 모든 선택지가 고통스러움 (정답 없음)
- 생존을 위한 타협 강요

---

### 2. 실제 AWS 장애 퀴즈 이벤트 📚

**컨셉**: 실제 AWS 장애 사례를 제시하고 원인을 맞추면 보상, 틀리면 페널티

**교육 목표**:
- AWS 실제 장애 사례 학습
- 클라우드 아키텍처 이해도 향상
- 장애 대응 전략 습득

**실제 사례 데이터베이스** (`backend/data/aws_incidents.json`):

```json
{
  "version": "1.0.0",
  "incidents": [
    {
      "incidentId": "aws_us_east_1_2021_12",
      "date": "2021-12-07",
      "region": "us-east-1",
      "affectedServices": ["Kinesis", "Lambda", "CloudWatch", "EC2 Auto Scaling"],
      "title": "🚨 AWS 대규모 장애 발생!",
      "description": "2021년 12월 7일 실제 사례:\n\nAWS us-east-1 리전에서 Kinesis 서비스 장애 발생\n→ Lambda, CloudWatch, EC2 Auto Scaling 연쇄 장애\n→ 수많은 서비스 다운 (Disney+, Netflix, Robinhood 등)\n\n당신의 서비스도 영향권에 있습니다...\n\n**원인이 무엇일까요?**\n(정답 선택 시 교훈 획득 + 보상)",
      "choices": [
        {
          "text": "A. 네트워크 케이블 물리적 손상",
          "correct": false,
          "explanation": "물리적 장애는 특정 AZ에 국한되지만, 이번은 리전 전체 영향"
        },
        {
          "text": "B. DDoS 공격으로 인한 트래픽 폭증",
          "correct": false,
          "explanation": "AWS Shield가 있어 DDoS로 이런 대규모 장애는 드뭄"
        },
        {
          "text": "C. 내부 서버 용량 부족으로 API 병목 현상 ✅",
          "correct": true,
          "explanation": "**정답!**\n\nKinesis 프론트엔드 서버들의 용량 부족 → API 호출 폭증 처리 실패 → 타임아웃 발생\n\n연쇄 효과:\n- Lambda가 Kinesis 스트림 읽기 실패\n- CloudWatch가 메트릭 수집 실패\n- EC2 Auto Scaling이 CloudWatch 의존 → 스케일링 실패\n\n**교훈**:\n1. Single Point of Failure 제거 필수\n2. Multi-Region 아키텍처 고려\n3. 의존성 서비스 Fallback 전략\n4. Circuit Breaker 패턴 적용"
        },
        {
          "text": "D. 개발자의 잘못된 배포 (Human Error)",
          "correct": false,
          "explanation": "AWS는 엄격한 배포 프로세스로 이런 대규모 장애 방지"
        }
      ],
      "correctReward": {
        "users": 0,
        "cash": 30000000,
        "trust": 25,
        "infra": ["incident-response-playbook", "multi-region-standby"]
      },
      "wrongPenalty": {
        "users": -80000,
        "cash": -20000000,
        "trust": -35,
        "infra": []
      },
      "learningValue": "high",
      "difficulty": "medium"
    },
    {
      "incidentId": "aws_route53_2022_06",
      "date": "2022-06-21",
      "region": "global",
      "affectedServices": ["Route 53"],
      "title": "🌐 DNS 전역 장애!",
      "description": "2022년 6월 21일 실제 사례:\n\nAWS Route 53 (DNS 서비스) 전역 장애 발생\n→ 전 세계 수많은 웹사이트/앱 접속 불가\n→ 약 2시간 지속\n\n당신의 도메인도 응답 없음...\n\n**무엇이 문제였을까요?**",
      "choices": [
        {
          "text": "A. 루트 DNS 서버 해킹",
          "correct": false,
          "explanation": "루트 DNS는 분산 구조로 이런 식 해킹은 불가능"
        },
        {
          "text": "B. Route 53 내부 네트워크 파티션 ✅",
          "correct": true,
          "explanation": "**정답!**\n\nRoute 53 내부 네트워크에서 파티션(분할) 발생 → 서버 간 통신 두절 → DNS 쿼리 처리 실패\n\n**교훈**:\n1. DNS도 SPOF가 될 수 있음\n2. Multi-DNS 전략 (Route 53 + Cloudflare 병행)\n3. DNS Failover 테스트 정기적 수행\n4. TTL 설정 최적화 (캐시 활용)"
        },
        {
          "text": "C. 과도한 DNS 쿼리 트래픽",
          "correct": false,
          "explanation": "Route 53는 엄청난 트래픽 처리 가능, 이건 내부 문제"
        },
        {
          "text": "D. SSL/TLS 인증서 만료",
          "correct": false,
          "explanation": "DNS는 인증서 없이 작동, 이건 별개 이슈"
        }
      ],
      "correctReward": {
        "users": 0,
        "cash": 25000000,
        "trust": 20,
        "infra": ["multi-dns-provider"]
      },
      "wrongPenalty": {
        "users": -60000,
        "cash": -15000000,
        "trust": -30,
        "infra": []
      },
      "learningValue": "high",
      "difficulty": "hard"
    },
    {
      "incidentId": "aws_s3_2017_02",
      "date": "2017-02-28",
      "region": "us-east-1",
      "affectedServices": ["S3"],
      "title": "☁️ S3 버킷 대량 삭제 사고!",
      "description": "2017년 2월 28일 전설의 사건:\n\nAWS 엔지니어가 디버깅 중 실수로 S3 서버 대량 제거\n→ us-east-1 리전 S3 서비스 약 4시간 다운\n→ 수많은 웹사이트 이미지/파일 로딩 실패\n\n당신의 정적 파일 CDN도 먹통...\n\n**이 사고에서 배울 교훈은?**",
      "choices": [
        {
          "text": "A. 백업을 여러 리전에 분산 저장 ✅",
          "correct": true,
          "explanation": "**정답!**\n\n단일 리전 의존은 위험! S3 Cross-Region Replication 필수\n\n**교훈**:\n1. 중요 데이터는 최소 2개 리전 백업\n2. S3 Versioning 활성화 (실수 삭제 복구)\n3. MFA Delete 설정 (중요 버킷)\n4. CloudFront 캐싱으로 S3 장애 영향 최소화\n5. 휴먼 에러 방지: IAM 권한 최소화"
        },
        {
          "text": "B. S3 대신 자체 스토리지 서버 구축",
          "correct": false,
          "explanation": "자체 구축은 비용/관리 부담 더 큼, Multi-Region이 해법"
        },
        {
          "text": "C. S3 Standard-IA로 전환",
          "correct": false,
          "explanation": "스토리지 클래스는 비용 최적화용, 가용성과 무관"
        },
        {
          "text": "D. S3 Access Log 모니터링 강화",
          "correct": false,
          "explanation": "로그는 사후 분석용, 장애 자체를 막진 못함"
        }
      ],
      "correctReward": {
        "users": 0,
        "cash": 20000000,
        "trust": 15,
        "infra": ["s3-cross-region-replication", "s3-versioning"]
      },
      "wrongPenalty": {
        "users": -40000,
        "cash": -10000000,
        "trust": -25,
        "infra": []
      },
      "learningValue": "very_high",
      "difficulty": "easy"
    }
  ]
}
```

**LLM 프롬프트** (실시간 변형):

```typescript
static generateAWSIncidentQuizPrompt(
  context: GameContext,
  incident: AWSIncident
): string {
  return `${this.getSystemPrompt()}

${this.summarizeGameState(context)}

**실제 AWS 장애 사례 학습 이벤트**:
플레이어에게 실제 AWS 장애 사례를 각색하여 제시하세요.

사례 정보:
- 날짜: ${incident.date}
- 영향 받은 서비스: ${incident.affectedServices.join(', ')}
- 제목: ${incident.title}
- 기본 설명: ${incident.description}

당신의 역할:
1. 위 실제 사례를 플레이어의 현재 게임 상황에 맞게 각색
2. "당신의 서비스가 이 장애의 영향을 받고 있다"는 긴박한 상황 연출
3. 원본 선택지는 유지하되, 설명을 플레이어 상황에 맞게 커스터마이징

출력 형식 (JSON):
\`\`\`json
{
  "eventType": "aws_incident_quiz",
  "priority": 88,
  "incident_id": "${incident.incidentId}",
  "event": "[각색된 긴박한 상황 설명]\\n\\n현재 영향:\\n- 유저 ${context.game.users.toLocaleString()}명 서비스 이용 불가\\n- 분당 ₩500,000 매출 손실 중\\n\\n**원인을 빠르게 파악하고 대응하세요!**",
  "quiz_mode": true,
  "choices": ${JSON.stringify(incident.choices, null, 2)},
  "correct_reward": ${JSON.stringify(incident.correctReward, null, 2)},
  "wrong_penalty": ${JSON.stringify(incident.wrongPenalty, null, 2)}
}
\`\`\`

각색된 이벤트를 생성하세요:`;
}
```

**게임 플레이 흐름**:

```
1. 이벤트 발생
   ↓
2. 플레이어 선택지 선택 (A/B/C/D)
   ↓
3. 정답 여부 판정
   ↓
4-1. 정답 시:
     - 보상 획득 (현금, 신뢰도, 인프라 개선)
     - 상세한 원인 설명 + 교훈 제시
     - "사고 대응 매뉴얼" 인프라 획득
   ↓
4-2. 오답 시:
     - 페널티 (유저 이탈, 현금 손실, 신뢰도 하락)
     - "왜 틀렸는지" 설명
     - 정답 공개 + 교훈
```

**구현 파일**: `backend/src/event/aws-incident-quiz.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AWSIncident {
  incidentId: string;
  date: string;
  region: string;
  affectedServices: string[];
  title: string;
  description: string;
  choices: Array<{
    text: string;
    correct: boolean;
    explanation: string;
  }>;
  correctReward: {
    users: number;
    cash: number;
    trust: number;
    infra: string[];
  };
  wrongPenalty: {
    users: number;
    cash: number;
    trust: number;
    infra: string[];
  };
  learningValue: 'low' | 'medium' | 'high' | 'very_high';
  difficulty: 'easy' | 'medium' | 'hard';
}

@Injectable()
export class AWSIncidentQuizService {
  private readonly logger = new Logger(AWSIncidentQuizService.name);
  private incidentPool: AWSIncident[] = [];

  async onModuleInit(): Promise<void> {
    await this.loadIncidents();
    this.logger.log(`AWS 장애 사례 ${this.incidentPool.length}개 로드 완료`);
  }

  private async loadIncidents(): Promise<void> {
    const jsonPath = path.join(__dirname, '../../data/aws_incidents.json');

    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(jsonContent);
      this.incidentPool = parsed.incidents;
    } catch (error) {
      this.logger.error(`AWS 장애 사례 로드 실패: ${error.message}`);
    }
  }

  /**
   * 게임 상황에 맞는 장애 사례 선택
   */
  selectIncident(game: Game): AWSIncident | null {
    // 인프라 단계에 따라 난이도 필터링
    let difficulty: string[];

    if (game.infrastructure.includes('EKS')) {
      difficulty = ['medium', 'hard'];
    } else if (game.infrastructure.includes('Aurora')) {
      difficulty = ['easy', 'medium'];
    } else {
      difficulty = ['easy'];
    }

    const candidates = this.incidentPool.filter(
      (inc) => difficulty.includes(inc.difficulty)
    );

    if (candidates.length === 0) return null;

    // 랜덤 선택
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * 선택지 정답 여부 확인
   */
  checkAnswer(incident: AWSIncident, choiceIndex: number): {
    correct: boolean;
    explanation: string;
    reward?: any;
    penalty?: any;
  } {
    const choice = incident.choices[choiceIndex];

    return {
      correct: choice.correct,
      explanation: choice.explanation,
      reward: choice.correct ? incident.correctReward : undefined,
      penalty: !choice.correct ? incident.wrongPenalty : undefined,
    };
  }
}
```

---

### 3. 두 이벤트 타입 통합

**HybridEventManagerService 확장**:

```typescript
async evaluateHybridEvent(game: Game, nextTurn: number): Promise<HybridEventResult> {
  // ... 기존 코드

  // 특수 이벤트 체크
  const specialEvent = await this.checkSpecialEvents(game);
  if (specialEvent) {
    return specialEvent;
  }

  // ... 나머지 코드
}

/**
 * 특수 이벤트 체크 (투자금 회수, AWS 퀴즈)
 */
private async checkSpecialEvents(game: Game): Promise<HybridEventResult | null> {
  // 1. 투자금 회수 위기 (5% 확률, 조건 충족 시)
  if (
    game.currentTurn >= 10 &&
    game.currentTurn <= 20 &&
    game.cash >= 20000000 &&
    game.cash <= 100000000 &&
    Math.random() < 0.05
  ) {
    const withdrawalEvent = await this.llmEventGenerator.generateInvestorWithdrawal(game);
    if (withdrawalEvent) {
      return {
        triggered: true,
        event: withdrawalEvent,
        source: 'llm',
      };
    }
  }

  // 2. AWS 장애 퀴즈 (15% 확률, 턴 7 이상)
  if (game.currentTurn >= 7 && Math.random() < 0.15) {
    const incident = this.awsIncidentQuiz.selectIncident(game);
    if (incident) {
      const quizEvent = await this.llmEventGenerator.generateAWSQuiz(game, incident);
      if (quizEvent) {
        return {
          triggered: true,
          event: quizEvent,
          source: 'llm',
        };
      }
    }
  }

  return null;
}
```

---

## 효과 및 기대

### 투자금 회수 이벤트
- ✅ **극도의 긴장감**: 실제 파산 위기
- ✅ **현실성**: 실제 스타트업에서 일어나는 일
- ✅ **어려운 선택**: 모든 선택지가 고통스러움
- ✅ **드라마**: 스토리 텔링 강화

### AWS 퀴즈 이벤트
- ✅ **교육적 가치**: 실제 사례 학습
- ✅ **참여도**: 능동적 선택 (수동적 읽기 X)
- ✅ **보상 체계**: 정답 시 큰 보상 (학습 동기)
- ✅ **재도전 욕구**: 틀린 문제 기억 → 다음 게임에서 정답

---

## 구현 우선순위

### Phase 1: 기본 인프라 (3일)
- [x] LLMClientService 구현 (OpenAI 호환 API)
- [x] LLMEventGeneratorService 기본 구조
- [x] 프롬프트 템플릿 (disaster, opportunity, market_shift)
- [x] 응답 파싱 및 검증 로직

### Phase 2: 하이브리드 매니저 (2일)
- [x] HybridEventManagerService 구현
- [x] Static/LLM 전환 로직
- [x] Fallback 메커니즘
- [x] GameService 통합

### Phase 3: 테스트 및 검증 (2일)
- [ ] Unit Test (파싱, 검증, 전환 로직)
- [ ] Integration Test (LLM 서버 통신)
- [ ] 밸런스 테스트 (효과 범위 검증)
- [ ] 성능 테스트 (응답 시간)

### Phase 4: 최적화 (2일)
- [ ] 캐싱 구현 (유사 상황 재사용)
- [ ] 백그라운드 생성 (턴 시작 시 미리 생성)
- [ ] 모니터링 대시보드
- [ ] 로깅 및 분석

---

## 장단점 분석

### 장점 ✅

1. **무한한 변주**: 같은 상황도 매번 다른 이벤트 경험
2. **개인화**: 플레이어 선택 히스토리 반영
3. **창의성**: 미리 정의되지 않은 상황 자연스럽게 처리
4. **개발 효율**: 수백 개 이벤트 수작업 작성 불필요
5. **스토리텔링**: 자연스러운 한국어 문장

### 단점 ⚠️

1. **응답 시간**: 2~5초 지연 (Static은 0ms)
2. **밸런스 위험**: LLM이 과도한 효과 생성 가능 (검증 필수)
3. **일관성 부족**: 같은 입력에 다른 출력 (캐싱으로 완화)
4. **의존성**: LLM 서버 장애 시 Static Fallback 의존

### 완화 전략

- **응답 시간**: 백그라운드 생성, 캐싱, Static Fallback
- **밸런스**: 효과 범위 검증 (±100K 유저, ±100M 현금, ±50 신뢰도)
- **일관성**: 캐싱으로 동일 상황은 동일 이벤트 제공
- **의존성**: LLM 실패 시 자동 Static Fallback

---

## 결론

**LLM 하이브리드 이벤트 시스템**은 다음을 제공합니다:

1. **창의적 게임플레이**: 플레이어마다 다른 경험
2. **안정성**: Static Fallback으로 LLM 장애 대응
3. **밸런스 보장**: 중요 이벤트는 Static 사용
4. **확장 가능성**: 프롬프트 개선으로 품질 향상

**권장 도입 전략**:
- Phase 1~2: 기본 인프라 구축 (1주)
- Phase 3: 테스트 및 검증 (밸런스 확인)
- Phase 4: 점진적 활성화 (LLM 확률 0% → 70%)

**최종 목표**:
- LLM 70%, Static 30% 비율로 운영
- 유저 피드백 기반 프롬프트 개선
- A/B 테스트로 품질 검증
