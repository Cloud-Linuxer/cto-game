'use client';

/**
 * QuizTimer Component
 *
 * Phase 2 feature: 퀴즈 제한시간 타이머
 * - 60초 카운트다운 (커스터마이징 가능)
 * - 10초 이하 시 빨간색 펄스 경고 애니메이션
 * - 시간 초과 시 자동 제출
 * - 원형 프로그레스 인디케이터
 * - 일시정지/재개 기능
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

export interface QuizTimerProps {
  /** 제한시간 (초), 기본값 60초 */
  duration?: number;
  /** 시간 초과 시 호출되는 콜백 */
  onTimeout: () => void;
  /** 일시정지 상태 */
  isPaused: boolean;
  /** 타이머 크기 (px), 기본값 120 */
  size?: number;
  /** 경고 임계값 (초), 기본값 10초 */
  warningThreshold?: number;
}

/**
 * 퀴즈 타이머 컴포넌트
 */
const QuizTimer: React.FC<QuizTimerProps> = ({
  duration = 60,
  onTimeout,
  isPaused,
  size = 120,
  warningThreshold = 10,
}) => {
  const [remaining, setRemaining] = useState<number>(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutCalledRef = useRef<boolean>(false);

  // Progress percentage (0-100)
  const progress = (remaining / duration) * 100;
  const isWarning = remaining <= warningThreshold;

  // SVG circle calculations
  const radius = (size - 16) / 2; // 8px padding on each side
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  /**
   * 타이머 클린업
   */
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * 타이머 시작
   */
  const startTimer = useCallback(() => {
    clearTimer();

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const newRemaining = prev - 1;

        // 시간 초과 체크
        if (newRemaining <= 0) {
          clearTimer();
          if (!timeoutCalledRef.current) {
            timeoutCalledRef.current = true;
            onTimeout();
          }
          return 0;
        }

        return newRemaining;
      });
    }, 1000);
  }, [clearTimer, onTimeout]);

  /**
   * isPaused 상태에 따라 타이머 제어
   */
  useEffect(() => {
    if (!isPaused && remaining > 0) {
      startTimer();
    } else {
      clearTimer();
    }

    return () => clearTimer();
  }, [isPaused, remaining, startTimer, clearTimer]);

  /**
   * duration 변경 시 타이머 리셋
   */
  useEffect(() => {
    setRemaining(duration);
    timeoutCalledRef.current = false;
  }, [duration]);

  /**
   * 컴포넌트 언마운트 시 클린업
   */
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  /**
   * 시간 포맷팅 (MM:SS)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
        role="timer"
        aria-label={`남은 시간: ${formatTime(remaining)}`}
        aria-live="polite"
      >
        {/* SVG 원형 프로그레스 */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* 배경 원 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-200 dark:text-slate-700"
          />

          {/* 프로그레스 원 */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            className={`transition-colors duration-300 ${
              isWarning
                ? 'text-red-600 dark:text-red-500'
                : 'text-blue-600 dark:text-blue-500'
            }`}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 1s linear',
            }}
          />
        </svg>

        {/* 중앙 시간 표시 */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          animate={isWarning ? { scale: [1, 1.05, 1] } : {}}
          transition={{
            repeat: isWarning ? Infinity : 0,
            duration: 1,
          }}
        >
          {/* 남은 초 */}
          <motion.div
            className={`text-4xl font-bold tabular-nums transition-colors duration-300 ${
              isWarning
                ? 'text-red-600 dark:text-red-500'
                : 'text-blue-600 dark:text-blue-500'
            }`}
            animate={isWarning ? {
              opacity: [1, 0.7, 1],
            } : {}}
            transition={{
              repeat: isWarning ? Infinity : 0,
              duration: 0.8,
            }}
          >
            {remaining}
          </motion.div>

          {/* "초" 라벨 */}
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            초
          </div>
        </motion.div>

        {/* 경고 펄스 효과 */}
        {isWarning && remaining > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-red-500"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{
              opacity: [0.8, 0],
              scale: [1, 1.2],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeOut',
            }}
          />
        )}

        {/* 일시정지 아이콘 */}
        {isPaused && remaining > 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </motion.div>
        )}

        {/* 시간 초과 표시 */}
        {remaining === 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-red-600 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            <span className="text-2xl font-bold text-white">⏰</span>
          </motion.div>
        )}
      </div>

      {/* 접근성: 스크린 리더용 시간 업데이트 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isWarning && remaining > 0 && `경고: ${remaining}초 남았습니다`}
        {remaining === 0 && '시간이 초과되었습니다'}
      </div>
    </motion.div>
  );
};

export default React.memo(QuizTimer);
