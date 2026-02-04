# Trust History Feature - 사용 가이드

## 개요

EPIC-04 Feature 5: 신뢰도 히스토리 및 설명 추가 기능의 사용 가이드입니다.

## 백엔드 API

### 신뢰도 히스토리 조회

```http
GET /api/game/:gameId/trust-history
```

**응답 예시:**

```json
[
  {
    "id": 1,
    "gameId": "abc-123",
    "turnNumber": 5,
    "trustBefore": 50,
    "trustAfter": 60,
    "change": 10,
    "factors": [
      {
        "type": "choice",
        "amount": 10,
        "message": "선택: 인프라 업그레이드"
      }
    ],
    "createdAt": "2026-02-04T12:00:00Z"
  }
]
```

## 프론트엔드 컴포넌트

### 1. TrustHistoryChart

신뢰도 변화 추이를 라인 차트로 시각화합니다.

```tsx
import { TrustHistoryChart } from '@/components/metrics';
import { gameApi } from '@/lib/api';

function GamePage() {
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const history = await gameApi.getTrustHistory(gameId);
      setHistoryData(history);
    }
    fetchHistory();
  }, [gameId]);

  return (
    <TrustHistoryChart
      history={historyData}
      currentTurn={currentTurn}
      width={800}
      height={400}
    />
  );
}
```

### 2. TrustChangeExplanation

턴 종료 시 신뢰도 변화를 상세하게 설명합니다.

```tsx
import { TrustChangeExplanation } from '@/components/metrics';

function TurnResultModal({ result }) {
  const latestHistory = result.trustHistory?.at(-1);

  if (!latestHistory) return null;

  return (
    <TrustChangeExplanation
      trustBefore={latestHistory.trustBefore}
      trustAfter={latestHistory.trustAfter}
      change={latestHistory.change}
      factors={latestHistory.factors}
      onClose={() => setShowModal(false)}
    />
  );
}
```

## 통합 예제

게임 페이지에 신뢰도 히스토리 기능을 통합하는 전체 예시:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { gameApi } from '@/lib/api';
import { TrustHistoryChart, TrustChangeExplanation } from '@/components/metrics';
import type { TrustHistoryEntry } from '@/lib/types';

export default function GamePage({ gameId }: { gameId: string }) {
  const [gameState, setGameState] = useState(null);
  const [trustHistory, setTrustHistory] = useState<TrustHistoryEntry[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  // 게임 상태 조회
  useEffect(() => {
    async function fetchGame() {
      const state = await gameApi.getGame(gameId);
      setGameState(state);
    }
    fetchGame();
  }, [gameId]);

  // 신뢰도 히스토리 조회
  useEffect(() => {
    async function fetchTrustHistory() {
      const history = await gameApi.getTrustHistory(gameId);
      setTrustHistory(history);
    }
    fetchTrustHistory();
  }, [gameId]);

  // 선택 실행 후 히스토리 새로고침
  const handleChoice = async (choiceId: number) => {
    const result = await gameApi.executeChoice(gameId, choiceId);
    setGameState(result);

    // 히스토리 갱신
    const updatedHistory = await gameApi.getTrustHistory(gameId);
    setTrustHistory(updatedHistory);

    // 신뢰도 변화가 있으면 설명 표시
    const latestHistory = updatedHistory.at(-1);
    if (latestHistory && latestHistory.change !== 0) {
      setShowExplanation(true);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* 신뢰도 히스토리 차트 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">신뢰도 추이</h2>
        <TrustHistoryChart
          history={trustHistory}
          currentTurn={gameState?.currentTurn || 1}
          width={800}
          height={400}
        />
      </div>

      {/* 신뢰도 변화 설명 모달 */}
      {showExplanation && trustHistory.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-2xl w-full mx-4">
            <TrustChangeExplanation
              trustBefore={trustHistory.at(-1)!.trustBefore}
              trustAfter={trustHistory.at(-1)!.trustAfter}
              change={trustHistory.at(-1)!.change}
              factors={trustHistory.at(-1)!.factors}
              onClose={() => setShowExplanation(false)}
            />
          </div>
        </div>
      )}

      {/* 게임 메인 UI */}
      <div className="grid grid-cols-3 gap-4">
        {/* ... 기존 게임 UI ... */}
      </div>
    </div>
  );
}
```

## 교육적 메시지

신뢰도 변화 요인에 따라 자동으로 생성되는 교육적 메시지:

### Choice (선택지)
- "전략적 선택이 투자자 신뢰에 직접적인 영향을 미칩니다."
- "비즈니스 의사결정은 단기 성과뿐 아니라 장기 신뢰도를 고려해야 합니다."
- "투자자는 CTO의 기술적 판단과 리스크 관리 능력을 주시하고 있습니다."

### Penalty (페널티)
- "서비스 장애는 신뢰도를 빠르게 떨어뜨립니다. 사전 대비가 중요합니다."
- "용량 초과는 기술적 부채의 신호입니다. 인프라 투자를 고려하세요."
- "시스템 불안정은 투자자의 우려를 증가시킵니다."

### Bonus (보너스)
- "지속적인 안정 운영이 장기적 신뢰를 구축합니다."
- "인프라 투자는 기술적 안정성뿐 아니라 투자자 신뢰도를 높입니다."
- "예방적 조치가 장기적으로 더 큰 신뢰를 만들어냅니다."

### Recovery (회복)
- "회복 메커니즘을 통해 신뢰도를 회복할 수 있습니다."
- "적극적인 대응이 투자자의 신뢰를 회복시킵니다."
- "위기 상황에서의 빠른 복구 능력이 장기적 신뢰를 구축합니다."

## 제약사항

- 히스토리는 최대 25턴까지 저장됩니다
- 차트는 최대 25개 데이터포인트를 렌더링합니다
- 교육적 메시지는 타입별로 3-5가지가 준비되어 있습니다

## 성능 최적화

- 히스토리 조회는 게임 시작 시 1회, 선택 실행 후 1회만 수행
- 차트 렌더링은 SVG 기반으로 경량화
- 툴팁은 호버 시에만 표시되어 성능 영향 최소화
