'use client';

/**
 * EventContent Component
 *
 * 이벤트 본문 (제목 + 설명)
 */

import React from 'react';
import type { EventGameStats } from '@/types/event.types';

export interface EventContentProps {
  title?: string;
  description: string;
  currentStats?: EventGameStats;
  maxHeight?: string;
  className?: string;
}

/**
 * 이벤트 콘텐츠 컴포넌트
 */
const EventContent: React.FC<EventContentProps> = ({
  title,
  description,
  currentStats,
  maxHeight = '60vh',
  className = ''
}) => {
  return (
    <div
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight }}
    >
      {/* 제목 (선택적) */}
      {title && (
        <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-900">
          {title}
        </h3>
      )}

      {/* 이벤트 설명 */}
      <div className="text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">
        {description}
      </div>

      {/* 현재 상태 표시 (선택적) */}
      {currentStats && (
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
            현재 상황:
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">유저:</span>{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {currentStats.users.toLocaleString()}명
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">신뢰도:</span>{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {currentStats.trust}%
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">자금:</span>{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {(currentStats.cash / 10000).toLocaleString()}만원
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(EventContent);
