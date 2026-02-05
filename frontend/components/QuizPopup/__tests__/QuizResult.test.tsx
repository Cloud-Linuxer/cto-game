/**
 * QuizResult Component Tests
 *
 * EPIC-07 Task #19: QuizResult UI 테스트
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuizResult from '../QuizResult';

describe('QuizResult Component', () => {
  const mockCorrectProps = {
    isCorrect: true,
    correctAnswer: 'Amazon Aurora',
    explanation:
      'Amazon Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형 데이터베이스로, 표준 MySQL보다 최대 5배 빠른 성능을 제공합니다. 고가용성과 내구성을 갖춘 엔터프라이즈급 데이터베이스입니다.',
    playerAnswer: 'Amazon Aurora',
  };

  const mockIncorrectProps = {
    isCorrect: false,
    correctAnswer: 'Amazon EKS',
    explanation:
      'Amazon EKS(Elastic Kubernetes Service)는 AWS에서 Kubernetes를 쉽게 실행할 수 있도록 하는 관리형 서비스입니다. 컨테이너화된 애플리케이션의 배포, 관리 및 확장을 자동화합니다.',
    playerAnswer: 'Amazon ECS',
  };

  describe('Rendering - Correct Answer', () => {
    it('정답 상태 배너를 표시해야 함', () => {
      render(<QuizResult {...mockCorrectProps} />);

      const banner = screen.getByText('정답입니다!');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('text-xl', 'font-bold');
    });

    it('정답 체크마크 아이콘을 표시해야 함', () => {
      render(<QuizResult {...mockCorrectProps} />);

      const checkmark = screen.getByText('✓');
      expect(checkmark).toBeInTheDocument();
    });

    it('정답을 표시해야 함', () => {
      render(<QuizResult {...mockCorrectProps} />);

      expect(screen.getByText('정답:')).toBeInTheDocument();
      expect(screen.getByText('Amazon Aurora')).toBeInTheDocument();
    });

    it('선택한 답을 표시하지 않아야 함', () => {
      render(<QuizResult {...mockCorrectProps} />);

      expect(screen.queryByText('선택한 답:')).not.toBeInTheDocument();
    });

    it('해설을 표시해야 함', () => {
      render(<QuizResult {...mockCorrectProps} />);

      expect(screen.getByText('해설')).toBeInTheDocument();
      expect(screen.getByText(mockCorrectProps.explanation)).toBeInTheDocument();
    });
  });

  describe('Rendering - Incorrect Answer', () => {
    it('오답 상태 배너를 표시해야 함', () => {
      render(<QuizResult {...mockIncorrectProps} />);

      const banner = screen.getByText('오답입니다');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('text-xl', 'font-bold');
    });

    it('오답 X 아이콘을 표시해야 함', () => {
      render(<QuizResult {...mockIncorrectProps} />);

      const xmark = screen.getByText('✗');
      expect(xmark).toBeInTheDocument();
    });

    it('정답과 선택한 답을 모두 표시해야 함', () => {
      render(<QuizResult {...mockIncorrectProps} />);

      expect(screen.getByText('정답:')).toBeInTheDocument();
      expect(screen.getByText('Amazon EKS')).toBeInTheDocument();

      expect(screen.getByText('선택한 답:')).toBeInTheDocument();
      expect(screen.getByText('Amazon ECS')).toBeInTheDocument();
    });

    it('해설을 표시해야 함', () => {
      render(<QuizResult {...mockIncorrectProps} />);

      expect(screen.getByText('해설')).toBeInTheDocument();
      expect(screen.getByText(mockIncorrectProps.explanation)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('정답인 경우 녹색 배너를 표시해야 함', () => {
      const { container } = render(<QuizResult {...mockCorrectProps} />);

      const banner = container.querySelector('.bg-green-500');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('text-white');
    });

    it('오답인 경우 빨간색 배너를 표시해야 함', () => {
      const { container } = render(<QuizResult {...mockIncorrectProps} />);

      const banner = container.querySelector('.bg-red-500');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('text-white');
    });

    it('카드 스타일이 적용되어야 함', () => {
      const { container } = render(<QuizResult {...mockCorrectProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'overflow-hidden');
    });
  });

  describe('Accessibility', () => {
    it('정답인 경우 적절한 aria-label을 가져야 함', () => {
      render(<QuizResult {...mockCorrectProps} />);

      const region = screen.getByRole('region', { name: '정답입니다' });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('오답인 경우 적절한 aria-label을 가져야 함', () => {
      render(<QuizResult {...mockIncorrectProps} />);

      const region = screen.getByRole('region', { name: '오답입니다' });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('아이콘에 aria-hidden 속성이 있어야 함', () => {
      const { container } = render(<QuizResult {...mockCorrectProps} />);

      const icon = container.querySelector('span[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Content Validation', () => {
    it('해설 텍스트가 100-500자 범위여야 함', () => {
      render(<QuizResult {...mockCorrectProps} />);

      const explanation = screen.getByText(mockCorrectProps.explanation);
      const textLength = mockCorrectProps.explanation.length;

      expect(textLength).toBeGreaterThanOrEqual(100);
      expect(textLength).toBeLessThanOrEqual(500);
    });

    it('긴 해설도 올바르게 렌더링되어야 함', () => {
      const longExplanation =
        '이것은 매우 긴 해설입니다. '.repeat(20) +
        'Amazon Web Services의 다양한 서비스들은 각각의 특성과 용도가 있으며, 올바른 선택을 위해서는 각 서비스의 특징을 정확히 이해하는 것이 중요합니다.';

      const props = {
        ...mockCorrectProps,
        explanation: longExplanation,
      };

      render(<QuizResult {...props} />);

      const explanation = screen.getByText(longExplanation);
      expect(explanation).toBeInTheDocument();
      expect(explanation).toHaveClass('leading-relaxed');
    });
  });

  describe('Edge Cases', () => {
    it('빈 문자열 처리', () => {
      const edgeCaseProps = {
        isCorrect: false,
        correctAnswer: '',
        explanation: '',
        playerAnswer: '',
      };

      render(<QuizResult {...edgeCaseProps} />);

      expect(screen.getByText('정답:')).toBeInTheDocument();
      expect(screen.getByText('선택한 답:')).toBeInTheDocument();
      expect(screen.getByText('해설')).toBeInTheDocument();
    });

    it('특수 문자 포함 텍스트 처리', () => {
      const specialCharsProps = {
        isCorrect: true,
        correctAnswer: 'Option <A> & "B"',
        explanation: 'Explanation with <tags> and "quotes" & symbols',
        playerAnswer: 'Option <A> & "B"',
      };

      render(<QuizResult {...specialCharsProps} />);

      expect(screen.getByText('Option <A> & "B"')).toBeInTheDocument();
      expect(
        screen.getByText('Explanation with <tags> and "quotes" & symbols')
      ).toBeInTheDocument();
    });
  });
});
