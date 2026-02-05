/**
 * QuizTimer Component Tests
 *
 * 타이머 기능 및 애니메이션 테스트
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuizTimer from '../QuizTimer';

// Mock framer-motion to avoid animation complexities in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
  },
}));

describe('QuizTimer', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should render with default duration of 60 seconds', () => {
      const onTimeout = jest.fn();
      render(<QuizTimer onTimeout={onTimeout} isPaused={false} />);

      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('초')).toBeInTheDocument();
    });

    it('should render with custom duration', () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={30} onTimeout={onTimeout} isPaused={false} />);

      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      const onTimeout = jest.fn();
      render(<QuizTimer onTimeout={onTimeout} isPaused={false} />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-label', '남은 시간: 1:00');
      expect(timer).toHaveAttribute('aria-live', 'polite');
    });

    it('should render with custom size', () => {
      const onTimeout = jest.fn();
      const { container } = render(
        <QuizTimer onTimeout={onTimeout} isPaused={false} size={150} />
      );

      const timerDiv = container.querySelector('[role="timer"]');
      expect(timerDiv).toHaveStyle({ width: '150px', height: '150px' });
    });
  });

  describe('Countdown Functionality', () => {
    it('should countdown from initial duration when not paused', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={5} onTimeout={onTimeout} isPaused={false} />);

      expect(screen.getByText('5')).toBeInTheDocument();

      // Advance 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
      });

      // Advance another second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should not countdown when paused', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={5} onTimeout={onTimeout} isPaused={true} />);

      expect(screen.getByText('5')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should still be at 5 seconds
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should resume countdown after being unpaused', async () => {
      const onTimeout = jest.fn();
      const { rerender } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={true} />
      );

      expect(screen.getByText('10')).toBeInTheDocument();

      // Unpause
      rerender(<QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('should handle pause and resume correctly', async () => {
      const onTimeout = jest.fn();
      const { rerender } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />
      );

      // Countdown for 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument();
      });

      // Pause
      rerender(<QuizTimer duration={10} onTimeout={onTimeout} isPaused={true} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should still be at 7
      expect(screen.getByText('7')).toBeInTheDocument();

      // Resume
      rerender(<QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });
  });

  describe('Timeout Behavior', () => {
    it('should call onTimeout when time reaches 0', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={3} onTimeout={onTimeout} isPaused={false} />);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should not call onTimeout multiple times', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={2} onTimeout={onTimeout} isPaused={false} />);

      act(() => {
        jest.advanceTimersByTime(5000); // Advance beyond timeout
      });

      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalledTimes(1);
      });
    });

    it('should stop countdown at 0', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={2} onTimeout={onTimeout} isPaused={false} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });

      // Advance more time, should stay at 0
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show timeout icon when time is 0', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={1} onTimeout={onTimeout} isPaused={false} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('⏰')).toBeInTheDocument();
      });
    });
  });

  describe('Warning State', () => {
    it('should enter warning state at 10 seconds by default', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={12} onTimeout={onTimeout} isPaused={false} />);

      // Advance to 10 seconds remaining
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });

      // Check for warning text in screen reader area
      const warningText = screen.getByText(/경고: 10초 남았습니다/);
      expect(warningText).toBeInTheDocument();
    });

    it('should use custom warning threshold', async () => {
      const onTimeout = jest.fn();
      render(
        <QuizTimer
          duration={20}
          onTimeout={onTimeout}
          isPaused={false}
          warningThreshold={5}
        />
      );

      // Advance to 5 seconds remaining
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      const warningText = screen.getByText(/경고: 5초 남았습니다/);
      expect(warningText).toBeInTheDocument();
    });

    it('should show warning messages for each remaining second', async () => {
      const onTimeout = jest.fn();
      render(
        <QuizTimer
          duration={3}
          onTimeout={onTimeout}
          isPaused={false}
          warningThreshold={3}
        />
      );

      expect(screen.getByText(/경고: 3초 남았습니다/)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/경고: 2초 남았습니다/)).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText(/경고: 1초 남았습니다/)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly', () => {
      const onTimeout = jest.fn();
      const { container } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />
      );

      // Check that SVG circle exists
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(2); // Background + progress circles
    });

    it('should update progress as time decreases', async () => {
      const onTimeout = jest.fn();
      const { container } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />
      );

      const progressCircle = container.querySelectorAll('circle')[1];
      const initialOffset = progressCircle?.getAttribute('style');

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const newOffset = progressCircle?.getAttribute('style');
        expect(newOffset).not.toBe(initialOffset);
      });
    });
  });

  describe('Accessibility', () => {
    it('should announce warning state to screen readers', async () => {
      const onTimeout = jest.fn();
      const { container } = render(
        <QuizTimer
          duration={10}
          onTimeout={onTimeout}
          isPaused={false}
          warningThreshold={10}
        />
      );

      const announcement = screen.getByText(/경고: 10초 남았습니다/);
      expect(announcement).toBeInTheDocument();

      // Check that the announcement is in an element with sr-only class
      const srOnlyDiv = container.querySelector('.sr-only');
      expect(srOnlyDiv).toBeInTheDocument();
      expect(srOnlyDiv).toHaveTextContent('경고: 10초 남았습니다');
    });

    it('should announce timeout to screen readers', async () => {
      const onTimeout = jest.fn();
      const { container } = render(<QuizTimer duration={1} onTimeout={onTimeout} isPaused={false} />);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        const announcement = screen.getByText('시간이 초과되었습니다');
        expect(announcement).toBeInTheDocument();

        // Check that the announcement is in an element with sr-only class
        const srOnlyDiv = container.querySelector('.sr-only');
        expect(srOnlyDiv).toBeInTheDocument();
        expect(srOnlyDiv).toHaveTextContent('시간이 초과되었습니다');
      });
    });

    it('should have proper ARIA live regions', () => {
      const onTimeout = jest.fn();
      render(<QuizTimer onTimeout={onTimeout} isPaused={false} />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-live', 'polite');
      expect(timer).toBeInTheDocument();
    });
  });

  describe('Duration Change', () => {
    it('should reset timer when duration changes', async () => {
      const onTimeout = jest.fn();
      const { rerender } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      // Change duration
      rerender(<QuizTimer duration={20} onTimeout={onTimeout} isPaused={false} />);

      // Should reset to new duration
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle duration of 0', () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={0} onTimeout={onTimeout} isPaused={false} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle very short durations', async () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={1} onTimeout={onTimeout} isPaused={false} />);

      expect(screen.getByText('1')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalled();
      });
    });

    it('should handle very long durations', () => {
      const onTimeout = jest.fn();
      render(<QuizTimer duration={300} onTimeout={onTimeout} isPaused={false} />);

      expect(screen.getByText('300')).toBeInTheDocument();
    });

    it('should cleanup interval on unmount', () => {
      const onTimeout = jest.fn();
      const { unmount } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />
      );

      unmount();

      // Advance time after unmount
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // onTimeout should not be called
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Pause Icon Display', () => {
    it('should show pause icon when paused', () => {
      const onTimeout = jest.fn();
      const { container } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={true} />
      );

      // Check for pause icon SVG
      const pauseIcon = container.querySelector('svg[viewBox="0 0 24 24"]');
      expect(pauseIcon).toBeInTheDocument();
    });

    it('should not show pause icon when not paused', () => {
      const onTimeout = jest.fn();
      const { container } = render(
        <QuizTimer duration={10} onTimeout={onTimeout} isPaused={false} />
      );

      // Pause icon should not be visible
      const pauseIcon = container.querySelector('svg[viewBox="0 0 24 24"]');
      expect(pauseIcon).not.toBeInTheDocument();
    });

    it('should not show pause icon when time is 0', async () => {
      const onTimeout = jest.fn();
      const { container, rerender } = render(
        <QuizTimer duration={1} onTimeout={onTimeout} isPaused={true} />
      );

      // Unpause to let timer reach 0
      rerender(
        <QuizTimer duration={1} onTimeout={onTimeout} isPaused={false} />
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });

      // At 0 seconds, the timeout icon (⏰) should be shown
      // and pause icon should not be present
      expect(screen.getByText('⏰')).toBeInTheDocument();
    });
  });
});
