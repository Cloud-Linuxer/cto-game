# EventPopup Component System

## 개요

동적 이벤트 시스템의 프론트엔드 UI 구현 (FEATURE-03-7)

**현재 상태**: Milestone 1 완료 (기본 UI 구조)

## 구현된 파일 구조

```
frontend/
├── types/
│   └── event.types.ts              ✅ 이벤트 타입 정의
├── store/
│   └── slices/
│       └── eventSlice.ts           ✅ Redux 상태 관리
├── utils/
│   └── eventTheme.ts               ✅ 이벤트 타입별 테마
├── components/
│   └── EventPopup/
│       ├── EventPopup.tsx          ✅ 메인 컨테이너
│       ├── EventHeader.tsx         ✅ 헤더 (타입 아이콘 + 레이블)
│       ├── EventContent.tsx        ✅ 본문 (제목 + 설명)
│       ├── EventTypeIcon.tsx       ✅ 타입별 아이콘
│       ├── EffectPreview.tsx       ✅ 효과 미리보기
│       ├── EventFooter.tsx         ✅ 푸터 (히스토리 링크)
│       ├── EventPopup.module.css   ✅ 스타일
│       ├── index.ts                ✅ Export
│       └── README.md               📄 문서 (현재 파일)
```

## 컴포넌트 설명

### 1. EventPopup (메인 컨테이너)

**역할**: 이벤트 팝업의 최상위 컨테이너, 상태 관리 및 선택지 처리

**Props**:
```typescript
interface EventPopupProps {
  eventData: EventData;           // 이벤트 데이터
  gameId: string;                  // 게임 ID
  onSelectChoice: (choiceId: string) => Promise<void>;  // 선택 핸들러
  onComplete?: () => void;         // 완료 콜백
  isProcessing?: boolean;          // 로딩 상태
  error?: string | null;           // 에러 메시지
}
```

**특징**:
- 배경 블러 오버레이
- 로딩 상태 표시
- 에러 처리 및 재시도
- ESC 키 무시 (선택 강제)
- 포커스 관리

### 2. EventHeader

**역할**: 이벤트 타입 표시 (아이콘 + 레이블)

**Props**:
```typescript
interface EventHeaderProps {
  eventType: EventType;            // 이벤트 타입
  className?: string;
}
```

### 3. EventContent

**역할**: 이벤트 본문 표시 (제목, 설명, 현재 상태)

**Props**:
```typescript
interface EventContentProps {
  title?: string;                  // 제목 (선택적)
  description: string;             // 설명
  currentStats?: EventGameStats;   // 현재 게임 상태
  maxHeight?: string;              // 최대 높이
  className?: string;
}
```

### 4. EventTypeIcon

**역할**: 이벤트 타입별 아이콘 표시

**Props**:
```typescript
interface EventTypeIconProps {
  type: EventType;                 // 이벤트 타입
  size?: number;                   // 크기 (default: 48px)
  animate?: boolean;               // 애니메이션 여부 (Milestone 2)
}
```

**지원 타입**:
- RANDOM: 🎲 (보라색)
- CHAIN: 🔗 (주황색)
- CRISIS: 🚨 (빨간색)
- OPPORTUNITY: 💡 (초록색)
- SEASONAL: ⭐ (파란색)

### 5. EffectPreview

**역할**: 선택지 효과 미리보기

**Props**:
```typescript
interface EffectPreviewProps {
  effects: EventChoiceEffects;     // 효과 데이터
  compact?: boolean;               // 축약 모드
  layout?: 'vertical' | 'horizontal';
  className?: string;
}
```

**표시 효과**:
- 👥 유저 변화
- 💰 자금 변화
- 📈 신뢰도 변화
- ☁️ 인프라 추가

### 6. EventFooter

**역할**: 이벤트 히스토리 링크

**Props**:
```typescript
interface EventFooterProps {
  gameId: string;
  onViewHistory?: () => void;
  className?: string;
}
```

## 사용 예시

```tsx
import { EventPopup } from '@/components/EventPopup';
import type { EventData } from '@/types/event.types';

// 사용 예시
const MyGamePage = () => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectChoice = async (choiceId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/${gameId}/event-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choiceId, eventId: eventData.eventId }),
      });

      if (!response.ok) throw new Error('선택 처리 실패');

      const data = await response.json();
      // 게임 상태 업데이트...

    } catch (err) {
      setError('선택 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

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
          onComplete={() => setEventData(null)}
          isProcessing={isProcessing}
          error={error}
        />
      )}
    </>
  );
};
```

## Redux 사용 예시

```tsx
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentEvent,
  selectIsPopupOpen,
  selectIsProcessing,
  selectError,
  closeEventPopup,
} from '@/store/slices/eventSlice';

const MyGamePage = () => {
  const dispatch = useDispatch();
  const currentEvent = useSelector(selectCurrentEvent);
  const isPopupOpen = useSelector(selectIsPopupOpen);
  const isProcessing = useSelector(selectIsProcessing);
  const error = useSelector(selectError);

  const handleSelectChoice = async (choiceId: string) => {
    // API 호출 로직...
  };

  const handleComplete = () => {
    dispatch(closeEventPopup());
  };

  return (
    <>
      {isPopupOpen && currentEvent && (
        <EventPopup
          eventData={currentEvent}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
          onComplete={handleComplete}
          isProcessing={isProcessing}
          error={error}
        />
      )}
    </>
  );
};
```

## 스타일링

### CSS Module 사용

모든 스타일은 `EventPopup.module.css`에 정의되어 있으며, TailwindCSS `@apply` 디렉티브를 사용합니다.

### 반응형 디자인

- **모바일** (< 640px): 1열 레이아웃, 95% 너비
- **태블릿** (640px ~ 1024px): 2열 레이아웃, 80% 너비
- **데스크톱** (> 1024px): 3열 레이아웃, 60% 너비

### 다크모드 지원

모든 컴포넌트는 TailwindCSS의 `dark:` 클래스를 사용하여 다크모드를 지원합니다.

## 접근성 (a11y)

- **ARIA 속성**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- **키보드 네비게이션**: Tab, Enter, Space 키 지원
- **포커스 관리**: 팝업 열릴 때 자동 포커스
- **ESC 키 무시**: 선택 강제 (팝업 외부 클릭 방지)

## 다음 단계 (Milestone 2)

- [ ] Framer Motion 애니메이션 추가
- [ ] 팝업 등장/퇴장 애니메이션
- [ ] 선택지 순차 등장 애니메이션
- [ ] 선택 후 하이라이트 효과
- [ ] 아이콘 애니메이션 (CRISIS 등)

## 필요한 패키지 설치

현재 구현은 기본 React + TailwindCSS만 사용하지만, Redux와 애니메이션을 위해 다음 패키지가 필요합니다:

```bash
# Redux Toolkit (Milestone 1+)
npm install @reduxjs/toolkit react-redux

# Framer Motion (Milestone 2)
npm install framer-motion

# Type definitions
npm install --save-dev @types/react-redux
```

## 테스트

현재 구현은 기본 UI 구조만 제공합니다. 테스트는 Milestone 5에서 추가됩니다.

## 참고 문서

- **구현 계획**: `/home/cto-game/docs/implementation/IMPL-CLIENT-03-7-event-popup.md`
- **기능 명세**: `/home/cto-game/docs/features/FEATURE-03-7-event-ui-integration.md`
- **기존 컴포넌트**: `/home/cto-game/frontend/components/ChoiceCard.tsx`

## 작성자

Client AI - 2026-02-04

## 상태

✅ Milestone 1 완료 (기본 UI 구조)
