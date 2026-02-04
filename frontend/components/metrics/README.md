# TrustGauge Component

**EPIC-04 Feature 4: 신뢰도 시각화 개선**

## 개요

TrustGauge는 플레이어의 신뢰도를 시각적으로 표시하는 게이지 컴포넌트입니다. 신뢰도 구간별 색상 구분, 투자 유치 임계값 마커, 위기 상황 애니메이션을 제공하여 플레이어가 현재 상황을 명확하게 파악할 수 있도록 합니다.

## 주요 기능

### 1. 5단계 색상 구간
- **안정적 신뢰 (70-100%)**: 녹색 - 투자 유치와 성장에 유리한 상태
- **보통 (50-69%)**: 파란색 - 안정적이지만 개선 필요
- **주의 필요 (30-49%)**: 노란색 - 투자 유치 실패 가능성
- **위기 경고 (15-29%)**: 주황색 - 즉시 개선 필요
- **즉시 대응 필요 (0-14%)**: 빨간색 + Pulse 애니메이션 - 게임 오버 위험

### 2. 난이도별 투자 임계값 마커

각 난이도에 맞는 투자 임계값이 게이지에 표시됩니다:

| 난이도 | Series C | Series B | Series A | 게임오버 |
|--------|----------|----------|----------|----------|
| 학습   | 55%      | 35%      | 20%      | 5%       |
| 도전   | 65%      | 45%      | 25%      | 10%      |
| 전문가 | 75%      | 55%      | 35%      | 15%      |

### 3. 반응형 레이아웃
- **세로 (vertical)**: Desktop 환경 - 왼쪽 메트릭 패널용
- **가로 (horizontal)**: Mobile 환경 - 상단 컴팩트 바용

### 4. 애니메이션 효과
- 값 변경 시 부드러운 transition (500ms)
- 위기 상황 (15% 미만) Pulse 애니메이션
- Shimmer 효과로 게이지 강조

## 사용법

### 기본 사용

```tsx
import TrustGauge from '@/components/metrics/TrustGauge';

<TrustGauge
  trust={gameState.trust}
  difficultyMode="NORMAL"
  vertical={true}
/>
```

### Props

```typescript
interface TrustGaugeProps {
  trust: number;              // 신뢰도 값 (0-100)
  difficultyMode?: DifficultyMode;  // 'EASY' | 'NORMAL' | 'HARD' (기본: 'NORMAL')
  className?: string;         // 추가 CSS 클래스
  vertical?: boolean;         // 세로 레이아웃 여부 (기본: false)
}
```

### MetricsPanel 통합 (세로 레이아웃)

```tsx
import TrustGauge from '@/components/metrics/TrustGauge';

<div className="bg-white p-5 rounded-xl shadow-lg">
  <TrustGauge
    trust={gameState.trust}
    difficultyMode={gameState.difficultyMode}
    vertical={true}
  />
</div>
```

### CompactMetricsBar 통합 (가로 레이아웃)

```tsx
import TrustGauge from '@/components/metrics/TrustGauge';

<div className="min-w-[200px] px-3 py-2 bg-purple-50 rounded-lg">
  <TrustGauge
    trust={gameState.trust}
    difficultyMode={gameState.difficultyMode}
    vertical={false}
  />
</div>
```

## 통합 위치

### 1. MetricsPanel.tsx
**위치**: `/home/cto-game/frontend/components/MetricsPanel.tsx`

신뢰도 섹션에 세로 레이아웃으로 통합되었습니다.

```tsx
{/* 신뢰도 - Enhanced Gauge */}
<div className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg lg:rounded-xl shadow-md lg:shadow-lg border border-slate-200">
  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
    <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
      <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className="flex-1">
      <div className="text-xs sm:text-sm text-slate-600 font-medium">신뢰도 상세</div>
      <div className="text-xs text-slate-500">목표: {goals.trust}%</div>
    </div>
  </div>
  <TrustGauge
    trust={gameState.trust}
    difficultyMode={mode}
    vertical={true}
  />
  <div className="text-right text-xs text-slate-500 font-medium mt-2">
    목표 달성률: {trustProgress.toFixed(1)}%
  </div>
</div>
```

### 2. CompactMetricsBar.tsx
**위치**: `/home/cto-game/frontend/components/CompactMetricsBar.tsx`

신뢰도 아이템에 가로 레이아웃으로 통합되었습니다.

```tsx
{/* 신뢰도 - Enhanced with Gauge */}
<Tooltip content="서비스 신뢰도 (투자 유치와 게임 성공에 중요)" position="bottom">
  <div className="min-w-[200px] px-3 py-2 bg-purple-50 rounded-lg shrink-0 snap-start">
    <TrustGauge
      trust={gameState.trust}
      difficultyMode={gameState.difficultyMode}
      vertical={false}
    />
  </div>
</Tooltip>
```

## 테스트 페이지

인터랙티브 테스트 페이지가 제공됩니다:

**URL**: `http://localhost:3001/test/trust-gauge`

**기능**:
- 신뢰도 값 슬라이더 조절
- 난이도 모드 전환
- 세로/가로 레이아웃 전환
- 빠른 테스트 버튼 (안정, Series C/B/A, 위험, 게임오버)
- 모든 구간 비교 뷰
- 난이도별 임계값 테이블

## 기술 스택

- **React**: Client component ('use client')
- **TypeScript**: 완전한 타입 정의
- **TailwindCSS**: 유틸리티 스타일링
- **CSS Animations**: transition, pulse, shimmer

## 성능 최적화

1. **useMemo 훅**: 신뢰도 구간과 임계값 계산 메모이제이션
2. **CSS Transitions**: GPU 가속 애니메이션
3. **조건부 렌더링**: Pulse 애니메이션은 위기 상황에만 활성화

## 접근성 (Accessibility)

- 색상뿐만 아니라 텍스트 메시지로도 상태 전달
- 명확한 라벨과 값 표시
- 충분한 색상 대비 (WCAG AA 준수)
- 임계값 마커로 구간 명확히 구분

## 디자인 시스템 일관성

기존 MetricsPanel과 일관된 디자인 적용:
- Gradient 색상 스키마
- Rounded corners (lg, xl)
- Shadow 계층 (md, lg)
- 반응형 크기 (sm, lg 브레이크포인트)

## 향후 개선 사항

1. **애니메이션 커스터마이징**: 애니메이션 속도와 타입 조절 가능
2. **추가 마커**: 사용자 정의 임계값 추가 가능
3. **상태 설명 툴팁**: 각 구간에 대한 자세한 설명
4. **역사적 추이**: 이전 턴 대비 변화량 표시
5. **사운드 효과**: 위기 상황 경고음 (선택적)

## 관련 파일

- **컴포넌트**: `/home/cto-game/frontend/components/metrics/TrustGauge.tsx`
- **타입**: `/home/cto-game/frontend/lib/types.ts`
- **상수**: `/home/cto-game/frontend/lib/game-constants.ts`
- **백엔드 상수**: `/home/cto-game/backend/src/game/game-constants.ts`
- **테스트 페이지**: `/home/cto-game/frontend/app/test/trust-gauge/page.tsx`
- **통합 1**: `/home/cto-game/frontend/components/MetricsPanel.tsx`
- **통합 2**: `/home/cto-game/frontend/components/CompactMetricsBar.tsx`

## 라이센스

이 컴포넌트는 AWS 스타트업 타이쿤 프로젝트의 일부입니다.
