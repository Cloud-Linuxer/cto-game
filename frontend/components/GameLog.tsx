'use client';

import { useState } from 'react';

export interface GameLogEntry {
  turnNumber: number;
  timestamp: string;
  eventText: string;
  choiceText: string;
  effects: {
    users: number;
    cash: number;
    trust: number;
    infra: string[];
  };
}

interface GameLogProps {
  logs: GameLogEntry[];
}

export default function GameLog({ logs }: GameLogProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-md lg:shadow-xl border-t lg:border-t-0 lg:border-l border-slate-200">
      {/* 모바일: 접을 수 있는 헤더 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden w-full flex items-center justify-between p-4 min-h-[56px] bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            게임 로그
          </h2>
          <div className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">
            {logs.length}
          </div>
        </div>
        <span className="text-slate-500 text-sm">
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* 데스크탑: 일반 헤더 */}
      <div className="hidden lg:block p-4 sm:p-5 lg:p-6">
        <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
          게임 로그
        </h2>
        <div className="h-1 w-12 lg:w-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mt-2"></div>
      </div>

      {/* 로그 목록 */}
      <div className={`p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[60vh] lg:max-h-none ${collapsed ? 'hidden lg:block' : 'block'}`}>
        {logs.length === 0 ? (
          <div className="text-center py-8 sm:py-10 lg:py-12">
            <div className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 opacity-20">📜</div>
            <div className="text-sm sm:text-base text-slate-400 font-medium">게임 로그가 없습니다</div>
            <div className="text-xs sm:text-sm text-slate-300 mt-2">선택을 하면 기록이 남습니다</div>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={`${log.turnNumber}-${index}`}
              className="group bg-white p-3 sm:p-4 rounded-lg lg:rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300"
            >
              {/* 턴 번호 및 시간 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold rounded-full">
                    턴 {log.turnNumber}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR')}
                  </div>
                </div>
              </div>

              {/* 이벤트 텍스트 */}
              <div className="text-xs sm:text-sm text-slate-600 mb-2 line-clamp-2">
                {log.eventText}
              </div>

              {/* 선택한 옵션 */}
              <div className="flex items-start gap-1.5 mb-2">
                <span className="text-xs text-violet-600 font-semibold mt-0.5">→</span>
                <span className="text-xs sm:text-sm text-violet-700 font-medium line-clamp-1">
                  {log.choiceText}
                </span>
              </div>

              {/* 효과 요약 */}
              <div className="flex flex-wrap gap-1.5">
                {log.effects.users !== 0 && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    log.effects.users > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    <span>👥</span>
                    <span>{log.effects.users > 0 ? '+' : ''}{log.effects.users.toLocaleString()}</span>
                  </div>
                )}
                {log.effects.cash !== 0 && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    log.effects.cash > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    <span>💰</span>
                    <span>{log.effects.cash > 0 ? '+' : ''}{(log.effects.cash / 10000).toFixed(0)}만</span>
                  </div>
                )}
                {log.effects.trust !== 0 && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    log.effects.trust > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    <span>📈</span>
                    <span>{log.effects.trust > 0 ? '+' : ''}{log.effects.trust}%</span>
                  </div>
                )}
                {log.effects.infra.length > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                    <span>☁️</span>
                    <span>{log.effects.infra.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 통계 */}
      {logs.length > 0 && (
        <div className={`mx-3 sm:mx-4 lg:mx-6 mt-4 sm:mt-5 lg:mt-6 p-3 sm:p-4 bg-white rounded-lg lg:rounded-xl border border-slate-200 shadow-sm lg:shadow-md ${collapsed ? 'hidden lg:block' : 'block'}`}>
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-violet-600">
              {logs.length}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              진행한 턴
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
