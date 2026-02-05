# MultipleChoiceQuiz Component

**EPIC-07 Feature 1 Task #17**

4지선다형 퀴즈 UI 컴포넌트

## Overview

`MultipleChoiceQuiz` is a React component that displays a multiple-choice quiz question with four options (A, B, C, D). It provides visual feedback for selection, answer validation, and result display with color coding.

## Features

- **Question Display**: Prominently displays the quiz question with large, bold text
- **4 Options**: Renders exactly 4 options labeled A, B, C, D
- **Visual Feedback**:
  - Selection highlighting with blue border
  - Correct answers in green
  - Wrong answers in red
  - Unselected options in gray (when showing results)
- **Keyboard Navigation**: Full keyboard support with Enter and Space keys
- **Accessibility**: ARIA attributes for screen readers
- **Disabled State**: Prevents interaction during submission or after answer reveal
- **Smooth Transitions**: Hover effects and color transitions

## Props

```typescript
interface MultipleChoiceQuizProps {
  question: string;                // Quiz question text
  options: string[];               // Array of 4 option texts
  selectedOption: string | null;   // Currently selected option ('A', 'B', 'C', 'D')
  correctAnswer?: string;          // Correct answer (only provided after submission)
  onSelect: (option: string) => void;  // Callback when option is selected
  disabled: boolean;               // Disables interaction
  showResult: boolean;             // Shows result with color coding
}
```

## Usage

### Basic Example

```tsx
import { MultipleChoiceQuiz } from '@/components/QuizPopup';
import { useState } from 'react';

function QuizPage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const question = 'AWS에서 서버리스 컴퓨팅 서비스는?';
  const options = [
    'Amazon EC2 인스턴스',
    'Amazon S3 버킷',
    'AWS Lambda 함수',
    'Amazon RDS 데이터베이스',
  ];
  const correctAnswer = 'C';

  const handleSubmit = () => {
    setShowResult(true);
  };

  return (
    <div>
      <MultipleChoiceQuiz
        question={question}
        options={options}
        selectedOption={selectedOption}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={setSelectedOption}
        disabled={showResult}
        showResult={showResult}
      />

      {!showResult && (
        <button onClick={handleSubmit} disabled={!selectedOption}>
          정답 확인
        </button>
      )}
    </div>
  );
}
```

### With Submission Flow

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (!selectedOption) return;

  setIsSubmitting(true);

  try {
    // Submit answer to backend
    await submitQuizAnswer(gameId, quizId, selectedOption);
    setShowResult(true);
  } catch (error) {
    console.error('Failed to submit answer:', error);
  } finally {
    setIsSubmitting(false);
  }
};

<MultipleChoiceQuiz
  question={question}
  options={options}
  selectedOption={selectedOption}
  correctAnswer={showResult ? correctAnswer : undefined}
  onSelect={handleSelect}
  disabled={isSubmitting || showResult}
  showResult={showResult}
/>
```

### Multiple Quiz Sequence

See `USAGE_EXAMPLE.tsx` for a complete example of handling multiple quizzes in sequence with progress tracking and scoring.

## Visual States

### Default State
- White background with gray border
- Hover effect (blue border on hover)
- Clickable cursor

### Selected State (before result)
- Blue border (2px)
- Blue badge for option letter
- Subtle shadow

### Result States

#### Correct Answer
- Green background (`bg-green-100`)
- Green border (`border-green-500`)
- Green text (`text-green-900`)
- Checkmark icon

#### Wrong Answer (selected)
- Red background (`bg-red-100`)
- Red border (`border-red-500`)
- Red text (`text-red-900`)
- X icon

#### Unselected (when showing result)
- Gray background (`bg-gray-50`)
- Gray border (`border-gray-200`)
- Gray text

### Disabled State
- Reduced opacity (75%)
- No pointer cursor
- No hover effects
- Not keyboard navigable (tabIndex=-1)

## Keyboard Support

- **Tab**: Navigate between options
- **Enter**: Select focused option
- **Space**: Select focused option
- **Numbers 1-4**: Not automatically supported (implement in parent if needed)

## Accessibility

- ARIA role: `button` for each option
- ARIA attributes:
  - `aria-pressed`: Indicates selected state
  - `aria-disabled`: Indicates disabled state
  - `aria-label`: Labels for result icons
- Keyboard navigation support
- Semantic HTML structure
- Color contrast meets WCAG 2.1 AA standards

## Testing

Comprehensive test suite with 28 tests covering:

- Rendering and layout
- Selection behavior
- Disabled state
- Result display
- Hover effects
- Accessibility
- Edge cases

Run tests:
```bash
npm test -- --testPathPattern=MultipleChoiceQuiz
```

## Styling

Built with TailwindCSS:
- Responsive padding and spacing
- Smooth color transitions
- Mobile-friendly touch targets
- Dark mode support (planned)

## Component Files

- `MultipleChoiceQuiz.tsx` - Main component
- `__tests__/MultipleChoiceQuiz.test.tsx` - Test suite
- `USAGE_EXAMPLE.tsx` - Usage examples
- `index.ts` - Barrel export

## Integration with Backend

The component expects quiz data in the following format:

```typescript
interface QuizData {
  quizId: string;
  question: string;
  options: string[];  // Must be length 4
  correctAnswer: string;  // 'A', 'B', 'C', or 'D'
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  category: string;
}
```

When submitting an answer:

```typescript
POST /api/quiz/:quizId/submit
Body: {
  selectedOption: 'A' | 'B' | 'C' | 'D'
}

Response: {
  correct: boolean;
  correctAnswer: string;
  explanation?: string;
  scoreChange: number;
}
```

## Performance

- React.memo not used (parent should memoize if needed)
- No heavy computations
- Minimal re-renders
- Event handlers are stable

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

- [ ] Dark mode support
- [ ] Animation on answer reveal
- [ ] Option shuffle support
- [ ] Image support in options
- [ ] Multi-select quiz variant
- [ ] Confidence level indicator
- [ ] Time pressure visual indicator

## Related Components

- `OXQuiz` - True/False quiz variant
- `QuizResult` - Quiz result display
- `QuizSummary` - Quiz statistics summary
- `QuizPopup` - Main quiz popup container

## License

Part of AWS 스타트업 타이쿤 project.

---

**Last Updated**: 2026-02-05
**Version**: 1.0.0
**Status**: ✅ Complete (Task #17)
