'use client';

/**
 * EventPopup Component
 *
 * 메인 이벤트 팝업 컨테이너
 * Milestone 1: 기본 UI 구조 (애니메이션 없음)
 */

import React, { useState, useEffect, useRef } from 'react';
import type { EventData } from '@/types/event.types';
import EventHeader from './EventHeader';
import EventContent from './EventContent';
import EventFooter from './EventFooter';
import EffectPreview from './EffectPreview';
import styles from './EventPopup.module.css';

export interface EventPopupProps {
  eventData: EventData;
  gameId: string;
  onSelectChoice: (choiceId: string) => Promise<void>;
  onComplete?: () => void;
  isProcessing?: boolean;
  error?: string | null;
}

/**
 * 이벤트 팝업 컴포넌트
 */
const EventPopup: React.FC<EventPopupProps> = ({
  eventData,
  gameId,
  onSelectChoice,
  onComplete,
  isProcessing = false,
  error = null,
}) => {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  /**
   * 팝업 열릴 때 포커스 관리
   */
  useEffect(() => {
    if (popupRef.current) {
      const firstButton = popupRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, []);

  /**
   * ESC 키 무시 (선택 강제)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * 선택지 선택 핸들러
   */
  const handleSelectChoice = async (choiceId: string) => {
    if (isProcessing) return;

    setSelectedChoiceId(choiceId);

    try {
      await onSelectChoice(choiceId);
      onComplete?.();
    } catch (err) {
      console.error('Event choice execution failed:', err);
      // 에러는 부모 컴포넌트에서 관리
    }
  };

  /**
   * 재시도 핸들러
   */
  const handleRetry = () => {
    if (selectedChoiceId) {
      handleSelectChoice(selectedChoiceId);
    }
  };

  return (
    <>
      {/* 배경 블러 오버레이 */}
      <div className={styles.backdrop} aria-hidden="true" />

      {/* 팝업 컨테이너 */}
      <div className={styles.popupContainer}>
        <div
          ref={popupRef}
          className={styles.popup}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-title"
          aria-describedby="event-description"
        >
          {/* 로딩 오버레이 */}
          {isProcessing && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
                선택을 처리하는 중...
              </p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className={styles.errorContainer}>
              <div className={styles.errorMessage}>
                ⚠️ {error}
              </div>
              <button
                onClick={handleRetry}
                className={styles.retryButton}
              >
                다시 시도
              </button>
            </div>
          )}

          {/* 헤더 */}
          <div className={styles.header}>
            <EventHeader eventType={eventData.eventType} />
          </div>

          {/* 본문 */}
          <div className={styles.content}>
            <EventContent
              title={eventData.title}
              description={eventData.eventText}
            />
          </div>

          {/* 선택지 목록 */}
          <div className={styles.choicesContainer}>
            <div className={styles.choicesGrid}>
              {eventData.choices.map((choice) => (
                <ChoiceButton
                  key={choice.choiceId}
                  choice={choice}
                  onSelect={handleSelectChoice}
                  isSelected={selectedChoiceId === choice.choiceId}
                  disabled={isProcessing}
                />
              ))}
            </div>
          </div>

          {/* 푸터 */}
          <div className={styles.footer}>
            <EventFooter gameId={gameId} />
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * 선택지 버튼 컴포넌트
 */
interface ChoiceButtonProps {
  choice: {
    choiceId: string;
    text: string;
    effects: {
      users?: number;
      cash?: number;
      trust?: number;
      infra?: string[];
    };
  };
  onSelect: (choiceId: string) => void;
  isSelected: boolean;
  disabled: boolean;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({
  choice,
  onSelect,
  isSelected,
  disabled,
}) => {
  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${isSelected
          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
      `}
      onClick={() => !disabled && onSelect(choice.choiceId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onSelect(choice.choiceId);
        }
      }}
    >
      {/* 선택 체크마크 */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* 선택지 텍스트 */}
      <div className="mb-3 pr-8">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
          {choice.text}
        </p>
      </div>

      {/* 효과 미리보기 */}
      <EffectPreview effects={choice.effects} compact={true} />

      {/* 선택 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onSelect(choice.choiceId);
        }}
        disabled={disabled}
        className={`
          mt-3 w-full py-2 px-4 rounded-lg font-bold transition-all duration-200
          ${isSelected
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isSelected ? '✓ 선택됨' : '이 선택지를 선택'}
      </button>
    </div>
  );
};

export default React.memo(EventPopup);
