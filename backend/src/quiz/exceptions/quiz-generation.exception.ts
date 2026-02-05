import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * QuizGenerationException
 *
 * LLM 퀴즈 생성 실패 시 발생하는 커스텀 예외
 * 모든 재시도와 폴백 전략이 실패했을 때 던져집니다.
 */
export class QuizGenerationException extends HttpException {
  constructor(
    message: string,
    public readonly reason: 'LLM_FAILURE' | 'VALIDATION_FAILURE' | 'CACHE_FAILURE' | 'FALLBACK_FAILURE' | 'TOTAL_FAILURE',
    public readonly attempts: number = 1,
    public readonly details?: any,
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        reason,
        attempts,
        details,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
