# EventPopup API Integration Guide

## Milestone 3 완료 ✅

EventPopup이 이제 RTK Query API와 완전히 통합되어 자동 캐싱, Optimistic Updates, 에러 처리를 제공합니다.

---

## 📦 설치 및 설정

### 1. Redux Provider 설정

**app/layout.tsx** (또는 최상위 레이아웃):

```tsx
import ReduxProvider from '@/store/ReduxProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
```

---

## 🚀 빠른 시작

### 기본 사용법

```tsx
'use client';

import { useEffect } from 'react';
import EventPopup from '@/components/EventPopup';
import { useEventPopup } from '@/hooks/useEventPopup';
import { useGetGameQuery } from '@/store/api/gameApi';

export default function GamePage({ gameId }: { gameId: string }) {
  // 1. 게임 상태 조회
  const { data: gameState } = useGetGameQuery(gameId);

  // 2. 이벤트 팝업 훅 사용
  const {
    currentEvent,
    isOpen,
    isProcessing,
    error,
    openPopup,
    handleSelectChoice,
  } = useEventPopup(gameId);

  // 3. 이벤트 트리거 시 자동으로 팝업 열기
  useEffect(() => {
    if (gameState?.randomEventTriggered && gameState.randomEventData) {
      openPopup(gameState.randomEventData);
    }
  }, [gameState?.randomEventTriggered, gameState?.randomEventData, openPopup]);

  // 4. 팝업 렌더링
  return (
    <>
      {/* 게임 UI */}
      <div>게임 화면...</div>

      {/* 이벤트 팝업 */}
      {isOpen && currentEvent && (
        <EventPopup
          eventData={currentEvent}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
          isProcessing={isProcessing}
          error={error}
        />
      )}
    </>
  );
}
```

---

## 🔧 API 엔드포인트

### RTK Query Hooks

```typescript
// 게임 상태 조회
const { data, isLoading, error } = useGetGameQuery(gameId);

// 일반 선택지 실행
const [executeChoice] = useExecuteChoiceMutation();
await executeChoice({ gameId, choiceId });

// 이벤트 선택지 실행
const [executeEventChoice] = useExecuteEventChoiceMutation();
await executeEventChoice({ gameId, choiceId, eventId });

// 이벤트 히스토리 조회
const { data: history } = useGetEventHistoryQuery(gameId);
```

---

## 🎯 useEventPopup Hook

### API

```typescript
const {
  // State
  currentEvent,      // 현재 이벤트 데이터
  isOpen,            // 팝업 열림 상태
  isProcessing,      // API 호출 중
  error,             // 에러 메시지

  // Actions
  openPopup,         // 팝업 열기
  closePopup,        // 팝업 닫기
  handleSelectChoice, // 선택지 선택
  retryLastChoice,   // 마지막 선택 재시도
  clearError,        // 에러 초기화
} = useEventPopup(gameId);
```

### 사용 예시

```typescript
// 팝업 열기
openPopup({
  eventId: 'crisis-001',
  eventType: 'CRISIS',
  eventText: 'AWS 리전 장애 발생!',
  choices: [
    { choiceId: 'c1', text: '멀티 리전 구축', effects: { cash: -50000000 } },
    { choiceId: 'c2', text: '복구 대기', effects: { users: -30000 } },
  ],
});

// 선택지 선택
await handleSelectChoice('c1');

// 에러 발생 시 재시도
if (error) {
  await retryLastChoice();
}
```

---

## ⚡ Optimistic Updates

RTK Query가 자동으로 Optimistic Updates를 처리합니다:

1. **선택 즉시**: 캐시가 즉시 업데이트되어 UI가 빠르게 반응
2. **API 호출**: 백그라운드에서 서버로 요청 전송
3. **성공 시**: 서버 응답으로 캐시 업데이트
4. **실패 시**: 자동으로 이전 상태로 롤백

```typescript
// gameApi.ts 내부 (자동 처리)
async onQueryStarted({ gameId, choiceId }, { dispatch, queryFulfilled }) {
  // Optimistic update
  const patchResult = dispatch(
    gameApiRTK.util.updateQueryData('getGame', gameId, (draft) => {
      draft.randomEventTriggered = false; // 즉시 반영
    })
  );

  try {
    await queryFulfilled; // 서버 응답 대기
  } catch {
    patchResult.undo(); // 실패 시 롤백
  }
}
```

---

## 🔄 자동 캐싱 및 리페칭

### 캐시 무효화

이벤트 선택 시 자동으로 관련 캐시를 무효화합니다:

```typescript
invalidatesTags: (result, error, { gameId }) => [
  { type: 'Game', id: gameId },           // 게임 상태 재조회
  { type: 'EventHistory', id: gameId },   // 이벤트 히스토리 재조회
]
```

### 폴링 설정

```typescript
// 5초마다 자동 리페칭
const { data } = useGetGameQuery(gameId, {
  pollingInterval: 5000,
});

// 포커스 시 리페칭
const { data } = useGetGameQuery(gameId, {
  refetchOnFocus: true,
  refetchOnReconnect: true,
});
```

---

## ❌ 에러 처리

### 에러 타입

```typescript
// 400 Bad Request
'잘못된 선택입니다. 다시 시도해주세요.'

// 404 Not Found
'게임 또는 이벤트를 찾을 수 없습니다.'

// 500 Internal Server Error
'서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'

// TIMEOUT_ERROR
'요청 시간이 초과되었습니다. 다시 시도해주세요.'

// FETCH_ERROR
'네트워크 연결을 확인해주세요.'
```

### 재시도 로직

```tsx
const { error, retryLastChoice, clearError } = useEventPopup(gameId);

{error && (
  <div className="error-toast">
    <p>{error}</p>
    <button onClick={retryLastChoice}>다시 시도</button>
    <button onClick={clearError}>닫기</button>
  </div>
)}
```

---

## 🔗 이벤트 체이닝

이벤트 선택 후 다음 이벤트가 자동으로 트리거됩니다:

```typescript
const result = await executeEventChoice({ gameId, choiceId, eventId });

// 서버 응답에 다음 이벤트가 포함된 경우
if (result.randomEventTriggered && result.randomEventData) {
  // 500ms 후 다음 이벤트 팝업 자동 표시
  setTimeout(() => {
    openPopup(result.randomEventData);
  }, 500);
}
```

---

## 📝 타입 정의

### GameState

```typescript
interface GameState {
  gameId: string;
  currentTurn: number;
  users: number;
  cash: number;
  trust: number;
  infrastructure: string[];
  status: string;

  // 이벤트 필드
  randomEventTriggered?: boolean;
  randomEventData?: EventData;
}
```

### EventData

```typescript
interface EventData {
  eventId: string;
  eventType: 'RANDOM' | 'CHAIN' | 'CRISIS' | 'OPPORTUNITY' | 'SEASONAL';
  eventText: string;
  title?: string;
  severity?: string;
  choices: EventChoice[];
}
```

### EventChoice

```typescript
interface EventChoice {
  choiceId: string;
  text: string;
  effects: {
    usersDelta?: number;
    cashDelta?: number;
    trustDelta?: number;
    addInfrastructure?: string[];
  };
}
```

---

## 🧪 테스트

### Mock 이벤트 데이터

```typescript
const mockEvent: EventData = {
  eventId: 'test-001',
  eventType: 'CRISIS',
  eventText: 'AWS ap-northeast-2 리전 장애 발생!',
  choices: [
    {
      choiceId: 'c1',
      text: '멀티 리전 긴급 구축 (-50M 원)',
      effects: { cash: -50000000, trust: 15, addInfrastructure: ['multi-region'] },
    },
    {
      choiceId: 'c2',
      text: '복구 대기 (6시간)',
      effects: { users: -30000, trust: -40 },
    },
  ],
};

// 팝업 테스트
openPopup(mockEvent);
```

### API Mocking (Jest)

```typescript
// __tests__/useEventPopup.test.ts
import { renderHook } from '@testing-library/react';
import { useEventPopup } from '@/hooks/useEventPopup';

jest.mock('@/store/api/gameApi', () => ({
  useExecuteEventChoiceMutation: () => [
    jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({}) }),
  ],
}));

test('should handle choice selection', async () => {
  const { result } = renderHook(() => useEventPopup('test-game-id'));

  await result.current.handleSelectChoice('c1');

  expect(result.current.isProcessing).toBe(false);
  expect(result.current.error).toBeNull();
});
```

---

## 🚀 고급 사용법

### 이벤트 히스토리

```tsx
const { data: history } = useGetEventHistoryQuery(gameId);

<div className="event-history">
  <h2>이벤트 히스토리</h2>
  {history?.map((entry) => (
    <div key={entry.timestamp}>
      <p>{entry.eventType} - Turn {entry.turnNumber}</p>
      <p>선택: {entry.selectedChoiceId}</p>
    </div>
  ))}
</div>
```

### 조건부 폴링

```typescript
const [isPlaying, setIsPlaying] = useState(true);

const { data } = useGetGameQuery(gameId, {
  pollingInterval: isPlaying ? 3000 : 0, // 게임 중일 때만 폴링
  skip: !gameId, // gameId 없으면 스킵
});
```

---

## 📚 관련 파일

- **Store**: `frontend/store/index.ts`
- **API**: `frontend/store/api/gameApi.ts`
- **Hook**: `frontend/hooks/useEventPopup.ts`
- **Slice**: `frontend/store/slices/eventSlice.ts`
- **Provider**: `frontend/store/ReduxProvider.tsx`
- **Examples**: `frontend/components/EventPopup/API_INTEGRATION_EXAMPLE.tsx`

---

## ✅ 완성도

- ✅ RTK Query 설정
- ✅ API 엔드포인트 정의
- ✅ Optimistic Updates
- ✅ 자동 캐싱 및 무효화
- ✅ 에러 처리 및 재시도
- ✅ 이벤트 체이닝
- ✅ 타입 안전성 (100% TypeScript)
- ✅ 사용자 훅 제공
- ✅ 예제 코드
- ✅ 문서화

**Milestone 3 완료!** 🎉
