# EPIC-12 Visual Test Guide (390x844 모바일)

**날짜**: 2026-02-06
**타겟 해상도**: 390x844 (iPhone 12 Mini / iPhone SE 3세대)

---

## Quick Test Instructions

### Chrome DevTools 설정

1. **DevTools 열기**: F12 또는 Cmd+Option+I
2. **Device Toolbar**: Toggle device toolbar (Cmd+Shift+M)
3. **기기 선택**: "Edit..." → Add custom device

**Custom Device Settings**:
```
Device Name: iPhone 12 Mini
Width: 390px
Height: 844px
Device pixel ratio: 3
User agent string: iPhone
```

---

## Test Scenarios

### 1. 퀴즈 팝업 기본 표시

**URL**: `http://localhost:3001/game/[gameId]` (게임 플레이 중)

**Steps**:
1. 게임 진행하여 퀴즈 발생 (Turn 5, 9, 13, 17, 21)
2. 퀴즈 모달 열림 확인

**Expected Results** (390x844):
- ✅ 모달이 뷰포트에 완전히 fit (가로 스크롤 없음)
- ✅ Close 버튼 (우측 상단) 클릭 가능
- ✅ 배경 블러 오버레이 표시
- ✅ 헤더 패딩: 12px (좌우)
- ✅ 컨텐츠 패딩: 12px

**Screenshot Points**:
- 모달 전체 뷰
- Close 버튼 hover 상태
- 배경 블러 효과

---

### 2. OX 퀴즈 레이아웃

**Steps**:
1. OX 타입 퀴즈 진입
2. 질문 텍스트 가독성 확인
3. O/X 버튼 레이아웃 확인

**Expected Results** (390x844):
- ✅ 질문 텍스트: `text-responsive-lg` (18-20px)
- ✅ O/X 버튼: 세로 1열 스택
- ✅ 버튼 너비: 326px (모달 334px - 갭 8px)
- ✅ 버튼 높이: 44px 이상 (터치 타겟)
- ✅ 아이콘: 64px (4xl)
- ✅ 라벨: 16px (base)

**Expected Results** (480px+):
- ✅ O/X 버튼: 가로 2열 그리드
- ✅ 버튼 너비: 각 ~200px
- ✅ 아이콘: 80px (5xl)
- ✅ 라벨: 18px (lg)

**Screenshot Points**:
- 390px: 1열 스택 레이아웃
- 480px: 2열 그리드 레이아웃
- 버튼 선택 상태 (border-2, 색상 변경)

---

### 3. 객관식 퀴즈

**Steps**:
1. 4지선다 타입 퀴즈 진입
2. 질문 및 옵션 가독성 확인
3. 옵션 선택 동작 확인

**Expected Results** (390x844):
- ✅ 질문 텍스트: `text-responsive-lg` (18-20px)
- ✅ 옵션 카드 패딩: 12px
- ✅ 옵션 텍스트: `text-responsive-sm` (14-16px)
- ✅ 옵션 세로 스택 (이미 구현됨)
- ✅ 터치 타겟: 각 옵션 44px 이상

**Screenshot Points**:
- 질문 + 4개 옵션 전체 뷰
- 옵션 선택 상태 (border-blue-500)
- 스크롤 동작 (옵션이 많을 경우)

---

### 4. 퀴즈 결과 화면

**Steps**:
1. 퀴즈 제출 후 결과 확인
2. 정답/오답 배너 확인
3. 해설 가독성 확인

**Expected Results** (390x844):
- ✅ 배너 패딩: 12px (좌우), 12px (상하)
- ✅ 아이콘: 20px (xl)
- ✅ 제목: `text-responsive-lg` (18-20px)
- ✅ 컨텐츠 패딩: 16px
- ✅ 해설 텍스트: 읽기 쉬움

**Screenshot Points**:
- 정답 배너 (녹색)
- 오답 배너 (빨간색)
- 해설 섹션

---

### 5. 신뢰도 바 (CompactMetricsBar)

**Steps**:
1. 게임 화면 상단 메트릭 바 확인
2. 신뢰도 표시 확인
3. 다른 메트릭과 일관성 확인

**Expected Results** (390x844):
- ✅ 신뢰도 형식: `⭐ 75` (아이콘 + 숫자)
- ✅ 프로그레스 바: 없음 (제거됨)
- ✅ 배경: `bg-purple-50`
- ✅ 모양: `rounded-full`
- ✅ 최소 높이: 44px (터치 타겟)
- ✅ 너비: 60-70px (컴팩트)
- ✅ 패턴 일관성:
  - ⚡ 15/25 (Turn)
  - 👥 1,234/5,000 (Users)
  - 💰 50M (Cash)
  - ⭐ 75 (Trust)

**Screenshot Points**:
- 전체 메트릭 바 (4개 메트릭)
- 신뢰도 단독 뷰
- 스크롤 동작 (snap-start)

---

### 6. 제출/확인 버튼

**Steps**:
1. 퀴즈 화면에서 "제출하기" 버튼 확인
2. 결과 화면에서 "확인" 버튼 확인
3. 터치 타겟 크기 확인

**Expected Results** (390x844):
- ✅ 패딩: 16px (좌우), 14px (상하)
- ✅ 최소 높이: 44px
- ✅ 배경: `bg-blue-600` (활성), `bg-gray-200` (비활성)
- ✅ 호버: `hover:bg-blue-700`
- ✅ 그림자: `shadow-lg`

**Expected Results** (480px+):
- ✅ 패딩: 24px (좌우, sm)
- ✅ 패딩: 32px (좌우, md)

**Screenshot Points**:
- 버튼 활성 상태
- 버튼 비활성 상태 (선택 안 함)
- 버튼 hover 상태

---

## Regression Test (Desktop)

### 1920x1080 해상도

**Steps**:
1. 데스크탑 해상도로 변경
2. 퀴즈 UI 확인

**Expected Results**:
- ✅ 모달 너비: `max-w-2xl` (672px)
- ✅ OX 버튼: 가로 2열
- ✅ 패딩: 원래 크기 (px-6, px-8)
- ✅ 텍스트: 원래 크기 (text-xl, text-2xl)
- ✅ 신뢰도 바: ⭐ 75 (동일, 간단한 표시 유지)

---

## Cross-Browser Test

### Safari iOS (실제 디바이스)

**Devices**:
- iPhone 12 Mini (390x844)
- iPhone SE 3rd gen (390x844)

**Test Points**:
- [ ] 모달 렌더링
- [ ] 터치 이벤트
- [ ] 스크롤 동작
- [ ] 애니메이션 (Framer Motion)
- [ ] 폰트 렌더링

### Chrome Mobile

**Test Points**:
- [ ] 동일한 레이아웃
- [ ] DevTools와 일치
- [ ] 터치 타겟 크기

---

## Performance Test

### Lighthouse Mobile

**Target Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+

**Steps**:
1. Chrome DevTools → Lighthouse
2. Device: Mobile
3. Categories: All
4. Analyze page load

**Key Metrics**:
- First Contentful Paint (FCP): <1.8s
- Largest Contentful Paint (LCP): <2.5s
- Cumulative Layout Shift (CLS): <0.1
- Touch Target Size: All ≥44px

---

## Accessibility Test

### WCAG 2.5.5 Touch Target Size

**Requirement**: 44×44 CSS pixels (Level AA)

**Check Points**:
- [ ] Close 버튼: ≥44px
- [ ] 제출/확인 버튼: ≥44px
- [ ] OX 버튼: ≥44px
- [ ] 객관식 옵션: ≥44px
- [ ] 신뢰도 바: ≥44px

### Keyboard Navigation

**Steps**:
1. Tab 키로 포커스 이동
2. Enter/Space로 버튼 클릭
3. ESC로 모달 닫기

**Expected**:
- [ ] 포커스 순서: 논리적
- [ ] 포커스 표시: 명확
- [ ] 키보드 전용 동작: 가능

---

## Bug Report Template

```markdown
## Bug Report

**Environment**:
- Device: [iPhone 12 Mini / Chrome DevTools]
- Resolution: 390x844
- OS: iOS 17.2 / macOS 14.2
- Browser: Safari 17.2 / Chrome 120

**Issue**:
[간단한 설명]

**Steps to Reproduce**:
1. [단계 1]
2. [단계 2]
3. [단계 3]

**Expected**:
[예상 동작]

**Actual**:
[실제 동작]

**Screenshot**:
[스크린샷 첨부]

**Console Errors**:
[콘솔 에러 로그]
```

---

## Sign-Off Checklist

### 390x844 (Mobile)
- [ ] QuizPopup 모달 fit
- [ ] OX 1열 스택
- [ ] 객관식 가독성
- [ ] 결과 화면 정상
- [ ] 신뢰도 바 간단 표시
- [ ] 터치 타겟 44px+

### 480px+ (Tablet)
- [ ] OX 2열 그리드
- [ ] 패딩 증가
- [ ] 텍스트 크기 증가

### 768px+ (Desktop)
- [ ] 모달 max-w-2xl
- [ ] 원래 디자인 복원
- [ ] 회귀 없음

### Accessibility
- [ ] WCAG 2.5.5 준수
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 호환

### Performance
- [ ] Lighthouse 90+
- [ ] FCP <1.8s
- [ ] CLS <0.1

---

**Tester**: ________________
**Date**: ________________
**Result**: PASS / FAIL
**Notes**: ________________
