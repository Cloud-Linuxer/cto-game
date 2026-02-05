/**
 * QuizPopup Component Tests
 *
 * EPIC-07 Feature 5: Quiz UI Components - Task #16
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuizPopup from '../QuizPopup';
import type { Quiz } from '@/types/quiz.types';

describe('QuizPopup Component', () => {
  const mockMultipleChoiceQuiz: Quiz = {
    quizId: 'test-quiz-1',
    type: 'MULTIPLE_CHOICE',
    difficulty: 'EASY',
    question: 'EC2는 어떤 AWS 서비스인가?',
    options: [
      '가상 서버 컴퓨팅 서비스',
      '데이터베이스 서비스',
      '스토리지 서비스',
      '네트워킹 서비스',
    ],
  };

  const mockOXQuiz: Quiz = {
    quizId: 'test-quiz-2',
    type: 'OX',
    difficulty: 'MEDIUM',
    question: 'S3는 객체 스토리지 서비스이다.',
  };

  const defaultProps = {
    isOpen: true,
    quiz: mockMultipleChoiceQuiz,
    selectedAnswer: null,
    hasSubmitted: false,
    isCorrect: null,
    onSelectAnswer: jest.fn(),
    onSubmit: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <QuizPopup {...defaultProps} isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should not render when quiz is null', () => {
      const { container } = render(
        <QuizPopup {...defaultProps} quiz={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render quiz popup when isOpen is true and quiz exists', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('AWS 퀴즈')).toBeInTheDocument();
      expect(screen.getByText('EC2는 어떤 AWS 서비스인가?')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<QuizPopup {...defaultProps} />);
      const closeButton = screen.getByLabelText('퀴즈 닫기');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render difficulty badge', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('⭐ 쉬움')).toBeInTheDocument();
    });
  });

  describe('Multiple Choice Quiz', () => {
    it('should render 4지선다 type label', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('4지선다')).toBeInTheDocument();
    });

    it('should render all 4 options', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('가상 서버 컴퓨팅 서비스')).toBeInTheDocument();
      expect(screen.getByText('데이터베이스 서비스')).toBeInTheDocument();
      expect(screen.getByText('스토리지 서비스')).toBeInTheDocument();
      expect(screen.getByText('네트워킹 서비스')).toBeInTheDocument();
    });

    it('should render option letters (A, B, C, D)', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('should call onSelectAnswer when an option is clicked', () => {
      render(<QuizPopup {...defaultProps} />);
      const optionButton = screen.getByText('가상 서버 컴퓨팅 서비스').closest('div[role="button"]');
      if (optionButton) {
        fireEvent.click(optionButton);
        expect(defaultProps.onSelectAnswer).toHaveBeenCalledWith('A');
      }
    });

    it('should highlight selected option', () => {
      render(<QuizPopup {...defaultProps} selectedAnswer="B" />);
      const optionB = screen.getByText('B');
      expect(optionB).toHaveClass('bg-blue-500');
    });
  });

  describe('OX Quiz', () => {
    const oxProps = {
      ...defaultProps,
      quiz: mockOXQuiz,
    };

    it('should render OX 퀴즈 type label', () => {
      render(<QuizPopup {...oxProps} />);
      expect(screen.getByText('OX 퀴즈')).toBeInTheDocument();
    });

    it('should render O and X buttons', () => {
      render(<QuizPopup {...oxProps} />);
      expect(screen.getByLabelText('참 (True)')).toBeInTheDocument();
      expect(screen.getByLabelText('거짓 (False)')).toBeInTheDocument();
    });

    it('should call onSelectAnswer with "true" when O button is clicked', () => {
      render(<QuizPopup {...oxProps} />);
      const oButton = screen.getByLabelText('참 (True)');
      fireEvent.click(oButton);
      expect(defaultProps.onSelectAnswer).toHaveBeenCalledWith('true');
    });

    it('should call onSelectAnswer with "false" when X button is clicked', () => {
      render(<QuizPopup {...oxProps} />);
      const xButton = screen.getByLabelText('거짓 (False)');
      fireEvent.click(xButton);
      expect(defaultProps.onSelectAnswer).toHaveBeenCalledWith('false');
    });

    it('should highlight selected O button', () => {
      render(<QuizPopup {...oxProps} selectedAnswer="true" />);
      const oButton = screen.getByLabelText('참 (True)');
      expect(oButton).toHaveClass('bg-indigo-100', 'border-indigo-500');
    });
  });

  describe('Submit Button', () => {
    it('should render submit button', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('제출하기')).toBeInTheDocument();
    });

    it('should disable submit button when no answer is selected', () => {
      render(<QuizPopup {...defaultProps} selectedAnswer={null} />);
      const submitButton = screen.getByText('제출하기');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when an answer is selected', () => {
      render(<QuizPopup {...defaultProps} selectedAnswer="A" />);
      const submitButton = screen.getByText('제출하기');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call onSubmit when submit button is clicked', () => {
      render(<QuizPopup {...defaultProps} selectedAnswer="A" />);
      const submitButton = screen.getByText('제출하기');
      fireEvent.click(submitButton);
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });
  });

  describe('Quiz Result Display', () => {
    it('should render result when hasSubmitted is true', () => {
      render(
        <QuizPopup
          {...defaultProps}
          hasSubmitted={true}
          isCorrect={true}
        />
      );
      expect(screen.getByText('정답입니다!')).toBeInTheDocument();
    });

    it('should render correct result message', () => {
      render(
        <QuizPopup
          {...defaultProps}
          hasSubmitted={true}
          isCorrect={true}
        />
      );
      expect(screen.getByText('정답입니다!')).toBeInTheDocument();
    });

    it('should render incorrect result message', () => {
      render(
        <QuizPopup
          {...defaultProps}
          hasSubmitted={true}
          isCorrect={false}
        />
      );
      expect(screen.getByText('오답입니다')).toBeInTheDocument();
    });

    it('should render confirmation button after submission', () => {
      render(
        <QuizPopup
          {...defaultProps}
          hasSubmitted={true}
          isCorrect={true}
        />
      );
      expect(screen.getByText('확인')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(<QuizPopup {...defaultProps} />);
      const closeButton = screen.getByLabelText('퀴즈 닫기');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<QuizPopup {...defaultProps} />);
      const backdrop = screen.getByRole('dialog').parentElement?.previousSibling as HTMLElement;
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });

    it('should call onClose when ESC key is pressed', () => {
      render(<QuizPopup {...defaultProps} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onClose when confirmation button is clicked after submission', () => {
      render(
        <QuizPopup
          {...defaultProps}
          hasSubmitted={true}
          isCorrect={true}
        />
      );
      const confirmButton = screen.getByText('확인');
      fireEvent.click(confirmButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<QuizPopup {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'quiz-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'quiz-description');
    });

    it('should have proper ARIA labels for OX quiz buttons', () => {
      const oxProps = { ...defaultProps, quiz: mockOXQuiz };
      render(<QuizPopup {...oxProps} />);
      expect(screen.getByLabelText('참 (True)')).toBeInTheDocument();
      expect(screen.getByLabelText('거짓 (False)')).toBeInTheDocument();
    });

    it('should have aria-pressed attribute on selected OX option', () => {
      const oxProps = { ...defaultProps, quiz: mockOXQuiz, selectedAnswer: 'true' };
      render(<QuizPopup {...oxProps} />);
      const optionTrue = screen.getByLabelText('참 (True)');
      expect(optionTrue).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Difficulty Badges', () => {
    it('should render EASY difficulty badge', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('⭐ 쉬움')).toBeInTheDocument();
    });

    it('should render MEDIUM difficulty badge', () => {
      const mediumQuiz: Quiz = { ...mockMultipleChoiceQuiz, difficulty: 'MEDIUM' };
      render(<QuizPopup {...defaultProps} quiz={mediumQuiz} />);
      expect(screen.getByText('⭐⭐ 보통')).toBeInTheDocument();
    });

    it('should render HARD difficulty badge', () => {
      const hardQuiz: Quiz = { ...mockMultipleChoiceQuiz, difficulty: 'HARD' };
      render(<QuizPopup {...defaultProps} quiz={hardQuiz} />);
      expect(screen.getByText('⭐⭐⭐ 어려움')).toBeInTheDocument();
    });
  });

  describe('Quiz Type Display', () => {
    it('should render correct quiz type for multiple choice', () => {
      render(<QuizPopup {...defaultProps} />);
      expect(screen.getByText('4지선다')).toBeInTheDocument();
    });

    it('should render correct quiz type for OX quiz', () => {
      const oxProps = { ...defaultProps, quiz: mockOXQuiz };
      render(<QuizPopup {...oxProps} />);
      expect(screen.getByText('OX 퀴즈')).toBeInTheDocument();
    });
  });
});
