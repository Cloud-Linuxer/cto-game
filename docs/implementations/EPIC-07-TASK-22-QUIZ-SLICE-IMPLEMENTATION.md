# EPIC-07 Task #22: Redux quizSlice Implementation

**Status**: ✅ COMPLETED
**Date**: 2026-02-05
**Epic**: EPIC-07 - LLM 기반 AWS 퀴즈 시스템
**Feature**: Feature 1 - 퀴즈 시스템 API 설계

---

## Overview

Redux Toolkit 기반의 퀴즈 상태 관리 슬라이스를 구현하였습니다. 이 슬라이스는 퀴즈 시스템의 모든 클라이언트 상태를 관리하며, 퀴즈 생성부터 답변 제출, 히스토리 관리까지 전체 퀴즈 플로우를 지원합니다.

---

## Implementation Summary

### Files Created

1. **`frontend/store/slices/quizSlice.ts`** (152 lines)
   - Redux Toolkit 기반 퀴즈 상태 관리
   - 7개 리듀서 (setCurrentQuiz, selectAnswer, submitAnswer, closeQuiz, addToHistory, updateQuizBonus, resetQuiz)
   - 9개 기본 셀렉터 + 1개 계산 셀렉터 (accuracy rate)
   - TypeScript 타입 안정성 보장

2. **`frontend/store/slices/__tests__/quizSlice.test.ts`** (451 lines)
   - 31개 단위 테스트 (100% passing)
   - 98.43% 코드 커버리지
   - 통합 시나리오 테스트 포함

3. **`frontend/store/index.ts`** (수정)
   - quizReducer를 Redux store에 통합
   - RootState 타입에 quiz 슬라이스 추가

---

## State Interface

### QuizState

```typescript
interface QuizState {
  currentQuiz: Quiz | null;              // 현재 활성 퀴즈
  isQuizActive: boolean;                 // 퀴즈 모드 활성화 여부
  selectedAnswer: string | null;         // 선택한 답변 ('A'-'D' or 'true'/'false')
  hasSubmitted: boolean;                 // 제출 완료 여부
  isCorrect: boolean | null;             // 정답 여부
  quizHistory: QuizHistory[];            // 퀴즈 히스토리
  correctCount: number;                  // 정답 개수
  totalCount: number;                    // 총 퀴즈 개수
  quizBonus: number;                     // 퀴즈 보너스 점수
}
```

### QuizHistory

```typescript
interface QuizHistory {
  quizId: string;
  question: string;
  difficulty: QuizDifficulty;
  playerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  turnNumber: number;
}
```

---

## Reducers (Actions)

### 1. setCurrentQuiz
- **용도**: 새로운 퀴즈를 설정하고 퀴즈 모드를 활성화
- **동작**:
  - currentQuiz 설정
  - isQuizActive = true
  - 이전 답변 상태 초기화 (selectedAnswer, hasSubmitted, isCorrect)

### 2. selectAnswer
- **용도**: 플레이어가 선택한 답변을 저장
- **동작**: selectedAnswer 업데이트
- **지원 형식**: 'A', 'B', 'C', 'D' (4지선다) or 'true', 'false' (OX)

### 3. submitAnswer
- **용도**: 답변을 제출하고 결과를 받음
- **동작**:
  - hasSubmitted = true
  - isCorrect 설정 (백엔드 응답 기반)

### 4. closeQuiz
- **용도**: 퀴즈를 닫고 초기 상태로 복귀 (히스토리는 유지)
- **동작**:
  - currentQuiz, selectedAnswer, hasSubmitted, isCorrect 초기화
  - isQuizActive = false
  - quizHistory, correctCount, totalCount, quizBonus는 유지

### 5. addToHistory
- **용도**: 퀴즈 결과를 히스토리에 추가
- **동작**:
  - quizHistory에 항목 추가
  - totalCount 증가
  - 정답인 경우 correctCount 증가

### 6. updateQuizBonus
- **용도**: 퀴즈 보너스 점수를 업데이트
- **동작**: quizBonus 값 설정

### 7. resetQuiz
- **용도**: 전체 퀴즈 상태를 초기화 (새 게임 시작 시)
- **동작**: 모든 필드를 initialState로 복원

---

## Selectors

### Basic Selectors
- `selectCurrentQuiz`: 현재 활성 퀴즈
- `selectIsQuizActive`: 퀴즈 모드 활성화 여부
- `selectSelectedAnswer`: 선택한 답변
- `selectHasSubmitted`: 제출 완료 여부
- `selectIsCorrect`: 정답 여부
- `selectQuizHistory`: 퀴즈 히스토리 배열
- `selectCorrectCount`: 정답 개수
- `selectTotalCount`: 총 퀴즈 개수
- `selectQuizBonus`: 퀴즈 보너스 점수

### Computed Selectors
- `selectAccuracyRate`: 정답률 계산 (correctCount / totalCount * 100)
  - totalCount가 0일 경우 0 반환

---

## Usage Example

### 1. 퀴즈 시작

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCurrentQuiz, selectCurrentQuiz, selectIsQuizActive } from '@/store/slices/quizSlice';

function QuizComponent() {
  const dispatch = useAppDispatch();
  const currentQuiz = useAppSelector(selectCurrentQuiz);
  const isQuizActive = useAppSelector(selectIsQuizActive);

  const handleStartQuiz = async () => {
    // API에서 퀴즈 가져오기
    const quiz = await fetchQuiz(gameId);

    // Redux에 퀴즈 설정
    dispatch(setCurrentQuiz(quiz));
  };

  return (
    <div>
      {isQuizActive ? (
        <QuizPopup quiz={currentQuiz} />
      ) : (
        <button onClick={handleStartQuiz}>퀴즈 시작</button>
      )}
    </div>
  );
}
```

### 2. 답변 선택 및 제출

```typescript
import { selectAnswer, submitAnswer, addToHistory, updateQuizBonus } from '@/store/slices/quizSlice';

function QuizAnswerComponent() {
  const dispatch = useAppDispatch();
  const currentQuiz = useAppSelector(selectCurrentQuiz);
  const selectedAnswer = useAppSelector(selectSelectedAnswer);
  const hasSubmitted = useAppSelector(selectHasSubmitted);

  const handleSelectAnswer = (answer: string) => {
    dispatch(selectAnswer(answer));
  };

  const handleSubmit = async () => {
    // API로 답변 제출
    const result = await submitQuizAnswer(gameId, currentQuiz.quizId, selectedAnswer);

    // 결과 Redux에 반영
    dispatch(submitAnswer({
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer
    }));

    // 히스토리 추가
    dispatch(addToHistory({
      quizId: currentQuiz.quizId,
      question: currentQuiz.question,
      difficulty: currentQuiz.difficulty,
      playerAnswer: selectedAnswer,
      correctAnswer: result.correctAnswer,
      isCorrect: result.isCorrect,
      turnNumber: currentTurn
    }));

    // 보너스 업데이트
    dispatch(updateQuizBonus(result.bonus));
  };

  return (
    <div>
      {currentQuiz.options?.map(option => (
        <button
          key={option}
          onClick={() => handleSelectAnswer(option)}
          disabled={hasSubmitted}
        >
          {option}
        </button>
      ))}
      <button onClick={handleSubmit} disabled={!selectedAnswer || hasSubmitted}>
        제출
      </button>
    </div>
  );
}
```

### 3. 퀴즈 닫기

```typescript
import { closeQuiz } from '@/store/slices/quizSlice';

function QuizResultComponent() {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeQuiz());
  };

  return (
    <button onClick={handleClose}>퀴즈 닫기</button>
  );
}
```

### 4. 퀴즈 통계 표시

```typescript
import { selectQuizHistory, selectCorrectCount, selectTotalCount, selectAccuracyRate, selectQuizBonus } from '@/store/slices/quizSlice';

function QuizStatsComponent() {
  const history = useAppSelector(selectQuizHistory);
  const correctCount = useAppSelector(selectCorrectCount);
  const totalCount = useAppSelector(selectTotalCount);
  const accuracyRate = useAppSelector(selectAccuracyRate);
  const quizBonus = useAppSelector(selectQuizBonus);

  return (
    <div>
      <h3>퀴즈 통계</h3>
      <p>정답: {correctCount} / {totalCount}</p>
      <p>정답률: {accuracyRate.toFixed(1)}%</p>
      <p>보너스: {quizBonus} 원</p>

      <h4>히스토리</h4>
      <ul>
        {history.map((item, idx) => (
          <li key={idx}>
            Turn {item.turnNumber}: {item.isCorrect ? '✓' : '✗'} - {item.question}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. 새 게임 시작 시 초기화

```typescript
import { resetQuiz } from '@/store/slices/quizSlice';

function GameComponent() {
  const dispatch = useAppDispatch();

  const handleNewGame = () => {
    // 퀴즈 상태 완전 초기화
    dispatch(resetQuiz());

    // 새 게임 시작
    startNewGame();
  };

  return (
    <button onClick={handleNewGame}>새 게임 시작</button>
  );
}
```

---

## Test Coverage

### Test Statistics
- **Total Tests**: 31
- **Passing**: 31 (100%)
- **Failing**: 0
- **Code Coverage**: 98.43%
  - Statements: 98.43%
  - Branches: 100%
  - Functions: 100%
  - Lines: 100%

### Test Categories

#### 1. Reducer Tests (15 tests)
- setCurrentQuiz: 2 tests
- selectAnswer: 3 tests
- submitAnswer: 2 tests
- closeQuiz: 1 test
- addToHistory: 3 tests
- updateQuizBonus: 3 tests
- resetQuiz: 1 test

#### 2. Selector Tests (13 tests)
- 9 basic selectors
- 4 accuracy rate calculation scenarios (normal, 0%, 100%, no data)

#### 3. Integration Scenarios (3 tests)
- Complete quiz flow (시작 → 선택 → 제출 → 히스토리 → 닫기)
- Multiple quiz rounds
- Changing answer before submission

---

## Integration with Redux Store

### Store Configuration

```typescript
// frontend/store/index.ts
export const store = configureStore({
  reducer: {
    event: eventReducer,
    quiz: quizReducer,      // ✅ 추가됨
    [gameApiRTK.reducerPath]: gameApiRTK.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(gameApiRTK.middleware),
});
```

### RootState Type
```typescript
export type RootState = ReturnType<typeof store.getState>;
// RootState.quiz: QuizState 타입 포함
```

---

## Design Decisions

### 1. Quiz 타입 재사용
- `@/types/quiz.types.ts`의 Quiz 인터페이스를 재사용하여 타입 일관성 유지
- 백엔드 응답과 프론트엔드 상태 간 타입 호환성 보장

### 2. 히스토리 별도 인터페이스
- QuizHistory는 Redux state 전용 인터페이스
- 백엔드 QuizHistoryItem과 유사하지만 프론트엔드 요구사항에 맞게 최적화

### 3. 상태 분리 전략
- closeQuiz: 현재 퀴즈 상태만 초기화, 통계는 유지
- resetQuiz: 전체 상태 초기화 (새 게임 시작 시)
- 이를 통해 세션 내 퀴즈 연속성 유지 가능

### 4. Computed Selector
- selectAccuracyRate: 정답률을 계산하는 파생 셀렉터
- totalCount가 0일 경우 divide-by-zero 방지

### 5. TypeScript 타입 안정성
- 모든 action payload에 명시적 타입 지정
- 셀렉터에 RootState 타입 힌트 제공

---

## Future Enhancements

### 1. Quiz Timer Integration
- 시간 제한 기능 추가 시 quizTimeRemaining 필드 추가 가능

### 2. Streak Tracking
- 연속 정답 추적 (consecutiveCorrect 카운터)

### 3. Difficulty-based Scoring
- 난이도별 보너스 가중치 계산

### 4. Quiz Filtering
- 히스토리 필터링 셀렉터 (난이도별, 정답/오답별)

### 5. Persistence
- localStorage 연동으로 페이지 새로고침 시 상태 유지

---

## Testing Commands

```bash
# 단위 테스트 실행
npm test -- store/slices/__tests__/quizSlice.test.ts

# 커버리지 리포트
npm test -- --coverage store/slices/__tests__/quizSlice.test.ts

# Watch 모드
npm test -- --watch store/slices/__tests__/quizSlice.test.ts
```

---

## Dependencies

### Runtime Dependencies
- `@reduxjs/toolkit`: ^2.2.1
- `react-redux`: ^9.1.0

### Type Dependencies
- `@/types/quiz.types`: Quiz, QuizDifficulty, QuizType

### Dev Dependencies
- `@testing-library/react`: ^14.1.2
- `jest`: ^29.7.0
- `typescript`: ^5.3.3

---

## Verification Checklist

- [x] QuizState 인터페이스 정의 (9 필드)
- [x] 초기 상태 정의
- [x] 7개 리듀서 구현
- [x] 9개 기본 셀렉터 구현
- [x] 1개 계산 셀렉터 구현 (accuracy rate)
- [x] Redux store에 통합
- [x] 단위 테스트 작성 (31개)
- [x] 통합 시나리오 테스트
- [x] 98%+ 코드 커버리지 달성
- [x] TypeScript 타입 안정성 보장
- [x] Documentation 작성

---

## Related Files

### Implementation
- `/home/cto-game/frontend/store/slices/quizSlice.ts`
- `/home/cto-game/frontend/store/index.ts`

### Tests
- `/home/cto-game/frontend/store/slices/__tests__/quizSlice.test.ts`

### Types
- `/home/cto-game/frontend/types/quiz.types.ts`

### Documentation
- This file: `/home/cto-game/docs/implementations/EPIC-07-TASK-22-QUIZ-SLICE-IMPLEMENTATION.md`

---

## Conclusion

Redux quizSlice가 성공적으로 구현되었습니다. 이 슬라이스는 EPIC-07 퀴즈 시스템의 핵심 상태 관리 레이어로서, 퀴즈 생성부터 답변 제출, 히스토리 관리까지 전체 퀴즈 플로우를 지원합니다.

**주요 성과**:
- 98.43% 코드 커버리지
- 31개 단위 테스트 (100% passing)
- TypeScript 타입 안정성
- Redux Toolkit 모범 사례 준수
- 통합 시나리오 테스트 포함

**다음 단계**: Task #23 (RTK Query quizApi 엔드포인트 작성)에서 백엔드 API 통합을 진행합니다.

---

**Task #22 Status**: ✅ COMPLETED
**Implementation Date**: 2026-02-05
**Implemented By**: Claude Code (Frontend Architect)
