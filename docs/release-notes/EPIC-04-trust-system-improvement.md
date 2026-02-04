# Release Notes: EPIC-04 Trust System Improvement

**버전**: v1.0.0-epic04
**릴리스 날짜**: 2026-02-04
**유형**: Major Feature Update

---

## 개요

EPIC-04는 신뢰도(Trust) 시스템을 전면 개선하여 게임 밸런스를 향상시키고, 플레이어 경험을 개선하는 대규모 업데이트입니다. 실수를 해도 회복 가능한 메커니즘을 추가하고, 난이도별 균형을 재조정했습니다.

---

## 주요 변경사항

### Feature 1: 신뢰도 데이터 리밸런싱

**변경 내용**:
- game_choices_db.json의 253개 선택지 재조정
- 긍정 효과: 70% (176개)
- 중립 효과: 15% (38개)
- 부정 효과: 15% (39개)

**이유**:
- 이전 밸런스(부정 30%)는 회복 불가능한 상황 발생
- 긍정 70%로 증가하여 실수 허용도 향상

**영향**:
- 초보 플레이어도 IPO 달성 가능
- 전략적 선택의 중요성 유지

### Feature 2: 용량 초과 경고 시스템

**신규 기능**:
```typescript
// 첫 초과: 50% 감소된 페널티
capacityWarningActive: boolean
consecutiveCapacityExceeded: number

// 메시지
"⚠️ 서비스 응답 지연 발생! 다음 턴까지 인프라를 개선하세요."
```

**효과**:
- 첫 실수에 대한 부담 감소
- 교육적 경고 메시지 제공
- 연속 실수 시 페널티 증가 (2회째부터 100%)

**구현**:
- Game Entity: `capacityWarningActive`, `consecutiveCapacityExceeded`
- 13개 단위 테스트 통과

### Feature 3: 신뢰도 회복 메커니즘 강화

**신규 회복 경로**:

1. **안정 운영 보너스**: +3 trust
   - 3턴 연속 용량 80% 이하 유지
   - 보수적 플레이 스타일 보상

2. **장애 극복 보너스**: +5 trust
   - 용량 초과 후 복원력 스택 획득 시
   - 위기 대응 능력 인정

3. **투명성 보너스**: 1.5배 효과
   - `transparency` 태그 선택지
   - 용량 경고 활성화 시 적용

4. **자연 회복**: +1~+2 trust/턴
   - trust < 30일 때 자동 회복
   - 완전 포기 상태 방지

**영향**:
- 모든 플레이 스타일에서 승리 가능
- 실수 후 회복 경로 제공
- 18개 단위 테스트 통과

### Feature 4: 신뢰도 시각화 개선

**TrustGauge 컴포넌트**:
```tsx
// 5단계 색상 시스템
Danger (0-20): #dc2626
Critical (21-40): #ea580c
Warning (41-60): #ca8a04
Good (61-80): #16a34a
Excellent (81-100): #0891b2
```

**기능**:
- 난이도별 임계값 마커 (EASY: 60, NORMAL: 65, HARD: 85)
- 반응형 디자인 (모바일/데스크톱)
- 애니메이션 효과

**위치**:
- `/frontend/components/TrustGauge.tsx`
- 테스트 페이지: `/test/trust-gauge`

### Feature 5: 신뢰도 히스토리 및 설명 추가

**백엔드 API**:
```
GET /api/game/:gameId/trust-history
→ TrustHistory[] (턴별 신뢰도 변화 기록)
```

**프론트엔드 컴포넌트**:
- `TrustHistoryChart`: 라인 차트 시각화
- `TrustChangeExplanation`: 교육적 메시지 생성

**데이터 구조**:
```typescript
interface TrustHistory {
  gameId: string;
  turnNumber: number;
  trustBefore: number;
  trustAfter: number;
  change: number;
  factors: TrustChangeFactor[];
}
```

**영향**:
- 플레이어가 신뢰도 변화 이유 이해
- 전략 수립에 도움
- 13개 단위 테스트 통과

### Feature 6: 대안 투자 경로 추가

**브릿지 파이낸싱**:
```
조건: trust < 정규 투자 필요치의 60%
금액: 정규 투자의 30%
페널티: 지분 5% 추가 희석
횟수: 게임당 최대 2회
```

**정부 지원금**:
```
금액: 2억 원 (고정)
보너스: trust +3
의무: 다음 턴 보고서 제출
횟수: 게임당 1회
```

**API**:
```
POST /api/game/:gameId/alternative-investment/bridge
POST /api/game/:gameId/alternative-investment/government-grant
POST /api/game/:gameId/alternative-investment/report
```

**영향**:
- trust 부족 시 대안 제공
- 완전 실패 방지
- 31개 단위 테스트 통과

---

## 기술적 변경사항

### 백엔드

**신규 Entity**:
- `TrustHistory`: 신뢰도 히스토리 추적

**Game Entity 필드 추가**:
```typescript
capacityWarningActive: boolean
consecutiveCapacityExceeded: number
consecutiveStableTurns: number
bridgeFinancingUsed: number
governmentGrantUsed: boolean
governmentReportRequired: boolean
```

**신규 Service**:
- `TrustHistoryService`: 신뢰도 히스토리 관리
- `AlternativeInvestmentService`: 대안 투자 로직

**상수 업데이트**:
- `game-constants.ts`: INITIAL_TRUST 통일 (NORMAL: 40 → 50, HARD: 25 → 30)
- 회복 메커니즘 상수 추가

**테스트**:
- 총 267개 테스트
- 261개 통과 (97.8%)
- 6개 실패 (event-edge-cases, 향후 기능)

### 프론트엔드

**신규 컴포넌트**:
```
/components/TrustGauge.tsx
/components/TrustHistoryChart.tsx
/components/TrustChangeExplanation.tsx
```

**빌드**:
- Next.js 15.1.5
- 빌드 성공 (0 에러)
- TypeScript 타입 체크 통과

---

## 마이그레이션 가이드

### 데이터베이스

**자동 마이그레이션**:
- TypeORM이 자동으로 새 컬럼 추가
- 기존 데이터 영향 없음

**신규 테이블**:
- `trust_history`: 자동 생성

### 기존 게임

**중요**: 이미 진행 중인 게임은 EPIC-04 변경사항이 적용되지 않습니다.

**권장 사항**:
- 새 게임 시작 권장
- 기존 게임은 이전 밸런스로 계속 진행

**이유**:
- 신뢰도 초기값 변경 (40 → 50)
- 회복 메커니즘 추가로 난이도 변화

### API 변경

**하위 호환성**:
- 모든 기존 API 엔드포인트 유지
- 신규 엔드포인트만 추가

**신규 API**:
```
GET  /api/game/:gameId/trust-history
POST /api/game/:gameId/alternative-investment/bridge
POST /api/game/:gameId/alternative-investment/government-grant
POST /api/game/:gameId/alternative-investment/report
```

---

## 알려진 이슈

### 1. Event Edge Cases 테스트 실패 (6개)

**영향**: 없음 (향후 이벤트 시스템 기능)

**상태**: Known Issue

**계획**: Phase 2에서 수정

**테스트 목록**:
- `event-edge-cases.spec.ts`: 6개 테스트 실패
- 이유: applyEventChoice 메서드 미구현 (향후 기능)

### 2. Playwright 의존성 경고

**영향**: 없음 (빌드 성공)

**해결**: tsconfig.json에서 제외 처리 완료

---

## 성능 영향

### 백엔드

**TrustHistory 저장**:
- 턴당 1회 INSERT (최대 25회/게임)
- 성능 영향: 미미

**조회 성능**:
- 인덱스: (gameId, turnNumber)
- 평균 조회 시간: <10ms

### 프론트엔드

**TrustGauge 렌더링**:
- 애니메이션: CSS transition (GPU 가속)
- 재렌더링 최적화: React.memo

**TrustHistoryChart**:
- 25개 데이터 포인트 (경량)
- 차트 라이브러리: Recharts

---

## 테스트 커버리지

### 백엔드

| 모듈 | 테스트 수 | 통과율 |
|------|---------|--------|
| GameService | 18 | 100% |
| TrustHistoryService | 13 | 100% |
| AlternativeInvestmentService | 31 | 100% |
| EventService | 35 | 100% |
| **전체** | **267** | **97.8%** |

### 프론트엔드

| 컴포넌트 | 상태 |
|---------|------|
| TrustGauge | ✅ 수동 검증 완료 |
| TrustHistoryChart | ✅ 수동 검증 완료 |
| TrustChangeExplanation | ✅ 수동 검증 완료 |

---

## 업그레이드 절차

### 개발 환경

```bash
# 백엔드
cd backend
npm install
npm run build
npm test

# 프론트엔드
cd frontend
npm install
npm run build
```

### 프로덕션 배포

```bash
# 1. 백엔드 배포
cd backend
npm run build
npm run start:prod

# 2. 데이터베이스 마이그레이션 (자동)
# TypeORM이 자동으로 새 컬럼 추가

# 3. 프론트엔드 배포
cd frontend
npm run build
# Next.js 프로덕션 서버 시작
```

### 롤백 계획

**백엔드**:
- Git 태그로 롤백: `git checkout EPIC-03`
- 데이터베이스: 새 컬럼만 추가되어 롤백 불필요

**프론트엔드**:
- Git 태그로 롤백
- 기존 API 호환성 유지

---

## 문서 업데이트

### 신규 문서

- `.ai/context/trust-balance.md`: 신뢰도 밸런스 가이드
- `docs/release-notes/EPIC-04-trust-system-improvement.md`: 이 문서

### 업데이트된 문서

- `.ai/context/gdd.md`: v1.1로 업데이트
  - 신뢰도 시스템 섹션 확장
  - 대안 투자 경로 추가
  - TrustGauge UI 설명 추가

---

## 크레딧

**개발팀**:
- Backend: Quality Engineer
- Frontend: Quality Engineer
- Testing: Quality Engineer
- Documentation: Quality Engineer

**검토**:
- Tech Lead
- Product Owner

---

## 다음 단계 (Phase 2)

1. **동적 이벤트 시스템**: 게임 상태 기반 랜덤 이벤트
2. **신뢰도 세분화**: 투자자 vs 사용자 신뢰 분리
3. **명성 시스템**: 장기 평판 추적
4. **멀티플레이**: 협업 모드

---

**릴리스 승인**:
- 개발: ✅ 완료
- 테스트: ✅ 97.8% 통과
- 문서: ✅ 완료
- 배포 준비: ✅ 완료

**최종 검토**: 2026-02-04
**배포 승인**: Pending
