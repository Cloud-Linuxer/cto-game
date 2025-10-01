import type { Choice } from '@/lib/types';

interface ChoiceCardProps {
  choice: Choice;
  onSelect: (choiceId: number) => void;
  disabled: boolean;
}

export default function ChoiceCard({ choice, onSelect, disabled }: ChoiceCardProps) {
  // 첫 줄 (제목) 추출
  const lines = choice.text.split('\n');
  const title = lines[0];
  const description = lines.slice(1).join('\n');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(choice.choiceId);
    }
  };

  return (
    <button
      onClick={() => onSelect(choice.choiceId)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-label={`선택지: ${title}`}
      className="group relative w-full text-left p-4 sm:p-5 lg:p-6 min-h-[88px] bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl shadow-md lg:shadow-lg hover:shadow-xl lg:hover:shadow-2xl hover:scale-[1.01] lg:hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {/* 상단 글로우 효과 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative z-10">
        {/* 타이틀 */}
        <div className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 mb-3 sm:mb-4 group-hover:text-indigo-600 transition-colors break-words">
          {title}
        </div>

        {/* 설명 */}
        {description && (
          <div className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4 leading-relaxed whitespace-pre-line break-words">
            {description}
          </div>
        )}

        {/* 효과 표시 - 뱃지 스타일 */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          {/* 유저 변화 */}
          {choice.effects.users !== 0 && (
            <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
              choice.effects.users > 0
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100 text-rose-700 border border-rose-200'
            }`}>
              <span className="text-sm sm:text-base">👥</span>
              <span>{choice.effects.users > 0 ? '+' : ''}{choice.effects.users.toLocaleString()}</span>
            </div>
          )}

          {/* 자금 변화 */}
          {choice.effects.cash !== 0 && (
            <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
              choice.effects.cash > 0
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100 text-rose-700 border border-rose-200'
            }`}>
              <span className="text-sm sm:text-base">💰</span>
              <span>{choice.effects.cash > 0 ? '+' : ''}{choice.effects.cash.toLocaleString()}원</span>
            </div>
          )}

          {/* 신뢰도 변화 */}
          {choice.effects.trust !== 0 && (
            <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
              choice.effects.trust > 0
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100 text-rose-700 border border-rose-200'
            }`}>
              <span className="text-sm sm:text-base">📈</span>
              <span>{choice.effects.trust > 0 ? '+' : ''}{choice.effects.trust}%</span>
            </div>
          )}

          {/* 인프라 추가 */}
          {choice.effects.infra.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
              <span className="text-sm sm:text-base">☁️</span>
              <span>{choice.effects.infra.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Hover 인디케이터 */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </button>
  );
}
