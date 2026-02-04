# Skill: Feature Spec

**사용자**: Designer AI
**목적**: 게임 기능의 규칙, 메커니즘, 수치 모델을 설계하고 명세서를 작성한다.

---

## 입력

- **Producer AI의 EPIC 문서** (Feature 요구사항)
- `.ai/context/vision.md` - 게임 비전
- `.ai/context/gdd.md` - 게임 디자인 문서
- `.ai/context/economy.md` - 경제 시스템
- `game_choices_db.json` - 기존 게임 데이터

---

## 출력

- **Feature Spec 문서** (`docs/features/FEATURE-{번호}-{제목}.md`)
- 템플릿: `.ai/templates/feature-template.md`

---

## 절차

### Step 1: Feature 이해 및 분석

1. Producer AI의 EPIC에서 Feature 요구사항을 읽는다
2. 게임 비전과의 정합성을 확인한다
3. 기존 GDD와의 충돌 여부를 검토한다

**질문 체크리스트**:
- [ ] 이 기능이 플레이어에게 어떤 경험을 제공하는가?
- [ ] 기존 시스템과 어떻게 상호작용하는가?
- [ ] 게임 밸런스에 어떤 영향을 미치는가?

---

### Step 2: 게임 규칙 설계

1. **핵심 메커니즘** 정의
2. **조건 및 제약** 명시
3. **플레이어 인터랙션** 설계

**규칙 작성 원칙**:
- **명확성**: 모호한 표현 금지, IF-THEN 로직으로 작성
- **일관성**: 기존 규칙과 충돌하지 않음
- **테스트 가능성**: 규칙이 검증 가능해야 함

**예시**:
```markdown
## 게임 규칙

### 핵심 메커니즘
1. 매 턴 종료 시 30% 기본 확률로 랜덤 이벤트가 발생한다
2. 특정 조건 충족 시 이벤트 발생 확률이 증가한다:
   - cash < 1M: +50% (총 80%)
   - users > 100K: +30% (총 60%)
   - infrastructure 업그레이드 직후: +40% (총 70%)
3. 이벤트는 긍정/부정/중립 3가지 타입이 있다
4. 플레이어는 제시된 선택지 중 하나를 선택해야 한다

### 조건 및 제약
- 한 턴에 최대 1개의 이벤트만 발생한다
- 같은 이벤트는 연속 2턴 이상 발생하지 않는다
- 이벤트 선택은 5분 이내에 완료해야 한다 (타임아웃 시 자동 선택)
```

---

### Step 3: 수치 모델링

1. **변수 정의** (핵심 지표)
2. **수식 관계** (변수 간 계산)
3. **난이도 곡선** (초반/중반/후반 밸런스)

**변수 정의 테이블**:
```markdown
| 변수명 | 의미 | 초기값 | 범위 | 단위 |
|--------|------|--------|------|------|
| event_probability | 이벤트 발생 확률 | 0.3 | 0.0~1.0 | 비율 |
| event_effect_multiplier | 이벤트 효과 배율 | 1.0 | 0.5~2.0 | 배수 |
| trust_impact | 신뢰도 영향 | ±5 | -20~+20 | 점수 |
```

**수식 작성**:
```markdown
### 수식

#### 이벤트 발생 확률
```
event_probability = base_rate + condition_bonus

if cash < 1M:
  condition_bonus += 0.5
if users > 100K:
  condition_bonus += 0.3
if infrastructure_changed:
  condition_bonus += 0.4

event_probability = min(event_probability, 0.9)  // 최대 90%
```

#### 이벤트 효과
```
users_change = base_effect * event_effect_multiplier * (1 + trust / 100)
cash_change = base_effect * event_effect_multiplier
trust_change = base_trust_impact
```
```

**난이도 곡선**:
```markdown
### 난이도 곡선

- **초반 (Turn 1-8)**:
  - 이벤트 빈도: 낮음 (base_rate = 0.2)
  - 이벤트 효과: 온건함 (multiplier = 0.8)
  - 목적: 시스템 학습

- **중반 (Turn 9-16)**:
  - 이벤트 빈도: 중간 (base_rate = 0.3)
  - 이벤트 효과: 정상 (multiplier = 1.0)
  - 목적: 전략적 선택 압박

- **후반 (Turn 17-25)**:
  - 이벤트 빈도: 높음 (base_rate = 0.4)
  - 이벤트 효과: 강력함 (multiplier = 1.2)
  - 목적: 긴장감 최대화
```

---

### Step 4: 플레이어 시나리오 작성

1. **Success Case** (성공 시나리오)
2. **Failure Case** (실패 시나리오)
3. **Edge Cases** (극단적 상황)

**시나리오 포맷**:
```markdown
## 플레이어 시나리오

### 시나리오 1: 성공 케이스 - 긍정 이벤트 활용
**상황**: Turn 10, cash = 5M, users = 50K, trust = 70

**진행**:
1. 턴 종료 시 이벤트 발생 (확률 30%)
2. "대형 투자자 관심" 이벤트 출현
3. 선택지:
   - A: "적극 투자 유치" (+3M cash, -10 trust)
   - B: "신중한 협상" (+1M cash, +5 trust)
   - C: "거절" (변화 없음)
4. 플레이어가 B 선택
5. 결과: cash = 6M, trust = 75

**결과**: 플레이어가 안정적인 성장 선택, 신뢰도 유지

---

### 시나리오 2: 실패 케이스 - 부정 이벤트 대응 실패
**상황**: Turn 15, cash = 2M, users = 80K, trust = 40

**진행**:
1. 턴 종료 시 이벤트 발생
2. "서버 다운타임" 이벤트 출현
3. 선택지:
   - A: "긴급 인프라 업그레이드" (-1.5M cash, +10 trust)
   - B: "임시 조치" (-0.5M cash, -5 trust)
   - C: "무시" (-20K users, -15 trust)
4. 플레이어가 cash 부족으로 C 선택
5. 결과: users = 60K, trust = 25 (위기 상황)

**결과**: 잘못된 선택으로 위기 심화, 파산 위험 증가

---

### 시나리오 3: Edge Case - 극단적 상황
**상황**: Turn 20, cash = 0.5M (거의 파산), users = 120K

**진행**:
1. 이벤트 발생 확률 80% (cash < 1M 조건)
2. "긴급 자금 필요" 이벤트 출현
3. 선택지:
   - A: "고금리 대출" (+2M cash, 다음 턴 -0.5M/turn)
   - B: "팀 감축" (+0.3M cash, -20K users)
4. 플레이어가 A 선택
5. 결과: 단기적으로 생존, 장기적 부담 증가

**결과**: 위기 상황에서의 극단적 선택, 트레이드오프
```

---

### Step 5: Edge Cases 식별

모든 가능한 예외 상황을 식별하고 처리 방법을 명시한다.

```markdown
## Edge Cases

| Case | 상황 | 처리 방법 | 우선순위 |
|------|------|-----------|----------|
| 이벤트 없음 | 이벤트 풀이 비어있음 | 기본 이벤트 반환 | High |
| 동시 이벤트 | 여러 조건 동시 충족 | 우선순위 높은 이벤트 선택 | High |
| 선택 타임아웃 | 5분 내 선택 안 함 | 첫 번째 선택지 자동 선택 | Medium |
| 중복 이벤트 | 같은 이벤트 연속 발생 | 다른 이벤트로 대체 | Medium |
| 극단적 효과 | trust > 100 or < 0 | 0-100 범위로 클램핑 | Low |
| 이벤트 중 게임 종료 | 이벤트 선택 중 파산 | 이벤트 취소, 즉시 종료 | High |
```

---

### Step 6: 수용 기준 (Acceptance Criteria)

구현 완료 시 충족해야 할 기준을 명시한다.

```markdown
## 수용 기준

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

### Step 7: 구현 요청사항

Server AI와 Client AI에게 전달할 구현 요구사항을 작성한다.

```markdown
## 구현 요청사항

### Server AI에게

#### API 엔드포인트
```yaml
POST /api/event/trigger
Request:
  gameId: string
  turnNumber: number
Response:
  eventId: string
  eventText: string
  choices: Choice[]
```

#### DB 스키마
- `dynamic_events` 테이블 생성
- `event_history` 테이블 생성

#### 비즈니스 로직
- 이벤트 매칭 조건 로직
- 확률 계산 로직
- 중복 방지 로직

---

### Client AI에게

#### UI 컴포넌트
- `EventPopup.tsx`: 이벤트 팝업 모달
- `ChoiceCard.tsx`: 선택지 카드

#### 상태 관리
- Redux Slice: `eventSlice`
- Actions: `triggerEvent`, `selectChoice`

#### 애니메이션
- 팝업 등장: Fade-in + Scale
- 선택 시: 하이라이트 효과
```

---

## 품질 체크

작성한 Feature Spec이 아래 기준을 충족하는지 확인한다:

- [ ] 게임 규칙이 명확하고 모호하지 않은가?
- [ ] 수치 모델이 검증 가능한가?
- [ ] 플레이어 시나리오가 현실적인가?
- [ ] Edge Case가 충분히 식별되었는가?
- [ ] 수용 기준이 측정 가능한가?
- [ ] 구현 요청사항이 구체적인가?

---

## 안티 패턴 (하지 말 것)

❌ **모호한 표현** ("적절히", "가끔", "많이" 등)
→ 구체적인 수치나 조건으로 대체

❌ **구현 방법 명시**
→ "Redis 캐싱 사용" 같은 표현 금지, Server AI에게 위임

❌ **밸런스 검증 없이 작성**
→ 수치가 게임 밸런스에 미치는 영향 검토 필수

❌ **기존 시스템과의 충돌 무시**
→ GDD 및 기존 Feature와의 정합성 확인

❌ **Edge Case 무시**
→ "정상 케이스만 작동하면 됨" 같은 사고방식 금지

---

**문서 버전**: v1.0
**최종 업데이트**: 2026-02-04
