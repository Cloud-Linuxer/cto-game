# EPIC-12: 모바일 반응형 수정 (390x844 해상도)

**날짜**: 2026-02-06
**타겟 해상도**: 390x844 (iPhone 12 Mini / iPhone SE 3세대)
**상태**: ✅ 완료

---

## 개요

390x844 해상도에서 퀴즈 UI가 깨지는 문제를 해결하고, 모바일 사용성을 개선했습니다.

### 주요 변경 사항

1. **퀴즈 모달 반응형 처리** - 모바일에서 뷰포트에 fit
2. **OX 버튼 레이아웃** - 모바일에서 1열 스택, 태블릿+에서 2열
3. **터치 타겟 최적화** - 최소 44px 높이 보장
4. **신뢰도 바 단순화** - TrustGauge 제거, 간단한 숫자 표시로 변경
5. **텍스트 반응형 크기** - clamp() 기반 동적 스케일링

---

## 수정된 파일 (5개)

### 1. QuizPopup.tsx (7개 변경) ⚠️ CRITICAL

**Line 141: 모달 컨테이너 패딩**
```tsx
- <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
+ <div className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-4">
```

**Line 144: 모달 너비 (progressive enhancement)**
```tsx
- className="relative w-full max-w-2xl bg-white..."
+ className="relative w-full max-w-[calc(100vw-2rem)] xs:max-w-md sm:max-w-lg md:max-w-2xl bg-white..."
```
- Base (<480px): `max-w-[calc(100vw-2rem)]` (390px → 358px 사용 가능)
- xs (480px+): `max-w-md` (448px)
- sm (640px+): `max-w-lg` (512px)
- md (768px+): `max-w-2xl` (672px, 원래 디자인)

**Line 177: 헤더 패딩**
```tsx
- <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-white">
+ <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-3 xs:px-4 sm:px-6 py-3 xs:py-4 text-white">
```

**Line 183: 제목 텍스트 스케일**
```tsx
- <h2 id="quiz-title" className="text-2xl font-bold mt-1">
+ <h2 id="quiz-title" className="text-responsive-xl sm:text-2xl font-bold mt-1">
```
- `text-responsive-xl`: `clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)` (20px → 24px)
- `sm:text-2xl`: 640px+에서 원래 크기로 복원

**Line 198: 컨텐츠 패딩**
```tsx
- <div className="p-6">
+ <div className="p-3 xs:p-4 sm:p-6">
```

**Lines 226, 250: 제출/확인 버튼 (2곳)**
```tsx
- className="px-8 py-3 rounded-lg font-semibold..."
+ className="px-4 xs:px-6 sm:px-8 py-3.5 min-h-[44px] rounded-lg font-semibold..."
```
- `min-h-[44px]`: Apple HIG / WCAG 2.5.5 터치 타겟 준수
- `py-3.5`: 44px 높이 보장 (패딩 14px × 2 + 텍스트 높이)

**결과**: 358px 모달 → 334px 사용 가능 (패딩 12px × 2)

---

### 2. OXQuiz.tsx (6개 변경) ⚠️ HIGH

**Line 51: 버튼 베이스 스타일**
```tsx
- const baseStyle = 'py-6 px-8 rounded-xl font-bold text-xl transition-all...'
+ const baseStyle = 'py-4 xs:py-6 px-4 xs:px-8 min-h-[44px] rounded-xl font-bold text-responsive-lg xs:text-xl transition-all...'
```

**Line 102: 질문 텍스트**
```tsx
- <h3 className="text-xl font-bold...">
+ <h3 className="text-responsive-lg xs:text-xl font-bold...">
```
- `text-responsive-lg`: `clamp(1.125rem, 1rem + 0.625vw, 1.25rem)` (18px → 20px)

**Line 108: 그리드 레이아웃**
```tsx
- <div className="grid grid-cols-2 gap-4">
+ <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
```
- Base (<480px): 1열 스택 (326px 버튼 너비)
- xs (480px+): 2열 (각 181px 버튼 너비)

**Lines 119, 137: O/X 아이콘**
```tsx
- <span className="text-5xl font-black">✓</span>
+ <span className="text-4xl xs:text-5xl font-black">✓</span>
```

**Lines 120, 138: O/X 라벨**
```tsx
- <span className="text-lg font-bold">참 (True)</span>
+ <span className="text-base xs:text-lg font-bold">참 (True)</span>
```

**결과**: 모바일에서 1열 스택으로 버튼 크기 확보, 터치 타겟 44px+ 보장

---

### 3. CompactMetricsBar.tsx (2개 변경) ⚠️ HIGH

**Line 5: Import 제거**
```tsx
- import TrustGauge from './metrics/TrustGauge';
+ (removed)
```

**Lines 46-55: TrustGauge → 간단한 숫자 표시**
```tsx
- {/* 신뢰도 - Enhanced with Gauge */}
- <Tooltip content="서비스 신뢰도 (투자 유치와 게임 성공에 중요)" position="bottom">
-   <div className="min-w-[200px] px-3 py-2 bg-purple-50 rounded-lg shrink-0 snap-start">
-     <TrustGauge
-       trust={gameState.trust}
-       difficultyMode={gameState.difficultyMode}
-       vertical={false}
-     />
-   </div>
- </Tooltip>

+ {/* 신뢰도 - Simple Number Display */}
+ <Tooltip content="서비스 신뢰도 (투자 유치와 게임 성공에 중요)" position="bottom">
+   <div className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-purple-50 rounded-full whitespace-nowrap shrink-0 snap-start">
+     <span className="text-sm">⭐</span>
+     <span className="text-sm font-semibold text-purple-700">{gameState.trust}</span>
+   </div>
+ </Tooltip>
```

**변경 이유**:
- 이전 커밋에서 MetricsPanel은 TrustGauge 제거했지만 CompactMetricsBar는 미수정
- 모바일에서 프로그레스 바는 공간 낭비 (200px → 60-70px로 축소)
- 다른 메트릭과 일관된 패턴 (⚡ Turn, 👥 Users, 💰 Cash, ⭐ Trust)

**결과**: 신뢰도 표시가 간결하고 일관성 있게 개선

---

### 4. MultipleChoiceQuiz.tsx (3개 변경) 🔵 MEDIUM

**Line 95: 질문 텍스트**
```tsx
- <h3 className="text-xl font-bold...">
+ <h3 className="text-responsive-lg xs:text-xl font-bold...">
```

**Line 116: 옵션 카드 패딩**
```tsx
- className={`relative rounded-lg p-4 cursor-pointer...
+ className={`relative rounded-lg p-3 xs:p-4 cursor-pointer...
```

**Line 147: 옵션 텍스트**
```tsx
- className={`text-base leading-relaxed...
+ className={`text-responsive-sm xs:text-base leading-relaxed...
```
- `text-responsive-sm`: `clamp(0.875rem, 0.8rem + 0.4vw, 1rem)` (14px → 16px)

---

### 5. QuizResult.tsx (4개 변경) 🔵 MEDIUM

**Line 52: 배너 패딩**
```tsx
- className={`w-full py-4 px-6...
+ className={`w-full py-3 xs:py-4 px-4 xs:px-6...
```

**Line 59: 아이콘 크기**
```tsx
- <span className="text-2xl" aria-hidden="true">
+ <span className="text-xl xs:text-2xl" aria-hidden="true">
```

**Line 62: 제목**
```tsx
- <h2 className="text-xl font-bold">
+ <h2 className="text-responsive-lg xs:text-xl font-bold">
```

**Line 69: 컨텐츠 패딩**
```tsx
- <div className="p-6">
+ <div className="p-4 xs:p-6">
```

---

## 기술적 상세

### Responsive Utilities (tailwind.config.ts)

이미 존재하는 유틸리티 활용:

```typescript
fontSize: {
  'responsive-sm': 'clamp(0.875rem, 0.8rem + 0.4vw, 1rem)',
  'responsive-lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
  'responsive-xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
}
```

- `clamp(min, preferred, max)`: 뷰포트 너비에 따라 동적 스케일링
- `0.25vw` ~ `1vw`: 뷰포트 너비의 비율로 증가

### Breakpoint Strategy

```
Base (<480px):  390px 타겟, 최소 스타일
xs (480px+):    점진적 개선 시작
sm (640px+):    태블릿
md (768px+):    데스크탑, 원래 디자인 복원
```

### Touch Target (WCAG 2.5.5)

- 최소 44px × 44px (Apple HIG, WCAG Level AA)
- 모든 버튼에 `min-h-[44px]` 적용
- `py-3.5` (14px × 2) + 텍스트 높이로 44px 보장

---

## 검증 결과

### Build Status

```bash
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (10/10)
```

**TypeScript 에러**: 0개
**빌드 에러**: 0개
**경고**: 0개

### 파일 크기 영향

```
ƒ /game/[gameId]  20.3 kB  220 kB (First Load JS)
```

- 변경 전후 파일 크기 동일 (CSS 클래스만 변경, JS 로직 없음)

---

## 테스트 체크리스트

### ✅ 390x844 해상도 (Chrome DevTools)

**퀴즈 팝업**:
- [x] 모달이 뷰포트에 fit (가로 스크롤 없음)
- [x] Close 버튼 클릭 가능
- [x] 배경 blur overlay 표시

**OX 퀴즈**:
- [x] 버튼이 세로로 스택 (390px)
- [x] 버튼이 가로로 나란히 (480px+)
- [x] 터치 타겟 ≥44px 높이
- [x] 질문 텍스트 줌 없이 읽기 가능

**신뢰도 바**:
- [x] ⭐ 75 형식으로 간단히 표시
- [x] 프로그레스 바 없음
- [x] Turn/Users/Cash와 일관된 스타일

### ✅ 데스크탑 회귀 테스트 (1920x1080)

- [x] 퀴즈 모달 `max-w-2xl` (672px) 사용
- [x] OX 버튼 가로 나란히 표시
- [x] 원래 패딩 유지 (px-6, px-8)
- [x] 텍스트 크기 원래대로 복원

---

## 성과

### Before (문제점)

1. **모달 오버플로**: 672px 모달 > 390px 뷰포트 (72% 초과)
2. **OX 버튼 레이아웃**: 2열 그리드가 181px 버튼 생성 (너무 좁음)
3. **패딩 과다**: px-6, px-8로 342px만 사용 가능
4. **텍스트 고정**: 모바일 스케일 없음
5. **신뢰도 바 불일치**: TrustGauge가 CompactMetricsBar에 여전히 존재

### After (개선)

1. ✅ **모달 fit**: 358px 모달 (390px - 32px padding)
2. ✅ **OX 1열 스택**: 326px 버튼 너비 (모바일), 2열 (태블릿+)
3. ✅ **패딩 최적화**: p-3 (12px)로 334px 사용 가능
4. ✅ **동적 텍스트**: clamp() 기반 반응형 스케일링
5. ✅ **신뢰도 바 단순화**: ⭐ 75 형식, 일관된 디자인

### 수치 비교

| 항목 | Before | After | 개선율 |
|------|--------|-------|--------|
| 모달 너비 (390px) | 672px (오버플로) | 358px | 100% fit |
| 사용 가능 너비 | 342px | 334px | -2.3% (최적화) |
| OX 버튼 너비 | 181px (2열) | 326px (1열) | +80% |
| 터치 타겟 높이 | 불명확 | 44px+ | WCAG AA |
| 신뢰도 바 너비 | 200px | 60-70px | -65% |

---

## 향후 작업

### 단기 (Optional)

1. **실제 디바이스 테스트**:
   - iPhone 12 Mini (390x844)
   - iPhone SE 3rd gen (390x844)
   - Android 소형 디바이스

2. **E2E 테스트 추가**:
   - Playwright 모바일 뷰포트 시나리오
   - 터치 이벤트 시뮬레이션

### 장기 (Phase 2)

1. **Lighthouse 모바일 감사**: 점수 90+ 목표
2. **Safari iOS 크로스 브라우저 테스트**
3. **접근성 감사**: WCAG 2.1 Level AA 준수

---

## 참고 자료

- **Apple HIG**: Touch Target 44pt minimum
- **WCAG 2.5.5**: Target Size (Level AAA: 44×44 CSS pixels)
- **MDN clamp()**: https://developer.mozilla.org/en-US/docs/Web/CSS/clamp
- **Tailwind Responsive Design**: https://tailwindcss.com/docs/responsive-design

---

**작성자**: Claude Code (Sonnet 4.5)
**완료일**: 2026-02-06
**빌드 상태**: ✅ 통과 (0 에러, 0 경고)
**배포 준비**: ✅ Ready
