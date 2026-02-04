'use client';

/**
 * EventTypeIcon Component
 *
 * 이벤트 타입별 아이콘 표시 (애니메이션 포함)
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { EventType } from '@/types/event.types';
import { getEventTheme } from '@/utils/eventTheme';
import {
  iconEntranceVariants,
  crisisIconVariants,
  opportunityIconVariants,
  randomIconVariants,
  chainIconVariants,
  seasonalIconVariants,
} from '@/utils/eventAnimations';

export interface EventTypeIconProps {
  type: EventType;
  size?: number;
  animate?: boolean;
}

/**
 * Get animation variants for event type
 */
const getIconAnimation = (type: EventType, animate: boolean) => {
  if (!animate) return {};

  switch (type) {
    case 'CRISIS':
      return crisisIconVariants;
    case 'OPPORTUNITY':
      return opportunityIconVariants;
    case 'RANDOM':
      return randomIconVariants;
    case 'CHAIN':
      return chainIconVariants;
    case 'SEASONAL':
      return seasonalIconVariants;
    default:
      return {};
  }
};

/**
 * 이벤트 타입 아이콘 컴포넌트
 */
const EventTypeIcon: React.FC<EventTypeIconProps> = ({
  type,
  size = 48,
  animate = true,
}) => {
  const theme = getEventTheme(type);
  const iconAnimation = getIconAnimation(type, animate);

  return (
    <motion.div
      className={`flex items-center justify-center rounded-full ${theme.gradient} shadow-lg`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      role="img"
      aria-label={theme.label}
      variants={iconEntranceVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.span
        style={{ fontSize: `${size * 0.6}px` }}
        className="select-none inline-block"
        variants={iconAnimation}
        animate={animate ? 'animate' : undefined}
      >
        {theme.icon}
      </motion.span>
    </motion.div>
  );
};

export default React.memo(EventTypeIcon);
