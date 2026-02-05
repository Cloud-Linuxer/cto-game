/**
 * 검증 단계별 결과
 */
export interface ValidationStageResult {
  passed: boolean;
  issues: string[];
}

/**
 * 퀴즈 검증 결과
 * LLM으로 생성된 퀴즈의 유효성 검사 결과
 */
export interface QuizValidationResult {
  /**
   * 검증 통과 여부
   * true: 모든 검증 통과
   * false: 하나 이상의 검증 실패
   */
  isValid: boolean;

  /**
   * 에러 목록
   * 검증 실패 시 에러 메시지 배열 (critical issues - block usage)
   * 예: ['질문이 너무 짧습니다', '정답이 누락되었습니다']
   */
  errors: string[];

  /**
   * 경고 목록
   * 검증 통과했지만 개선이 필요한 사항 (minor issues - allow with warnings)
   * 예: ['설명이 너무 길 수 있습니다', '선택지가 불명확할 수 있습니다']
   */
  warnings: string[];

  /**
   * 3단계 검증 세부 결과
   */
  breakdown: {
    /**
     * Stage 1: 구조 검증
     * 필수 필드, 형식, 길이 제한 검증
     */
    structure: ValidationStageResult;

    /**
     * Stage 2: 밸런스 검증
     * 난이도 적절성, 선택지 균형 검증
     */
    balance: ValidationStageResult;

    /**
     * Stage 3: 콘텐츠 품질 검증
     * 언어, AWS 용어, 교육적 가치, 안전성 검증
     */
    content: ValidationStageResult;
  };

  /**
   * 검증 세부 정보 (선택적, 레거시 호환성)
   */
  details?: {
    /**
     * 질문 길이 검증
     */
    questionLength?: {
      actual: number;
      min: number;
      max: number;
      isValid: boolean;
    };

    /**
     * 선택지 검증 (4지선다만 해당)
     */
    optionsValidation?: {
      count: number;
      expectedCount: number;
      isValid: boolean;
    };

    /**
     * 정답 형식 검증
     */
    answerFormat?: {
      actual: string;
      expectedFormat: string;
      isValid: boolean;
    };

    /**
     * 인프라 컨텍스트 검증
     */
    infraContextValidation?: {
      provided: string[];
      isValid: boolean;
    };
  };
}
