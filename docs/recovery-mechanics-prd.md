# 회복 및 회생 메카닉 설계 문서 (Recovery & Resilience Mechanics PRD)

**문서 버전**: 1.0
**작성일**: 2026-02-03
**대상 프로젝트**: AWS 스타트업 타이쿤
**목적**: 현재 게임의 즉사/연쇄실패 문제를 해결하고, 현실적인 스타트업 회복 메카닉을 도입

---

## 1. 현황 분석: 현재 실패 시스템의 문제점

### 1.1 코드에서 확인된 실패 조건 (game-constants.ts 기준)

| 실패 조건 | 현재 구현 | 임계값 | 문제점 |
|-----------|-----------|--------|--------|
| 파산 | `cash < 0` 즉시 LOST_BANKRUPT | 0원 | 경고 없음, 브릿지론 불가 |
| 서버 장애 | `trust < 20` 즉시 LOST_OUTAGE | 20% | 경고 없음, 회복 수단 없음 |
| 용량 초과 | 매 턴 trust -10 | users > maxUserCapacity | 누적 감소로 회복 불가 |
| 초기 피칭 실패 | trust = 0 (즉시 초기화) | 턴2, trust < 6 | 0으로 즉사 스파이럴 |
| 투자 실패 | BadRequestException throw | Series A/B/C 각 신뢰도 미달 | 대안 자금 조달 없음 |
| 지분 희석 | equityPercentage < 20 | 20% | 즉시 게임 오버 |

### 1.2 연쇄 실패 시나리오 분석

**시나리오 A: 용량 초과 죽음의 나선**
```
턴 N: users > maxCapacity -> trust -10
턴 N+1: 여전히 users > maxCapacity -> trust -10 (추가)
턴 N+2: trust < 20 -> 즉시 게임 오버
```
문제: 인프라 업그레이드 선택지가 없는 턴에서 용량 초과가 발생하면 탈출이 불가능하다.

**시나리오 B: 초기 피칭 실패 -> 즉사**
```
턴 2: 피칭 선택 (choiceId: 8) + trust < 6 -> trust = 0
턴 3: trust < 20 -> 즉시 게임 오버 (LOST_OUTAGE)
```
문제: 초기 신뢰도(INITIAL_TRUST = 0)에서 시작하여, 턴 1에서 신뢰도를 6 이상 올리지 못하면 턴 2 피칭이 자동 실패한다.

**시나리오 C: 자금 고갈 -> 즉사**
```
턴 N: 큰 비용 지출 선택 -> cash < 0 -> 즉시 LOST_BANKRUPT
```
문제: 현실의 스타트업은 런웨이가 줄어들면 긴급 조치를 취한다.

### 1.3 현실 스타트업과의 괴리

현실에서 스타트업이 위기에서 회복하는 방법들:
- 브릿지 파이낸싱 (기존 투자자의 추가 투자)
- 피벗 (사업 모델 전환)
- 비용 절감 (인원 축소, 서비스 축소)
- 기술 부채 해소 (아키텍처 리팩토링)
- 파트너십/인수합병 제안
- 정부 지원금/보조금
- 고객 직접 소통을 통한 신뢰 회복

현재 게임에는 이 중 어느 것도 구현되어 있지 않다.

---

## 2. 경고 시스템 (Warning System)

### 2.1 설계 철학

플레이어가 위기 상황을 "예측"할 수 있어야 한다. 즉사가 아니라 경고 -> 위기 -> 실패의 3단계 흐름을 제공한다.

### 2.2 메트릭별 경고 임계값

```typescript
// game-constants.ts 에 추가할 상수
export const WARNING_THRESHOLDS = {
  // 신뢰도 경고
  TRUST_DANGER: 30,      // 빨간색 경고: "서비스 장애 위험"
  TRUST_WARNING: 45,     // 노란색 경고: "신뢰도 하락 주의"
  TRUST_CAUTION: 60,     // 파란색 알림: "신뢰도 관리 필요"

  // 자금 경고 (남은 턴 대비 burn rate 기반)
  CASH_DANGER: 5_000_000,     // 빨간색: "파산 위험"
  CASH_WARNING: 20_000_000,   // 노란색: "자금 부족 주의"
  CASH_CAUTION: 50_000_000,   // 파란색: "자금 관리 필요"

  // 용량 경고 (사용률 기반)
  CAPACITY_DANGER: 0.90,   // 빨간색: 유저/용량 >= 90%
  CAPACITY_WARNING: 0.75,  // 노란색: 유저/용량 >= 75%
  CAPACITY_CAUTION: 0.60,  // 파란색: 유저/용량 >= 60%

  // 투자 유치 사전 경고 (다가오는 시리즈 라운드 전)
  INVESTMENT_WARNING_TURNS_BEFORE: 2,  // 투자 턴 2턴 전부터 경고
} as const;
```

### 2.3 경고 메시지 구조

```typescript
interface WarningMessage {
  type: 'danger' | 'warning' | 'caution';
  metric: 'trust' | 'cash' | 'capacity' | 'investment';
  title: string;          // 짧은 제목
  message: string;        // 상세 설명
  advice: string;         // 권장 행동
  turnsToThreshold: number; // 현재 추세로 임계값까지 남은 턴 수 (추정)
}
```

### 2.4 경고 표시 예시

| 상태 | 아이콘 | 메시지 | 조언 |
|------|--------|--------|------|
| trust = 35 | 빨간색 경보 | "서비스 장애 임박! 신뢰도 35%" | "인프라 안정화 또는 고객 소통을 우선시하세요" |
| cash = 15M | 노란색 경고 | "런웨이 부족! 약 2턴 후 파산 위험" | "비용 절감이나 투자 유치를 고려하세요" |
| users/capacity = 82% | 노란색 경고 | "인프라 한계 근접! 사용률 82%" | "스케일업 또는 오토스케일링 도입을 검토하세요" |
| 시리즈 A 2턴 전 + trust < 30 | 빨간색 경보 | "시리즈 A 투자 위험! 신뢰도 미달" | "턴 12까지 신뢰도 30% 이상 달성 필요" |

### 2.5 교육적 가치

- **런웨이 개념 학습**: 자금 경고가 "남은 턴" 기준으로 표시되어, 번 레이트(burn rate) 관리의 중요성을 체감
- **SLA 관리 학습**: 용량 경고가 사용률 기반이어서, 프로비저닝 계획의 필요성을 이해
- **투자자 관계 학습**: 투자 사전 경고를 통해 펀드레이징 타이밍의 중요성을 습득

### 2.6 긴장감 유지 방안

- 경고는 정보 제공일 뿐, 메트릭 변화를 막지 않는다
- 경고를 무시하면 진짜 위기가 온다
- 경고 횟수가 누적되면 투자자 신뢰에 간접적으로 영향 (투자 임계값 +2% 증가)

---

## 3. 유예 기간 (Grace Period)

### 3.1 설계 철학

즉사를 방지하되, 무한한 기회를 주지는 않는다. "위기 상태"라는 중간 단계를 도입한다.

### 3.2 신뢰도 유예 기간

```typescript
export const GRACE_PERIOD = {
  // 신뢰도 유예
  TRUST_GRACE_THRESHOLD: 20,    // 이 이하로 내려가면 유예 기간 시작
  TRUST_GRACE_TURNS: 2,         // 2턴의 유예 기간
  TRUST_RECOVERY_TARGET: 30,    // 유예 기간 내 이 수치 이상으로 회복해야 함

  // 자금 유예
  CASH_GRACE_THRESHOLD: 0,      // 0원 이하로 내려가면 유예 기간 시작
  CASH_GRACE_TURNS: 1,          // 1턴의 유예 기간
  CASH_OVERDRAFT_LIMIT: -20_000_000, // 최대 마이너스 한도 (비상 대출)

  // 용량 초과 유예
  CAPACITY_GRACE_TURNS: 1,      // 용량 초과 시 1턴 유예 (감소된 페널티)
  CAPACITY_GRACE_PENALTY: 5,    // 유예 기간 중 페널티: trust -5 (현재 -10의 절반)
} as const;
```

### 3.3 신뢰도 유예 메커니즘

**트리거**: `trust < TRUST_GRACE_THRESHOLD (20)`

**동작 흐름**:
```
1. trust < 20 도달
   -> 즉시 게임 오버 대신 "서비스 위기" 상태 진입
   -> trustGraceTurnsRemaining = 2 설정
   -> 경고 모달: "서비스 장애 발생! 2턴 내에 신뢰도를 30% 이상으로 회복하세요"

2. 유예 턴 1
   -> 일반 선택지 + 긴급 복구 선택지 표시
   -> trustGraceTurnsRemaining -= 1
   -> 선택 결과에 따라 trust 변동

3. 유예 턴 2
   -> trustGraceTurnsRemaining -= 1
   -> if (trust >= 30): 위기 탈출 성공 -> 정상 복귀
   -> if (trust < 30): LOST_OUTAGE -> 게임 오버
```

**Game 엔티티 추가 필드**:
```typescript
@Column({ type: 'int', default: 0 })
trustGraceTurnsRemaining: number;

@Column({ type: 'boolean', default: false })
inTrustCrisis: boolean;

@Column({ type: 'int', default: 0 })
cashGraceTurnsRemaining: number;

@Column({ type: 'boolean', default: false })
inCashCrisis: boolean;
```

### 3.4 자금 유예 메커니즘

**트리거**: `cash < 0`

**동작 흐름**:
```
1. cash < 0 도달
   -> 즉시 게임 오버 대신 "자금 위기" 상태 진입
   -> cashGraceTurnsRemaining = 1
   -> 긴급 대출 자동 적용: cash += |cash| (0으로 복귀) + 2천만원 비상금
   -> 단, 이 비상금에는 이자가 붙음: 다음 턴 cash -= 2500만원 (25% 이자)

2. 유예 턴 1
   -> 긴급 자금 조달 선택지가 추가로 나타남
   -> 턴 종료 시 비상 대출 상환
   -> if (cash >= 0): 위기 탈출
   -> if (cash < CASH_OVERDRAFT_LIMIT): 완전 파산 -> LOST_BANKRUPT
```

### 3.5 용량 초과 유예 메커니즘

**트리거**: `users > maxUserCapacity` (첫 발생 시)

**동작 흐름**:
```
1. 첫 번째 용량 초과 턴
   -> trust 페널티 절반 적용 (-5, 현재 -10 대신)
   -> "서비스 지연 발생" 경고 메시지
   -> "다음 턴까지 인프라를 업그레이드하지 않으면 전면 장애 발생" 안내

2. 두 번째 연속 용량 초과 턴부터
   -> 전체 페널티 적용 (-10)
   -> 추가로 유저 이탈 발생: users -= Math.floor(users * 0.05) (5% 이탈)
```

### 3.6 교육적 가치

- **인시던트 관리 학습**: 실제 장애에는 즉시 복구 시도가 가능하다
- **런웨이 관리 학습**: 현금 위기는 즉시 파산이 아니라, 긴급 대응의 기회가 있다
- **SLA 타이어 학습**: 부분 장애(지연)와 전면 장애의 차이를 경험

### 3.7 긴장감 유지 방안

- 유예 기간은 1회만 적용: 한 번 위기를 넘기면 다음에는 즉시 게임 오버
- 유예 기간 중 모든 메트릭에 부정적 배율 적용 (trust 획득 x0.5)
- 유예 기간 사용 기록이 투자자 평가에 반영 (투자 임계값 +5%)
- 비상 대출의 이자가 장기적으로 부담

```typescript
// 유예 기간 제한
export const GRACE_LIMITS = {
  MAX_TRUST_GRACE_USES: 1,   // 신뢰도 유예는 게임당 1회
  MAX_CASH_GRACE_USES: 2,    // 자금 유예는 게임당 2회
  GRACE_TRUST_GAIN_MULTIPLIER: 0.5,  // 유예 기간 중 신뢰도 획득 50%
  GRACE_INVESTMENT_PENALTY: 5,  // 유예 사용 시 투자 임계값 +5%
  EMERGENCY_LOAN_INTEREST: 0.25, // 비상 대출 이자율 25%
} as const;
```

---

## 4. 긴급 행동 (Emergency Actions)

### 4.1 설계 철학

위기 상황에서만 나타나는 특별 선택지를 제공한다. 강력한 효과가 있지만 반드시 대가가 따른다.

### 4.2 긴급 행동 목록

#### 4.2.1 긴급 서버 확장 (Emergency Scale-Up)

| 항목 | 내용 |
|------|------|
| **트리거** | users/maxCapacity >= 0.85 또는 용량 초과 상태 |
| **비용** | cash -= maxUserCapacity * 500 (현재 용량 기반 비용) |
| **효과** | maxUserCapacity *= 1.5 (50% 용량 즉시 증가) |
| **대가** | 다음 턴 운영비 2배 (성급한 스케일업의 비용) |
| **교육적 가치** | 예방적 스케일링 vs 반응적 스케일링의 비용 차이를 체감 |
| **텍스트** | "야근 투입! 긴급 EC2 인스턴스 증설 + Auto Scaling 임시 설정" |

#### 4.2.2 긴급 장애 복구 (Emergency Incident Response)

| 항목 | 내용 |
|------|------|
| **트리거** | trust < 30 (위기 상태 또는 유예 기간 중) |
| **비용** | cash -= 30,000,000 (3천만원) |
| **효과** | trust += 15 (즉시 신뢰도 회복) |
| **대가** | 다음 2턴간 유저 획득 x0.5 (장애 후유증으로 신규 가입 감소) |
| **교육적 가치** | 인시던트 커뮤니케이션의 중요성, 장애 대응 비용 학습 |
| **텍스트** | "전사 인시던트 대응: 장애 보고서 공개 + 보상 크레딧 지급 + SLA 강화 공약" |

#### 4.2.3 브릿지 파이낸싱 (Bridge Financing)

| 항목 | 내용 |
|------|------|
| **트리거** | cash < 20,000,000 (2천만원 미만) 또는 자금 유예 기간 중 |
| **비용** | equityPercentage -= 5 (지분 5% 추가 희석) |
| **효과** | cash += 50,000,000 (5천만원 긴급 투자) |
| **대가** | 다음 투자 라운드 trust 요구치 +5% (불리한 조건의 투자) |
| **교육적 가치** | 다운라운드/브릿지 파이낸싱의 희석 비용 학습 |
| **텍스트** | "기존 투자자에게 긴급 브릿지 라운드 요청 - 불리한 조건이지만 생존이 우선" |

#### 4.2.4 긴급 비용 절감 (Emergency Cost Cut)

| 항목 | 내용 |
|------|------|
| **트리거** | cash < 30,000,000 (3천만원 미만) |
| **비용** | trust -= 5, 채용 효과 1개 해제 |
| **효과** | cash += 현재_burn_rate * 3 (3턴 분의 비용 절약) |
| **대가** | multiChoiceEnabled 해제 (인원 감축), userAcquisitionMultiplier = 1.0 (디자이너 해고) 등 |
| **교육적 가치** | 구조조정의 현실적 비용과 팀 사기 영향 학습 |
| **텍스트** | "긴급 구조조정: 부서 통폐합 + 비핵심 프로젝트 중단" |

#### 4.2.5 기술 부채 상환 (Technical Debt Payment)

| 항목 | 내용 |
|------|------|
| **트리거** | 용량 초과 2턴 연속 발생 시 |
| **비용** | 1턴 소비 (다음 턴 건너뜀), cash -= 20,000,000 |
| **효과** | maxUserCapacity *= 2 (아키텍처 리팩토링으로 효율 2배) |
| **대가** | 1턴 손실 (25턴 제한에서 매우 큰 비용) |
| **교육적 가치** | 기술 부채의 누적 비용과 리팩토링 타이밍의 중요성 |
| **텍스트** | "전체 아키텍처 리팩토링: 마이크로서비스 전환 + 캐시 레이어 재설계" |

### 4.3 긴급 행동 구현 구조

```typescript
interface EmergencyAction {
  id: string;
  name: string;
  description: string;
  triggerCondition: (game: Game) => boolean;
  cost: {
    cash?: number;
    trust?: number;
    equity?: number;
    turnsLost?: number;
    staffLost?: string[];
  };
  effect: {
    cash?: number;
    trust?: number;
    capacityMultiplier?: number;
    users?: number;
  };
  penalty: {
    duration: number;  // 페널티 지속 턴 수
    trustGainMultiplier?: number;
    userGainMultiplier?: number;
    cashBurnMultiplier?: number;
  };
  maxUses: number;  // 게임당 최대 사용 횟수
  educationalNote: string;  // 교육적 설명 (선택 후 표시)
}
```

### 4.4 긴장감 유지 방안

- 모든 긴급 행동에는 명확한 대가가 존재
- 사용 횟수 제한 (대부분 게임당 1-2회)
- 긴급 행동 사용 기록이 최종 점수에 감점 반영
- 긴급 행동은 일반 선택지 대신 소비 (기회비용)

---

## 5. 피벗 메커니즘 (Pivot Mechanics)

### 5.1 설계 철학

현실의 스타트업에서 피벗은 흔하고 건강한 전략적 선택이다. 게임에서도 중반 이후 전략을 수정할 수 있어야 한다.

### 5.2 피벗 가능 시점

```typescript
export const PIVOT_CONSTANTS = {
  // 피벗 가능 턴 (초반은 제외, 너무 늦은 시점도 제외)
  PIVOT_EARLIEST_TURN: 8,
  PIVOT_LATEST_TURN: 20,

  // 피벗 비용
  PIVOT_CASH_COST: 30_000_000,  // 3천만원
  PIVOT_TRUST_COST: 10,          // 신뢰도 -10 (방향 전환에 대한 시장 불확실성)
  PIVOT_TURNS_PENALTY: 1,        // 1턴 소비 (리브랜딩/전환 기간)

  // 피벗 효과
  PIVOT_USER_RESET_RATIO: 0.3,   // 기존 유저의 30%만 유지
  PIVOT_INFRA_RETAIN: true,       // 인프라는 유지 (기술 자산)

  // 피벗 횟수 제한
  MAX_PIVOTS: 2,                  // 게임당 최대 2회
} as const;
```

### 5.3 피벗 유형

#### 유형 A: B2C에서 B2B로 전환
| 항목 | 내용 |
|------|------|
| **효과** | 유저 수 30%로 감소, 그러나 유저당 매출 5배 증가 (cashPerUser *= 5) |
| **요구 조건** | ECS 또는 EKS 인프라 보유 |
| **교육적 가치** | B2B SaaS 전환의 유닛 이코노미스 학습 |

#### 유형 B: 플랫폼에서 API 서비스로 전환
| 항목 | 내용 |
|------|------|
| **효과** | 유저 수 50%로 감소, 인프라 용량 요구치 70%로 감소, trust +10 |
| **요구 조건** | Lambda 또는 Aurora 보유 |
| **교육적 가치** | API 이코노미와 인프라 효율화 학습 |

#### 유형 C: 국내에서 글로벌로 전환
| 항목 | 내용 |
|------|------|
| **효과** | 유저 수 유지, 향후 유저 획득 배율 x3, 인프라 비용 x2 |
| **요구 조건** | CloudFront 보유 |
| **교육적 가치** | 글로벌 확장의 인프라 비용과 성장 잠재력 학습 |

### 5.4 피벗 프로세스 흐름

```
1. 플레이어가 피벗 버튼 클릭
2. 피벗 유형 선택 화면 표시 (조건 미충족 유형은 비활성)
3. 비용 확인 및 동의
4. 피벗 적용:
   a. 즉시 비용 차감 (cash, trust)
   b. 유저 수 조정
   c. 새로운 배율/메카닉 적용
   d. 1턴 소비 (피벗 실행 턴)
5. 피벗 결과 모달 표시
6. 다음 턴부터 새로운 전략으로 진행
```

### 5.5 교육적 가치

- Slack(게임 -> 기업 메시징), Instagram(체크인 -> 사진 공유) 등 실제 피벗 사례 참조
- 피벗 후 유저 감소는 현실적이지만, 새로운 성장 곡선이 더 가파르다
- 피벗 타이밍이 중요: 너무 빠르면 데이터 부족, 너무 느리면 자원 소진

### 5.6 긴장감 유지 방안

- 피벗에는 큰 비용이 수반 (자금 + 신뢰도 + 유저 + 1턴)
- 피벗 후 2턴은 "전환기"로 메트릭 변동이 큼
- 게임당 2회로 제한하여 신중한 결정 유도
- 잘못된 피벗은 오히려 상황을 악화시킬 수 있음

---

## 6. 부분 실패 (Partial Failure / Degraded State)

### 6.1 설계 철학

즉사 대신 "성능 저하" 상태를 도입한다. 게임은 계속 진행되지만 불리한 조건에서 운영해야 한다.

### 6.2 성능 저하 단계 시스템

```typescript
export enum ServiceHealth {
  HEALTHY = 'HEALTHY',           // 정상 (trust >= 60)
  DEGRADED = 'DEGRADED',         // 성능 저하 (45 <= trust < 60)
  PARTIAL_OUTAGE = 'PARTIAL_OUTAGE', // 부분 장애 (30 <= trust < 45)
  MAJOR_OUTAGE = 'MAJOR_OUTAGE',     // 주요 장애 (20 <= trust < 30)
  CRITICAL = 'CRITICAL',         // 치명적 (trust < 20, 유예 기간 적용)
}

export const DEGRADED_STATE_EFFECTS = {
  HEALTHY: {
    userGainMultiplier: 1.0,
    cashGainMultiplier: 1.0,
    trustGainMultiplier: 1.0,
    label: '정상 운영',
  },
  DEGRADED: {
    userGainMultiplier: 0.8,   // 신규 유저 유입 20% 감소
    cashGainMultiplier: 0.9,   // 매출 10% 감소
    trustGainMultiplier: 1.0,
    label: '서비스 지연 발생',
  },
  PARTIAL_OUTAGE: {
    userGainMultiplier: 0.5,   // 신규 유저 유입 50% 감소
    cashGainMultiplier: 0.7,   // 매출 30% 감소
    trustGainMultiplier: 0.8,  // 신뢰 회복 어려움
    label: '부분 서비스 장애',
  },
  MAJOR_OUTAGE: {
    userGainMultiplier: 0.2,   // 신규 유저 거의 없음
    cashGainMultiplier: 0.4,   // 매출 60% 감소
    trustGainMultiplier: 0.5,  // 신뢰 회복 매우 어려움
    userChurnRate: 0.02,       // 매 턴 기존 유저 2% 이탈
    label: '주요 서비스 장애',
  },
  CRITICAL: {
    userGainMultiplier: 0.0,   // 신규 유저 없음
    cashGainMultiplier: 0.2,   // 매출 80% 감소
    trustGainMultiplier: 0.3,  // 신뢰 회복 극히 어려움
    userChurnRate: 0.05,       // 매 턴 기존 유저 5% 이탈
    label: '서비스 중단 임박',
  },
} as const;
```

### 6.3 자금 성능 저하

파산 대신 "긴축 모드"를 도입:

```typescript
export enum FinancialHealth {
  HEALTHY = 'HEALTHY',           // cash > 50M
  TIGHT = 'TIGHT',              // 20M < cash <= 50M
  CRITICAL = 'CRITICAL',        // 0 < cash <= 20M
  INSOLVENT = 'INSOLVENT',      // cash <= 0 (유예 기간)
}

export const FINANCIAL_STATE_EFFECTS = {
  HEALTHY: {
    availableChoices: 'all',
    label: '재정 건전',
  },
  TIGHT: {
    // 고비용 선택지 비활성화 (cash cost > 50% of current cash)
    choiceCostLimit: 0.5,
    label: '재정 긴축',
  },
  CRITICAL: {
    // 고비용 선택지 비활성화 + 긴급 선택지 추가
    choiceCostLimit: 0.3,
    staffMoralePenalty: -3,   // trust -3 (팀 사기 저하)
    label: '자금 위기',
  },
  INSOLVENT: {
    // 최소한의 선택지만 + 긴급 자금 조달 선택지만
    emergencyOnly: true,
    staffMoralePenalty: -5,
    label: '지불 불능',
  },
} as const;
```

### 6.4 용량 초과 부분 실패

현재의 일률적 -10 대신 단계적 페널티:

```typescript
export const CAPACITY_OVERFLOW_TIERS = {
  // 용량의 100%-120%: 경미한 지연
  MINOR: {
    threshold: 1.0,
    trustPenalty: 3,
    label: '서비스 응답 지연',
    description: '일부 사용자가 간헐적 지연을 경험합니다',
  },
  // 용량의 120%-150%: 상당한 장애
  MODERATE: {
    threshold: 1.2,
    trustPenalty: 7,
    userChurnRate: 0.02,
    label: '서비스 불안정',
    description: '다수 사용자가 오류를 경험하고 일부가 이탈합니다',
  },
  // 용량의 150% 초과: 심각한 장애
  SEVERE: {
    threshold: 1.5,
    trustPenalty: 15,
    userChurnRate: 0.05,
    label: '전면 서비스 장애',
    description: '서비스가 사실상 중단 상태이며 대량 이탈이 발생합니다',
  },
} as const;
```

### 6.5 교육적 가치

- **SLA 티어 학습**: 99.9% vs 99.99%의 차이가 사용자 경험에 어떤 영향인지 체감
- **장애 등급 학습**: P1/P2/P3 인시던트 분류 체계의 필요성 이해
- **캐패시티 플래닝 학습**: 버퍼 없는 운영의 위험성 체감

### 6.6 긴장감 유지 방안

- 성능 저하 상태에서는 모든 메트릭 획득이 감소하여 점점 불리해짐
- 성능 저하가 지속되면 유저 이탈이 시작되어 매출에도 영향
- "회복은 가능하지만, 빨리 해야 한다"는 시간 압박을 제공
- 성능 저하 기록이 최종 점수에 감점 반영

---

## 7. 역전 메커니즘 (Comeback Mechanics)

### 7.1 설계 철학

게임이 "이미 졌다"는 느낌을 주지 않으면서도, 쉽게 이기게 만들지 않는다. 뒤처진 플레이어에게 "합리적인" 역전 기회를 제공한다.

### 7.2 모멘텀 시스템 (Momentum System)

연속으로 올바른 결정을 내리면 보너스가 누적된다:

```typescript
export const MOMENTUM_SYSTEM = {
  // 연속 성공 보너스 (choice 효과가 긍정적일 때)
  STREAK_THRESHOLDS: [3, 5, 7],  // 연속 턴 수
  STREAK_BONUSES: [1.1, 1.25, 1.5],  // 효과 배율

  // 역전 보너스 (위기에서 회복 중일 때)
  COMEBACK_TRIGGER: {
    // trust가 30 미만에서 2턴 연속 상승하면 역전 보너스 발동
    trustRecoveryStreak: 2,
    trustThreshold: 30,
    bonus: {
      trustGainMultiplier: 1.5,  // 신뢰 회복 50% 보너스
      duration: 3,               // 3턴간 지속
    },
  },

  // 가성비 보너스 (낮은 비용으로 높은 효과를 내면)
  EFFICIENCY_BONUS: {
    // 현재 cash의 10% 미만을 쓰고 trust +10 이상이면
    cashRatioThreshold: 0.1,
    trustGainThreshold: 10,
    bonus: {
      cashGain: 5_000_000,     // 500만원 보너스 (효율적 운영 보상)
    },
  },
} as const;
```

### 7.3 위기 극복 보상 (Crisis Survival Bonus)

```typescript
export const CRISIS_SURVIVAL_REWARDS = {
  // 신뢰도 위기 극복
  TRUST_CRISIS_SURVIVED: {
    trustBonus: 5,            // 위기 극복 후 신뢰도 +5 보너스
    message: '위기를 극복한 투명한 대응이 오히려 신뢰를 높였습니다',
  },

  // 자금 위기 극복
  CASH_CRISIS_SURVIVED: {
    cashBonus: 10_000_000,   // 1천만원 보너스
    message: '위기 속 효율적 운영이 투자자의 관심을 끌었습니다',
  },

  // 용량 위기 극복 (스케일업 성공)
  CAPACITY_CRISIS_SURVIVED: {
    capacityBonus: 1.2,      // 용량 20% 추가 보너스
    trustBonus: 3,
    message: '장애 대응 경험이 인프라 운영 역량을 강화했습니다',
  },
} as const;
```

### 7.4 뒤처진 상태 감지 및 보정

"러버밴딩"은 직접 메트릭을 올려주는 것이 아니라, "기회의 품질"을 높여주는 방식으로 구현:

```typescript
/**
 * 뒤처짐 지수 계산
 * 현재 턴 기준으로 IPO 목표 대비 얼마나 뒤처져 있는지 0-1 사이 값으로 반환
 * 0 = 목표 초과 달성, 1 = 목표 대비 극히 부족
 */
function calculateBehindIndex(game: Game): number {
  const turnProgress = game.currentTurn / GAME_CONSTANTS.MAX_TURNS;

  const userProgress = game.users / GAME_CONSTANTS.IPO_MIN_USERS;
  const cashProgress = game.cash / GAME_CONSTANTS.IPO_MIN_CASH;
  const trustProgress = game.trust / GAME_CONSTANTS.IPO_MIN_TRUST;

  const avgProgress = (userProgress + cashProgress + trustProgress) / 3;
  const deficit = Math.max(0, turnProgress - avgProgress);

  return Math.min(1, deficit);
}
```

**뒤처짐 지수에 따른 보정**:

| 뒤처짐 지수 | 보정 내용 |
|------------|-----------|
| 0.0 ~ 0.2 | 보정 없음 (정상 진행) |
| 0.2 ~ 0.4 | 선택지 중 1개에 "숨겨진 보너스" 추가 (랜덤) |
| 0.4 ~ 0.6 | 긍정적 랜덤 이벤트 발생 확률 20% |
| 0.6 ~ 0.8 | 긴급 행동 1회 추가 + 긍정적 이벤트 40% |
| 0.8 ~ 1.0 | 멘토 조언 자동 발동 + 긍정적 이벤트 60% |

### 7.5 교육적 가치

- **린 스타트업 학습**: 적은 자원으로 효율적 성과를 내면 보너스가 주어진다
- **회복력(Resilience) 학습**: 위기를 극복하면 오히려 더 강해질 수 있다
- **성장 마인드셋**: "이미 졌다"가 아니라 "어떻게 역전할까"를 생각하게 한다

### 7.6 긴장감 유지 방안

- 역전 보너스는 "자동 회복"이 아니라 "더 나은 기회 제공"
- 여전히 올바른 결정을 내려야만 역전 가능
- 보너스 크기가 게임을 뒤집을 만큼 크지 않음 (약간의 도움)
- 모멘텀은 잘못된 선택 1회로 초기화

---

## 8. 멘토/어드바이저 시스템 (Mentor/Advisor System)

### 8.1 설계 철학

실제 스타트업에서 멘토, 투자자, 보드 멤버의 조언은 매우 중요하다. 게임에서도 NPC 어드바이저가 플레이어를 가이드한다.

### 8.2 어드바이저 프로필

```typescript
interface Advisor {
  id: string;
  name: string;
  role: string;
  specialty: 'infrastructure' | 'business' | 'finance' | 'growth';
  portrait: string;  // 아이콘/이미지
  triggerConditions: TriggerCondition[];
  advicePool: Advice[];
}

const ADVISORS = [
  {
    id: 'sa_kim',
    name: '김수현 SA',
    role: 'AWS Solutions Architect',
    specialty: 'infrastructure',
    portrait: 'aws-sa-icon',
    description: '인프라 관련 조언 전문. 용량 계획과 아키텍처 설계에 강점.',
  },
  {
    id: 'cfo_park',
    name: '박재영 CFO',
    role: '시리즈 C 경험 CFO',
    specialty: 'finance',
    description: '재무 관련 조언 전문. 번 레이트 관리와 투자 전략에 강점.',
  },
  {
    id: 'mentor_lee',
    name: '이정민 멘토',
    role: '연쇄 창업자 (3회 EXIT)',
    specialty: 'business',
    description: '사업 전략 조언 전문. 피벗 타이밍과 시장 진입에 강점.',
  },
  {
    id: 'growth_choi',
    name: '최서연 VP',
    role: 'Growth VP',
    specialty: 'growth',
    description: '성장 전략 조언 전문. 유저 획득과 리텐션 최적화에 강점.',
  },
] as const;
```

### 8.3 조언 트리거 조건

```typescript
const ADVISOR_TRIGGERS = {
  // 인프라 어드바이저
  INFRA_CAPACITY_WARNING: {
    advisor: 'sa_kim',
    condition: (game: Game) => game.users / game.maxUserCapacity >= 0.7,
    advice: '현재 인프라 사용률이 70%를 넘었습니다. Auto Scaling이나 캐시 레이어 도입을 고려하세요. 트래픽 급증에 대비하려면 현재 용량의 최소 2배를 확보하는 것이 좋습니다.',
    recommendedChoices: ['infra'], // 인프라 카테고리 강조
  },

  // 재무 어드바이저
  FINANCE_RUNWAY_WARNING: {
    advisor: 'cfo_park',
    condition: (game: Game) => {
      const estimatedBurnRate = 5_000_000; // 턴당 기본 운영비
      const runway = game.cash / estimatedBurnRate;
      return runway < 5; // 5턴 미만 런웨이
    },
    advice: '현재 번 레이트 기준으로 런웨이가 5턴 미만입니다. 매출 성장이 충분하지 않다면 투자 유치를 서두르거나 비용을 절감해야 합니다.',
    recommendedChoices: ['finance'],
  },

  // 사업 멘토
  BUSINESS_PIVOT_SUGGESTION: {
    advisor: 'mentor_lee',
    condition: (game: Game) => {
      const behindIndex = calculateBehindIndex(game);
      return behindIndex > 0.5 && game.currentTurn >= 10;
    },
    advice: '현재 진행 속도로는 목표 달성이 어려울 수 있습니다. 피벗을 고려해볼 시점입니다. B2B 전환이나 API 서비스 전환으로 성장 곡선을 바꿀 수 있습니다.',
    recommendedChoices: ['pivot'],
  },

  // 성장 어드바이저
  GROWTH_STAGNATION: {
    advisor: 'growth_choi',
    condition: (game: Game) => {
      // 3턴 연속 유저 증가 0이면
      return game.users < 1000 && game.currentTurn > 5;
    },
    advice: '유저 성장이 정체되고 있습니다. 마케팅 투자나 디자이너 채용으로 유저 획득 효율을 높이세요. 초기에는 유저 기반 확보가 투자 유치의 핵심입니다.',
    recommendedChoices: ['marketing'],
  },
} as const;
```

### 8.4 조언 표시 방식

```typescript
interface AdvisorMessage {
  advisorId: string;
  advisorName: string;
  advisorRole: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  recommendedAction?: string;
  educationalTip?: string;
  dismissable: boolean;
}
```

**UI 표현**:
- 어드바이저 프로필 아이콘이 사이드바에 표시
- 조언이 있으면 아이콘에 알림 뱃지
- 클릭하면 어드바이저 대화 패널 표시
- 위기 상황에서는 자동으로 모달 형태로 표시

### 8.5 조언 품질 시스템

- **기본 조언**: 무료, 일반적인 방향 제시 (위 예시 수준)
- **상세 조언**: cash 500만원 소비, 구체적 선택지 추천 + 수치 근거
- **전략 컨설팅**: cash 2천만원, 최적 선택지 하이라이트 + 향후 3턴 시뮬레이션

### 8.6 교육적 가치

- **실제 어드바이저 역할 학습**: 스타트업에서 멘토/보드 멤버의 가치 이해
- **의사결정 프레임워크 학습**: 어드바이저 조언이 분석 프레임워크를 포함
- **비용 대비 가치 학습**: 좋은 조언에는 비용이 들지만 그만한 가치가 있다

### 8.7 긴장감 유지 방안

- 기본 조언은 "방향"만 알려주고, 구체적 선택은 플레이어가 해야 함
- 상세 조언도 100% 정확하지 않을 수 있음 (현실 반영)
- 어드바이저 조언을 따르면 보통 안전하지만 "최적"은 아닐 수 있음
- 비용이 있으므로 남발하면 자금 부담

---

## 9. 기회 이벤트 (Second Chance Events)

### 9.1 설계 철학

현실에서도 우연한 기회가 위기를 극복하는 열쇠가 되기도 한다. 단, 노력 없이 얻어지는 것은 아니다.

### 9.2 위기 시 발생하는 긍정적 이벤트

```typescript
interface OpportunityEvent {
  id: string;
  name: string;
  description: string;
  triggerCondition: (game: Game) => boolean;
  probability: number;  // 발생 확률 (0-1)
  effect: Partial<ChoiceEffects>;
  requiresAction: boolean;  // true면 선택이 필요, false면 자동 적용
  choices?: OpportunityChoice[];
  educationalNote: string;
}

const OPPORTUNITY_EVENTS: OpportunityEvent[] = [
  {
    id: 'media_coverage',
    name: '언론 보도',
    description: '한 IT 미디어가 당신의 스타트업을 "위기를 극복한 스타트업" 으로 소개하고 싶어합니다.',
    triggerCondition: (game) => game.trust >= 25 && game.trust < 40,
    probability: 0.3,
    effect: { trust: 8, users: 2000 },
    requiresAction: true,
    choices: [
      {
        text: '인터뷰 수락 (솔직한 위기 극복 스토리 공유)',
        effect: { trust: 8, users: 2000 },
        risk: 0, // 안전한 선택
      },
      {
        text: '인터뷰 수락 + 신규 기능 발표',
        effect: { trust: 12, users: 5000, cash: -5_000_000 },
        risk: 0.2, // 20% 확률로 역효과 (과장 홍보로 trust -5)
      },
      {
        text: '정중히 거절 (아직 준비가 안됨)',
        effect: {},
        risk: 0,
      },
    ],
    educationalNote: '스타트업에서 미디어 노출은 양날의 검입니다. 진정성 있는 스토리텔링이 중요합니다.',
  },
  {
    id: 'angel_interest',
    name: '엔젤 투자자 관심',
    description: '한 엔젤 투자자가 당신의 기술력에 관심을 보이며 소규모 투자를 제안합니다.',
    triggerCondition: (game) => game.cash < 20_000_000 && game.trust >= 20,
    probability: 0.25,
    effect: { cash: 30_000_000 },
    requiresAction: true,
    choices: [
      {
        text: '투자 수락 (지분 3% 희석)',
        effect: { cash: 30_000_000 },
        equityCost: 3,
      },
      {
        text: '전환사채로 협상 (향후 전환 시 지분 5%)',
        effect: { cash: 25_000_000 },
        equityCost: 0, // 지금은 아니지만 나중에 더 비쌈
        deferredEquityCost: 5,
      },
      {
        text: '거절 (독립 경영 유지)',
        effect: {},
      },
    ],
    educationalNote: '엔젤 투자는 초기 자금난 해결에 중요하지만, 밸류에이션에 따라 희석 비율이 크게 달라집니다.',
  },
  {
    id: 'aws_credits',
    name: 'AWS 크레딧 프로그램',
    description: 'AWS Activate 프로그램에 선정되어 인프라 크레딧을 받을 수 있습니다.',
    triggerCondition: (game) => game.cash < 30_000_000 && game.infrastructure.length >= 3,
    probability: 0.35,
    effect: { cash: 20_000_000 },
    requiresAction: false, // 자동 적용
    educationalNote: 'AWS Activate는 실제로 스타트업에 최대 $100K의 크레딧을 제공하는 프로그램입니다.',
  },
  {
    id: 'viral_moment',
    name: '바이럴 순간',
    description: '한 유명 인플루언서가 당신의 서비스를 자발적으로 추천했습니다!',
    triggerCondition: (game) => game.users > 5000 && game.users < 50000,
    probability: 0.15,
    requiresAction: true,
    choices: [
      {
        text: '바이럴에 대비해 인프라 긴급 증설',
        effect: { users: 15000, cash: -10_000_000, trust: 5 },
      },
      {
        text: '현재 인프라로 버텨보기',
        effect: { users: 15000, trust: -5 }, // 용량 초과 리스크
      },
      {
        text: '서버 과부하 방지를 위해 가입 제한 (웨이트리스트)',
        effect: { users: 5000, trust: 8 }, // 소수 유입, 높은 기대감
      },
    ],
    educationalNote: '예상치 못한 트래픽 급증은 축복이자 저주입니다. 사전 캐패시티 플래닝이 중요합니다.',
  },
  {
    id: 'partnership_offer',
    name: '파트너십 제안',
    description: '대기업에서 기술 파트너십을 제안합니다.',
    triggerCondition: (game) => game.infrastructure.includes('EKS') && game.trust >= 40,
    probability: 0.2,
    requiresAction: true,
    choices: [
      {
        text: '기술 라이센싱 계약 체결 (안정적 수익)',
        effect: { cash: 100_000_000, trust: 5 },
      },
      {
        text: '공동 개발 파트너십 (성장 잠재력)',
        effect: { cash: 30_000_000, users: 10000, trust: 10 },
      },
      {
        text: '거절 (독립성 유지)',
        effect: { trust: 3 }, // 시장에서 주목받고 있다는 신호
      },
    ],
    educationalNote: '대기업 파트너십은 스타트업에 정당성과 안정적 수익을 제공하지만, 의존도가 높아질 수 있습니다.',
  },
  {
    id: 'government_grant',
    name: '정부 지원 사업 선정',
    description: '중소벤처기업부의 클라우드 기반 혁신 스타트업 지원 사업에 선정되었습니다.',
    triggerCondition: (game) => game.currentTurn >= 5 && game.currentTurn <= 15 && game.cash < 40_000_000,
    probability: 0.25,
    effect: { cash: 50_000_000 },
    requiresAction: false,
    educationalNote: '정부 지원 사업은 지분 희석 없이 자금을 조달할 수 있는 중요한 방법입니다. TIPS, 창업성장기술개발 등 다양한 프로그램이 있습니다.',
  },
  {
    id: 'talent_referral',
    name: '인재 영입 기회',
    description: '전 네카라쿠배 출신 시니어 엔지니어가 합류 의사를 밝혔습니다.',
    triggerCondition: (game) => game.trust >= 30 && !game.hiredStaff.includes('개발자'),
    probability: 0.2,
    requiresAction: true,
    choices: [
      {
        text: '높은 연봉으로 영입 (즉시 개발력 확보)',
        effect: { cash: -15_000_000 },
        // multiChoiceEnabled = true 효과
        specialEffect: 'hire_developer',
      },
      {
        text: '스톡옵션 중심으로 협상 (자금 절약)',
        effect: { cash: -5_000_000 },
        equityCost: 2,
        specialEffect: 'hire_developer',
      },
      {
        text: '타이밍이 맞지 않아 보류',
        effect: {},
      },
    ],
    educationalNote: '초기 스타트업에서 핵심 인재 영입은 현금 vs 스톡옵션 트레이드오프가 항상 존재합니다.',
  },
];
```

### 9.3 이벤트 발생 엔진

```typescript
/**
 * 매 턴 시작 시 기회 이벤트 발생 여부를 체크한다.
 *
 * @param game 현재 게임 상태
 * @returns 발생한 이벤트 또는 null
 */
function checkOpportunityEvents(game: Game): OpportunityEvent | null {
  // 뒤처짐 지수에 따라 기본 확률 보정
  const behindIndex = calculateBehindIndex(game);
  const probabilityBoost = behindIndex * 0.3; // 최대 30% 확률 추가

  // 조건을 만족하는 이벤트 필터
  const eligibleEvents = OPPORTUNITY_EVENTS.filter(
    event => event.triggerCondition(game)
  );

  if (eligibleEvents.length === 0) return null;

  // 가중 랜덤 선택
  for (const event of eligibleEvents) {
    const adjustedProbability = Math.min(0.8, event.probability + probabilityBoost);
    if (Math.random() < adjustedProbability) {
      return event;
    }
  }

  return null;
}
```

### 9.4 교육적 가치

- **네트워킹 가치 학습**: 기회는 준비된 자에게 온다 (조건 충족 필요)
- **의사결정 학습**: 각 기회에 트레이드오프가 있어 분석이 필요
- **스타트업 생태계 학습**: AWS 크레딧, 정부 지원, 엔젤 투자 등 실제 자원 소개
- **리스크 관리 학습**: 일부 선택에는 확률적 리스크가 포함

### 9.5 긴장감 유지 방안

- 이벤트 발생은 확률적 (보장되지 않음)
- 이벤트 내 선택지에도 리스크가 존재
- 이벤트로 얻는 효과만으로는 게임을 이길 수 없음 (보조적 역할)
- 위기 극복 후에만 발생하므로, 먼저 최소한의 회복이 필요

---

## 10. 초기 피칭 실패 개선안 (Early Pitch Failure Fix)

### 10.1 현재 문제

```typescript
// 현재 코드 (game.service.ts:169)
if (earlyPitchingFailed) {
  game.trust = 0; // 즉시 0으로 초기화 -> 다음 턴 < 20 -> 게임 오버
}
```

이것은 턴 2에서 사실상 즉사를 의미한다.

### 10.2 개선안

```typescript
// 개선된 초기 피칭 실패 처리
if (earlyPitchingFailed) {
  // AS-IS: game.trust = 0 (즉사)
  // TO-BE: 부분적 실패로 변경

  const trustPenalty = Math.floor(game.trust * 0.5);  // 현재 신뢰도의 50% 감소
  game.trust = Math.max(5, game.trust - trustPenalty);  // 최소 5% 보장

  // 투자 효과 부분 적용 (완전 무효화 대신)
  const reducedCashEffect = Math.floor(choice.effects.cash * 0.2);  // 20%만 획득
  game.cash += reducedCashEffect;

  // 다음 투자 라운드 어려움 증가
  game.investmentTrustPenalty = (game.investmentTrustPenalty || 0) + 10;

  this.logger.warn(
    `초기 투자 피칭 부분 실패: 신뢰도 ${trustPenalty}% 감소, ` +
    `자금 ${reducedCashEffect}만 획득 (축소된 시드 투자)`
  );
}
```

### 10.3 교육적 가치

- 피칭 실패가 곧 회사의 끝이 아님을 학습
- 축소된 투자 라운드(다운라운드)의 개념 이해
- 피칭 실패 후에도 다른 방법으로 자금 조달이 가능하다는 것을 체험

---

## 11. 구현 우선순위

### Phase 1 (핵심, 즉시 구현)

| 순서 | 항목 | 기존 코드 변경 필요 | 난이도 |
|------|------|-------------------|--------|
| 1 | 초기 피칭 실패 개선 (10절) | game.service.ts 수정 | 낮음 |
| 2 | 경고 시스템 (2절) | GameResponseDto 확장, MetricsPanel 수정 | 중간 |
| 3 | 용량 초과 단계적 페널티 (6.4절) | game.service.ts 수정, game-constants.ts 확장 | 중간 |
| 4 | 신뢰도 유예 기간 (3.3절) | Game 엔티티 확장, game.service.ts 수정 | 중간 |

### Phase 2 (중요, 빠른 시일 내)

| 순서 | 항목 | 기존 코드 변경 필요 | 난이도 |
|------|------|-------------------|--------|
| 5 | 자금 유예 기간 (3.4절) | Game 엔티티 확장, game.service.ts 수정 | 중간 |
| 6 | 부분 실패 / 성능 저하 상태 (6.2-6.3절) | 새로운 서비스 계층, 프론트엔드 UI | 높음 |
| 7 | 긴급 행동 2종 (4.2.1, 4.2.2) | 새로운 API 엔드포인트, 프론트엔드 UI | 높음 |

### Phase 3 (보강, 게임 완성도)

| 순서 | 항목 | 기존 코드 변경 필요 | 난이도 |
|------|------|-------------------|--------|
| 8 | 나머지 긴급 행동 (4.2.3-4.2.5) | 기존 긴급 행동 프레임워크 확장 | 중간 |
| 9 | 멘토 시스템 (8절) | 새로운 서비스, 프론트엔드 사이드바 | 높음 |
| 10 | 기회 이벤트 (9절) | 이벤트 엔진, 프론트엔드 모달 | 높음 |
| 11 | 역전 메커니즘 (7절) | 기존 효과 적용 로직 확장 | 중간 |
| 12 | 피벗 메커니즘 (5절) | 새로운 API, 전용 UI 화면 | 높음 |

---

## 12. 데이터 모델 변경 요약

### Game 엔티티 추가 필드

```typescript
// 유예 기간 관련
@Column({ type: 'int', default: 0 })
trustGraceTurnsRemaining: number;

@Column({ type: 'boolean', default: false })
inTrustCrisis: boolean;

@Column({ type: 'int', default: 0 })
trustGraceUsedCount: number;

@Column({ type: 'int', default: 0 })
cashGraceTurnsRemaining: number;

@Column({ type: 'boolean', default: false })
inCashCrisis: boolean;

@Column({ type: 'int', default: 0 })
cashGraceUsedCount: number;

// 성능 저하 상태 관련
@Column({ type: 'text', default: 'HEALTHY' })
serviceHealth: ServiceHealth;

@Column({ type: 'text', default: 'HEALTHY' })
financialHealth: FinancialHealth;

// 모멘텀 시스템
@Column({ type: 'int', default: 0 })
positiveStreak: number;

// 용량 초과 연속 턴 추적
@Column({ type: 'int', default: 0 })
consecutiveCapacityExceeded: number;

// 피벗 관련
@Column({ type: 'int', default: 0 })
pivotCount: number;

@Column({ type: 'text', nullable: true })
pivotType: string;

// 긴급 행동 사용 기록
@Column({ type: 'simple-json', default: '{}' })
emergencyActionsUsed: Record<string, number>;

// 투자 페널티 누적
@Column({ type: 'int', default: 0 })
investmentTrustPenalty: number;

// 기회 이벤트 기록
@Column({ type: 'simple-json', default: '[]' })
opportunityEventsTriggered: string[];
```

### GameResponseDto 추가 필드

```typescript
// 경고 정보
@ApiProperty({ description: '현재 활성 경고 목록', required: false })
warnings?: WarningMessage[];

// 상태 정보
@ApiProperty({ description: '서비스 건강 상태', required: false })
serviceHealth?: ServiceHealth;

@ApiProperty({ description: '재정 건강 상태', required: false })
financialHealth?: FinancialHealth;

// 유예 기간 정보
@ApiProperty({ description: '신뢰도 유예 기간 남은 턴', required: false })
trustGraceTurnsRemaining?: number;

@ApiProperty({ description: '자금 유예 기간 남은 턴', required: false })
cashGraceTurnsRemaining?: number;

// 긴급 행동 가능 목록
@ApiProperty({ description: '사용 가능한 긴급 행동', required: false })
availableEmergencyActions?: EmergencyAction[];

// 어드바이저 조언
@ApiProperty({ description: '어드바이저 조언 목록', required: false })
advisorMessages?: AdvisorMessage[];

// 기회 이벤트
@ApiProperty({ description: '발생한 기회 이벤트', required: false })
opportunityEvent?: OpportunityEvent;

// 모멘텀 정보
@ApiProperty({ description: '현재 연속 성공 수', required: false })
positiveStreak?: number;
```

---

## 13. 밸런스 조정 기준

### 전체 게임 밸런스 목표

| 지표 | 현재 (추정) | 목표 |
|------|------------|------|
| 첫 번째 플레이 클리어율 | 5% 미만 | 15-20% |
| 10턴 이전 게임 오버율 | 40% 이상 | 15% 이하 |
| 평균 게임 오버 턴 | 8-12턴 | 18-22턴 |
| "역전 승리" 비율 | 0% | 전체 클리어의 20-30% |
| 2회차 클리어율 | 10% | 35-45% |
| 모든 메카닉 미사용 클리어율 | - | 5% (숙련자 전용) |

### 난이도 조절 레버

필요 시 조정 가능한 수치들:

```typescript
export const BALANCE_LEVERS = {
  // 유예 기간 조정
  graceTurnsAdjustment: 0,     // -1 ~ +1

  // 긴급 행동 비용 배율
  emergencyActionCostMultiplier: 1.0,  // 0.5 ~ 2.0

  // 기회 이벤트 확률 배율
  opportunityEventProbMultiplier: 1.0, // 0.5 ~ 2.0

  // 용량 초과 페널티 배율
  capacityPenaltyMultiplier: 1.0,      // 0.5 ~ 2.0

  // 역전 보너스 강도
  comebackBonusMultiplier: 1.0,        // 0.5 ~ 2.0
} as const;
```

---

## 14. 요약: 각 메카닉의 교육적 매핑

| 게임 메카닉 | 현실 스타트업 교훈 |
|------------|-------------------|
| 경고 시스템 | 모니터링/알림 체계의 중요성, 선행 지표 관리 |
| 유예 기간 | 인시던트 대응 시간, 런웨이 관리 |
| 긴급 서버 확장 | 예방적 vs 반응적 스케일링의 비용 차이 |
| 브릿지 파이낸싱 | 다운라운드와 희석의 현실 |
| 비용 절감 | 구조조정의 인적/조직적 비용 |
| 기술 부채 상환 | 리팩토링의 단기 비용 vs 장기 효율 |
| 피벗 | 전략적 방향 전환의 타이밍과 비용 |
| 부분 실패 | SLA 티어와 장애 등급 분류 |
| 역전 메커니즘 | 린 스타트업 방법론, 효율적 자원 활용 |
| 멘토 시스템 | 어드바이저 네트워크의 가치 |
| 기회 이벤트 | 스타트업 생태계 (정부 지원, 엔젤 투자, 파트너십) |
| 초기 피칭 개선 | 피칭 실패는 끝이 아닌 학습 기회 |

---

## 부록 A: checkGameStatus 함수 수정 의사코드

```typescript
private checkGameStatus(game: Game): GameStatus {
  // === Phase 1: 유예 기간 체크 ===

  // 자금 유예 기간 처리
  if (game.cash < 0) {
    if (game.cashGraceUsedCount < GRACE_LIMITS.MAX_CASH_GRACE_USES) {
      if (!game.inCashCrisis) {
        // 첫 진입: 유예 기간 시작
        game.inCashCrisis = true;
        game.cashGraceTurnsRemaining = GRACE_PERIOD.CASH_GRACE_TURNS;
        game.cashGraceUsedCount++;
        // 비상 대출 적용
        const overdraft = Math.abs(game.cash) + 20_000_000;
        game.cash = overdraft;
        // 다음 턴 이자 부과 예약
        game.pendingLoanRepayment = Math.floor(overdraft * 1.25);
        return GameStatus.PLAYING;
      } else {
        game.cashGraceTurnsRemaining--;
        if (game.cashGraceTurnsRemaining <= 0) {
          if (game.cash < GRACE_PERIOD.CASH_OVERDRAFT_LIMIT) {
            return GameStatus.LOST_BANKRUPT;
          }
          game.inCashCrisis = false;
        }
      }
    } else {
      return GameStatus.LOST_BANKRUPT;  // 유예 횟수 초과
    }
  }

  // 신뢰도 유예 기간 처리
  if (game.trust < GRACE_PERIOD.TRUST_GRACE_THRESHOLD) {
    if (game.trustGraceUsedCount < GRACE_LIMITS.MAX_TRUST_GRACE_USES) {
      if (!game.inTrustCrisis) {
        // 첫 진입: 유예 기간 시작
        game.inTrustCrisis = true;
        game.trustGraceTurnsRemaining = GRACE_PERIOD.TRUST_GRACE_TURNS;
        game.trustGraceUsedCount++;
        return GameStatus.PLAYING;
      } else {
        game.trustGraceTurnsRemaining--;
        if (game.trustGraceTurnsRemaining <= 0) {
          if (game.trust < GRACE_PERIOD.TRUST_RECOVERY_TARGET) {
            return GameStatus.LOST_OUTAGE;
          }
          game.inTrustCrisis = false;
        }
      }
    } else {
      if (game.users > 0) {
        return GameStatus.LOST_OUTAGE;
      }
    }
  }

  // === Phase 2: 기존 조건 (유예 통과 후) ===

  if (game.equityPercentage < GAME_CONSTANTS.EQUITY_MIN_THRESHOLD) {
    return GameStatus.LOST_EQUITY;
  }

  // 이하 기존 로직 유지 ...
  return GameStatus.PLAYING;
}
```

---

## 부록 B: 프론트엔드 경고 UI 구조

### MetricsPanel 경고 표시 구조

```
MetricsPanel
  |-- MetricCard (턴)
  |-- MetricCard (유저 수)
  |     |-- CapacityWarningBadge (사용률 기반)
  |-- MetricCard (자금)
  |     |-- RunwayWarningBadge (런웨이 기반)
  |-- MetricCard (신뢰도)
  |     |-- TrustWarningBadge (임계값 기반)
  |-- ServiceHealthIndicator (서비스 상태 표시)
  |-- FinancialHealthIndicator (재정 상태 표시)
  |-- ActiveCrisisBanner (유예 기간 중 표시)
  |     |-- 남은 턴 카운트다운
  |     |-- 복구 목표 표시
  |-- AdvisorNotification (조언 알림)
```

### 경고 색상 체계

```
파란색(Caution):  배경 bg-blue-50, 텍스트 text-blue-700, 테두리 border-blue-300
노란색(Warning):  배경 bg-amber-50, 텍스트 text-amber-700, 테두리 border-amber-300
빨간색(Danger):   배경 bg-red-50, 텍스트 text-red-700, 테두리 border-red-300, 애니메이션 pulse
```
