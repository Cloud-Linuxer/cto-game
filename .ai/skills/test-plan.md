# Skill: Test Plan

**사용자**: QA AI
**목적**: 기능 검증을 위한 테스트 시나리오와 수용 기준을 작성한다.

---

## 입력

- **Designer AI의 Feature Spec** (게임 규칙, 수용 기준)
- **Client/Server AI의 Implementation Plan** (구현 세부사항)
- **Producer AI의 EPIC** (전체 기능 범위)
- `.ai/context/release-rules.md` - 릴리즈 규칙
- 기존 테스트 코드 (`backend/src/**/*.spec.ts`)

---

## 출력

- **Test Plan 문서** (`docs/test-plans/TEST-{번호}-{제목}.md`)
- 템플릿: `.ai/templates/test-template.md`

---

## 절차

### Step 1: 테스트 범위 정의

1. **In Scope**: 테스트 대상 명시
2. **Out of Scope**: 테스트 제외 대상 명시
3. **테스트 목표** 설정

**예시**:
```markdown
## 테스트 범위

### In Scope
- 이벤트 트리거 API 기능 검증
- 이벤트 매칭 로직 정확성
- 이벤트 히스토리 저장 및 조회
- 중복 이벤트 방지
- Edge Case 처리

### Out of Scope
- 성능 테스트 (별도 진행)
- 보안 테스트 (별도 진행)
- UI 디자인 검증 (Designer 검토)

## 테스트 목표
- 이벤트 시스템이 Feature Spec에 명시된 게임 규칙을 정확히 구현하는지 검증
- 모든 Edge Case가 올바르게 처리되는지 확인
- 회귀 테스트를 통해 기존 기능이 정상 작동하는지 검증
```

---

### Step 2: 테스트 시나리오 작성

각 시나리오는 다음 요소를 포함한다:
1. **목적**: 무엇을 검증하는가
2. **전제 조건**: 테스트 실행 전 상태
3. **단계**: 실행할 액션
4. **예상 결과**: 기대하는 결과
5. **상태**: Pending / Pass / Fail

**시나리오 타입**:
- **Happy Path**: 정상 사용자 플로우
- **Sad Path**: 에러 케이스
- **Edge Case**: 극단적 상황
- **Boundary Case**: 경계값 테스트

**예시**:
```markdown
## 테스트 시나리오

### Scenario 1: Happy Path - 정상 이벤트 트리거
**목적**: 유저가 턴 종료 시 이벤트를 정상적으로 받는지 검증

**전제 조건**:
- 게임이 생성되어 있음 (gameId = "test-game-123")
- 현재 Turn = 10
- 이벤트 풀에 이벤트가 존재함

**단계**:
1. POST /api/event/trigger
   ```json
   {
     "gameId": "test-game-123",
     "turnNumber": 10
   }
   ```
2. 응답 확인

**예상 결과**:
- HTTP 200 OK
- Response:
  ```json
  {
    "eventId": "event-uuid",
    "eventText": "대형 투자자가 관심을 보이고 있습니다.",
    "choices": [
      { "choiceId": "choice-1", "text": "적극 투자 유치", "effects": {...} },
      { "choiceId": "choice-2", "text": "신중한 협상", "effects": {...} },
      { "choiceId": "choice-3", "text": "거절", "effects": {...} }
    ]
  }
  ```
- DB에 event_history 레코드 생성됨

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending / ✅ Pass / ❌ Fail

---

### Scenario 2: Sad Path - 존재하지 않는 게임
**목적**: 잘못된 gameId 입력 시 에러 처리 검증

**전제 조건**: None

**단계**:
1. POST /api/event/trigger
   ```json
   {
     "gameId": "invalid-game-id",
     "turnNumber": 10
   }
   ```

**예상 결과**:
- HTTP 404 Not Found
- Error message: "Game not found"

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 3: Edge Case - 중복 이벤트 방지
**목적**: 같은 턴에 이벤트를 중복 요청 시 방어 로직 검증

**전제 조건**:
- 게임이 생성되어 있음
- Turn 10에 이미 이벤트가 발생함

**단계**:
1. POST /api/event/trigger (두 번째 요청)
   ```json
   {
     "gameId": "test-game-123",
     "turnNumber": 10
   }
   ```

**예상 결과**:
- HTTP 409 Conflict
- Error message: "Event already triggered this turn"

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 4: Boundary Case - 턴 범위 검증
**목적**: turnNumber의 경계값 (1, 25, 0, 26) 처리 검증

**전제 조건**: 게임 생성됨

**단계**:
1. Turn = 0 요청 → 400 Bad Request
2. Turn = 1 요청 → 200 OK
3. Turn = 25 요청 → 200 OK
4. Turn = 26 요청 → 400 Bad Request

**예상 결과**:
- 1~25 범위만 허용
- 범위 밖은 400 에러

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending
```

---

### Step 3: Edge Cases 테이블 작성

모든 예외 상황을 테이블로 정리한다.

```markdown
## Edge Cases

| Case | Input | Expected Output | Priority | Status |
|------|-------|-----------------|----------|--------|
| 이벤트 풀 비어있음 | trigger 요청 | 기본 이벤트 반환 | High | ⬜ |
| 동시 요청 (Race Condition) | 같은 턴 동시 trigger | 한 번만 성공 | High | ⬜ |
| 선택 타임아웃 | 5분 내 선택 안 함 | 첫 번째 선택지 자동 선택 | Medium | ⬜ |
| trust > 100 | 이벤트 효과 적용 | trust = 100 (클램핑) | Low | ⬜ |
| trust < 0 | 이벤트 효과 적용 | trust = 0 (클램핑) | Low | ⬜ |
| cash < 0 (파산) | 이벤트 선택 중 | 게임 즉시 종료 | High | ⬜ |
| DB 연결 실패 | trigger 요청 | 500 에러 + 재시도 안내 | High | ⬜ |
```

---

### Step 4: 자동화 테스트 전략

Unit Test, Integration Test, E2E Test 대상을 명시한다.

```markdown
## 자동화 전략

### Unit Tests (Target: 80%+ coverage)

**EventService**:
```typescript
describe('EventService', () => {
  describe('triggerEvent', () => {
    it('should return an event when valid request', async () => {
      // Arrange
      const gameId = 'test-game-123';
      const turnNumber = 10;

      // Act
      const result = await service.triggerEvent(gameId, turnNumber);

      // Assert
      expect(result).toHaveProperty('eventId');
      expect(result.choices).toHaveLength(3);
    });

    it('should throw NotFoundException when game not found', async () => {
      // Arrange
      const gameId = 'invalid-game-id';

      // Act & Assert
      await expect(service.triggerEvent(gameId, 10))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ConflictException when event already triggered', async () => {
      // Arrange
      const gameId = 'test-game-123';
      const turnNumber = 10;
      await service.triggerEvent(gameId, turnNumber); // 첫 번째 호출

      // Act & Assert
      await expect(service.triggerEvent(gameId, turnNumber))
        .rejects
        .toThrow(ConflictException);
    });
  });
});
```

**EventMatcherService**:
```typescript
describe('EventMatcherService', () => {
  it('should match events based on conditions', () => {
    // Arrange
    const game = { cash: 500000, users: 50000, trust: 70 };

    // Act
    const matched = matcher.match(game);

    // Assert
    expect(matched).toContain(expect.objectContaining({
      triggerConditions: expect.arrayContaining([
        { type: 'CASH_LOW', threshold: 1000000 }
      ])
    }));
  });
});
```

---

### Integration Tests

```typescript
describe('/api/event', () => {
  let app: INestApplication;
  let gameId: string;

  beforeAll(async () => {
    // App 초기화
  });

  beforeEach(async () => {
    // 테스트용 게임 생성
    const response = await request(app.getHttpServer())
      .post('/api/game/start')
      .expect(201);
    gameId = response.body.gameId;
  });

  it('POST /event/trigger - should return 200', async () => {
    return request(app.getHttpServer())
      .post('/api/event/trigger')
      .send({ gameId, turnNumber: 10 })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('eventId');
      });
  });

  it('POST /event/trigger - should return 404 for invalid game', async () => {
    return request(app.getHttpServer())
      .post('/api/event/trigger')
      .send({ gameId: 'invalid', turnNumber: 10 })
      .expect(404);
  });
});
```

---

### E2E Tests (Cypress or Playwright)

```typescript
describe('Event System E2E', () => {
  it('should trigger event and show popup', () => {
    cy.visit('/game/test-game-123');

    // 턴 종료
    cy.get('[data-testid="end-turn-button"]').click();

    // 이벤트 팝업 표시 확인
    cy.get('[data-testid="event-popup"]').should('be.visible');
    cy.get('[data-testid="event-text"]').should('contain', '대형 투자자');

    // 선택지 클릭
    cy.get('[data-testid="choice-1"]').click();

    // 게임 상태 업데이트 확인
    cy.get('[data-testid="cash-value"]').should('not.equal', '이전 값');
  });
});
```
```

---

### Step 5: 회귀 테스트 범위

기존 기능에 미치는 영향을 파악하고 회귀 테스트 대상을 정의한다.

```markdown
## 회귀 테스트 범위

### 영향받는 기능
- [x] 게임 생성 플로우
- [x] 턴 진행 플로우
- [ ] 선택지 실행 플로우 (변경 없음)
- [ ] 리더보드 조회 (변경 없음)

### 회귀 테스트 체크리스트
- [ ] 기존 게임 생성이 정상 작동하는가?
- [ ] 기존 턴 진행이 정상 작동하는가?
- [ ] 이벤트 없이 게임 진행이 가능한가?
- [ ] 리더보드 점수 계산이 정상인가?
- [ ] 게임 종료 조건이 정상 작동하는가?
```

---

### Step 6: 성능 및 보안 테스트

```markdown
## 성능 테스트

### 목표
- API Response Time < 200ms (p95)
- 이벤트 매칭 로직 < 100ms
- 동시 접속 100명 처리 가능

### 테스트 방법
- k6 or Artillery 사용
- 100 concurrent users, 5 minutes

```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 100,
  duration: '5m',
};

export default function() {
  let res = http.post('http://localhost:3000/api/event/trigger', {
    gameId: 'test-game-123',
    turnNumber: 10,
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## 보안 테스트

### Checklist
- [ ] SQL Injection 방어 (DTO validation)
- [ ] XSS 방어 (입력 sanitization)
- [ ] CSRF 방어 (Phase 1+)
- [ ] Rate Limiting (API 호출 제한)
- [ ] 인증/인가 (Phase 1+)
```

---

### Step 7: 수용 기준 검증

Designer AI의 Feature Spec에 명시된 수용 기준을 체크리스트로 작성한다.

```markdown
## 수용 기준 검증

### 기능 요구사항
- [ ] 턴 종료 시 이벤트 발생 확률이 설정대로 작동한다
- [ ] 특정 조건 충족 시 발생 확률이 정확히 증가한다
- [ ] 이벤트 선택지가 3개 이상 제공된다
- [ ] 선택한 결과가 게임 상태에 정확히 반영된다
- [ ] 같은 이벤트가 연속 2턴 이상 발생하지 않는다

### 게임 경험
- [ ] 플레이어가 이벤트 조건을 학습할 수 있다
- [ ] 모든 선택지가 의미 있는 트레이드오프를 제공한다
- [ ] 이벤트가 게임 밸런스를 크게 깨지 않는다
- [ ] 이벤트 텍스트가 명확하고 이해하기 쉽다

### 성능
- [ ] 이벤트 매칭 로직이 100ms 이내에 완료된다
- [ ] 이벤트 풀 로딩이 500ms 이내에 완료된다

### 데이터 일관성
- [ ] 이벤트 히스토리가 DB에 정확히 저장된다
- [ ] 게임 상태가 롤백 가능하다 (에러 시)
```

---

## 품질 체크

작성한 Test Plan이 아래 기준을 충족하는지 확인한다:

- [ ] 테스트 범위가 명확한가?
- [ ] Happy/Sad/Edge Case가 모두 커버되는가?
- [ ] 자동화 전략이 구체적인가?
- [ ] 회귀 테스트 범위가 정의되었는가?
- [ ] 수용 기준이 검증 가능한가?

---

## 안티 패턴 (하지 말 것)

❌ **Happy Path만 테스트**
→ Edge Case, Sad Path 필수

❌ **수동 테스트만 의존**
→ 자동화 가능한 것은 자동화

❌ **커버리지 숫자만 추구**
→ 의미 있는 테스트가 중요

❌ **회귀 테스트 무시**
→ 기존 기능 깨지는지 확인 필수

❌ **성능/보안 테스트 생략**
→ 기능 테스트만큼 중요

---

**문서 버전**: v1.0
**최종 업데이트**: 2026-02-04
