# Implementation Plan: Feature 4 - Quiz API

**EPIC**: EPIC-07 - LLM 기반 AWS 퀴즈 시스템
**Feature**: Feature 4 - Quiz API
**담당**: Server AI
**상태**: In Progress
**작성일**: 2026-02-05

---

## 목표

퀴즈 생성, 조회, 답변 제출, 통계 조회를 위한 REST API 엔드포인트를 구현한다.

---

## API 설계

### 기본 정보

- **Base URL**: `http://localhost:3000/api`
- **인증**: 현재 Phase에서는 인증 없음 (Phase 2에서 JWT 추가)
- **응답 형식**: JSON
- **에러 형식**: HTTP 상태 코드 + 에러 메시지

---

## 엔드포인트 목록 (5개)

### 1. POST /api/quiz/generate

**설명**: 퀴즈 생성 요청 (LLM 또는 Fallback)

**Request**:
```json
{
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "quizType": "MULTIPLE_CHOICE" | "OX",
  "infraContext": ["EC2", "Aurora"],
  "turnNumber": 5
}
```

**Response** (200 OK):
```json
{
  "quizId": "uuid",
  "type": "MULTIPLE_CHOICE",
  "difficulty": "EASY",
  "question": "EC2 인스턴스를 중지하면 과금이 중단되는 항목은?",
  "options": [
    "컴퓨팅 비용",
    "스토리지 비용",
    "네트워크 비용",
    "전체 비용"
  ],
  "explanation": null,  // 정답 제출 전에는 null
  "source": "LLM" | "FALLBACK"
}
```

**Note**: `correctAnswer`는 보안상 응답에 포함하지 않음

---

### 2. GET /api/game/:gameId/quiz/next

**설명**: 현재 턴에 퀴즈가 있는지 확인하고, 있으면 퀴즈 반환

**Path Parameters**:
- `gameId`: string (UUID)

**Query Parameters**:
- `turnNumber`: number (optional, 현재 턴 번호)

**Response** (200 OK) - 퀴즈 있음:
```json
{
  "hasQuiz": true,
  "quiz": {
    "quizId": "uuid",
    "type": "MULTIPLE_CHOICE",
    "difficulty": "EASY",
    "question": "...",
    "options": ["A", "B", "C", "D"]
  }
}
```

**Response** (200 OK) - 퀴즈 없음:
```json
{
  "hasQuiz": false,
  "quiz": null
}
```

**Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "Game not found",
  "error": "Not Found"
}
```

---

### 3. POST /api/game/:gameId/quiz/:quizId/answer

**설명**: 퀴즈 답변 제출 및 정답 검증

**Path Parameters**:
- `gameId`: string (UUID)
- `quizId`: string (UUID)

**Request**:
```json
{
  "playerAnswer": "A" | "B" | "C" | "D" | "true" | "false",
  "turnNumber": 5,
  "timeTaken": 15  // 초 (optional, Phase 2)
}
```

**Response** (200 OK):
```json
{
  "isCorrect": true,
  "correctAnswer": "A",
  "explanation": "EC2 인스턴스를 중지하면...",
  "quizBonus": 0,  // 현재까지 획득한 보너스 (게임 종료 전까지는 0)
  "correctQuizCount": 3  // 현재까지 맞춘 퀴즈 개수
}
```

**Response** (400 Bad Request) - 이미 답변한 퀴즈:
```json
{
  "statusCode": 400,
  "message": "Quiz already answered",
  "error": "Bad Request"
}
```

---

### 4. GET /api/game/:gameId/quiz-summary

**설명**: 게임별 퀴즈 통계 조회 (게임 종료 시 표시용)

**Path Parameters**:
- `gameId`: string (UUID)

**Response** (200 OK):
```json
{
  "totalQuizzes": 5,
  "correctCount": 3,
  "accuracyRate": 60,
  "quizBonus": 15,
  "grade": "🥈 Good",
  "quizHistory": [
    {
      "turnNumber": 5,
      "quizType": "MULTIPLE_CHOICE",
      "difficulty": "EASY",
      "question": "...",
      "playerAnswer": "A",
      "correctAnswer": "A",
      "isCorrect": true
    },
    {
      "turnNumber": 10,
      "quizType": "OX",
      "difficulty": "EASY",
      "question": "...",
      "playerAnswer": "true",
      "correctAnswer": "true",
      "isCorrect": true
    },
    // ... 3개 더
  ]
}
```

---

### 5. GET /api/quiz/statistics

**설명**: 전체 퀴즈 통계 조회 (Admin 대시보드용)

**Query Parameters**:
- `limit`: number (default: 20)
- `orderBy`: "accuracyRate" | "usageCount" (default: "accuracyRate")

**Response** (200 OK):
```json
{
  "totalQuizzes": 150,
  "totalAnswers": 3420,
  "overallAccuracyRate": 62.5,
  "quizzes": [
    {
      "quizId": "uuid",
      "difficulty": "HARD",
      "type": "MULTIPLE_CHOICE",
      "question": "...",
      "usageCount": 120,
      "correctAnswerCount": 35,
      "totalAnswerCount": 120,
      "accuracyRate": 29.2,  // 가장 어려운 문제
      "isActive": true
    },
    // ... 19개 더
  ]
}
```

---

## DTO 설계

### 1. GenerateQuizDto

```typescript
// backend/src/quiz/dto/generate-quiz.dto.ts
import { IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { QuizDifficulty, QuizType } from '../entities/quiz.entity';

export class GenerateQuizDto {
  @IsEnum(QuizDifficulty)
  difficulty: QuizDifficulty;

  @IsEnum(QuizType)
  quizType: QuizType;

  @IsArray()
  infraContext: string[];

  @IsInt()
  @Min(1)
  @Max(25)
  turnNumber: number;
}
```

---

### 2. SubmitAnswerDto

```typescript
// backend/src/quiz/dto/submit-answer.dto.ts
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  playerAnswer: string;  // 'A', 'B', 'C', 'D', 'true', 'false'

  @IsInt()
  @Min(1)
  @Max(25)
  turnNumber: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeTaken?: number;  // Phase 2
}
```

---

### 3. QuizResponseDto

```typescript
// backend/src/quiz/dto/quiz-response.dto.ts
export class QuizResponseDto {
  quizId: string;
  type: string;
  difficulty: string;
  question: string;
  options?: string[];
  explanation?: string;  // 답변 제출 후에만
  source?: string;
}
```

---

### 4. AnswerResponseDto

```typescript
// backend/src/quiz/dto/answer-response.dto.ts
export class AnswerResponseDto {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  quizBonus: number;
  correctQuizCount: number;
}
```

---

### 5. QuizSummaryDto

```typescript
// backend/src/quiz/dto/quiz-summary.dto.ts
export class QuizHistoryItemDto {
  turnNumber: number;
  quizType: string;
  difficulty: string;
  question: string;
  playerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export class QuizSummaryDto {
  totalQuizzes: number;
  correctCount: number;
  accuracyRate: number;
  quizBonus: number;
  grade: string;
  quizHistory: QuizHistoryItemDto[];
}
```

---

## Service 설계

### QuizService

```typescript
// backend/src/quiz/quiz.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizHistory } from './entities/quiz-history.entity';
import { Game } from '../game/entities/game.entity';
import { LLMQuizGeneratorService } from './llm-quiz-generator.service';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,

    @InjectRepository(QuizHistory)
    private quizHistoryRepository: Repository<QuizHistory>,

    @InjectRepository(Game)
    private gameRepository: Repository<Game>,

    private llmQuizGenerator: LLMQuizGeneratorService,
  ) {}

  /**
   * 퀴즈 생성 (LLM 또는 Fallback)
   */
  async generateQuiz(dto: GenerateQuizDto): Promise<QuizResponseDto> {
    // LLMQuizGeneratorService 호출
    const generatedQuiz = await this.llmQuizGenerator.generateQuiz({
      difficulty: dto.difficulty,
      quizType: dto.quizType,
      infraContext: dto.infraContext,
      turnNumber: dto.turnNumber,
    });

    // DB에 저장
    const quiz = this.quizRepository.create(generatedQuiz);
    await this.quizRepository.save(quiz);

    // 응답 (correctAnswer 제외)
    return {
      quizId: quiz.quizId,
      type: quiz.type,
      difficulty: quiz.difficulty,
      question: quiz.question,
      options: quiz.options,
      source: quiz.source,
    };
  }

  /**
   * 다음 퀴즈 조회 (현재 턴에 퀴즈가 있는지 확인)
   */
  async getNextQuiz(gameId: string, turnNumber?: number): Promise<{ hasQuiz: boolean; quiz?: QuizResponseDto }> {
    const game = await this.gameRepository.findOne({ where: { gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const currentTurn = turnNumber || game.currentTurn;

    // quizTurns 배열에 현재 턴이 포함되어 있는지 확인
    if (!game.quizTurns.includes(currentTurn)) {
      return { hasQuiz: false };
    }

    // 이미 답변한 퀴즈인지 확인
    const alreadyAnswered = await this.quizHistoryRepository.findOne({
      where: { gameId, turnNumber: currentTurn },
    });

    if (alreadyAnswered) {
      return { hasQuiz: false };  // 이미 답변함
    }

    // 퀴즈 생성 (난이도는 턴 번호 기반으로 결정)
    const difficulty = this.getDifficultyByTurn(currentTurn);
    const quizType = this.selectQuizType(difficulty);

    const quiz = await this.generateQuiz({
      difficulty,
      quizType,
      infraContext: game.infrastructure,
      turnNumber: currentTurn,
    });

    return { hasQuiz: true, quiz };
  }

  /**
   * 답변 제출 및 검증
   */
  async submitAnswer(
    gameId: string,
    quizId: string,
    dto: SubmitAnswerDto,
  ): Promise<AnswerResponseDto> {
    // 게임 조회
    const game = await this.gameRepository.findOne({ where: { gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // 퀴즈 조회
    const quiz = await this.quizRepository.findOne({ where: { quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // 이미 답변했는지 확인
    const existing = await this.quizHistoryRepository.findOne({
      where: { gameId, quizId },
    });
    if (existing) {
      throw new BadRequestException('Quiz already answered');
    }

    // 정답 검증
    const isCorrect = this.checkAnswer(quiz, dto.playerAnswer);

    // QuizHistory 저장
    const history = this.quizHistoryRepository.create({
      gameId,
      quizId,
      turnNumber: dto.turnNumber,
      playerAnswer: dto.playerAnswer,
      isCorrect,
      timeTaken: dto.timeTaken,
      quizType: quiz.type,
      difficulty: quiz.difficulty,
      infraContext: quiz.infraContext,
    });
    await this.quizHistoryRepository.save(history);

    // Quiz 통계 업데이트
    quiz.usageCount += 1;
    quiz.totalAnswerCount += 1;
    if (isCorrect) {
      quiz.correctAnswerCount += 1;
    }
    await this.quizRepository.save(quiz);

    // Game 통계 업데이트
    if (isCorrect) {
      game.correctQuizCount += 1;
    }

    // 퀴즈 보너스는 게임 종료 시에만 계산 (여기서는 0)
    await this.gameRepository.save(game);

    return {
      isCorrect,
      correctAnswer: quiz.correctAnswer,
      explanation: quiz.explanation,
      quizBonus: 0,  // 게임 종료 시 계산
      correctQuizCount: game.correctQuizCount,
    };
  }

  /**
   * 게임별 퀴즈 요약
   */
  async getQuizSummary(gameId: string): Promise<QuizSummaryDto> {
    const game = await this.gameRepository.findOne({ where: { gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const history = await this.quizHistoryRepository.find({
      where: { gameId },
      order: { turnNumber: 'ASC' },
    });

    const totalQuizzes = history.length;
    const correctCount = game.correctQuizCount;
    const accuracyRate = totalQuizzes > 0 ? (correctCount / totalQuizzes) * 100 : 0;

    // 보너스 계산
    const quizBonus = this.calculateQuizBonus(correctCount);

    // 등급 결정
    const grade = this.getQuizGrade(correctCount);

    // 퀴즈 이력
    const quizHistory = await Promise.all(
      history.map(async (h) => {
        const quiz = await this.quizRepository.findOne({ where: { quizId: h.quizId } });
        return {
          turnNumber: h.turnNumber,
          quizType: h.quizType,
          difficulty: h.difficulty,
          question: quiz?.question || '',
          playerAnswer: h.playerAnswer,
          correctAnswer: quiz?.correctAnswer || '',
          isCorrect: h.isCorrect,
        };
      }),
    );

    return {
      totalQuizzes,
      correctCount,
      accuracyRate,
      quizBonus,
      grade,
      quizHistory,
    };
  }

  /**
   * 전체 퀴즈 통계
   */
  async getStatistics(limit: number = 20, orderBy: 'accuracyRate' | 'usageCount' = 'accuracyRate') {
    const quizzes = await this.quizRepository.find({
      where: { isActive: true, totalAnswerCount: { $gte: 10 } },  // 최소 10명 이상
      order: { [orderBy]: 'ASC' },  // 정답률 낮은 순 또는 사용 많은 순
      take: limit,
    });

    const totalQuizzes = await this.quizRepository.count({ where: { isActive: true } });
    const totalAnswers = await this.quizHistoryRepository.count();

    const stats = await this.quizHistoryRepository
      .createQueryBuilder('qh')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN qh.isCorrect THEN 1 ELSE 0 END)', 'correct')
      .getRawOne();

    const overallAccuracyRate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

    return {
      totalQuizzes,
      totalAnswers,
      overallAccuracyRate,
      quizzes: quizzes.map((q) => ({
        quizId: q.quizId,
        difficulty: q.difficulty,
        type: q.type,
        question: q.question,
        usageCount: q.usageCount,
        correctAnswerCount: q.correctAnswerCount,
        totalAnswerCount: q.totalAnswerCount,
        accuracyRate: q.accuracyRate,
        isActive: q.isActive,
      })),
    };
  }

  // Helper methods
  private checkAnswer(quiz: Quiz, playerAnswer: string): boolean {
    return quiz.correctAnswer === playerAnswer;
  }

  private getDifficultyByTurn(turnNumber: number): QuizDifficulty {
    if (turnNumber <= 10) return QuizDifficulty.EASY;
    if (turnNumber <= 20) return QuizDifficulty.MEDIUM;
    return QuizDifficulty.HARD;
  }

  private selectQuizType(difficulty: QuizDifficulty): QuizType {
    if (difficulty === QuizDifficulty.EASY) {
      return Math.random() < 0.5 ? QuizType.OX : QuizType.MULTIPLE_CHOICE;
    }
    return Math.random() < 0.7 ? QuizType.MULTIPLE_CHOICE : QuizType.OX;
  }

  private calculateQuizBonus(correctCount: number): number {
    const bonusMap = { 5: 50, 4: 30, 3: 15, 2: 5, 1: 0, 0: 0 };
    return bonusMap[correctCount] || 0;
  }

  private getQuizGrade(correctCount: number): string {
    const gradeMap = {
      5: '🏆 Perfect',
      4: '🥇 Excellent',
      3: '🥈 Good',
      2: '🥉 Pass',
      1: '❌ Fail',
      0: '❌ Fail',
    };
    return gradeMap[correctCount] || '❌ Fail';
  }
}
```

---

## Controller 설계

### QuizController

```typescript
// backend/src/quiz/quiz.controller.ts
import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@ApiTags('Quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate')
  @ApiOperation({ summary: '퀴즈 생성 (LLM 또는 Fallback)' })
  @ApiResponse({ status: 201, description: '퀴즈 생성 성공' })
  async generateQuiz(@Body() dto: GenerateQuizDto) {
    return this.quizService.generateQuiz(dto);
  }

  @Get('statistics')
  @ApiOperation({ summary: '전체 퀴즈 통계 조회' })
  @ApiResponse({ status: 200, description: '통계 조회 성공' })
  async getStatistics(
    @Query('limit') limit: number = 20,
    @Query('orderBy') orderBy: 'accuracyRate' | 'usageCount' = 'accuracyRate',
  ) {
    return this.quizService.getStatistics(limit, orderBy);
  }
}

@ApiTags('Game Quiz')
@Controller('game/:gameId/quiz')
export class GameQuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('next')
  @ApiOperation({ summary: '다음 퀴즈 조회' })
  @ApiResponse({ status: 200, description: '퀴즈 조회 성공' })
  @ApiResponse({ status: 404, description: '게임을 찾을 수 없음' })
  async getNextQuiz(
    @Param('gameId') gameId: string,
    @Query('turnNumber') turnNumber?: number,
  ) {
    return this.quizService.getNextQuiz(gameId, turnNumber);
  }

  @Post(':quizId/answer')
  @ApiOperation({ summary: '퀴즈 답변 제출' })
  @ApiResponse({ status: 200, description: '답변 제출 성공' })
  @ApiResponse({ status: 400, description: '이미 답변한 퀴즈' })
  @ApiResponse({ status: 404, description: '퀴즈를 찾을 수 없음' })
  async submitAnswer(
    @Param('gameId') gameId: string,
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizService.submitAnswer(gameId, quizId, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: '게임별 퀴즈 요약' })
  @ApiResponse({ status: 200, description: '요약 조회 성공' })
  @ApiResponse({ status: 404, description: '게임을 찾을 수 없음' })
  async getQuizSummary(@Param('gameId') gameId: string) {
    return this.quizService.getQuizSummary(gameId);
  }
}
```

---

## 에러 처리

### 에러 응답 형식

```json
{
  "statusCode": 400 | 404 | 500,
  "message": "에러 메시지",
  "error": "Bad Request" | "Not Found" | "Internal Server Error"
}
```

### 에러 케이스

| HTTP Status | 상황 | 메시지 |
|-------------|------|--------|
| 400 | 이미 답변한 퀴즈 | "Quiz already answered" |
| 400 | 잘못된 답변 형식 | "Invalid answer format" |
| 404 | 게임 없음 | "Game not found" |
| 404 | 퀴즈 없음 | "Quiz not found" |
| 500 | LLM 생성 실패 | "Quiz generation failed" |

---

## 테스트 전략

### Unit Tests

```typescript
// backend/src/quiz/quiz.service.spec.ts
describe('QuizService', () => {
  describe('generateQuiz', () => {
    it('should generate quiz using LLM', async () => {
      // LLM 생성 성공 케이스
    });

    it('should fallback to pre-generated pool on LLM failure', async () => {
      // LLM 실패 시 Fallback
    });
  });

  describe('submitAnswer', () => {
    it('should return isCorrect=true for correct answer', async () => {
      // 정답 제출
    });

    it('should return isCorrect=false for wrong answer', async () => {
      // 오답 제출
    });

    it('should throw BadRequestException if already answered', async () => {
      // 중복 답변
    });
  });

  describe('calculateQuizBonus', () => {
    it('should return 50 for 5 correct answers', () => {
      expect(service['calculateQuizBonus'](5)).toBe(50);
    });

    it('should return 0 for 1 correct answer', () => {
      expect(service['calculateQuizBonus'](1)).toBe(0);
    });
  });
});
```

### Integration Tests

```typescript
// backend/src/quiz/quiz.controller.spec.ts
describe('QuizController (e2e)', () => {
  it('POST /api/quiz/generate', () => {
    return request(app.getHttpServer())
      .post('/api/quiz/generate')
      .send({
        difficulty: 'EASY',
        quizType: 'MULTIPLE_CHOICE',
        infraContext: ['EC2'],
        turnNumber: 5,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('quizId');
        expect(res.body).not.toHaveProperty('correctAnswer');
      });
  });

  it('GET /api/game/:gameId/quiz/next', () => {
    return request(app.getHttpServer())
      .get(`/api/game/${gameId}/quiz/next?turnNumber=5`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('hasQuiz');
      });
  });
});
```

**목표 커버리지**: 85%+

---

## Swagger 문서

### 예시

```yaml
paths:
  /api/quiz/generate:
    post:
      tags:
        - Quiz
      summary: 퀴즈 생성 (LLM 또는 Fallback)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateQuizDto'
      responses:
        '201':
          description: 퀴즈 생성 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QuizResponseDto'
```

---

## 성능 목표

| 엔드포인트 | 목표 시간 (p95) | 비고 |
|-----------|-----------------|------|
| POST /quiz/generate | < 3s | LLM 호출 포함 |
| GET /game/:id/quiz/next | < 100ms | DB 조회 + 생성 |
| POST /game/:id/quiz/:id/answer | < 50ms | DB 저장 |
| GET /game/:id/quiz-summary | < 100ms | Join 쿼리 |
| GET /quiz/statistics | < 200ms | 집계 쿼리 |

---

## 보안 고려사항

1. **정답 노출 방지**: API 응답에 `correctAnswer` 제외 (답변 제출 전)
2. **입력 검증**: DTO validation (class-validator)
3. **Rate Limiting**: 퀴즈 생성 API에 제한 (1분당 10회)
4. **중복 답변 방지**: QuizHistory 중복 체크

---

## 다음 단계

1. **QuizController, QuizService 구현**
2. **DTO 파일 5개 작성**
3. **Unit Test + Integration Test 작성**
4. **Swagger 문서화**
5. **Task #5 (Quiz UI Components)** 시작

---

**작성자**: Server AI
**검토자**: Tech Lead
**상태**: In Progress → 구현 대기
