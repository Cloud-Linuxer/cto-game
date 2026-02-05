import { QuizDifficulty } from '../../database/entities/quiz.entity';

/**
 * 퀴즈 생성 옵션
 * 퀴즈 생성 시 사용되는 옵션 인터페이스
 */
export interface QuizGenerationOptions {
  /**
   * 퀴즈 난이도
   */
  difficulty: QuizDifficulty;

  /**
   * 현재 게임의 인프라 컨텍스트
   * 예: ['EC2', 'Aurora', 'ALB']
   */
  infraContext: string[];

  /**
   * 캐시 사용 여부
   * true: 캐시된 퀴즈 반환 가능
   * false: 항상 새로운 퀴즈 생성
   * @default true
   */
  useCache?: boolean;

  /**
   * 턴 번호 (선택적)
   * 턴 범위에 맞는 퀴즈 선택 시 사용
   */
  turnNumber?: number;

  /**
   * 게임 ID (선택적)
   * 퀴즈 이력 확인 및 중복 방지용
   */
  gameId?: string;
}
