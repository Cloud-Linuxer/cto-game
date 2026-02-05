import { QuizDifficulty, QuizType } from '../../database/entities/quiz.entity';

/**
 * 퀴즈 생성용 시스템 프롬프트
 */
export const QUIZ_SYSTEM_PROMPT = `당신은 AWS 클라우드 아키텍처 교육 전문가입니다.
플레이어가 AWS 서비스와 인프라 설계를 학습할 수 있도록 퀴즈를 생성합니다.

퀴즈 생성 규칙:
1. 질문은 명확하고 구체적이어야 합니다 (50-300자)
2. 현재 게임의 인프라 컨텍스트와 관련성이 있어야 합니다
3. 해설은 "왜 이것이 정답인지" 교육적으로 설명해야 합니다 (100-500자)
4. 난이도에 맞는 문제를 생성해야 합니다:
   - EASY: 기본 개념, 서비스 정의 (턴 1-10)
   - MEDIUM: 서비스 비교, 적절한 선택 (턴 11-20)
   - HARD: 복잡한 시나리오, 아키텍처 설계 (턴 21-25)

4지선다 문제 (70%):
- 4개의 명확하게 구분되는 선택지
- 선택지는 서로 겹치지 않아야 함
- 정답은 A, B, C, D 중 하나
- 오답도 그럴듯해야 함 (함정 선택지)

OX 퀴즈 (30%):
- 명확한 참/거짓 판단이 가능한 문장
- 정답은 'true' 또는 'false'
- 애매한 표현 금지

JSON 형식으로만 응답하세요 (다른 텍스트 없이):
`;

/**
 * 4지선다 문제 프롬프트 빌드
 */
export function buildMultipleChoicePrompt(
  difficulty: QuizDifficulty,
  infraContext: string[],
): string {
  const difficultyGuide = getDifficultyGuide(difficulty);
  const infraContextStr = infraContext.join(', ');

  return `${QUIZ_SYSTEM_PROMPT}

문제 유형: 4지선다 (Multiple Choice)
난이도: ${difficulty}
${difficultyGuide}
인프라 컨텍스트: ${infraContextStr}

위 조건에 맞는 4지선다 퀴즈를 생성하세요.

응답 형식:
{
  "question": "질문 내용 (50-300자)",
  "options": ["A 선택지", "B 선택지", "C 선택지", "D 선택지"],
  "correctAnswer": "A",
  "explanation": "정답 해설 (100-500자)"
}`;
}

/**
 * OX 퀴즈 프롬프트 빌드
 */
export function buildOXPrompt(
  difficulty: QuizDifficulty,
  infraContext: string[],
): string {
  const difficultyGuide = getDifficultyGuide(difficulty);
  const infraContextStr = infraContext.join(', ');

  return `${QUIZ_SYSTEM_PROMPT}

문제 유형: OX 퀴즈 (True/False)
난이도: ${difficulty}
${difficultyGuide}
인프라 컨텍스트: ${infraContextStr}

위 조건에 맞는 OX 퀴즈를 생성하세요.

응답 형식:
{
  "question": "참/거짓 판단 문장 (50-300자)",
  "correctAnswer": "true",
  "explanation": "정답 해설 (100-500자)"
}`;
}

/**
 * 난이도별 가이드 반환
 */
function getDifficultyGuide(difficulty: QuizDifficulty): string {
  switch (difficulty) {
    case QuizDifficulty.EASY:
      return `- 기본 개념 중심 (예: EC2란 무엇인가?)
- 단순 정의나 특징 묻기
- 턴 1-10에 적합한 초기 단계 지식`;

    case QuizDifficulty.MEDIUM:
      return `- 서비스 비교/선택 중심 (예: Aurora vs RDS)
- 상황에 맞는 적절한 선택
- 턴 11-20에 적합한 성장 단계 지식`;

    case QuizDifficulty.HARD:
      return `- 복잡한 아키텍처 설계 (예: Multi-region DR)
- 트레이드오프 이해 필요
- 턴 21-25에 적합한 고급 지식`;

    default:
      return '';
  }
}

/**
 * 턴 번호로부터 적절한 난이도 추론
 */
export function inferDifficultyFromTurn(turnNumber?: number): QuizDifficulty {
  if (!turnNumber) return QuizDifficulty.MEDIUM;

  if (turnNumber <= 10) return QuizDifficulty.EASY;
  if (turnNumber <= 20) return QuizDifficulty.MEDIUM;
  return QuizDifficulty.HARD;
}

/**
 * 턴 범위 계산
 */
export function calculateTurnRange(difficulty: QuizDifficulty): { start: number; end: number } {
  switch (difficulty) {
    case QuizDifficulty.EASY:
      return { start: 1, end: 10 };
    case QuizDifficulty.MEDIUM:
      return { start: 11, end: 20 };
    case QuizDifficulty.HARD:
      return { start: 21, end: 25 };
    default:
      return { start: 1, end: 25 };
  }
}
