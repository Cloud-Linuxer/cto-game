/**
 * EventPopup Unit Tests
 *
 * Tests component rendering, interaction, and state management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EventPopup from '../EventPopup';
import type { EventData } from '@/types/event.types';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock hooks
jest.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(),
  getKeyboardShortcutLabel: (index: number) => `${index + 1}`,
}));

jest.mock('@/hooks/useEventPerformance', () => ({
  useEventPerformance: () => ({
    startChoiceTimer: jest.fn(),
    recordChoiceComplete: jest.fn(),
    recordPopupClose: jest.fn(),
  }),
  sendEventMetrics: jest.fn(),
}));

// Mock sub-components
jest.mock('../EventHeader', () => ({
  __esModule: true,
  default: ({ eventType }: any) => <div data-testid="event-header">{eventType}</div>,
}));

jest.mock('../EventContent', () => ({
  __esModule: true,
  default: ({ title, description }: any) => (
    <div data-testid="event-content">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

jest.mock('../EventFooter', () => ({
  __esModule: true,
  default: ({ gameId }: any) => <div data-testid="event-footer">{gameId}</div>,
}));

jest.mock('../EffectPreview', () => ({
  __esModule: true,
  default: ({ effects }: any) => (
    <div data-testid="effect-preview">{JSON.stringify(effects)}</div>
  ),
}));

// Mock CSS module
jest.mock('../EventPopup.module.css', () => ({
  backdrop: 'backdrop',
  popupContainer: 'popupContainer',
  popup: 'popup',
  loadingOverlay: 'loadingOverlay',
  spinner: 'spinner',
  errorContainer: 'errorContainer',
  errorMessage: 'errorMessage',
  retryButton: 'retryButton',
  header: 'header',
  content: 'content',
  choicesContainer: 'choicesContainer',
  choicesGrid: 'choicesGrid',
  footer: 'footer',
}));

describe('EventPopup', () => {
  const mockEventData: EventData = {
    eventId: 'test-event-001',
    eventType: 'CRISIS',
    eventText: 'AWS 리전 장애가 발생했습니다!',
    title: '위기 상황',
    choices: [
      {
        choiceId: 'choice-1',
        text: '멀티 리전 긴급 구축',
        effects: {
          cash: -50000000,
          trust: 15,
          infra: ['multi-region'],
        },
      },
      {
        choiceId: 'choice-2',
        text: '복구 대기',
        effects: {
          users: -30000,
          trust: -40,
        },
      },
    ],
  };

  const mockOnSelectChoice = jest.fn().mockResolvedValue(undefined);
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render event popup with all components', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      expect(screen.getByTestId('event-header')).toBeInTheDocument();
      expect(screen.getByTestId('event-content')).toBeInTheDocument();
      expect(screen.getByTestId('event-footer')).toBeInTheDocument();
    });

    it('should render all choices', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      expect(screen.getByText('멀티 리전 긴급 구축')).toBeInTheDocument();
      expect(screen.getByText('복구 대기')).toBeInTheDocument();
    });

    it('should render keyboard shortcuts', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Choice Selection', () => {
    it('should call onSelectChoice when choice is clicked', async () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      const choiceButton = screen.getAllByText('이 선택지를 선택')[0];
      fireEvent.click(choiceButton);

      await waitFor(() => {
        expect(mockOnSelectChoice).toHaveBeenCalledWith('choice-1');
      });
    });

    it('should show selected state after clicking', async () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      const choiceButton = screen.getAllByText('이 선택지를 선택')[0];
      fireEvent.click(choiceButton);

      await waitFor(() => {
        expect(screen.getByText('✓ 선택됨')).toBeInTheDocument();
      });
    });

    it('should call onComplete after successful selection', async () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
          onComplete={mockOnComplete}
        />
      );

      const choiceButton = screen.getAllByText('이 선택지를 선택')[0];
      fireEvent.click(choiceButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('should not allow selection when processing', async () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
          isProcessing={true}
        />
      );

      const choiceButton = screen.getAllByText('이 선택지를 선택')[0];
      fireEvent.click(choiceButton);

      await waitFor(() => {
        expect(mockOnSelectChoice).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading overlay when processing', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
          isProcessing={true}
        />
      );

      expect(screen.getByText('선택을 처리하는 중...')).toBeInTheDocument();
    });

    it('should disable all buttons when processing', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
          isProcessing={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
          error="네트워크 오류가 발생했습니다"
        />
      );

      expect(screen.getByText(/네트워크 오류가 발생했습니다/)).toBeInTheDocument();
    });

    it('should show retry button when error occurs', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
          error="네트워크 오류가 발생했습니다"
        />
      );

      expect(screen.getByText('다시 시도')).toBeInTheDocument();
    });

    it('should retry last choice when retry button is clicked', async () => {
      const { rerender } = render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      // First, select a choice
      const choiceButton = screen.getAllByText('이 선택지를 선택')[0];
      fireEvent.click(choiceButton);

      await waitFor(() => {
        expect(mockOnSelectChoice).toHaveBeenCalledTimes(1);
      });

      // Then show error
      rerender(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
          error="네트워크 오류"
        />
      );

      // Click retry
      const retryButton = screen.getByText('다시 시도');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockOnSelectChoice).toHaveBeenCalledTimes(2);
        expect(mockOnSelectChoice).toHaveBeenLastCalledWith('choice-1');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'event-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'event-description');
    });

    it('should support keyboard navigation for choices', async () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      const choiceButtons = screen.getAllByRole('button');
      const firstChoice = choiceButtons[1]; // Skip retry button if present

      // Test Enter key
      fireEvent.keyDown(firstChoice, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSelectChoice).toHaveBeenCalled();
      });
    });

    it('should support space key for selection', async () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      const choiceButtons = screen.getAllByRole('button');
      const firstChoice = choiceButtons[1];

      fireEvent.keyDown(firstChoice, { key: ' ' });

      await waitFor(() => {
        expect(mockOnSelectChoice).toHaveBeenCalled();
      });
    });
  });

  describe('Effect Preview', () => {
    it('should render effect previews for all choices', () => {
      render(
        <EventPopup
          eventData={mockEventData}
          gameId="test-game-123"
          onSelectChoice={mockOnSelectChoice}
        />
      );

      const effectPreviews = screen.getAllByTestId('effect-preview');
      expect(effectPreviews).toHaveLength(2);
    });
  });
});
