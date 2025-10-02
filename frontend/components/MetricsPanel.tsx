import type { GameState } from '@/lib/types';

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

  // 목표 대비 진행률 계산
  const userProgress = Math.min((gameState.users / 100000) * 100, 100);
  const cashProgress = Math.min((gameState.cash / 300000000) * 100, 100);
  const trustProgress = Math.min((gameState.trust / 99) * 100, 100);
  const turnProgress = (gameState.currentTurn / 25) * 100;

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 shadow-md lg:shadow-xl border-r border-slate-200">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          메트릭
        </h2>
        <div className="h-1 w-12 lg:w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2"></div>
      </div>

      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
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
                {gameState.currentTurn} <span className="text-lg lg:text-xl text-slate-400">/ 25</span>
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
                <div className="text-xs text-slate-500 mt-1">
                  수용 가능: {formatNumber(gameState.maxUserCapacity)}명
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-2">목표: 100,000명</div>
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
          <div className="text-xs text-slate-500 mb-2">목표: ₩300,000,000</div>
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

        {/* 신뢰도 */}
        <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg lg:rounded-xl shadow-md lg:shadow-lg border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm text-slate-600 font-medium">신뢰도</div>
              <div className="text-lg lg:text-xl font-bold text-purple-600">
                {gameState.trust}%
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-2">목표: 99%</div>
          <div className="w-full bg-slate-200 rounded-full h-2 sm:h-2.5 lg:h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 relative overflow-hidden shadow-sm"
              style={{ width: `${trustProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
          <div className="text-right text-xs text-purple-600 font-semibold mt-1">
            {trustProgress.toFixed(1)}%
          </div>
        </div>

        {/* 게임 상태 */}
        <div className="mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg lg:rounded-xl shadow-md lg:shadow-xl">
          <div className="text-xs sm:text-sm text-slate-300 font-medium mb-2">게임 상태</div>
          <div className={`text-lg lg:text-xl font-bold ${
            gameState.status === 'PLAYING' ? 'text-blue-400' :
            gameState.status === 'WON_IPO' ? 'text-emerald-400' :
            'text-rose-400'
          }`}>
            {gameState.status === 'PLAYING' ? '🎮 진행 중' :
             gameState.status === 'WON_IPO' ? '🎉 IPO 성공!' :
             gameState.status === 'LOST_BANKRUPT' ? '💸 파산' :
             gameState.status === 'LOST_OUTAGE' ? '🔥 서버 장애' :
             gameState.status === 'LOST_FAILED_IPO' ? '📉 IPO 실패' :
             gameState.status}
          </div>
        </div>
      </div>
    </div>
  );
}
