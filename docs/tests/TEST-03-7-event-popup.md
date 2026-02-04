# TEST-03-7: 이벤트 팝업 UI 테스트 계획

## 테스트 목표
동적 이벤트 팝업 시스템이 모든 이벤트 타입에서 정상 작동하고, 사용자가 선택지를 통해 이벤트에 올바르게 대응할 수 있으며, 에러 상황에서도 안정적으로 동작하는지 검증한다.

## 관련 문서
- **EPIC**: EPIC-03 (동적 이벤트 시스템)
- **Feature Spec**: FEATURE-03-7 (이벤트 UI 통합)
- **Implementation Plan**: IMPL-CLIENT-03-7 (이벤트 팝업 UI 구현)

---

## 테스트 범위

### In Scope
- EventPopup 컴포넌트 렌더링 및 애니메이션
- 5가지 이벤트 타입 시각적 구분 (RANDOM, CHAIN, CRISIS, OPPORTUNITY, SEASONAL)
- 선택지 선택 및 API 호출
- 로딩 상태 및 에러 처리
- 키보드 네비게이션 (접근성)
- 반응형 디자인 (모바일/태블릿/데스크톱)
- Redux 상태 관리
- 애니메이션 성능 (60fps)

### Out of Scope
- 백엔드 이벤트 생성 로직 (별도 테스트: TEST-03-1)
- 게임 전체 플로우 (별도 E2E)
- 이벤트 히스토리 기능 (Phase 1+)

---

## 테스트 시나리오

### Scenario 1: Happy Path - CRISIS 이벤트 발생 및 선택
**목적**: 정상적인 이벤트 팝업 플로우 검증

**전제 조건**:
- 게임 진행 중 (Turn 15)
- 현재 상태: users 120K, cash 50M, trust 65
- Backend가 CRISIS 이벤트를 준비함

**단계**:
1. 플레이어가 일반 선택지 클릭 (`POST /api/game/:gameId/choice`)
2. API 응답: `randomEventTriggered: true`, `randomEventData` 포함
3. 배경 화면 블러 처리 (0.2초)
4. 빨간색 CRISIS 팝업 등장 (0.3초 애니메이션)
5. 팝업 헤더: 🚨 "위기 이벤트" 표시
6. 이벤트 텍스트: "AWS ap-northeast-2 리전 장애! 서울 리전 전체 다운..."
7. 2개 선택지 카드 순차 등장 (0.05초 간격):
   - A: "멀티 리전 긴급 구축" (-50M cash, +15 trust, +multi-region)
   - B: "복구 대기" (-30K users, -40 trust)
8. 플레이어가 선택지 A 클릭
9. 카드 하이라이트 애니메이션 (0.5초)
10. 로딩 스피너 표시
11. API 호출: `POST /api/game/:gameId/event-choice` with choiceId
12. 성공 응답 수신
13. 팝업 페이드아웃 (0.3초)
14. 게임 상태 업데이트: cash 0, trust 80, infra +multi-region

**예상 결과**:
- ✅ 팝업이 정확한 타이밍에 등장
- ✅ CRISIS 타입 시각적 스타일 (빨간색 그라데이션) 적용
- ✅ 선택지 효과 미리보기 정확히 표시
- ✅ API 호출 성공 및 게임 상태 업데이트
- ✅ 애니메이션 60fps 유지

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 2: Happy Path - 5가지 이벤트 타입 시각적 구분
**목적**: 모든 이벤트 타입이 명확히 구분되는지 검증

**전제 조건**:
- 각 타입별 샘플 이벤트 데이터 준비

**단계**:
1. **RANDOM** 이벤트 트리거
   - 보라색 그라데이션 (#667eea → #764ba2)
   - 🎲 주사위 아이콘
   - "랜덤 이벤트" 레이블
2. **CHAIN** 이벤트 트리거
   - 주황색 그라데이션 (#f093fb → #f5576c)
   - 🔗 체인 아이콘
   - "연쇄 이벤트" 레이블
3. **CRISIS** 이벤트 트리거
   - 빨간색 그라데이션 (#fa709a → #fee140)
   - 🚨 경고 아이콘
   - "위기 이벤트" 레이블
4. **OPPORTUNITY** 이벤트 트리거
   - 초록색 그라데이션 (#84fab0 → #8fd3f4)
   - 💡 전구 아이콘
   - "기회 이벤트" 레이블
5. **SEASONAL** 이벤트 트리거
   - 파란색 그라데이션 (#a8edea → #fed6e3)
   - ⭐ 별 아이콘
   - "시즌 이벤트" 레이블

**예상 결과**:
- ✅ 각 타입별 색상이 명확히 구분됨
- ✅ 아이콘이 올바르게 표시됨
- ✅ 레이블 텍스트가 정확함
- ✅ 색상 대비비 4.5:1 이상 (WCAG AA)

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 3: Sad Path - API 호출 실패 (500 Internal Server Error)
**목적**: 서버 에러 시 사용자 친화적 에러 처리 검증

**전제 조건**:
- OPPORTUNITY 이벤트 팝업 열림
- Backend 서버가 500 에러 반환하도록 설정 (테스트 환경)

**단계**:
1. 플레이어가 "긴급 투자 유치" 선택지 클릭
2. 로딩 스피너 표시
3. API 호출: `POST /api/game/:gameId/event-choice`
4. 응답: `500 Internal Server Error`
5. 팝업 내부에 에러 메시지 표시:
   - "⚠️ 선택 처리 중 오류가 발생했습니다"
   - "서버 오류가 발생했습니다"
   - [다시 시도] 버튼
6. 플레이어가 [다시 시도] 버튼 클릭
7. 재시도 성공 → 팝업 정상 종료

**예상 결과**:
- ✅ 에러 메시지가 명확히 표시됨
- ✅ 팝업이 닫히지 않고 재시도 가능
- ✅ 재시도 버튼 정상 작동
- ✅ 재시도 성공 시 정상 플로우 진행

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 4: Sad Path - 네트워크 타임아웃 (5초 초과)
**목적**: 느린 네트워크 환경에서 타임아웃 처리 검증

**전제 조건**:
- 이벤트 팝업 열림
- Network throttling: Slow 3G (테스트 도구)

**단계**:
1. 플레이어가 선택지 클릭
2. 로딩 스피너 표시
3. API 호출 대기 (5초+)
4. 타임아웃 발생
5. 에러 메시지 표시: "요청 시간이 초과되었습니다 (5초)"
6. [다시 시도] 버튼 표시

**예상 결과**:
- ✅ 5초 후 타임아웃 에러 발생
- ✅ 타임아웃 메시지 표시
- ✅ 재시도 가능

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 5: Edge Case - 모바일에서 긴 텍스트 (500자+)
**목적**: 모바일 환경에서 긴 이벤트 텍스트 가독성 검증

**전제 조건**:
- 모바일 화면 (360px)
- RANDOM 이벤트, 텍스트 500자

**단계**:
1. 모바일 화면에서 이벤트 팝업 열기
2. 팝업 크기: width 95%, maxWidth 360px
3. 이벤트 텍스트 표시 (500자)
4. 스크롤 필요 여부 확인
5. 최대 높이: 60vh
6. 선택지 카드: 1열 레이아웃 (100% 너비)

**예상 결과**:
- ✅ 팝업이 화면에 맞게 표시됨
- ✅ 긴 텍스트는 스크롤 가능
- ✅ 스크롤바 표시 (최대 높이 60vh)
- ✅ 선택지 카드 1열 레이아웃
- ✅ 텍스트 가독성 유지

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 6: Edge Case - 키보드 네비게이션 (접근성)
**목적**: 키보드만으로 이벤트 팝업 조작 가능 여부 검증

**전제 조건**:
- 데스크톱 환경
- 마우스 사용 안 함 (키보드만)

**단계**:
1. 이벤트 팝업 열림 → 첫 번째 선택지에 자동 포커스
2. Tab 키 누름 → 두 번째 선택지로 포커스 이동
3. Tab 키 다시 누름 → 세 번째 선택지로 이동
4. ArrowUp 키 누름 → 두 번째 선택지로 이동
5. ArrowDown 키 누름 → 세 번째 선택지로 이동
6. Enter 키 누름 → 현재 포커스된 선택지 선택
7. Esc 키 누름 → 무시 (팝업 닫히지 않음)

**예상 결과**:
- ✅ Tab/ArrowUp/ArrowDown으로 포커스 이동
- ✅ Enter로 선택 실행
- ✅ Esc 무시 (선택 강제)
- ✅ 포커스 인디케이터 명확히 표시

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 7: Edge Case - 동시 이벤트 발생 (Race Condition)
**목적**: 두 개의 이벤트가 거의 동시에 발생할 때 처리 검증

**전제 조건**:
- Backend가 두 개의 이벤트를 연속으로 반환

**단계**:
1. 첫 번째 선택지 클릭 → CRISIS 이벤트 발생
2. CRISIS 팝업 표시 전, 두 번째 이벤트 트리거
3. Redux 상태 확인: 첫 번째 이벤트만 저장됨
4. 첫 번째 팝업 정상 표시
5. 첫 번째 이벤트 선택 완료
6. 두 번째 이벤트는 무시됨 (또는 다음 턴에 표시)

**예상 결과**:
- ✅ 첫 번째 이벤트만 팝업 표시
- ✅ 두 번째 이벤트는 무시 (콘솔 경고)
- ✅ 게임 상태 일관성 유지

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 8: Boundary Case - 선택지 개수 (최소 1개, 최대 6개)
**목적**: 선택지 개수에 따른 레이아웃 검증

**전제 조건**:
- 데스크톱 환경 (1920px)

**단계**:
1. **1개 선택지**: 1열 레이아웃, 중앙 정렬
2. **2개 선택지**: 1열 레이아웃, 좌측 정렬
3. **3-4개 선택지**: 2열 레이아웃 (데스크톱), 1열 (모바일)
4. **5-6개 선택지**: 3열 레이아웃 (데스크톱), 1열 (모바일)

**예상 결과**:
- ✅ 각 개수별 레이아웃 정상 표시
- ✅ 카드 너비/간격 일관성 유지
- ✅ 모바일에서는 항상 1열

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

### Scenario 9: Boundary Case - 효과 값 극단 (매우 큰 숫자)
**목적**: 효과 미리보기에서 큰 숫자 표시 검증

**전제 조건**:
- 이벤트 선택지 효과: +5,000,000 cash, -1,000,000 users

**단계**:
1. 효과 미리보기 표시
2. 숫자 포맷: "↑ +5M cash", "↓ -1M users" (축약 표시)
3. Tooltip hover 시 정확한 숫자 표시: "+5,000,000 원", "-1,000,000 명"

**예상 결과**:
- ✅ 큰 숫자는 M/K 단위로 축약
- ✅ Tooltip에서 정확한 값 표시
- ✅ 레이아웃 깨지지 않음

**실제 결과**: {테스트 후 작성}

**상태**: ⬜ Pending

---

## Edge Cases 테이블

| Case | Input | Expected Output | Priority | Status |
|------|-------|-----------------|----------|--------|
| 이벤트 데이터 없음 | `randomEventData = null` | 팝업 표시 안 함, 콘솔 경고 | High | ⬜ |
| 선택지 0개 | `choices = []` | "이벤트 오류" 메시지 표시 | High | ⬜ |
| API 404 Not Found | 잘못된 gameId | "게임을 찾을 수 없습니다" | High | ⬜ |
| API 500 Server Error | 서버 에러 | "서버 오류" + 재시도 버튼 | High | ⬜ |
| Network Timeout | 5초+ 응답 없음 | "타임아웃" 메시지 + 재시도 | High | ⬜ |
| 극도로 긴 텍스트 | 1000자+ | 스크롤 영역, 최대 60vh | Medium | ⬜ |
| 동시 이벤트 발생 | 2개 이벤트 동시 트리거 | 첫 번째만 표시 | Medium | ⬜ |
| 이미지 로드 실패 | 아이콘 로드 실패 | 폴백 이모지 표시 (🎲, 🚨) | Low | ⬜ |
| 모바일 가로 모드 | 높이 < 500px | 팝업 높이 90vh로 축소 | Low | ⬜ |
| 매우 큰 효과 값 | +10,000,000 cash | "↑ +10M cash" 축약 표시 | Low | ⬜ |
| 선택지 1개 | choices.length = 1 | 1열 레이아웃, 정상 작동 | Low | ⬜ |
| 선택지 6개+ | choices.length > 6 | 처음 6개만 표시, 경고 | Low | ⬜ |

---

## 자동화 전략

### Unit Tests (Target: 80%+ coverage)

#### EventPopup.tsx
```typescript
describe('EventPopup', () => {
  describe('렌더링', () => {
    it('should render with CRISIS event data', () => {
      // Arrange
      const eventData = {
        eventId: 'crisis-001',
        eventType: 'CRISIS',
        eventText: 'AWS 리전 장애 발생!',
        choices: [
          { choiceId: 'c1', text: '멀티 리전 구축', effects: { cash: -50000000 } },
          { choiceId: 'c2', text: '복구 대기', effects: { users: -30000 } },
        ],
      };

      // Act
      const { getByText, getByTestId } = render(
        <EventPopup eventData={eventData} gameId="test-game" />
      );

      // Assert
      expect(getByText('AWS 리전 장애 발생!')).toBeInTheDocument();
      expect(getByTestId('event-type-icon')).toHaveTextContent('🚨');
      expect(getByText('멀티 리전 구축')).toBeInTheDocument();
      expect(getByText('복구 대기')).toBeInTheDocument();
    });

    it('should not render when eventData is null', () => {
      // Arrange & Act
      const { container } = render(
        <EventPopup eventData={null} gameId="test-game" />
      );

      // Assert
      expect(container).toBeEmptyDOMElement();
    });

    it('should render all 5 event types with correct themes', () => {
      const eventTypes = ['RANDOM', 'CHAIN', 'CRISIS', 'OPPORTUNITY', 'SEASONAL'];

      eventTypes.forEach((type) => {
        const eventData = { eventType: type, eventText: 'test', choices: [] };
        const { getByTestId } = render(
          <EventPopup eventData={eventData} gameId="test-game" />
        );

        const header = getByTestId('event-header');
        expect(header).toHaveClass(`event-${type.toLowerCase()}`);
      });
    });
  });

  describe('선택지 선택', () => {
    it('should call onSelectChoice when choice is clicked', async () => {
      // Arrange
      const mockOnSelect = jest.fn();
      const eventData = {
        eventId: 'test-001',
        eventType: 'RANDOM',
        eventText: 'test',
        choices: [{ choiceId: 'c1', text: '선택지 1', effects: {} }],
      };

      // Act
      const { getByText } = render(
        <EventPopup eventData={eventData} gameId="test-game" onComplete={mockOnSelect} />
      );
      const choiceButton = getByText('선택지 1');
      fireEvent.click(choiceButton);

      // Assert
      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('c1');
      });
    });

    it('should show loading spinner during API call', async () => {
      // Arrange
      const eventData = { /* ... */ };
      server.use(
        rest.post('/api/game/:gameId/event-choice', (req, res, ctx) => {
          return res(ctx.delay(1000), ctx.json({ success: true }));
        })
      );

      // Act
      const { getByText, getByTestId } = render(
        <EventPopup eventData={eventData} gameId="test-game" />
      );
      fireEvent.click(getByText('선택지 1'));

      // Assert
      expect(getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should throw error when API fails', async () => {
      // Arrange
      server.use(
        rest.post('/api/game/:gameId/event-choice', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );

      // Act
      const { getByText } = render(
        <EventPopup eventData={eventData} gameId="test-game" />
      );
      fireEvent.click(getByText('선택지 1'));

      // Assert
      await waitFor(() => {
        expect(getByText('서버 오류가 발생했습니다')).toBeInTheDocument();
        expect(getByText('다시 시도')).toBeInTheDocument();
      });
    });
  });
});
```

#### EventTypeIcon.tsx
```typescript
describe('EventTypeIcon', () => {
  it('should render correct icon for each event type', () => {
    const types = {
      RANDOM: '🎲',
      CHAIN: '🔗',
      CRISIS: '🚨',
      OPPORTUNITY: '💡',
      SEASONAL: '⭐',
    };

    Object.entries(types).forEach(([type, icon]) => {
      const { getByText } = render(<EventTypeIcon type={type} />);
      expect(getByText(icon)).toBeInTheDocument();
    });
  });

  it('should apply correct size prop', () => {
    const { container } = render(<EventTypeIcon type="CRISIS" size={64} />);
    const icon = container.querySelector('.event-icon');
    expect(icon).toHaveStyle({ fontSize: '64px' });
  });
});
```

#### EffectPreview.tsx
```typescript
describe('EffectPreview', () => {
  it('should render positive effects in green', () => {
    const effects = { users: 50000, cash: 10000000, trust: 15 };
    const { getByText } = render(<EffectPreview effects={effects} />);

    expect(getByText('↑ +50K users')).toHaveClass('text-green-600');
    expect(getByText('↑ +10M cash')).toHaveClass('text-green-600');
    expect(getByText('↑ +15 trust')).toHaveClass('text-green-600');
  });

  it('should render negative effects in red', () => {
    const effects = { users: -30000, cash: -5000000, trust: -40 };
    const { getByText } = render(<EffectPreview effects={effects} />);

    expect(getByText('↓ -30K users')).toHaveClass('text-red-600');
    expect(getByText('↓ -5M cash')).toHaveClass('text-red-600');
    expect(getByText('↓ -40 trust')).toHaveClass('text-red-600');
  });

  it('should render infrastructure changes in gray', () => {
    const effects = { infra: ['multi-region', 'Aurora Global DB'] };
    const { getByText } = render(<EffectPreview effects={effects} />);

    expect(getByText('→ +multi-region')).toHaveClass('text-gray-600');
    expect(getByText('→ +Aurora Global DB')).toHaveClass('text-gray-600');
  });

  it('should render in compact mode', () => {
    const effects = { users: 50000, cash: 10000000 };
    const { container } = render(<EffectPreview effects={effects} compact={true} />);

    expect(container.firstChild).toHaveClass('flex-row'); // horizontal layout
  });
});
```

---

### Integration Tests

```typescript
describe('EventPopup Redux Integration', () => {
  let store: ReturnType<typeof setupStore>;

  beforeEach(() => {
    store = setupStore();
  });

  it('should open event popup when openEventPopup action is dispatched', () => {
    // Arrange
    const eventData = { eventId: 'test-001', eventType: 'RANDOM', /* ... */ };

    // Act
    store.dispatch(openEventPopup(eventData));

    // Assert
    const state = store.getState();
    expect(state.event.isPopupOpen).toBe(true);
    expect(state.event.currentEvent).toEqual(eventData);
  });

  it('should close event popup when closeEventPopup action is dispatched', () => {
    // Arrange
    store.dispatch(openEventPopup({ /* ... */ }));

    // Act
    store.dispatch(closeEventPopup());

    // Assert
    const state = store.getState();
    expect(state.event.isPopupOpen).toBe(false);
    expect(state.event.currentEvent).toBeNull();
  });

  it('should add event to history after successful selection', async () => {
    // Arrange
    const eventData = { eventId: 'test-001', /* ... */ };
    const choiceId = 'c1';

    // Act
    await store.dispatch(
      gameApi.endpoints.executeEventChoice.initiate({
        gameId: 'test-game',
        choiceId,
        eventId: eventData.eventId,
      })
    );

    // Assert
    const state = store.getState();
    expect(state.event.eventHistory).toHaveLength(1);
    expect(state.event.eventHistory[0].eventId).toBe('test-001');
    expect(state.event.eventHistory[0].selectedChoiceId).toBe('c1');
  });
});
```

```typescript
describe('POST /api/game/:gameId/event-choice', () => {
  let app: INestApplication;
  let gameId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    // 테스트 게임 생성
    const response = await request(app.getHttpServer())
      .post('/api/game/start')
      .send({});
    gameId = response.body.gameId;

    // 이벤트 발생시키기
    await request(app.getHttpServer())
      .post(`/api/game/${gameId}/choice`)
      .send({ choiceId: 'trigger-event' });
  });

  it('should return 200 with updated game state', async () => {
    return request(app.getHttpServer())
      .post(`/api/game/${gameId}/event-choice`)
      .send({ choiceId: 'event-c1', eventId: 'crisis-001' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('gameId');
        expect(res.body).toHaveProperty('currentTurn');
        expect(res.body.randomEventTriggered).toBe(false);
      });
  });

  it('should return 404 for invalid gameId', async () => {
    return request(app.getHttpServer())
      .post('/api/game/invalid-id/event-choice')
      .send({ choiceId: 'event-c1', eventId: 'crisis-001' })
      .expect(404);
  });

  it('should return 400 for invalid choiceId', async () => {
    return request(app.getHttpServer())
      .post(`/api/game/${gameId}/event-choice`)
      .send({ choiceId: 'invalid', eventId: 'crisis-001' })
      .expect(400);
  });
});
```

---

### E2E Tests (Playwright)

```typescript
// tests/e2e/event-popup.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Event Popup E2E', () => {
  test('CRISIS event full flow', async ({ page }) => {
    // 1. 게임 시작
    await page.goto('/game/new');
    await expect(page.locator('[data-testid="game-screen"]')).toBeVisible();

    // 2. 이벤트 트리거할 때까지 턴 진행
    for (let i = 0; i < 15; i++) {
      await page.click('[data-testid="choice-card-1"]');
      await page.waitForTimeout(500);
    }

    // 3. CRISIS 이벤트 트리거
    await page.click('[data-testid="choice-card-2"]');

    // 4. 팝업 등장 확인
    await expect(page.locator('[data-testid="event-popup"]')).toBeVisible();

    // 5. CRISIS 타입 확인
    const eventIcon = page.locator('[data-testid="event-type-icon"]');
    await expect(eventIcon).toContainText('🚨');

    // 6. 배경 블러 확인
    const backdrop = page.locator('[data-testid="backdrop"]');
    await expect(backdrop).toHaveCSS('backdrop-filter', /blur/);

    // 7. 이벤트 텍스트 확인
    await expect(page.locator('[data-testid="event-description"]')).toContainText('리전 장애');

    // 8. 선택지 개수 확인
    const choices = page.locator('[data-testid^="event-choice-"]');
    await expect(choices).toHaveCount(2);

    // 9. 효과 미리보기 확인
    await expect(page.locator('[data-testid="effect-preview-0"]')).toContainText('-50M cash');
    await expect(page.locator('[data-testid="effect-preview-0"]')).toContainText('+15 trust');

    // 10. 선택지 선택
    await page.click('[data-testid="event-choice-0"]');

    // 11. 하이라이트 애니메이션 확인
    const selectedChoice = page.locator('[data-testid="event-choice-0"]');
    await expect(selectedChoice).toHaveClass(/selected/);

    // 12. 로딩 스피너 확인
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // 13. 팝업 닫힘 확인
    await expect(page.locator('[data-testid="event-popup"]')).not.toBeVisible({ timeout: 5000 });

    // 14. 게임 상태 업데이트 확인
    await expect(page.locator('[data-testid="trust-value"]')).toContainText('80');
    await expect(page.locator('[data-testid="cash-value"]')).toContainText('0');
  });

  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/game/test-game-with-event');

    // 팝업 열림 대기
    await expect(page.locator('[data-testid="event-popup"]')).toBeVisible();

    // Tab으로 선택지 이동
    await page.keyboard.press('Tab');
    let focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('data-testid', 'event-choice-1');

    await page.keyboard.press('Tab');
    focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('data-testid', 'event-choice-2');

    // ArrowDown으로 이동
    await page.keyboard.press('ArrowUp');
    focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('data-testid', 'event-choice-1');

    // Enter로 선택
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Esc는 무시됨 (팝업 닫히지 않음)
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="event-popup"]')).toBeVisible();
  });

  test('Mobile responsive design', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/game/test-game-with-event');

    // 팝업 크기 확인
    const popup = page.locator('[data-testid="event-popup"]');
    const bbox = await popup.boundingBox();
    expect(bbox.width).toBeLessThanOrEqual(360 * 0.95); // 95% width

    // 선택지 1열 레이아웃 확인
    const choicesContainer = page.locator('[data-testid="choices-container"]');
    await expect(choicesContainer).toHaveCSS('grid-template-columns', '1fr');

    // 스크롤 가능 확인 (긴 텍스트)
    const content = page.locator('[data-testid="event-content"]');
    const contentHeight = await content.evaluate((el) => el.scrollHeight);
    const viewportHeight = 640 * 0.6; // 60vh
    if (contentHeight > viewportHeight) {
      await expect(content).toHaveCSS('overflow-y', 'auto');
    }
  });

  test('Error handling with retry', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/game/*/event-choice', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    await page.goto('/game/test-game-with-event');
    await page.click('[data-testid="event-choice-0"]');

    // 에러 메시지 확인
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('서버 오류');

    // 재시도 버튼 클릭
    await page.unroute('**/api/game/*/event-choice'); // Mock 해제
    await page.click('[data-testid="retry-button"]');

    // 성공 확인
    await expect(page.locator('[data-testid="event-popup"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('5 event types visual distinction', async ({ page }) => {
    const eventTypes = ['RANDOM', 'CHAIN', 'CRISIS', 'OPPORTUNITY', 'SEASONAL'];

    for (const type of eventTypes) {
      await page.goto(`/game/test-game-with-${type.toLowerCase()}-event`);

      const header = page.locator('[data-testid="event-header"]');
      await expect(header).toHaveClass(new RegExp(`event-${type.toLowerCase()}`));

      // 색상 확인 (배경 그라데이션)
      const bgColor = await header.evaluate((el) => window.getComputedStyle(el).backgroundImage);
      expect(bgColor).toContain('linear-gradient');

      // 아이콘 확인
      const expectedIcons = {
        RANDOM: '🎲',
        CHAIN: '🔗',
        CRISIS: '🚨',
        OPPORTUNITY: '💡',
        SEASONAL: '⭐',
      };
      const icon = page.locator('[data-testid="event-type-icon"]');
      await expect(icon).toContainText(expectedIcons[type]);
    }
  });
});
```

---

## 회귀 테스트 범위

### 영향받는 기능
- [x] **ChoiceCard 컴포넌트** - 이벤트 팝업에서 재사용됨 (변경 없음)
- [x] **게임 메인 화면** - 팝업 오버레이 시 배경 블러 (변경됨)
- [x] **Redux Store** - eventSlice 추가로 구조 변경 (변경됨)
- [ ] **턴 진행 로직** - 이벤트 API 응답 처리 추가 (변경됨)
- [ ] **리더보드** - 영향 없음 (변경 없음)

### 회귀 테스트 체크리스트
- [ ] 기존 ChoiceCard가 게임 메인 화면에서 정상 작동하는가?
- [ ] 일반 선택지 선택 시 이벤트 없이 정상 턴 진행되는가?
- [ ] Redux DevTools에서 이벤트 상태가 올바르게 표시되는가?
- [ ] 기존 API 엔드포인트 (`POST /api/game/:gameId/choice`)가 정상 작동하는가?
- [ ] 게임 종료 조건 (승리/패배)이 정상 작동하는가?
- [ ] 메트릭 패널 (users, cash, trust) 표시가 정상인가?

---

## 성능 테스트

### 목표
- 팝업 렌더링 시간 < 100ms
- 애니메이션 프레임레이트 60fps
- 번들 크기 증가 < 50KB (gzipped)
- 메모리 누수 없음

### 테스트 방법 (Lighthouse + Chrome DevTools)

```javascript
// Performance 측정 (React Profiler)
import { Profiler } from 'react';

function onRenderCallback(
  id, // "EventPopup"
  phase, // "mount" or "update"
  actualDuration, // 렌더링 시간 (ms)
  baseDuration,
  startTime,
  commitTime,
  interactions
) {
  console.log(`${id} ${phase} took ${actualDuration}ms`);
  expect(actualDuration).toBeLessThan(100); // 100ms 이하
}

<Profiler id="EventPopup" onRender={onRenderCallback}>
  <EventPopup eventData={eventData} gameId={gameId} />
</Profiler>
```

```javascript
// 애니메이션 FPS 측정 (Chrome DevTools)
// 1. DevTools > Performance 탭 열기
// 2. Record 시작
// 3. 이벤트 팝업 열기
// 4. Record 정지
// 5. FPS 그래프 확인 → 60fps 유지 여부 확인
```

```bash
# 번들 크기 측정
npm run build

# Before (기존)
Main bundle: 245KB (gzipped)

# After (EventPopup 추가 후)
Main bundle: 285KB (gzipped)  # +40KB ✅ (목표: < +50KB)

# Lazy-loaded EventPopup chunk
EventPopup.chunk.js: 25KB (gzipped)
```

```javascript
// 메모리 누수 테스트 (10회 반복)
test('should not leak memory after 10 open/close cycles', async () => {
  const initialMemory = performance.memory.usedJSHeapSize;

  for (let i = 0; i < 10; i++) {
    const { unmount } = render(<EventPopup eventData={eventData} gameId="test" />);
    await waitFor(() => expect(screen.getByTestId('event-popup')).toBeInTheDocument());
    unmount();
  }

  const finalMemory = performance.memory.usedJSHeapSize;
  const memoryIncrease = finalMemory - initialMemory;

  expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB 이하 증가
});
```

---

## 보안 테스트

### Checklist
- [ ] XSS 방어 (이벤트 텍스트 sanitization)
- [ ] SQL Injection 방어 (DTO validation - Backend)
- [ ] CSRF 방어 (Phase 1+)
- [ ] Rate Limiting (API 호출 제한)
- [ ] 입력 검증 (선택지 ID 유효성)

### 테스트 케이스

```typescript
describe('Security - XSS Prevention', () => {
  it('should sanitize malicious event text', () => {
    const maliciousEventData = {
      eventId: 'xss-test',
      eventType: 'RANDOM',
      eventText: '<script>alert("XSS")</script>안전한 텍스트',
      choices: [],
    };

    const { container } = render(<EventPopup eventData={maliciousEventData} gameId="test" />);

    // <script> 태그가 제거되었는지 확인
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).toContain('안전한 텍스트');
  });

  it('should allow safe HTML tags (b, i, em)', () => {
    const eventData = {
      eventId: 'safe-html',
      eventType: 'RANDOM',
      eventText: '이것은 <b>굵은</b> 텍스트이고 <i>기울임</i> 텍스트입니다',
      choices: [],
    };

    const { container } = render(<EventPopup eventData={eventData} gameId="test" />);

    expect(container.innerHTML).toContain('<b>굵은</b>');
    expect(container.innerHTML).toContain('<i>기울임</i>');
  });
});

describe('Security - Input Validation', () => {
  it('should reject invalid choiceId', async () => {
    const eventData = {
      eventId: 'test',
      eventType: 'RANDOM',
      eventText: 'test',
      choices: [{ choiceId: 'valid-id', text: 'Valid', effects: {} }],
    };

    const { getByTestId } = render(<EventPopup eventData={eventData} gameId="test" />);

    // 잘못된 choiceId로 직접 API 호출 시도
    const invalidChoice = 'invalid-id-123';
    await expect(
      executeEventChoice({ gameId: 'test', choiceId: invalidChoice, eventId: 'test' })
    ).rejects.toThrow('Invalid choice ID');
  });
});
```

---

## 수용 기준 검증

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
- [ ] 팝업 렌더링 시간 < 100ms (실제: {측정값}ms)
- [ ] 애니메이션 프레임레이트 60fps 유지 (실제: {측정값}fps)
- [ ] 번들 크기 증가 < 50KB (실제: {측정값}KB)

### 데이터 일관성
- [ ] 이벤트 선택 후 게임 상태가 정확히 저장된다
- [ ] 에러 시 게임 상태 롤백이 가능하다
- [ ] 이벤트 히스토리가 정확히 기록된다

---

## 테스트 데이터

### 준비 데이터
```json
{
  "crisisEvent": {
    "eventId": "crisis-001",
    "eventType": "CRISIS",
    "eventText": "AWS ap-northeast-2 리전 장애 발생! 서울 리전 전체 다운... 현재 유저: 120,000명 대기 중. 신뢰도: 65%",
    "choices": [
      {
        "choiceId": "crisis-c1",
        "text": "멀티 리전 긴급 구축 (₩50,000,000 투자)",
        "effects": {
          "cash": -50000000,
          "trust": 15,
          "infra": ["multi-region"]
        }
      },
      {
        "choiceId": "crisis-c2",
        "text": "복구 대기 (6시간)",
        "effects": {
          "users": -30000,
          "trust": -40
        }
      }
    ]
  },
  "opportunityEvent": {
    "eventId": "opp-001",
    "eventType": "OPPORTUNITY",
    "eventText": "벤처캐피탈에서 긴급 투자 제안! 현재 밸류에이션: 500억 원",
    "choices": [
      {
        "choiceId": "opp-c1",
        "text": "투자 수락 (지분 20% 양도)",
        "effects": {
          "cash": 10000000000,
          "trust": 20
        }
      },
      {
        "choiceId": "opp-c2",
        "text": "거절 (자립 경영)",
        "effects": {
          "trust": 5
        }
      }
    ]
  },
  "randomEvent": {
    "eventId": "random-001",
    "eventType": "RANDOM",
    "eventText": "개발자 커뮤니티에서 당신의 스타트업을 주목하고 있습니다!",
    "choices": [
      {
        "choiceId": "random-c1",
        "text": "오픈소스 프로젝트 공개 (홍보 효과)",
        "effects": {
          "users": 5000,
          "trust": 10
        }
      },
      {
        "choiceId": "random-c2",
        "text": "내부 개발에 집중 (안정성)",
        "effects": {
          "trust": 5
        }
      }
    ]
  }
}
```

### Mock 데이터 (테스트용)
```typescript
// tests/mocks/eventData.mock.ts
export const mockEventData = {
  withLongText: {
    eventId: 'long-text',
    eventType: 'RANDOM',
    eventText: 'A'.repeat(1000), // 1000자
    choices: [{ choiceId: 'c1', text: 'Choice 1', effects: {} }],
  },
  withZeroChoices: {
    eventId: 'zero-choices',
    eventType: 'CRISIS',
    eventText: '이벤트 발생',
    choices: [],
  },
  withMaxChoices: {
    eventId: 'max-choices',
    eventType: 'SEASONAL',
    eventText: '특별 이벤트',
    choices: Array.from({ length: 6 }, (_, i) => ({
      choiceId: `c${i + 1}`,
      text: `선택지 ${i + 1}`,
      effects: { users: 1000 * (i + 1) },
    })),
  },
  withLargeEffects: {
    eventId: 'large-effects',
    eventType: 'OPPORTUNITY',
    eventText: '대형 투자 유치',
    choices: [
      {
        choiceId: 'c1',
        text: '수락',
        effects: {
          cash: 50000000000, // 500억
          users: 10000000, // 1000만
          trust: 50,
        },
      },
    ],
  },
};
```

---

## 이슈 및 블로커

### 발견된 이슈
| 이슈 ID | 설명 | 심각도 | 상태 | 담당자 |
|---------|------|--------|------|--------|
| - | (테스트 실행 후 작성) | - | - | - |

### 블로커
- ❌ **없음** (현재 블로커 없음, 구현 진행 가능)

---

## 테스트 실행 결과

### 요약
- **총 테스트**: {테스트 후 작성}개
- **통과**: {숫자}개 (✅ Pass)
- **실패**: {숫자}개 (❌ Fail)
- **보류**: {숫자}개 (⬜ Pending)
- **커버리지**: {숫자}%

### 실패 원인 분석
(테스트 실행 후 작성)

---

## 테스트 환경

### Frontend
- **Framework**: Next.js 14
- **Testing Library**: Jest + React Testing Library + Playwright
- **Browser**: Chrome 120+, Safari 17+, Firefox 120+
- **Mobile**: iOS 16+, Android 12+

### Backend
- **Framework**: NestJS
- **Testing Library**: Jest + Supertest
- **Database**: SQLite (테스트용 in-memory)

---

**작성자**: QA AI
**작성일**: 2026-02-04
**검토자**: QA Lead (검토 대기)
**상태**: Draft
