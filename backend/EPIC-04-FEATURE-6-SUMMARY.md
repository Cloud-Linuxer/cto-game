# EPIC-04 Feature 6: 대안 투자 경로 - 구현 완료 요약

## 구현 개요

Series 투자 미달 시 브릿지 파이낸싱과 정부 지원금 등의 대안 경로를 제공하는 시스템을 구현했습니다.

## 주요 구현 내역

### 1. 신규 서비스 클래스

**AlternativeInvestmentService** (`src/game/alternative-investment.service.ts`)
- 브릿지 파이낸싱 관리
- 정부 지원금 관리
- 조건 검증 및 효과 적용

### 2. 데이터베이스 확장

**Game Entity 추가 필드**:
```typescript
@Column({ type: 'int', default: 0 })
bridgeFinancingUsed: number;

@Column({ type: 'boolean', default: false })
governmentGrantUsed: boolean;

@Column({ type: 'boolean', default: false })
governmentReportRequired: boolean;
```

### 3. 게임 상수 추가

**GAME_CONSTANTS.ALTERNATIVE_INVESTMENT**:
- 브릿지 파이낸싱: 최대 2회, 정규 투자의 30%, Equity -5%
- 정부 지원금: 1회, 2억 원, Trust +3, 보고서 제출 필요

## 브릿지 파이낸싱 (Bridge Financing)

### 조건
- Series A/B/C 턴에서 trust가 임계값 미달 (60% 미만)
- 게임당 최대 2회 사용 가능

### 효과
| Series | 정규 투자 | 브릿지 파이낸싱 (30%) | Equity 희석 |
|--------|----------|---------------------|-----------|
| A      | 10억     | 3억                 | -5%       |
| B      | 100억    | 30억                | -5%       |
| C      | 500억    | 150억               | -5%       |

### 선택지 텍스트
```
브릿지 파이낸싱 (기존 투자자 추가 투자)

📈 예상 효과:
- 현금 +3.0억 원
- Equity 추가 희석 -5%
- 신뢰도 변화 없음

⚠️ 제한: 게임당 2회까지만 사용 가능 (잔여: 2회)

💼 설명: 기존 투자자들이 다음 라운드까지의 자금을 지원합니다.
정규 투자보다 금액은 적지만, 빠르게 자금을 확보할 수 있습니다.
```

## 정부 지원금 (Government Grant)

### 조건
- EKS 또는 AI 인프라(Bedrock/SageMaker) 보유
- Series A/B 턴에서 사용 가능
- 게임당 1회만 사용 가능

### 효과
- 현금: 고정 2억 원
- Equity 희석: 없음
- Trust: +3 (정부 인증 효과)
- 다음 턴: 기술 보고서 제출 필요 (선택지 소모)

### 선택지 텍스트
```
중소벤처기업부 기술개발 지원 사업 신청

📈 예상 효과:
- 현금 +2.0억 원 (무상 지원)
- Equity 희석 없음
- 신뢰도 +3 (정부 인증 효과)

⚠️ 조건:
- 다음 턴에 기술 보고서 제출 필요
- 게임당 1회만 사용 가능

💼 설명: 정부 지원금은 equity를 포기하지 않아도 되지만,
금액이 제한적이고 보고 의무가 있습니다.
```

## 밸런스 설계

### 총 대안 자금 (Series A 기준)
- 브릿지 파이낸싱 × 2: 6억
- 정부 지원금 × 1: 2억
- **합계**: 8억 (정규 Series A 10억의 80%)

### Trade-off
| 항목 | 장점 | 단점 |
|-----|-----|-----|
| 브릿지 파이낸싱 | 빠른 자금 확보 | Equity 희석 (-5% × 2 = -10%) |
| 정부 지원금 | Equity 희석 없음, Trust +3 | 보고서 제출 의무 (선택지 소모) |

## API 사용법

### 조건 확인
```typescript
// 브릿지 파이낸싱 사용 가능 여부
const canUseBridge = alternativeInvestmentService.canUseBridgeFinancing(game);
// Returns: true if bridgeFinancingUsed < 2

// 정부 지원금 사용 가능 여부
const canUseGrant = alternativeInvestmentService.canUseGovernmentGrant(game);
// Returns: true if has EKS/Bedrock/SageMaker AND not used

// 대안 투자 필요 여부 (trust 기준)
const needsAlternative = alternativeInvestmentService.needsAlternativeInvestment(
  currentTrust,  // 예: 15
  requiredTrust  // 예: 25 (Series A)
);
// Returns: true if currentTrust < requiredTrust * 0.6
```

### 실행
```typescript
// 브릿지 파이낸싱 실행
const amount = alternativeInvestmentService.executeBridgeFinancing(game, 'A');
// game.cash += 300_000_000
// game.equityPercentage -= 5
// game.bridgeFinancingUsed++

// 정부 지원금 실행
const amount = alternativeInvestmentService.executeGovernmentGrant(game);
// game.cash += 200_000_000
// game.trust += 3 (capped at 100)
// game.governmentGrantUsed = true
// game.governmentReportRequired = true

// 정부 보고서 제출
alternativeInvestmentService.submitGovernmentReport(game);
// game.governmentReportRequired = false
```

### 선택지 텍스트 생성
```typescript
// 브릿지 파이낸싱 선택지
const bridgeText = alternativeInvestmentService.getBridgeFinancingChoiceText('A', game);

// 정부 지원금 선택지
const grantText = alternativeInvestmentService.getGovernmentGrantChoiceText();

// 정부 보고서 선택지
const reportText = alternativeInvestmentService.getGovernmentReportChoiceText();
```

## 테스트 결과

**AlternativeInvestmentService**: ✅ 31/31 통과

### 테스트 커버리지
- **Bridge Financing** (9개):
  - 사용 가능 여부 (횟수 제한)
  - Series A/B/C 실행 및 효과 검증
  - 에러 처리 (최대 횟수 초과)
  - 선택지 텍스트 생성

- **Government Grant** (13개):
  - 사용 가능 여부 (인프라 요구사항, 중복 사용)
  - 효과 검증 (현금, Trust, Equity 미희석)
  - Trust 상한 검증 (100 cap)
  - 보고서 제출 및 에러 처리
  - 선택지 텍스트 생성

- **통합 로직** (9개):
  - 옵션 가능 여부 조회
  - 사유 메시지 생성
  - 트리거 조건 계산 (trust threshold)
  - 밸런스 검증 (총 자금, Equity 희석)

## 구현 파일

```
backend/src/
├── game/
│   ├── alternative-investment.service.ts          # 대안 투자 서비스 (신규)
│   ├── alternative-investment.service.spec.ts     # 31개 테스트 (신규)
│   ├── game-constants.ts                          # ALTERNATIVE_INVESTMENT 상수 추가
│   ├── game.service.ts                            # AlternativeInvestmentService 주입
│   └── game.module.ts                             # 모듈 provider/exports 등록
├── database/entities/
│   └── game.entity.ts                             # 3개 필드 추가
└── docs/
    └── EPIC-04-FEATURE-6-ALTERNATIVE-INVESTMENT.md  # 상세 문서
```

## 향후 통합 작업

현재는 **서비스 레이어만 구현**되었으며, 다음 단계에서 TurnService와 통합하여 동적 선택지 생성이 가능합니다:

### 동적 선택지 생성 (TurnService)
```typescript
// Series A/B/C 턴 시작 시
if (this.alternativeInvestmentService.needsAlternativeInvestment(game.trust, requiredTrust)) {
  const dynamicChoices = [];

  if (this.alternativeInvestmentService.canUseBridgeFinancing(game)) {
    dynamicChoices.push({
      id: -1,  // Dynamic ID
      text: this.alternativeInvestmentService.getBridgeFinancingChoiceText(tier, game),
      effects: { cash: bridgeAmount, ... }
    });
  }

  if (this.alternativeInvestmentService.canUseGovernmentGrant(game)) {
    dynamicChoices.push({
      id: -2,
      text: this.alternativeInvestmentService.getGovernmentGrantChoiceText(),
      effects: { cash: 200_000_000, trust: 3, ... }
    });
  }

  choices.push(...dynamicChoices);
}
```

### 정부 보고서 선택지 자동 추가
```typescript
if (game.governmentReportRequired) {
  choices.push({
    id: -3,
    text: this.alternativeInvestmentService.getGovernmentReportChoiceText(),
    effects: { trust: 0, cash: 0 },
    callback: () => this.alternativeInvestmentService.submitGovernmentReport(game)
  });
}
```

## 게임 밸런스 영향

### 긍정적 영향
1. **플레이어 선택권 증가**: Trust가 낮아도 게임 진행 가능
2. **전략적 깊이**: Equity vs 현금 vs 보고 의무 trade-off
3. **교육적 가치**: 실제 스타트업 자금 조달 메커니즘 학습

### 밸런스 제약
1. **횟수 제한**: 무한 사용 방지 (브릿지 2회, 정부 1회)
2. **금액 제한**: 정규 투자의 80% 수준
3. **조건부 사용**: 인프라 요구사항 (정부 지원금)
4. **Trade-off**: Equity 희석 또는 선택지 소모

## 결론

EPIC-04 Feature 6: 대안 투자 경로가 성공적으로 구현되었습니다.

**주요 성과**:
- ✅ 브릿지 파이낸싱 시스템 (최대 2회, Equity -5%)
- ✅ 정부 지원금 시스템 (최대 1회, Trust +3, 보고 의무)
- ✅ 밸런스 조정 (정규 투자 대비 80%)
- ✅ 31개 단위 테스트 100% 통과
- ✅ 실제 스타트업 자금 조달 경험 반영

플레이어는 이제 투자 실패 시에도 다양한 대안 경로를 통해 자금을 확보하고, 전략적 선택이 가능합니다.

---

**구현 완료 일자**: 2026-02-04
**테스트 상태**: ✅ 31/31 통과 (100%)
**문서 위치**: `/home/cto-game/backend/docs/EPIC-04-FEATURE-6-ALTERNATIVE-INVESTMENT.md`
