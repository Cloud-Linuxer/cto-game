# Event System Test Suite

이벤트 시스템의 포괄적인 테스트 코드입니다.

## 파일 구조

```
/home/cto-game/backend/src/event/
├── event.service.spec.ts           (931 lines) - 단위 테스트
├── event-integration.spec.ts       (786 lines) - 통합 테스트
├── event-edge-cases.spec.ts        (905 lines) - 엣지 케이스 테스트
├── EVENT_TEST_SUMMARY.md           (355 lines) - 테스트 요약 문서
└── README.md                       (this file)
```

**총 라인 수**: 2,977 lines

## 빠른 시작

### 1. 필수 패키지 설치
```bash
npm install --save seedrandom
npm install --save-dev @types/seedrandom
```

### 2. 테스트 실행
```bash
# 전체 테스트
npm run test

# 특정 테스트 파일
npm run test event.service.spec.ts
npm run test event-integration.spec.ts
npm run test event-edge-cases.spec.ts

# 커버리지 리포트
npm run test:cov
```

## 테스트 개요

### event.service.spec.ts (31개 테스트)
단위 테스트로 개별 기능을 검증합니다.

**주요 테스트 항목**:
- ✅ 이벤트 조건 검증 (턴, 유저, 자금, 신뢰도, 인프라)
- ✅ 확률 기반 트리거 (Seeded random으로 재현 가능)
- ✅ 이벤트 우선순위 (연쇄 > 위기 > 기회 > 랜덤)
- ✅ 중복 이벤트 방지
- ✅ 인프라 기반 자동 방어 (CloudFront, Aurora, DR, Multi-region)
- ✅ 연쇄 이벤트 트리거
- ✅ 경계값 테스트

### event-integration.spec.ts (12개 테스트)
전체 플로우 및 게임 서비스와의 통합을 테스트합니다.

**주요 시나리오**:
- ✅ 이벤트 트리거 → 응답 선택 → 효과 적용 → 원래 턴 복귀
- ✅ 연쇄 이벤트 1→2→3 단계 전체 플로우
- ✅ 위기 이벤트 자동 방어 적용
- ✅ 이벤트와 기존 턴 시스템 통합
- ✅ 이벤트 상태 저장 및 복원
- ✅ 이벤트 중 게임 종료 조건

### event-edge-cases.spec.ts (33개 테스트)
경계값, 오류 상황, 예외 케이스를 테스트합니다.

**주요 엣지 케이스**:
- ✅ 중복 이벤트 방지 (동시 실행, 재발생)
- ✅ returnTurn 경계값 처리 (음수, 초과, null)
- ✅ 이벤트 중 게임 종료 조건 (파산, 장애, 지분)
- ✅ 난이도별 확률 배율 경계값
- ✅ 인프라 조건 엣지 케이스
- ✅ 잘못된 이벤트 데이터 처리
- ✅ 연쇄 이벤트 경로 분기 오류

## 테스트 통계

| 항목 | 개수 |
|------|------|
| 총 테스트 파일 | 3개 |
| 총 테스트 케이스 | 76개 |
| 예상 전체 커버리지 | 90%+ |

## 구현 필요 사항

이 테스트는 **미래의 EventService 구현**을 위한 스펙입니다. 다음 항목을 구현해야 합니다:

### 1. EventService 클래스
```typescript
/home/cto-game/backend/src/event/event.service.ts
```

**필수 메서드**:
- `evaluateEventTrigger(game: Game): Promise<DynamicEvent | null>`
- `executeEventResponse(game: Game, eventId: string, responseId: string): Promise<Game>`
- `checkTriggerCondition(game: Game, event: DynamicEvent): boolean`
- `calculateAutoDefense(game: Game, event: DynamicEvent): number`
- `checkChainEventPath(game: Game, event: DynamicEvent): boolean`
- `prioritizeEvents(game: Game, events: DynamicEvent[]): DynamicEvent[]`
- `getDifficultyEventMultiplier(difficultyMode: string): number`
- `calculateFinalProbability(game: Game, event: DynamicEvent): number`

### 2. DynamicEvent 엔티티
```typescript
/home/cto-game/backend/src/database/entities/dynamic-event.entity.ts
```

**필수 필드**:
```typescript
export enum EventType {
  RANDOM = 'RANDOM',
  CHAIN = 'CHAIN',
  CRISIS = 'CRISIS',
  OPPORTUNITY = 'OPPORTUNITY',
  SEASONAL = 'SEASONAL',
}

export enum EventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface EventTriggerCondition {
  minTurn?: number;
  maxTurn?: number;
  minUsers?: number;
  maxUsers?: number;
  minCash?: number;
  maxCash?: number;
  minTrust?: number;
  maxTrust?: number;
  requireInfra?: string[];
  excludeInfra?: string[];
  baseProbability: number;
  requirePreviousEvent?: string;
}

export interface EventResponse {
  responseId: string;
  text: string;
  effects: {
    users: number;
    cash: number;
    trust: number;
    infra: string[];
  };
  requireInfra?: string[];
  awsLesson: string;
  triggersEvent?: string;
  equityDilution?: number;
}

export interface AutoDefense {
  condition: { requireInfra: string[] };
  effect?: string;
  damageReduction: number;
}

@Entity('dynamic_events')
export class DynamicEvent {
  @PrimaryColumn()
  eventId: string;

  @Column({ type: 'text' })
  type: EventType;

  @Column({ type: 'text' })
  severity: EventSeverity;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json' })
  triggerCondition: EventTriggerCondition;

  @Column({ type: 'simple-json' })
  responses: EventResponse[];

  @Column({ type: 'simple-json', nullable: true })
  autoDefense?: AutoDefense[];

  @Column({ type: 'text', nullable: true })
  chainId?: string;

  @Column({ type: 'int', default: 0 })
  chainOrder: number;

  @Column({ type: 'boolean', default: true })
  repeatable: boolean;
}
```

### 3. Game 엔티티 확장
```typescript
/home/cto-game/backend/src/database/entities/game.entity.ts
```

**추가할 컬럼**:
```typescript
@Column({ type: 'simple-json', default: '[]' })
activeEvents: string[];

@Column({ type: 'simple-json', default: '[]' })
completedEvents: string[];

@Column({ type: 'simple-json', default: '{}' })
eventFlags: Record<string, any>;

@Column({ type: 'int', default: 0 })
eventSeed: number;

@Column({ type: 'int', nullable: true })
returnToTurn: number | null;
```

## 참고 문서

- **PRD**: `/home/cto-game/docs/dynamic-event-system-prd.md`
- **Part 2**: `/home/cto-game/docs/dynamic-event-system-prd-part2.md`
- **Part 3**: `/home/cto-game/docs/dynamic-event-system-prd-part3.md`
- **게임 시스템**: `/home/cto-game/docs/GAME_SYSTEM.md`
- **테스트 요약**: `./EVENT_TEST_SUMMARY.md`

## 개발 순서 권장

1. **seedrandom 패키지 설치**
2. **DynamicEvent 엔티티 생성**
3. **Game 엔티티 확장**
4. **EventService 기본 구조 생성**
5. **단위 테스트부터 하나씩 통과시키기**
6. **통합 테스트 통과**
7. **엣지 케이스 테스트 통과**

## 품질 목표

- ✅ 테스트 커버리지 90%+
- ✅ 재현 가능한 확률 테스트 (Seeded random)
- ✅ 기존 game.service.spec.ts 패턴 준수
- ✅ 모든 엣지 케이스 커버
- ✅ 명확한 테스트 설명 (한글)

---

**작성일**: 2026-02-04
**작성자**: Quality Engineer (Claude Code)
**버전**: 1.0
