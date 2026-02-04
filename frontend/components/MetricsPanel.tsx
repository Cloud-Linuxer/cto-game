import type { GameState, DifficultyMode, VictoryPath } from '@/lib/types';
import { VICTORY_PATH_INFO } from '@/lib/types';
import { DIFFICULTY_GOALS } from '@/lib/game-constants';
import TrustGauge from '@/components/metrics/TrustGauge';

interface MetricsPanelProps {
  gameState: GameState;
}

export default function MetricsPanel({ gameState }: MetricsPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const mode = (gameState.difficultyMode || 'NORMAL') as DifficultyMode;
  const goals = DIFFICULTY_GOALS[mode];
  const maxTurns = gameState.maxTurns || goals.maxTurns;

  const userProgress = Math.min((gameState.users / goals.users) * 100, 100);
  const cashProgress = Math.min((gameState.cash / goals.cash) * 100, 100);
  const trustProgress = Math.min((gameState.trust / goals.trust) * 100, 100);
  const turnProgress = (gameState.currentTurn / maxTurns) * 100;

  const capacityWarning = gameState.capacityWarningLevel || 'GREEN';
  const capacityColor = capacityWarning === 'RED' ? 'text-red-500' : capacityWarning === 'YELLOW' ? 'text-yellow-500' : 'text-green-500';

  const difficultyLabel = mode === 'EASY' ? '학습' : mode === 'HARD' ? '전문가' : '도전';
  const difficultyColor = mode === 'EASY' ? 'bg-green-100 text-green-700' : mode === 'HARD' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 shadow-md lg:shadow-xl border-r border-slate-200">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            메트릭
          </h2>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${difficultyColor}`}>
            {difficultyLabel}
          </span>
        </div>
        <div className="h-1 w-12 lg:w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2"></div>
      </div>

      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        {/* 경고 메시지 */}
        {gameState.warnings && gameState.warnings.length > 0 && (
          <div className="space-y-2">
            {gameState.warnings.map((warning, idx) => (
              <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
                {warning}
              </div>
            ))}
          </div>
        )}

        {/* 현재 턴 */}
        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg lg:rounded-xl shadow-md lg:shadow-lg border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm text-slate-600 font-medium">턴</div>
              <div className="text-xl lg:text-2xl font-bold text-blue-600">
                {gameState.currentTurn} <span className="text-lg lg:text-xl text-slate-400">/ {maxTurns}</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 sm:h-2.5 lg:h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${turnProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* 유저 수 */}
        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg lg:rounded-xl shadow-md lg:shadow-lg border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm text-slate-600 font-medium">유저 수</div>
              <div className="text-lg lg:text-xl font-bold text-emerald-600">
                {formatNumber(gameState.users)}
              </div>
              {gameState.maxUserCapacity && (
                <div className={`text-xs mt-1 font-medium ${capacityColor}`}>
                  수용: {formatNumber(gameState.maxUserCapacity)}명
                  {gameState.capacityUsagePercent !== undefined && (
                    <span className="ml-1">({gameState.capacityUsagePercent}%)</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-2">목표: {formatNumber(goals.users)}명</div>
          <div className="w-full bg-slate-200 rounded-full h-2 sm:h-2.5 lg:h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-emerald-500 to-green-500 h-full rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
              style={{ width: `${userProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
          <div className="text-right text-xs text-emerald-600 font-semibold mt-1">
            {userProgress.toFixed(1)}%
          </div>
        </div>

        {/* 자금 */}
        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg lg:rounded-xl shadow-md lg:shadow-lg border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm text-slate-600 font-medium">자금</div>
              <div className="text-lg lg:text-xl font-bold text-amber-600">
                {formatCurrency(gameState.cash)}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-2">목표: {formatCurrency(goals.cash)}</div>
          <div className="w-full bg-slate-200 rounded-full h-2 sm:h-2.5 lg:h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
              style={{ width: `${cashProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
          <div className="text-right text-xs text-amber-600 font-semibold mt-1">
            {cashProgress.toFixed(1)}%
          </div>
        </div>

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

        {/* Phase 3: 회복/복원력 상태 */}
        {gameState.status === 'PLAYING' && (((gameState.resilienceStacks ?? 0) ?? 0) > 0 || gameState.comebackActive || gameState.bankruptcyGraceTurns !== undefined) && (
          <div className="space-y-2">
            {/* 복원력 스택 */}
            {((gameState.resilienceStacks ?? 0) ?? 0) > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-teal-700">복원력 Lv.{(gameState.resilienceStacks ?? 0)}</div>
                  <div className="text-xs text-teal-600">용량 +{(gameState.resilienceStacks ?? 0) * 5}%</div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i <= ((gameState.resilienceStacks ?? 0) || 0) ? 'bg-teal-500' : 'bg-teal-200'}`} />
                  ))}
                </div>
              </div>
            )}

            {/* 컴백 보너스 */}
            {gameState.comebackActive && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <div>
                  <div className="text-xs font-semibold text-orange-700">컴백 보너스 활성</div>
                  <div className="text-xs text-orange-600">긍정적 효과 +25%</div>
                </div>
              </div>
            )}

            {/* 파산 유예 */}
            {gameState.bankruptcyGraceTurns !== undefined && gameState.bankruptcyGraceTurns >= 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-2 flex items-center gap-2 animate-pulse">
                <span className="text-lg">⏳</span>
                <div>
                  <div className="text-xs font-semibold text-red-700">파산 유예</div>
                  <div className="text-xs text-red-600">{gameState.bankruptcyGraceTurns}턴 이내 흑자 전환 필요!</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 승리 경로 진행률 */}
        {gameState.status === 'PLAYING' && gameState.victoryPathProgress && (
          <div className="mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg lg:rounded-xl shadow-md lg:shadow-xl">
            <div className="text-xs sm:text-sm text-slate-300 font-medium mb-3">승리 경로</div>
            <div className="space-y-2">
              {(['IPO', 'ACQUISITION', 'PROFITABILITY', 'TECH_LEADER'] as VictoryPath[]).map((path) => {
                const progress = gameState.victoryPathProgress![path] || 0;
                const info = VICTORY_PATH_INFO[path];
                const isComplete = progress >= 100;
                return (
                  <div key={path}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-medium ${isComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {info.emoji} {info.label}
                      </span>
                      <span className={`font-semibold ${isComplete ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-400' : progress >= 70 ? 'bg-amber-400' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 게임 상태 */}
        <div className="mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg lg:rounded-xl shadow-md lg:shadow-xl">
          <div className="text-xs sm:text-sm text-slate-300 font-medium mb-2">게임 상태</div>
          <div className={`text-lg lg:text-xl font-bold ${
            gameState.status === 'PLAYING' ? 'text-blue-400' :
            gameState.status.startsWith('WON_') ? 'text-emerald-400' :
            'text-rose-400'
          }`}>
            {gameState.status === 'PLAYING' ? '진행 중' :
             gameState.status === 'WON_IPO' ? 'IPO 성공!' :
             gameState.status === 'WON_ACQUISITION' ? '인수합병 성공!' :
             gameState.status === 'WON_PROFITABILITY' ? '흑자 전환!' :
             gameState.status === 'WON_TECH_LEADER' ? '기술 선도!' :
             gameState.status === 'LOST_BANKRUPT' ? '파산' :
             gameState.status === 'LOST_OUTAGE' ? '서버 장애' :
             gameState.status === 'LOST_FAILED_IPO' ? 'IPO 실패' :
             gameState.status === 'LOST_FIRED_CTO' ? 'CTO 해고' :
             gameState.status}
          </div>
        </div>
      </div>
    </div>
  );
}
