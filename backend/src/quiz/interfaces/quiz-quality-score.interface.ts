/**
 * 퀴즈 품질 점수
 * LLM 생성 퀴즈의 품질을 4가지 차원으로 평가
 * 각 차원은 0-25점 (총 100점 만점)
 */
export interface QuizQualityScore {
  /**
   * 명확성 점수 (0-25)
   * 질문과 선택지가 명확하고 이해하기 쉬운지 평가
   * - 질문이 구체적이고 모호하지 않은가?
   * - 선택지가 명확하고 중복되지 않는가?
   */
  clarity: number;

  /**
   * 관련성 점수 (0-25)
   * 인프라 컨텍스트와의 관련성 평가
   * - 현재 게임 인프라와 관련이 있는가?
   * - AWS 서비스 사용 맥락에 적합한가?
   */
  relevance: number;

  /**
   * 난이도 점수 (0-25)
   * 설정된 난이도와 실제 문제 난이도의 일치성 평가
   * - EASY: 기본 개념, 단순 선택
   * - MEDIUM: 비교/분석, 적절한 선택
   * - HARD: 복잡한 시나리오, 깊은 이해 필요
   */
  difficulty: number;

  /**
   * 교육적 가치 점수 (0-25)
   * 퀴즈가 AWS 지식 학습에 도움이 되는지 평가
   * - 실용적인 지식을 다루는가?
   * - 해설이 충분히 설명되어 있는가?
   */
  educational: number;

  /**
   * 총점 (0-100)
   * clarity + relevance + difficulty + educational
   */
  total: number;

  /**
   * 평가 세부 정보 (선택적)
   */
  details?: {
    /**
     * 각 차원별 감점 이유
     */
    deductions?: {
      clarity?: string[];
      relevance?: string[];
      difficulty?: string[];
      educational?: string[];
    };

    /**
     * 평가자 (LLM 또는 규칙 기반)
     */
    evaluator?: 'llm' | 'rule-based';

    /**
     * 평가 시각
     */
    evaluatedAt?: Date;
  };
}
