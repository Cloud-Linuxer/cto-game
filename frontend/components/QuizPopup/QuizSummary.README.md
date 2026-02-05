# QuizSummary Component

## Overview

`QuizSummary` is a comprehensive quiz results display component that shows end-game quiz performance statistics, including total score, accuracy, difficulty breakdown, and detailed quiz history.

## Features

- **Overall Statistics**: Displays correct count, accuracy percentage, and bonus score
- **Difficulty Breakdown**: Shows performance by difficulty level (EASY, MEDIUM, HARD)
- **Quiz History**: Lists all quiz questions with answers and correct/incorrect indicators
- **Visual Feedback**: Color-coded badges, progress bars, and icons for better UX
- **Accuracy Grading**: Automatic grading system based on performance
- **Responsive Design**: Mobile-first design with responsive grid layout

## Props Interface

```typescript
interface QuizHistoryItem {
  quizId: string;
  question: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isCorrect: boolean;
  playerAnswer: string;
  correctAnswer: string;
}

interface QuizSummaryProps {
  quizHistory: QuizHistoryItem[];
  correctCount: number;
  totalCount: number;
  bonusScore: number;
  className?: string;
}
```

## Usage

### Basic Usage

```typescript
import { QuizSummary } from '@/components/QuizPopup';

const MyComponent = () => {
  const quizHistory = [
    {
      quizId: 'quiz-1',
      question: 'EC2 인스턴스의 기본 가격 모델은?',
      difficulty: 'EASY',
      isCorrect: true,
      playerAnswer: '온디맨드',
      correctAnswer: '온디맨드',
    },
    // ... more quizzes
  ];

  return (
    <QuizSummary
      quizHistory={quizHistory}
      correctCount={3}
      totalCount={5}
      bonusScore={30}
    />
  );
};
```

### With Custom Styling

```typescript
<QuizSummary
  quizHistory={quizHistory}
  correctCount={3}
  totalCount={5}
  bonusScore={30}
  className="max-w-4xl mx-auto"
/>
```

## Layout Sections

### 1. Header Section
- **Title**: "📊 퀴즈 결과 요약"
- **Correct Count**: Shows "{correctCount} / {totalCount}" format
- **Accuracy**: Displays percentage with color-coded grade
- **Bonus Score**: Shows "+{bonusScore}" in green

### 2. Difficulty Breakdown
Three columns showing statistics for each difficulty level:
- **EASY**: Green badge (🟢)
- **MEDIUM**: Yellow badge (🟡)
- **HARD**: Red badge (🔴)

Each section displays:
- Total questions
- Correct answers
- Accuracy percentage
- Visual progress bar

### 3. Quiz List
Scrollable list of all quiz results:
- Question number and difficulty badge
- Question text (truncated to 60 characters)
- Player's answer (color-coded)
- Correct answer (shown for incorrect quizzes)
- Visual icon (✅ or ❌)

### 4. Summary Message
Motivational message based on accuracy:
- **90%+**: "놀라운 성과입니다! 퀴즈 마스터입니다! 🎉"
- **75-89%**: "훌륭합니다! AWS 지식이 뛰어나시네요! 🌟"
- **60-74%**: "잘 하셨습니다! 계속 학습하세요! 👏"
- **40-59%**: "좋은 시작입니다! 조금 더 공부해보세요! 📖"
- **<40%**: "괜찮습니다! 다시 도전하면 더 잘할 수 있어요! 💪"

## Accuracy Grading System

| Accuracy | Grade | Color | Emoji |
|----------|-------|-------|-------|
| 90%+ | 최고 | Green | 🏆 |
| 75-89% | 우수 | Blue | ⭐ |
| 60-74% | 양호 | Yellow | 👍 |
| 40-59% | 보통 | Orange | 📚 |
| <40% | 노력 필요 | Red | 💪 |

## Difficulty Colors

| Difficulty | Badge Color | Text Color | Icon |
|------------|-------------|------------|------|
| EASY | Green | Green-700 | 🟢 |
| MEDIUM | Yellow | Yellow-700 | 🟡 |
| HARD | Red | Red-700 | 🔴 |

## Features in Detail

### Automatic Statistics Calculation
- **Accuracy**: Calculated as `(correctCount / totalCount) * 100`
- **Difficulty Stats**: Automatically groups and calculates per-difficulty statistics
- **Progress Bars**: Visual representation of accuracy per difficulty

### Question Truncation
Long questions are automatically truncated to 60 characters with "..." appended.

### Empty State Handling
When `quizHistory` is empty, displays: "퀴즈 기록이 없습니다."

### Responsive Grid
- Desktop: 3-column grid for statistics and difficulty breakdown
- Mobile: Single column stacked layout

## Examples

See `USAGE_EXAMPLE.tsx` for comprehensive examples including:
1. Perfect Score (100%)
2. Mixed Results (60%)
3. Poor Performance (<40%)
4. Empty Quiz History
5. Long Question Text Truncation
6. All Difficulty Levels
7. Game End Screen Integration

## Testing

Run tests with:
```bash
npm test -- QuizSummary.test.tsx
```

Test coverage includes:
- Rendering with various accuracy levels
- Difficulty breakdown calculations
- Quiz list display
- Accuracy grading
- Edge cases (empty history, zero accuracy)
- Custom className application
- Summary message display

## Integration with Game End Screen

```typescript
import { QuizSummary } from '@/components/QuizPopup';

const GameEndScreen = ({ gameState }) => {
  return (
    <div>
      {/* Final Score Display */}
      <div className="text-3xl font-bold">
        최종 점수: {gameState.finalScore.toLocaleString()}
      </div>

      {/* Quiz Summary */}
      <QuizSummary
        quizHistory={gameState.quizHistory}
        correctCount={gameState.correctQuizCount}
        totalCount={gameState.totalQuizCount}
        bonusScore={gameState.quizBonus}
      />
    </div>
  );
};
```

## Styling

The component uses TailwindCSS with:
- Gradient backgrounds for statistics cards
- Border colors matching difficulty levels
- Hover effects on quiz list items
- Smooth transitions on progress bars
- Responsive padding and spacing

## Accessibility

- Semantic HTML structure
- Color-coded visual indicators
- Clear text contrast
- Icon-based feedback
- Scrollable quiz list for long histories

## Performance

- Memoized calculations using `useMemo`
- Efficient re-rendering only when props change
- Optimized for lists up to 100+ quizzes

## Browser Support

Compatible with all modern browsers supporting:
- CSS Grid
- Flexbox
- TailwindCSS utilities
- React 19

## Future Enhancements

Potential improvements:
- Export to PDF functionality
- Share to social media
- Animation on mount
- Filter by difficulty
- Sort by question number or accuracy
- Detailed analytics charts
