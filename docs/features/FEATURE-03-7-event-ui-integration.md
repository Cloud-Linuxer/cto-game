# FEATURE-03-7: 이벤트 UI 통합

## 개요
플레이어가 게임 중 발생하는 동적 이벤트를 시각적으로 경험하고, 선택지를 통해 상호작용할 수 있는 UI 시스템을 제공한다.

## 목표
- 이벤트 발생 시 몰입감 있는 팝업으로 플레이어의 주의를 끌고
- 이벤트 타입(RANDOM, CHAIN, CRISIS, OPPORTUNITY, SEASONAL)을 직관적으로 구분하며
- 선택지의 효과를 명확히 전달하여 전략적 의사결정을 돕는다

---

## 게임 규칙

### 핵심 메커니즘

1. **이벤트 팝업 표시 규칙**
   - 턴 진행 중 `randomEventTriggered: true` 응답을 받으면 즉시 전체 화면 팝업 표시
   - 팝업이 표시되는 동안 배경 게임 화면은 블러(blur) 처리
   - 팝업 외부 클릭 시 닫히지 않음 (반드시 선택 필요)

2. **이벤트 타입별 시각적 구분**
   - **RANDOM**: 보라색 계열, 🎲 주사위 아이콘
   - **CHAIN**: 주황색 계열, 🔗 체인 아이콘 (이전 이벤트와 연결 표시)
   - **CRISIS**: 빨간색 계열, 🚨 경고 아이콘 (긴급 상황 강조)
   - **OPPORTUNITY**: 초록색 계열, 💡 전구 아이콘 (기회 강조)
   - **SEASONAL**: 파란색 계열, ⭐ 별 아이콘 (특별 이벤트)

3. **선택지 표시 규칙**
   - 모든 선택지는 카드 형태로 표시 (ChoiceCard 컴포넌트 재사용)
   - 각 카드에는 선택 텍스트 + 효과 미리보기 표시
   - 효과 미리보기:
     - 긍정 효과: 초록색 ↑ (예: +50K users)
     - 부정 효과: 빨간색 ↓ (예: -10M cash)
     - 중립 효과: 회색 → (예: Infrastructure added)

4. **선택 완료 후 처리**
   - 선택 후 0.5초 하이라이트 애니메이션
   - API 호출 중 로딩 스피너 표시
   - 성공 시 팝업 페이드아웃 (0.3초)
   - 실패 시 에러 메시지 표시 (팝업 내부)

### 조건 및 제약

- **필수 조건**: Backend에서 `randomEventData` 객체를 제공해야 함
- **선택 제한**: 한 번에 하나의 선택지만 선택 가능 (멀티 셀렉트 불가)
- **시간 제한**: 없음 (플레이어가 충분히 고민할 수 있도록)
- **접근성**: 키보드 네비게이션 (Tab/Enter) 지원 필수
- **반응형**: 모바일(360px)부터 데스크톱(1920px)까지 대응

---

## 수치 모델

### 변수 정의

| 변수명 | 의미 | 기본값 | 범위 | 단위 |
|--------|------|--------|------|------|
| `animationDuration` | 팝업 등장 애니메이션 시간 | 300 | 100~500 | ms |
| `blurIntensity` | 배경 블러 강도 | 8 | 0~20 | px |
| `cardWidth` | 선택지 카드 너비 | 100% | 280~400 | px |
| `maxChoices` | 최대 선택지 개수 | 6 | 2~6 | 개 |
| `iconSize` | 이벤트 타입 아이콘 크기 | 48 | 32~64 | px |

### UI 계산 로직

```javascript
// 팝업 크기 계산 (화면 크기 기반)
function calculatePopupSize(screenWidth) {
  if (screenWidth < 640) {
    // Mobile
    return { width: '95%', maxWidth: '360px', padding: '16px' };
  } else if (screenWidth < 1024) {
    // Tablet
    return { width: '80%', maxWidth: '600px', padding: '24px' };
  } else {
    // Desktop
    return { width: '60%', maxWidth: '800px', padding: '32px' };
  }
}

// 선택지 카드 레이아웃
function calculateCardLayout(choiceCount, screenWidth) {
  if (screenWidth < 640) {
    // Mobile: 항상 1열
    return { columns: 1, gap: '12px' };
  } else if (choiceCount <= 2) {
    // Desktop: 2개 이하는 1열
    return { columns: 1, gap: '16px' };
  } else if (choiceCount <= 4) {
    // Desktop: 3-4개는 2열
    return { columns: 2, gap: '16px' };
  } else {
    // Desktop: 5-6개는 3열
    return { columns: 3, gap: '16px' };
  }
}
```

### 애니메이션 타이밍

```javascript
// 애니메이션 시퀀스
const animationSequence = {
  backdrop: { duration: 200, easing: 'ease-in' },     // 배경 블러
  popup: { duration: 300, easing: 'ease-out' },       // 팝업 등장
  choices: { duration: 200, delay: 100, stagger: 50 }, // 카드 순차 등장
  exit: { duration: 300, easing: 'ease-in' }          // 팝업 사라짐
};
```

---

## UI/UX 설계

### 컴포넌트 계층

```
EventPopup (전체 팝업)
├── EventHeader (헤더)
│   ├── EventTypeIcon (타입 아이콘)
│   └── EventTypeLabel (타입 레이블)
├── EventContent (본문)
│   ├── EventTitle (제목)
│   └── EventDescription (설명 텍스트)
├── ChoiceList (선택지 목록)
│   └── ChoiceCard[] (재사용 - 기존 컴포넌트)
│       ├── ChoiceText (선택 텍스트)
│       └── EffectPreview (효과 미리보기)
└── EventFooter (푸터)
    └── EventHistory Link (이벤트 히스토리 보기)
```

### 색상 팔레트 (이벤트 타입별)

```css
/* RANDOM - 보라색 */
--event-random-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--event-random-border: #667eea;
--event-random-text: #4c51bf;

/* CHAIN - 주황색 */
--event-chain-bg: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
--event-chain-border: #f5576c;
--event-chain-text: #c53030;

/* CRISIS - 빨간색 */
--event-crisis-bg: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
--event-crisis-border: #e53e3e;
--event-crisis-text: #742a2a;

/* OPPORTUNITY - 초록색 */
--event-opportunity-bg: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
--event-opportunity-border: #38b2ac;
--event-opportunity-text: #2c7a7b;

/* SEASONAL - 파란색 */
--event-seasonal-bg: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
--event-seasonal-border: #4299e1;
--event-seasonal-text: #2c5282;
```

### 레이아웃 (Wireframe)

```
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │  [아이콘] 이벤트 타입             │  │ ← Header
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  🚨 AWS 리전 장애 발생!          │  │ ← Title
│  │                                   │  │
│  │  서울 리전 전체 다운...           │  │
│  │  현재 유저: 120,000명 대기 중     │  │ ← Description
│  │  현재 신뢰도: 65%                │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │ 선택지 1    │  │ 선택지 2    │      │ ← Choices
│  │             │  │             │      │
│  │ ↑ +15 trust │  │ ↓ -30K users│      │ ← Effect Preview
│  └─────────────┘  └─────────────┘      │
│                                         │
│  [이벤트 히스토리 보기 →]              │ ← Footer
└────────────────────────────────────────┘
```

---

## 플레이어 시나리오

### 시나리오 1: 성공 케이스 - CRISIS 이벤트 발생
**상황**: Turn 15, 유저 120K, cash 50M, trust 65, CRISIS 이벤트 "AWS 리전 장애" 발생

**진행**:
1. 플레이어가 일반 선택지 선택
2. API 응답: `randomEventTriggered: true`
3. 게임 화면이 블러 처리되고 빨간색 CRISIS 팝업 등장 (0.3초 애니메이션)
4. 팝업 헤더: 🚨 위기 이벤트
5. 이벤트 텍스트 표시: "AWS ap-northeast-2 리전 장애! 서울 리전 전체 다운... 현재 유저: 120,000명 대기 중"
6. 2개의 선택지 카드 순차 등장 (0.05초 간격):
   - A: "멀티 리전 긴급 구축 (-50M cash, +15 trust, +multi-region)"
   - B: "복구 대기 (-30K users, -40 trust)"
7. 플레이어가 선택지 A에 마우스 오버 → 효과 상세 툴팁 표시
8. 플레이어가 선택지 A 클릭
9. 카드 하이라이트 애니메이션 (0.5초)
10. API 호출 중 로딩 스피너 (1초)
11. 성공 응답 → 팝업 페이드아웃 (0.3초)
12. 게임 화면 복귀, 업데이트된 상태 표시 (cash 0, trust 80, infra +multi-region)

**결과**: 플레이어가 비용을 지불하고 장기 안정성 확보, 몰입감 있는 UI 경험

---

### 시나리오 2: 실패 케이스 - 네트워크 에러
**상황**: OPPORTUNITY 이벤트 발생, 선택지 선택 후 API 에러

**진행**:
1. 플레이어가 "긴급 투자 유치" 선택지 클릭
2. 로딩 스피너 표시
3. API 에러 발생 (500 Internal Server Error)
4. 팝업 내부에 에러 메시지 표시:
   - "⚠️ 선택 처리 중 오류가 발생했습니다"
   - "다시 시도해주세요"
   - [재시도] 버튼
5. 플레이어가 [재시도] 클릭 → 3초 후 성공
6. 팝업 정상 종료

**결과**: 에러 상황에서도 게임 진행 가능, 사용자 친화적 에러 처리

---

### 시나리오 3: Edge Case - 모바일에서 긴 텍스트
**상황**: 모바일(360px), RANDOM 이벤트, 이벤트 텍스트 500자

**진행**:
1. 모바일 화면에서 이벤트 팝업 등장
2. 팝업 크기: width 95%, maxWidth 360px
3. 이벤트 텍스트가 길어서 스크롤 필요
4. 스크롤바 표시 (최대 높이 60vh)
5. 선택지 카드는 1열 레이아웃 (가로 100%)
6. 카드 내부 텍스트도 긴 경우 2줄까지 표시 후 "..." 처리
7. 선택지 클릭 시 확장되어 전체 텍스트 표시

**결과**: 모바일에서도 가독성 유지, 스크롤 가능

---

### 시나리오 4: Edge Case - 키보드 네비게이션
**상황**: 데스크톱, 마우스 없이 키보드만 사용

**진행**:
1. 이벤트 팝업 등장 시 첫 번째 선택지에 포커스
2. Tab 키로 선택지 간 이동 (하이라이트 표시)
3. Enter 키로 선택지 선택
4. Esc 키는 무시 (반드시 선택 필요)

**결과**: 접근성 기준 충족, 키보드 사용자 지원

---

## Edge Cases

| Case | 상황 | 처리 방법 | 우선순위 |
|------|------|-----------|----------|
| 이벤트 데이터 없음 | `randomEventData`가 null | 팝업 표시 안 함, 콘솔 경고 | High |
| 선택지 0개 | `choices` 배열이 비어있음 | 팝업 표시하되 "이벤트 오류" 메시지 | High |
| API 호출 실패 | Network error, 500 error | 팝업 내부 에러 메시지 + 재시도 버튼 | High |
| 동시 이벤트 발생 | 두 개의 이벤트가 거의 동시에 | 첫 번째만 표시, 두 번째는 무시 | Medium |
| 극도로 긴 텍스트 | 이벤트 텍스트 1000자+ | 스크롤 영역, 최대 높이 제한 | Medium |
| 이미지 로드 실패 | 이벤트 타입 아이콘 로드 실패 | 폴백 이모지 표시 (🎲, 🚨 등) | Low |
| 느린 네트워크 | API 응답 5초+ | 5초 후 타임아웃, "다시 시도" 안내 | Medium |
| 모바일 가로 모드 | 화면 높이 부족 (< 500px) | 팝업 높이 90vh로 축소, 스크롤 | Low |

---

## 수용 기준 (Acceptance Criteria)

### 기능 요구사항
- [ ] 이벤트 발생 시 전체 화면 팝업이 정상 표시된다
- [ ] 5가지 이벤트 타입이 시각적으로 명확히 구분된다
- [ ] 선택지의 효과 미리보기가 정확히 표시된다
- [ ] 선택 후 API 호출 및 게임 상태 업데이트가 정상 작동한다
- [ ] 팝업 외부 클릭 시 닫히지 않는다 (선택 강제)

### 게임 경험
- [ ] 플레이어가 이벤트 타입을 직관적으로 이해할 수 있다
- [ ] 선택지의 효과가 명확히 전달되어 전략적 판단이 가능하다
- [ ] 애니메이션이 자연스럽고 게임 몰입을 방해하지 않는다
- [ ] 에러 발생 시에도 게임 진행이 가능하다

### 성능
- [ ] 팝업 렌더링 시간 < 100ms
- [ ] 애니메이션 프레임레이트 60fps 유지
- [ ] 번들 크기 증가 < 50KB (gzipped)

### 접근성 (a11y)
- [ ] 키보드 네비게이션 (Tab/Enter) 정상 작동
- [ ] 스크린 리더 호환성 (ARIA 레이블)
- [ ] 색상 대비비 4.5:1 이상 (WCAG AA)
- [ ] 포커스 인디케이터 명확히 표시

### 반응형
- [ ] 모바일 (360px~640px) 정상 렌더링
- [ ] 태블릿 (640px~1024px) 정상 렌더링
- [ ] 데스크톱 (1024px+) 정상 렌더링
- [ ] 가로/세로 모드 전환 대응

---

## 구현 요청사항

### Client AI에게

#### UI 컴포넌트 구조
```typescript
// EventPopup.tsx (새로 생성)
interface EventPopupProps {
  eventData: {
    eventId: string;
    eventType: EventType;
    eventText: string;
    choices: Choice[];
  };
  onSelectChoice: (choiceId: string) => Promise<void>;
  onClose?: () => void;  // 선택 완료 후 호출
}

// EventTypeIcon.tsx (새로 생성)
interface EventTypeIconProps {
  type: EventType;
  size?: number;  // default: 48px
}

// EffectPreview.tsx (새로 생성)
interface EffectPreviewProps {
  effects: {
    users?: number;
    cash?: number;
    trust?: number;
    infra?: string[];
  };
  compact?: boolean;  // 축약 표시 여부
}
```

#### 상태 관리 (Redux)
```typescript
// eventSlice.ts
interface EventState {
  currentEvent: EventData | null;
  isPopupOpen: boolean;
  isProcessing: boolean;  // API 호출 중
  error: string | null;
}

// Actions
- openEventPopup(eventData)
- closeEventPopup()
- selectChoice(choiceId)
- selectChoiceSuccess()
- selectChoiceFailure(error)
```

#### 애니메이션 (Framer Motion)
```typescript
// 팝업 등장 애니메이션
const popupVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: { duration: 0.3, ease: 'easeIn' }
  }
};

// 선택지 순차 등장
const choiceVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.2 }
  })
};
```

#### API 연동
```typescript
// executeChoice API 호출 시 이벤트 데이터 처리
const response = await api.executeChoice(gameId, choiceId);

if (response.randomEventTriggered) {
  // 이벤트 팝업 표시
  dispatch(openEventPopup(response.randomEventData));
} else {
  // 정상 턴 진행
  // ...
}
```

---

### Server AI에게

#### API 응답 구조 (이미 구현됨)
```typescript
// GameResponseDto 확장 (이미 완료)
interface GameResponseDto {
  // 기존 필드...

  randomEventTriggered?: boolean;
  randomEventData?: {
    eventId: string;
    eventType: string;  // 'RANDOM' | 'CHAIN' | 'CRISIS' | 'OPPORTUNITY' | 'SEASONAL'
    eventText: string;  // 템플릿 치환 완료된 텍스트
    choices: Array<{
      choiceId: string;
      text: string;
      effects: {
        users?: number;
        cash?: number;
        trust?: number;
        infra?: string[];
      };
    }>;
  };
}
```

#### 추가 엔드포인트 (선택)
```yaml
GET /api/event/history/:gameId
Response:
  200:
    events: Array<{
      eventId: string;
      eventType: string;
      turnNumber: number;
      selectedChoiceId: string;
      timestamp: string;
    }>
```

---

## 참고 자료

- **관련 EPIC**: EPIC-03 (동적 이벤트 시스템)
- **기존 컴포넌트**: `frontend/components/ChoiceCard.tsx` (재사용)
- **디자인 시스템**: TailwindCSS + Framer Motion
- **아이콘**: 이모지 or Heroicons

---

## 디자인 모크업 (텍스트)

### CRISIS 이벤트 팝업 예시
```
╔═══════════════════════════════════════════════════════╗
║  🚨 위기 이벤트                                        ║ ← 빨간색 그라데이션 헤더
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  AWS ap-northeast-2 리전 장애 발생!                   ║ ← 큰 제목 (bold)
║                                                       ║
║  서울 리전 전체 다운으로 서비스가 중단되었습니다.      ║
║  긴급 대응이 필요합니다.                              ║
║                                                       ║
║  현재 상황:                                           ║
║  • 유저: 120,000명 대기 중                            ║
║  • 신뢰도: 65%                                        ║
║  • 예상 피해: -30,000명 이탈 가능                     ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║  ┌───────────────────────┐  ┌────────────────────┐   ║
║  │ 멀티 리전 긴급 구축    │  │ 복구 대기          │   ║
║  │                       │  │                    │   ║
║  │ ₩50,000,000 투자     │  │ 6시간 대기         │   ║
║  │                       │  │                    │   ║
║  │ 효과:                 │  │ 효과:              │   ║
║  │ ↓ -50M cash          │  │ ↓ -30K users      │   ║
║  │ ↑ +15 trust          │  │ ↓ -40 trust       │   ║
║  │ → +multi-region      │  │                    │   ║
║  └───────────────────────┘  └────────────────────┘   ║
╠═══════════════════════════════════════════════════════╣
║  [이벤트 히스토리 보기 →]                             ║ ← 작은 링크
╚═══════════════════════════════════════════════════════╝
```

---

**작성자**: Designer AI
**작성일**: 2026-02-04
**검토자**: Game Director (검토 대기)
**상태**: Draft
