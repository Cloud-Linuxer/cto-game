/**
 * Event Theme Utilities
 *
 * 이벤트 타입별 색상, 아이콘, 스타일 맵핑
 */

import type { EventType } from '@/types/event.types';

/**
 * 이벤트 테마 정의
 */
export interface EventTheme {
  gradient: string;
  border: string;
  text: string;
  bg: string;
  icon: string;
  label: string;
}

/**
 * 이벤트 타입별 테마 맵
 */
export const EVENT_THEMES: Record<EventType, EventTheme> = {
  RANDOM: {
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-700',
    border: 'border-purple-500',
    text: 'text-purple-700',
    bg: 'bg-purple-50',
    icon: '🎲',
    label: '랜덤 이벤트',
  },
  CHAIN: {
    gradient: 'bg-gradient-to-br from-orange-500 to-pink-600',
    border: 'border-orange-500',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    icon: '🔗',
    label: '연쇄 이벤트',
  },
  CRISIS: {
    gradient: 'bg-gradient-to-br from-red-500 to-yellow-500',
    border: 'border-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    icon: '🚨',
    label: '위기 이벤트',
  },
  OPPORTUNITY: {
    gradient: 'bg-gradient-to-br from-green-500 to-blue-400',
    border: 'border-green-500',
    text: 'text-green-700',
    bg: 'bg-green-50',
    icon: '💡',
    label: '기회 이벤트',
  },
  SEASONAL: {
    gradient: 'bg-gradient-to-br from-blue-400 to-pink-300',
    border: 'border-blue-500',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: '⭐',
    label: '시즌 이벤트',
  },
};

/**
 * 이벤트 타입에 따른 테마 가져오기
 *
 * @param type - 이벤트 타입
 * @returns EventTheme
 */
export function getEventTheme(type: EventType): EventTheme {
  return EVENT_THEMES[type] || EVENT_THEMES.RANDOM;
}

/**
 * 효과 타입별 색상 클래스
 */
export const EFFECT_COLORS = {
  positive: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  negative: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-300',
  },
  neutral: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
  },
};

/**
 * 효과 값에 따른 색상 타입 결정
 *
 * @param value - 효과 값
 * @returns 'positive' | 'negative' | 'neutral'
 */
export function getEffectColorType(value: number | undefined): 'positive' | 'negative' | 'neutral' {
  if (value === undefined || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}
