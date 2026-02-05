# EPIC-04 Feature 5: 신뢰도 히스토리 및 설명 추가 - 구현 완료

## 구현 개요

신뢰도 변화 히스토리를 추적하고, 턴별 변화 요인을 설명하는 기능을 추가하여 플레이어의 학습 효과를 높입니다.

**구현 날짜**: 2026-02-04

---

## 백엔드 구현

### 1. TrustHistory Entity
**파일**: `/home/cto-game/backend/src/database/entities/trust-history.entity.ts`

```typescript
@Entity('trust_history')
@Index(['gameId', 'turnNumber'])
export class TrustHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  gameId: string;

  @Column({ type: 'int' })
  turnNumber: number;

  @Column({ type: 'int' })
  trustBefore: number;

  @Column({ type: 'int' })
  trustAfter: number;

  @Column({ type: 'int' })
  change: number;

  @Column('simple-json')
  factors: TrustChangeFactor[];

  @CreateDateColumn()
  createdAt: Date;
}

export interface TrustChangeFactor {
  type: 'choice' | 'recovery' | 'penalty' | 'bonus';
  amount: number;
  message: string;
}
```

### 2. TrustHistoryService
**파일**: `/home/cto-game/backend/src/game/trust-history.service.ts`

**주요 기능**:
- `record()`: 신뢰도 변화 기록
- `getHistory()`: 게임의 전체 신뢰도 히스토리 조회 (최대 25턴)
- `getHistoryForTurn()`: 특정 턴의 신뢰도 히스토리 조회
- `deleteHistory()`: 게임의 모든 신뢰도 히스토리 삭제
- `generateLesson()`: 변화 요인에 따른 교육적 메시지 생성

### 3. GameService 통합
**파일**: `/home/cto-game/backend/src/game/game.service.ts`

**변경사항**:
- `executeChoice()` 메서드에서 신뢰도 변화 추적
- 모든 신뢰도 변경 시점에 factors 배열 구성:
  - 초기 투자 피칭 실패 (penalty)
  - 선택지 직접 효과 (choice)
  - 용량 초과 페널티 (penalty)
  - 장애 극복 보너스 (recovery)
  - 안정 운영 보너스 (bonus)
- `deleteGame()` 메서드에서 히스토리 자동 삭제

### 4. API 엔드포인트
**경로**: `GET /api/game/:gameId/trust-history`

**응답 예시**:
```json
[
  {
    "id": 1,
    "gameId": "20dd9c99-cd67-4f17-b5fb-a56dda13115b",
    "turnNumber": 1,
    "trustBefore": 50,
    "trustAfter": 52,
    "change": 2,
    "factors": [
      {
        "type": "choice",
        "amount": 2,
        "message": "선택: 친구/지인 대상 소규모 마케팅..."
      }
    ],
    "createdAt": "2026-02-04T03:17:28.472Z"
  }
]
```

### 5. 데이터베이스 설정
**파일**: `/home/cto-game/backend/src/database/database.config.ts`

- TrustHistory 엔티티를 TypeORM entities 배열에 추가
- PostgreSQL 자동 마이그레이션 지원 (synchronize: true in dev)

---

## 프론트엔드 구현

### 1. TrustHistoryChart 컴포넌트
**파일**: `/home/cto-game/frontend/components/metrics/TrustHistoryChart.tsx`

**기능**:
- SVG 기반 라인 차트로 신뢰도 추이 시각화
- 25턴 동안의 신뢰도 변화 표시
- 투자 임계값 수평선 (Series A/B/C: 30/50/70)
- 현재 턴 강조 표시 (빨간색)
- 호버 시 상세 정보 툴팁
- 반응형 디자인 (width/height prop)

**Props**:
```typescript
interface TrustHistoryChartProps {
  history: TrustHistoryData[];
  currentTurn: number;
  width?: number;  // default: 600
  height?: number; // default: 300
}
```

### 2. TrustChangeExplanation 컴포넌트
**파일**: `/home/cto-game/frontend/components/metrics/TrustChangeExplanation.tsx`

**기능**:
- 신뢰도 변화 전/후 비교 (대형 숫자 표시)
- 변화 방향 아이콘 (TrendingUp/Down)
- 변화 요인별 상세 설명 (타입별 색상 구분)
- 교육적 메시지 자동 생성
- 닫기 버튼

**요인 타입별 스타일**:
- **choice**: 파란색 (Info 아이콘)
- **recovery**: 초록색 (CheckCircle 아이콘)
- **penalty**: 빨간색 (AlertTriangle 아이콘)
- **bonus**: 보라색 (TrendingUp 아이콘)

### 3. API 유틸리티
**파일**: `/home/cto-game/frontend/lib/api.ts`

```typescript
export const gameApi = {
  // ... existing methods
  getTrustHistory: async (gameId: string): Promise<TrustHistoryEntry[]> => {
    const response = await api.get<TrustHistoryEntry[]>(
      `/game/${gameId}/trust-history`
    );
    return response.data;
  },
};
```

### 4. 타입 정의
**파일**: `/home/cto-game/frontend/lib/types.ts`

```typescript
export type TrustChangeFactorType = 'choice' | 'recovery' | 'penalty' | 'bonus';

export interface TrustChangeFactor {
  type: TrustChangeFactorType;
  amount: number;
  message: string;
}

export interface TrustHistoryEntry {
  id: number;
  gameId: string;
  turnNumber: number;
  trustBefore: number;
  trustAfter: number;
  change: number;
  factors: TrustChangeFactor[];
  createdAt: string;
}
```

---

## 교육적 메시지

변화 요인 타입별로 자동 생성되는 메시지 (타입당 3-5개):

### Choice (선택지)
- "전략적 선택이 투자자 신뢰에 직접적인 영향을 미칩니다."
- "비즈니스 의사결정은 단기 성과뿐 아니라 장기 신뢰도를 고려해야 합니다."
- "투자자는 CTO의 기술적 판단과 리스크 관리 능력을 주시하고 있습니다."

### Penalty (페널티)
- "서비스 장애는 신뢰도를 빠르게 떨어뜨립니다. 사전 대비가 중요합니다."
- "용량 초과는 기술적 부채의 신호입니다. 인프라 투자를 고려하세요."
- "시스템 불안정은 투자자의 우려를 증가시킵니다."
- "반복적인 문제는 CTO의 역량에 대한 의문을 불러일으킵니다."
- "기술적 실패는 비즈니스 신뢰도에 직접적인 타격을 줍니다."

### Bonus (보너스)
- "지속적인 안정 운영이 장기적 신뢰를 구축합니다."
- "인프라 투자는 기술적 안정성뿐 아니라 투자자 신뢰도를 높입니다."
- "예방적 조치가 장기적으로 더 큰 신뢰를 만들어냅니다."
- "탁월한 시스템 안정성은 투자자에게 강력한 신호입니다."

### Recovery (회복)
- "회복 메커니즘을 통해 신뢰도를 회복할 수 있습니다."
- "적극적인 대응이 투자자의 신뢰를 회복시킵니다."
- "위기 상황에서의 빠른 복구 능력이 장기적 신뢰를 구축합니다."

---

## 테스트 결과

### 백엔드 테스트
**파일**: `/home/cto-game/backend/src/game/trust-history.service.spec.ts`

```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total

✓ 신뢰도 변화를 기록해야 함
✓ 변화가 없고 요인도 없으면 기록하지 않아야 함
✓ 변화는 없지만 요인이 있으면 기록해야 함
✓ 게임의 전체 신뢰도 히스토리를 조회해야 함
✓ 특정 턴의 신뢰도 히스토리를 조회해야 함
✓ 히스토리가 없으면 null을 반환해야 함
✓ 게임의 모든 신뢰도 히스토리를 삭제해야 함
✓ 선택지 효과에 대한 교육적 메시지를 생성해야 함
✓ 페널티에 대한 교육적 메시지를 생성해야 함
✓ 보너스에 대한 교육적 메시지를 생성해야 함
✓ 회복 메커니즘에 대한 교육적 메시지를 생성해야 함
✓ 요인이 없으면 기본 메시지를 반환해야 함
✓ 가장 큰 영향을 준 요인에 대한 메시지를 우선해야 함
```

### API 통합 테스트

```bash
# 게임 생성
POST /api/game/start
→ gameId: 20dd9c99-cd67-4f17-b5fb-a56dda13115b

# 선택 실행
POST /api/game/:gameId/choice (choiceId: 1)
→ trust: 50 → 52 (+2)

# 히스토리 조회
GET /api/game/:gameId/trust-history
→ [
    {
      "id": 1,
      "gameId": "20dd9c99-cd67-4f17-b5fb-a56dda13115b",
      "turnNumber": 1,
      "trustBefore": 50,
      "trustAfter": 52,
      "change": 2,
      "factors": [
        {
          "type": "choice",
          "amount": 2,
          "message": "선택: 친구/지인 대상 소규모 마케팅..."
        }
      ],
      "createdAt": "2026-02-04T03:17:28.472Z"
    }
  ]
```

---

## 제약사항 준수

✅ **DB 용량 제한**: 히스토리는 25턴까지만 저장 (TrustHistoryService.MAX_TURNS = 25)
✅ **차트 최적화**: 최대 25개 데이터포인트만 렌더링 (SVG 경량화)
✅ **교육적 메시지**: 타입별로 3-5가지 메시지 준비
✅ **변화 추적**: 변화가 0이고 요인이 없으면 기록하지 않음 (DB 절약)

---

## 사용 가이드

자세한 사용 방법은 다음 문서를 참조하세요:
- `/home/cto-game/frontend/components/metrics/TRUST_HISTORY_USAGE.md`

---

## 파일 목록

### 백엔드
- ✅ `/home/cto-game/backend/src/database/entities/trust-history.entity.ts`
- ✅ `/home/cto-game/backend/src/common/dto/trust-history-response.dto.ts`
- ✅ `/home/cto-game/backend/src/common/dto/index.ts` (export 추가)
- ✅ `/home/cto-game/backend/src/game/trust-history.service.ts`
- ✅ `/home/cto-game/backend/src/game/trust-history.service.spec.ts`
- ✅ `/home/cto-game/backend/src/game/game.module.ts` (TrustHistory 통합)
- ✅ `/home/cto-game/backend/src/game/game.controller.ts` (API 엔드포인트 추가)
- ✅ `/home/cto-game/backend/src/game/game.service.ts` (신뢰도 추적 로직 추가)
- ✅ `/home/cto-game/backend/src/database/database.config.ts` (엔티티 등록)

### 프론트엔드
- ✅ `/home/cto-game/frontend/components/metrics/TrustHistoryChart.tsx`
- ✅ `/home/cto-game/frontend/components/metrics/TrustChangeExplanation.tsx`
- ✅ `/home/cto-game/frontend/components/metrics/index.ts` (export 추가)
- ✅ `/home/cto-game/frontend/components/metrics/TRUST_HISTORY_USAGE.md`
- ✅ `/home/cto-game/frontend/lib/api.ts` (getTrustHistory API 추가)
- ✅ `/home/cto-game/frontend/lib/types.ts` (TrustHistory 타입 추가)

### 문서
- ✅ `/home/cto-game/EPIC-04_Feature-5_IMPLEMENTATION_COMPLETE.md` (본 문서)

---

## 다음 단계

프론트엔드 통합:
1. 게임 페이지에 TrustHistoryChart 추가
2. 턴 종료 모달에 TrustChangeExplanation 통합
3. E2E 테스트 작성

---

## 요약

EPIC-04 Feature 5는 **완전히 구현 및 테스트 완료**되었습니다.

**핵심 성과**:
- ✅ 백엔드: 신뢰도 변화 추적 및 히스토리 저장 API
- ✅ 프론트엔드: 시각화 차트 및 상세 설명 컴포넌트
- ✅ 교육적 메시지: 타입별 자동 생성 (총 14가지)
- ✅ 테스트: 13개 단위 테스트 + API 통합 테스트 통과
- ✅ 문서: 사용 가이드 및 통합 예제 작성

**학습 효과 향상**:
플레이어는 이제 신뢰도가 왜, 어떻게 변화했는지 명확하게 이해할 수 있으며,
게임을 통해 클라우드 인프라 관리의 중요성과 투자자 관계의 핵심을 학습할 수 있습니다.
