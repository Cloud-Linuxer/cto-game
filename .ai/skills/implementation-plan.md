# Skill: Implementation Plan

**사용자**: Client AI, Server AI
**목적**: 기능 구현을 위한 구체적인 계획을 수립한다 (아키텍처, 순서, 리스크).

---

## 입력

- **Designer AI의 Feature Spec** (게임 규칙, 비즈니스 로직)
- **Producer AI의 EPIC** (전체 Feature 맥락)
- `.ai/context/client-arch.md` or `.ai/context/server-arch.md` (아키텍처)
- `.ai/context/specs/api-spec.md` (API 스펙)
- 기존 코드베이스 (`frontend/` or `backend/`)

---

## 출력

- **Implementation Plan 문서**
  - Client: `docs/implementation/IMPL-CLIENT-{번호}-{제목}.md`
  - Server: `docs/implementation/IMPL-SERVER-{번호}-{제목}.md`
- 템플릿: `.ai/templates/implementation-template.md`

---

## 절차

### Step 1: 요구사항 분석

1. Designer AI의 Feature Spec을 읽고 **핵심 기능**을 추출한다
2. **기술적 제약**을 파악한다
3. **기존 코드와의 통합 지점**을 식별한다

**체크리스트**:
- [ ] 비즈니스 로직이 명확한가?
- [ ] API 스펙이 정의되어 있는가? (Server AI)
- [ ] UI/UX 요구사항이 명확한가? (Client AI)
- [ ] 기존 컴포넌트/모듈을 재사용할 수 있는가?

---

### Step 2: 아키텍처 설계

#### Client AI의 경우

1. **컴포넌트 구조** 설계
   - Atomic Design 원칙 적용 (atoms/molecules/organisms/templates/pages)
   - 컴포넌트 트리 작성

2. **상태 관리** 설계
   - Global State vs Local State 구분
   - Redux Store 구조 (slices, actions, selectors)
   - 비동기 처리 전략 (RTK Query or React Query)

3. **API 연동** 설계
   - API 호출 시점
   - 에러 처리
   - 로딩 상태 관리
   - 캐싱 전략

**예시**:
```markdown
### 컴포넌트 구조

```
components/
  EventPopup/
    EventPopup.tsx          # Container
    EventHeader.tsx         # Presentation
    ChoiceList.tsx          # Presentation
    ChoiceCard.tsx          # Presentation
    EventFooter.tsx         # Presentation
```

### 상태 관리

```typescript
// Redux Store
interface EventState {
  currentEvent: Event | null;
  loading: boolean;
  error: string | null;
}

// Actions
- triggerEvent(gameId, turnNumber)
- selectChoice(gameId, choiceId)
- clearEvent()

// Selectors
- selectCurrentEvent
- selectEventLoading
- selectEventError
```

### API 연동

```typescript
// RTK Query
const eventApi = createApi({
  endpoints: (builder) => ({
    triggerEvent: builder.mutation<Event, TriggerEventRequest>({
      query: (req) => ({
        url: '/api/event/trigger',
        method: 'POST',
        body: req,
      }),
    }),
  }),
});
```
```

---

#### Server AI의 경우

1. **모듈 구조** 설계
   - NestJS 모듈 구조 (controller, service, repository)
   - 레이어 분리 (presentation, business, data)

2. **API 엔드포인트** 설계
   - RESTful 원칙 준수
   - Request/Response DTO 정의
   - 에러 코드 체계

3. **DB 스키마** 설계
   - Entity 정의
   - 관계 설정 (OneToMany, ManyToOne 등)
   - 인덱스 전략
   - Migration 작성

4. **비즈니스 로직** 설계
   - Service Layer 책임 정의
   - 트랜잭션 경계
   - 도메인 모델

**예시**:
```markdown
### 모듈 구조

```
backend/src/event/
  event.controller.ts      # API 엔드포인트
  event.service.ts         # 비즈니스 로직
  event-matcher.service.ts # 이벤트 매칭 로직
  event.module.ts          # 모듈 정의
  dto/
    trigger-event.dto.ts
    event-response.dto.ts
  entities/
    dynamic-event.entity.ts
    event-history.entity.ts
```

### API 설계

```yaml
POST /api/event/trigger
Request:
  gameId: string (UUID)
  turnNumber: number (1-25)
Response:
  200:
    eventId: string
    eventText: string
    choices: Choice[]
  404: Game not found
  409: Event already triggered this turn
  500: Internal error
```

### DB 스키마

```typescript
@Entity()
export class DynamicEvent {
  @PrimaryGeneratedColumn('uuid')
  eventId: string;

  @Column('text')
  eventText: string;

  @Column('jsonb')
  triggerConditions: TriggerCondition[];

  @Column('jsonb')
  choices: Choice[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity()
export class EventHistory {
  @PrimaryGeneratedColumn('uuid')
  historyId: string;

  @Column()
  gameId: string;

  @Column()
  eventId: string;

  @Column()
  turnNumber: number;

  @Column({ nullable: true })
  selectedChoiceId: string;

  @CreateDateColumn()
  triggeredAt: Date;

  @ManyToOne(() => Game)
  game: Game;

  @ManyToOne(() => DynamicEvent)
  event: DynamicEvent;
}
```

### 비즈니스 로직

```typescript
class EventService {
  async triggerEvent(gameId: string, turnNumber: number): Promise<Event> {
    // 1. 게임 상태 조회
    const game = await this.gameService.findOne(gameId);

    // 2. 이미 이벤트 발생했는지 확인
    const existingEvent = await this.eventHistoryRepo.findOne({
      where: { gameId, turnNumber }
    });
    if (existingEvent) {
      throw new ConflictException('Event already triggered');
    }

    // 3. 이벤트 매칭
    const matchedEvents = await this.eventMatcher.match(game);

    // 4. 랜덤 선택
    const selectedEvent = this.selectRandom(matchedEvents);

    // 5. 히스토리 저장
    await this.eventHistoryRepo.save({
      gameId,
      eventId: selectedEvent.eventId,
      turnNumber,
    });

    // 6. 반환
    return selectedEvent;
  }
}
```
```

---

### Step 3: 보안 설계 (Server AI only)

1. **입력 검증**
   - DTO validation (class-validator)
   - SQL Injection 방지
   - XSS 방지

2. **인증/인가** (Phase 1+)
   - JWT 토큰 검증
   - Role-based access control

3. **Rate Limiting** (Phase 1+)
   - API 호출 제한
   - DDoS 방어

**예시**:
```markdown
## 보안

### Input Validation

```typescript
export class TriggerEventDto {
  @IsUUID()
  gameId: string;

  @IsInt()
  @Min(1)
  @Max(25)
  turnNumber: number;
}
```

### Error Handling

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 에러 로깅
    // 클라이언트에는 안전한 메시지만 노출
  }
}
```
```

---

### Step 4: 성능 최적화

1. **Client AI**: Code Splitting, Lazy Loading, Memoization
2. **Server AI**: Query Optimization, Caching, Indexing

**예시 (Client)**:
```markdown
## 성능 최적화

### Code Splitting
```typescript
const EventPopup = lazy(() => import('./EventPopup'));
```

### Memoization
```typescript
const ChoiceCard = React.memo(({ choice, onSelect }) => {
  // ...
});

const memoizedChoices = useMemo(() => {
  return choices.map(c => ({ ...c, score: calculateScore(c) }));
}, [choices]);
```

### Debouncing
```typescript
const debouncedSearch = useDeferredValue(searchQuery);
```
```

**예시 (Server)**:
```markdown
## 성능 최적화

### Query Optimization
```typescript
// N+1 방지: Eager Loading
const game = await this.gameRepo.findOne({
  where: { gameId },
  relations: ['choiceHistory', 'eventHistory'],
});
```

### Caching (Phase 1+)
```typescript
@Cacheable('event-pool', { ttl: 3600 })
async getEventPool(): Promise<Event[]> {
  return this.eventRepo.find();
}
```

### Indexing
```sql
CREATE INDEX idx_event_history_game_turn
ON event_history (gameId, turnNumber);
```
```

---

### Step 5: 구현 순서 정의

1. **우선순위**를 고려한 구현 순서 작성
2. **테스트 전략** 명시 (Unit/Integration/E2E)
3. **마일스톤** 정의

**예시**:
```markdown
## 구현 순서

### Milestone 1: 기본 구조 (Day 1-2)
1. [ ] Entity 생성 (DynamicEvent, EventHistory)
2. [ ] Migration 작성 및 테스트
3. [ ] DTO 정의 (Request/Response)
4. [ ] Module 구조 생성

### Milestone 2: 비즈니스 로직 (Day 3-4)
5. [ ] EventService 구현 (triggerEvent)
6. [ ] EventMatcherService 구현 (조건 매칭)
7. [ ] Unit Test 작성
8. [ ] Integration Test 작성

### Milestone 3: API 엔드포인트 (Day 5)
9. [ ] Controller 구현
10. [ ] Swagger 문서 업데이트
11. [ ] E2E Test 작성

### Milestone 4: 최적화 및 정리 (Day 6)
12. [ ] 에러 처리 개선
13. [ ] 로깅 추가
14. [ ] 코드 리뷰 준비
```

---

### Step 6: 리스크 및 고려사항

1. **기술 리스크** 식별
2. **대응 방안** 제시
3. **우회 방안** 준비

**예시**:
```markdown
## 리스크 및 고려사항

| 리스크 | 영향도 | 대응 방안 | 우회 방안 |
|--------|--------|-----------|-----------|
| 이벤트 매칭 로직 복잡도 증가 | High | Rule Engine 패턴 적용 | 단순 조건만 먼저 지원 |
| DB 쿼리 성능 저하 | Medium | 인덱스 추가, Query 최적화 | 캐싱 적용 |
| 동시성 이슈 (중복 이벤트) | High | Unique constraint 추가 | Transaction isolation 강화 |
| Frontend 상태 동기화 | Medium | Redux DevTools로 디버깅 | 불변성 엄격히 유지 |
```

---

### Step 7: QA 요청사항

QA AI에게 전달할 테스트 요청사항을 작성한다.

```markdown
## QA 요청사항

### Unit Test
- [ ] EventService.triggerEvent() - 정상 케이스
- [ ] EventService.triggerEvent() - 게임 없음 (404)
- [ ] EventService.triggerEvent() - 중복 이벤트 (409)
- [ ] EventMatcherService.match() - 조건 매칭 로직

### Integration Test
- [ ] POST /api/event/trigger - 정상 요청
- [ ] POST /api/event/trigger - 잘못된 gameId
- [ ] POST /api/event/trigger - 잘못된 turnNumber

### Edge Case
- [ ] 이벤트 풀이 비어있을 때
- [ ] 동일 턴에 이벤트 중복 요청
- [ ] DB 트랜잭션 실패 시 롤백

### Performance Test
- [ ] 이벤트 매칭 로직 < 100ms
- [ ] API 응답 시간 < 200ms (p95)
```

---

## 품질 체크

작성한 Implementation Plan이 아래 기준을 충족하는지 확인한다:

- [ ] 아키텍처가 명확하고 일관성 있는가?
- [ ] API/컴포넌트 인터페이스가 구체적인가?
- [ ] 보안이 고려되었는가? (Server)
- [ ] 성능 최적화 전략이 있는가?
- [ ] 구현 순서가 논리적인가?
- [ ] 리스크가 식별되고 대응 방안이 있는가?
- [ ] QA 요청사항이 구체적인가?

---

## 안티 패턴 (하지 말 것)

❌ **게임 규칙을 임의로 변경**
→ Designer AI와 협의 필요

❌ **보안을 희생한 구현**
→ 성능 이유로도 보안은 타협하지 않음

❌ **테스트 없는 구현**
→ 모든 비즈니스 로직은 Unit Test 필수

❌ **기존 아키텍처 무시**
→ 일관성 유지가 우선

❌ **구현 시간 추정**
→ "3일 소요" 같은 표현 금지

---

**문서 버전**: v1.0
**최종 업데이트**: 2026-02-04
