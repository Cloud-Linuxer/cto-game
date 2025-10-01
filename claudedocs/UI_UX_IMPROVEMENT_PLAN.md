# AWS 스타트업 타이쿤 UI/UX 개선 계획서

**작성일**: 2025-10-01
**버전**: 1.0
**프로젝트**: AWS CTO Game Frontend Redesign

---

## 목차
1. [현재 문제점 분석](#1-현재-문제점-분석)
2. [개선 목표](#2-개선-목표)
3. [반응형 디자인 전략](#3-반응형-디자인-전략)
4. [컴포넌트별 개선 계획](#4-컴포넌트별-개선-계획)
5. [구현 우선순위](#5-구현-우선순위)
6. [기대 효과](#6-기대-효과)

---

## 1. 현재 문제점 분석

### 1.1 레이아웃 문제
**현재 구조** (`app/game/[gameId]/page.tsx:228`)
```tsx
<div className="flex-1 grid grid-cols-[320px_1fr_320px] gap-0 overflow-hidden">
```

**문제점**:
- ❌ 고정 폭 레이아웃 (320px-1fr-320px)으로 모바일/태블릿에서 완전히 깨짐
- ❌ 최소 화면 너비 약 960px 필요 (320+320+최소 320)
- ❌ 세로 스크롤이 중앙 패널에만 있어 전체 게임 상태 파악 어려움
- ❌ 사이드 패널이 고정되어 작은 화면에서 콘텐츠가 가려짐

### 1.2 폰트 크기 문제
**메트릭 패널** (`components/MetricsPanel.tsx`)
- 제목: `text-3xl` (30px) - 모바일에서 너무 큼
- 숫자: `text-2xl` (24px), `text-3xl` (30px) - 과도하게 큼
- 작은 텍스트: `text-sm` (14px), `text-xs` (12px)

**선택 카드** (`components/ChoiceCard.tsx`)
- 타이틀: `text-xl` (20px) - 모바일에서 큼
- 설명: `text-sm` (14px)
- 패딩: `p-6` (24px) - 모바일에서 공간 낭비

### 1.3 정보 과부하
- 선택지마다 긴 텍스트 설명 (평균 3-5줄)
- 모든 효과를 한 번에 표시 (유저, 자금, 신뢰도, 인프라)
- 카테고리 구분 없음
- 이전 선택 기록 없음

### 1.4 접근성 문제
- 툴팁 없음 (아이콘 의미 불명확)
- 키보드 네비게이션 미지원
- 색상 의존적 정보 전달 (색맹 사용자 문제)
- 터치 타겟이 작음 (최소 44x44px 권장)

---

## 2. 개선 목표

### 2.1 핵심 목표
1. **모바일 우선 반응형 디자인**: 320px부터 모든 해상도 지원
2. **정보 계층 구조 개선**: 중요한 정보 우선 표시
3. **가독성 향상**: 적절한 폰트 크기와 간격
4. **몰입도 강화**: 불필요한 UI 요소 제거
5. **접근성 확보**: WCAG 2.1 AA 준수

### 2.2 타겟 디바이스
| 디바이스 | 화면 너비 | 레이아웃 |
|---------|---------|---------|
| 모바일 (소형) | 320px - 479px | 단일 컬럼, 스택형 |
| 모바일 (대형) | 480px - 767px | 단일 컬럼, 스택형 |
| 태블릿 | 768px - 1023px | 2컬럼 또는 탭 |
| 데스크탑 | 1024px - 1439px | 3컬럼 (축소) |
| 대형 데스크탑 | 1440px+ | 3컬럼 (현재) |

---

## 3. 반응형 디자인 전략

### 3.1 Breakpoint 정의
```typescript
// tailwind.config.ts 확장
theme: {
  extend: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
}
```

### 3.2 타이포그래피 스케일
```typescript
// Fluid typography using clamp()
fontSize: {
  // 모바일 → 데스크탑
  'responsive-xs': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',    // 12-14px
  'responsive-sm': 'clamp(0.875rem, 0.8rem + 0.4vw, 1rem)',         // 14-16px
  'responsive-base': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',       // 16-18px
  'responsive-lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',      // 18-20px
  'responsive-xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',       // 20-24px
  'responsive-2xl': 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',            // 24-32px
  'responsive-3xl': 'clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem)',    // 30-40px
}
```

### 3.3 레이아웃 변경 전략

#### 3.3.1 모바일 (< 768px)
- **수직 스택 레이아웃**
- 상단: 축약된 메트릭 바 (가로 스크롤)
- 중앙: 스토리 + 선택지
- 하단: 접을 수 있는 인프라 패널

#### 3.3.2 태블릿 (768px - 1023px)
- **탭 기반 네비게이션**
- 탭 1: 메트릭 + 선택지
- 탭 2: 인프라 상세
- 또는 2컬럼: 메트릭 + 메인 콘텐츠

#### 3.3.3 데스크탑 (1024px+)
- **3컬럼 레이아웃** (현재 유지, 크기 조정)
- 최소 너비: `minmax(240px, 280px)` - `1fr` - `minmax(240px, 280px)`

---

## 4. 컴포넌트별 개선 계획

### 4.1 게임 보드 레이아웃 (`app/game/[gameId]/page.tsx`)

#### 현재 코드 (228번째 줄)
```tsx
<div className="flex-1 grid grid-cols-[320px_1fr_320px] gap-0 overflow-hidden">
```

#### 개선안
```tsx
<div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(240px,280px)_1fr_minmax(240px,280px)] gap-0 overflow-hidden">
  {/* 모바일: 상단 메트릭 바 */}
  <div className="lg:hidden sticky top-0 z-10 bg-white shadow-md">
    <CompactMetricsBar gameState={gameState} />
  </div>

  {/* 데스크탑: 좌측 메트릭 패널 */}
  <div className="hidden lg:block">
    <MetricsPanel gameState={gameState} />
  </div>

  {/* 중앙: 스토리 패널 */}
  <StoryPanel
    turn={currentTurn}
    onSelectChoice={handleChoiceSelect}
    disabled={executing}
  />

  {/* 우측: 인프라 패널 - 모바일에서는 하단 */}
  <div className="lg:block">
    <InfraList infrastructure={gameState.infrastructure} />
  </div>
</div>
```

### 4.2 메트릭 패널 (`components/MetricsPanel.tsx`)

#### 4.2.1 반응형 폰트 크기
```tsx
// Before
<h2 className="text-3xl font-bold ...">메트릭</h2>
<div className="text-2xl font-bold text-emerald-600">{formatNumber(gameState.users)}</div>

// After
<h2 className="text-responsive-2xl lg:text-responsive-3xl font-bold ...">메트릭</h2>
<div className="text-responsive-lg lg:text-responsive-2xl font-bold text-emerald-600">
  {formatNumber(gameState.users)}
</div>
```

#### 4.2.2 반응형 패딩/마진
```tsx
// Before
<div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200">

// After
<div className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg lg:rounded-xl shadow-md lg:shadow-lg border border-slate-200">
```

#### 4.2.3 프로그레스바 강화
```tsx
// Before
<div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">

// After
<div className="w-full bg-slate-200 rounded-full h-3 sm:h-4 overflow-hidden shadow-inner">
  <div
    className="h-full rounded-full transition-all duration-500 shadow-sm"
    style={{
      width: `${userProgress}%`,
      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
    }}
  >
    {/* 애니메이션 효과 */}
    <div className="h-full w-full animate-pulse opacity-30 bg-white"></div>
  </div>
</div>
```

### 4.3 축약 메트릭 바 (신규 컴포넌트)

#### `components/CompactMetricsBar.tsx`
```tsx
'use client';

import type { GameState } from '@/lib/types';

interface CompactMetricsBarProps {
  gameState: GameState;
}

export default function CompactMetricsBar({ gameState }: CompactMetricsBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
      {/* 턴 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full whitespace-nowrap">
        <span className="text-sm">⚡</span>
        <span className="text-sm font-semibold">{gameState.currentTurn}/25</span>
      </div>

      {/* 유저 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full whitespace-nowrap">
        <span className="text-sm">👥</span>
        <span className="text-sm font-semibold">{gameState.users.toLocaleString()}</span>
      </div>

      {/* 자금 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full whitespace-nowrap">
        <span className="text-sm">💰</span>
        <span className="text-sm font-semibold">
          {new Intl.NumberFormat('ko-KR', {
            notation: 'compact',
            compactDisplay: 'short'
          }).format(gameState.cash)}
        </span>
      </div>

      {/* 신뢰도 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full whitespace-nowrap">
        <span className="text-sm">❤️</span>
        <span className="text-sm font-semibold">{gameState.trust}%</span>
      </div>
    </div>
  );
}
```

### 4.4 선택 카드 (`components/ChoiceCard.tsx`)

#### 4.4.1 반응형 크기
```tsx
// Before
<button className="... p-6 rounded-2xl ...">

// After
<button className="... p-4 sm:p-5 lg:p-6 rounded-xl lg:rounded-2xl ...">
```

#### 4.4.2 축약/전체 토글
```tsx
export default function ChoiceCard({ choice, onSelect, disabled }: ChoiceCardProps) {
  const [expanded, setExpanded] = useState(false);

  // 제목과 설명 분리
  const lines = choice.text.split('\n');
  const title = lines[0];
  const description = lines.slice(1).join('\n');

  return (
    <button
      onClick={() => onSelect(choice.choiceId)}
      disabled={disabled}
      className="group relative w-full text-left p-4 sm:p-5 lg:p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-xl transition-all duration-200"
    >
      {/* 타이틀 */}
      <div className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 mb-3">
        {title}
      </div>

      {/* 효과 요약 - 항상 표시 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {choice.effects.users !== 0 && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold ${
            choice.effects.users > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            👥 {choice.effects.users > 0 ? '+' : ''}{choice.effects.users.toLocaleString()}
          </span>
        )}
        {choice.effects.cash !== 0 && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold ${
            choice.effects.cash > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            💰 {choice.effects.cash > 0 ? '+' : ''}{(choice.effects.cash / 10000).toFixed(0)}만
          </span>
        )}
        {choice.effects.trust !== 0 && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold ${
            choice.effects.trust > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            📈 {choice.effects.trust > 0 ? '+' : ''}{choice.effects.trust}%
          </span>
        )}
      </div>

      {/* 상세 설명 - 접을 수 있음 (모바일) */}
      {description && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="lg:hidden text-xs text-indigo-600 font-medium mb-2"
          >
            {expanded ? '간략히 보기 ▲' : '자세히 보기 ▼'}
          </button>

          <div className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${
            expanded ? 'block' : 'hidden lg:block'
          }`}>
            {description}
          </div>
        </>
      )}
    </button>
  );
}
```

### 4.5 인프라 패널 - 접을 수 있는 버전

#### `components/InfraList.tsx` (모바일용 개선)
```tsx
'use client';

import { useState } from 'react';

interface InfraListProps {
  infrastructure: string[];
}

export default function InfraList({ infrastructure }: InfraListProps) {
  const [collapsed, setCollapsed] = useState(true);

  // 필수 인프라 목록
  const requiredInfra = ['Aurora Global DB', 'EKS', 'CloudFront'];

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200">
      {/* 모바일: 접을 수 있는 헤더 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden w-full flex items-center justify-between p-4 bg-white border-b border-slate-200"
      >
        <h2 className="text-lg font-bold text-slate-800">인프라</h2>
        <span className="text-slate-500">
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* 데스크탑: 일반 헤더 */}
      <div className="hidden lg:block p-6">
        <h2 className="text-2xl font-bold text-slate-800">인프라</h2>
      </div>

      {/* 인프라 목록 */}
      <div className={`p-4 lg:p-6 space-y-3 ${collapsed ? 'hidden lg:block' : 'block'}`}>
        {requiredInfra.map((item) => {
          const isActive = infrastructure.includes(item);
          return (
            <div
              key={item}
              className={`p-3 rounded-lg border-2 transition-all ${
                isActive
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-slate-200 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{isActive ? '✅' : '⭕'}</span>
                <span className={`text-sm font-medium ${
                  isActive ? 'text-indigo-700' : 'text-slate-500'
                }`}>
                  {item}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 5. 구현 우선순위

### Phase 1: 긴급 (1-2일) - 모바일 기본 대응 ✅ **완료**
- [x] **P0**: Tailwind 브레이크포인트 설정
- [x] **P0**: 메인 레이아웃 반응형 변경 (flex-col → lg:grid)
- [x] **P0**: CompactMetricsBar 컴포넌트 생성
- [x] **P0**: 폰트 크기 반응형 조정 (clamp 또는 breakpoint)
- [x] **P0**: 패딩/마진 반응형 조정
- [x] **P0**: 텍스트 줄바꿈 문제 해결 (break-words 추가)
- [x] **P0**: CORS 설정 수정 (백엔드)

**완료 일자**: 2025-10-01

**검증 완료**:
```bash
# Chrome DevTools + Playwright 브라우저 테스트
✅ iPhone SE (375x667) - CompactMetricsBar 작동, 텍스트 줄바꿈 정상
✅ iPhone 12 Pro (390x844) - 전체 UI 반응형 정상
✅ iPad Air (820x1180) - 레이아웃 전환 정상
✅ Desktop (1920x1080) - 3컬럼 레이아웃 유지
```

### Phase 2: 중요 (3-5일) - UX 개선 ✅ **완료**
- [x] **P1**: 인프라 패널 접기/펴기 기능 (모바일) - `InfraList.tsx` 수정 완료
- [x] **P1**: 프로그레스바 시각화 강화 - `MetricsPanel.tsx`에 shimmer 애니메이션 추가, `tailwind.config.ts`에 keyframes 정의
- [x] **P1**: 터치 타겟 크기 조정 (최소 44x44px) - `CompactMetricsBar.tsx`, `ChoiceCard.tsx`, `InfraList.tsx`에 최소 높이 설정
- [x] **P1**: 가로 스크롤 개선 (snap-scroll) - `CompactMetricsBar.tsx`에 snap-scroll 적용
- [x] **P1**: 로딩 상태 개선 (스켈레톤 UI) - `GameSkeleton.tsx` 컴포넌트 생성 및 게임 페이지에 적용
- [ ] **P1**: 선택 카드 축약/전체 토글 기능 (보류 - 현재 구조에서 불필요)

**완료 일자**: 2025-10-01

**구현 내역**:
1. **프로그레스바 시각화**: 모든 진행률 바에 shimmer 애니메이션 추가 (2초 간격 무한 반복)
2. **터치 타겟**: CompactMetricsBar 44px, ChoiceCard 88px, InfraList 버튼 56px 최소 높이
3. **가로 스크롤**: snap-x snap-mandatory, snap-start로 부드러운 스크롤 경험
4. **스켈레톤 UI**: 3패널 레이아웃 전체를 반영한 로딩 스켈레톤 (animate-pulse 효과)

### Phase 3: 필수 (1주) - 정보 구조 개선 ✅ **완료**
- [x] **P2**: 선택지 카테고리 필터 (마케팅, 인프라, 재무) - `StoryPanel.tsx`에 카테고리 필터 버튼 추가
- [x] **P2**: 게임 로그 패널 추가 - `GameLog.tsx` 컴포넌트 생성, 4패널 레이아웃으로 통합
- [x] **P2**: 툴팁 시스템 추가 - `Tooltip.tsx` 컴포넌트 생성, `CompactMetricsBar`에 적용
- [x] **P2**: 키보드 네비게이션 지원 - `ChoiceCard`에 Enter/Space 키 지원, focus 스타일 추가
- [ ] **P2**: 턴별 통계 그래프 (보류 - 현재 구조에서 복잡도 대비 효과 낮음)

**완료 일자**: 2025-10-01

**구현 내역**:
1. **카테고리 필터**: 전체/마케팅/인프라/재무 필터 버튼, 각 카테고리별 선택지 개수 표시
2. **게임 로그**: 턴별 선택 기록, 효과 요약, 타임스탬프, 4컬럼 레이아웃 (메트릭-스토리-인프라-로그)
3. **툴팁 시스템**: 재사용 가능한 Tooltip 컴포넌트, 메트릭 아이콘에 설명 추가
4. **키보드 네비게이션**: Tab으로 선택지 이동, Enter/Space로 선택, focus 링 표시

### Phase 4: 향상 (1-2주) - 게이미피케이션
- [ ] **P3**: 업적 시스템
- [ ] **P3**: 레벨/배지 시스템
- [ ] **P3**: 결과 애니메이션
- [ ] **P3**: 튜토리얼 모드
- [ ] **P3**: 다크 모드 지원

---

## 6. 기대 효과

### 6.1 정량적 효과
| 지표 | 현재 | 목표 | 개선율 |
|-----|------|------|--------|
| 모바일 사용 가능성 | 0% | 100% | +100% |
| 첫 화면 로딩 시간 | ~2s | ~1.5s | -25% |
| 터치 타겟 크기 | ~30px | 44px+ | +46% |
| 폰트 가독성 (모바일) | 2/5 | 4.5/5 | +125% |

### 6.2 정성적 효과
- ✅ 모든 디바이스에서 플레이 가능
- ✅ 전략적 의사결정 시간 단축 (정보 구조 개선)
- ✅ 초보자 진입 장벽 감소 (튜토리얼, 툴팁)
- ✅ 재방문율 증가 (게이미피케이션)
- ✅ WCAG 2.1 AA 접근성 준수

---

## 7. 추가 고려사항

### 7.1 성능 최적화
```typescript
// Image optimization
import Image from 'next/image';

// Code splitting
const GameLog = dynamic(() => import('@/components/GameLog'), {
  loading: () => <p>로딩 중...</p>,
  ssr: false,
});

// Memoization
const MetricsPanel = memo(function MetricsPanel({ gameState }: Props) {
  // ...
});
```

### 7.2 접근성 체크리스트
- [ ] 모든 아이콘에 `aria-label` 추가
- [ ] 키보드로 모든 기능 접근 가능
- [ ] 포커스 표시 명확히 (outline)
- [ ] 색상 대비 4.5:1 이상
- [ ] 스크린 리더 테스트 (NVDA/JAWS)

### 7.3 테스트 전략
```bash
# 반응형 테스트
npm run test:responsive

# 접근성 테스트
npm run test:a11y

# 성능 테스트
npm run build && npm run analyze
```

---

## 부록 A: 전체 Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      fontSize: {
        'responsive-xs': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
        'responsive-sm': 'clamp(0.875rem, 0.8rem + 0.4vw, 1rem)',
        'responsive-base': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
        'responsive-lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
        'responsive-xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        'responsive-2xl': 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',
        'responsive-3xl': 'clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem)',
      },
      spacing: {
        'responsive-xs': 'clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem)',
        'responsive-sm': 'clamp(0.75rem, 0.6rem + 0.75vw, 1rem)',
        'responsive-md': 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
        'responsive-lg': 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwind-scrollbar-hide'),
  ],
};

export default config;
```

---

**문서 종료**