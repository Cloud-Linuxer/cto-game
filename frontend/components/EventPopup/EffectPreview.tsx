'use client';

/**
 * EffectPreview Component
 *
 * 선택지 효과 미리보기
 */

import React, { useMemo } from 'react';
import type { EventChoiceEffects } from '@/types/event.types';
import { EFFECT_COLORS, getEffectColorType } from '@/utils/eventTheme';

export interface EffectPreviewProps {
  effects: EventChoiceEffects;
  compact?: boolean;
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * 효과 아이템 인터페이스
 */
interface EffectItem {
  key: string;
  icon: string;
  label: string;
  value: string;
  colorType: 'positive' | 'negative' | 'neutral';
}

/**
 * 효과 데이터 포맷팅
 */
function formatEffects(effects: EventChoiceEffects): EffectItem[] {
  const items: EffectItem[] = [];

  // 유저 변화
  if (effects.users !== undefined && effects.users !== 0) {
    items.push({
      key: 'users',
      icon: '👥',
      label: '유저',
      value: `${effects.users > 0 ? '+' : ''}${effects.users.toLocaleString()}`,
      colorType: getEffectColorType(effects.users),
    });
  }

  // 자금 변화
  if (effects.cash !== undefined && effects.cash !== 0) {
    items.push({
      key: 'cash',
      icon: '💰',
      label: '자금',
      value: `${effects.cash > 0 ? '+' : ''}${(effects.cash / 10000).toLocaleString()}만`,
      colorType: getEffectColorType(effects.cash),
    });
  }

  // 신뢰도 변화
  if (effects.trust !== undefined && effects.trust !== 0) {
    items.push({
      key: 'trust',
      icon: '📈',
      label: '신뢰도',
      value: `${effects.trust > 0 ? '+' : ''}${effects.trust}`,
      colorType: getEffectColorType(effects.trust),
    });
  }

  // 인프라 추가
  if (effects.infra && effects.infra.length > 0) {
    items.push({
      key: 'infra',
      icon: '☁️',
      label: 'AWS',
      value: effects.infra.join(', '),
      colorType: 'neutral',
    });
  }

  return items;
}

/**
 * 효과 미리보기 컴포넌트
 */
const EffectPreview: React.FC<EffectPreviewProps> = ({
  effects,
  compact = false,
  layout = 'vertical',
  className = ''
}) => {
  const formattedEffects = useMemo(() => formatEffects(effects), [effects]);

  if (formattedEffects.length === 0) {
    return null;
  }

  // 컴팩트 모드 (작은 배지)
  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {formattedEffects.map((effect) => {
          const colors = EFFECT_COLORS[effect.colorType];
          return (
            <div
              key={effect.key}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${colors.bg} ${colors.text}`}
              title={`${effect.label} ${effect.value}`}
            >
              <span>{effect.icon}</span>
              <span>{effect.value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // 일반 모드 (상세 표시)
  const containerClass = layout === 'horizontal'
    ? 'grid grid-cols-2 gap-2'
    : 'space-y-2';

  return (
    <div className={`${containerClass} ${className}`}>
      {formattedEffects.map((effect) => {
        const colors = EFFECT_COLORS[effect.colorType];
        return (
          <div
            key={effect.key}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 ${colors.bg} ${colors.border}`}
          >
            <span className="text-xl">{effect.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-600">
                {effect.label}
              </div>
              <div className={`text-sm font-bold truncate ${colors.text}`}>
                {effect.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(EffectPreview);
