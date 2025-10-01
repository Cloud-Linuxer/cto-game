'use client';

import type { GameState } from '@/lib/types';
import Tooltip from './Tooltip';

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
      <Tooltip content="현재 서비스 유저 수 (목표: 100,000명)" position="bottom">
        <div className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-emerald-50 rounded-full whitespace-nowrap shrink-0 snap-start">
          <span className="text-sm">👥</span>
          <span className="text-sm font-semibold text-emerald-700">{gameState.users.toLocaleString()}</span>
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

      {/* 신뢰도 */}
      <Tooltip content="서비스 신뢰도 (목표: 99%)" position="bottom">
        <div className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] bg-purple-50 rounded-full whitespace-nowrap shrink-0 snap-start">
          <span className="text-sm">❤️</span>
          <span className="text-sm font-semibold text-purple-700">{gameState.trust}%</span>
        </div>
      </Tooltip>
    </div>
  );
}
