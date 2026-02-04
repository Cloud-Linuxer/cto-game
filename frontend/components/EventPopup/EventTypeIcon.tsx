'use client';

/**
 * EventTypeIcon Component
 *
 * 이벤트 타입별 아이콘 표시
 */

import React from 'react';
import type { EventType } from '@/types/event.types';
import { getEventTheme } from '@/utils/eventTheme';

export interface EventTypeIconProps {
  type: EventType;
  size?: number;
  animate?: boolean;
}

/**
 * 이벤트 타입 아이콘 컴포넌트
 */
const EventTypeIcon: React.FC<EventTypeIconProps> = ({
  type,
  size = 48,
  animate = false
}) => {
  const theme = getEventTheme(type);

  return (
    <div
      className={`flex items-center justify-center rounded-full ${theme.gradient} shadow-lg`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      role="img"
      aria-label={theme.label}
    >
      <span
        style={{ fontSize: `${size * 0.6}px` }}
        className="select-none"
      >
        {theme.icon}
      </span>
    </div>
  );
};

export default React.memo(EventTypeIcon);
