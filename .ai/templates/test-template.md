# TEST-{번호}: {제목}

## 테스트 목표
{무엇을 검증하려는가 - 1-2문장}

## 관련 문서
- **EPIC**: EPIC-{번호}
- **Feature Spec**: FEATURE-{번호}
- **Implementation Plan**: IMPL-{CLIENT/SERVER}-{번호}

---

## 테스트 범위

### In Scope
- {테스트 대상 1}
- {테스트 대상 2}
- {테스트 대상 3}

### Out of Scope
- {제외 대상 1} (별도 진행)
- {제외 대상 2} (별도 진행)

---

## 테스트 시나리오

### Scenario 1: Happy Path - {시나리오 이름}
**목적**: {무엇을 검증하는가}

**전제 조건**:
- {조건 1}
- {조건 2}

**단계**:
1. {액션 1}
2. {액션 2}
3. {액션 3}

**예상 결과**:
- {예상 결과 1}
- {예상 결과 2}
- {예상 결과 3}

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending / ✅ Pass / ❌ Fail

---

### Scenario 2: Sad Path - {시나리오 이름}
**목적**: {에러 케이스 검증}

**전제 조건**:
- {조건 1}
- {조건 2}

**단계**:
1. {잘못된 입력}
2. {시스템 반응}

**예상 결과**:
- {HTTP 상태 코드} {에러 메시지}
- {에러 처리 방법}

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending / ✅ Pass / ❌ Fail

---

### Scenario 3: Edge Case - {시나리오 이름}
**목적**: {극단적 상황 검증}

**전제 조건**:
- {특수 상황}

**단계**:
1. {특수 입력}
2. {시스템 처리}

**예상 결과**:
- {예외 처리 결과}

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending / ✅ Pass / ❌ Fail

---

### Scenario 4: Boundary Case - {시나리오 이름}
**목적**: {경계값 검증}

**전제 조건**:
- {조건}

**단계**:
1. {최솟값} 입력 → {예상 결과}
2. {최댓값} 입력 → {예상 결과}
3. {최솟값 - 1} 입력 → {에러 예상}
4. {최댓값 + 1} 입력 → {에러 예상}

**예상 결과**:
- 범위 내: 정상 작동
- 범위 외: 400 Bad Request

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending / ✅ Pass / ❌ Fail

---

## Edge Cases 테이블

| Case | Input | Expected Output | Priority | Status |
|------|-------|-----------------|----------|--------|
| {Case 1} | {입력값} | {예상 출력} | High/Medium/Low | ⬜/✅/❌ |
| {Case 2} | {입력값} | {예상 출력} | High/Medium/Low | ⬜/✅/❌ |
| {Case 3} | {입력값} | {예상 출력} | High/Medium/Low | ⬜/✅/❌ |

---

## 자동화 전략

### Unit Tests (Target: 80%+ coverage)

**{ServiceName/ComponentName}**:
```typescript
describe('{ServiceName/ComponentName}', () => {
  describe('{methodName}', () => {
    it('should {정상 동작 설명}', async () => {
      // Arrange
      const {variable} = {setup};

      // Act
      const result = await service.{methodName}({params});

      // Assert
      expect(result).toHaveProperty('{property}');
      expect(result.{field}).toBe({expected});
    });

    it('should throw {ErrorType} when {조건}', async () => {
      // Arrange
      const {variable} = {invalid setup};

      // Act & Assert
      await expect(service.{methodName}({params}))
        .rejects
        .toThrow({ErrorType});
    });
  });
});
```

---

### Integration Tests

```typescript
describe('/api/{endpoint}', () => {
  let app: INestApplication;
  let {variable}: {type};

  beforeAll(async () => {
    // App 초기화
  });

  beforeEach(async () => {
    // 테스트 데이터 준비
  });

  it('POST /{endpoint} - should return 200', async () => {
    return request(app.getHttpServer())
      .post('/api/{endpoint}')
      .send({ {field}: {value} })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('{property}');
      });
  });

  it('POST /{endpoint} - should return 404 for invalid {param}', async () => {
    return request(app.getHttpServer())
      .post('/api/{endpoint}')
      .send({ {field}: 'invalid' })
      .expect(404);
  });
});
```

---

### E2E Tests (Cypress or Playwright)

```typescript
describe('{Feature} E2E', () => {
  it('should {전체 플로우 설명}', () => {
    cy.visit('/{page}');

    // 액션 1
    cy.get('[data-testid="{element}"]').click();

    // 검증 1
    cy.get('[data-testid="{result}"]').should('be.visible');
    cy.get('[data-testid="{result}"]').should('contain', '{text}');

    // 액션 2
    cy.get('[data-testid="{input}"]').type('{value}');
    cy.get('[data-testid="{submit}"]').click();

    // 검증 2
    cy.get('[data-testid="{updated}"]').should('not.equal', '{old value}');
  });
});
```

---

## 회귀 테스트 범위

### 영향받는 기능
- [ ] {기능 1} - 변경됨 / 변경 없음
- [ ] {기능 2} - 변경됨 / 변경 없음
- [ ] {기능 3} - 변경됨 / 변경 없음

### 회귀 테스트 체크리스트
- [ ] {기존 기능 1}이 정상 작동하는가?
- [ ] {기존 기능 2}가 정상 작동하는가?
- [ ] {기존 API}가 정상 응답하는가?
- [ ] {기존 UI}가 정상 렌더링되는가?

---

## 성능 테스트

### 목표
- API Response Time < {목표}ms (p95)
- {핵심 로직} 실행 시간 < {목표}ms
- 동시 접속 {목표}명 처리 가능

### 테스트 방법
```javascript
// k6 or Artillery 사용
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: {동시 사용자 수},
  duration: '{테스트 시간}',
};

export default function() {
  let res = http.{method}('http://localhost:3000/api/{endpoint}', {
    {field}: '{value}',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < {목표}ms': (r) => r.timings.duration < {목표},
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

### 테스트 케이스
```typescript
it('should prevent SQL injection', async () => {
  const maliciousInput = "'; DROP TABLE users; --";

  await expect(service.method(maliciousInput))
    .rejects
    .toThrow(BadRequestException);
});

it('should sanitize XSS input', () => {
  const xssInput = '<script>alert("xss")</script>';
  const sanitized = sanitizer.sanitize(xssInput);

  expect(sanitized).not.toContain('<script>');
});
```

---

## 수용 기준 검증

### 기능 요구사항
- [ ] {요구사항 1}이 충족되는가?
- [ ] {요구사항 2}가 충족되는가?
- [ ] {요구사항 3}이 충족되는가?

### 게임 경험
- [ ] 플레이어가 기능을 이해할 수 있는가?
- [ ] 모든 액션이 의미 있는 결과를 낳는가?
- [ ] 밸런스가 공정한가?
- [ ] 기존 시스템과 충돌하지 않는가?

### 성능
- [ ] {핵심 로직}이 {목표}ms 이내에 완료되는가?
- [ ] API 응답이 {목표}ms 이내인가? (p95)

### 데이터 일관성
- [ ] 데이터가 정확히 저장되는가?
- [ ] 에러 시 롤백이 가능한가?

---

## 테스트 데이터

### 준비 데이터
```json
{
  "{dataName}": {
    "{field1}": "{value1}",
    "{field2}": {value2}
  }
}
```

### Mock 데이터
```typescript
const mock{DataName} = {
  {field}: {value},
};
```

---

## 이슈 및 블로커

### 발견된 이슈
| 이슈 ID | 설명 | 심각도 | 상태 | 담당자 |
|---------|------|--------|------|--------|
| {ID} | {설명} | Critical/High/Medium/Low | Open/In Progress/Resolved | {이름} |

### 블로커
- {블로커 1}: {설명} - {해결 방법}
- {블로커 2}: {설명} - {해결 방법}

---

## 테스트 실행 결과

### 요약
- **총 테스트**: {숫자}개
- **통과**: {숫자}개 (✅ Pass)
- **실패**: {숫자}개 (❌ Fail)
- **보류**: {숫자}개 (⬜ Pending)
- **커버리지**: {숫자}%

### 실패 원인 분석
1. {실패 케이스 1}: {원인} → {해결 방안}
2. {실패 케이스 2}: {원인} → {해결 방안}

---

**작성자**: QA AI
**작성일**: {날짜}
**검토자**: {QA Lead 이름}
**상태**: Draft / In Progress / Completed
