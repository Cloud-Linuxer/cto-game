# AWS Startup Tycoon -- 경제 및 밸런스 시스템 재설계 문서

> 작성일: 2026-02-03
> 대상 파일: `backend/src/game/game-constants.ts`, `backend/src/game/game.service.ts`
> 관련 데이터: `game_choices_db.json` (31 turns, 147 choices)

---

## 1. 현재 시스템 진단

### 1.1 핵심 문제 요약

현재 시스템을 분석한 결과, 다음과 같은 구조적 문제가 확인되었다.

| 문제 영역 | 현재 값 | 결과 |
|-----------|---------|------|
| 초기 신뢰도 | 0에서 시작 | 25턴 안에 80 도달 = 턴당 평균 3.2 필요, 실수 여유 거의 없음 |
| 용량 초과 페널티 | -10 trust/회 | 3회 초과 시 -30, 최적 경로 대비 22% 손실 |
| 초기 피칭 실패 | trust -> 0 리셋 | 턴 2에서 trust 6 미달 시 완전 초기화, 사실상 게임 오버 |
| 투자 게이트 | 차단(Exception) | Series A/B/C 미달 시 해당 선택 자체가 불가, 대안 경로 없음 |
| IPO 조건 | 100K users + 300M cash + 80 trust + RDS + EKS | ALL-or-nothing, 하나라도 부족하면 실패 |
| 용량 티어 | 10K -> 25K -> 100K -> 150K -> 300K | 불연속 점프, 중간 스케일링 불가 |
| 배율 시스템 | 1x 또는 2x (이진) | 점진적 성장 불가, 채용 전후 차이가 너무 극단적 |

### 1.2 데이터 기반 시뮬레이션 결과

```
[최적 경로] 매 턴 최고 trust 선택:
  턴 12 도달 시: trust 71 (Series A 30 통과)
  턴 18 도달 시: trust 101 (Series B 50 통과)
  턴 23 도달 시: trust 126 (Series C 70 통과)
  턴 25 종료 시: trust 136

[중간 경로] 매 턴 중앙값 trust 선택:
  턴 12 도달 시: trust 44 (Series A 30 통과)
  턴 18 도달 시: trust 68 (Series B 50 통과)
  턴 23 도달 시: trust 93 (Series C 70 통과)

[2등 경로] 매 턴 두 번째 best trust 선택:
  턴 12 도달 시: trust 52 (Series A 통과)
  턴 18 도달 시: trust 78 (Series B 통과)
  턴 25 종료 시: trust 112

[문제] 용량 초과 3회 발생 시:
  최적 경로 trust 136 - 30 = 106 (통과)
  중간 경로 trust 100 - 30 = 70  (Series C 70 간신히 통과, IPO 80 미달)
```

결론: **중간 수준의 플레이에서 1-2번의 용량 초과만으로 게임이 회복 불가능 상태에 진입한다.**

---

## 2. 새로운 밸런스 시스템 설계

### 2.1 설계 원칙

1. **70% 규칙**: 중앙값 수준의 선택을 해도 70% 이상의 확률로 승리 가능해야 한다
2. **회복 가능성**: 어떤 단일 실수도 즉시 게임 오버로 이어져서는 안 된다
3. **점진적 스케일링**: 용량, 배율, 페널티 모두 연속적이어야 한다
4. **다중 승리 경로**: 기술 집중, 비즈니스 집중, 균형형 등 최소 3가지 전략이 유효해야 한다
5. **교육적 긴장감**: AWS 인프라 의사결정의 결과를 체감하되, 학습 기회를 제공해야 한다

### 2.2 메트릭 재설계

#### 2.2.1 신뢰도(Trust) 시스템 전면 개편

**현재 문제**: 초기값 0, 목표 80, 25턴에 걸쳐 턴당 +3~5 정도 획득. 용량 초과 -10이 치명적.

**새로운 시스템**:

```typescript
// game-constants.ts 변경안

// --- 신뢰도 시작값 변경 ---
INITIAL_TRUST: 30,  // 기존: 0 → 변경: 30
// 근거: CTO로 채용되었다는 것 자체가 기본 신뢰를 의미함
// 30에서 시작하면 Early Pitch 게이트(기존 6)를 안전하게 통과하고,
// 목표 80까지 50 포인트만 쌓으면 됨 (턴당 평균 2.0)

// --- IPO 신뢰도 요구치 하향 ---
IPO_MIN_TRUST: 65,  // 기존: 80 → 변경: 65
// 근거: 초기값 30 + 25턴 * 중앙값 3.5 = 30 + 87.5 = 117.5 (이상적)
//       실제로는 위기 턴(-1~0), 용량 초과 등 감안하여
//       65면 평균 경로에서 충분히 도달 가능

// --- 용량 초과 페널티 점진화 ---
CAPACITY_EXCEEDED_TRUST_PENALTY: 0,  // 기존 고정값 제거
// 새로운 공식으로 대체 (아래 섹션 참조)
```

**점진적 용량 초과 페널티 공식**:

```typescript
/**
 * 용량 초과 비율에 따른 점진적 페널티 계산
 *
 * 핵심 아이디어: 10% 초과는 경고 수준(-2), 100% 초과는 심각(-8)
 * 기존의 고정 -10과 달리 비율 기반으로 작동
 *
 * @param currentUsers 현재 유저 수
 * @param maxCapacity  현재 인프라 수용량
 * @returns trust 감소량 (양수로 반환, 적용 시 빼기)
 */
function calculateCapacityPenalty(currentUsers: number, maxCapacity: number): number {
  if (currentUsers <= maxCapacity) return 0;

  const overflowRatio = (currentUsers - maxCapacity) / maxCapacity;
  // overflowRatio 0.1 = 10% 초과, 1.0 = 100% 초과

  // 기본 페널티: 2 + (비율 * 6), 최대 8
  // 10% 초과: 2 + 0.6 = 2.6 → 3
  // 30% 초과: 2 + 1.8 = 3.8 → 4
  // 50% 초과: 2 + 3.0 = 5.0 → 5
  // 100% 초과: 2 + 6.0 = 8.0 → 8
  const penalty = Math.min(8, Math.ceil(2 + overflowRatio * 6));

  return penalty;
}
```

**비교표**:

| 초과 비율 | 현재 시스템 | 새로운 시스템 | 효과 |
|-----------|------------|--------------|------|
| 10% 초과 | -10 | -3 | 경미한 경고, 학습 기회 |
| 30% 초과 | -10 | -4 | 주의 필요 |
| 50% 초과 | -10 | -5 | 심각한 경고 |
| 100% 초과 | -10 | -8 | 위기 상황 |
| 200%+ 초과 | -10 | -8 (캡) | 최악이지만 회복 가능 |

#### 2.2.2 신뢰도 자연 회복 메커니즘

**새로운 메커니즘: 안정 운영 보너스**

```typescript
/**
 * 안정 운영 보너스: 용량 미초과 상태에서 매 턴 자동 +1 trust
 *
 * 조건: currentUsers <= maxCapacity * 0.8 (여유 20% 이상)
 * 효과: trust += 1 (선택지 효과와 별도로 적용)
 *
 * 근거: 인프라를 여유있게 운영하는 것 자체가 신뢰를 높이는 행위
 * 교육적 가치: "오버프로비저닝의 가치"를 체험시킴
 */
STABILITY_BONUS_THRESHOLD: 0.8,  // 수용량의 80% 이하면 보너스
STABILITY_BONUS_TRUST: 1,        // +1 trust/턴
```

#### 2.2.3 초기 피칭 실패 메커니즘 완화

**현재**: trust < 6이면 trust를 0으로 리셋 (사실상 게임 오버)

**변경안**:

```typescript
// 초기 피칭 실패 시 처리 변경
EARLY_PITCH_TRUST_THRESHOLD: 6,  // 유지

// 실패 시 처리:
// 기존: game.trust = 0 (완전 리셋)
// 변경: 부분적 페널티 + 대안 경로 제공
//
// if (earlyPitchingFailed) {
//   // 투자금만 받지 못함 (cash 효과 무효화)
//   // trust 페널티: 현재 trust의 30% 감소 (0으로 리셋하지 않음)
//   game.trust = Math.floor(game.trust * 0.7);
//   // 대안: 턴 3에서 부트스트래핑 선택지가 추가로 열림
//   game.bootstrapPathAvailable = true;
// }
EARLY_PITCH_FAILURE_TRUST_MULTIPLIER: 0.7,  // 기존 trust의 70% 유지
```

**근거**: 실제 스타트업에서 초기 투자 실패는 흔하고, 부트스트래핑으로 성공한 사례도 많다. 게임에서도 이 경험을 반영해야 한다.

### 2.3 투자 게이트 시스템 재설계

#### 2.3.1 현재 문제: 이진 게이트

```
현재: trust < 30 → Series A 선택 불가 (BadRequestException)
     trust < 50 → Series B 선택 불가
     trust < 70 → Series C 선택 불가
→ 해당 투자를 받지 못하면 자금 부족으로 후반부 운영 불가
```

#### 2.3.2 새로운 시스템: 투자 규모 연동형

**핵심 변경: 투자 차단이 아닌, 투자 규모 조정**

```typescript
/**
 * 신뢰도 기반 투자 배율 시스템
 *
 * 기존: trust가 임계값 미만이면 투자 자체가 차단됨
 * 변경: trust에 비례하여 투자 규모가 조정됨
 *       낮은 trust로도 투자를 받을 수 있으나 규모가 줄어듦
 *
 * 공식: investmentMultiplier = clamp(trust / targetTrust, 0.3, 1.5)
 *
 * 예시 (Series A, targetTrust = 30):
 *   trust 15 → 0.5배 (목표 대비 절반 규모 투자)
 *   trust 30 → 1.0배 (정상 투자)
 *   trust 45 → 1.5배 (초과 달성, 최대 1.5배 투자)
 *   trust 9  → 0.3배 (최소 보장, 완전 차단은 없음)
 */
INVESTMENT_MULTIPLIER_MIN: 0.3,   // 최소 30%는 투자 받음
INVESTMENT_MULTIPLIER_MAX: 1.5,   // 최대 150% 보너스 투자
INVESTMENT_MULTIPLIER_CAP: 1.5,

// 투자 라운드별 기준 신뢰도 (차단 임계값이 아닌 100% 달성 기준)
SERIES_A_TARGET_TRUST: 30,   // 기존: 차단 → 변경: 100% 기준
SERIES_B_TARGET_TRUST: 45,   // 기존: 50 차단 → 변경: 45 100% 기준 (하향)
SERIES_C_TARGET_TRUST: 60,   // 기존: 70 차단 → 변경: 60 100% 기준 (하향)
```

**구현 공식**:

```typescript
function calculateInvestmentMultiplier(
  currentTrust: number,
  targetTrust: number
): number {
  const ratio = currentTrust / targetTrust;
  return Math.max(
    INVESTMENT_MULTIPLIER_MIN,
    Math.min(INVESTMENT_MULTIPLIER_MAX, ratio)
  );
}

// 적용 예시:
// Series A 기본 투자 10억, trust 20 (target 30)
// multiplier = 20/30 = 0.667
// 실제 투자 = 10억 * 0.667 = 6.67억
// → 투자는 받되 규모가 줄어듦, 게임은 계속됨
```

**투자 규모별 시뮬레이션**:

| 라운드 | 기준 trust | trust 15 | trust 30 | trust 45 | trust 60 |
|--------|-----------|---------|---------|---------|---------|
| Series A | 30 | 0.5x (5억) | 1.0x (10억) | 1.5x (15억) | 1.5x (15억) |
| Series B | 45 | 0.33x (13.3억) | 0.67x (26.7억) | 1.0x (40억) | 1.33x (53.3억) |
| Series C | 60 | 0.3x (30억) | 0.5x (50억) | 0.75x (75억) | 1.0x (100억) |

### 2.4 인프라 용량 시스템 재설계

#### 2.4.1 현재 문제: 불연속 티어 시스템

```
EC2:         10,000명
RDS:         25,000명  (2.5배 점프)
Aurora:     100,000명  (4배 점프)
EKS:        150,000명  (1.5배 점프)
Aurora GDB: 300,000명  (2배 점프)
→ 유저가 25,001명이 되는 순간 즉시 -10 trust, RDS 없으면 게임 오버 경로 진입
```

#### 2.4.2 새로운 시스템: 누적 기여 + 소프트캡

**핵심 변경: 인프라 용량은 "최대값"이 아닌 "합산"으로 계산**

```typescript
/**
 * 새로운 인프라 용량 계산 방식
 *
 * 기존: 보유 인프라 중 최대 용량 = maxCapacity
 * 변경: 기본 용량 + 각 인프라의 추가 용량 합산
 *
 * 근거: 실제 AWS에서도 여러 서비스를 조합하면 전체 처리량이 증가한다.
 *       Redis는 캐싱으로 DB 부하를 줄이고, CloudFront는 정적 콘텐츠를
 *       오프로드하여 서버 부하를 줄인다. 이것은 "최대값"이 아닌 "합산"이다.
 */

// 새로운 용량 기여도 맵 (합산 방식)
INFRASTRUCTURE_CAPACITY_CONTRIBUTION: {
  'EC2':              10_000,   // 기본 컴퓨팅
  'Route53':           2_000,   // DNS는 소량 기여
  'CloudWatch':        1_000,   // 모니터링은 간접 기여 (장애 예방)
  'RDS':              15_000,   // 관계형 DB
  'S3':                8_000,   // 정적 스토리지
  'ALB':              12_000,   // 로드밸런싱
  'Auto Scaling':     20_000,   // 자동 확장
  'ECS':              25_000,   // 컨테이너
  'Aurora':           40_000,   // 고성능 DB
  'Redis':            30_000,   // 캐싱 레이어
  'EKS':              50_000,   // 쿠버네티스 오케스트레이션
  'Karpenter':        30_000,   // 노드 자동 프로비저닝
  'Lambda':           25_000,   // 서버리스
  'Bedrock':          15_000,   // AI/ML (직접 트래픽 처리보다 기능적)
  'SageMaker':        10_000,   // ML 모델 (기능적)
  'Aurora Global DB': 60_000,   // 글로벌 복제
  'CloudFront':       50_000,   // CDN
  'dr-configured':    40_000,   // DR 구성 (안정성 향상)
  'multi-region':     80_000,   // 멀티 리전
} as Record<string, number>,

BASE_CAPACITY: 5_000,  // 인프라 없이도 기본 처리 가능한 수준
```

**예시 시뮬레이션**:

```
턴 1 시작: [EC2]
  용량 = 5,000 (base) + 10,000 (EC2) = 15,000명

턴 4에서 Redis + S3 추가: [EC2, Redis, S3]
  용량 = 5,000 + 10,000 + 30,000 + 8,000 = 53,000명

턴 7에서 EKS + Aurora 추가: [EC2, Redis, S3, EKS, Aurora]
  용량 = 5,000 + 10,000 + 30,000 + 8,000 + 50,000 + 40,000 = 143,000명

턴 14에서 Aurora Global DB + CloudFront 추가:
  용량 = 기존 143,000 + 60,000 + 50,000 = 253,000명
```

**기존 시스템과 비교**:

| 인프라 조합 | 기존 (최대값) | 신규 (합산) | 차이 |
|------------|-------------|------------|------|
| EC2만 | 10,000 | 15,000 | 더 여유로운 시작 |
| EC2 + RDS | 25,000 | 30,000 | 약간 상향 |
| EC2 + Aurora + Redis | 100,000 | 85,000 | 비슷하지만 중간 단계 존재 |
| EC2 + EKS + Aurora + Redis | 150,000 | 135,000 | 비슷 |
| 풀 스택 | 1,000,000 | ~400,000 | 하향 (하지만 점진적) |

#### 2.4.3 소프트캡과 경고 시스템

**기존**: 용량 초과 즉시 -10 trust
**변경**: 3단계 경고 시스템

```typescript
/**
 * 용량 상태 3단계 시스템
 *
 * GREEN (0-80%): 안정 운영, stability bonus +1 trust/턴
 * YELLOW (80-100%): 경고 상태, UI에 경고 표시, 페널티 없음
 * RED (100%+): 초과 상태, 점진적 페널티 적용
 *
 * YELLOW 구간의 존재가 핵심: 플레이어에게 "곧 초과됩니다" 경고를 주어
 * 인프라 투자 선택을 유도한다. 이것이 교육적 가치를 만든다.
 */
CAPACITY_WARNING_THRESHOLD: 0.8,   // 80% 이상이면 YELLOW
CAPACITY_CRITICAL_THRESHOLD: 1.0,  // 100% 이상이면 RED

interface CapacityStatus {
  level: 'GREEN' | 'YELLOW' | 'RED';
  usagePercent: number;
  trustPenalty: number;
  message: string;
}

function evaluateCapacityStatus(
  currentUsers: number,
  maxCapacity: number
): CapacityStatus {
  const usage = currentUsers / maxCapacity;

  if (usage <= 0.8) {
    return {
      level: 'GREEN',
      usagePercent: Math.round(usage * 100),
      trustPenalty: 0,
      message: '인프라 안정 운영 중'
    };
  }

  if (usage <= 1.0) {
    return {
      level: 'YELLOW',
      usagePercent: Math.round(usage * 100),
      trustPenalty: 0,
      message: `인프라 부하 ${Math.round(usage * 100)}% - 확장을 고려하세요`
    };
  }

  // RED: 초과
  const overflowRatio = (currentUsers - maxCapacity) / maxCapacity;
  const penalty = Math.min(8, Math.ceil(2 + overflowRatio * 6));

  return {
    level: 'RED',
    usagePercent: Math.round(usage * 100),
    trustPenalty: penalty,
    message: `서비스 장애 발생! 용량 ${Math.round(usage * 100)}% 초과 (trust -${penalty})`
  };
}
```

### 2.5 다중 승리 경로 시스템

#### 2.5.1 현재: 단일 승리 조건

```
IPO 성공 = users >= 100,000 AND cash >= 300,000,000 AND trust >= 80 AND infra includes [RDS, EKS]
```

#### 2.5.2 새로운 시스템: 3가지 엔딩 + 등급 시스템

```typescript
/**
 * 승리 엔딩 3종류
 *
 * 1. IPO 엔딩 (대기업 상장): 전통적 성공
 *    - 높은 유저 수 + 높은 자금 + 적정 신뢰도
 *    - 인프라: 엔터프라이즈급 (EKS 또는 Aurora Global DB 포함)
 *
 * 2. 인수합병(M&A) 엔딩: 기술력 인정
 *    - 높은 신뢰도 + 적정 유저 + 인프라 다양성
 *    - 기술 스타트업이 대기업에 인수되는 시나리오
 *
 * 3. 니치 마켓 엔딩: 틈새시장 장악
 *    - 높은 수익성 (cash/user 비율) + 안정적 운영
 *    - 작지만 강한 회사
 */

// 엔딩 1: IPO (기존과 유사하나 완화)
IPO_CONDITIONS: {
  MIN_USERS: 80_000,       // 기존 100K → 80K
  MIN_CASH: 200_000_000,   // 기존 300M → 200M
  MIN_TRUST: 65,           // 기존 80 → 65
  REQUIRED_INFRA: ['EKS'], // 기존 [RDS, EKS] → [EKS]만 (RDS 제거)
  // RDS 제거 이유: Aurora나 Aurora Global DB가 RDS의 상위 호환이므로
  // 별도로 RDS를 요구하는 것은 비합리적
  SCORE_BASE: 100,         // 기본 점수 배율
},

// 엔딩 2: M&A (기술 인수)
MA_CONDITIONS: {
  MIN_USERS: 30_000,       // 유저는 적어도 됨
  MIN_CASH: 50_000_000,    // 자금도 적어도 됨
  MIN_TRUST: 80,           // 대신 높은 신뢰도 필요
  MIN_INFRA_COUNT: 8,      // 8개 이상의 인프라 서비스 사용 중
  // 기술적 다양성과 완성도를 증명
  SCORE_BASE: 80,
},

// 엔딩 3: Niche Market (니치 마켓)
NICHE_CONDITIONS: {
  MIN_USERS: 15_000,
  MIN_CASH: 500_000_000,   // 높은 현금 (높은 수익성)
  MIN_TRUST: 50,
  MIN_CASH_PER_USER: 20_000, // 유저당 매출 2만원 이상
  SCORE_BASE: 60,
},
```

#### 2.5.3 등급 시스템

**기존: 승리 or 패배 (이진)**
**변경: S/A/B/C/F 5단계 등급**

```typescript
/**
 * 게임 종료 시 등급 계산
 *
 * 다차원 점수 = 유저 점수 + 자금 점수 + 신뢰도 점수 + 인프라 점수 + 효율 보너스
 *
 * 이 등급 시스템의 핵심: "패배해도 등급이 있다"
 * F 등급 패배와 C 등급 패배는 다르다. 플레이어에게 개선 방향을 제시한다.
 */

function calculateGameScore(game: Game): { score: number; grade: string } {
  // 유저 점수: 1,000명당 1점, 최대 200점
  const userScore = Math.min(200, Math.floor(game.users / 1000));

  // 자금 점수: 1억당 1점, 최대 200점
  const cashScore = Math.min(200, Math.floor(game.cash / 100_000_000));

  // 신뢰도 점수: trust * 3, 최대 300점
  const trustScore = Math.min(300, game.trust * 3);

  // 인프라 다양성 점수: 서비스당 10점, 최대 150점
  const infraScore = Math.min(150, game.infrastructure.length * 10);

  // 효율 보너스: 빠른 턴 클리어 보너스
  //   25턴에 끝나면 0, 20턴에 끝나면 +50, 15턴에 끝나면 +100
  const turnBonus = Math.max(0, (25 - game.currentTurn) * 10);

  // 엔딩 보너스
  let endingBonus = 0;
  if (game.status === GameStatus.WON_IPO) endingBonus = 200;
  else if (game.status === GameStatus.WON_MA) endingBonus = 150;
  else if (game.status === GameStatus.WON_NICHE) endingBonus = 100;

  const totalScore = userScore + cashScore + trustScore + infraScore + turnBonus + endingBonus;

  // 등급 결정
  let grade: string;
  if (totalScore >= 800) grade = 'S';
  else if (totalScore >= 600) grade = 'A';
  else if (totalScore >= 400) grade = 'B';
  else if (totalScore >= 200) grade = 'C';
  else grade = 'F';

  return { score: totalScore, grade };
}
```

**등급별 의미**:

| 등급 | 점수 | 의미 | 피드백 |
|------|------|------|--------|
| S | 800+ | 전설적 CTO | "AWS re:Invent 기조연설 초청" |
| A | 600-799 | 성공적 엑싯 | "스타트업 성공 사례로 기사화" |
| B | 400-599 | 안정적 운영 | "견실한 기업으로 성장" |
| C | 200-399 | 아쉬운 결과 | "교훈을 얻었지만 아쉬운 결과" |
| F | 0-199 | 실패 | "다음에는 인프라부터 신경쓰자" |

### 2.6 동적 난이도 시스템

#### 2.6.1 난이도 자동 조정 메커니즘

**핵심 개념: 플레이어 상태에 따라 게임이 은밀하게 도움을 주거나, 도전을 강화한다.**

```typescript
/**
 * 동적 난이도 조정 (Rubber-banding)
 *
 * 매 턴 시작 시 플레이어의 "건강 점수"를 계산하고,
 * 이에 따라 은밀한 보정을 적용한다.
 *
 * 이 시스템은 플레이어에게 직접 노출되지 않는다.
 * "보이지 않는 손"으로 작동하여 긴장감은 유지하되
 * 절망적 상황은 방지한다.
 */

function calculateHealthScore(game: Game, turn: number): number {
  // 각 메트릭의 "예상 진행률" 대비 실제 진행률
  const expectedTrustByTurn = 30 + (turn * 2.5);  // 초기 30 + 턴당 2.5 기대
  const expectedUsersByTurn = turn * turn * 200;   // 이차 성장 곡선
  const expectedCashByTurn = 10_000_000 + (turn * 20_000_000);

  const trustRatio = game.trust / expectedTrustByTurn;
  const usersRatio = Math.max(0.1, game.users) / Math.max(1, expectedUsersByTurn);
  const cashRatio = game.cash / Math.max(1, expectedCashByTurn);

  // 건강 점수 = 세 비율의 가중 평균 (0~2 범위, 1.0이 정상)
  const health = (trustRatio * 0.4) + (usersRatio * 0.3) + (cashRatio * 0.3);

  return Math.max(0, Math.min(2, health));
}

/**
 * 건강 점수에 따른 보정 효과
 *
 * health < 0.5: "구조" 모드
 *   - 위기 턴 효과 30% 감소
 *   - 용량 초과 페널티 50% 감소
 *   - 다음 턴에 "기회" 선택지 추가 (부트스트래핑/피벗 등)
 *
 * health 0.5~0.8: "도전" 모드
 *   - 기본 효과 적용 (보정 없음)
 *
 * health 0.8~1.2: "정상" 모드
 *   - 기본 효과 적용
 *
 * health > 1.2: "강화 도전" 모드
 *   - 위기 이벤트 확률 증가
 *   - 경쟁사 등장으로 유저 증가 속도 감소
 *   - 하지만 보상도 증가 (높은 투자 배율)
 */
HEALTH_RESCUE_THRESHOLD: 0.5,
HEALTH_CHALLENGE_THRESHOLD: 0.8,
HEALTH_STRONG_THRESHOLD: 1.2,

// 구조 모드 보정값
RESCUE_CRISIS_REDUCTION: 0.7,      // 위기 효과 70%로 감소
RESCUE_PENALTY_REDUCTION: 0.5,     // 페널티 50%로 감소
RESCUE_BONUS_TRUST: 2,             // 추가 +2 trust/턴

// 강화 도전 모드 보정값
CHALLENGE_USER_GROWTH_REDUCTION: 0.85,  // 유저 증가 85%로 감소 (경쟁사)
CHALLENGE_INVESTMENT_BONUS: 1.2,        // 투자 배율 20% 증가
```

### 2.7 배율 시스템 점진화

#### 2.7.1 현재: 이진 배율

```
디자이너 미고용: userAcquisitionMultiplier = 1.0
디자이너 고용:   userAcquisitionMultiplier = 2.0
→ 갑자기 2배가 되어 밸런스 붕괴 가능
```

#### 2.7.2 새로운 시스템: 단계별 배율

```typescript
/**
 * 팀 규모에 따른 점진적 배율 시스템
 *
 * 기존: 특정 직군 채용 시 이진 전환 (1x → 2x)
 * 변경: 채용된 인원 수에 따라 점진적으로 배율 증가
 *
 * 총 채용 인원에 따른 기본 배율:
 *   0명: 1.0x (CTO 혼자)
 *   1명: 1.2x
 *   2명: 1.5x
 *   3명: 1.8x (모든 직군 채용)
 *   + 각 직군별 특화 보너스
 */
TEAM_BASE_MULTIPLIER: {
  0: 1.0,
  1: 1.2,
  2: 1.5,
  3: 1.8,
} as Record<number, number>,

// 직군별 특화 보너스 (기본 배율에 가산)
STAFF_SPECIALIZATION: {
  '개발자': {
    effect: 'multiChoice',  // 멀티 선택 활성화 (기존과 동일)
    bonus: 0,               // 배율 보너스 없음 (대신 행동 수 증가)
  },
  '디자이너': {
    effect: 'userBonus',    // 유저 획득 보너스
    bonus: 0.3,             // +0.3배 추가 (기본 배율에 가산)
    // 예: 2명 채용 상태(1.5x) + 디자이너 보너스(0.3) = 1.8x
  },
  '기획자': {
    effect: 'trustBonus',   // 신뢰도 보너스
    bonus: 0.3,             // +0.3배 추가
  },
} as Record<string, { effect: string; bonus: number }>,

/**
 * 최종 배율 계산
 */
function calculateMultiplier(
  hiredStaff: string[],
  type: 'users' | 'trust'
): number {
  const teamSize = Math.min(3, hiredStaff.length);
  let multiplier = TEAM_BASE_MULTIPLIER[teamSize];

  if (type === 'users' && hiredStaff.includes('디자이너')) {
    multiplier += 0.3;
  }
  if (type === 'trust' && hiredStaff.includes('기획자')) {
    multiplier += 0.3;
  }

  return multiplier;
}

// 결과 비교:
// 기존 (디자이너 채용 전): users * 1.0
// 기존 (디자이너 채용 후): users * 2.0  (2배 점프)
// 신규 (1명 채용 시):      users * 1.2
// 신규 (2명 채용 + 디자이너): users * 1.8
// 신규 (3명 채용 + 디자이너): users * 2.1  (최대)
```

### 2.8 실패 조건 재설계

#### 2.8.1 현재 실패 조건과 문제점

| 조건 | 현재 임계값 | 문제 |
|------|-----------|------|
| 파산 | cash < 0 | 적절 (유지) |
| 서버 장애 | trust < 20 | 너무 낮은 임계값이 아닌, 너무 쉽게 도달 |
| 지분 희석 | equity < 20% | 적절 (유지) |
| CTO 해고 | 25턴 IPO 미달성 | 유일한 엔딩이므로 너무 가혹 |

#### 2.8.2 새로운 실패 조건

```typescript
// --- 파산 (유지, 약간 완화) ---
// 기존: cash < 0 → 즉시 파산
// 변경: cash < -50,000,000 → 파산 (5천만원 마이너스 통장 허용)
// 근거: 실제 스타트업은 약간의 적자 운영이 가능하다 (마이너스 통장, 단기 대출)
BANKRUPTCY_THRESHOLD: -50_000_000,

// --- 서버 장애 → "신뢰도 위기" 로 변경 ---
// 기존: trust < 20 → 즉시 게임 오버
// 변경: trust < 10 → 게임 오버
//       trust 10~25 → "위기 경고" 상태 (3턴 연속 유지 시 게임 오버)
TRUST_CRITICAL_THRESHOLD: 10,          // 즉사 임계값 (10 미만)
TRUST_WARNING_THRESHOLD: 25,           // 경고 임계값 (10~25)
TRUST_WARNING_MAX_TURNS: 3,            // 경고 상태 연속 3턴 → 게임 오버

// --- 25턴 종료 → 부분 성공 가능 ---
// 기존: 25턴 IPO 미달성 → LOST_FIRED_CTO
// 변경: 25턴 종료 시 M&A 또는 Niche 조건 체크 → 해당 엔딩 가능
//       어떤 엔딩 조건도 미충족 시 → LOST_FIRED_CTO (기존과 동일)
```

---

## 3. 전체 상수 변경 대조표

아래는 `game-constants.ts`에 반영해야 할 모든 변경사항의 요약이다.

```
┌────────────────────────────────────────┬──────────────┬──────────────┬─────────────────────┐
│ 상수명                                 │ 현재 값       │ 변경 값       │ 변경 근거            │
├────────────────────────────────────────┼──────────────┼──────────────┼─────────────────────┤
│ INITIAL_TRUST                          │ 0            │ 30           │ 기본 신뢰도 제공      │
│ INITIAL_MAX_CAPACITY                   │ 10,000       │ 15,000       │ 합산 방식 (BASE+EC2)  │
│ IPO_MIN_USERS                          │ 100,000      │ 80,000       │ 20% 하향              │
│ IPO_MIN_CASH                           │ 300,000,000  │ 200,000,000  │ 33% 하향              │
│ IPO_MIN_TRUST                          │ 80           │ 65           │ 평균 경로 도달 가능    │
│ IPO_REQUIRED_INFRA                     │ [RDS, EKS]   │ [EKS]        │ RDS는 Aurora 하위 호환 │
│ CAPACITY_EXCEEDED_TRUST_PENALTY        │ 10 (고정)    │ 2~8 (비율)   │ 점진적 페널티          │
│ TRUST_OUTAGE_THRESHOLD                 │ 20           │ 10           │ 즉사 조건 완화        │
│ EARLY_PITCH_FAILURE (trust reset)      │ trust → 0    │ trust * 0.7  │ 30% 감소로 완화       │
│ SERIES_A_MIN_TRUST (차단)              │ 30           │ 30 (기준)    │ 차단→배율 조정        │
│ SERIES_B_MIN_TRUST (차단)              │ 50           │ 45 (기준)    │ 차단→배율 조정        │
│ SERIES_C_MIN_TRUST (차단)              │ 70           │ 60 (기준)    │ 차단→배율 조정        │
│ STAFF_MULTIPLIERS.DESIGNER_USERS       │ 2.0          │ 점진적       │ 팀 규모 연동          │
│ STAFF_MULTIPLIERS.PLANNER_TRUST        │ 2.0          │ 점진적       │ 팀 규모 연동          │
│ CONSULTING_CAPACITY_MULTIPLIER         │ 3            │ 2            │ 3배→2배 (합산이므로)  │
│ (신규) STABILITY_BONUS_TRUST           │ -            │ +1/턴        │ 안정 운영 보상        │
│ (신규) BANKRUPTCY_THRESHOLD            │ 0            │ -50,000,000  │ 마이너스 통장 허용    │
│ (신규) TRUST_WARNING_THRESHOLD         │ -            │ 25           │ 3턴 경고 시스템       │
│ (신규) INVESTMENT_MULTIPLIER_MIN       │ -            │ 0.3          │ 최소 30% 투자 보장    │
│ (신규) INVESTMENT_MULTIPLIER_MAX       │ -            │ 1.5          │ 최대 150% 투자        │
│ (신규) 인프라 용량 방식                 │ 최대값       │ 합산         │ 점진적 스케일링       │
└────────────────────────────────────────┴──────────────┴──────────────┴─────────────────────┘
```

---

## 4. 시뮬레이션 검증

### 4.1 시나리오 A: "평균 플레이어" (중앙값 선택)

```
턴  1: trust 30+3 = 33, users 50,    cash 9.9M,   capacity 15K   [GREEN]
턴  5: trust ~45,      users 3K,    cash 20M,    capacity 25K   [GREEN]
턴  8: trust ~42 (-1), users 15K,   cash 15M,    capacity 53K   [GREEN] (위기 턴)
턴 12: trust ~55,      users 50K,   cash 10M,    capacity 85K   [GREEN]
       Series A: 55/30 = 1.5배 캡 → 1.5x 투자 (15억)
       cash → 1.51B
턴 18: trust ~73,      users 120K,  cash 800M,   capacity 143K  [YELLOW 84%]
       Series B: 73/45 = 1.5배 캡 → 1.5x 투자 (60억)
       cash → 6.8B
턴 23: trust ~88,      users 200K,  cash 5B,     capacity 253K  [GREEN]
       Series C: 88/60 = 1.47x → 1.47x 투자 (147억)
       cash → 19.7B
턴 25: trust ~96,      users 350K,  cash 18B     [IPO 성공] Grade A
```

**결과**: 중앙값 플레이로 IPO 성공, Grade A

### 4.2 시나리오 B: "실수 많은 플레이어" (하위 30% 선택 + 용량 초과 2회)

```
턴  1: trust 30+2 = 32, users 0,     cash 10M
턴  2: trust 35 (Early Pitch: 35 >= 6, 성공)
턴  5: trust ~42,       users 1.5K,  cash 12M
턴  8: trust ~38 (-1),  users 10K,   cash 8M
       용량 초과 1회: users 12K > capacity 10K → penalty -3 (비율 20%)
       trust 35
턴 12: trust ~47,       users 35K,   cash 5M
       Series A: 47/30 = 1.5배 캡 → 투자 15억
       용량 초과 2회: users 45K > capacity 30K → penalty -5 (비율 50%)
       trust 42
턴 18: trust ~55,       users 80K,   cash 600M
       Series B: 55/45 = 1.22x → 투자 48.8억
       trust 57
턴 23: trust ~68,       users 130K,  cash 3B
       Series C: 68/60 = 1.13x → 투자 113억
턴 25: trust ~75,       users 180K,  cash 10B

       IPO 조건: users 180K >= 80K ✅, cash 10B >= 200M ✅, trust 75 >= 65 ✅
       [IPO 성공] Grade B
```

**결과**: 실수가 있어도 IPO 성공 가능, Grade B. 기존 시스템에서는 이 경로에서 Series B에서 차단(trust 55 < 기존 요구 50은 통과하지만 용량 초과 누적으로 trust가 더 낮았을 것).

### 4.3 시나리오 C: "인프라 무시 플레이어" (비즈니스만 집중)

```
턴  5: trust 48, users 5K, cash 50M, capacity 15K (EC2만)
턴  8: users 20K > capacity 15K → 33% 초과, penalty -4, trust 44
       위기 턴 + 용량 초과 = trust 43
턴 10: users 30K > capacity 15K → 100% 초과, penalty -8, trust 40
       ... 이후 인프라 투자 시작
턴 12: Aurora 추가 → capacity 55K, trust 47
       Series A: 47/30 = 1.5배 캡, 투자 15억

이후 M&A 경로:
턴 20: trust 65, users 40K, cash 2B, infra 9개
       M&A 조건: users 40K >= 30K ✅, cash 2B >= 50M ✅,
                 trust 65 < 80 ❌
       → M&A 미충족, 계속 진행
턴 25: trust 75, users 50K, cash 5B, infra 10개
       IPO 미충족 (users 50K < 80K)
       M&A 미충족 (trust 75 < 80)
       Niche 조건: users 50K >= 15K ✅, cash 5B >= 500M ✅,
                   trust 75 >= 50 ✅, cash/user = 100K >= 20K ✅
       [Niche 성공] Grade C
```

**결과**: 인프라를 무시해도 완전한 패배는 아님. Niche 엔딩으로 부분 성공. 기존 시스템에서는 trust 20 미만 → LOST_OUTAGE.

### 4.4 시나리오 D: "의도적 기술 특화" (M&A 노림)

```
턴  1~5: 인프라 집중 투자, users는 느리게 성장
턴  6: Aurora + Redis + EKS + CloudFront 등 일찍 확보
       capacity = 5K + 10K + 40K + 30K + 50K + 50K = 185K
턴 10: infra 10개 이상, users 20K, trust 60
턴 18: infra 12개, users 35K, trust 82, cash 1B
       M&A 조건: users 35K >= 30K ✅, cash 1B >= 50M ✅,
                 trust 82 >= 80 ✅, infra 12 >= 8 ✅
       [M&A 성공] Grade A
```

**결과**: 기술 집중 전략으로 M&A 엔딩 달성. 기존 시스템에서는 users 100K 미달로 실패.

---

## 5. 프론트엔드 변경 사항

### 5.1 MetricsPanel 변경

```typescript
// frontend/lib/game-constants.ts 변경안

export const GAME_GOALS = {
  USERS: 80000,        // 기존 100000 → 80000
  CASH: 200000000,     // 기존 300000000 → 200000000
  TRUST: 65,           // 기존 99 → 65 (프론트엔드에서 99였으나 백엔드 80과 불일치)
  MAX_TURNS: 25,       // 유지
} as const;

// M&A, Niche 경로 목표도 표시
export const ALTERNATIVE_GOALS = {
  MA: { USERS: 30000, CASH: 50000000, TRUST: 80, INFRA_COUNT: 8 },
  NICHE: { USERS: 15000, CASH: 500000000, TRUST: 50, CASH_PER_USER: 20000 },
} as const;
```

### 5.2 용량 상태 UI

```typescript
// 메트릭 패널에 인프라 용량 상태 표시
// GREEN: 초록색 배경 + "안정 운영 중" 텍스트
// YELLOW: 노란색 배경 + "확장 권장" 텍스트 + 깜빡임 효과
// RED: 빨간색 배경 + "서비스 장애!" 텍스트 + 강한 깜빡임

// 새로운 GameState 필드
interface GameState {
  // ... 기존 필드
  capacityStatus: 'GREEN' | 'YELLOW' | 'RED';
  capacityUsagePercent: number;
  healthScore?: number;      // 디버그/개발용
  availableEndings: string[]; // 현재 달성 가능한 엔딩 목록
  trustWarningTurns?: number; // 신뢰도 경고 상태 연속 턴 수
}
```

### 5.3 엔딩 경로 표시 (새 UI 요소)

```
게임 화면 메트릭 패널 하단에 "가능한 엔딩" 섹션 추가:

[IPO 상장]    users 80K/80K ✅  cash 200M/200M ✅  trust 65/65 ✅  infra EKS ✅
[기술 인수]   users 30K/30K ✅  trust 80/80 ❌    infra 8개/8 ✅
[틈새시장]    users 15K/15K ✅  cash 500M ❌      trust 50/50 ✅

→ 플레이어가 자신의 전략 방향을 실시간으로 파악할 수 있다
```

---

## 6. 리더보드 점수 재설계

### 6.1 현재 점수 공식

```typescript
// 기존
score = users + (cash / 10000) + (trust * 1000)
// 문제: trust 1점 = 유저 1000명 = 1000만원, 비율이 부자연스러움
```

### 6.2 새로운 점수 공식

```typescript
function calculateScore(game: Game, grade: string): number {
  // 기본 점수 (등급에서 산출)
  const gradeScore = calculateGameScore(game); // 0~1000+ 범위

  // 엔딩 보너스
  const endingMultiplier = {
    'WON_IPO': 3.0,
    'WON_MA': 2.5,
    'WON_NICHE': 2.0,
    'LOST_FIRED_CTO': 1.0,
    'LOST_BANKRUPT': 0.8,
    'LOST_OUTAGE': 0.5,
  }[game.status] || 1.0;

  // 효율 보너스: 적은 턴으로 달성할수록 높은 점수
  const turnEfficiency = Math.max(1, (26 - game.currentTurn) / 25);

  // 인프라 다양성 보너스
  const infraBonus = game.infrastructure.length * 50;

  // 최종 점수
  return Math.floor(
    (gradeScore.score * endingMultiplier * turnEfficiency) + infraBonus
  );
}
```

---

## 7. 구현 우선순위

각 변경사항을 독립적으로 배포할 수 있도록 단계별로 분리한다.

### Phase 1: 즉시 적용 가능 (상수값만 변경)

파일: `backend/src/game/game-constants.ts`

1. `INITIAL_TRUST`: 0 → 30
2. `IPO_MIN_TRUST`: 80 → 65
3. `IPO_MIN_USERS`: 100,000 → 80,000
4. `IPO_MIN_CASH`: 300,000,000 → 200,000,000
5. `TRUST_OUTAGE_THRESHOLD`: 20 → 10
6. `IPO_REQUIRED_INFRA`: `['RDS', 'EKS']` → `['EKS']`

**효과**: 가장 극단적인 문제(너무 가혹한 승리 조건) 즉시 해결
**리스크**: 낮음 (기존 로직 변경 없이 상수만 변경)

### Phase 2: 로직 변경 (중간 복잡도)

파일: `backend/src/game/game.service.ts`

1. 점진적 용량 초과 페널티 (`calculateCapacityPenalty` 함수)
2. 초기 피칭 실패 완화 (trust * 0.7)
3. 투자 배율 시스템 (`calculateInvestmentMultiplier` 함수)
4. 안정 운영 보너스 (+1 trust/턴)
5. 인프라 용량 합산 방식 (`calculateMaxCapacity` 함수 교체)

**효과**: 게임 플레이 경험의 근본적 개선
**리스크**: 중간 (기존 로직 변경, 테스트 필요)

### Phase 3: 신규 시스템 (높은 복잡도)

1. M&A / Niche 엔딩 추가 (새로운 GameStatus + 조건 로직)
2. 등급 시스템 (S/A/B/C/F)
3. 동적 난이도 조정 (healthScore + rubber-banding)
4. 점진적 배율 시스템 (팀 규모 연동)
5. 3단계 용량 경고 시스템 (GREEN/YELLOW/RED)
6. 신뢰도 경고 상태 (3턴 연속 시 게임 오버)
7. 프론트엔드 엔딩 경로 표시
8. 리더보드 점수 재계산

**효과**: 완전히 새로운 게임 경험
**리스크**: 높음 (다수의 새로운 엔티티, UI 변경 필요)

---

## 8. 테스트 시나리오

구현 후 반드시 검증해야 할 시나리오 목록:

```
TC-01: 중앙값 선택 25턴 플레이 → IPO 성공 (Grade B 이상)
TC-02: 하위 30% 선택 + 용량 초과 3회 → 최소 Niche 엔딩 가능
TC-03: 초기 피칭 실패 → trust * 0.7 후 회복하여 Series A 통과
TC-04: trust 10~25 경고 구간 3턴 연속 → 게임 오버 확인
TC-05: trust 11에서 회복 선택 → 경고 해제 확인
TC-06: 인프라 0개 유지 → 용량 초과 페널티 누적, 하지만 즉사하지 않음
TC-07: 인프라 집중 전략 → M&A 엔딩 가능 (users 30K+ 수준)
TC-08: 비즈니스 집중 전략 → IPO 또는 Niche 가능
TC-09: 모든 투자 최소 배율(0.3x) → 게임 종료까지 진행 가능
TC-10: 동적 난이도 구조 모드 → 위기 효과 30% 감소 확인
TC-11: 25턴 마이너스 통장 (-3천만) → 파산하지 않음
TC-12: 25턴 마이너스 통장 (-6천만) → 파산 확인
TC-13: Grade S 달성 경로 존재 확인 (최적 플레이)
TC-14: 리더보드 점수 = IPO S > IPO A > M&A A > Niche B 순서 확인
```

---

## 9. 교육적 가치 보존 설계

밸런스 완화가 교육적 가치를 훼손하지 않도록 다음을 보장한다:

| 학습 목표 | 현재 메커니즘 | 새 메커니즘 | 교육적 차이 |
|-----------|-------------|------------|------------|
| 인프라 스케일링의 중요성 | 용량 초과 → 즉사 | 용량 초과 → 점진적 페널티 + YELLOW 경고 | 경고를 보고 대응하는 법을 배움 (더 현실적) |
| AWS 서비스 조합 | 최대값 기반 (단일 서비스) | 합산 기반 (서비스 조합) | 실제 아키텍처처럼 여러 서비스가 시너지를 낸다는 걸 체험 |
| 비용 최적화 | 모든 선택이 현금 소모 | 동일하나 마이너스 통장 허용 | FinOps 관점 (약간의 적자 운영 → 성장 투자) |
| 장애 대응 | trust 20 미만 즉사 | 3턴 경고 시스템 | 실제 SRE처럼 "경고 → 대응 시간 → 회복" 사이클을 경험 |
| 투자 유치 | 임계값 미달 → 차단 | 배율 조정 | 실제 VC처럼 "신뢰도가 낮으면 투자 규모가 줄어듦" 경험 |

---

## 10. 요약

이 재설계의 핵심 철학은 **"실패해도 배울 수 있는 게임"** 이다.

현재 시스템은 최적 경로에서 벗어나면 즉시 회복 불가능한 상태에 빠진다. 이는 교육적 게임으로서 역효과를 낳는다. 플레이어가 실수를 두려워하면 새로운 선택을 시도하지 않고, AWS 인프라에 대해 배울 기회를 잃는다.

새 시스템에서는:
- 실수해도 회복할 수 있어 다양한 전략을 시도할 동기가 생긴다
- 3가지 엔딩으로 자신만의 승리 방정식을 찾을 수 있다
- 등급 시스템으로 "더 잘할 수 있다"는 동기가 부여된다
- YELLOW 경고로 인프라 의사결정의 타이밍을 체험한다
- 투자 배율로 신뢰도 관리의 실질적 보상을 경험한다

**예상 승률 변화**:
- 현재: 최적 경로 플레이 시 ~60%, 평균 플레이 시 ~20%
- 변경 후: 최적 경로 플레이 시 ~95%, 평균 플레이 시 ~70%
- Grade S 달성률: ~10% (도전적이되 가능한 수준)
