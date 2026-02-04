'use client';

/**
 * EventHeader Component
 *
 * 이벤트 팝업 헤더 (타입 아이콘 + 레이블)
 */

import React from 'react';
import type { EventType } from '@/types/event.types';
import { getEventTheme } from '@/utils/eventTheme';
import EventTypeIcon from './EventTypeIcon';

export interface EventHeaderProps {
  eventType: EventType;
  className?: string;
}

/**
 * 이벤트 헤더 컴포넌트
 */
const EventHeader: React.FC<EventHeaderProps> = ({
  eventType,
  className = ''
}) => {
  const theme = getEventTheme(eventType);

  return (
    <div
      className={`flex items-center gap-3 pb-4 border-b-2 ${theme.border} ${className}`}
    >
      <EventTypeIcon type={eventType} size={48} />
      <div className="flex-1">
        <h2 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>
          {theme.label}
        </h2>
      </div>
    </div>
  );
};

export default React.memo(EventHeader);
