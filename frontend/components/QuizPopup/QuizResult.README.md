# QuizResult Component

**EPIC-07 Task #19: QuizResult UI 구현**

정답/오답 결과를 시각적으로 표시하는 퀴즈 결과 컴포넌트입니다.

## Features

- ✅ 정답/오답 상태 배너 (녹색/빨간색)
- ✅ 정답 및 선택한 답 표시
- ✅ 해설 텍스트 표시 (100-500자, 한글)
- ✅ 페이드인 애니메이션 (Framer Motion)
- ✅ 접근성 지원 (ARIA labels, live regions)
- ✅ 다크 모드 지원
- ✅ 반응형 디자인

## Props Interface

```typescript
interface QuizResultProps {
  isCorrect: boolean;        // 정답 여부
  correctAnswer: string;     // 정답
  explanation: string;       // 해설 (100-500자 권장)
  playerAnswer: string;      // 플레이어가 선택한 답
}
```

## Usage Examples

### Basic Usage (Correct Answer)

```tsx
import { QuizResult } from '@/components/QuizPopup';

<QuizResult
  isCorrect={true}
  correctAnswer="Amazon Aurora"
  explanation="Amazon Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형 데이터베이스로, 표준 MySQL보다 최대 5배 빠른 성능을 제공합니다."
  playerAnswer="Amazon Aurora"
/>
```

### Basic Usage (Incorrect Answer)

```tsx
<QuizResult
  isCorrect={false}
  correctAnswer="Amazon EKS"
  explanation="Amazon EKS는 AWS에서 Kubernetes를 쉽게 실행할 수 있도록 하는 관리형 서비스입니다."
  playerAnswer="Amazon ECS"
/>
```

### Integration in Quiz Flow

```tsx
const [showResult, setShowResult] = useState(false);
const [quizResult, setQuizResult] = useState<QuizResultProps | null>(null);

const handleSubmitAnswer = async (answer: string) => {
  const result = await submitQuizAnswer(gameId, quizId, answer);

  setQuizResult({
    isCorrect: result.isCorrect,
    correctAnswer: result.correctAnswer,
    explanation: result.explanation,
    playerAnswer: answer,
  });

  setShowResult(true);
};

return (
  <div>
    {!showResult ? (
      <QuizQuestion onSubmit={handleSubmitAnswer} />
    ) : (
      <QuizResult {...quizResult} />
    )}
  </div>
);
```

## Layout Structure

### Correct Answer Layout

```
┌─────────────────────────────────────────────────┐
│  ✓ 정답입니다! (Green Banner)                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  정답: Amazon Aurora                            │
│                                                 │
│  해설                                           │
│  Amazon Aurora는 MySQL 및 PostgreSQL과         │
│  호환되는 완전 관리형 관계형 데이터베이스로... │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Incorrect Answer Layout

```
┌─────────────────────────────────────────────────┐
│  ✗ 오답입니다 (Red Banner)                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  정답: Amazon EKS                               │
│  선택한 답: Amazon ECS                          │
│                                                 │
│  해설                                           │
│  Amazon EKS는 AWS에서 Kubernetes를             │
│  쉽게 실행할 수 있도록 하는...                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Styling Details

### Color Scheme

**Correct Answer (정답)**:
- Banner: `bg-green-500 text-white`
- Label: `text-green-600 dark:text-green-400`

**Incorrect Answer (오답)**:
- Banner: `bg-red-500 text-white`
- Correct Label: `text-green-600 dark:text-green-400`
- Incorrect Label: `text-red-600 dark:text-red-400`

### Typography

- Banner Title: `text-xl font-bold`
- Section Labels: `text-sm font-semibold`
- Answer Text: `text-sm font-medium`
- Explanation Title: `text-base font-bold`
- Explanation Text: `text-sm leading-relaxed`

### Spacing

- Banner: `py-4 px-6`
- Card Body: `p-6`
- Answer Section Gap: `space-y-3`
- Explanation Top Margin: `mt-4`

## Animation

### Fade-in Animation (Framer Motion)

```typescript
const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5 },
  },
};
```

### Usage

```tsx
<motion.div
  variants={fadeInVariants}
  initial="hidden"
  animate="visible"
>
  {/* Component content */}
</motion.div>
```

## Accessibility

### ARIA Attributes

```tsx
<motion.div
  role="region"
  aria-live="polite"
  aria-label={isCorrect ? '정답입니다' : '오답입니다'}
>
```

### Screen Reader Support

- Status announcements via `aria-live="polite"`
- Descriptive labels for correct/incorrect status
- Decorative icons marked with `aria-hidden="true"`

### Keyboard Navigation

- Component is fully accessible via keyboard
- Focusable elements follow logical tab order
- No interactive elements (display-only component)

## Dark Mode Support

All colors have dark mode variants:

```css
/* Light Mode */
bg-white text-gray-900

/* Dark Mode */
dark:bg-slate-800 dark:text-gray-100
```

## Best Practices

### Explanation Text Guidelines

1. **Length**: 100-500 characters (Korean)
2. **Language**: Korean (한글)
3. **Content**: Educational, focused on AWS concepts
4. **Structure**: Clear, concise explanation
5. **Tone**: Informative, friendly

### Example Good Explanations

✅ **Good**:
```
"Amazon Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형
데이터베이스로, 표준 MySQL보다 최대 5배 빠른 성능을 제공합니다.
고가용성과 내구성을 갖춘 엔터프라이즈급 데이터베이스입니다."
```

❌ **Too Short**:
```
"Aurora는 관계형 데이터베이스입니다."
```

❌ **Too Technical**:
```
"Amazon Aurora는 InnoDB 스토리지 엔진을 사용하며,
Multi-AZ 복제를 통해 RPO < 1초, RTO < 1분을 달성합니다..."
```

## Testing

### Test Coverage: 100% (19/19 tests passing)

**Test Suites**:
- ✅ Rendering - Correct Answer (5 tests)
- ✅ Rendering - Incorrect Answer (4 tests)
- ✅ Styling (3 tests)
- ✅ Accessibility (3 tests)
- ✅ Content Validation (2 tests)
- ✅ Edge Cases (2 tests)

### Running Tests

```bash
npm test -- QuizResult.test.tsx
```

## Performance

- **Component Size**: ~3.3KB
- **Animation**: Hardware-accelerated (opacity only)
- **Re-renders**: Optimized with `React.memo()`
- **Bundle Impact**: Minimal (uses existing Framer Motion)

## Browser Support

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Mobile: ✅ iOS Safari, Chrome Android

## Related Components

- `QuizPopup.tsx` - Main quiz popup container
- `MultipleChoiceQuiz.tsx` - 4지선다 퀴즈 UI
- `OXQuiz.tsx` - OX 퀴즈 UI
- `QuizSummary.tsx` - 퀴즈 요약 통계
- `QuizTimer.tsx` - 퀴즈 타이머

## File Locations

```
frontend/components/QuizPopup/
├── QuizResult.tsx                    # Component implementation
├── QuizResult.example.tsx            # 10 usage examples
├── QuizResult.README.md              # This file
└── __tests__/
    └── QuizResult.test.tsx           # 19 comprehensive tests
```

## Version History

- **v1.0.0** (2026-02-05): Initial implementation
  - Correct/incorrect status banner
  - Answer display
  - Explanation text
  - Fade-in animation
  - Accessibility support
  - Dark mode support
  - 100% test coverage

## Contributing

When modifying this component:

1. Maintain 100% test coverage
2. Follow accessibility guidelines (WCAG 2.1 AA)
3. Keep animations smooth (60fps)
4. Support both light/dark modes
5. Use Korean for all user-facing text
6. Validate explanation text length (100-500 chars)

## License

Part of AWS Startup Tycoon - CTO Game (Proprietary)
