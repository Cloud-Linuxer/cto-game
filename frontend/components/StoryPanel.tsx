'use client';

import { useState } from 'react';
import type { Turn } from '@/lib/types';
import ChoiceCard from './ChoiceCard';

interface StoryPanelProps {
  turn: Turn;
  onSelectChoice: (choiceId: number) => Promise<void>;
  disabled: boolean;
}

type Category = '전체' | '마케팅' | '인프라' | '재무';

export default function StoryPanel({ turn, onSelectChoice, disabled }: StoryPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('전체');

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

  return (
    <div className="h-full bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8 pb-32 sm:pb-40 lg:pb-48">
        {/* Event Text - 개선된 디자인 */}
        <div className="mb-4 sm:mb-6 lg:mb-8 relative">
          {/* 배경 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl lg:rounded-3xl blur-xl"></div>

          {/* 메인 컨텐츠 */}
          <div className="relative bg-white p-4 sm:p-6 lg:p-8 rounded-xl lg:rounded-2xl shadow-md lg:shadow-xl border border-slate-200">
            {/* 턴 번호 뱃지 */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs sm:text-sm font-bold rounded-full mb-3 sm:mb-4 shadow-md lg:shadow-lg">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>턴 {turn.turnNumber}</span>
            </div>

            {/* 이벤트 텍스트 */}
            <div className="text-base sm:text-lg lg:text-xl font-bold leading-relaxed text-slate-800 whitespace-pre-line break-words overflow-wrap-anywhere">
              {turn.eventText}
            </div>

            {/* 장식 요소 */}
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>

        {/* Choices Section */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-6">
            <div className="h-0.5 sm:h-1 w-8 sm:w-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800">
              선택지
            </h3>
            <div className="h-0.5 sm:h-1 flex-1 bg-gradient-to-r from-purple-500/20 to-transparent rounded-full"></div>
          </div>

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

          {/* 필터링된 선택지 목록 */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredChoices.length > 0 ? (
              filteredChoices.map((choice) => (
                <ChoiceCard
                  key={choice.choiceId}
                  choice={choice}
                  onSelect={onSelectChoice}
                  disabled={disabled}
                />
              ))
            ) : (
              <div className="text-center py-8 sm:py-10 lg:py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 opacity-20">🔍</div>
                <div className="text-sm sm:text-base text-slate-500 font-medium">
                  해당 카테고리의 선택지가 없습니다
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-2">
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
