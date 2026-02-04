'use client';

/**
 * EventFooter Component
 *
 * 이벤트 팝업 푸터 (히스토리 링크)
 */

import React from 'react';

export interface EventFooterProps {
  gameId: string;
  onViewHistory?: () => void;
  className?: string;
}

/**
 * 이벤트 푸터 컴포넌트
 */
const EventFooter: React.FC<EventFooterProps> = ({
  gameId,
  onViewHistory,
  className = ''
}) => {
  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory();
    } else {
      // 기본 동작: 히스토리 페이지로 이동
      window.location.href = `/game/${gameId}/events`;
    }
  };

  return (
    <div className={`mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center ${className}`}>
      <button
        onClick={handleViewHistory}
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 underline"
      >
        이벤트 히스토리 보기 →
      </button>
    </div>
  );
};

export default React.memo(EventFooter);
