# Quiz Services

## LLMQuizGeneratorService

**Status**: Task #11 완료 (2026-02-05)

### Overview
LLM 기반 AWS 퀴즈 생성 서비스. vLLM API를 사용하여 게임 컨텍스트에 맞는 퀴즈를 동적으로 생성합니다.

### Core Features

1. **LLM Integration**
   - vLLM (gpt-oss-20b) 모델 사용
   - 한글 퀴즈 생성 (Korean language)
   - Temperature 0.8 for variety

2. **Quiz Type Selection**
   - 70% Multiple Choice (4지선다)
   - 30% OX Quiz (True/False)
   - Weighted random selection

3. **Validation Pipeline**
   - Structure validation (필수 필드, 형식, 길이)
   - Balance validation (선택지 중복, 정답 형식)
   - Content quality validation (언어, AWS 용어)

4. **Quality Scoring**
   - 4 Dimensions: Clarity, Relevance, Difficulty, Educational
   - Minimum score: 60/100
   - Rule-based evaluation (Task #14에서 LLM 기반으로 업그레이드 예정)

5. **Retry & Fallback Strategy**
   - Max 3 retries on LLM/validation/quality failures
   - Automatic fallback to pre-generated quiz pool
   - Fallback quiz selection based on infra context matching
   - QuizGenerationException on total failure

6. **Metrics Tracking**
   - Total generated, successful, failed
   - LLM failures, validation failures, quality failures
   - Fallback usage count
   - Average generation time and quality score

### Usage

```typescript
const quiz = await llmQuizGeneratorService.generateQuiz(
  QuizDifficulty.MEDIUM,
  ['EC2', 'Aurora'],
  { useCache: true }
);

// Returns Quiz entity with:
// - question, options, correctAnswer, explanation
// - qualityScore, source (LLM/FALLBACK)
// - turnRangeStart, turnRangeEnd
```

### Prompt Templates

Located in `/backend/src/quiz/templates/quiz-prompt.template.ts`:
- `buildMultipleChoicePrompt()` - 4지선다 문제 생성
- `buildOXPrompt()` - OX 퀴즈 생성
- `inferDifficultyFromTurn()` - 턴 번호로 난이도 추론
- `calculateTurnRange()` - 난이도별 턴 범위 (EASY: 1-10, MEDIUM: 11-20, HARD: 21-25)

### Quality Criteria

#### Validation (Structure)
- Question: 50-300 characters
- Options: 4 distinct choices (Multiple Choice only)
- Answer format: A/B/C/D or true/false
- Explanation: 100-500 characters

#### Quality Scoring
- **Clarity (0-25)**: 질문 명확성, 선택지 구분
- **Relevance (0-25)**: 인프라 컨텍스트 관련성
- **Difficulty (0-25)**: 설정 난이도와 실제 난이도 일치
- **Educational (0-25)**: 교육적 가치, 해설 품질

### Fallback Strategy

1. Try LLM generation (max 3 retries)
2. On failure: Query pre-generated quiz pool
3. Filter by difficulty and active status
4. Select best match based on infra context overlap
5. Throw QuizGenerationException if no fallback available

### Dependencies

- **VLLMClientService**: LLM API 호출
- **PromptBuilderService**: JSON 추출
- **Quiz Repository**: DB 저장 및 조회

### Future Integration Points

- **Task #13**: QuizValidatorService (3-stage validation)
- **Task #14**: QuizQualityScorerService (LLM-based scoring)
- **Task #15**: QuizCacheService (Redis caching)

### Testing

**Test Coverage**: 14/14 tests passing (100%)
- Success cases: Multiple choice, OX, turn ranges
- Validation failures: Short question, invalid options, invalid answer
- Quality failures: Low quality score retry
- LLM failures: API error, JSON parsing error, no fallback
- Feature flags: Disabled LLM fallback
- Metrics: Generation tracking, reset
- Fallback selection: Context matching

Run tests:
```bash
npm test -- llm-quiz-generator.service.spec.ts
```

### Error Handling

**QuizGenerationException**
- Reason: LLM_FAILURE | VALIDATION_FAILURE | QUALITY_FAILURE | FALLBACK_FAILURE | TOTAL_FAILURE
- Includes: attempts count, error details
- HTTP 500 status code

### Configuration

Uses `LLMConfig` from `/backend/src/config/llm.config.ts`:
- vLLM endpoint, timeout, retries
- Feature flags (disabled in test environment by default)
- Cache settings (for future integration)

### Files Created

1. `/backend/src/quiz/services/llm-quiz-generator.service.ts` (571 lines)
2. `/backend/src/quiz/services/llm-quiz-generator.service.spec.ts` (637 lines)
3. `/backend/src/quiz/templates/quiz-prompt.template.ts` (141 lines)
4. `/backend/src/quiz/exceptions/quiz-generation.exception.ts` (28 lines)
5. `/backend/src/quiz/quiz.module.ts` (updated - added LLMModule import)
6. `/backend/src/llm/llm.module.ts` (updated - exported PromptBuilderService)

### Next Steps (Task #12-17)

- Task #12: FallbackQuizService (pre-generated quiz pool management)
- Task #13: QuizValidatorService (3-stage validation service)
- Task #14: QuizQualityScorerService (LLM-based quality evaluation)
- Task #15: QuizCacheService (Redis caching layer)
- Task #16: QuizController (REST API endpoints)
- Task #17: QuizService (orchestration layer)
