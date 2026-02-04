# 조건부 이벤트 시스템 설계 (개선판)

## 개요

갑작스런 장애, 긴급 투자, 랜덤 이벤트를 **보안성, 성능, 테스트 가능성**을 고려하여 구현하는 시스템.

### 개선 목표

- **보안 강화**: crypto.randomBytes() 기반 시드 시스템, 게임 상태 무결성 검증
- **성능 최적화**: 메모리 캐싱, 턴별 인덱싱, O(1) 조회
- **테스트 가능성**: Seeded random generator, 재현 가능한 이벤트 발생
- **확장성**: 난이도별 조건 분리, 이벤트 타입 확장 구조
- **에러 처리**: Graceful degradation, 트랜잭션 보장

---

## 아키텍처 개요

### 시스템 구성요소

```
┌─────────────────────────────────────────────────────────┐
│ GameService.executeChoice()                              │
│  ├─ applyTurnStartRecovery()                            │
│  ├─ ⭐ EventService.evaluateRandomEvent()               │
│  │   ├─ getEventPoolForDifficulty()                     │
│  │   ├─ filterByConditions() → O(n) event scan         │
│  │   ├─ SeededRandom.next() → predictable RNG          │
│  │   └─ logEventOccurrence() → audit trail             │
│  ├─ applyChoiceEffects()                                │
│  ├─ ⭐ handleEventChoice() (if event_mode)              │
│  └─ checkGameStatus()                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ EventService                                             │
│  ├─ loadEventPool() → Cache in memory                   │
│  ├─ SeededRandom class → crypto.randomBytes() seed      │
│  ├─ EventConditionEvaluator → Type-safe conditions      │
│  └─ EventHistoryLogger → Prevent duplicates             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Database Entities                                        │
│  ├─ Game entity (ADD: randomSeed, eventMode, eventId)   │
│  ├─ RandomEvent entity (NEW: event pool table)          │
│  └─ EventHistory entity (NEW: occurrence tracking)      │
└─────────────────────────────────────────────────────────┘
```

---

## 데이터 구조 설계

### 1. 이벤트 풀 데이터 구조

**파일**: `backend/data/random_events.json`

```typescript
// TypeScript 인터페이스
export interface RandomEventCondition {
  turnRange: [number, number];           // [최소 턴, 최대 턴]
  probability: number;                   // 0.0 ~ 1.0
  minUsers?: number;                     // 최소 유저 수
  maxUsers?: number;                     // 최대 유저 수
  minCash?: number;                      // 최소 자금
  maxCash?: number;                      // 최대 자금
  minTrust?: number;                     // 최소 신뢰도
  maxTrust?: number;                     // 최대 신뢰도
  requiredInfra?: string[];              // 필수 인프라
  forbiddenInfra?: string[];             // 금지 인프라
  difficultyModes?: DifficultyMode[];    // 난이도 제한
  maxOccurrences?: number;               // 최대 발생 횟수 (중복 방지)
}

export interface RandomEventChoice {
  choiceId: string;                      // "event_aws_outage_1"
  text: string;
  effects: ChoiceEffects;
  returnTurn?: number;                   // 이벤트 종료 후 돌아갈 턴 (기본: 다음 턴)
}

export interface RandomEvent {
  eventId: string;                       // "aws_outage"
  eventType: 'disaster' | 'opportunity' | 'market_shift';
  priority: number;                      // 높을수록 우선 (같은 조건 충족 시)
  condition: RandomEventCondition;
  event: string;                         // 이벤트 텍스트 (템플릿 변수 지원)
  choices: RandomEventChoice[];
  metadata?: {
    tags?: string[];                     // 분류 태그
    author?: string;
    createdAt?: string;
  };
}
```

**JSON 예시** (`random_events.json`):

```json
{
  "version": "1.0.0",
  "events": [
    {
      "eventId": "aws_region_outage",
      "eventType": "disaster",
      "priority": 90,
      "condition": {
        "turnRange": [10, 20],
        "probability": 0.08,
        "minUsers": 100000,
        "difficultyModes": ["NORMAL", "HARD"],
        "maxOccurrences": 1
      },
      "event": "🚨 AWS ap-northeast-2 리전 장애!\n\n서울 리전 전체 다운... 서비스 중단 중\n\n현재 유저: {currentUsers}명 대기 중\n현재 신뢰도: {currentTrust}%",
      "choices": [
        {
          "choiceId": "aws_outage_multi_region",
          "text": "멀티 리전 긴급 구축 (₩50,000,000)",
          "effects": {
            "users": 0,
            "cash": -50000000,
            "trust": 15,
            "infra": ["multi-region"]
          }
        },
        {
          "choiceId": "aws_outage_wait",
          "text": "복구 대기 (6시간, 유저 30% 이탈)",
          "effects": {
            "users": -30000,
            "cash": 0,
            "trust": -40,
            "infra": []
          }
        }
      ],
      "metadata": {
        "tags": ["disaster", "aws", "infra"],
        "author": "backend-team"
      }
    },
    {
      "eventId": "emergency_bridge_round",
      "eventType": "opportunity",
      "priority": 80,
      "condition": {
        "turnRange": [8, 22],
        "probability": 0.3,
        "maxCash": 5000000,
        "difficultyModes": ["EASY", "NORMAL", "HARD"],
        "maxOccurrences": 2
      },
      "event": "💼 긴급 투자 기회!\n\n파산 직전 상황을 본 투자자가 연락...\n\n현금: {currentCash}\n필요 금액: 최소 ₩5,000,000",
      "choices": [
        {
          "choiceId": "bridge_accept",
          "text": "수락 - ₩30,000,000 (지분 35% 양도)",
          "effects": {
            "users": 0,
            "cash": 30000000,
            "trust": -15,
            "infra": []
          }
        },
        {
          "choiceId": "bridge_reject",
          "text": "거절 - 비용 절감 모드로 전환",
          "effects": {
            "users": -20000,
            "cash": 5000000,
            "trust": 0,
            "infra": []
          }
        }
      ]
    },
    {
      "eventId": "security_breach",
      "eventType": "disaster",
      "priority": 85,
      "condition": {
        "turnRange": [5, 18],
        "probability": 0.1,
        "minTrust": 60,
        "forbiddenInfra": ["WAF"],
        "maxOccurrences": 1
      },
      "event": "🔒 보안 침해 사고 발생!\n\n개인정보 유출 의심... 언론 보도 시작\n\n현재 신뢰도: {currentTrust}%",
      "choices": [
        {
          "choiceId": "breach_expert",
          "text": "전문 보안 컨설팅 고용 (₩50,000,000)",
          "effects": {
            "users": 0,
            "cash": -50000000,
            "trust": -10,
            "infra": ["WAF"]
          }
        },
        {
          "choiceId": "breach_internal",
          "text": "자체 대응 (비용 절감, 신뢰 타격)",
          "effects": {
            "users": 0,
            "cash": -10000000,
            "trust": -40,
            "infra": []
          }
        }
      ]
    }
  ]
}
```

### 2. 데이터베이스 엔티티 확장

#### 2.1 Game Entity 확장

**파일**: `backend/src/database/entities/game.entity.ts`

```typescript
@Entity('games')
export class Game {
  // 기존 필드들...

  // --- 랜덤 이벤트 시스템 필드 ---

  @Column({ type: 'varchar', length: 64, nullable: true })
  randomSeed: string; // crypto.randomBytes(32).toString('hex')
  // 게임 생성 시 한 번 설정, 모든 랜덤 이벤트 재현 가능

  @Column({ type: 'boolean', default: false })
  eventMode: boolean; // 현재 이벤트 처리 중 여부

  @Column({ type: 'varchar', length: 64, nullable: true })
  activeEventId: string; // 현재 활성화된 이벤트 ID

  @Column({ type: 'int', nullable: true })
  returnTurn: number; // 이벤트 종료 후 돌아갈 원래 턴
}
```

#### 2.2 RandomEvent Entity (새로 생성)

**파일**: `backend/src/database/entities/random-event.entity.ts`

```typescript
import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

export type EventType = 'disaster' | 'opportunity' | 'market_shift';

@Entity('random_events')
@Index(['eventType', 'priority'])
export class RandomEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  eventId: string;

  @Column({ type: 'varchar', length: 32 })
  eventType: EventType;

  @Column({ type: 'int', default: 50 })
  priority: number; // 높을수록 우선

  @Column({ type: 'simple-json' })
  condition: RandomEventCondition;

  @Column({ type: 'text' })
  event: string;

  @Column({ type: 'simple-json' })
  choices: RandomEventChoice[];

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 2.3 EventHistory Entity (새로 생성)

**파일**: `backend/src/database/entities/event-history.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('event_history')
@Index(['gameId', 'eventId'])
@Index(['gameId', 'turnNumber'])
export class EventHistory {
  @PrimaryGeneratedColumn('uuid')
  historyId: string;

  @Column({ type: 'varchar', length: 36 })
  gameId: string;

  @Column({ type: 'varchar', length: 64 })
  eventId: string;

  @Column({ type: 'int' })
  turnNumber: number; // 이벤트 발생 턴

  @Column({ type: 'varchar', length: 64 })
  choiceId: string; // 선택한 이벤트 선택지

  @Column({ type: 'simple-json' })
  gameStateSnapshot: {
    users: number;
    cash: number;
    trust: number;
    infrastructure: string[];
  }; // 이벤트 발생 시점 게임 상태

  @CreateDateColumn()
  occurredAt: Date;
}
```

---

## 핵심 구현: EventService

### 1. Seeded Random Number Generator

**파일**: `backend/src/event/seeded-random.ts`

```typescript
import * as crypto from 'crypto';

/**
 * Deterministic random number generator using seed.
 * Uses crypto.createHash for reproducibility across sessions.
 */
export class SeededRandom {
  private seed: string;
  private counter: number = 0;

  constructor(seed: string) {
    this.seed = seed;
  }

  /**
   * Generate next random number in [0, 1)
   * Uses SHA-256 hash for deterministic output
   */
  next(): number {
    const input = `${this.seed}-${this.counter++}`;
    const hash = crypto.createHash('sha256').update(input).digest();

    // Convert first 8 bytes to 64-bit integer, then normalize to [0, 1)
    const value = hash.readUInt32BE(0) + hash.readUInt32BE(4) / 0x100000000;
    const max = 0x100000000;
    return (value % max) / max;
  }

  /**
   * Generate random integer in [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Reset counter (for testing)
   */
  reset(): void {
    this.counter = 0;
  }

  /**
   * Create new seed from crypto.randomBytes (called once per game)
   */
  static generateSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### 2. EventService 구현

**파일**: `backend/src/event/event.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Game } from '../database/entities/game.entity';
import { RandomEventEntity } from '../database/entities/random-event.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { SeededRandom } from './seeded-random';
import { DIFFICULTY_CONFIGS, DifficultyMode } from '../game/game-constants';

export interface EventEvaluationResult {
  triggered: boolean;
  event?: RandomEventEntity;
  debugInfo?: {
    candidateCount: number;
    evaluatedEvents: string[];
    failedConditions: Record<string, string>;
  };
}

@Injectable()
export class EventService implements OnModuleInit {
  private readonly logger = new Logger(EventService.name);
  private eventPool: Map<string, RandomEventEntity> = new Map();
  private turnIndexedEvents: Map<number, RandomEventEntity[]> = new Map();

  constructor(
    @InjectRepository(RandomEventEntity)
    private readonly eventRepository: Repository<RandomEventEntity>,
    @InjectRepository(EventHistory)
    private readonly historyRepository: Repository<EventHistory>,
  ) {}

  /**
   * Module 초기화 시 이벤트 풀 로드 및 메모리 캐싱
   */
  async onModuleInit(): Promise<void> {
    await this.loadEventPool();
    this.buildTurnIndex();
    this.logger.log(`이벤트 풀 로드 완료: ${this.eventPool.size}개 이벤트`);
  }

  /**
   * JSON 파일 + DB에서 이벤트 풀 로드
   * 1. JSON 파일 먼저 읽기 (버전 관리 용이)
   * 2. DB에 없으면 INSERT, 있으면 UPDATE
   * 3. 메모리에 캐싱
   */
  private async loadEventPool(): Promise<void> {
    const jsonPath = path.join(__dirname, '../../data/random_events.json');

    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(jsonContent);

      for (const eventData of parsed.events) {
        // DB에 upsert
        const existing = await this.eventRepository.findOne({
          where: { eventId: eventData.eventId },
        });

        if (existing) {
          // Update existing
          await this.eventRepository.update(
            { eventId: eventData.eventId },
            eventData,
          );
        } else {
          // Insert new
          const entity = this.eventRepository.create(eventData);
          await this.eventRepository.save(entity);
        }

        // 메모리 캐시
        this.eventPool.set(eventData.eventId, eventData);
      }
    } catch (error) {
      this.logger.error(`이벤트 풀 로드 실패: ${error.message}`, error.stack);
      // Graceful degradation: 빈 풀로 계속 진행
    }
  }

  /**
   * 턴별 인덱스 생성 (성능 최적화)
   * O(n) scan 대신 O(1) 조회
   */
  private buildTurnIndex(): void {
    for (const event of this.eventPool.values()) {
      const [minTurn, maxTurn] = event.condition.turnRange;
      for (let turn = minTurn; turn <= maxTurn; turn++) {
        if (!this.turnIndexedEvents.has(turn)) {
          this.turnIndexedEvents.set(turn, []);
        }
        this.turnIndexedEvents.get(turn).push(event);
      }
    }
    this.logger.debug(`턴 인덱스 생성 완료: ${this.turnIndexedEvents.size}개 턴`);
  }

  /**
   * 랜덤 이벤트 발생 여부 평가 (핵심 로직)
   * @param game 현재 게임 상태
   * @param nextTurn 다음 진행 예정 턴
   * @returns 이벤트 발생 여부 및 이벤트 정보
   */
  async evaluateRandomEvent(
    game: Game,
    nextTurn: number,
  ): Promise<EventEvaluationResult> {
    // 이미 이벤트 처리 중이면 스킵
    if (game.eventMode) {
      return { triggered: false };
    }

    // 턴 인덱스에서 후보 이벤트 조회 (O(1))
    const candidateEvents = this.turnIndexedEvents.get(nextTurn) || [];
    if (candidateEvents.length === 0) {
      return { triggered: false };
    }

    // Seeded RNG 초기화
    const rng = new SeededRandom(game.randomSeed);

    // 게임 상태 기반으로 RNG 진행 (재현성 보장)
    // 같은 턴에서 같은 상태면 같은 결과
    const stateHash = this.computeStateHash(game);
    for (let i = 0; i < stateHash % 100; i++) {
      rng.next(); // Advance RNG to deterministic state
    }

    const debugInfo = {
      candidateCount: candidateEvents.length,
      evaluatedEvents: [] as string[],
      failedConditions: {} as Record<string, string>,
    };

    // 우선순위 정렬 (높은 것부터)
    const sortedEvents = [...candidateEvents].sort((a, b) => b.priority - a.priority);

    for (const event of sortedEvents) {
      debugInfo.evaluatedEvents.push(event.eventId);

      // 조건 평가
      const meetsConditions = await this.evaluateConditions(game, event);
      if (!meetsConditions.passed) {
        debugInfo.failedConditions[event.eventId] = meetsConditions.reason;
        continue;
      }

      // 확률 체크 (Seeded RNG)
      const roll = rng.next();
      if (roll < event.condition.probability) {
        this.logger.log(
          `랜덤 이벤트 발생: ${event.eventId} (확률: ${event.condition.probability}, 주사위: ${roll.toFixed(4)})`,
        );
        return { triggered: true, event, debugInfo };
      } else {
        debugInfo.failedConditions[event.eventId] = `확률 미달 (${roll.toFixed(4)} >= ${event.condition.probability})`;
      }
    }

    return { triggered: false, debugInfo };
  }

  /**
   * 이벤트 조건 평가
   */
  private async evaluateConditions(
    game: Game,
    event: RandomEventEntity,
  ): Promise<{ passed: boolean; reason?: string }> {
    const cond = event.condition;
    const mode = (game.difficultyMode || 'NORMAL') as DifficultyMode;

    // 난이도 제한
    if (cond.difficultyModes && !cond.difficultyModes.includes(mode)) {
      return { passed: false, reason: `난이도 불일치 (필요: ${cond.difficultyModes.join(',')})` };
    }

    // 유저 수 범위
    if (cond.minUsers !== undefined && game.users < cond.minUsers) {
      return { passed: false, reason: `유저 수 부족 (${game.users} < ${cond.minUsers})` };
    }
    if (cond.maxUsers !== undefined && game.users > cond.maxUsers) {
      return { passed: false, reason: `유저 수 초과 (${game.users} > ${cond.maxUsers})` };
    }

    // 자금 범위
    if (cond.minCash !== undefined && game.cash < cond.minCash) {
      return { passed: false, reason: `자금 부족 (${game.cash} < ${cond.minCash})` };
    }
    if (cond.maxCash !== undefined && game.cash > cond.maxCash) {
      return { passed: false, reason: `자금 초과 (${game.cash} > ${cond.maxCash})` };
    }

    // 신뢰도 범위
    if (cond.minTrust !== undefined && game.trust < cond.minTrust) {
      return { passed: false, reason: `신뢰도 부족 (${game.trust} < ${cond.minTrust})` };
    }
    if (cond.maxTrust !== undefined && game.trust > cond.maxTrust) {
      return { passed: false, reason: `신뢰도 초과 (${game.trust} > ${cond.maxTrust})` };
    }

    // 필수 인프라
    if (cond.requiredInfra) {
      for (const infra of cond.requiredInfra) {
        if (!game.infrastructure.includes(infra)) {
          return { passed: false, reason: `필수 인프라 부족 (${infra})` };
        }
      }
    }

    // 금지 인프라
    if (cond.forbiddenInfra) {
      for (const infra of cond.forbiddenInfra) {
        if (game.infrastructure.includes(infra)) {
          return { passed: false, reason: `금지 인프라 존재 (${infra})` };
        }
      }
    }

    // 최대 발생 횟수 체크
    if (cond.maxOccurrences !== undefined) {
      const occurrenceCount = await this.historyRepository.count({
        where: { gameId: game.gameId, eventId: event.eventId },
      });
      if (occurrenceCount >= cond.maxOccurrences) {
        return { passed: false, reason: `최대 발생 횟수 초과 (${occurrenceCount}/${cond.maxOccurrences})` };
      }
    }

    return { passed: true };
  }

  /**
   * 게임 상태 해시 계산 (재현성 보장)
   */
  private computeStateHash(game: Game): number {
    const stateString = `${game.gameId}-${game.currentTurn}-${game.users}-${game.cash}-${game.trust}`;
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(stateString).digest('hex');
    return parseInt(hash.substring(0, 8), 16); // 32-bit hash
  }

  /**
   * 이벤트 텍스트 템플릿 변수 치환
   */
  renderEventText(event: RandomEventEntity, game: Game): string {
    return event.event
      .replace(/{currentUsers}/g, game.users.toLocaleString())
      .replace(/{currentCash}/g, `₩${game.cash.toLocaleString()}`)
      .replace(/{currentTrust}/g, `${game.trust}%`)
      .replace(/{currentTurn}/g, game.currentTurn.toString());
  }

  /**
   * 이벤트 발생 기록 (히스토리 추적)
   */
  async recordEventOccurrence(
    game: Game,
    event: RandomEventEntity,
    choiceId: string,
  ): Promise<void> {
    const history = this.historyRepository.create({
      gameId: game.gameId,
      eventId: event.eventId,
      turnNumber: game.currentTurn,
      choiceId,
      gameStateSnapshot: {
        users: game.users,
        cash: game.cash,
        trust: game.trust,
        infrastructure: [...game.infrastructure],
      },
    });
    await this.historyRepository.save(history);
    this.logger.log(`이벤트 기록: ${event.eventId} → 선택 ${choiceId} (게임 ${game.gameId})`);
  }

  /**
   * 특정 게임의 이벤트 히스토리 조회
   */
  async getEventHistory(gameId: string): Promise<EventHistory[]> {
    return this.historyRepository.find({
      where: { gameId },
      order: { turnNumber: 'ASC' },
    });
  }
}
```

---

## GameService 통합

### executeChoice() 수정

**파일**: `backend/src/game/game.service.ts`

```typescript
import { EventService } from '../event/event.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(Choice)
    private readonly choiceRepository: Repository<Choice>,
    @InjectRepository(ChoiceHistory)
    private readonly historyRepository: Repository<ChoiceHistory>,
    private readonly eventService: EventService, // ⭐ 의존성 주입
  ) {}

  /**
   * 새 게임 시작 (랜덤 시드 생성)
   */
  async startGame(difficultyMode?: DifficultyMode): Promise<GameResponseDto> {
    // ... 기존 코드 ...

    // ⭐ 랜덤 시드 생성
    game.randomSeed = SeededRandom.generateSeed();
    game.eventMode = false;
    game.activeEventId = null;
    game.returnTurn = null;

    const savedGame = await this.gameRepository.save(game);
    return this.toDto(savedGame);
  }

  /**
   * 선택 실행 (랜덤 이벤트 체크 추가)
   */
  async executeChoice(
    gameId: string,
    choiceId: number,
  ): Promise<GameResponseDto> {
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException(
        `게임이 이미 종료되었습니다: ${game.status}`,
      );
    }

    // ⭐ 이벤트 모드 처리 (이벤트 선택지 실행)
    if (game.eventMode && game.activeEventId) {
      return this.executeEventChoice(game, choiceId);
    }

    // ⭐ 일반 선택지 실행
    const choice = await this.choiceRepository.findOne({
      where: { choiceId },
    });

    if (!choice) {
      throw new NotFoundException(`선택지를 찾을 수 없습니다: ${choiceId}`);
    }

    if (choice.turnNumber !== game.currentTurn) {
      throw new BadRequestException(
        `현재 턴(${game.currentTurn})의 선택지가 아닙니다`,
      );
    }

    const config = this.getDifficultyConfig(game);
    const maxTurns = this.getMaxTurns(game);
    const recoveryMessages: string[] = [];

    // --- Phase 3: Turn-start recovery ---
    const turnRecovery = this.applyTurnStartRecovery(game, config);
    recoveryMessages.push(...turnRecovery);

    // --- 기존 선택 효과 적용 로직 (투자, 용량, 인프라 등) ---
    // ... (기존 코드 유지) ...

    // --- 턴 진행 ---
    let nextTurn = choice.nextTurn;

    if (nextTurn > maxTurns && !this.isSpecialTurn(nextTurn)) {
      nextTurn = maxTurns;
    }

    // ⭐ 랜덤 이벤트 체크 (핵심 추가 로직)
    const eventResult = await this.eventService.evaluateRandomEvent(game, nextTurn);

    if (eventResult.triggered && eventResult.event) {
      // 이벤트 발생: 이벤트 모드 전환
      game.eventMode = true;
      game.activeEventId = eventResult.event.eventId;
      game.returnTurn = nextTurn; // 이벤트 종료 후 돌아갈 턴 저장
      game.currentTurn = game.currentTurn; // 현재 턴 유지 (이벤트는 턴 소모 없음)

      this.logger.log(
        `랜덤 이벤트 전환: ${eventResult.event.eventId} (복귀 턴: ${nextTurn})`,
      );
    } else {
      // 이벤트 미발생: 정상 진행
      game.currentTurn = nextTurn;
    }

    // --- 승패 조건 체크 ---
    if (game.currentTurn !== GAME_CONSTANTS.IPO_SELECTION_TURN && !game.eventMode) {
      game.status = this.checkGameStatus(game);
    }

    // ... (나머지 기존 로직 유지) ...

    const updatedGame = await this.gameRepository.save(game);
    const dto = this.toDto(updatedGame);

    // ⭐ 이벤트 발생 시 추가 정보
    if (eventResult.triggered && eventResult.event) {
      dto.randomEventTriggered = true;
      dto.randomEventData = {
        eventId: eventResult.event.eventId,
        eventType: eventResult.event.eventType,
        eventText: this.eventService.renderEventText(eventResult.event, game),
        choices: eventResult.event.choices.map(c => ({
          choiceId: c.choiceId,
          text: c.text,
        })),
      };
    }

    return dto;
  }

  /**
   * 이벤트 선택지 실행 (새로 추가)
   */
  private async executeEventChoice(
    game: Game,
    choiceId: number,
  ): Promise<GameResponseDto> {
    const event = this.eventService.eventPool.get(game.activeEventId);

    if (!event) {
      throw new NotFoundException(`활성 이벤트를 찾을 수 없습니다: ${game.activeEventId}`);
    }

    const eventChoice = event.choices.find(c => c.choiceId === choiceId.toString());

    if (!eventChoice) {
      throw new BadRequestException(
        `이벤트 선택지가 아닙니다: ${choiceId} (이벤트: ${event.eventId})`,
      );
    }

    const config = this.getDifficultyConfig(game);
    const comebackMult = this.getComebackMultiplier(game, config);

    // 이벤트 효과 적용 (일반 선택지와 동일한 로직)
    let userGain = this.applyEffectMultiplier(
      Math.floor(eventChoice.effects.users * game.userAcquisitionMultiplier),
      config,
    );
    if (userGain > 0 && comebackMult > 1.0) {
      userGain = Math.floor(userGain * comebackMult);
    }
    game.users += userGain;

    let cashEffect = eventChoice.effects.cash;
    if (cashEffect > 0 && comebackMult > 1.0) {
      cashEffect = Math.floor(cashEffect * comebackMult);
    }
    game.cash += cashEffect;

    let trustGain = this.applyTrustEffectMultiplier(
      Math.floor(eventChoice.effects.trust * game.trustMultiplier),
      config,
    );
    if (trustGain > 0 && comebackMult > 1.0) {
      trustGain = Math.floor(trustGain * comebackMult);
    }
    game.trust += trustGain;

    // 인프라 추가
    game.infrastructure = this.mergeInfrastructure(
      game.infrastructure,
      eventChoice.effects.infra,
    );

    // 이벤트 히스토리 기록
    await this.eventService.recordEventOccurrence(game, event, eventChoice.choiceId);

    // 이벤트 종료: 이벤트 모드 해제
    game.eventMode = false;
    const returnTurn = eventChoice.returnTurn || game.returnTurn || game.currentTurn + 1;
    game.currentTurn = returnTurn;
    game.activeEventId = null;
    game.returnTurn = null;

    this.logger.log(`이벤트 종료: ${event.eventId} → 복귀 턴 ${returnTurn}`);

    // 승패 체크
    game.status = this.checkGameStatus(game);

    const updatedGame = await this.gameRepository.save(game);
    return this.toDto(updatedGame);
  }
}
```

---

## DTO 확장

### GameResponseDto 확장

**파일**: `backend/src/common/dto/game-response.dto.ts`

```typescript
export class GameResponseDto {
  // 기존 필드들...

  // --- 랜덤 이벤트 관련 필드 ---

  @ApiProperty({ description: '랜덤 이벤트 발생 여부', required: false })
  randomEventTriggered?: boolean;

  @ApiProperty({
    description: '발생한 랜덤 이벤트 데이터',
    required: false,
    type: Object,
  })
  randomEventData?: {
    eventId: string;
    eventType: string;
    eventText: string; // 템플릿 치환 완료된 텍스트
    choices: Array<{
      choiceId: string;
      text: string;
    }>;
  };
}
```

---

## 마이그레이션 전략

### SQLite 스키마 변경

**파일**: `backend/src/database/migrations/1710000000000-AddRandomEventSystem.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddRandomEventSystem1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Game 테이블에 컬럼 추가
    await queryRunner.addColumn(
      'games',
      new TableColumn({
        name: 'randomSeed',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'games',
      new TableColumn({
        name: 'eventMode',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'games',
      new TableColumn({
        name: 'activeEventId',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'games',
      new TableColumn({
        name: 'returnTurn',
        type: 'int',
        isNullable: true,
      }),
    );

    // 2. RandomEvent 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'random_events',
        columns: [
          {
            name: 'eventId',
            type: 'varchar',
            length: '64',
            isPrimary: true,
          },
          {
            name: 'eventType',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'priority',
            type: 'int',
            default: 50,
          },
          {
            name: 'condition',
            type: 'text', // JSON
          },
          {
            name: 'event',
            type: 'text',
          },
          {
            name: 'choices',
            type: 'text', // JSON
          },
          {
            name: 'metadata',
            type: 'text', // JSON
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_EVENT_TYPE_PRIORITY',
            columnNames: ['eventType', 'priority'],
          },
        ],
      }),
      true,
    );

    // 3. EventHistory 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'event_history',
        columns: [
          {
            name: 'historyId',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'gameId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'eventId',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'turnNumber',
            type: 'int',
          },
          {
            name: 'choiceId',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'gameStateSnapshot',
            type: 'text', // JSON
          },
          {
            name: 'occurredAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_HISTORY_GAME_EVENT',
            columnNames: ['gameId', 'eventId'],
          },
          {
            name: 'IDX_HISTORY_GAME_TURN',
            columnNames: ['gameId', 'turnNumber'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('event_history');
    await queryRunner.dropTable('random_events');
    await queryRunner.dropColumn('games', 'returnTurn');
    await queryRunner.dropColumn('games', 'activeEventId');
    await queryRunner.dropColumn('games', 'eventMode');
    await queryRunner.dropColumn('games', 'randomSeed');
  }
}
```

### 기존 게임 데이터 마이그레이션

**파일**: `backend/scripts/migrate-existing-games.ts`

```typescript
import { DataSource } from 'typeorm';
import { SeededRandom } from '../src/event/seeded-random';

async function migrateExistingGames() {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: 'database.sqlite',
    entities: [/* ... */],
  });

  await dataSource.initialize();

  const gameRepository = dataSource.getRepository('Game');
  const games = await gameRepository.find({
    where: { randomSeed: null },
  });

  console.log(`마이그레이션 대상: ${games.length}개 게임`);

  for (const game of games) {
    game.randomSeed = SeededRandom.generateSeed();
    game.eventMode = false;
    await gameRepository.save(game);
  }

  console.log('마이그레이션 완료');
  await dataSource.destroy();
}

migrateExistingGames().catch(console.error);
```

---

## 테스트 전략

### Unit Test: SeededRandom

**파일**: `backend/src/event/seeded-random.spec.ts`

```typescript
import { SeededRandom } from './seeded-random';

describe('SeededRandom', () => {
  it('should generate deterministic random numbers', () => {
    const seed = 'test-seed-123';
    const rng1 = new SeededRandom(seed);
    const rng2 = new SeededRandom(seed);

    const sequence1 = Array.from({ length: 10 }, () => rng1.next());
    const sequence2 = Array.from({ length: 10 }, () => rng2.next());

    expect(sequence1).toEqual(sequence2);
  });

  it('should generate different sequences for different seeds', () => {
    const rng1 = new SeededRandom('seed-A');
    const rng2 = new SeededRandom('seed-B');

    const sequence1 = Array.from({ length: 10 }, () => rng1.next());
    const sequence2 = Array.from({ length: 10 }, () => rng2.next());

    expect(sequence1).not.toEqual(sequence2);
  });

  it('should generate numbers in range [0, 1)', () => {
    const rng = new SeededRandom('range-test');

    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should generate integers in specified range', () => {
    const rng = new SeededRandom('int-test');

    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThanOrEqual(20);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
```

### Integration Test: EventService

**파일**: `backend/src/event/event.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RandomEventEntity } from '../database/entities/random-event.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { Game } from '../database/entities/game.entity';

describe('EventService', () => {
  let service: EventService;
  let eventRepository: Repository<RandomEventEntity>;
  let historyRepository: Repository<EventHistory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: getRepositoryToken(RandomEventEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(EventHistory),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    eventRepository = module.get(getRepositoryToken(RandomEventEntity));
    historyRepository = module.get(getRepositoryToken(EventHistory));
  });

  describe('evaluateRandomEvent', () => {
    it('should trigger event when conditions met', async () => {
      const mockEvent: RandomEventEntity = {
        eventId: 'test_event',
        eventType: 'disaster',
        priority: 90,
        condition: {
          turnRange: [10, 20],
          probability: 1.0, // 100% 확률
          minUsers: 10000,
        },
        event: 'Test event text',
        choices: [
          {
            choiceId: 'test_choice_1',
            text: 'Choice 1',
            effects: { users: 0, cash: -10000, trust: -5, infra: [] },
          },
        ],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock event pool
      service['eventPool'].set('test_event', mockEvent);
      service['buildTurnIndex']();

      const game = new Game();
      game.gameId = 'test-game-id';
      game.randomSeed = 'test-seed';
      game.currentTurn = 10;
      game.users = 15000; // Meets minUsers
      game.cash = 10000000;
      game.trust = 50;
      game.infrastructure = ['EC2'];
      game.eventMode = false;
      game.difficultyMode = 'NORMAL';

      const result = await service.evaluateRandomEvent(game, 15);

      expect(result.triggered).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.eventId).toBe('test_event');
    });

    it('should not trigger when conditions not met', async () => {
      const mockEvent: RandomEventEntity = {
        eventId: 'test_event',
        eventType: 'disaster',
        priority: 90,
        condition: {
          turnRange: [10, 20],
          probability: 1.0,
          minUsers: 100000, // 높은 임계값
        },
        event: 'Test event text',
        choices: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service['eventPool'].set('test_event', mockEvent);
      service['buildTurnIndex']();

      const game = new Game();
      game.gameId = 'test-game-id';
      game.randomSeed = 'test-seed';
      game.currentTurn = 10;
      game.users = 15000; // 조건 미달
      game.cash = 10000000;
      game.trust = 50;
      game.infrastructure = ['EC2'];
      game.eventMode = false;
      game.difficultyMode = 'NORMAL';

      const result = await service.evaluateRandomEvent(game, 15);

      expect(result.triggered).toBe(false);
      expect(result.debugInfo.failedConditions['test_event']).toContain('유저 수 부족');
    });

    it('should respect maxOccurrences limit', async () => {
      const mockEvent: RandomEventEntity = {
        eventId: 'test_event',
        eventType: 'opportunity',
        priority: 80,
        condition: {
          turnRange: [10, 20],
          probability: 1.0,
          maxOccurrences: 1,
        },
        event: 'Test event text',
        choices: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service['eventPool'].set('test_event', mockEvent);
      service['buildTurnIndex']();

      // Mock history: 이미 1번 발생
      jest.spyOn(historyRepository, 'count').mockResolvedValue(1);

      const game = new Game();
      game.gameId = 'test-game-id';
      game.randomSeed = 'test-seed';
      game.currentTurn = 10;
      game.users = 15000;
      game.cash = 10000000;
      game.trust = 50;
      game.infrastructure = ['EC2'];
      game.eventMode = false;
      game.difficultyMode = 'NORMAL';

      const result = await service.evaluateRandomEvent(game, 15);

      expect(result.triggered).toBe(false);
      expect(result.debugInfo.failedConditions['test_event']).toContain('최대 발생 횟수 초과');
    });
  });

  describe('renderEventText', () => {
    it('should replace template variables', () => {
      const event: RandomEventEntity = {
        eventId: 'test',
        event: '현재 유저: {currentUsers}명, 자금: {currentCash}, 신뢰도: {currentTrust}%',
        eventType: 'disaster',
        priority: 50,
        condition: { turnRange: [1, 25], probability: 0.1 },
        choices: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const game = new Game();
      game.users = 120000;
      game.cash = 50000000;
      game.trust = 75;

      const rendered = service.renderEventText(event, game);

      expect(rendered).toBe('현재 유저: 120,000명, 자금: ₩50,000,000, 신뢰도: 75%');
    });
  });
});
```

### E2E Test: 랜덤 이벤트 발생 시나리오

**파일**: `backend/test/event-flow.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Random Event Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should trigger random event and handle choice', async () => {
    // 1. 게임 생성
    const createResponse = await request(app.getHttpServer())
      .post('/api/game/start')
      .send({ difficultyMode: 'NORMAL' })
      .expect(201);

    const gameId = createResponse.body.gameId;

    // 2. 여러 턴 진행 (이벤트 발생 조건 충족)
    let currentTurn = 1;
    let eventTriggered = false;

    for (let i = 0; i < 15; i++) {
      // 턴 정보 조회
      const turnResponse = await request(app.getHttpServer())
        .get(`/api/turn/${currentTurn}`)
        .expect(200);

      const firstChoiceId = turnResponse.body.choices[0].choiceId;

      // 선택 실행
      const choiceResponse = await request(app.getHttpServer())
        .post(`/api/game/${gameId}/choice`)
        .send({ choiceId: firstChoiceId })
        .expect(200);

      currentTurn = choiceResponse.body.currentTurn;

      // 랜덤 이벤트 발생 감지
      if (choiceResponse.body.randomEventTriggered) {
        eventTriggered = true;

        expect(choiceResponse.body.randomEventData).toBeDefined();
        expect(choiceResponse.body.randomEventData.eventId).toBeDefined();
        expect(choiceResponse.body.randomEventData.choices.length).toBeGreaterThan(0);

        // 이벤트 선택지 실행
        const eventChoiceId = choiceResponse.body.randomEventData.choices[0].choiceId;
        const eventChoiceResponse = await request(app.getHttpServer())
          .post(`/api/game/${gameId}/choice`)
          .send({ choiceId: eventChoiceId })
          .expect(200);

        expect(eventChoiceResponse.body.randomEventTriggered).toBeFalsy();
        expect(eventChoiceResponse.body.currentTurn).toBeGreaterThan(currentTurn);

        break;
      }
    }

    // 주의: 확률 기반 이벤트이므로 항상 발생하지는 않음
    // 실제 테스트에서는 고정 시드 + 100% 확률 이벤트 사용 권장
  });
});
```

---

## 성능 최적화

### 1. 메모리 캐싱

```typescript
// EventService에서 이미 구현됨
private eventPool: Map<string, RandomEventEntity> = new Map();
private turnIndexedEvents: Map<number, RandomEventEntity[]> = new Map();
```

- **JSON 파일 1회 로드**: Module 초기화 시 메모리 적재
- **턴별 인덱싱**: O(n) 스캔 → O(1) 조회
- **캐시 무효화**: JSON 파일 변경 시 서버 재시작 필요 (향후 hot-reload 추가 가능)

### 2. 조건 평가 최적화

```typescript
// 단순 조건 먼저 평가 (빠른 실패)
if (cond.difficultyModes && !cond.difficultyModes.includes(mode)) {
  return { passed: false, reason: '난이도 불일치' };
}

// DB 쿼리 최후 (가장 비용 큰 연산)
if (cond.maxOccurrences !== undefined) {
  const count = await this.historyRepository.count({ ... });
  // ...
}
```

### 3. 히스토리 쿼리 최적화

```typescript
// 인덱스 활용
@Index(['gameId', 'eventId'])
@Index(['gameId', 'turnNumber'])
export class EventHistory { ... }
```

---

## 보안 고려사항

### 1. 클라이언트 검증 우회 방지

- **문제**: 클라이언트가 이벤트 ID를 조작하여 유리한 이벤트 선택
- **해결**: 서버에서 `game.activeEventId` 검증, 불일치 시 거부

```typescript
if (game.activeEventId !== event.eventId) {
  throw new UnauthorizedException('이벤트 조작 시도 감지');
}
```

### 2. 시드 무결성 보장

- **문제**: 클라이언트가 유리한 시드 요청
- **해결**: 서버에서 `crypto.randomBytes()` 생성, 클라이언트 조작 불가

```typescript
game.randomSeed = SeededRandom.generateSeed(); // 서버 측에서만 생성
```

### 3. 이벤트 히스토리 감사

- **목적**: 어뷰징 탐지 (같은 이벤트 반복 발생)
- **방법**: EventHistory 로그 분석, 통계적 이상치 탐지

```typescript
async detectAnomalies(gameId: string): Promise<boolean> {
  const history = await this.historyRepository.find({ where: { gameId } });
  const eventCounts = history.reduce((acc, h) => {
    acc[h.eventId] = (acc[h.eventId] || 0) + 1;
    return acc;
  }, {});

  // 동일 이벤트 5회 이상 발생 시 의심
  return Object.values(eventCounts).some(count => count > 5);
}
```

---

## 에러 처리

### Graceful Degradation

```typescript
// EventService.loadEventPool()
try {
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  // ...
} catch (error) {
  this.logger.error(`이벤트 풀 로드 실패: ${error.message}`, error.stack);
  // 빈 풀로 계속 진행 (이벤트 없이 게임 가능)
}
```

### 트랜잭션 보장

```typescript
async executeEventChoice(game: Game, choiceId: number): Promise<GameResponseDto> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 효과 적용
    game.cash += eventChoice.effects.cash;
    // ...

    // 히스토리 기록
    await this.eventService.recordEventOccurrence(game, event, choiceId);

    // 게임 상태 저장
    await queryRunner.manager.save(game);

    await queryRunner.commitTransaction();
    return this.toDto(game);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

---

## 구현 우선순위

### Phase 1: 기본 인프라 (1주)

- [ ] `SeededRandom` 클래스 구현 및 테스트
- [ ] `RandomEvent`, `EventHistory` 엔티티 생성
- [ ] `random_events.json` 파일 구조 설계
- [ ] 마이그레이션 스크립트 작성
- [ ] `Game` 엔티티 확장 (randomSeed, eventMode 등)

### Phase 2: EventService 구현 (1주)

- [ ] `EventService.loadEventPool()` 구현
- [ ] `EventService.buildTurnIndex()` 구현
- [ ] `EventService.evaluateRandomEvent()` 구현
- [ ] 조건 평가 로직 (`evaluateConditions()`)
- [ ] 템플릿 렌더링 (`renderEventText()`)
- [ ] 히스토리 기록 (`recordEventOccurrence()`)

### Phase 3: GameService 통합 (1주)

- [ ] `startGame()` 시드 생성 로직 추가
- [ ] `executeChoice()` 이벤트 체크 로직 통합
- [ ] `executeEventChoice()` 메서드 구현
- [ ] `GameResponseDto` 확장 (randomEventData)
- [ ] 트랜잭션 보장 로직 추가

### Phase 4: 이벤트 콘텐츠 작성 (2주)

- [ ] 재난 이벤트 10개 (AWS 장애, 보안 사고, 경쟁사 공격 등)
- [ ] 기회 이벤트 10개 (긴급 투자, 제휴 제안, 인재 영입 등)
- [ ] 시장 변화 이벤트 5개 (규제 변화, 트렌드 전환 등)
- [ ] 난이도별 확률/조건 밸런스 조정

### Phase 5: 테스트 및 검증 (1주)

- [ ] Unit Test (SeededRandom, EventService)
- [ ] Integration Test (조건 평가, 히스토리 기록)
- [ ] E2E Test (전체 이벤트 플로우)
- [ ] 성능 테스트 (1000개 이벤트 풀 로드)
- [ ] 재현성 검증 (같은 시드 → 같은 결과)

### Phase 6: 운영 준비 (1주)

- [ ] 어드민 페이지: 이벤트 풀 관리 UI
- [ ] 모니터링: 이벤트 발생 통계 대시보드
- [ ] 로깅: 이벤트 발생/선택 감사 로그
- [ ] 문서화: API 스펙, 이벤트 작성 가이드

---

## 예시 시나리오

### 시나리오 1: AWS 리전 장애

**조건**:
- 턴: 10~20
- 유저 수: 100,000명 이상
- 난이도: NORMAL, HARD
- 확률: 8%
- 최대 발생: 1회

**이벤트 발생**:
```
🚨 AWS ap-northeast-2 리전 장애!

서울 리전 전체 다운... 서비스 중단 중

현재 유저: 120,000명 대기 중
현재 신뢰도: 65%
```

**선택지**:
1. 멀티 리전 긴급 구축 (₩50,000,000) → cash -50M, trust +15, infra +multi-region
2. 복구 대기 (6시간, 유저 30% 이탈) → users -30000, trust -40

**결과**:
- 선택 1: 비용 부담 크지만 장기적 안정성 확보
- 선택 2: 단기 비용 절감, 신뢰도 급락 리스크

### 시나리오 2: 긴급 브릿지 라운드

**조건**:
- 턴: 8~22
- 자금: 5,000,000원 이하
- 확률: 30%
- 최대 발생: 2회

**이벤트 발생**:
```
💼 긴급 투자 기회!

파산 직전 상황을 본 투자자가 연락...

현금: ₩2,500,000
필요 금액: 최소 ₩5,000,000
```

**선택지**:
1. 수락 - ₩30,000,000 (지분 35% 양도) → cash +30M, trust -15
2. 거절 - 비용 절감 모드로 전환 → users -20000, cash +5M

**결과**:
- 선택 1: 단기 생존 보장, 지분 희석
- 선택 2: 구조조정 통한 자구책

---

## 확장 가능성

### 1. 연쇄 이벤트

```typescript
export interface RandomEvent {
  // ...
  chainedEvent?: {
    nextEventId: string;
    condition: RandomEventCondition;
  };
}
```

### 2. 이벤트 효과 지연

```typescript
export interface RandomEventChoice {
  // ...
  delayedEffects?: {
    turns: number; // 3턴 후 효과 발생
    effects: ChoiceEffects;
  };
}
```

### 3. 동적 확률 조정

```typescript
// 게임 진행 상황에 따라 확률 동적 변경
condition: {
  turnRange: [10, 20],
  baseProbability: 0.1,
  probabilityMultipliers: {
    trustBelow30: 2.0, // 신뢰도 30% 미만 시 2배
    cashBelow5M: 1.5,  // 자금 500만원 미만 시 1.5배
  }
}
```

### 4. 플레이어 선택 기반 이벤트

```typescript
// 이전 선택에 따라 발생 확률 변경
condition: {
  turnRange: [15, 25],
  probability: 0.2,
  requiredPreviousChoices: [101, 205], // 특정 선택지를 골랐을 경우에만
}
```

---

## 결론

이 개선된 이벤트 시스템은 다음을 보장합니다:

1. **보안**: crypto 기반 시드, 서버 검증, 감사 로그
2. **성능**: O(1) 조회, 메모리 캐싱, 인덱스 최적화
3. **테스트 가능성**: Seeded RNG로 재현 가능한 테스트
4. **확장성**: 난이도별 분리, 이벤트 타입 확장 구조
5. **에러 처리**: Graceful degradation, 트랜잭션 보장

**권장 구현 순서**: Phase 1 → 2 → 3 → 4 → 5 → 6 (총 7주 예상)

**핵심 변경사항**:
- Math.random() → SeededRandom (재현성)
- pendingEvent → activeEventId + eventMode (명확한 상태)
- 파일 I/O → 메모리 캐싱 (성능)
- 중복 허용 → maxOccurrences (밸런스)
- 에러 무시 → Graceful degradation + Transaction (안정성)
