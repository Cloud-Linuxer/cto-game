/**
 * useEventPerformance Hook
 *
 * Monitors performance metrics for event popup rendering and interactions
 */

import { useEffect, useRef, useCallback } from 'react';

export interface EventPerformanceMetrics {
  /**
   * Time from popup open to first render (ms)
   */
  timeToFirstRender: number;

  /**
   * Time from choice selection to API response (ms)
   */
  choiceResponseTime: number;

  /**
   * Time from API response to popup close (ms)
   */
  timeToClose: number;

  /**
   * Total event interaction time (ms)
   */
  totalInteractionTime: number;

  /**
   * Event ID
   */
  eventId: string;
}

export interface UseEventPerformanceOptions {
  /**
   * Event ID for tracking
   */
  eventId?: string;

  /**
   * Whether to enable performance monitoring
   */
  enabled?: boolean;

  /**
   * Callback when metrics are collected
   */
  onMetricsCollected?: (metrics: EventPerformanceMetrics) => void;
}

/**
 * Custom hook for monitoring event popup performance
 *
 * @example
 * ```tsx
 * const { startChoiceTimer, recordChoiceComplete, recordPopupClose } = useEventPerformance({
 *   eventId: currentEvent?.eventId,
 *   enabled: true,
 *   onMetricsCollected: (metrics) => {
 *     console.log('Event performance:', metrics);
 *     // Send to analytics service
 *   },
 * });
 * ```
 */
export function useEventPerformance({
  eventId,
  enabled = false,
  onMetricsCollected,
}: UseEventPerformanceOptions = {}) {
  const openTimestamp = useRef<number>(0);
  const firstRenderTimestamp = useRef<number>(0);
  const choiceStartTimestamp = useRef<number>(0);
  const choiceCompleteTimestamp = useRef<number>(0);

  // Record popup open time
  useEffect(() => {
    if (enabled && eventId) {
      openTimestamp.current = performance.now();
      firstRenderTimestamp.current = 0;
      choiceStartTimestamp.current = 0;
      choiceCompleteTimestamp.current = 0;

      // Record first render after paint
      requestAnimationFrame(() => {
        firstRenderTimestamp.current = performance.now();
      });
    }
  }, [enabled, eventId]);

  /**
   * Start timer for choice selection
   */
  const startChoiceTimer = useCallback(() => {
    if (enabled) {
      choiceStartTimestamp.current = performance.now();
    }
  }, [enabled]);

  /**
   * Record choice API completion
   */
  const recordChoiceComplete = useCallback(() => {
    if (enabled) {
      choiceCompleteTimestamp.current = performance.now();
    }
  }, [enabled]);

  /**
   * Record popup close and collect metrics
   */
  const recordPopupClose = useCallback(() => {
    if (!enabled || !eventId || !onMetricsCollected) {
      return;
    }

    const closeTimestamp = performance.now();

    // Calculate metrics
    const metrics: EventPerformanceMetrics = {
      timeToFirstRender:
        firstRenderTimestamp.current > 0
          ? firstRenderTimestamp.current - openTimestamp.current
          : 0,
      choiceResponseTime:
        choiceStartTimestamp.current > 0 && choiceCompleteTimestamp.current > 0
          ? choiceCompleteTimestamp.current - choiceStartTimestamp.current
          : 0,
      timeToClose:
        choiceCompleteTimestamp.current > 0
          ? closeTimestamp - choiceCompleteTimestamp.current
          : 0,
      totalInteractionTime: closeTimestamp - openTimestamp.current,
      eventId,
    };

    // Call callback with metrics
    onMetricsCollected(metrics);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[EventPerformance]', metrics);
    }
  }, [enabled, eventId, onMetricsCollected]);

  return {
    startChoiceTimer,
    recordChoiceComplete,
    recordPopupClose,
  };
}

/**
 * Helper to send metrics to analytics service
 *
 * @example
 * ```tsx
 * useEventPerformance({
 *   eventId: currentEvent?.eventId,
 *   enabled: true,
 *   onMetricsCollected: sendEventMetrics,
 * });
 * ```
 */
export function sendEventMetrics(metrics: EventPerformanceMetrics) {
  // Example: Send to your analytics service
  // analytics.track('event_performance', metrics);

  // For now, just log warnings if metrics are poor
  if (metrics.timeToFirstRender > 300) {
    console.warn(
      `[EventPerformance] Slow first render: ${metrics.timeToFirstRender}ms for ${metrics.eventId}`
    );
  }

  if (metrics.choiceResponseTime > 1000) {
    console.warn(
      `[EventPerformance] Slow API response: ${metrics.choiceResponseTime}ms for ${metrics.eventId}`
    );
  }
}
