import type { GameState } from '@/lib/types';

interface TeamPanelProps {
  gameState: GameState;
}

export default function TeamPanel({ gameState }: TeamPanelProps) {
  const staffEmojis: { [key: string]: string } = {
    '개발자': '👨‍💻',
    '디자이너': '🎨',
    '기획자': '📋',
  };

  const staffDescriptions: { [key: string]: string } = {
    '개발자': '다음 턴부터 2개 선택 가능',
    '디자이너': '유저 획득 2배',
    '기획자': '신뢰도 획득 2배',
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 shadow-md lg:shadow-xl border-l border-slate-200">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          팀 구성
        </h2>
        <div className="h-1 w-12 lg:w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mt-2"></div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {gameState.hiredStaff && gameState.hiredStaff.length > 0 ? (
          gameState.hiredStaff.map((staff, index) => (
            <div
              key={index}
              className="bg-white p-3 sm:p-4 lg:p-5 rounded-lg lg:rounded-xl shadow-md lg:shadow-lg border border-slate-200"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-md text-2xl">
                  {staffEmojis[staff] || '👤'}
                </div>
                <div className="flex-1">
                  <div className="text-base sm:text-lg lg:text-xl font-bold text-blue-600">
                    {staff}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 mt-1">
                    {staffDescriptions[staff] || ''}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-lg lg:rounded-xl shadow-md border border-slate-200 text-center">
            <div className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4">👥</div>
            <div className="text-sm sm:text-base text-slate-600">
              아직 채용된 인원이 없습니다
            </div>
            <div className="text-xs sm:text-sm text-slate-500 mt-2">
              인력 선택지를 통해 팀원을 채용하세요
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
