/**
 * useKeyboardNavigation Hook
 *
 * Provides keyboard navigation for event popup choices
 * - Number keys 1-4: Select choice
 * - Enter: Confirm selected choice
 * - ESC: Close popup (if allowed)
 */

import { useEffect, useCallback, useRef } from 'react';

export interface UseKeyboardNavigationOptions {
  /**
   * Number of available choices
   */
  choicesCount: number;

  /**
   * Callback when a choice is selected via keyboard
   */
  onSelectChoice: (choiceIndex: number) => void;

  /**
   * Whether keyboard navigation is enabled
   */
  enabled?: boolean;

  /**
   * Whether to allow ESC to close popup
   */
  allowEscape?: boolean;

  /**
   * Callback when ESC is pressed
   */
  onEscape?: () => void;

  /**
   * Whether the popup is currently processing a choice
   */
  isProcessing?: boolean;
}

/**
 * Custom hook for keyboard navigation in event popup
 *
 * @example
 * ```tsx
 * useKeyboardNavigation({
 *   choicesCount: 3,
 *   onSelectChoice: (index) => handleChoice(choices[index].choiceId),
 *   enabled: isOpen,
 *   allowEscape: !isProcessing,
 * });
 * ```
 */
export function useKeyboardNavigation({
  choicesCount,
  onSelectChoice,
  enabled = true,
  allowEscape = false,
  onEscape,
  isProcessing = false,
}: UseKeyboardNavigationOptions) {
  // Track if handler is already registered to prevent duplicates
  const isRegistered = useRef(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if disabled or processing
      if (!enabled || isProcessing) {
        return;
      }

      // Handle number keys 1-4
      const key = event.key;
      if (/^[1-4]$/.test(key)) {
        const choiceIndex = parseInt(key, 10) - 1;

        // Only handle if choice exists
        if (choiceIndex < choicesCount) {
          event.preventDefault();
          event.stopPropagation();
          onSelectChoice(choiceIndex);
        }
        return;
      }

      // Handle ESC key
      if (key === 'Escape' && allowEscape && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }
    },
    [enabled, isProcessing, choicesCount, onSelectChoice, allowEscape, onEscape]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Prevent duplicate registration
    if (isRegistered.current) {
      return;
    }

    // Register handler
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    isRegistered.current = true;

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      isRegistered.current = false;
    };
  }, [enabled, handleKeyDown]);

  return null; // This hook doesn't return anything - it just registers listeners
}

/**
 * Get display text for keyboard shortcut
 *
 * @param index - Choice index (0-based)
 * @returns Display text like "1", "2", etc.
 */
export function getKeyboardShortcutLabel(index: number): string {
  if (index < 0 || index > 3) {
    return '';
  }
  return `${index + 1}`;
}
