# IMPL-CLIENT-03-7: 이벤트 팝업 UI 구현

## 개요
동적 이벤트 시스템의 프론트엔드 UI를 구현하여, 플레이어가 이벤트를 시각적으로 경험하고 선택지를 통해 상호작용할 수 있도록 한다.

## 관련 문서
- **EPIC**: EPIC-03 (동적 이벤트 시스템)
- **Feature Spec**: FEATURE-03-7 (이벤트 UI 통합)
- **참조 코드**: `frontend/components/ChoiceCard.tsx` (선택지 카드 재사용)

---

## 아키텍처

### 파일 구조
```
frontend/
├── components/
│   ├── EventPopup/
│   │   ├── EventPopup.tsx              # 메인 팝업 컨테이너
│   │   ├── EventHeader.tsx             # 헤더 (타입 아이콘 + 레이블)
│   │   ├── EventContent.tsx            # 본문 (제목 + 설명)
│   │   ├── EventTypeIcon.tsx           # 타입별 아이콘 컴포넌트
│   │   ├── EffectPreview.tsx           # 효과 미리보기
│   │   ├── EventFooter.tsx             # 푸터 (히스토리 링크)
│   │   ├── EventPopup.module.css       # 스타일
│   │   └── index.ts                    # Export
│   ├── ChoiceCard.tsx                  # 기존 (재사용)
│   └── ErrorBoundary.tsx               # 에러 처리
├── store/
│   ├── slices/
│   │   └── eventSlice.ts               # 이벤트 상태 관리
│   └── api/
│       └── gameApi.ts                  # API 통합 (기존 확장)
├── hooks/
│   ├── useEventPopup.ts                # 이벤트 팝업 커스텀 훅
│   └── useKeyboardNav.ts               # 키보드 네비게이션 훅
├── types/
│   └── event.types.ts                  # 타입 정의
└── utils/
    ├── eventAnimations.ts              # Framer Motion variants
    └── eventTheme.ts                   # 타입별 색상/아이콘 맵핑
```

---

## 컴포넌트 설계

### 컴포넌트 트리
```
components/
  EventPopup/
    EventPopup.tsx                      # Container (상태 관리)
    EventHeader.tsx                     # Presentation
    EventContent.tsx                    # Presentation
    EventTypeIcon.tsx                   # Presentation
    EffectPreview.tsx                   # Presentation
    EventFooter.tsx                     # Presentation
```

### Props/State 정의

#### EventPopup.tsx (메인 컨테이너)
```typescript
// EventPopup.tsx
interface EventPopupProps {
  eventData: EventData;
  gameId: string;
  onComplete?: () => void;  // 선택 완료 후 콜백
}

interface EventPopupState {
  selectedChoiceId: string | null;
  isProcessing: boolean;
  error: string | null;
  isClosing: boolean;
}

// Redux에서 가져올 상태
interface EventReduxState {
  currentEvent: EventData | null;
  isPopupOpen: boolean;
  isProcessing: boolean;
  error: string | null;
}
```

#### EventHeader.tsx
```typescript
interface EventHeaderProps {
  eventType: EventType;
  className?: string;
}

type EventType = 'RANDOM' | 'CHAIN' | 'CRISIS' | 'OPPORTUNITY' | 'SEASONAL';
```

#### EventContent.tsx
```typescript
interface EventContentProps {
  title?: string;          // 이벤트 제목 (optional)
  description: string;     // 이벤트 설명 (필수)
  currentStats?: {         // 현재 게임 상태 (optional)
    users: number;
    trust: number;
    cash: number;
  };
  maxHeight?: string;      // 최대 높이 (default: '60vh')
}
```

#### EventTypeIcon.tsx
```typescript
interface EventTypeIconProps {
  type: EventType;
  size?: number;           // default: 48px
  animate?: boolean;       // 등장 애니메이션 여부
}
```

#### EffectPreview.tsx
```typescript
interface EffectPreviewProps {
  effects: ChoiceEffects;
  compact?: boolean;       // 축약 표시 (default: false)
  layout?: 'vertical' | 'horizontal';  // default: 'vertical'
}

interface ChoiceEffects {
  users?: number;
  cash?: number;
  trust?: number;
  infra?: string[];
}
```

#### EventFooter.tsx
```typescript
interface EventFooterProps {
  gameId: string;
  onViewHistory?: () => void;
}
```

### 상태 관리 (Redux)

#### Redux Store Structure
```typescript
// store/slices/eventSlice.ts
interface EventState {
  currentEvent: EventData | null;
  isPopupOpen: boolean;
  isProcessing: boolean;     // API 호출 중
  error: string | null;
  eventHistory: EventHistoryEntry[];
}

interface EventData {
  eventId: string;
  eventType: EventType;
  eventText: string;
  choices: EventChoice[];
}

interface EventChoice {
  choiceId: string;
  text: string;
  effects: ChoiceEffects;
}

interface EventHistoryEntry {
  eventId: string;
  eventType: EventType;
  turnNumber: number;
  selectedChoiceId: string;
  timestamp: string;
}
```

#### Actions
```typescript
// Redux Toolkit Slice Actions
export const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    openEventPopup(state, action: PayloadAction<EventData>) {
      state.currentEvent = action.payload;
      state.isPopupOpen = true;
      state.error = null;
    },
    closeEventPopup(state) {
      state.isPopupOpen = false;
      state.currentEvent = null;
      state.isProcessing = false;
      state.error = null;
    },
    setProcessing(state, action: PayloadAction<boolean>) {
      state.isProcessing = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isProcessing = false;
    },
    addToHistory(state, action: PayloadAction<EventHistoryEntry>) {
      state.eventHistory.push(action.payload);
    },
  },
});
```

#### Selectors
```typescript
// Selectors
export const selectCurrentEvent = (state: RootState) => state.event.currentEvent;
export const selectIsPopupOpen = (state: RootState) => state.event.isPopupOpen;
export const selectIsProcessing = (state: RootState) => state.event.isProcessing;
export const selectError = (state: RootState) => state.event.error;
export const selectEventHistory = (state: RootState) => state.event.eventHistory;
```

---

## API 연동

### 1. RTK Query 통합

#### gameApi.ts 확장
```typescript
// store/api/gameApi.ts (기존 파일 확장)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const gameApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    // 기존 엔드포인트...

    // 이벤트 선택지 실행 (executeChoice 확장)
    executeEventChoice: builder.mutation<GameResponse, ExecuteEventChoiceRequest>({
      query: ({ gameId, choiceId, eventId }) => ({
        url: `/game/${gameId}/event-choice`,
        method: 'POST',
        body: { choiceId, eventId },
      }),
      // Optimistic update
      async onQueryStarted({ gameId, choiceId }, { dispatch, queryFulfilled }) {
        dispatch(eventSlice.actions.setProcessing(true));

        try {
          const { data } = await queryFulfilled;

          // 게임 상태 업데이트
          dispatch(gameApi.util.updateQueryData('getGame', gameId, (draft) => {
            Object.assign(draft, data);
          }));

          // 이벤트 히스토리 추가
          dispatch(eventSlice.actions.addToHistory({
            eventId: data.eventId,
            eventType: data.eventType,
            turnNumber: data.currentTurn,
            selectedChoiceId: choiceId,
            timestamp: new Date().toISOString(),
          }));

          // 팝업 닫기
          dispatch(eventSlice.actions.closeEventPopup());

        } catch (error) {
          dispatch(eventSlice.actions.setError('선택 처리 중 오류가 발생했습니다'));
        }
      },
    }),

    // 이벤트 히스토리 조회 (optional)
    getEventHistory: builder.query<EventHistoryEntry[], string>({
      query: (gameId) => `/event/history/${gameId}`,
    }),
  }),
});

export const {
  useExecuteEventChoiceMutation,
  useGetEventHistoryQuery,
} = gameApi;
```

### 2. EventPopup 컴포넌트에서 API 사용

```typescript
// components/EventPopup/EventPopup.tsx
export const EventPopup: React.FC<EventPopupProps> = ({ eventData, gameId, onComplete }) => {
  const [executeEventChoice, { isLoading, error }] = useExecuteEventChoiceMutation();
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  const handleSelectChoice = async (choiceId: string) => {
    setSelectedChoiceId(choiceId);

    try {
      await executeEventChoice({
        gameId,
        choiceId,
        eventId: eventData.eventId,
      }).unwrap();

      // 성공 시 콜백 실행
      onComplete?.();

    } catch (err) {
      console.error('Event choice execution failed:', err);
      // 에러는 Redux에서 관리
    }
  };

  // ...
};
```

### 3. 에러 처리

```typescript
// 에러 타입별 처리
const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해주세요',
  TIMEOUT: '요청 시간이 초과되었습니다 (5초)',
  SERVER_ERROR: '서버 오류가 발생했습니다',
  INVALID_CHOICE: '유효하지 않은 선택입니다',
  GAME_NOT_FOUND: '게임을 찾을 수 없습니다',
};

function handleApiError(error: any): string {
  if (error.status === 404) return ERROR_MESSAGES.GAME_NOT_FOUND;
  if (error.status === 400) return ERROR_MESSAGES.INVALID_CHOICE;
  if (error.status >= 500) return ERROR_MESSAGES.SERVER_ERROR;
  if (error.name === 'TimeoutError') return ERROR_MESSAGES.TIMEOUT;
  return ERROR_MESSAGES.NETWORK_ERROR;
}
```

### 4. 로딩 상태

```typescript
// EventPopup.tsx 내부
const { data, isLoading, error } = use{ApiName}Query(params);

if (isProcessing) {
  return (
    <div className="loading-overlay">
      <Spinner size="large" />
      <p>선택을 처리하는 중...</p>
    </div>
  );
}

if (error) {
  return (
    <ErrorMessage
      message={error}
      onRetry={() => handleSelectChoice(selectedChoiceId)}
    />
  );
}
```

---

## 애니메이션 (Framer Motion)

### Animation Variants

```typescript
// utils/eventAnimations.ts
import { Variants } from 'framer-motion';

// 배경 블러 애니메이션
export const backdropVariants: Variants = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: { duration: 0.2, ease: 'easeIn' },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

// 팝업 등장 애니메이션
export const popupVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

// 선택지 순차 등장 애니메이션
export const choiceVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: index * 0.05,
      duration: 0.2,
      ease: 'easeOut',
    },
  }),
};

// 선택 후 하이라이트 애니메이션
export const selectedVariants: Variants = {
  initial: { scale: 1, boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
  selected: {
    scale: 1.02,
    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)',
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

// 아이콘 회전 애니메이션 (CRISIS 타입 등)
export const iconRotateVariants: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, -10, 10, -10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};
```

### EventPopup 애니메이션 적용

```typescript
// components/EventPopup/EventPopup.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, popupVariants } from '@/utils/eventAnimations';

export const EventPopup: React.FC<EventPopupProps> = ({ eventData, gameId }) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* 배경 블러 오버레이 */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* 팝업 */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50"
            variants={popupVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="event-popup-container">
              <EventHeader eventType={eventData.eventType} />
              <EventContent description={eventData.eventText} />

              {/* 선택지 순차 등장 */}
              <div className="choices-container">
                {eventData.choices.map((choice, index) => (
                  <motion.div
                    key={choice.choiceId}
                    custom={index}
                    variants={choiceVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <ChoiceCard
                      choice={choice}
                      onSelect={handleSelectChoice}
                      isSelected={selectedChoiceId === choice.choiceId}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

---

## 스타일링 (TailwindCSS + CSS Variables)

### 이벤트 타입별 색상 테마

```typescript
// utils/eventTheme.ts
export const EVENT_THEMES = {
  RANDOM: {
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-700',
    border: 'border-purple-500',
    text: 'text-purple-700',
    icon: '🎲',
  },
  CHAIN: {
    gradient: 'bg-gradient-to-br from-orange-500 to-pink-600',
    border: 'border-orange-500',
    text: 'text-orange-700',
    icon: '🔗',
  },
  CRISIS: {
    gradient: 'bg-gradient-to-br from-red-500 to-yellow-500',
    border: 'border-red-500',
    text: 'text-red-700',
    icon: '🚨',
  },
  OPPORTUNITY: {
    gradient: 'bg-gradient-to-br from-green-500 to-blue-400',
    border: 'border-green-500',
    text: 'text-green-700',
    icon: '💡',
  },
  SEASONAL: {
    gradient: 'bg-gradient-to-br from-blue-400 to-pink-300',
    border: 'border-blue-500',
    text: 'text-blue-700',
    icon: '⭐',
  },
} as const;

export function getEventTheme(type: EventType) {
  return EVENT_THEMES[type] || EVENT_THEMES.RANDOM;
}
```

### CSS Module (EventPopup.module.css)

```css
/* components/EventPopup/EventPopup.module.css */
.popup-container {
  @apply relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl;
  @apply w-[95%] sm:w-[80%] lg:w-[60%];
  @apply max-w-[360px] sm:max-w-[600px] lg:max-w-[800px];
  @apply max-h-[90vh] overflow-y-auto;
  @apply p-4 sm:p-6 lg:p-8;
}

.header {
  @apply flex items-center gap-3 mb-6;
  @apply pb-4 border-b-2;
}

.content {
  @apply mb-6;
  @apply max-h-[60vh] overflow-y-auto;
}

.title {
  @apply text-2xl sm:text-3xl font-bold mb-4;
}

.description {
  @apply text-base sm:text-lg leading-relaxed;
  @apply text-gray-700 dark:text-gray-300;
}

.choices-grid {
  @apply grid gap-4;
  @apply grid-cols-1 sm:grid-cols-2 lg:grid-cols-3;
}

.footer {
  @apply mt-6 pt-4 border-t border-gray-200 dark:border-gray-700;
  @apply text-center;
}

.history-link {
  @apply text-sm text-blue-600 hover:text-blue-800;
  @apply transition-colors duration-200;
}

/* 반응형 조정 */
@media (max-width: 640px) {
  .choices-grid {
    @apply grid-cols-1;
  }
}

@media (min-width: 640px) and (max-width: 1024px) {
  .choices-grid {
    @apply grid-cols-2;
  }
}
```

---

## 보안

### Input Validation (클라이언트 측)

```typescript
// 선택지 ID 검증
function validateChoiceId(choiceId: string, availableChoices: EventChoice[]): boolean {
  return availableChoices.some(choice => choice.choiceId === choiceId);
}

// 사용 예시
const handleSelectChoice = async (choiceId: string) => {
  if (!validateChoiceId(choiceId, eventData.choices)) {
    console.error('Invalid choice ID');
    return;
  }

  // API 호출...
};
```

### XSS 방어

```typescript
// 이벤트 텍스트 sanitization (DOMPurify 사용)
import DOMPurify from 'dompurify';

const SafeEventText: React.FC<{ text: string }> = ({ text }) => {
  const sanitizedText = useMemo(() => {
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
      ALLOWED_ATTR: [],
    });
  }, [text]);

  return <div dangerouslySetInnerHTML={{ __html: sanitizedText }} />;
};
```

---

## 성능 최적화

### React Memoization

```typescript
// 컴포넌트 메모이제이션
export const EventPopup = React.memo<EventPopupProps>(({ eventData, gameId }) => {
  // ...
}, (prevProps, nextProps) => {
  // 이벤트 ID가 같으면 리렌더링 방지
  return prevProps.eventData.eventId === nextProps.eventData.eventId;
});

// EventTypeIcon 메모이제이션
export const EventTypeIcon = React.memo<EventTypeIconProps>(({ type, size = 48 }) => {
  const theme = useMemo(() => getEventTheme(type), [type]);

  return (
    <div className={`icon-container ${theme.gradient}`}>
      <span style={{ fontSize: size }}>{theme.icon}</span>
    </div>
  );
});

// EffectPreview 메모이제이션
export const EffectPreview = React.memo<EffectPreviewProps>(({ effects, compact = false }) => {
  const formattedEffects = useMemo(() => formatEffects(effects), [effects]);

  return (
    <div className="effect-preview">
      {formattedEffects.map((effect) => (
        <EffectItem key={effect.key} {...effect} compact={compact} />
      ))}
    </div>
  );
});
```

### Code Splitting (Lazy Loading)

```typescript
// 이벤트 팝업 지연 로딩
import { lazy, Suspense } from 'react';

const EventPopup = lazy(() => import('./components/EventPopup'));

// 사용처
<Suspense fallback={<EventPopupSkeleton />}>
  {isEventPopupOpen && <EventPopup eventData={eventData} gameId={gameId} />}
</Suspense>
```

### 번들 크기 최적화

```typescript
// Framer Motion 선택적 import
import { motion, AnimatePresence } from 'framer-motion';
// ❌ 전체 import 대신

import { motion } from 'framer-motion/dist/framer-motion';
// ✅ Tree-shakeable import
```

---

## 접근성 (a11y)

### ARIA 속성

```typescript
// EventPopup.tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="event-title"
  aria-describedby="event-description"
>
  <EventHeader id="event-title" {...} />
  <EventContent id="event-description" {...} />
  <ChoiceList aria-label="이벤트 선택지" />
</div>
```

### 키보드 네비게이션

```typescript
// hooks/useKeyboardNav.ts
export function useKeyboardNav(
  choices: EventChoice[],
  onSelect: (choiceId: string) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % choices.length);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, choices.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(choices[focusedIndex].choiceId);
          break;
        case 'Escape':
          // 팝업 닫기 방지 (선택 강제)
          e.preventDefault();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [choices, focusedIndex, onSelect]);

  return { focusedIndex };
}
```

### 포커스 관리

```typescript
// EventPopup.tsx
export const EventPopup: React.FC<EventPopupProps> = (props) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const { focusedIndex } = useKeyboardNav(props.eventData.choices, handleSelectChoice);

  // 팝업 열릴 때 포커스 이동
  useEffect(() => {
    if (isOpen && popupRef.current) {
      const firstChoice = popupRef.current.querySelector('[role="button"]');
      (firstChoice as HTMLElement)?.focus();
    }
  }, [isOpen]);

  return (
    <div ref={popupRef} role="dialog" aria-modal="true">
      {/* ... */}
    </div>
  );
};
```

---

## 국제화 (i18n)

```typescript
// next-intl 사용
import { useTranslations } from 'next-intl';

export const EventPopup: React.FC<EventPopupProps> = ({ eventData }) => {
  const t = useTranslations('event');

  return (
    <div>
      <EventHeader
        eventType={eventData.eventType}
        label={t(`type.${eventData.eventType.toLowerCase()}`)}
      />

      <EventFooter>
        <a href="/event/history">
          {t('footer.viewHistory')} →
        </a>
      </EventFooter>
    </div>
  );
};
```

### 번역 파일 (messages/ko.json)

```json
{
  "event": {
    "type": {
      "random": "랜덤 이벤트",
      "chain": "연쇄 이벤트",
      "crisis": "위기 이벤트",
      "opportunity": "기회 이벤트",
      "seasonal": "시즌 이벤트"
    },
    "footer": {
      "viewHistory": "이벤트 히스토리 보기"
    },
    "error": {
      "selectFailed": "선택 처리 중 오류가 발생했습니다",
      "retry": "다시 시도"
    }
  }
}
```

---

## 구현 순서

### Milestone 1: 기본 UI 구조 (Day 1-2)
1. [ ] 타입 정의 (`types/event.types.ts`)
2. [ ] Redux Slice 생성 (`store/slices/eventSlice.ts`)
3. [ ] EventPopup 컨테이너 컴포넌트
4. [ ] EventHeader 컴포넌트
5. [ ] EventContent 컴포넌트
6. [ ] EventTypeIcon 컴포넌트
7. [ ] EffectPreview 컴포넌트
8. [ ] 기본 스타일링 (TailwindCSS)

### Milestone 2: 애니메이션 및 상호작용 (Day 3-4)
9. [ ] Framer Motion variants 정의 (`utils/eventAnimations.ts`)
10. [ ] 팝업 등장/퇴장 애니메이션
11. [ ] 선택지 순차 등장 애니메이션
12. [ ] 선택 후 하이라이트 효과
13. [ ] 이벤트 타입별 테마 적용 (`utils/eventTheme.ts`)
14. [ ] 반응형 레이아웃 (모바일/태블릿/데스크톱)

### Milestone 3: API 연동 및 상태 관리 (Day 5-6)
15. [ ] RTK Query 통합 (`store/api/gameApi.ts` 확장)
16. [ ] executeEventChoice mutation
17. [ ] 로딩 상태 처리
18. [ ] 에러 핸들링 및 재시도 로직
19. [ ] Optimistic update
20. [ ] 이벤트 히스토리 연동 (optional)

### Milestone 4: 접근성 및 최적화 (Day 7-8)
21. [ ] 키보드 네비게이션 (`hooks/useKeyboardNav.ts`)
22. [ ] ARIA 속성 추가
23. [ ] 포커스 관리
24. [ ] React.memo 최적화
25. [ ] Code splitting (lazy loading)
26. [ ] EventFooter 컴포넌트
27. [ ] 다크모드 대응

### Milestone 5: 테스트 및 정리 (Day 9)
28. [ ] Unit tests (컴포넌트 렌더링)
29. [ ] Integration tests (Redux 연동)
30. [ ] E2E tests (Playwright)
31. [ ] 코드 리뷰 준비
32. [ ] 문서 업데이트

---

## 리스크 및 고려사항

| 리스크 | 영향도 | 대응 방안 | 우회 방안 |
|--------|--------|-----------|-----------|
| Framer Motion 번들 크기 | Medium | Tree-shakeable import 사용 | CSS animations 대체 |
| 모바일 성능 저하 | Medium | React.memo + lazy loading | 애니메이션 간소화 |
| 접근성 미준수 | High | 키보드 네비게이션 구현 | 폴백 UI 제공 |
| API 응답 지연 | Medium | Timeout 5초, 재시도 로직 | 낙관적 업데이트 |
| Redux 상태 동기화 실패 | High | RTK Query 자동 캐시 관리 | 수동 refetch |

---

## QA 요청사항

### Unit Test

**EventPopup.tsx**:
- [ ] EventPopup - 이벤트 데이터를 받아 정상 렌더링
- [ ] EventPopup - 선택지 클릭 시 API 호출
- [ ] EventPopup - 로딩 중 스피너 표시
- [ ] EventPopup - 에러 시 에러 메시지 표시

**EventTypeIcon.tsx**:
- [ ] EventTypeIcon - 5가지 타입별 아이콘 렌더링
- [ ] EventTypeIcon - size prop 적용
- [ ] EventTypeIcon - 애니메이션 정상 작동

**EffectPreview.tsx**:
- [ ] EffectPreview - 긍정 효과 초록색 표시
- [ ] EffectPreview - 부정 효과 빨간색 표시
- [ ] EffectPreview - compact 모드 정상 작동

### Integration Test

**Redux 통합**:
- [ ] openEventPopup 액션 시 팝업 표시
- [ ] closeEventPopup 액션 시 팝업 숨김
- [ ] executeEventChoice 성공 시 게임 상태 업데이트
- [ ] executeEventChoice 실패 시 에러 표시

**API 통합**:
- [ ] POST /api/game/:gameId/event-choice - 정상 케이스
- [ ] POST /api/game/:gameId/event-choice - 404 에러
- [ ] POST /api/game/:gameId/event-choice - 500 에러
- [ ] Timeout 5초 후 에러 메시지

### E2E Test (Playwright)

```typescript
test('CRISIS 이벤트 발생 및 선택 플로우', async ({ page }) => {
  await page.goto('/game/test-game-id');

  // 선택지 클릭하여 이벤트 트리거
  await page.click('[data-testid="choice-card-1"]');

  // 이벤트 팝업 등장 대기
  await page.waitForSelector('[data-testid="event-popup"]');

  // CRISIS 이벤트 확인
  await expect(page.locator('[data-testid="event-type-icon"]')).toContainText('🚨');

  // 선택지 선택
  await page.click('[data-testid="event-choice-1"]');

  // 로딩 스피너 확인
  await page.waitForSelector('[data-testid="loading-spinner"]');

  // 팝업 닫힘 확인
  await page.waitForSelector('[data-testid="event-popup"]', { state: 'hidden' });

  // 게임 상태 업데이트 확인
  await expect(page.locator('[data-testid="trust-value"]')).toContainText('80');
});
```

### Edge Case

- [ ] 이벤트 데이터 없음 (null) - 팝업 표시 안 함
- [ ] 선택지 0개 - "이벤트 오류" 메시지
- [ ] 극도로 긴 텍스트 (1000자+) - 스크롤 표시
- [ ] 동시 이벤트 발생 - 첫 번째만 표시
- [ ] 느린 네트워크 (5초+) - 타임아웃 메시지
- [ ] 모바일 가로 모드 - 높이 축소
- [ ] 키보드 네비게이션 - Tab/Enter 정상 작동
- [ ] 다크모드 - 색상 대비 유지

### Performance Test

- [ ] EventPopup 렌더링 시간 < 100ms
- [ ] 애니메이션 프레임레이트 60fps
- [ ] 번들 크기 증가 < 50KB (gzipped)
- [ ] 메모리 누수 없음 (10회 반복 테스트)

---

## 참고 코드

### ChoiceCard 재사용 예시
```typescript
// components/EventPopup/EventPopup.tsx
import { ChoiceCard } from '@/components/ChoiceCard';

export const EventPopup: React.FC<EventPopupProps> = ({ eventData }) => {
  return (
    <div className="choices-container">
      {eventData.choices.map((choice, index) => (
        <ChoiceCard
          key={choice.choiceId}
          choice={{
            id: choice.choiceId,
            text: choice.text,
            effects: choice.effects,
          }}
          onSelect={handleSelectChoice}
          showEffectPreview={true}
          variant="event"  // 이벤트 전용 스타일
        />
      ))}
    </div>
  );
};
```

### Custom Hook 예시
```typescript
// hooks/useEventPopup.ts
export function useEventPopup(gameId: string) {
  const dispatch = useDispatch();
  const currentEvent = useSelector(selectCurrentEvent);
  const isOpen = useSelector(selectIsPopupOpen);
  const isProcessing = useSelector(selectIsProcessing);
  const error = useSelector(selectError);

  const [executeEventChoice] = useExecuteEventChoiceMutation();

  const handleSelectChoice = useCallback(async (choiceId: string) => {
    if (!currentEvent) return;

    try {
      await executeEventChoice({
        gameId,
        choiceId,
        eventId: currentEvent.eventId,
      }).unwrap();
    } catch (err) {
      console.error('Failed to execute choice:', err);
    }
  }, [gameId, currentEvent, executeEventChoice]);

  return {
    currentEvent,
    isOpen,
    isProcessing,
    error,
    handleSelectChoice,
  };
}
```

---

**작성자**: Client AI
**작성일**: 2026-02-04
**검토자**: Tech Lead (검토 대기)
**상태**: Draft
