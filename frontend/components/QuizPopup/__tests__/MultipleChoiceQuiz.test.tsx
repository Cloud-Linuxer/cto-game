/**
 * MultipleChoiceQuiz Component Tests
 *
 * EPIC-07 Feature 1 Task #17
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultipleChoiceQuiz, { MultipleChoiceQuizProps } from '../MultipleChoiceQuiz';

describe('MultipleChoiceQuiz', () => {
  const mockOptions = [
    'Amazon EC2 인스턴스',
    'Amazon S3 버킷',
    'Amazon Aurora 데이터베이스',
    'AWS Lambda 함수',
  ];

  const defaultProps: MultipleChoiceQuizProps = {
    question: 'AWS에서 가장 적합한 컴퓨팅 서비스는?',
    options: mockOptions,
    selectedOption: null,
    onSelect: jest.fn(),
    disabled: false,
    showResult: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render question text prominently', () => {
      render(<MultipleChoiceQuiz {...defaultProps} />);

      const question = screen.getByText(defaultProps.question);
      expect(question).toBeInTheDocument();
      expect(question).toHaveClass('text-xl', 'font-bold');
    });

    it('should render all 4 options with labels A, B, C, D', () => {
      render(<MultipleChoiceQuiz {...defaultProps} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();

      mockOptions.forEach((option) => {
        expect(screen.getByText(option)).toBeInTheDocument();
      });
    });

    it('should render options as clickable cards', () => {
      render(<MultipleChoiceQuiz {...defaultProps} />);

      const optionCards = screen.getAllByRole('button');
      expect(optionCards).toHaveLength(4);

      optionCards.forEach((card) => {
        expect(card).toHaveAttribute('tabIndex', '0');
        expect(card).toHaveAttribute('role', 'button');
      });
    });

    it('should warn when options length is not 4', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          options={['Option 1', 'Option 2']}
        />
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'MultipleChoiceQuiz: Expected 4 options, received',
        2
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Selection Behavior', () => {
    it('should call onSelect when option is clicked', () => {
      const onSelect = jest.fn();
      render(<MultipleChoiceQuiz {...defaultProps} onSelect={onSelect} />);

      const optionB = screen.getByText('B').closest('[role="button"]');
      fireEvent.click(optionB!);

      expect(onSelect).toHaveBeenCalledWith('B');
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should show visual feedback on selection', () => {
      render(<MultipleChoiceQuiz {...defaultProps} selectedOption="B" />);

      const optionB = screen.getByText('B').closest('[role="button"]');
      expect(optionB).toHaveClass('border-blue-500', 'border-2');
    });

    it('should support keyboard navigation (Enter key)', () => {
      const onSelect = jest.fn();
      render(<MultipleChoiceQuiz {...defaultProps} onSelect={onSelect} />);

      const optionC = screen.getByText('C').closest('[role="button"]');
      fireEvent.keyDown(optionC!, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledWith('C');
    });

    it('should support keyboard navigation (Space key)', () => {
      const onSelect = jest.fn();
      render(<MultipleChoiceQuiz {...defaultProps} onSelect={onSelect} />);

      const optionD = screen.getByText('D').closest('[role="button"]');
      fireEvent.keyDown(optionD!, { key: ' ' });

      expect(onSelect).toHaveBeenCalledWith('D');
    });
  });

  describe('Disabled State', () => {
    it('should not call onSelect when disabled', () => {
      const onSelect = jest.fn();
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          onSelect={onSelect}
          disabled={true}
        />
      );

      const optionA = screen.getByText('A').closest('[role="button"]');
      fireEvent.click(optionA!);

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should apply disabled styling', () => {
      render(<MultipleChoiceQuiz {...defaultProps} disabled={true} />);

      const options = screen.getAllByRole('button');
      options.forEach((option) => {
        expect(option).toHaveClass('cursor-not-allowed', 'opacity-75');
        expect(option).toHaveAttribute('tabIndex', '-1');
        expect(option).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('should not respond to keyboard events when disabled', () => {
      const onSelect = jest.fn();
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          onSelect={onSelect}
          disabled={true}
        />
      );

      const optionA = screen.getByText('A').closest('[role="button"]');
      fireEvent.keyDown(optionA!, { key: 'Enter' });

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Result Display', () => {
    it('should show correct answer in green when showResult=true', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption="A"
          correctAnswer="A"
          showResult={true}
        />
      );

      const optionA = screen.getByText('A').closest('[role="button"]');
      expect(optionA).toHaveClass('bg-green-100', 'border-green-500', 'text-green-900');

      // Check for checkmark icon
      const checkmark = screen.getByLabelText('정답');
      expect(checkmark).toBeInTheDocument();
    });

    it('should show selected wrong answer in red when showResult=true', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption="B"
          correctAnswer="A"
          showResult={true}
        />
      );

      const optionB = screen.getByText('B').closest('[role="button"]');
      expect(optionB).toHaveClass('bg-red-100', 'border-red-500', 'text-red-900');

      // Check for X icon
      const xIcon = screen.getByLabelText('오답');
      expect(xIcon).toBeInTheDocument();
    });

    it('should show unselected options in gray when showResult=true', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption="B"
          correctAnswer="A"
          showResult={true}
        />
      );

      const optionC = screen.getByText('C').closest('[role="button"]');
      const optionD = screen.getByText('D').closest('[role="button"]');

      expect(optionC).toHaveClass('bg-gray-50', 'border-gray-200');
      expect(optionD).toHaveClass('bg-gray-50', 'border-gray-200');
    });

    it('should highlight correct answer even if not selected', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption="D"
          correctAnswer="A"
          showResult={true}
        />
      );

      const correctOption = screen.getByText('A').closest('[role="button"]');
      expect(correctOption).toHaveClass('bg-green-100', 'border-green-500');
    });
  });

  describe('Hover Effects', () => {
    it('should apply hover effect when not disabled', () => {
      render(<MultipleChoiceQuiz {...defaultProps} />);

      const optionA = screen.getByText('A').closest('[role="button"]');
      expect(optionA).toHaveClass('hover:border-blue-400');
    });

    it('should not apply hover effect when disabled', () => {
      render(<MultipleChoiceQuiz {...defaultProps} disabled={true} />);

      const optionA = screen.getByText('A').closest('[role="button"]');
      expect(optionA).not.toHaveClass('hover:border-blue-400');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MultipleChoiceQuiz {...defaultProps} selectedOption="B" />);

      const options = screen.getAllByRole('button');

      options.forEach((option, index) => {
        expect(option).toHaveAttribute('aria-pressed');
        expect(option).toHaveAttribute('aria-disabled');

        if (index === 1) {
          // Option B is selected
          expect(option).toHaveAttribute('aria-pressed', 'true');
        } else {
          expect(option).toHaveAttribute('aria-pressed', 'false');
        }
      });
    });

    it('should be keyboard navigable', () => {
      render(<MultipleChoiceQuiz {...defaultProps} />);

      const options = screen.getAllByRole('button');
      options.forEach((option) => {
        expect(option).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should have descriptive labels for result icons', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption="A"
          correctAnswer="A"
          showResult={true}
        />
      );

      const correctIcon = screen.getByLabelText('정답');
      expect(correctIcon).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have proper spacing for question section', () => {
      render(<MultipleChoiceQuiz {...defaultProps} />);

      const questionSection = screen.getByText(defaultProps.question).closest('div');
      expect(questionSection).toHaveClass('mb-6');
    });

    it('should render options in a grid layout', () => {
      const { container } = render(<MultipleChoiceQuiz {...defaultProps} />);

      const grid = container.querySelector('.grid.grid-cols-1.gap-3');
      expect(grid).toBeInTheDocument();
    });

    it('should show keyboard hint when not disabled and no result', () => {
      render(<MultipleChoiceQuiz {...defaultProps} />);

      expect(screen.getByText(/클릭하거나 키보드 번호 키를 사용하세요/)).toBeInTheDocument();
    });

    it('should hide keyboard hint when disabled', () => {
      render(<MultipleChoiceQuiz {...defaultProps} disabled={true} />);

      expect(screen.queryByText(/클릭하거나 키보드 번호 키를 사용하세요/)).not.toBeInTheDocument();
    });

    it('should hide keyboard hint when showing result', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption="A"
          correctAnswer="A"
          showResult={true}
        />
      );

      expect(screen.queryByText(/클릭하거나 키보드 번호 키를 사용하세요/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty question gracefully', () => {
      render(<MultipleChoiceQuiz {...defaultProps} question="" />);

      const questionSection = screen.getByRole('heading', { level: 3 });
      expect(questionSection).toBeInTheDocument();
      expect(questionSection).toHaveTextContent('');
    });

    it('should handle missing correctAnswer when showResult=true', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption="A"
          showResult={true}
        />
      );

      // Should not crash
      const optionA = screen.getByText('A').closest('[role="button"]');
      expect(optionA).toBeInTheDocument();
    });

    it('should handle no selection with showResult=true', () => {
      render(
        <MultipleChoiceQuiz
          {...defaultProps}
          selectedOption={null}
          correctAnswer="A"
          showResult={true}
        />
      );

      const correctOption = screen.getByText('A').closest('[role="button"]');
      expect(correctOption).toHaveClass('bg-green-100', 'border-green-500');
    });
  });
});
