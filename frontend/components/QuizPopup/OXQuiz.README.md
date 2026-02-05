# OXQuiz Component

**Task #18: Create OXQuiz component**

O/X (True/False) 퀴즈 컴포넌트 - EPIC-07 LLM 기반 AWS 퀴즈 시스템

## Overview

사용자가 O(참) 또는 X(거짓)을 선택하는 간단한 퀴즈 UI 컴포넌트입니다. 대형 버튼, 시각적 피드백, 접근성 기능을 포함합니다.

## Features

- ✅ 대형 O/X 버튼 (아이콘 + 레이블)
- ✅ 3가지 색상 피드백 시스템
  - 정답: 초록색 (bg-green-500)
  - 오답: 빨간색 (bg-red-500)
  - 미선택: 회색 (bg-gray-200)
- ✅ Hover 스케일 애니메이션 (hover:scale-105)
- ✅ 키보드 네비게이션 (Enter, Space)
- ✅ ARIA 레이블 및 접근성 지원
- ✅ 결과 표시 및 정답 안내 메시지

## Installation

```bash
# Component is already installed in the project
# Located at: frontend/components/QuizPopup/OXQuiz.tsx
```

## Props

```typescript
interface OXQuizProps {
  question: string;                           // 퀴즈 질문 텍스트
  selectedAnswer: 'true' | 'false' | null;    // 사용자 선택 답변
  correctAnswer?: 'true' | 'false';           // 정답 (제출 후에만 제공)
  onSelect: (answer: 'true' | 'false') => void; // 답변 선택 핸들러
  disabled: boolean;                          // 버튼 비활성화 여부
  showResult: boolean;                        // 결과 표시 여부
}
```

## Basic Usage

```tsx
import { OXQuiz } from '@/components/QuizPopup';
import { useState } from 'react';

function QuizExample() {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer: 'true' | 'false' = 'false';

  return (
    <OXQuiz
      question="AWS EC2는 서버리스 컴퓨팅 서비스이다."
      selectedAnswer={selectedAnswer}
      correctAnswer={showResult ? correctAnswer : undefined}
      onSelect={setSelectedAnswer}
      disabled={false}
      showResult={showResult}
    />
  );
}
```

## Advanced Examples

### 1. With Submit Button

```tsx
function QuizWithSubmit() {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer: 'true' | 'false' = 'true';

  const handleSubmit = () => {
    setShowResult(true);
  };

  return (
    <div>
      <OXQuiz
        question="Amazon Aurora는 MySQL 및 PostgreSQL과 호환된다."
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={setSelectedAnswer}
        disabled={false}
        showResult={showResult}
      />

      {!showResult && (
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-lg"
        >
          제출하기
        </button>
      )}
    </div>
  );
}
```

### 2. With Timer

```tsx
function TimedQuiz() {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (showResult || timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResult, timeLeft]);

  return (
    <div>
      <div className="mb-4 text-2xl font-bold">⏱️ {timeLeft}초</div>
      <OXQuiz
        question="AWS Lambda는 서버리스 컴퓨팅 서비스이다."
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? 'true' : undefined}
        onSelect={setSelectedAnswer}
        disabled={timeLeft === 0}
        showResult={showResult}
      />
    </div>
  );
}
```

### 3. With Rewards

```tsx
function QuizWithRewards() {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const correctAnswer: 'true' | 'false' = 'false';
  const isCorrect = selectedAnswer === correctAnswer;

  return (
    <div>
      <OXQuiz
        question="Amazon S3는 블록 스토리지 서비스이다."
        selectedAnswer={selectedAnswer}
        correctAnswer={showResult ? correctAnswer : undefined}
        onSelect={setSelectedAnswer}
        disabled={false}
        showResult={showResult}
      />

      {showResult && isCorrect && (
        <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-green-50 rounded-lg">
          <h4 className="font-bold text-center text-lg mb-3">🎉 보상 획득!</h4>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+50,000원</div>
              <div className="text-sm text-slate-600">현금</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">+2</div>
              <div className="text-sm text-slate-600">신뢰도</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. API Integration

```tsx
async function submitQuizAnswer(questionId: string, answer: 'true' | 'false') {
  const response = await fetch('/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, answer }),
  });
  return response.json();
}

function QuizWithAPI() {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<'true' | 'false'>();

  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    setIsSubmitting(true);
    try {
      const result = await submitQuizAnswer('q1', selectedAnswer);
      setCorrectAnswer(result.correctAnswer);
      setShowResult(true);
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OXQuiz
      question="AWS CloudFront는 CDN 서비스이다."
      selectedAnswer={selectedAnswer}
      correctAnswer={correctAnswer}
      onSelect={setSelectedAnswer}
      disabled={isSubmitting}
      showResult={showResult}
    />
  );
}
```

## Visual States

### 1. Initial State (No Selection)
- Both buttons: Gray background (bg-gray-100)
- Hover effect: Slightly darker gray + scale(1.05)

### 2. Selected State (Before Result)
- Selected button: Indigo background (bg-indigo-100)
- Selected button border: Indigo (border-indigo-500)
- Unselected button: Default gray

### 3. Result State (After Submission)
- **Correct Answer Button**: Green (bg-green-500, text-white)
- **Wrong Answer Button** (if selected): Red (bg-red-500, text-white)
- **Unselected Button**: Gray (bg-gray-200)

### 4. Feedback Messages
- **Correct**: 🎉 정답입니다! (Green text)
- **Incorrect**: ❌ 오답입니다. 정답은 X입니다. (Red text)

## Accessibility Features

### ARIA Attributes
- `aria-label`: "참 (True)" / "거짓 (False)"
- `aria-pressed`: true/false based on selection
- Disabled state properly communicated to screen readers

### Keyboard Navigation
- **Tab**: Move between O and X buttons
- **Enter/Space**: Select the focused button
- All interactions work without mouse

### Visual Accessibility
- High contrast colors for result feedback
- Large button size (py-6) for easy clicking
- Clear icon symbols (✓ and ✗)
- Text labels in both Korean and English

## Component Structure

```
OXQuiz
├── Question Section (mb-8)
│   └── h3.text-xl.font-bold: Question text
├── Buttons Grid (grid-cols-2 gap-4)
│   ├── O (True) Button
│   │   ├── Icon: ✓ (text-5xl)
│   │   ├── Label: "참 (True)"
│   │   └── Result: "정답!" (if correct)
│   └── X (False) Button
│       ├── Icon: ✗ (text-5xl)
│       ├── Label: "거짓 (False)"
│       └── Result: "정답!" (if correct)
└── Result Feedback (mt-6)
    └── Success/Failure message
```

## Styling

### TailwindCSS Classes
- **Layout**: `grid grid-cols-2 gap-4`
- **Buttons**: `py-6 px-8 rounded-xl text-xl font-bold`
- **Icons**: `text-5xl font-black`
- **Transitions**: `transition-all duration-200`
- **Hover**: `hover:scale-105` (when enabled)

### Color Scheme
- **Neutral**: Gray (100, 200, 300)
- **Selected**: Indigo (100, 500, 900)
- **Correct**: Green (400, 500, 600)
- **Wrong**: Red (400, 500, 600)

## Testing

The component has comprehensive test coverage (29 tests):

```bash
# Run tests
npm test -- components/QuizPopup/__tests__/OXQuiz.test.tsx

# Test coverage
- Rendering: 4 tests
- User Interactions: 4 tests
- Keyboard Navigation: 3 tests
- Visual Feedback: 6 tests
- Accessibility: 4 tests
- Edge Cases: 4 tests
- Component Memoization: 1 test
```

### Test Categories
1. **Rendering**: Question, buttons, icons, labels
2. **User Interactions**: Click handlers, disabled states
3. **Keyboard Navigation**: Enter, Space key support
4. **Visual Feedback**: Color states for selection/results
5. **Accessibility**: ARIA labels, keyboard support
6. **Edge Cases**: Long text, null states, rapid clicks
7. **Performance**: React.memo optimization

## Performance

- **React.memo**: Component is memoized for optimal re-renders
- **Minimal re-renders**: Only updates when props change
- **CSS transitions**: Hardware-accelerated animations
- **Lightweight**: No external dependencies beyond React

## Files

```
frontend/components/QuizPopup/
├── OXQuiz.tsx                    # Main component
├── OXQuiz.README.md              # This documentation
├── OXQuiz.USAGE_EXAMPLE.tsx      # 5 usage examples
├── __tests__/
│   └── OXQuiz.test.tsx           # 29 test cases
└── index.ts                      # Barrel export
```

## Related Components (Upcoming)

- **QuizPopup**: Main quiz popup container (Task #19)
- **MultipleChoiceQuiz**: 4-choice quiz UI (Task #20)
- **QuizResult**: Result display component (Task #21)
- **QuizSummary**: Quiz history summary (Task #22)

## Integration with Backend

Expected API structure:

```typescript
// POST /api/quiz/submit
interface SubmitQuizRequest {
  gameId: string;
  questionId: string;
  answer: 'true' | 'false';
}

interface SubmitQuizResponse {
  correct: boolean;
  correctAnswer: 'true' | 'false';
  explanation?: string;
  rewards?: {
    cash: number;
    trust: number;
  };
}
```

## Status

- ✅ Component implemented
- ✅ Tests passing (29/29)
- ✅ Documentation complete
- ✅ Usage examples provided
- ✅ Accessibility verified
- ✅ Task #18 COMPLETE

## Next Steps

1. Task #19: Create QuizPopup main container
2. Task #20: Create MultipleChoiceQuiz component
3. Task #21: Create QuizResult component
4. Task #22: Create QuizSummary component
5. Integrate with backend API endpoints

---

**Created**: 2026-02-05
**EPIC**: EPIC-07 LLM 기반 AWS 퀴즈 시스템
**Task**: #18 - Create OXQuiz component
