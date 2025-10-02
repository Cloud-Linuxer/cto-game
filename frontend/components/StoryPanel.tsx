'use client';

import { useState } from 'react';
import type { Turn } from '@/lib/types';
import ChoiceCard from './ChoiceCard';

interface StoryPanelProps {
  turn: Turn;
  onSelectChoice: (choiceId: number) => Promise<void>;
  onSelectMultipleChoices?: (choiceIds: number[]) => Promise<void>;
  disabled: boolean;
  multiChoiceEnabled?: boolean;
  hiredStaff?: string[];
}

type Category = '전체' | '마케팅' | '인프라' | '재무';

export default function StoryPanel({ turn, onSelectChoice, onSelectMultipleChoices, disabled, multiChoiceEnabled, hiredStaff = [] }: StoryPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);

  // 채용된 직원 확인
  const hasDeveloper = hiredStaff.includes('개발자');
  const hasDesigner = hiredStaff.includes('디자이너');
  const hasPlanner = hiredStaff.includes('기획자');

  // 카테고리별 아이콘 매핑
  const categoryIcons: Record<Category, string> = {
    '전체': '📋',
    '마케팅': '📢',
    '인프라': '🏗️',
    '재무': '💰',
  };

  // 카테고리 필터링
  const filteredChoices = selectedCategory === '전체'
    ? turn.choices
    : turn.choices.filter(choice => choice.category === selectedCategory);

  const handleChoice = async (choiceId: number) => {
    if (multiChoiceEnabled) {
      // 멀티 선택 모드: 바로 실행하지 않고 선택 목록에 추가/제거
      return;
    }
    // 싱글 선택 모드: 바로 실행
    await onSelectChoice(choiceId);
  };

  const handleToggleSelect = (choiceId: number) => {
    setSelectedChoices(prev => {
      if (prev.includes(choiceId)) {
        // 이미 선택된 경우 제거
        return prev.filter(id => id !== choiceId);
      } else if (prev.length < 2) {
        // 아직 2개 미만인 경우 추가
        return [...prev, choiceId];
      }
      // 이미 2개 선택된 경우 무시
      return prev;
    });
  };

  const handleExecuteSelected = async () => {
    if (selectedChoices.length === 0) return;

    // 선택된 선택지들을 한 번에 실행 (1턴에 여러 선택)
    try {
      await onSelectChoice(selectedChoices);
      setSelectedChoices([]);
    } catch (error) {
      console.error('Multiple choice execution failed:', error);
    }
  };

  return (
    <div className="h-full bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
      <div className="p-3 sm:p-4 lg:p-5 pb-32 sm:pb-40 lg:pb-48">
        {/* 멀티 선택 활성화 알림 */}
        {multiChoiceEnabled && (
          <div className={`mb-3 p-3 border rounded-lg ${
            hasPlanner && hasDesigner && hasDeveloper
              ? 'bg-gradient-to-r from-red-50 via-yellow-50 via-green-50 via-blue-50 to-purple-50 border-purple-300'
              : hasDesigner && hasDeveloper
              ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-purple-200'
              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {hasDeveloper && <span className="text-2xl">👨‍💻</span>}
                {hasDesigner && <span className="text-2xl">👨‍🎨</span>}
                {hasPlanner && <span className="text-2xl">📋</span>}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-bold ${
                  hasPlanner && hasDesigner && hasDeveloper
                    ? 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent'
                    : hasDesigner && hasDeveloper
                    ? 'text-purple-700'
                    : 'text-green-700'
                }`}>
                  {hasPlanner && hasDesigner && hasDeveloper
                    ? '완벽한 팀 구성! 🌈'
                    : hasDesigner && hasDeveloper
                    ? '개발자 + 디자이너 시너지 효과!'
                    : '개발자 효과 활성화!'}
                </div>
                <div className={`text-xs ${
                  hasPlanner && hasDesigner && hasDeveloper
                    ? 'text-purple-600'
                    : hasDesigner && hasDeveloper
                    ? 'text-purple-600'
                    : 'text-green-600'
                }`}>
                  {hasPlanner && hasDesigner && hasDeveloper
                    ? '기획자의 전략적 로드맵 + 디자이너의 세련된 UX + 개발자의 빠른 실행력으로 두 개를 동시에 진행할 수 있습니다'
                    : hasDesigner && hasDeveloper
                    ? '디자이너의 창의성과 개발자의 기술력이 합쳐져 더 나은 결과물을 만들 수 있습니다'
                    : '이제 두 개를 선택할 수 있습니다'}
                </div>
              </div>
              {selectedChoices.length > 0 && (
                <div className={`text-sm font-bold ${
                  hasPlanner && hasDesigner && hasDeveloper
                    ? 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent'
                    : hasDesigner && hasDeveloper
                    ? 'text-purple-700'
                    : 'text-green-700'
                }`}>
                  {selectedChoices.length}/2 선택됨
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Text - 컴팩트한 디자인 */}
        <div className="mb-3 sm:mb-4 relative">
          {/* 메인 컨텐츠 - 축소된 패딩 */}
          <div className="relative bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-slate-200">
            {/* 턴 번호와 이벤트 텍스트를 한 줄로 */}
            <div className="flex items-start gap-2 sm:gap-3">
              {/* 턴 번호 뱃지 - 더 작게 */}
              <div className="flex-shrink-0 inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full">
                <span>턴 {turn.turnNumber}</span>
              </div>

              {/* 이벤트 텍스트 - 더 작은 폰트 */}
              <div className="text-sm sm:text-base font-semibold leading-snug text-slate-800 whitespace-pre-line break-words overflow-wrap-anywhere flex-1">
                {turn.eventText}
              </div>
            </div>
          </div>
        </div>

        {/* Choices Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              선택지
            </h3>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-purple-500/20 to-transparent rounded-full"></div>
          </div>

          {/* 선택 실행 버튼 (선택지가 있을 때만) */}
          {multiChoiceEnabled && selectedChoices.length > 0 && (
            <button
              onClick={handleExecuteSelected}
              disabled={disabled}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl mb-2"
            >
              ✓ 선택한 {selectedChoices.length}개 실행하기
            </button>
          )}

          {/* 카테고리 필터 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {(['전체', '마케팅', '인프라', '재무'] as Category[]).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                <span>{categoryIcons[category]}</span>
                <span>{category}</span>
                {category !== '전체' && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    selectedCategory === category
                      ? 'bg-white/20'
                      : 'bg-slate-100'
                  }`}>
                    {turn.choices.filter(c => c.category === category).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 필터링된 선택지 목록 - 4-5열 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredChoices.length > 0 ? (
              filteredChoices.map((choice) => (
                <ChoiceCard
                  key={choice.choiceId}
                  choice={choice}
                  onSelect={handleChoice}
                  disabled={disabled}
                  multiSelectMode={multiChoiceEnabled}
                  isSelected={selectedChoices.includes(choice.choiceId)}
                  onToggleSelect={handleToggleSelect}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-6 sm:py-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                <div className="text-3xl sm:text-4xl mb-2 opacity-20">🔍</div>
                <div className="text-sm text-slate-500 font-medium">
                  해당 카테고리의 선택지가 없습니다
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  다른 카테고리를 선택해보세요
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {disabled && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 rounded-xl lg:rounded-2xl shadow-xl lg:shadow-2xl flex items-center gap-3 sm:gap-4">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 border-3 sm:border-4 border-indigo-500 border-t-transparent"></div>
            <span className="text-base sm:text-lg font-semibold text-slate-800">선택 실행 중...</span>
          </div>
        </div>
      )}
    </div>
  );
}
