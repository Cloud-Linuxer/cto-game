'use client';

import type { GameState } from '@/lib/types';
import Tooltip from './Tooltip';
import TrustGauge from './metrics/TrustGauge';

interface CompactMetricsBarProps {
  gameState: GameState;
}

export default function CompactMetricsBar({ gameState }: CompactMetricsBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory bg-white border-b border-slate-200">
      {/* 턴 */}
      <Tooltip content="현재 진행 턴 / 총 25턴" position="bottom">
        <div className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-blue-50 rounded-full whitespace-nowrap shrink-0 snap-start">
          <span className="text-sm">⚡</span>
          <span className="text-sm font-semibold text-blue-700">{gameState.currentTurn}/25</span>
        </div>
      </Tooltip>

      {/* 유저 */}
      <Tooltip content={`현재 유저: ${gameState.users.toLocaleString()}명 (수용 가능: ${gameState.maxUserCapacity?.toLocaleString() || 'N/A'}명, 목표: 100,000명)`} position="bottom">
        <div className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-emerald-50 rounded-full whitespace-nowrap shrink-0 snap-start">
          <span className="text-sm">👥</span>
          <span className="text-sm font-semibold text-emerald-700">{gameState.users.toLocaleString()}</span>
          {gameState.maxUserCapacity && (
            <span className="text-xs text-emerald-600">/{gameState.maxUserCapacity.toLocaleString()}</span>
          )}
        </div>
      </Tooltip>

      {/* 자금 */}
      <Tooltip content={`보유 자금: ${gameState.cash.toLocaleString()}원 (목표: 3억원)`} position="bottom">
        <div className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-amber-50 rounded-full whitespace-nowrap shrink-0 snap-start">
          <span className="text-sm">💰</span>
          <span className="text-sm font-semibold text-amber-700">
            {new Intl.NumberFormat('ko-KR', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(gameState.cash)}
          </span>
        </div>
      </Tooltip>

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
    </div>
  );
}
