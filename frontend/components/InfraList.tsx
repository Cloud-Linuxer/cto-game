'use client';

import { useState } from 'react';

interface InfraListProps {
  infrastructure: string[];
}

export default function InfraList({ infrastructure }: InfraListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const infraIcons: Record<string, string> = {
    'EC2': '🖥️',
    'Aurora': '🗄️',
    'Aurora Global DB': '🌍',
    'EKS': '⚙️',
    'Redis': '⚡',
    'S3': '📦',
    'CloudFront': '🌐',
    'Lambda': '⚡',
    'Bedrock': '🤖',
    'ALB': '⚖️',
    'Karpenter': '🔧',
  };

  const requiredInfra = ['Aurora Global DB', 'EKS'];
  const hasRequired = requiredInfra.filter(req => infrastructure.includes(req));
  const progress = (hasRequired.length / requiredInfra.length) * 100;

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-md lg:shadow-xl border-l border-slate-200">
      {/* 모바일: 접을 수 있는 헤더 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden w-full flex items-center justify-between p-4 min-h-[56px] bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            인프라
          </h2>
          <div className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full">
            {infrastructure.length}
          </div>
        </div>
        <span className="text-slate-500 text-sm">
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* 데스크탑: 일반 헤더 */}
      <div className="hidden lg:block p-4 sm:p-5 lg:p-6">
        <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          인프라
        </h2>
        <div className="h-1 w-12 lg:w-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mt-2"></div>
      </div>

      {/* 인프라 목록 */}
      <div className={`p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 ${collapsed ? 'hidden lg:block' : 'block'}`}>
        {infrastructure.length === 0 ? (
          <div className="text-center py-8 sm:py-10 lg:py-12">
            <div className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 opacity-20">☁️</div>
            <div className="text-responsive-sm text-slate-400 font-medium">인프라가 없습니다</div>
            <div className="text-responsive-xs sm:text-xs text-slate-300 mt-2">선택을 통해 AWS 서비스를 추가하세요</div>
          </div>
        ) : (
          infrastructure.map((infra, index) => (
            <div
              key={index}
              className="group bg-white p-3 sm:p-4 rounded-lg lg:rounded-xl border border-slate-200 shadow-sm lg:shadow-md hover:shadow-lg lg:hover:shadow-xl hover:scale-[1.02] lg:hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-xl sm:text-2xl shadow-md group-hover:scale-110 transition-transform">
                  {infraIcons[infra] || '☁️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-responsive-sm lg:text-responsive-base text-slate-800 group-hover:text-cyan-600 transition-colors truncate">
                    {infra}
                  </div>
                  <div className="text-responsive-xs text-slate-500">
                    AWS 서비스
                  </div>
                </div>
                {requiredInfra.includes(infra) && (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* IPO 필수 인프라 체크리스트 */}
      <div className={`mx-3 sm:mx-4 lg:mx-6 mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg lg:rounded-xl border border-blue-200 shadow-sm lg:shadow-md ${collapsed ? 'hidden lg:block' : 'block'}`}>
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-responsive-xs sm:text-sm font-bold text-blue-800">
            IPO 필수 인프라
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
          {requiredInfra.map((req) => (
            <div
              key={req}
              className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${
                infrastructure.includes(req)
                  ? 'text-emerald-700 font-semibold'
                  : 'text-blue-600'
              }`}
            >
              {infrastructure.includes(req) ? (
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={infrastructure.includes(req) ? 'line-through' : ''}>
                {req}
              </span>
            </div>
          ))}
        </div>

        {/* 진행률 바 */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-blue-700 font-semibold mb-1">
            <span>완료율</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-green-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div className={`mx-3 sm:mx-4 lg:mx-6 mt-4 sm:mt-5 lg:mt-6 p-3 sm:p-4 bg-white rounded-lg lg:rounded-xl border border-slate-200 shadow-sm lg:shadow-md ${collapsed ? 'hidden lg:block' : 'block'}`}>
        <div className="text-center">
          <div className="text-responsive-2xl lg:text-responsive-3xl font-bold text-cyan-600">
            {infrastructure.length}
          </div>
          <div className="text-responsive-xs sm:text-xs text-slate-500 font-medium mt-1">
            구축된 AWS 서비스
          </div>
        </div>
      </div>
    </div>
  );
}
