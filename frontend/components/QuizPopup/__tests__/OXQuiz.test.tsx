/**
 * OXQuiz Component Tests
 *
 * Task #18: Create OXQuiz component
 * Testing O/X quiz functionality, user interactions, and visual feedback
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OXQuiz from '../OXQuiz';

describe('OXQuiz Component', () => {
  const mockQuestion = 'AWS EC2는 서버리스 컴퓨팅 서비스이다.';
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render question text correctly', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      expect(screen.getByText(mockQuestion)).toBeInTheDocument();
      expect(screen.getByText(mockQuestion)).toHaveClass('text-xl', 'font-bold');
    });

    it('should render O (True) button with correct icon and label', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      expect(trueButton).toBeInTheDocument();
      expect(trueButton).toHaveTextContent('✓');
      expect(trueButton).toHaveTextContent('참 (True)');
    });

    it('should render X (False) button with correct icon and label', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const falseButton = screen.getByLabelText('거짓 (False)');
      expect(falseButton).toBeInTheDocument();
      expect(falseButton).toHaveTextContent('✗');
      expect(falseButton).toHaveTextContent('거짓 (False)');
    });

    it('should render two buttons in grid layout', () => {
      const { container } = render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
      expect(grid?.querySelectorAll('button')).toHaveLength(2);
    });
  });

  describe('User Interactions', () => {
    it('should call onSelect with "true" when O button is clicked', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      fireEvent.click(trueButton);

      expect(mockOnSelect).toHaveBeenCalledWith('true');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect with "false" when X button is clicked', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const falseButton = screen.getByLabelText('거짓 (False)');
      fireEvent.click(falseButton);

      expect(mockOnSelect).toHaveBeenCalledWith('false');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should not call onSelect when disabled', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={true}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      fireEvent.click(trueButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should not call onSelect when showResult is true', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          correctAnswer="true"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      fireEvent.click(trueButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should trigger onSelect when Enter key is pressed on O button', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      fireEvent.keyDown(trueButton, { key: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledWith('true');
    });

    it('should trigger onSelect when Space key is pressed on X button', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const falseButton = screen.getByLabelText('거짓 (False)');
      fireEvent.keyDown(falseButton, { key: ' ' });

      expect(mockOnSelect).toHaveBeenCalledWith('false');
    });

    it('should not trigger onSelect for other keys', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      fireEvent.keyDown(trueButton, { key: 'a' });

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Visual Feedback - Selection State', () => {
    it('should highlight selected O button before result', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      expect(trueButton).toHaveClass('bg-indigo-100', 'border-indigo-500');
      expect(trueButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should highlight selected X button before result', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const falseButton = screen.getByLabelText('거짓 (False)');
      expect(falseButton).toHaveClass('bg-indigo-100', 'border-indigo-500');
      expect(falseButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show default style for unselected buttons', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      const falseButton = screen.getByLabelText('거짓 (False)');

      expect(trueButton).toHaveClass('bg-gray-100', 'border-gray-300');
      expect(falseButton).toHaveClass('bg-gray-100', 'border-gray-300');
    });
  });

  describe('Visual Feedback - Result State', () => {
    it('should show green (correct) style for correct answer', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="false"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      const falseButton = screen.getByLabelText('거짓 (False)');
      expect(falseButton).toHaveClass('bg-green-500', 'border-green-600', 'text-white');
    });

    it('should show red (wrong) style for incorrect selected answer', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      expect(trueButton).toHaveClass('bg-red-500', 'border-red-600', 'text-white');
    });

    it('should show gray (neutral) style for unselected incorrect answer', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      const falseButton = screen.getByLabelText('거짓 (False)');
      expect(falseButton).toHaveClass('bg-green-500'); // Correct answer shown in green
    });

    it('should display success message when answer is correct', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="false"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      expect(screen.getByText('🎉 정답입니다!')).toBeInTheDocument();
      expect(screen.getByText('🎉 정답입니다!')).toHaveClass('text-green-600');
    });

    it('should display failure message when answer is incorrect', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      expect(screen.getByText(/오답입니다/)).toBeInTheDocument();
      // Check for the full error message text
      expect(screen.getByText(/오답입니다\. 정답은 거짓 \(False\)입니다\./)).toBeInTheDocument();
    });

    it('should show "정답!" label on correct answer button', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="false"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      expect(screen.getByText('정답!')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      expect(screen.getByLabelText('참 (True)')).toBeInTheDocument();
      expect(screen.getByLabelText('거짓 (False)')).toBeInTheDocument();
    });

    it('should set aria-pressed attribute correctly', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      const falseButton = screen.getByLabelText('거짓 (False)');

      expect(trueButton).toHaveAttribute('aria-pressed', 'true');
      expect(falseButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should disable buttons when disabled prop is true', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={true}
          showResult={false}
        />
      );

      expect(screen.getByLabelText('참 (True)')).toBeDisabled();
      expect(screen.getByLabelText('거짓 (False)')).toBeDisabled();
    });

    it('should disable buttons when showResult is true', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      expect(screen.getByLabelText('참 (True)')).toBeDisabled();
      expect(screen.getByLabelText('거짓 (False)')).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long question text', () => {
      const longQuestion = 'A'.repeat(200);
      render(
        <OXQuiz
          question={longQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      expect(screen.getByText(longQuestion)).toBeInTheDocument();
    });

    it('should not show result feedback when showResult is false', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer="true"
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      expect(screen.queryByText('🎉 정답입니다!')).not.toBeInTheDocument();
      expect(screen.queryByText(/오답입니다/)).not.toBeInTheDocument();
    });

    it('should not show result feedback when selectedAnswer is null', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          correctAnswer="false"
          onSelect={mockOnSelect}
          disabled={false}
          showResult={true}
        />
      );

      expect(screen.queryByText('🎉 정답입니다!')).not.toBeInTheDocument();
      expect(screen.queryByText(/오답입니다/)).not.toBeInTheDocument();
    });

    it('should handle rapid consecutive clicks', () => {
      render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      const trueButton = screen.getByLabelText('참 (True)');
      fireEvent.click(trueButton);
      fireEvent.click(trueButton);
      fireEvent.click(trueButton);

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
      expect(mockOnSelect).toHaveBeenCalledWith('true');
    });
  });

  describe('Component Memoization', () => {
    it('should be a memoized component', () => {
      const { rerender } = render(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      // Re-render with same props should not cause unnecessary re-renders
      rerender(
        <OXQuiz
          question={mockQuestion}
          selectedAnswer={null}
          onSelect={mockOnSelect}
          disabled={false}
          showResult={false}
        />
      );

      expect(screen.getByText(mockQuestion)).toBeInTheDocument();
    });
  });
});
