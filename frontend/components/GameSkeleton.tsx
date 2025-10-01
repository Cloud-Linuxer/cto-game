export default function GameSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-gray-100 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <header className="bg-indigo-600 p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="h-8 w-48 bg-indigo-500 rounded"></div>
          <div className="h-10 w-24 bg-indigo-500 rounded"></div>
        </div>
      </header>

      {/* 3패널 레이아웃 스켈레톤 */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(240px,280px)_1fr_minmax(240px,280px)] gap-0 overflow-hidden">
        {/* 모바일: 상단 메트릭 바 스켈레톤 */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-11 w-24 bg-blue-100 rounded-full shrink-0"></div>
            <div className="h-11 w-24 bg-emerald-100 rounded-full shrink-0"></div>
            <div className="h-11 w-24 bg-amber-100 rounded-full shrink-0"></div>
            <div className="h-11 w-24 bg-purple-100 rounded-full shrink-0"></div>
          </div>
        </div>

        {/* 데스크탑: 좌측 메트릭 패널 스켈레톤 */}
        <div className="hidden lg:block bg-gradient-to-br from-slate-50 to-slate-100 p-6 shadow-xl border-r border-slate-200">
          <div className="mb-8">
            <div className="h-10 w-32 bg-slate-300 rounded mb-2"></div>
            <div className="h-1 w-16 bg-slate-300 rounded-full"></div>
          </div>

          <div className="space-y-6">
            {/* 4개의 메트릭 카드 */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-5 rounded-xl shadow-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-400 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 w-16 bg-slate-200 rounded mb-2"></div>
                    <div className="h-8 w-24 bg-slate-300 rounded"></div>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* 중앙: 스토리 패널 스켈레톤 */}
        <div className="bg-gradient-to-b from-slate-50 to-white p-6 overflow-y-auto">
          {/* 이벤트 카드 */}
          <div className="mb-8 relative">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
              <div className="h-8 w-20 bg-indigo-200 rounded-full mb-4"></div>
              <div className="space-y-3">
                <div className="h-6 bg-slate-200 rounded w-full"></div>
                <div className="h-6 bg-slate-200 rounded w-5/6"></div>
                <div className="h-6 bg-slate-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>

          {/* 선택지 카드들 */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-1 w-12 bg-indigo-300 rounded-full"></div>
              <div className="h-7 w-24 bg-slate-300 rounded"></div>
              <div className="h-1 flex-1 bg-slate-200 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-lg p-6 min-h-[88px]">
                  <div className="h-6 w-3/4 bg-slate-300 rounded mb-4"></div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="h-7 w-20 bg-slate-200 rounded-full"></div>
                    <div className="h-7 w-24 bg-slate-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 우측: 인프라 패널 스켈레톤 */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 shadow-xl border-l border-slate-200">
          {/* 모바일: 접기 헤더 */}
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="h-6 w-24 bg-cyan-200 rounded"></div>
            <div className="h-4 w-4 bg-slate-300 rounded"></div>
          </div>

          {/* 데스크탑: 헤더 */}
          <div className="hidden lg:block p-6">
            <div className="h-10 w-32 bg-cyan-200 rounded mb-2"></div>
            <div className="h-1 w-16 bg-cyan-300 rounded-full"></div>
          </div>

          {/* 인프라 목록 */}
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-300 to-blue-300 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-slate-300 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
