# EventPopup Quick Start Guide

## 🚀 5분 안에 시작하기

### Step 1: 패키지 설치 (선택적)

```bash
# Redux 사용 시 (권장)
npm install @reduxjs/toolkit react-redux
```

### Step 2: 타입 import

```tsx
import type { EventData } from '@/types/event.types';
```

### Step 3: 컴포넌트 import

```tsx
import { EventPopup } from '@/components/EventPopup';
```

### Step 4: 상태 정의

```tsx
const [eventData, setEventData] = useState<EventData | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Step 5: 핸들러 작성

```tsx
const handleSelectChoice = async (choiceId: string) => {
  setIsProcessing(true);
  try {
    const response = await fetch(`/api/game/${gameId}/event-choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choiceId, eventId: eventData?.eventId }),
    });

    if (!response.ok) throw new Error('API 실패');

    setEventData(null); // 팝업 닫기
  } catch (err) {
    setError('선택 처리 중 오류가 발생했습니다');
  } finally {
    setIsProcessing(false);
  }
};
```

### Step 6: 렌더링

```tsx
return (
  <>
    {/* 게임 화면 */}
    <div>...</div>

    {/* 이벤트 팝업 */}
    {eventData && (
      <EventPopup
        eventData={eventData}
        gameId={gameId}
        onSelectChoice={handleSelectChoice}
        isProcessing={isProcessing}
        error={error}
      />
    )}
  </>
);
```

---

## 📋 이벤트 데이터 예시

```typescript
const exampleEvent: EventData = {
  eventId: 'crisis-001',
  eventType: 'CRISIS',
  title: 'AWS 리전 장애',
  eventText: '서울 리전에 장애가 발생했습니다!\n\n현재 120,000명의 유저가 대기 중입니다.',
  choices: [
    {
      choiceId: 'crisis-001-a',
      text: '멀티 리전 긴급 구축',
      effects: {
        cash: -50000000,
        trust: 15,
        infra: ['Multi-Region'],
      },
    },
    {
      choiceId: 'crisis-001-b',
      text: '복구 대기',
      effects: {
        users: -30000,
        trust: -40,
      },
    },
  ],
};

// 테스트용 트리거
<button onClick={() => setEventData(exampleEvent)}>
  이벤트 발생 시뮬레이션
</button>
```

---

## 🎨 이벤트 타입 (5가지)

| Type | Icon | Color | Label |
|------|------|-------|-------|
| RANDOM | 🎲 | Purple | 랜덤 이벤트 |
| CHAIN | 🔗 | Orange | 연쇄 이벤트 |
| CRISIS | 🚨 | Red | 위기 이벤트 |
| OPPORTUNITY | 💡 | Green | 기회 이벤트 |
| SEASONAL | ⭐ | Blue | 시즌 이벤트 |

---

## 🔧 Props 설명

```typescript
interface EventPopupProps {
  eventData: EventData;           // ✅ 필수: 이벤트 데이터
  gameId: string;                  // ✅ 필수: 게임 ID
  onSelectChoice: (id: string) => Promise<void>;  // ✅ 필수: 선택 핸들러
  onComplete?: () => void;         // 선택적: 완료 콜백
  isProcessing?: boolean;          // 선택적: 로딩 상태
  error?: string | null;           // 선택적: 에러 메시지
}
```

---

## 📱 반응형 동작

- **Mobile** (< 640px): 1열, 전체 너비
- **Tablet** (640-1024px): 2열, 80% 너비
- **Desktop** (> 1024px): 3열, 60% 너비

자동으로 조정됩니다. 추가 설정 불필요!

---

## 🎯 실전 팁

### 1. API 응답에서 이벤트 추출

```typescript
const response = await fetch(`/api/game/${gameId}/choice`, {
  method: 'POST',
  body: JSON.stringify({ choiceId: normalChoiceId }),
});

const data = await response.json();

// 이벤트 발생 확인
if (data.randomEventTriggered && data.randomEventData) {
  setEventData(data.randomEventData); // 팝업 표시
}
```

### 2. 에러 재시도

```typescript
const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

const handleSelectChoice = async (choiceId: string) => {
  setSelectedChoiceId(choiceId); // 저장
  // API 호출...
};

// 에러 발생 시 재시도 버튼 클릭 → 자동으로 이전 선택 재시도
```

### 3. 현재 게임 상태 표시

```typescript
<EventPopup
  eventData={eventData}
  gameId={gameId}
  onSelectChoice={handleSelectChoice}
  // 현재 상태 전달
  currentStats={{
    users: gameState.users,
    trust: gameState.trust,
    cash: gameState.cash,
  }}
/>
```

---

## ⚠️ 주의사항

1. **Redux 미설치 시**: `eventSlice.ts` 빌드 에러 발생 (정상)
   - 해결: `npm install @reduxjs/toolkit react-redux`

2. **ESC 키 무시**: 팝업 외부 클릭도 무시됨
   - 의도적 설계 (반드시 선택 필요)

3. **애니메이션 없음**: Milestone 1은 기본 UI만 포함
   - Milestone 2에서 추가 예정

---

## 🆘 문제 해결

### Q: 팝업이 표시되지 않아요
A: `eventData`가 null이 아닌지 확인하세요
```tsx
{eventData && <EventPopup ... />}
```

### Q: 스타일이 적용되지 않아요
A: CSS Module import가 올바른지 확인하세요
```tsx
import styles from './EventPopup.module.css';
```

### Q: TypeScript 에러가 발생해요
A: `@/` alias가 설정되어 있는지 확인하세요 (tsconfig.json)

---

## 📚 더 알아보기

- **상세 문서**: `README.md`
- **실전 예시**: `USAGE_EXAMPLE.tsx`
- **구현 요약**: `IMPLEMENTATION_SUMMARY.md`

---

**작성**: Client AI | **날짜**: 2026-02-04 | **버전**: 1.0.0
