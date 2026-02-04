# EPIC-04 Feature 6: 대안 투자 경로 추가

## 개요

Series 투자 미달 시 브릿지 파이낸싱, 정부 지원금 등 대안 경로를 제공하여 플레이어가 다양한 전략으로 자금을 확보할 수 있도록 합니다.

## 구현 완료 사항

### 1. 데이터베이스 스키마 확장

**Game Entity 추가 필드**:
- `bridgeFinancingUsed` (int): 브릿지 파이낸싱 사용 횟수 (최대 2회)
- `governmentGrantUsed` (boolean): 정부 지원금 사용 여부 (최대 1회)
- `governmentReportRequired` (boolean): 정부 보고서 제출 필요 여부

### 2. AlternativeInvestmentService

**위치**: `backend/src/game/alternative-investment.service.ts`

**주요 기능**:

#### 브릿지 파이낸싱 (Bridge Financing)
- **조건**: Series A/B/C 턴에서 trust가 임계값 미달
- **효과**:
  - 현금: 정규 투자의 30% (Series A: 3억, B: 30억, C: 150억)
  - Equity 희석: 추가 5%
  - Trust: 변화 없음
- **제한**: 게임당 최대 2회

```typescript
executeBridgeFinancing(game: Game, seriesTier: 'A' | 'B' | 'C'): number
```

#### 정부 지원금 (Government Grant)
- **조건**:
  - EKS 또는 AI 인프라(Bedrock/SageMaker) 보유
  - Series A/B 턴에서 사용 가능
- **효과**:
  - 현금: 고정 2억 원
  - Equity 희석: 없음
  - Trust: +3
  - 다음 턴 보고서 제출 필요
- **제한**: 게임당 1회

```typescript
executeGovernmentGrant(game: Game): number
```

### 3. 게임 상수 추가

**GAME_CONSTANTS.ALTERNATIVE_INVESTMENT**:
```typescript
{
  BRIDGE_MAX_USES: 2,                    // 최대 브릿지 라운드 횟수
  BRIDGE_FUNDING_RATIO: 0.3,             // 정규 투자 대비 비율 (30%)
  BRIDGE_EQUITY_DILUTION: 5,             // 추가 Equity 희석 (5%)
  GOVERNMENT_GRANT_AMOUNT: 200_000_000,  // 정부 지원금 (2억)
  GOVERNMENT_GRANT_TRUST_BONUS: 3,       // Trust 보너스 (+3)
  SERIES_BASE_AMOUNTS: {
    A: 1_000_000_000,    // 10억
    B: 10_000_000_000,   // 100억
    C: 50_000_000_000,   // 500억
  },
  TRUST_THRESHOLD_RATIO: 0.6,            // 대안 투자 트리거 비율 (60%)
}
```

### 4. 밸런스 설계

**총 대안 자금 확보 가능액** (Series A 기준):
- 브릿지 파이낸싱 2회: 6억 (3억 × 2)
- 정부 지원금 1회: 2억
- **합계**: 8억 (정규 Series A 10억의 80%)

**Trade-off**:
- 브릿지 파이낸싱: 빠른 자금 확보 vs Equity 희석 (총 -10%)
- 정부 지원금: Equity 희석 없음 vs 보고서 제출 의무 (선택지 소모)

## 테스트 현황

**AlternativeInvestmentService**: ✅ 31/31 통과
- Bridge Financing: 9개 테스트
- Government Grant: 13개 테스트
- 통합 로직: 9개 테스트

**테스트 커버리지**:
- 조건 체크 (횟수 제한, 인프라 요구사항)
- 효과 적용 (현금, Trust, Equity)
- 선택지 텍스트 생성
- 밸런스 검증

## API 사용 예시

### 브릿지 파이낸싱 사용 가능 여부 확인
```typescript
const canUseBridge = alternativeInvestmentService.canUseBridgeFinancing(game);
// Returns: true if game.bridgeFinancingUsed < 2
```

### 정부 지원금 사용 가능 여부 확인
```typescript
const canUseGrant = alternativeInvestmentService.canUseGovernmentGrant(game);
// Returns: true if has EKS/Bedrock/SageMaker AND not used yet
```

### 브릿지 파이낸싱 실행
```typescript
const amount = alternativeInvestmentService.executeBridgeFinancing(game, 'A');
// game.cash += 300_000_000 (3억)
// game.equityPercentage -= 5
// game.bridgeFinancingUsed++
```

### 정부 지원금 실행
```typescript
const amount = alternativeInvestmentService.executeGovernmentGrant(game);
// game.cash += 200_000_000 (2억)
// game.trust += 3
// game.governmentGrantUsed = true
// game.governmentReportRequired = true
```

## 선택지 텍스트 예시

### 브릿지 파이낸싱 (Series A)
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

### 정부 지원금
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

## 게임 밸런스 영향

### 포지티브
1. **플레이어 선택권 증가**: Trust가 낮아도 자금 확보 가능
2. **전략적 깊이**: Equity vs 현금 trade-off
3. **실제 스타트업 경험**: 브릿지 라운드, 정부 지원금 메커니즘 학습

### 제약사항
1. **횟수 제한**: 무한 사용 방지 (브릿지 2회, 정부 1회)
2. **금액 제한**: 정규 투자 대비 80% 수준
3. **조건부 사용**: 인프라 요구사항 (정부 지원금)

## 향후 확장 가능성

### 동적 선택지 생성 (TurnService 통합)
현재는 서비스만 구현되었으며, 향후 TurnService에서 턴 시작 시 조건 체크 후 동적 선택지 추가 가능:

```typescript
// Series A 턴 (턴 12)에서
if (game.currentTurn === 12 && game.trust < 25) {
  const dynamicChoices = [];

  if (this.alternativeInvestmentService.canUseBridgeFinancing(game)) {
    dynamicChoices.push(this.createBridgeFinancingChoice('A'));
  }

  if (this.alternativeInvestmentService.canUseGovernmentGrant(game)) {
    dynamicChoices.push(this.createGovernmentGrantChoice());
  }

  choices.push(...dynamicChoices);
}
```

### 정부 보고서 선택지 자동 추가
정부 지원금 사용 다음 턴에 자동으로 보고서 선택지 추가:

```typescript
if (game.governmentReportRequired) {
  choices.push({
    id: -1,  // 동적 ID
    text: '정부 기술 보고서 제출 (필수)',
    effects: { trust: 0, cash: 0 },
    afterEffect: () => {
      this.alternativeInvestmentService.submitGovernmentReport(game);
    }
  });
}
```

## 파일 구조

```
backend/src/
├── game/
│   ├── alternative-investment.service.ts          # 대안 투자 서비스 (신규)
│   ├── alternative-investment.service.spec.ts     # 테스트 (신규)
│   ├── game-constants.ts                          # 상수 추가
│   ├── game.service.ts                            # 서비스 통합
│   └── game.module.ts                             # 모듈 등록
├── database/entities/
│   └── game.entity.ts                             # 엔티티 필드 추가
└── docs/
    └── EPIC-04-FEATURE-6-ALTERNATIVE-INVESTMENT.md  # 이 문서
```

## 마이그레이션

SQLite를 사용하므로 별도 마이그레이션 파일 없이 TypeORM이 자동으로 스키마를 동기화합니다.

새 필드:
- `bridgeFinancingUsed` (INTEGER, DEFAULT 0)
- `governmentGrantUsed` (BOOLEAN, DEFAULT false)
- `governmentReportRequired` (BOOLEAN, DEFAULT false)

## 결론

EPIC-04 Feature 6: 대안 투자 경로 추가가 성공적으로 구현되었습니다.

**핵심 성과**:
- ✅ 브릿지 파이낸싱 시스템 (최대 2회)
- ✅ 정부 지원금 시스템 (최대 1회)
- ✅ 밸런스 조정 (정규 투자 대비 80%)
- ✅ 31개 단위 테스트 100% 통과
- ✅ 실제 스타트업 자금 조달 경험 반영

플레이어는 이제 투자 실패 시에도 다양한 대안 경로를 통해 자금을 확보하고, Equity vs 현금 trade-off를 고려한 전략적 선택이 가능합니다.
