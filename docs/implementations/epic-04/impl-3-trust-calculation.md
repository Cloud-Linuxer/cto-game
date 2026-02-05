# EPIC-04 Feature 3: 신뢰도 회복 메커니즘 강화 - 구현 완료

## 개요

플레이어가 신뢰도를 전략적으로 회복할 수 있는 다양한 메커니즘을 추가하여 게임 밸런스를 개선했습니다.

**목표**: 용량 초과 페널티(-8)에 비해 느린 자연 회복(+1~2/턴)을 보완하여 위기 극복 후 신뢰도가 상승하는 실제 스타트업 패턴을 반영합니다.

---

## 구현된 메커니즘

### 1. 장애 극복 보너스 강화 (Crisis Recovery Bonus)

**파일**: `backend/src/game/game-constants.ts`

```typescript
TRUST_RECOVERY: {
  CRISIS_RECOVERY_BONUS: 5, // 기존 3에서 5로 증가 (EPIC-04 Feature 3)
}
```

**작동 원리**:
- 용량 초과 발생 → 복원력 스택(resilience stack) 획득 → 신뢰도 +5 보너스 즉시 부여
- 장애를 극복하면 오히려 신뢰가 강화되는 스타트업 회복 패턴 반영

**코드 위치**: `backend/src/game/game.service.ts:332-337`

```typescript
// Crisis recovery bonus when surviving capacity exceeded
if (game.capacityExceededCount > 0 && game.resilienceStacks > 0) {
  const crisisBonus = GAME_CONSTANTS.TRUST_RECOVERY.CRISIS_RECOVERY_BONUS;
  game.trust = Math.min(100, game.trust + crisisBonus);
  recoveryMessages.push(`✅ 장애 극복으로 신뢰도가 회복되었습니다 (+${crisisBonus})`);
}
```

---

### 2. 안정 운영 보너스 (Stable Operations Bonus)

**파일**: `backend/src/game/game-constants.ts`

```typescript
STABLE_OPERATIONS: {
  REQUIRED_TURNS: 3,           // 연속 턴 요구 수
  CAPACITY_THRESHOLD: 0.80,    // 용량 80% 이하 유지
  TRUST_BONUS: 3,              // +3 신뢰도 보너스
}
```

**작동 원리**:
- 3턴 연속 용량 80% 이하 유지 → 신뢰도 +3 보너스
- 안정적인 서비스 운영에 대한 시장 신뢰 증가 반영

**데이터베이스 스키마 추가**:
`backend/src/database/entities/game.entity.ts:121`

```typescript
@Column({ type: 'int', default: 0 })
consecutiveStableTurns: number; // consecutive turns with capacity ≤ 80%
```

**코드 위치**: `backend/src/game/game.service.ts:350-363`

```typescript
// Check if capacity is at or below 80% threshold
const capacityRatio = game.maxUserCapacity > 0 ? game.users / game.maxUserCapacity : 0;
if (capacityRatio <= GAME_CONSTANTS.STABLE_OPERATIONS.CAPACITY_THRESHOLD) {
  game.consecutiveStableTurns++;
  if (game.consecutiveStableTurns >= GAME_CONSTANTS.STABLE_OPERATIONS.REQUIRED_TURNS) {
    const stableBonus = GAME_CONSTANTS.STABLE_OPERATIONS.TRUST_BONUS;
    game.trust = Math.min(100, game.trust + stableBonus);
    recoveryMessages.push(`✅ 안정적 서비스 운영이 시장 신뢰를 높였습니다 (+${stableBonus})`);
    game.consecutiveStableTurns = 0; // Reset after bonus awarded
  }
} else {
  // Capacity above 80% but not exceeded - reset counter
  game.consecutiveStableTurns = 0;
}
```

---

### 3. 투명성 보너스 (Transparency Bonus)

**파일**: `backend/src/game/game-constants.ts`

```typescript
TRANSPARENCY: {
  EFFECT_MULTIPLIER: 1.5, // 1.5배 신뢰도 회복 효과
}
```

**작동 원리**:
- 장애 발생 후(capacityWarningActive = true) 투명성 태그가 있는 선택지 선택 시
- 신뢰도 회복 효과 1.5배 증폭
- 고객과의 투명한 소통이 신뢰 회복을 가속화하는 패턴 반영

**데이터베이스 스키마 추가**:
`backend/src/database/entities/choice.entity.ts:35`

```typescript
@Column({ type: 'simple-json', nullable: true })
tags?: string[]; // Tags like ['transparency'] for trust recovery multiplier
```

**코드 위치**: `backend/src/game/game.service.ts:244-250`

```typescript
// Transparency bonus: 1.5x trust recovery for transparency-tagged choices after capacity warning
if (choice.tags?.includes('transparency') && game.capacityWarningActive && trustGain > 0) {
  const originalTrustGain = trustGain;
  trustGain = Math.floor(trustGain * GAME_CONSTANTS.TRANSPARENCY.EFFECT_MULTIPLIER);
  recoveryMessages.push(`💬 투명한 소통이 신뢰 회복을 가속화했습니다 (신뢰도 회복 ${originalTrustGain} → ${trustGain})`);
}
```

---

## 밸런스 검증

### 신뢰도 밸런스 시뮬레이터

**파일**: `backend/src/game/trust-balance-simulator.ts`

3가지 플레이 스타일(최적/중간/위기)을 25턴 동안 시뮬레이션하여 밸런스 검증:

```bash
cd backend && npx ts-node src/game/trust-balance-simulator.ts
```

**시뮬레이션 결과**:

| 플레이 스타일 | 최종 신뢰도 | 용량 초과 횟수 | 복원력 스택 | 승리 가능 |
|--------------|------------|---------------|------------|----------|
| Optimal      | 82%        | 0회           | 0          | ✅ YES   |
| Moderate     | 87%        | 4회           | 3          | ✅ YES   |
| Crisis       | 64%        | 24회          | 3          | ✅ YES   |

**결론**: 모든 플레이 스타일에서 승리 가능 → ✅ **BALANCED**

**핵심 인사이트**:
- Crisis 플레이어도 24번의 장애를 겪으면서 최종 신뢰도 64% 유지
- 장애 극복 보너스(+5)와 투명성 보너스(1.5배)가 효과적으로 작동
- 안정 운영 보너스가 꾸준한 신뢰도 상승 기여

---

## 단위 테스트

**파일**: `backend/src/game/game.service.spec.ts`

### 추가된 테스트 (5개)

1. **안정 운영 보너스: 3턴 연속 유지 시 보너스 획득**
   - 3턴 연속 용량 80% 이하 → 신뢰도 +3

2. **안정 운영 보너스: 80% 초과 시 카운터 리셋**
   - consecutiveStableTurns가 2인 상태에서 용량 86.7% → 리셋

3. **투명성 보너스: 장애 후 투명성 태그 선택 시 1.5배 효과**
   - capacityWarningActive = true + transparency tag → 신뢰도 회복 1.5배

4. **투명성 보너스: 경고 없을 때 미적용**
   - capacityWarningActive = false → 투명성 보너스 미적용

5. **위기 극복 보너스: 용량 초과 후 +5 보너스**
   - 용량 초과 → 복원력 스택 획득 → 즉시 신뢰도 +5

**테스트 결과**:
```
✓ 3턴 연속 용량 80% 이하 유지 시 신뢰도 +3 보너스를 획득해야 함
✓ 용량이 80%를 초과하면 안정 운영 카운터가 리셋되어야 함
✓ 장애 발생 후 투명성 태그 선택지로 신뢰도 회복 시 1.5배 보너스를 받아야 함
✓ 용량 경고가 없을 때는 투명성 보너스가 적용되지 않아야 함
✓ 용량 초과 후 복원력 스택 획득 시 신뢰도 +5 보너스를 받아야 함

Tests: 18 passed, 18 total (game.service.spec.ts)
```

---

## 데이터베이스 스키마 변경

### Game Entity 추가 필드

```typescript
@Column({ type: 'int', default: 0 })
consecutiveStableTurns: number; // consecutive turns with capacity ≤ 80%
```

### Choice Entity 추가 필드

```typescript
@Column({ type: 'simple-json', nullable: true })
tags?: string[]; // Tags like ['transparency'] for trust recovery multiplier
```

**마이그레이션**:
- 기존 데이터베이스 삭제 후 재생성으로 스키마 자동 반영
- `npm run import-data` 실행으로 147개 선택지 재임포트 완료

---

## 게임 밸런스 영향 분석

### Before (Phase 3)
- 용량 초과 페널티: -8 trust
- 자연 회복: +1~2 trust/턴 (trust < 30)
- 회복 속도: 너무 느림, 위기 플레이어 승리 어려움

### After (EPIC-04 Feature 3)
- 용량 초과 페널티: -8 trust (동일)
- 장애 극복 보너스: **+5 trust** (즉시)
- 안정 운영 보너스: **+3 trust** (3턴마다)
- 투명성 보너스: **1.5배 효과** (고객 소통)
- 자연 회복: +1~2 trust/턴 (기존 유지)

### 효과
1. **위기 극복 패턴 강화**: 장애를 극복하면 오히려 신뢰 상승
2. **안정 운영 보상**: 꾸준한 인프라 관리에 대한 보상
3. **전략적 선택 중요성**: 투명성 태그 선택지의 가치 증가
4. **밸런스 개선**: 모든 플레이 스타일에서 승리 가능

---

## 프론트엔드 통합 가이드

### API 응답 변경사항

**GameResponseDto 추가 필드**:

```typescript
recoveryMessages?: string[]; // 회복 메시지 배열
```

**예시 응답**:
```json
{
  "gameId": "...",
  "trust": 45,
  "recoveryMessages": [
    "✅ 장애 극복으로 신뢰도가 회복되었습니다 (+5)",
    "💬 투명한 소통이 신뢰 회복을 가속화했습니다 (신뢰도 회복 3 → 4)",
    "✅ 안정적 서비스 운영이 시장 신뢰를 높였습니다 (+3)"
  ]
}
```

### UI 표시 권장사항

1. **회복 메시지 표시**
   - `recoveryMessages` 배열을 UI에 표시 (토스트/알림)
   - 긍정적인 피드백으로 플레이어 동기 부여

2. **안정 운영 진행도 표시**
   - `consecutiveStableTurns` 활용 (예: "안정 운영 2/3 턴")
   - 프로그레스 바로 시각화

3. **투명성 선택지 강조**
   - `tags` 배열에 `'transparency'` 포함된 선택지 강조
   - "💬 고객 소통" 등의 아이콘/배지 표시

---

## 향후 확장 가능성

### 추가 가능한 메커니즘

1. **전문가 자문 보너스**
   - 특정 전문가 고용 시 신뢰도 회복 속도 증가

2. **미디어 대응 보너스**
   - 장애 후 언론 대응 선택 시 추가 회복 효과

3. **커뮤니티 참여 보너스**
   - 사용자 커뮤니티 활성화 시 신뢰도 자연 회복 증가

### 난이도별 조정 가능성

- EASY 모드: 모든 보너스 1.5배
- HARD 모드: 안정 운영 요구 턴 수 증가 (3 → 5)

---

## 체크리스트

- [x] 장애 극복 보너스 증가 (3 → 5)
- [x] 안정 운영 보너스 구현 (+3 trust, 3턴 연속)
- [x] 투명성 보너스 구현 (1.5배 효과)
- [x] 데이터베이스 스키마 추가 (consecutiveStableTurns, tags)
- [x] 게임 로직 통합 (executeChoice, executeMultipleChoices)
- [x] 단위 테스트 작성 (5개 테스트, 100% 통과)
- [x] 밸런스 시뮬레이터 작성 및 검증 (모든 플레이 스타일 승리 가능)
- [x] 기존 테스트 호환성 유지 (18/18 통과)
- [x] 빌드 성공 확인

---

## 결론

신뢰도 회복 메커니즘 강화를 통해:
- ✅ 위기 극복 후 신뢰 상승 패턴 반영
- ✅ 안정적 운영에 대한 보상 제공
- ✅ 전략적 선택의 중요성 증가
- ✅ 모든 플레이 스타일에서 밸런스 유지

**게임 경험 개선**: 플레이어가 장애를 극복하고 신뢰를 회복하는 과정이 더욱 전략적이고 보람차게 개선되었습니다.
