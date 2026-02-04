'use client';

import { useMemo } from 'react';
import type { DifficultyMode } from '@/lib/types';

interface TrustGaugeProps {
  trust: number;
  difficultyMode?: DifficultyMode;
  className?: string;
  vertical?: boolean; // 세로 방향 레이아웃 (기본: 가로)
}

interface TrustThreshold {
  position: number;
  label: string;
  danger?: boolean;
}

interface TrustLevel {
  min: number;
  color: string;
  bgColor: string;
  statusMessage: string;
  pulse?: boolean;
}

// 난이도별 투자 임계값
const INVESTMENT_THRESHOLDS: Record<DifficultyMode, {
  seriesC: number;
  seriesB: number;
  seriesA: number;
  gameOver: number;
}> = {
  EASY: {
    seriesC: 55,
    seriesB: 35,
    seriesA: 20,
    gameOver: 5,
  },
  NORMAL: {
    seriesC: 65,
    seriesB: 45,
    seriesA: 25,
    gameOver: 10,
  },
  HARD: {
    seriesC: 75,
    seriesB: 55,
    seriesA: 35,
    gameOver: 15,
  },
};

// 신뢰도 구간 정의 (5단계)
const TRUST_LEVELS: TrustLevel[] = [
  {
    min: 70,
    color: 'text-green-600',
    bgColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
    statusMessage: '안정적 신뢰',
  },
  {
    min: 50,
    color: 'text-blue-600',
    bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    statusMessage: '보통',
  },
  {
    min: 30,
    color: 'text-yellow-600',
    bgColor: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    statusMessage: '주의 필요',
  },
  {
    min: 15,
    color: 'text-orange-600',
    bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
    statusMessage: '위기 경고',
  },
  {
    min: 0,
    color: 'text-red-600',
    bgColor: 'bg-gradient-to-r from-red-600 to-rose-600',
    statusMessage: '즉시 대응 필요!',
    pulse: true,
  },
];

export default function TrustGauge({
  trust,
  difficultyMode = 'NORMAL',
  className = '',
  vertical = false,
}: TrustGaugeProps) {
  // 현재 신뢰도 구간 계산
  const currentLevel = useMemo(() => {
    return TRUST_LEVELS.find((level) => trust >= level.min) || TRUST_LEVELS[TRUST_LEVELS.length - 1];
  }, [trust]);

  // 임계값 마커 계산
  const thresholds = useMemo((): TrustThreshold[] => {
    const config = INVESTMENT_THRESHOLDS[difficultyMode];
    return [
      { position: config.seriesC, label: 'Series C' },
      { position: config.seriesB, label: 'Series B' },
      { position: config.seriesA, label: 'Series A' },
      { position: config.gameOver, label: '위험', danger: true },
    ];
  }, [difficultyMode]);

  // 신뢰도 값을 0-100 범위로 클램프
  const clampedTrust = Math.max(0, Math.min(100, trust));

  if (vertical) {
    // 세로 방향 레이아웃 (Desktop - 왼쪽 패널)
    return (
      <div className={`trust-gauge-vertical ${className}`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs sm:text-sm text-slate-600 font-medium">신뢰도</span>
          <span className={`text-xl lg:text-2xl font-bold ${currentLevel.color}`}>
            {clampedTrust}%
          </span>
        </div>

        {/* 세로 게이지 바 */}
        <div className="relative h-48 lg:h-56 bg-slate-200 rounded-lg overflow-hidden shadow-inner">
          {/* 게이지 채우기 (아래에서 위로) */}
          <div
            className={`absolute bottom-0 left-0 right-0 ${currentLevel.bgColor} transition-all duration-500 relative overflow-hidden shadow-sm ${
              currentLevel.pulse ? 'animate-pulse' : ''
            }`}
            style={{ height: `${clampedTrust}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white to-transparent opacity-20 animate-shimmer"></div>
          </div>

          {/* 임계값 마커들 */}
          {thresholds.map((threshold, idx) => (
            <div
              key={idx}
              className="absolute left-0 right-0 flex items-center"
              style={{ bottom: `${threshold.position}%` }}
            >
              {/* 마커 라인 */}
              <div
                className={`flex-1 border-t-2 ${
                  threshold.danger ? 'border-red-500 border-dashed' : 'border-slate-400 border-dotted'
                }`}
              ></div>
              {/* 라벨 */}
              <div
                className={`absolute right-full mr-2 text-xs font-semibold whitespace-nowrap ${
                  threshold.danger ? 'text-red-600' : 'text-slate-600'
                }`}
              >
                {threshold.label}
              </div>
            </div>
          ))}
        </div>

        {/* 상태 메시지 */}
        <div className={`text-center text-xs sm:text-sm font-semibold mt-3 ${currentLevel.color}`}>
          {currentLevel.statusMessage}
        </div>
      </div>
    );
  }

  // 가로 방향 레이아웃 (Mobile - 상단)
  return (
    <div className={`trust-gauge-horizontal ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-600 font-medium">신뢰도</span>
        <span className={`text-lg font-bold ${currentLevel.color}`}>{clampedTrust}%</span>
      </div>

      {/* 가로 게이지 바 */}
      <div className="relative h-8 bg-slate-200 rounded-lg overflow-hidden shadow-inner">
        {/* 게이지 채우기 (왼쪽에서 오른쪽으로) */}
        <div
          className={`absolute left-0 top-0 bottom-0 ${currentLevel.bgColor} transition-all duration-500 relative overflow-hidden shadow-sm ${
            currentLevel.pulse ? 'animate-pulse' : ''
          }`}
          style={{ width: `${clampedTrust}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></div>
        </div>

        {/* 임계값 마커들 */}
        {thresholds.map((threshold, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 flex items-center"
            style={{ left: `${threshold.position}%` }}
          >
            {/* 마커 라인 */}
            <div
              className={`w-0.5 h-full ${
                threshold.danger ? 'bg-red-500' : 'bg-slate-400'
              }`}
            ></div>
            {/* 라벨 (위쪽에 표시) */}
            <div
              className={`absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 text-xs font-semibold whitespace-nowrap ${
                threshold.danger ? 'text-red-600' : 'text-slate-600'
              }`}
              style={{ fontSize: '0.625rem' }}
            >
              {threshold.label}
            </div>
          </div>
        ))}
      </div>

      {/* 상태 메시지 */}
      <div className={`text-right text-xs font-semibold mt-1 ${currentLevel.color}`}>
        {currentLevel.statusMessage}
      </div>
    </div>
  );
}
