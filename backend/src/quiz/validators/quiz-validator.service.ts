import { Injectable, Logger } from '@nestjs/common';
import { Quiz, QuizType, QuizDifficulty } from '../../database/entities/quiz.entity';
import { QuizValidationResult } from '../interfaces/quiz-validation-result.interface';

/**
 * 퀴즈 검증 제한값
 */
interface QuizValidationLimits {
  question: { min: number; max: number };
  option: { min: number; max: number };
  explanation: { min: number; max: number };
  optionLengthStdDev: number;
  koreanRatioMin: number;
}

/**
 * 검증 단계별 결과
 */
interface StageResult {
  passed: boolean;
  issues: string[];
}

/**
 * AWS 서비스 용어 (정확한 표기)
 */
const AWS_SERVICES = [
  'EC2',
  'S3',
  'Lambda',
  'RDS',
  'Aurora',
  'EKS',
  'CloudFront',
  'Route53',
  'VPC',
  'DynamoDB',
  'ElastiCache',
  'CloudWatch',
  'Auto Scaling',
  'ECS',
  'Karpenter',
  'Bedrock',
  'SageMaker',
  'ALB',
  'ELB',
  'Redis',
  'MySQL',
  'PostgreSQL',
  'API Gateway',
  'SNS',
  'SQS',
  'Kinesis',
  'Glue',
  'Athena',
  'QuickSight',
];

/**
 * 금지 단어 목록 (부적절한 콘텐츠 필터링)
 */
const FORBIDDEN_WORDS = [
  '씨발',
  '개새끼',
  '병신',
  '좆',
  '엿먹어',
  '지랄',
  '닥쳐',
  '꺼져',
  '염병',
  '미친',
];

/**
 * 명백한 정답 패턴 키워드
 */
const OBVIOUS_KEYWORDS = [
  '항상',
  '절대',
  '무조건',
  '반드시',
  '절대로',
  '무조건',
  '확실히',
  '100%',
  '모든',
  '전부',
];

/**
 * QuizValidatorService
 *
 * LLM으로 생성된 퀴즈의 품질을 3단계로 검증합니다:
 * - Stage 1: 구조 검증 (필수 필드, 형식, 길이)
 * - Stage 2: 밸런스 검증 (난이도 적절성, 선택지 균형)
 * - Stage 3: 콘텐츠 품질 검증 (언어, AWS 용어, 교육적 가치)
 */
@Injectable()
export class QuizValidatorService {
  private readonly logger = new Logger(QuizValidatorService.name);

  /**
   * 검증 제한값
   */
  private readonly limits: QuizValidationLimits = {
    question: { min: 50, max: 300 },
    option: { min: 5, max: 100 },
    explanation: { min: 100, max: 500 },
    optionLengthStdDev: 30,
    koreanRatioMin: 0.5, // 50% - AWS 서비스명 등 영문 용어를 고려하여 60%로 설정
  };

  /**
   * 퀴즈 검증 메인 메서드
   *
   * @param quiz 검증할 퀴즈 객체 (전체 또는 부분)
   * @returns 검증 결과 (isValid, errors, warnings, breakdown)
   */
  async validate(quiz: Quiz | Partial<Quiz>): Promise<QuizValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Stage 1: 구조 검증 (모든 issues는 critical errors)
    const structureResult = this.validateStructure(quiz);
    if (!structureResult.passed) {
      errors.push(...structureResult.issues);
    }

    // Stage 2: 밸런스 검증 (모든 issues는 warnings, 항상 passed: true)
    const balanceResult = this.validateBalance(quiz);
    warnings.push(...balanceResult.issues);

    // Stage 3: 콘텐츠 품질 검증 (passed: false인 경우 일부 issues는 errors, passed: true면 warnings)
    const contentResult = this.validateContent(quiz);
    if (!contentResult.passed) {
      // contentResult.issues에는 critical errors + warnings가 섞여있음
      // 하지만 passed가 false라는 것은 critical error가 있다는 의미
      errors.push(...contentResult.issues);
    } else {
      // passed가 true면 모두 warnings
      warnings.push(...contentResult.issues);
    }

    const isValid = errors.length === 0;

    if (isValid) {
      this.logger.log(
        `퀴즈 검증 통과: ${quiz.type}/${quiz.difficulty} - "${quiz.question?.substring(0, 30)}..."`,
      );
    } else {
      this.logger.warn(
        `퀴즈 검증 실패 (${errors.length}개 에러): ${errors.join(', ')}`,
      );
    }

    return {
      isValid,
      errors,
      warnings,
      breakdown: {
        structure: structureResult,
        balance: balanceResult,
        content: contentResult,
      },
    };
  }

  /**
   * Stage 1: 구조 검증
   *
   * 필수 필드 존재 여부, 데이터 타입, 길이 제한 검증
   */
  private validateStructure(quiz: Partial<Quiz>): StageResult {
    const issues: string[] = [];

    // 1. 질문 검증
    if (!quiz.question || typeof quiz.question !== 'string') {
      issues.push('질문(question)이 누락되었거나 문자열이 아닙니다');
      return { passed: false, issues };
    }

    const trimmedQuestion = quiz.question.trim();
    if (trimmedQuestion.length === 0) {
      issues.push('질문이 비어있거나 공백만 포함합니다');
      return { passed: false, issues };
    }

    if (
      trimmedQuestion.length < this.limits.question.min ||
      trimmedQuestion.length > this.limits.question.max
    ) {
      issues.push(
        `질문 길이가 허용 범위를 벗어났습니다 (현재: ${trimmedQuestion.length}자, 허용: ${this.limits.question.min}-${this.limits.question.max}자)`,
      );
      return { passed: false, issues };
    }

    // HTML 태그 및 스크립트 주입 검사
    if (/<[^>]*>/g.test(trimmedQuestion)) {
      issues.push('질문에 HTML 태그가 포함되어 있습니다');
      return { passed: false, issues };
    }

    if (/script|javascript|onerror|onclick/gi.test(trimmedQuestion)) {
      issues.push('질문에 스크립트 코드가 포함되어 있습니다');
      return { passed: false, issues };
    }

    // 2. 퀴즈 타입 검증
    if (!quiz.type) {
      issues.push('퀴즈 타입(type)이 누락되었습니다');
      return { passed: false, issues };
    }

    if (!Object.values(QuizType).includes(quiz.type)) {
      issues.push(`유효하지 않은 퀴즈 타입: ${quiz.type}`);
      return { passed: false, issues };
    }

    // 3. 선택지 검증 (MULTIPLE_CHOICE만 해당)
    if (quiz.type === QuizType.MULTIPLE_CHOICE) {
      if (!quiz.options || !Array.isArray(quiz.options)) {
        issues.push('4지선다 퀴즈의 선택지(options)가 누락되었거나 배열이 아닙니다');
        return { passed: false, issues };
      }

      if (quiz.options.length !== 4) {
        issues.push(
          `4지선다 퀴즈는 정확히 4개의 선택지가 필요합니다 (현재: ${quiz.options.length}개)`,
        );
        return { passed: false, issues };
      }

      // 각 선택지 검증
      quiz.options.forEach((option, index) => {
        if (!option || typeof option !== 'string') {
          issues.push(`선택지 ${index + 1}이 비어있거나 문자열이 아닙니다`);
          return;
        }

        const trimmedOption = option.trim();
        if (trimmedOption.length === 0) {
          issues.push(`선택지 ${index + 1}이 공백만 포함합니다`);
          return;
        }

        if (
          trimmedOption.length < this.limits.option.min ||
          trimmedOption.length > this.limits.option.max
        ) {
          issues.push(
            `선택지 ${index + 1}의 길이가 허용 범위를 벗어났습니다 (현재: ${trimmedOption.length}자, 허용: ${this.limits.option.min}-${this.limits.option.max}자)`,
          );
        }
      });

      // 선택지 중복 검사
      const uniqueOptions = new Set(quiz.options.map((opt) => opt.trim()));
      if (uniqueOptions.size !== quiz.options.length) {
        issues.push('중복된 선택지가 있습니다');
        return { passed: false, issues };
      }
    }

    // 4. 정답 검증
    if (!quiz.correctAnswer || typeof quiz.correctAnswer !== 'string') {
      issues.push('정답(correctAnswer)이 누락되었거나 문자열이 아닙니다');
      return { passed: false, issues };
    }

    const normalizedAnswer = quiz.correctAnswer.trim().toUpperCase();

    if (quiz.type === QuizType.MULTIPLE_CHOICE) {
      if (!['A', 'B', 'C', 'D'].includes(normalizedAnswer)) {
        issues.push(
          `4지선다 퀴즈의 정답은 'A', 'B', 'C', 'D' 중 하나여야 합니다 (현재: ${quiz.correctAnswer})`,
        );
        return { passed: false, issues };
      }
    } else if (quiz.type === QuizType.OX) {
      const lowerAnswer = quiz.correctAnswer.trim().toLowerCase();
      if (!['true', 'false'].includes(lowerAnswer)) {
        issues.push(
          `OX 퀴즈의 정답은 'true' 또는 'false'여야 합니다 (현재: ${quiz.correctAnswer})`,
        );
        return { passed: false, issues };
      }
    }

    // 5. 설명 검증
    if (!quiz.explanation || typeof quiz.explanation !== 'string') {
      issues.push('설명(explanation)이 누락되었거나 문자열이 아닙니다');
      return { passed: false, issues };
    }

    const trimmedExplanation = quiz.explanation.trim();
    if (trimmedExplanation.length === 0) {
      issues.push('설명이 비어있거나 공백만 포함합니다');
      return { passed: false, issues };
    }

    if (
      trimmedExplanation.length < this.limits.explanation.min ||
      trimmedExplanation.length > this.limits.explanation.max
    ) {
      issues.push(
        `설명 길이가 허용 범위를 벗어났습니다 (현재: ${trimmedExplanation.length}자, 허용: ${this.limits.explanation.min}-${this.limits.explanation.max}자)`,
      );
      return { passed: false, issues };
    }

    // HTML 태그 검사 (설명)
    if (/<[^>]*>/g.test(trimmedExplanation)) {
      issues.push('설명에 HTML 태그가 포함되어 있습니다');
      return { passed: false, issues };
    }

    // 모든 검증 통과
    return { passed: true, issues };
  }

  /**
   * Stage 2: 밸런스 검증
   *
   * 난이도에 따른 적절성, 선택지 균형 검증
   *
   * 주의: 이 단계에서는 모두 경고만 발생 (critical error 없음)
   */
  private validateBalance(quiz: Partial<Quiz>): StageResult {
    const issues: string[] = [];

    // 난이도 검증
    if (!quiz.difficulty) {
      // 선택사항이므로 경고만
      issues.push('난이도(difficulty)가 설정되지 않았습니다');
    } else if (!Object.values(QuizDifficulty).includes(quiz.difficulty)) {
      issues.push(`유효하지 않은 난이도: ${quiz.difficulty}`);
    }

    // MULTIPLE_CHOICE 타입만 선택지 밸런스 검증
    if (quiz.type === QuizType.MULTIPLE_CHOICE && quiz.options) {
      // 선택지 길이 균형 검증 (표준편차 계산)
      const optionLengths = quiz.options.map((opt) => opt.trim().length);
      const avgLength =
        optionLengths.reduce((sum, len) => sum + len, 0) / optionLengths.length;
      const variance =
        optionLengths.reduce(
          (sum, len) => sum + Math.pow(len - avgLength, 2),
          0,
        ) / optionLengths.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > this.limits.optionLengthStdDev) {
        issues.push(
          `선택지 길이 편차가 큽니다 (표준편차: ${stdDev.toFixed(1)}, 허용: ${this.limits.optionLengthStdDev}). 선택지 길이를 비슷하게 맞춰주세요`,
        );
      }

      // 명백한 정답 패턴 검사
      const correctIndex = ['A', 'B', 'C', 'D'].indexOf(
        quiz.correctAnswer?.trim().toUpperCase() || '',
      );
      if (correctIndex !== -1) {
        const correctOption = quiz.options[correctIndex];

        // 정답이 항상 가장 긴 선택지인지 검사
        const isLongest = optionLengths.every(
          (len, idx) =>
            idx === correctIndex || len < optionLengths[correctIndex],
        );
        if (isLongest && optionLengths[correctIndex] > avgLength * 1.5) {
          issues.push(
            '정답 선택지가 다른 선택지보다 현저히 깁니다 (정답이 명백할 수 있음)',
          );
        }

        // 명백한 키워드 검사
        for (const keyword of OBVIOUS_KEYWORDS) {
          if (correctOption.includes(keyword)) {
            const otherOptionsHaveKeyword = quiz.options.some(
              (opt, idx) => idx !== correctIndex && opt.includes(keyword),
            );
            if (!otherOptionsHaveKeyword) {
              issues.push(
                `정답 선택지에만 명백한 키워드("${keyword}")가 포함되어 있습니다`,
              );
              break;
            }
          }
        }
      }
    }

    // 난이도별 복잡도 검증
    if (quiz.difficulty && quiz.question) {
      const questionComplexity = this.assessQuestionComplexity(quiz.question);

      switch (quiz.difficulty) {
        case QuizDifficulty.EASY:
          if (questionComplexity > 3) {
            issues.push(
              'EASY 난이도 치고 질문이 너무 복잡합니다 (간단한 AWS 서비스 개념 위주로)',
            );
          }
          break;
        case QuizDifficulty.MEDIUM:
          if (questionComplexity < 2 || questionComplexity > 6) {
            issues.push(
              'MEDIUM 난이도에 맞지 않는 질문 복잡도입니다 (아키텍처 결정 위주로)',
            );
          }
          break;
        case QuizDifficulty.HARD:
          if (questionComplexity < 4) {
            issues.push(
              'HARD 난이도 치고 질문이 너무 단순합니다 (고급 최적화, 멀티리전 위주로)',
            );
          }
          break;
      }
    }

    // 밸런스 검증은 모두 경고이므로 항상 passed: true
    return { passed: true, issues };
  }

  /**
   * Stage 3: 콘텐츠 품질 검증
   *
   * 한국어 비율, AWS 용어 정확성, 교육적 가치, 안전성 검증
   *
   * Critical errors: 한국어 비율 부족, 금지 단어, 개인정보, 질문 반복
   * Warnings: 문법, AWS 용어, 교육적 가치 부족, 해로운 지시사항
   */
  private validateContent(quiz: Partial<Quiz>): StageResult {
    const criticalErrors: string[] = [];
    const warnings: string[] = [];

    // 전체 텍스트 수집
    const allText = [
      quiz.question || '',
      quiz.explanation || '',
      ...(quiz.options || []),
    ].join(' ');

    // 1. 한국어 비율 검증 (80% 이상) - CRITICAL
    const koreanChars = allText.match(/[가-힣]/g)?.length || 0;
    const totalChars = allText.replace(/\s/g, '').length;
    const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0;

    if (koreanRatio < this.limits.koreanRatioMin) {
      criticalErrors.push(
        `한국어 비율이 낮습니다 (현재: ${(koreanRatio * 100).toFixed(1)}%, 최소: ${this.limits.koreanRatioMin * 100}%)`,
      );
    }

    // 2. 기본 문법 검증 (간단한 패턴 체크) - WARNING
    if (quiz.question && !quiz.question.trim().endsWith('?')) {
      warnings.push('질문이 물음표(?)로 끝나지 않습니다');
    }

    // 3. AWS 용어 정확성 검증 - WARNING
    const awsTermIssues = this.validateAWSTerminology(allText);
    if (awsTermIssues.length > 0) {
      warnings.push(...awsTermIssues);
    }

    // 4. 교육적 가치 검증
    if (quiz.explanation && quiz.question) {
      // 설명이 질문을 단순 반복하는지 검사 - CRITICAL
      const questionWords = new Set(
        quiz.question
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2),
      );
      const explanationWords = new Set(
        quiz.explanation.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
      );

      let commonWords = 0;
      questionWords.forEach((word) => {
        if (explanationWords.has(word)) commonWords++;
      });

      const similarity =
        questionWords.size > 0 ? commonWords / questionWords.size : 0;
      if (similarity > 0.8) {
        criticalErrors.push(
          '설명이 질문을 단순히 반복하고 있습니다 (교육적 가치 부족)',
        );
      }

      // 설명에 Best Practice나 이유 설명이 있는지 검사 - WARNING
      const hasEducationalContent =
        /권장|추천|이유|때문|Best Practice|성능|확장성|비용|보안|가용성/.test(
          quiz.explanation,
        );
      if (!hasEducationalContent) {
        warnings.push(
          '설명에 Best Practice, 이유, 또는 개념 설명이 부족합니다',
        );
      }
    }

    // 5. 콘텐츠 안전성 검증 (금지 단어, 개인정보) - CRITICAL
    for (const forbidden of FORBIDDEN_WORDS) {
      if (allText.includes(forbidden)) {
        criticalErrors.push(`부적절한 단어가 발견되었습니다: "${forbidden}"`);
      }
    }

    // 개인정보 패턴 검사 (이메일, 전화번호, 주민번호 등) - CRITICAL
    const personalInfoPatterns = [
      /\b[\w.-]+@[\w.-]+\.\w+\b/g, // 이메일
      /\b\d{3}-\d{3,4}-\d{4}\b/g, // 전화번호
      /\b\d{6}-\d{7}\b/g, // 주민번호
      /\b(?:비밀번호|password|token|secret|key)[\s:=]+[\w]+\b/gi, // 비밀번호 등
    ];

    for (const pattern of personalInfoPatterns) {
      if (pattern.test(allText)) {
        criticalErrors.push('개인정보가 포함되어 있을 수 있습니다');
        break; // 하나만 발견해도 충분
      }
    }

    // 6. 해로운 지시사항 검사 - WARNING
    const harmfulPatterns = [
      /삭제|제거|파괴|손상/g,
      /해킹|크랙|불법/g,
    ];

    for (const pattern of harmfulPatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 2) {
        // 맥락상 여러 번 등장하면 의심
        warnings.push('해로운 지시사항이 포함되어 있을 수 있습니다');
        break;
      }
    }

    // critical errors + warnings 합쳐서 issues로 반환
    const allIssues = [...criticalErrors, ...warnings];

    return {
      passed: criticalErrors.length === 0,
      issues: allIssues
    };
  }

  /**
   * AWS 용어 정확성 검증
   *
   * @param text 검증할 텍스트
   * @returns 발견된 이슈 목록
   */
  private validateAWSTerminology(text: string): string[] {
    const issues: string[] = [];

    // 잘못된 AWS 용어 패턴 검사
    const incorrectPatterns = [
      { pattern: /ec2 server|EC2 서버/gi, correct: 'EC2 인스턴스' },
      { pattern: /amazon aurora|아마존 aurora/gi, correct: 'Aurora' },
      { pattern: /aws rds|AWS RDS/g, correct: 'Amazon RDS 또는 RDS' },
      { pattern: /s3 버킷|S3 버킷/gi, correct: 'S3 버킷 (올바름)' }, // 이건 OK
      {
        pattern: /람다 함수|lambda function/gi,
        correct: 'Lambda 함수 또는 람다',
      },
    ];

    for (const { pattern, correct } of incorrectPatterns) {
      if (pattern.test(text) && !correct.includes('올바름')) {
        issues.push(`AWS 용어 표기 오류: ${correct} 형식을 권장합니다`);
      }
    }

    // 인프라 용어가 infraContext와 일치하는지 검사 (있을 경우)
    // 이 부분은 infraContext가 제공될 때만 검사
    // (현재는 경고만 표시)

    return issues;
  }

  /**
   * 질문 복잡도 평가
   *
   * @param question 질문 텍스트
   * @returns 복잡도 점수 (0-10)
   */
  private assessQuestionComplexity(question: string): number {
    let complexity = 0;

    // AWS 서비스 언급 수
    const awsServiceCount =
      AWS_SERVICES.filter((service) => question.includes(service)).length;
    complexity += awsServiceCount;

    // 복잡한 개념 키워드
    const advancedKeywords = [
      '멀티리전',
      'Multi-Region',
      '고가용성',
      'HA',
      '장애 복구',
      'DR',
      '성능 최적화',
      '비용 최적화',
      '오토스케일링',
      '마이크로서비스',
      'MSA',
      '서버리스',
      'Serverless',
    ];

    const advancedCount = advancedKeywords.filter((keyword) =>
      question.includes(keyword),
    ).length;
    complexity += advancedCount * 2;

    // 질문 길이 (긴 질문 = 복잡)
    if (question.length > 150) complexity += 1;
    if (question.length > 200) complexity += 1;

    // 조건절 존재 여부
    if (/만약|경우|상황|시나리오/.test(question)) {
      complexity += 1;
    }

    return Math.min(complexity, 10);
  }
}
