/**
 * EventPopup Lazy Loading Wrapper
 *
 * Enables code splitting for EventPopup component
 * Reduces initial bundle size by loading popup only when needed
 */

'use client';

import React, { Suspense, lazy } from 'react';
import type { EventPopupProps } from './EventPopup';

// Lazy load EventPopup component
const EventPopupComponent = lazy(() => import('./EventPopup'));

/**
 * Loading fallback component
 */
const EventPopupSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Loading skeleton */}
      <div className="relative w-full max-w-3xl mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3" />

          {/* Content skeleton */}
          <div className="space-y-3">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-4/6" />
          </div>

          {/* Choices skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lazy-loaded EventPopup with suspense boundary
 *
 * Usage:
 * ```tsx
 * import EventPopup from '@/components/EventPopup/EventPopupLazy';
 *
 * // Use exactly like the regular EventPopup
 * <EventPopup eventData={...} gameId={...} onSelectChoice={...} />
 * ```
 */
const EventPopupLazy: React.FC<EventPopupProps> = (props) => {
  return (
    <Suspense fallback={<EventPopupSkeleton />}>
      <EventPopupComponent {...props} />
    </Suspense>
  );
};

export default EventPopupLazy;
