/**
 * QuizSummary Component Tests
 *
 * 퀴즈 결과 요약 컴포넌트 테스트
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuizSummary, { QuizHistoryItem } from '../QuizSummary';

describe('QuizSummary Component', () => {
  const mockQuizHistory: QuizHistoryItem[] = [
    {
      quizId: 'quiz-1',
      question: 'EC2 인스턴스의 기본 가격 모델은?',
      difficulty: 'EASY',
      isCorrect: true,
      playerAnswer: '온디맨드',
      correctAnswer: '온디맨드',
    },
    {
      quizId: 'quiz-2',
      question: 'Aurora는 몇 개의 AZ에 데이터를 복제하나요?',
      difficulty: 'MEDIUM',
      isCorrect: true,
      playerAnswer: '3개',
      correctAnswer: '3개',
    },
    {
      quizId: 'quiz-3',
      question: 'EKS의 컨트롤 플레인은 몇 개의 AZ에서 실행되나요?',
      difficulty: 'HARD',
      isCorrect: false,
      playerAnswer: '2개',
      correctAnswer: '3개',
    },
    {
      quizId: 'quiz-4',
      question: 'S3 스토리지 클래스 중 가장 저렴한 것은?',
      difficulty: 'EASY',
      isCorrect: true,
      playerAnswer: 'Glacier Deep Archive',
      correctAnswer: 'Glacier Deep Archive',
    },
    {
      quizId: 'quiz-5',
      question: 'Lambda의 최대 실행 시간은?',
      difficulty: 'MEDIUM',
      isCorrect: false,
      playerAnswer: '5분',
      correctAnswer: '15분',
    },
  ];

  describe('Rendering', () => {
    it('should render component with correct title', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('📊 퀴즈 결과 요약')).toBeInTheDocument();
    });

    it('should display correct count', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('/ 5')).toBeInTheDocument();
    });

    it('should display accuracy percentage', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      // 60% accuracy (3/5)
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });

    it('should display bonus score', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('+30')).toBeInTheDocument();
    });
  });

  describe('Difficulty Breakdown', () => {
    it('should display difficulty breakdown section', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('🎯 난이도별 분석')).toBeInTheDocument();
    });

    it('should display EASY difficulty stats', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('쉬움')).toBeInTheDocument();
      // 2 EASY questions, 2 correct
      const easyStats = screen.getByText((content, element) => {
        return element?.textContent === '정답: 2 / 2';
      });
      expect(easyStats).toBeInTheDocument();
    });

    it('should display MEDIUM difficulty stats', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('보통')).toBeInTheDocument();
      // 2 MEDIUM questions, 1 correct
      const mediumStats = screen.getByText((content, element) => {
        return element?.textContent === '정답: 1 / 2';
      });
      expect(mediumStats).toBeInTheDocument();
    });

    it('should display HARD difficulty stats', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('어려움')).toBeInTheDocument();
      // 1 HARD question, 0 correct
      const hardStats = screen.getByText((content, element) => {
        return element?.textContent === '정답: 0 / 1';
      });
      expect(hardStats).toBeInTheDocument();
    });
  });

  describe('Quiz List', () => {
    it('should display quiz details section', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('📝 퀴즈 상세 결과')).toBeInTheDocument();
    });

    it('should display all quiz questions', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      mockQuizHistory.forEach((quiz) => {
        expect(screen.getByText(quiz.question)).toBeInTheDocument();
      });
    });

    it('should show correct/incorrect icons', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      // 3 correct (✅), 2 incorrect (❌)
      const correctIcons = screen.getAllByText('✅');
      const incorrectIcons = screen.getAllByText('❌');

      expect(correctIcons).toHaveLength(3);
      expect(incorrectIcons).toHaveLength(2);
    });

    it('should display player answers', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('온디맨드')).toBeInTheDocument();
      expect(screen.getByText('3개')).toBeInTheDocument();
      expect(screen.getByText('2개')).toBeInTheDocument();
    });

    it('should display correct answers for incorrect quizzes', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      // For incorrect quiz #3 (EKS question)
      const correctAnswers = screen.getAllByText('3개');
      // Should appear twice: once as player answer (quiz-2), once as correct answer (quiz-3)
      expect(correctAnswers.length).toBeGreaterThanOrEqual(2);

      // For incorrect quiz #5 (Lambda question)
      expect(screen.getByText('15분')).toBeInTheDocument();
    });
  });

  describe('Accuracy Grades', () => {
    it('should display "최고" for 90%+ accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory.slice(0, 3)}
          correctCount={3}
          totalCount={3}
          bonusScore={50}
        />
      );

      expect(screen.getByText('최고')).toBeInTheDocument();
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });

    it('should display "우수" for 75-89% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory.slice(0, 4)}
          correctCount={3}
          totalCount={4}
          bonusScore={40}
        />
      );

      expect(screen.getByText('우수')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
    });

    it('should display "양호" for 60-74% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('양호')).toBeInTheDocument();
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });

    it('should display "보통" for 40-59% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={2}
          totalCount={5}
          bonusScore={20}
        />
      );

      expect(screen.getByText('보통')).toBeInTheDocument();
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });

    it('should display "노력 필요" for <40% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={1}
          totalCount={5}
          bonusScore={10}
        />
      );

      expect(screen.getByText('노력 필요')).toBeInTheDocument();
      expect(screen.getByText('20.0%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty quiz history', () => {
      render(
        <QuizSummary
          quizHistory={[]}
          correctCount={0}
          totalCount={0}
          bonusScore={0}
        />
      );

      expect(screen.getByText('퀴즈 기록이 없습니다.')).toBeInTheDocument();
    });

    it('should handle zero accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={0}
          totalCount={5}
          bonusScore={0}
        />
      );

      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should truncate long questions', () => {
      const longQuestion = 'A'.repeat(100); // 100 characters
      const longQuizHistory: QuizHistoryItem[] = [
        {
          quizId: 'quiz-long',
          question: longQuestion,
          difficulty: 'EASY',
          isCorrect: true,
          playerAnswer: 'Answer',
          correctAnswer: 'Answer',
        },
      ];

      render(
        <QuizSummary
          quizHistory={longQuizHistory}
          correctCount={1}
          totalCount={1}
          bonusScore={10}
        />
      );

      // Should be truncated to 60 chars + '...'
      const truncatedText = screen.getByText((content) => {
        return content.endsWith('...');
      });
      expect(truncatedText).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
          className="custom-class"
        />
      );

      const summaryDiv = container.firstChild;
      expect(summaryDiv).toHaveClass('custom-class');
    });
  });

  describe('Summary Messages', () => {
    it('should display appropriate message for 90%+ accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory.slice(0, 3)}
          correctCount={3}
          totalCount={3}
          bonusScore={50}
        />
      );

      expect(screen.getByText('놀라운 성과입니다! 퀴즈 마스터입니다! 🎉')).toBeInTheDocument();
    });

    it('should display appropriate message for 75-89% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory.slice(0, 4)}
          correctCount={3}
          totalCount={4}
          bonusScore={40}
        />
      );

      expect(screen.getByText('훌륭합니다! AWS 지식이 뛰어나시네요! 🌟')).toBeInTheDocument();
    });

    it('should display appropriate message for 60-74% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={3}
          totalCount={5}
          bonusScore={30}
        />
      );

      expect(screen.getByText('잘 하셨습니다! 계속 학습하세요! 👏')).toBeInTheDocument();
    });

    it('should display appropriate message for 40-59% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={2}
          totalCount={5}
          bonusScore={20}
        />
      );

      expect(screen.getByText('좋은 시작입니다! 조금 더 공부해보세요! 📖')).toBeInTheDocument();
    });

    it('should display appropriate message for <40% accuracy', () => {
      render(
        <QuizSummary
          quizHistory={mockQuizHistory}
          correctCount={1}
          totalCount={5}
          bonusScore={10}
        />
      );

      expect(screen.getByText('괜찮습니다! 다시 도전하면 더 잘할 수 있어요! 💪')).toBeInTheDocument();
    });
  });
});
