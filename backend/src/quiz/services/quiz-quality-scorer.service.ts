import { Injectable, Logger } from '@nestjs/common';
import { Quiz, QuizType, QuizDifficulty } from '../../database/entities/quiz.entity';

/**
 * Quiz Quality Score
 *
 * 퀴즈 품질을 4가지 차원으로 평가 (각 0-25점, 총 100점)
 */
export interface QuizQualityScore {
  /**
   * 명확성 점수 (0-25)
   * 질문과 선택지가 명확하고 이해하기 쉬운지 평가
   */
  clarity: number;

  /**
   * 관련성 점수 (0-25)
   * 인프라 컨텍스트와의 관련성 평가
   */
  relevance: number;

  /**
   * 난이도 점수 (0-25)
   * 설정된 난이도와 실제 문제 난이도의 일치성 평가
   */
  difficulty: number;

  /**
   * 교육적 가치 점수 (0-25)
   * 퀴즈가 AWS 지식 학습에 도움이 되는지 평가
   */
  educational: number;

  /**
   * 총점 (0-100)
   */
  total: number;

  /**
   * 세부 평가 내역
   */
  breakdown: {
    [dimension: string]: {
      score: number;
      maxScore: number;
      details: string;
    };
  };

  /**
   * 합격 여부 (total >= 60)
   */
  passed: boolean;

  /**
   * 개선 제안
   */
  suggestions: string[];
}

/**
 * Quiz Quality Scorer Service
 *
 * EPIC-07 Feature 4: LLM으로 생성된 퀴즈의 품질을 4가지 차원에서 평가
 * 1. Clarity (명확성): 질문과 선택지의 명확성
 * 2. Relevance (관련성): AWS 인프라 컨텍스트 관련성
 * 3. Difficulty (난이도): 난이도 정확성
 * 4. Educational (교육성): 학습 가치
 *
 * 최소 기준: 60/100 (합격)
 * 목표: 평균 80/100
 */
@Injectable()
export class QuizQualityScorerService {
  private readonly logger = new Logger(QuizQualityScorerService.name);

  /**
   * 퀴즈 품질 점수 계산 (공개 API)
   */
  async scoreQuiz(quiz: Quiz, infraContext?: string[]): Promise<QuizQualityScore> {
    const clarityScore = this.scoreClarity(quiz);
    const relevanceScore = this.scoreRelevance(quiz, infraContext);
    const difficultyScore = this.scoreDifficulty(quiz);
    const educationalScore = this.scoreEducational(quiz);

    const total = clarityScore.total + relevanceScore.total + difficultyScore.total + educationalScore.total;
    const passed = total >= 60;

    const suggestions = this.generateSuggestions(quiz, {
      clarity: clarityScore,
      relevance: relevanceScore,
      difficulty: difficultyScore,
      educational: educationalScore,
    });

    this.logger.debug(
      `Quality Score for quiz "${quiz.question.substring(0, 50)}...": ${total}/100 ` +
        `(clarity: ${clarityScore.total}, relevance: ${relevanceScore.total}, ` +
        `difficulty: ${difficultyScore.total}, educational: ${educationalScore.total})`,
    );

    return {
      clarity: clarityScore.total,
      relevance: relevanceScore.total,
      difficulty: difficultyScore.total,
      educational: educationalScore.total,
      total,
      breakdown: {
        ...clarityScore.breakdown,
        ...relevanceScore.breakdown,
        ...difficultyScore.breakdown,
        ...educationalScore.breakdown,
      },
      passed,
      suggestions,
    };
  }

  /**
   * Dimension 1: Clarity (명확성) 평가 (0-25점)
   *
   * 평가 기준:
   * - 질문 명확성 (0-10점)
   * - 선택지 명확성 (0-10점, MULTIPLE_CHOICE만)
   * - 언어 품질 (0-5점)
   */
  private scoreClarity(quiz: Quiz): { total: number; breakdown: Record<string, any> } {
    let questionClarity = 10;
    let optionClarity = 10;
    let languageQuality = 5;

    const breakdown: Record<string, any> = {};

    // 1. 질문 명확성 (0-10점)
    const questionLength = quiz.question.length;
    let questionDetails = '';

    if (questionLength < 20) {
      questionClarity = 3;
      questionDetails = '질문이 너무 짧음 (명확성 부족)';
    } else if (questionLength < 40) {
      questionClarity = 6;
      questionDetails = '질문이 짧음 (다소 불명확)';
    } else if (questionLength > 300) {
      questionClarity = 7;
      questionDetails = '질문이 너무 김 (가독성 저하)';
    } else {
      // 모호한 표현 체크
      const ambiguousWords = ['보통', '일반적으로', '대부분', '어느 정도', '아마도', '가능하면'];
      const hasAmbiguous = ambiguousWords.some((word) => quiz.question.includes(word));
      if (hasAmbiguous) {
        questionClarity = 7;
        questionDetails = '모호한 표현 포함';
      } else {
        questionDetails = '명확하고 구체적인 질문';
      }
    }

    breakdown.questionClarity = {
      score: questionClarity,
      maxScore: 10,
      details: questionDetails,
    };

    // 2. 선택지 명확성 (0-10점, MULTIPLE_CHOICE만)
    let optionDetails = '';
    if (quiz.type === QuizType.MULTIPLE_CHOICE) {
      if (!quiz.options || quiz.options.length < 2) {
        optionClarity = 0;
        optionDetails = '선택지 개수 부족';
      } else if (quiz.options.length < 4) {
        optionClarity = 5;
        optionDetails = '선택지 개수 적음 (4개 권장)';
      } else {
        // 선택지 중복 또는 유사성 체크
        const uniqueOptions = new Set(quiz.options.map((opt) => opt.trim().toLowerCase()));
        if (uniqueOptions.size < quiz.options.length) {
          optionClarity = 3;
          optionDetails = '중복되거나 유사한 선택지 존재';
        } else {
          // 선택지 길이 균형 체크
          const lengths = quiz.options.map((opt) => opt.length);
          const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
          const maxDeviation = Math.max(...lengths.map((len) => Math.abs(len - avgLength)));

          if (maxDeviation > avgLength * 0.8) {
            optionClarity = 7;
            optionDetails = '선택지 길이 불균형 (의도 노출 가능)';
          } else {
            // 너무 짧은 선택지 체크
            const hasTooShort = quiz.options.some((opt) => opt.length < 3);
            if (hasTooShort) {
              optionClarity = 6;
              optionDetails = '너무 짧은 선택지 존재';
            } else {
              optionDetails = '선택지 명확하고 균형적';
            }
          }
        }
      }
    } else {
      // OX 퀴즈는 선택지 평가 제외
      optionClarity = 10;
      optionDetails = 'OX 퀴즈 (선택지 평가 제외)';
    }

    breakdown.optionClarity = {
      score: optionClarity,
      maxScore: 10,
      details: optionDetails,
    };

    // 3. 언어 품질 (0-5점)
    let languageDetails = '';

    // 문법 및 표현 체크
    const hasRepeatedWords = /(\S+)\s+\1/.test(quiz.question); // 연속 중복 단어
    const hasExcessivePunctuation = /[!?]{2,}/.test(quiz.question); // 과도한 문장부호

    if (hasRepeatedWords) {
      languageQuality = 2;
      languageDetails = '문법 오류: 중복 단어 발견';
    } else if (hasExcessivePunctuation) {
      languageQuality = 3;
      languageDetails = '과도한 문장부호 사용';
    } else if (questionLength < 30) {
      languageQuality = 3;
      languageDetails = '질문이 단순함';
    } else {
      languageDetails = '문법적으로 정확하고 전문적';
    }

    breakdown.languageQuality = {
      score: languageQuality,
      maxScore: 5,
      details: languageDetails,
    };

    const total = questionClarity + optionClarity + languageQuality;
    return { total: Math.max(0, Math.min(25, total)), breakdown };
  }

  /**
   * Dimension 2: Relevance (관련성) 평가 (0-25점)
   *
   * 평가 기준:
   * - 인프라 컨텍스트 매치 (0-10점)
   * - AWS 정확성 (0-10점)
   * - 실용적 적용 가능성 (0-5점)
   */
  private scoreRelevance(quiz: Quiz, infraContext?: string[]): { total: number; breakdown: Record<string, any> } {
    let infraMatch = 10;
    let awsAccuracy = 10;
    let practicalApplicability = 5;

    const breakdown: Record<string, any> = {};

    // 1. 인프라 컨텍스트 매치 (0-10점)
    let infraDetails = '';

    if (infraContext && infraContext.length > 0) {
      // 퀴즈의 infraContext와 게임 인프라의 교집합 확인
      const quizInfra = quiz.infraContext || [];
      const intersection = quizInfra.filter((infra) => infraContext.includes(infra));

      if (intersection.length === 0) {
        infraMatch = 3;
        infraDetails = '게임 인프라와 무관함 (Generic AWS 질문)';
      } else if (intersection.length === quizInfra.length) {
        infraMatch = 10;
        infraDetails = `현재 인프라와 직접 관련 (${intersection.join(', ')})`;
      } else {
        infraMatch = 7;
        infraDetails = `일부 인프라 관련 (${intersection.join(', ')})`;
      }
    } else {
      // 인프라 컨텍스트 미제공 시 퀴즈의 infraContext 존재 여부로만 판단
      const quizInfra = quiz.infraContext || [];
      if (quizInfra.length === 0) {
        infraMatch = 5;
        infraDetails = '특정 인프라 컨텍스트 없음';
      } else {
        infraMatch = 7;
        infraDetails = `인프라 관련 (${quizInfra.join(', ')})`;
      }
    }

    breakdown.infraContextMatch = {
      score: infraMatch,
      maxScore: 10,
      details: infraDetails,
    };

    // 2. AWS 정확성 (0-10점)
    let awsDetails = '';
    const allText = `${quiz.question} ${quiz.options?.join(' ') || ''} ${quiz.explanation}`;

    // AWS 서비스 이름 정확성 체크
    const awsServices = allText.match(
      /EC2|S3|Lambda|RDS|Aurora|EKS|CloudFront|Route53|VPC|DynamoDB|ElastiCache|ALB|NLB|CloudWatch|IAM|KMS|SNS|SQS|ECS|Fargate|Kinesis|Glue|Athena|QuickSight|Bedrock|SageMaker|Karpenter|EBS|EFS|FSx/gi,
    );
    const awsServiceCount = awsServices ? new Set(awsServices.map((s) => s.toUpperCase())).size : 0;

    // 잘못된 AWS 용어 체크 (흔한 오류)
    const incorrectTerms = [
      'AWS Lambda Function', // 올바른 표현: Lambda function
      'EC2 Instance Server', // EC2 instance
      'RDS Database Server', // RDS instance
      'S3 Storage Bucket', // S3 bucket
    ];
    const hasIncorrectTerms = incorrectTerms.some((term) => allText.includes(term));

    if (hasIncorrectTerms) {
      awsAccuracy = 4;
      awsDetails = 'AWS 용어 사용 오류';
    } else if (awsServiceCount === 0) {
      awsAccuracy = 3;
      awsDetails = 'AWS 서비스 언급 없음 (관련성 낮음)';
    } else if (awsServiceCount >= 3) {
      awsAccuracy = 10;
      awsDetails = `다양한 AWS 서비스 언급 (${awsServiceCount}개)`;
    } else {
      awsAccuracy = 7;
      awsDetails = `AWS 서비스 언급 (${awsServiceCount}개)`;
    }

    breakdown.awsAccuracy = {
      score: awsAccuracy,
      maxScore: 10,
      details: awsDetails,
    };

    // 3. 실용적 적용 가능성 (0-5점)
    let practicalDetails = '';

    // 실전 시나리오 키워드 체크
    const practicalKeywords = [
      '스타트업',
      '서비스',
      '사용자',
      '고객',
      '트래픽',
      '장애',
      '비용',
      '성능',
      '확장',
      '운영',
      '배포',
      '모니터링',
      '최적화',
    ];
    const practicalCount = practicalKeywords.filter((keyword) => allText.includes(keyword)).length;

    // 추상적/학술적 표현 체크
    const academicKeywords = ['정의', '개념', '이론', '원리', '역사'];
    const isAcademic = academicKeywords.some((keyword) => quiz.question.includes(keyword));

    if (practicalCount === 0 || isAcademic) {
      practicalApplicability = 1;
      practicalDetails = '학술적/이론적 내용 (실용성 낮음)';
    } else if (practicalCount >= 3) {
      practicalApplicability = 5;
      practicalDetails = '실전 시나리오 기반 (매우 실용적)';
    } else {
      practicalApplicability = 3;
      practicalDetails = '일부 실용적 요소 포함';
    }

    breakdown.practicalApplicability = {
      score: practicalApplicability,
      maxScore: 5,
      details: practicalDetails,
    };

    const total = infraMatch + awsAccuracy + practicalApplicability;
    return { total: Math.max(0, Math.min(25, total)), breakdown };
  }

  /**
   * Dimension 3: Difficulty (난이도) 평가 (0-25점)
   *
   * 평가 기준:
   * - 난이도 정렬 (0-15점)
   * - 지식 요구 깊이 (0-5점)
   * - Distractor 품질 (0-5점, MULTIPLE_CHOICE만)
   */
  private scoreDifficulty(quiz: Quiz): { total: number; breakdown: Record<string, any> } {
    let difficultyAlignment = 15;
    let knowledgeRequirement = 5;
    let distractorQuality = 5;

    const breakdown: Record<string, any> = {};

    // 1. 난이도 정렬 (0-15점)
    let alignmentDetails = '';
    const allText = `${quiz.question} ${quiz.options?.join(' ') || ''}`;

    // 복잡도 점수 계산 (0-10)
    let complexityScore = 0;

    // 다중 조건/비교 포함 여부
    if (/그리고|또는|동시에|반면|비교|차이|장단점/.test(allText)) {
      complexityScore += 2;
    }

    // 구체적 수치/규격 언급
    if (/[0-9]+\s*(GB|TB|Mbps|Gbps|ms|초|분|개|대|%)/gi.test(allText)) {
      complexityScore += 2;
    }

    // 고급 AWS 서비스 언급
    const advancedServices = ['EKS', 'Karpenter', 'Aurora Global', 'Bedrock', 'SageMaker', 'QuickSight', 'Glue'];
    if (advancedServices.some((svc) => allText.includes(svc))) {
      complexityScore += 3;
    }

    // 아키텍처/최적화 개념
    const architectureConcepts = [
      'Multi-AZ',
      'Multi-Region',
      'Auto Scaling',
      '로드밸런싱',
      '캐싱',
      'CDN',
      'DR',
      '장애조치',
      '복제',
    ];
    if (architectureConcepts.some((concept) => allText.includes(concept))) {
      complexityScore += 2;
    }

    // 질문 길이
    if (quiz.question.length > 150) {
      complexityScore += 1;
    }

    // 난이도별 기대 복잡도와 비교
    const expectedComplexity = {
      [QuizDifficulty.EASY]: 2, // 0-3
      [QuizDifficulty.MEDIUM]: 5, // 3-7
      [QuizDifficulty.HARD]: 8, // 7-10
    };

    const expected = expectedComplexity[quiz.difficulty];
    const deviation = Math.abs(complexityScore - expected);

    if (deviation <= 1) {
      difficultyAlignment = 15;
      alignmentDetails = `난이도 완벽 정렬 (복잡도: ${complexityScore}/10)`;
    } else if (deviation <= 2) {
      difficultyAlignment = 12;
      alignmentDetails = `난이도 대체로 적절 (복잡도: ${complexityScore}/10, 기대: ${expected})`;
    } else if (deviation <= 4) {
      difficultyAlignment = 8;
      alignmentDetails = `난이도 다소 부정확 (복잡도: ${complexityScore}/10, 기대: ${expected})`;
    } else {
      difficultyAlignment = 4;
      alignmentDetails = `난이도 크게 불일치 (복잡도: ${complexityScore}/10, 기대: ${expected})`;
    }

    breakdown.difficultyAlignment = {
      score: difficultyAlignment,
      maxScore: 15,
      details: alignmentDetails,
    };

    // 2. 지식 요구 깊이 (0-5점)
    let knowledgeDetails = '';

    // 기본 개념 vs 심화 개념
    const basicConcepts = ['생성', '시작', '중지', '삭제', '저장', '업로드', '다운로드'];
    const advancedConcepts = ['최적화', '확장', '복제', '장애조치', '다중화', '캐싱', '모니터링', '자동화'];

    const hasBasic = basicConcepts.some((concept) => allText.includes(concept));
    const hasAdvanced = advancedConcepts.some((concept) => allText.includes(concept));

    if (quiz.difficulty === QuizDifficulty.EASY) {
      if (hasBasic && !hasAdvanced) {
        knowledgeRequirement = 5;
        knowledgeDetails = 'EASY에 적합한 기본 개념';
      } else if (hasAdvanced) {
        knowledgeRequirement = 2;
        knowledgeDetails = 'EASY치고 너무 심화된 개념';
      } else {
        knowledgeRequirement = 3;
        knowledgeDetails = 'EASY 수준 적절';
      }
    } else if (quiz.difficulty === QuizDifficulty.MEDIUM) {
      if (hasAdvanced) {
        knowledgeRequirement = 5;
        knowledgeDetails = 'MEDIUM에 적합한 심화 개념';
      } else if (hasBasic) {
        knowledgeRequirement = 3;
        knowledgeDetails = 'MEDIUM치고 다소 쉬움';
      } else {
        knowledgeRequirement = 4;
        knowledgeDetails = 'MEDIUM 수준 적절';
      }
    } else {
      // HARD
      if (hasAdvanced && complexityScore >= 7) {
        knowledgeRequirement = 5;
        knowledgeDetails = 'HARD에 적합한 고급 지식 요구';
      } else {
        knowledgeRequirement = 2;
        knowledgeDetails = 'HARD치고 지식 깊이 부족';
      }
    }

    breakdown.knowledgeRequirement = {
      score: knowledgeRequirement,
      maxScore: 5,
      details: knowledgeDetails,
    };

    // 3. Distractor 품질 (0-5점, MULTIPLE_CHOICE만)
    let distractorDetails = '';

    if (quiz.type === QuizType.MULTIPLE_CHOICE && quiz.options && quiz.options.length >= 4) {
      // 오답 선택지(distractor)의 그럴듯함 평가
      const correctIndex = this.getCorrectAnswerIndex(quiz);

      if (correctIndex === -1) {
        distractorQuality = 0;
        distractorDetails = '정답 인덱스 확인 불가';
      } else {
        const distractors = quiz.options.filter((_, idx) => idx !== correctIndex);

        // 명백히 잘못된 답변 체크 (너무 짧거나, "없음", "전혀" 등)
        const obviouslyWrong = distractors.filter(
          (opt) => opt.length < 5 || /없음|전혀|절대|모름|알 수 없음/.test(opt),
        );

        if (obviouslyWrong.length >= 2) {
          distractorQuality = 1;
          distractorDetails = '명백히 틀린 오답 과다 (선택 쉬움)';
        } else if (obviouslyWrong.length === 1) {
          distractorQuality = 3;
          distractorDetails = '일부 오답이 명백함';
        } else {
          // 모든 distractor가 그럴듯함
          distractorQuality = 5;
          distractorDetails = '모든 오답이 그럴듯함 (좋은 품질)';
        }
      }
    } else if (quiz.type === QuizType.OX) {
      distractorQuality = 5;
      distractorDetails = 'OX 퀴즈 (distractor 평가 제외)';
    } else {
      distractorQuality = 0;
      distractorDetails = '선택지 개수 부족';
    }

    breakdown.distractorQuality = {
      score: distractorQuality,
      maxScore: 5,
      details: distractorDetails,
    };

    const total = difficultyAlignment + knowledgeRequirement + distractorQuality;
    return { total: Math.max(0, Math.min(25, total)), breakdown };
  }

  /**
   * Dimension 4: Educational (교육적 가치) 평가 (0-25점)
   *
   * 평가 기준:
   * - 학습 가치 (0-10점)
   * - 설명 품질 (0-10점)
   * - 실행 가능한 지식 (0-5점)
   */
  private scoreEducational(quiz: Quiz): { total: number; breakdown: Record<string, any> } {
    let learningValue = 10;
    let explanationQuality = 10;
    let actionableKnowledge = 5;

    const breakdown: Record<string, any> = {};

    // 1. 학습 가치 (0-10점)
    let learningDetails = '';
    const allText = `${quiz.question} ${quiz.explanation}`;

    // AWS 베스트 프랙티스 키워드
    const bestPractices = [
      '베스트 프랙티스',
      '권장',
      '최적화',
      '효율',
      '보안',
      '안정성',
      '확장성',
      '가용성',
      '비용 절감',
      '성능 향상',
    ];
    const bestPracticeCount = bestPractices.filter((bp) => allText.includes(bp)).length;

    // 중요한 AWS 개념
    const importantConcepts = [
      'Auto Scaling',
      'Load Balancing',
      '다중 AZ',
      'Multi-Region',
      '캐싱',
      'CDN',
      '백업',
      '복구',
      '모니터링',
      '암호화',
    ];
    const conceptCount = importantConcepts.filter((concept) => allText.includes(concept)).length;

    if (conceptCount >= 2 && bestPracticeCount >= 1) {
      learningValue = 10;
      learningDetails = '중요한 AWS 개념과 베스트 프랙티스 학습';
    } else if (conceptCount >= 1 || bestPracticeCount >= 1) {
      learningValue = 7;
      learningDetails = 'AWS 개념 또는 베스트 프랙티스 포함';
    } else {
      // 단순 사실 확인 문제인지 체크
      const isTrivia =
        quiz.question.includes('몇') ||
        quiz.question.includes('언제') ||
        quiz.question.includes('누가') ||
        quiz.question.includes('어디');

      if (isTrivia) {
        learningValue = 3;
        learningDetails = '단순 사실 확인 (학습 가치 낮음)';
      } else {
        learningValue = 5;
        learningDetails = '일반적인 AWS 지식';
      }
    }

    breakdown.learningValue = {
      score: learningValue,
      maxScore: 10,
      details: learningDetails,
    };

    // 2. 설명 품질 (0-10점)
    let explanationDetails = '';
    const explLength = quiz.explanation?.length || 0;

    if (!quiz.explanation || explLength < 20) {
      explanationQuality = 2;
      explanationDetails = '설명 없거나 너무 짧음';
    } else if (explLength < 50) {
      explanationQuality = 5;
      explanationDetails = '설명이 짧음 (이유 부족)';
    } else if (explLength > 500) {
      explanationQuality = 7;
      explanationDetails = '설명이 너무 김 (간결성 부족)';
    } else {
      // 설명에 이유/근거 포함 여부
      const hasReasoning = /왜냐하면|때문에|이유는|따라서|그래서|그러므로/.test(quiz.explanation);
      const hasContext = /경우|상황|시나리오|예를 들어/.test(quiz.explanation);

      if (hasReasoning && hasContext) {
        explanationQuality = 10;
        explanationDetails = '우수한 설명 (이유와 맥락 포함)';
      } else if (hasReasoning || hasContext) {
        explanationQuality = 8;
        explanationDetails = '좋은 설명 (이유 또는 맥락 포함)';
      } else {
        explanationQuality = 6;
        explanationDetails = '기본적인 설명';
      }
    }

    breakdown.explanationQuality = {
      score: explanationQuality,
      maxScore: 10,
      details: explanationDetails,
    };

    // 3. 실행 가능한 지식 (0-5점)
    let actionableDetails = '';

    // 실행 가능한 액션 키워드
    const actionKeywords = [
      '설정',
      '구성',
      '활성화',
      '배포',
      '적용',
      '선택',
      '사용',
      '구현',
      '마이그레이션',
      '전환',
      '변경',
    ];
    const actionCount = actionKeywords.filter((keyword) => allText.includes(keyword)).length;

    // 게임 내 의사결정 관련성
    const gameRelevant = ['인프라', '비용', '성능', '확장', '장애', '트래픽', '사용자'].filter((keyword) =>
      allText.includes(keyword),
    ).length;

    if (actionCount >= 2 && gameRelevant >= 2) {
      actionableKnowledge = 5;
      actionableDetails = '게임 의사결정에 즉시 적용 가능';
    } else if (actionCount >= 1 || gameRelevant >= 1) {
      actionableKnowledge = 3;
      actionableDetails = '향후 결정에 유용한 지식';
    } else {
      actionableKnowledge = 1;
      actionableDetails = '이론적 지식 (실행 가능성 낮음)';
    }

    breakdown.actionableKnowledge = {
      score: actionableKnowledge,
      maxScore: 5,
      details: actionableDetails,
    };

    const total = learningValue + explanationQuality + actionableKnowledge;
    return { total: Math.max(0, Math.min(25, total)), breakdown };
  }

  /**
   * 개선 제안 생성
   */
  private generateSuggestions(
    quiz: Quiz,
    scores: {
      clarity: { total: number; breakdown: Record<string, any> };
      relevance: { total: number; breakdown: Record<string, any> };
      difficulty: { total: number; breakdown: Record<string, any> };
      educational: { total: number; breakdown: Record<string, any> };
    },
  ): string[] {
    const suggestions: string[] = [];

    // Clarity 개선
    if (scores.clarity.breakdown.questionClarity.score < 7) {
      suggestions.push('질문을 더 구체적이고 명확하게 작성하세요');
    }
    if (scores.clarity.breakdown.optionClarity.score < 7 && quiz.type === QuizType.MULTIPLE_CHOICE) {
      suggestions.push('선택지를 더 명확하고 구별되게 작성하세요');
    }
    if (scores.clarity.breakdown.languageQuality.score < 4) {
      suggestions.push('문법과 표현을 개선하세요');
    }

    // Relevance 개선
    if (scores.relevance.breakdown.infraContextMatch.score < 7) {
      suggestions.push('게임 인프라 컨텍스트와 더 관련된 내용으로 수정하세요');
    }
    if (scores.relevance.breakdown.awsAccuracy.score < 7) {
      suggestions.push('AWS 서비스 이름과 용어를 정확하게 사용하세요');
    }
    if (scores.relevance.breakdown.practicalApplicability.score < 4) {
      suggestions.push('실전 시나리오 기반으로 질문을 재구성하세요');
    }

    // Difficulty 개선
    if (scores.difficulty.breakdown.difficultyAlignment.score < 10) {
      suggestions.push(`${quiz.difficulty} 난이도에 맞게 질문 복잡도를 조정하세요`);
    }
    if (scores.difficulty.breakdown.distractorQuality.score < 4 && quiz.type === QuizType.MULTIPLE_CHOICE) {
      suggestions.push('오답 선택지를 더 그럴듯하게 작성하세요 (명백히 틀린 답변 제거)');
    }

    // Educational 개선
    if (scores.educational.breakdown.learningValue.score < 7) {
      suggestions.push('AWS 베스트 프랙티스나 중요 개념을 포함하세요');
    }
    if (scores.educational.breakdown.explanationQuality.score < 7) {
      suggestions.push('설명에 이유와 맥락을 추가하세요');
    }
    if (scores.educational.breakdown.actionableKnowledge.score < 4) {
      suggestions.push('게임 의사결정에 적용 가능한 실용적 지식을 다루세요');
    }

    return suggestions;
  }

  /**
   * 정답 인덱스 찾기 (A, B, C, D -> 0, 1, 2, 3)
   */
  private getCorrectAnswerIndex(quiz: Quiz): number {
    const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    return answerMap[quiz.correctAnswer.toUpperCase()] ?? -1;
  }

  /**
   * 품질 리포트 생성 (상세 분석)
   */
  async generateQualityReport(quiz: Quiz, infraContext?: string[]): Promise<string> {
    const score = await this.scoreQuiz(quiz, infraContext);

    const report = `
=== Quiz Quality Report ===

Question: ${quiz.question.substring(0, 80)}${quiz.question.length > 80 ? '...' : ''}
Type: ${quiz.type}
Difficulty: ${quiz.difficulty}

Scores:
- Clarity (명확성):        ${score.clarity}/25
- Relevance (관련성):      ${score.relevance}/25
- Difficulty (난이도):     ${score.difficulty}/25
- Educational (교육성):    ${score.educational}/25
----------------------------------------
Total (총점):             ${score.total}/100

Grade: ${this.getGrade(score.total)}

${score.passed ? '✅ 품질 기준 통과 (≥60점)' : '❌ 품질 기준 미달 (<60점)'}

${score.suggestions.length > 0 ? `\n개선 제안:\n${score.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}
    `.trim();

    return report;
  }

  /**
   * 점수에 따른 등급 부여
   */
  private getGrade(score: number): string {
    if (score >= 90) return 'S (Excellent)';
    if (score >= 80) return 'A (Good)';
    if (score >= 70) return 'B (Fair)';
    if (score >= 60) return 'C (Pass)';
    return 'D (Fail)';
  }
}
