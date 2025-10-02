'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Choice } from '@/lib/types';

interface ChoiceCardProps {
  choice: Choice;
  onSelect: (choiceId: number) => void;
  disabled: boolean;
  multiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (choiceId: number) => void;
}

export default function ChoiceCard({
  choice,
  onSelect,
  disabled,
  multiSelectMode = false,
  isSelected = false,
  onToggleSelect
}: ChoiceCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiSelectMode && onToggleSelect) {
      onToggleSelect(choice.choiceId);
    } else {
      onSelect(choice.choiceId);
    }
  };

  // 첫 줄 (제목) 추출
  const lines = choice.text.split('\n');
  const title = lines[0];
  const description = lines.slice(1).join('\n');

  return (
    <>
    <div
      onClick={toggleTooltip}
      className={`group relative w-full text-left p-4 bg-white rounded-lg hover:shadow-lg transition-all duration-150 min-h-[180px] flex flex-col cursor-pointer ${
        isSelected
          ? 'border-2 border-indigo-600 shadow-md'
          : 'border border-slate-200 hover:border-indigo-400'
      }`}
    >
      {/* 선택 체크마크 (멀티 선택 모드일 때만) */}
      {multiSelectMode && (
        <div className="absolute top-2 right-2 z-20">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600'
              : 'bg-white border-slate-300 group-hover:border-indigo-400'
          }`}>
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 상단 글로우 효과 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* 타이틀 */}
        <div className="text-sm font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors break-words line-clamp-2 leading-tight">
          {title}
        </div>

        {/* 설명 - 더 잘 보이게 */}
        {description && (
          <div className="text-xs text-slate-600 mb-2 leading-snug break-words line-clamp-4">
            {description}
          </div>
        )}

        {/* 효과 표시 */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {/* 유저 변화 */}
          {choice.effects.users !== 0 && (
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${
              choice.effects.users > 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`} title={`유저 ${choice.effects.users > 0 ? '+' : ''}${choice.effects.users.toLocaleString()}`}>
              <span>👥</span>
              <span>{choice.effects.users > 0 ? '+' : ''}{Math.abs(choice.effects.users) >= 1000 ? (choice.effects.users / 1000).toFixed(0) + 'k' : choice.effects.users}</span>
            </div>
          )}

          {/* 자금 변화 */}
          {choice.effects.cash !== 0 && (
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${
              choice.effects.cash > 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`} title={`자금 ${choice.effects.cash > 0 ? '+' : ''}${choice.effects.cash.toLocaleString()}원`}>
              <span>💰</span>
              <span>{choice.effects.cash > 0 ? '+' : ''}{(Math.abs(choice.effects.cash) / 10000).toLocaleString()}</span>
            </div>
          )}

          {/* 신뢰도 변화 */}
          {choice.effects.trust !== 0 && (
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${
              choice.effects.trust > 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`} title={`신뢰도 ${choice.effects.trust > 0 ? '+' : ''}${choice.effects.trust}%`}>
              <span>📈</span>
              <span>{choice.effects.trust > 0 ? '+' : ''}{choice.effects.trust}</span>
            </div>
          )}

          {/* 인프라 추가 */}
          {choice.effects.infra.length > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700" title={choice.effects.infra.join(', ')}>
              <span>☁️</span>
            </div>
          )}
        </div>

      </div>

      {/* 선택 버튼 (싱글 모드) 또는 선택 토글 버튼 (멀티 모드) */}
      {!multiSelectMode ? (
        <button
          onClick={handleSelect}
          disabled={disabled}
          className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          이 선택지를 선택
        </button>
      ) : (
        <button
          onClick={handleSelect}
          disabled={disabled}
          className={`mt-3 w-full py-2 px-4 font-bold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${
            isSelected
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-white text-indigo-600 border-2 border-indigo-500 hover:bg-indigo-50'
          }`}
        >
          {isSelected ? '✓ 선택됨' : '선택하기'}
        </button>
      )}
    </div>

    {/* Click Popup - Portal로 body에 렌더링 */}
    {mounted && showTooltip && createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 p-4"
        onClick={toggleTooltip}
      >
        <div className="bg-white border-4 border-indigo-500 rounded-2xl shadow-2xl p-6 max-w-3xl w-full">
          {/* 제목 */}
          <div className="text-xl font-bold text-slate-900 mb-3 border-b-2 border-indigo-200 pb-2">
            {title}
          </div>

          {/* 전체 설명 */}
          {description && (
            <div className="text-base text-slate-700 mb-4 leading-relaxed whitespace-pre-line">
              {description}
            </div>
          )}

          {/* 효과 상세 표시 */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="text-lg">⚡</span>
              예상 효과
            </div>

            <div className="grid grid-cols-2 gap-2">
              {choice.effects.users !== 0 && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  choice.effects.users > 0
                    ? 'bg-emerald-50 border-2 border-emerald-300'
                    : 'bg-rose-50 border-2 border-rose-300'
                }`}>
                  <span className="text-2xl">👥</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-600">유저 변화</div>
                    <div className={`text-base font-bold ${
                      choice.effects.users > 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {choice.effects.users > 0 ? '+' : ''}{choice.effects.users.toLocaleString()}명
                    </div>
                  </div>
                </div>
              )}

              {choice.effects.cash !== 0 && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  choice.effects.cash > 0
                    ? 'bg-emerald-50 border-2 border-emerald-300'
                    : 'bg-rose-50 border-2 border-rose-300'
                }`}>
                  <span className="text-2xl">💰</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-600">자금 변화</div>
                    <div className={`text-base font-bold ${
                      choice.effects.cash > 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {choice.effects.cash > 0 ? '+' : ''}{choice.effects.cash.toLocaleString()}원
                    </div>
                  </div>
                </div>
              )}

              {choice.effects.trust !== 0 && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  choice.effects.trust > 0
                    ? 'bg-emerald-50 border-2 border-emerald-300'
                    : 'bg-rose-50 border-2 border-rose-300'
                }`}>
                  <span className="text-2xl">📈</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-600">신뢰도 변화</div>
                    <div className={`text-base font-bold ${
                      choice.effects.trust > 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {choice.effects.trust > 0 ? '+' : ''}{choice.effects.trust}%
                    </div>
                  </div>
                </div>
              )}

              {choice.effects.infra.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-50 border-2 border-indigo-300">
                  <span className="text-2xl">☁️</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-600">인프라 추가</div>
                    <div className="text-base font-bold text-indigo-700">
                      {choice.effects.infra.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 팝업 내 선택 버튼 */}
          {!multiSelectMode ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(e);
                toggleTooltip();
              }}
              disabled={disabled}
              className="mt-4 w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg font-bold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              이 선택지를 선택하고 진행
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(e);
                toggleTooltip();
              }}
              disabled={disabled}
              className={`mt-4 w-full py-3 px-6 text-lg font-bold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                isSelected
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white text-indigo-600 border-2 border-indigo-500 hover:bg-indigo-50'
              }`}
            >
              {isSelected ? '✓ 선택 완료 (닫기)' : '이 선택지 선택하기'}
            </button>
          )}
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
