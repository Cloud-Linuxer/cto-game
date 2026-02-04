/**
 * LLM 응답 검증 관련 타입 정의
 */

export interface ValidationResult {
  passed: boolean;
  stage: 'structure' | 'balance' | 'content' | 'approved';
  errors: string[];
  warnings: string[];
  qualityScore?: EventQualityScore;
}

export interface EventQualityScore {
  coherence: number; // 문맥 일관성 (0~100)
  balance: number; // 밸런스 적정성 (0~100)
  entertainment: number; // 재미 요소 (0~100)
  educational: number; // 교육 가치 (0~100)
  overall: number; // 종합 점수
}

export interface ValidationLimits {
  users: { min: number; max: number };
  cash: { min: number; max: number };
  trust: { min: number; max: number };
  maxChoices: number;
  minChoices: number;
  eventTextMinLength: number;
  eventTextMaxLength: number;
  choiceTextMinLength: number;
  choiceTextMaxLength: number;
}

export const DEFAULT_VALIDATION_LIMITS: ValidationLimits = {
  users: { min: -100000, max: 100000 },
  cash: { min: -100000000, max: 100000000 },
  trust: { min: -50, max: 50 },
  maxChoices: 4,
  minChoices: 2,
  eventTextMinLength: 20,
  eventTextMaxLength: 500,
  choiceTextMinLength: 10,
  choiceTextMaxLength: 150,
};

export const FORBIDDEN_WORDS: string[] = [
  '씨발',
  '개새끼',
  '병신',
  '좆',
  '엿먹어',
  '지랄',
  '닥쳐',
  '꺼져',
];
