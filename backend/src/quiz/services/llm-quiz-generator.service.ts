import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VLLMClientService } from '../../llm/services/vllm-client.service';
import { PromptBuilderService } from '../../llm/services/prompt-builder.service';
import { Quiz, QuizDifficulty, QuizType, QuizSource } from '../../database/entities/quiz.entity';
import { QuizGenerationException } from '../exceptions/quiz-generation.exception';
import { QuizValidationResult } from '../interfaces/quiz-validation-result.interface';
import { QuizQualityScore } from '../interfaces/quiz-quality-score.interface';
import { QuizGenerationOptions } from '../interfaces/quiz-generation-options.interface';
import {
  buildMultipleChoicePrompt,
  buildOXPrompt,
  calculateTurnRange,
} from '../templates/quiz-prompt.template';
import { LLMConfig } from '../../config/llm.config';

/**
 * LLM으로 생성된 퀴즈 원본 데이터 (JSON 파싱 결과)
 */
interface LLMQuizResponse {
  question: string;
  options?: string[]; // Multiple choice only
  correctAnswer: string;
  explanation: string;
}

/**
 * 퀴즈 생성 메트릭
 */
export interface QuizGenerationMetrics {
  totalGenerated: number;
  successfulGenerations: number;
  failedGenerations: number;
  llmFailures: number;
  validationFailures: number;
  qualityFailures: number;
  fallbackUsed: number;
  averageGenerationTimeMs: number;
  averageQualityScore: number;
}

@Injectable()
export class LLMQuizGeneratorService {
  private readonly logger = new Logger(LLMQuizGeneratorService.name);
  private readonly MAX_RETRIES = 3;
  private readonly MIN_QUALITY_SCORE = 60;

  private metrics: QuizGenerationMetrics = {
    totalGenerated: 0,
    successfulGenerations: 0,
    failedGenerations: 0,
    llmFailures: 0,
    validationFailures: 0,
    qualityFailures: 0,
    fallbackUsed: 0,
    averageGenerationTimeMs: 0,
    averageQualityScore: 0,
  };

  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    private readonly vllmClient: VLLMClientService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  /**
   * LLM을 사용하여 퀴즈 생성
   *
   * @param difficulty 퀴즈 난이도
   * @param infraContext 인프라 컨텍스트 (현재 게임의 AWS 서비스)
   * @param options 추가 옵션
   * @returns 생성된 퀴즈 엔티티
   * @throws QuizGenerationException 모든 시도 실패 시
   */
  async generateQuiz(
    difficulty: QuizDifficulty,
    infraContext: string[],
    options?: Partial<QuizGenerationOptions>,
  ): Promise<Quiz> {
    const startTime = Date.now();
    this.metrics.totalGenerated++;

    // LLM 기능이 비활성화된 경우 폴백
    if (!LLMConfig.features.enabled) {
      this.logger.debug('LLM features disabled, using fallback');
      return this.useFallbackQuiz(difficulty, infraContext);
    }

    // 캐시 확인 (QuizCacheService 연동은 Task #15에서 구현)
    if (options?.useCache !== false) {
      const cachedQuiz = await this.getCachedQuiz(difficulty, infraContext);
      if (cachedQuiz) {
        this.logger.log('Cache hit! Returning cached quiz');
        return cachedQuiz;
      }
    }

    // 문제 유형 선택 (70% 4지선다, 30% OX)
    const quizType = this.selectQuizType();

    // 최대 재시도 루프
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(
          `Generating quiz attempt ${attempt}/${this.MAX_RETRIES} (type: ${quizType}, difficulty: ${difficulty})`,
        );

        // 1. 프롬프트 빌드
        const prompt = this.buildPrompt(quizType, difficulty, infraContext);

        // 2. LLM API 호출
        let rawResponse: string;
        try {
          rawResponse = await this.vllmClient.generateCompletion(prompt);
          this.logger.debug('Received response from vLLM');
        } catch (error) {
          this.metrics.llmFailures++;
          this.logger.error(`LLM API call failed (attempt ${attempt}): ${error.message}`);

          if (attempt === this.MAX_RETRIES) {
            return this.useFallbackQuiz(difficulty, infraContext);
          }
          continue;
        }

        // 3. JSON 추출 및 파싱
        let parsedQuiz: LLMQuizResponse;
        try {
          const jsonResponse = this.promptBuilder.extractJsonFromResponse(rawResponse);
          parsedQuiz = JSON.parse(jsonResponse);
          this.logger.debug('Successfully parsed JSON response');
        } catch (error) {
          this.logger.error(`Failed to parse JSON (attempt ${attempt}): ${error.message}`);
          if (attempt === this.MAX_RETRIES) {
            return this.useFallbackQuiz(difficulty, infraContext);
          }
          continue;
        }

        // 4. 구조 검증 (QuizValidatorService - Task #13 연동 예정)
        const validationResult = this.validateQuizStructure(parsedQuiz, quizType);
        if (!validationResult.isValid) {
          this.metrics.validationFailures++;
          this.logger.warn(
            `Quiz validation failed (attempt ${attempt}): ${validationResult.errors.join(', ')}`,
          );

          if (attempt === this.MAX_RETRIES) {
            return this.useFallbackQuiz(difficulty, infraContext);
          }
          continue;
        }

        // 5. Quiz 엔티티 생성
        const quiz = this.createQuizEntity(parsedQuiz, quizType, difficulty, infraContext);

        // 6. 품질 평가 (QuizQualityScorerService - Task #14 연동 예정)
        const qualityScore = this.calculateQualityScore(quiz, difficulty, infraContext);
        quiz.qualityScore = qualityScore.total;

        if (qualityScore.total < this.MIN_QUALITY_SCORE) {
          this.metrics.qualityFailures++;
          this.logger.warn(
            `Quiz quality too low (attempt ${attempt}): ${qualityScore.total}/100 (minimum: ${this.MIN_QUALITY_SCORE})`,
          );

          if (attempt === this.MAX_RETRIES) {
            return this.useFallbackQuiz(difficulty, infraContext);
          }
          continue;
        }

        // 7. 성공! DB에 저장
        const savedQuiz = await this.quizRepository.save(quiz);

        // 메트릭 업데이트
        this.metrics.successfulGenerations++;
        const duration = Date.now() - startTime;
        this.updateAverageGenerationTime(duration);
        this.updateAverageQualityScore(qualityScore.total);

        this.logger.log(
          `Successfully generated quiz in ${duration}ms (quality: ${qualityScore.total}/100, attempt: ${attempt})`,
        );

        return savedQuiz;
      } catch (error) {
        this.logger.error(
          `Unexpected error in quiz generation (attempt ${attempt}): ${error.message}`,
          error.stack,
        );

        if (attempt === this.MAX_RETRIES) {
          return this.useFallbackQuiz(difficulty, infraContext);
        }
      }
    }

    // 모든 재시도 실패 시 폴백
    return this.useFallbackQuiz(difficulty, infraContext);
  }

  /**
   * 프롬프트 빌드
   */
  private buildPrompt(
    quizType: QuizType,
    difficulty: QuizDifficulty,
    infraContext: string[],
  ): string {
    if (quizType === QuizType.MULTIPLE_CHOICE) {
      return buildMultipleChoicePrompt(difficulty, infraContext);
    } else {
      return buildOXPrompt(difficulty, infraContext);
    }
  }

  /**
   * 문제 유형 선택 (70% 4지선다, 30% OX)
   */
  private selectQuizType(): QuizType {
    const random = Math.random();
    return random < 0.7 ? QuizType.MULTIPLE_CHOICE : QuizType.OX;
  }

  /**
   * 퀴즈 구조 검증 (기본적인 검증)
   * Task #13에서 QuizValidatorService와 연동 예정
   */
  private validateQuizStructure(
    parsedQuiz: LLMQuizResponse,
    quizType: QuizType,
  ): QuizValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const structureIssues: string[] = [];
    const balanceIssues: string[] = [];
    const contentIssues: string[] = [];

    // Stage 1: 구조 검증
    // 질문 검증
    if (!parsedQuiz.question || parsedQuiz.question.trim().length === 0) {
      errors.push('질문이 비어있습니다');
      structureIssues.push('질문이 비어있습니다');
    } else if (parsedQuiz.question.length < 50) {
      warnings.push('질문이 너무 짧습니다 (50자 미만)');
      structureIssues.push('질문이 너무 짧습니다');
    } else if (parsedQuiz.question.length > 300) {
      errors.push('질문이 너무 깁니다 (300자 초과)');
      structureIssues.push('질문이 너무 깁니다');
    }

    // 정답 검증
    if (!parsedQuiz.correctAnswer || parsedQuiz.correctAnswer.trim().length === 0) {
      errors.push('정답이 비어있습니다');
      structureIssues.push('정답이 비어있습니다');
    }

    // 해설 검증
    if (!parsedQuiz.explanation || parsedQuiz.explanation.trim().length === 0) {
      errors.push('해설이 비어있습니다');
      structureIssues.push('해설이 비어있습니다');
    } else if (parsedQuiz.explanation.length < 100) {
      warnings.push('해설이 너무 짧습니다 (100자 미만)');
      contentIssues.push('해설이 너무 짧습니다');
    } else if (parsedQuiz.explanation.length > 500) {
      warnings.push('해설이 너무 깁니다 (500자 초과)');
      contentIssues.push('해설이 너무 깁니다');
    }

    // 4지선다 특화 검증
    if (quizType === QuizType.MULTIPLE_CHOICE) {
      if (!parsedQuiz.options || !Array.isArray(parsedQuiz.options)) {
        errors.push('선택지가 배열이 아닙니다');
        structureIssues.push('선택지가 배열이 아닙니다');
      } else if (parsedQuiz.options.length !== 4) {
        errors.push(`선택지는 4개여야 합니다 (현재: ${parsedQuiz.options.length}개)`);
        structureIssues.push(`선택지 개수 오류: ${parsedQuiz.options.length}개`);
      } else {
        // 선택지 중복 검증
        const uniqueOptions = new Set(parsedQuiz.options);
        if (uniqueOptions.size !== 4) {
          errors.push('선택지가 중복됩니다');
          balanceIssues.push('선택지가 중복됩니다');
        }
      }

      // 정답 형식 검증
      if (!['A', 'B', 'C', 'D'].includes(parsedQuiz.correctAnswer.toUpperCase())) {
        errors.push('정답은 A, B, C, D 중 하나여야 합니다');
        structureIssues.push('정답 형식 오류');
      }
    }

    // OX 특화 검증
    if (quizType === QuizType.OX) {
      if (!['true', 'false'].includes(parsedQuiz.correctAnswer.toLowerCase())) {
        errors.push('OX 퀴즈의 정답은 true 또는 false여야 합니다');
        structureIssues.push('OX 정답 형식 오류');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      breakdown: {
        structure: {
          passed: structureIssues.length === 0,
          issues: structureIssues,
        },
        balance: {
          passed: balanceIssues.length === 0,
          issues: balanceIssues,
        },
        content: {
          passed: contentIssues.length === 0,
          issues: contentIssues,
        },
      },
    };
  }

  /**
   * Quiz 엔티티 생성
   */
  private createQuizEntity(
    parsedQuiz: LLMQuizResponse,
    quizType: QuizType,
    difficulty: QuizDifficulty,
    infraContext: string[],
  ): Quiz {
    const quiz = new Quiz();
    quiz.type = quizType;
    quiz.difficulty = difficulty;
    quiz.question = parsedQuiz.question.trim();
    quiz.correctAnswer =
      quizType === QuizType.MULTIPLE_CHOICE
        ? parsedQuiz.correctAnswer.toUpperCase()
        : parsedQuiz.correctAnswer.toLowerCase();
    quiz.explanation = parsedQuiz.explanation.trim();
    quiz.infraContext = infraContext;
    quiz.source = QuizSource.LLM;
    quiz.isActive = true;
    quiz.usageCount = 0;
    quiz.correctAnswerCount = 0;
    quiz.totalAnswerCount = 0;

    // 4지선다인 경우 선택지 설정
    if (quizType === QuizType.MULTIPLE_CHOICE && parsedQuiz.options) {
      quiz.options = parsedQuiz.options.map((opt) => opt.trim());
    }

    // 턴 범위 설정
    const turnRange = calculateTurnRange(difficulty);
    quiz.turnRangeStart = turnRange.start;
    quiz.turnRangeEnd = turnRange.end;

    return quiz;
  }

  /**
   * 품질 점수 계산 (간단한 규칙 기반)
   * Task #14에서 QuizQualityScorerService와 연동 예정
   */
  private calculateQualityScore(
    quiz: Quiz,
    difficulty: QuizDifficulty,
    infraContext: string[],
  ): QuizQualityScore {
    let clarity = 25;
    let relevance = 25;
    let difficultyScore = 25;
    let educational = 25;

    // 명확성 평가
    if (quiz.question.length < 50) clarity -= 10;
    if (quiz.question.includes('?') === false) clarity -= 5;
    if (quiz.type === QuizType.MULTIPLE_CHOICE && quiz.options) {
      const avgOptionLength = quiz.options.reduce((sum, opt) => sum + opt.length, 0) / 4;
      if (avgOptionLength < 10) clarity -= 5;
    }

    // 관련성 평가 (인프라 컨텍스트와의 연관성)
    const questionLower = quiz.question.toLowerCase();
    const matchedInfra = infraContext.filter((infra) =>
      questionLower.includes(infra.toLowerCase()),
    );
    if (matchedInfra.length === 0) {
      relevance -= 15;
    } else if (matchedInfra.length === 1) {
      relevance -= 5;
    }

    // 난이도 평가 (간단한 휴리스틱)
    const questionComplexity = quiz.question.split(' ').length;
    if (difficulty === QuizDifficulty.EASY && questionComplexity > 30) difficultyScore -= 10;
    if (difficulty === QuizDifficulty.HARD && questionComplexity < 20) difficultyScore -= 10;

    // 교육적 가치 평가
    if (quiz.explanation.length < 100) educational -= 10;
    if (!quiz.explanation.includes('왜')) educational -= 5;
    if (!quiz.explanation.includes('AWS') && infraContext.length > 0) educational -= 5;

    const total = clarity + relevance + difficultyScore + educational;

    return {
      clarity,
      relevance,
      difficulty: difficultyScore,
      educational,
      total,
      details: {
        evaluator: 'rule-based',
        evaluatedAt: new Date(),
      },
    };
  }

  /**
   * 캐시된 퀴즈 조회 (Task #15에서 QuizCacheService 연동)
   */
  private async getCachedQuiz(
    difficulty: QuizDifficulty,
    infraContext: string[],
  ): Promise<Quiz | null> {
    // TODO: Task #15에서 QuizCacheService 연동
    // 현재는 null 반환 (캐시 미사용)
    return null;
  }

  /**
   * 폴백: 사전 생성된 퀴즈 사용
   */
  private async useFallbackQuiz(
    difficulty: QuizDifficulty,
    infraContext: string[],
  ): Promise<Quiz> {
    this.metrics.fallbackUsed++;
    this.metrics.failedGenerations++;

    this.logger.log(
      `Using fallback quiz pool (difficulty: ${difficulty}, infraContext: ${infraContext.join(', ')})`,
    );

    try {
      // 사전 생성된 퀴즈 풀에서 조회
      // infraContext와 일치하거나 유사한 퀴즈 찾기
      const query = this.quizRepository
        .createQueryBuilder('quiz')
        .where('quiz.difficulty = :difficulty', { difficulty })
        .andWhere('quiz.source = :source', { source: QuizSource.FALLBACK })
        .andWhere('quiz.isActive = :isActive', { isActive: true })
        .orderBy('RANDOM()') // SQLite random
        .limit(10);

      const fallbackQuizzes = await query.getMany();

      if (fallbackQuizzes.length === 0) {
        // 폴백 퀴즈도 없으면 예외 발생
        throw new QuizGenerationException(
          'Failed to generate quiz: LLM failure and no fallback quizzes available',
          'TOTAL_FAILURE',
          this.MAX_RETRIES,
          { difficulty, infraContext },
        );
      }

      // 인프라 컨텍스트와 가장 일치하는 퀴즈 선택
      const bestMatch = this.findBestMatchingQuiz(fallbackQuizzes, infraContext);
      this.logger.log(`Selected fallback quiz: ${bestMatch.quizId}`);

      return bestMatch;
    } catch (error) {
      if (error instanceof QuizGenerationException) {
        throw error;
      }

      throw new QuizGenerationException(
        `Failed to retrieve fallback quiz: ${error.message}`,
        'FALLBACK_FAILURE',
        this.MAX_RETRIES,
        { difficulty, infraContext, error: error.message },
      );
    }
  }

  /**
   * 인프라 컨텍스트와 가장 일치하는 퀴즈 찾기
   */
  private findBestMatchingQuiz(quizzes: Quiz[], infraContext: string[]): Quiz {
    if (infraContext.length === 0) {
      return quizzes[0]; // 랜덤 선택 (이미 셔플됨)
    }

    let bestQuiz = quizzes[0];
    let maxMatches = 0;

    for (const quiz of quizzes) {
      const matches = quiz.infraContext.filter((infra) => infraContext.includes(infra)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestQuiz = quiz;
      }
    }

    return bestQuiz;
  }

  /**
   * 평균 생성 시간 업데이트
   */
  private updateAverageGenerationTime(newDuration: number): void {
    const totalTime = this.metrics.averageGenerationTimeMs * (this.metrics.totalGenerated - 1);
    this.metrics.averageGenerationTimeMs = (totalTime + newDuration) / this.metrics.totalGenerated;
  }

  /**
   * 평균 품질 점수 업데이트
   */
  private updateAverageQualityScore(newScore: number): void {
    const totalScore =
      this.metrics.averageQualityScore * (this.metrics.successfulGenerations - 1);
    this.metrics.averageQualityScore =
      (totalScore + newScore) / this.metrics.successfulGenerations;
  }

  /**
   * 메트릭 조회
   */
  getMetrics(): QuizGenerationMetrics {
    return { ...this.metrics };
  }

  /**
   * 메트릭 초기화
   */
  resetMetrics(): void {
    this.metrics = {
      totalGenerated: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      llmFailures: 0,
      validationFailures: 0,
      qualityFailures: 0,
      fallbackUsed: 0,
      averageGenerationTimeMs: 0,
      averageQualityScore: 0,
    };
    this.logger.log('Quiz generation metrics reset');
  }
}
