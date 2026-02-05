import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from '../database/entities/quiz.entity';
import { QuizHistory } from '../database/entities/quiz-history.entity';
import { Game } from '../database/entities/game.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { LLMModule } from '../llm/llm.module';
import { GameModule } from '../game/game.module';
import { LLMQuizGeneratorService } from './services/llm-quiz-generator.service';
import { QuizQualityScorerService } from './services/quiz-quality-scorer.service';
import { QuizValidatorService } from './validators/quiz-validator.service';
import { Context7IntegrationService } from './services/context7-integration.service';
import { QuizAnalyticsService } from './services/quiz-analytics.service';

/**
 * QuizModule
 *
 * AWS 퀴즈 시스템을 관리하는 모듈
 *
 * 기능:
 * - LLM 기반 퀴즈 생성 (vLLM)
 * - 사전 생성 퀴즈 풀 관리 (Fallback)
 * - 퀴즈 검증 및 품질 평가
 * - 정답 확인 및 보너스 계산
 * - 퀴즈 통계 및 이력 관리
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Phase: Phase 1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Quiz, QuizHistory, Game]),
    LLMModule, // vLLM 클라이언트 및 프롬프트 빌더 사용
    forwardRef(() => GameModule), // GameService 사용 (getGame, correctQuizCount 업데이트)
  ],
  controllers: [
    QuizController, // Task #10 완료 - 5개 API 엔드포인트
  ],
  providers: [
    QuizService,
    LLMQuizGeneratorService, // Task #11 완료
    QuizQualityScorerService, // Task #14 완료
    QuizValidatorService, // Task #13 완료
    Context7IntegrationService, // Task #12 완료 - AWS 문서 통합
    QuizAnalyticsService, // Task #28 완료 - Analytics & Insights
    // Additional services will be added in subsequent tasks:
    // - FallbackQuizService
    // - QuizCacheService (Task #15)
  ],
  exports: [
    TypeOrmModule,
    QuizService,
    LLMQuizGeneratorService,
    QuizQualityScorerService,
    QuizValidatorService,
    Context7IntegrationService,
    QuizAnalyticsService,
    // Additional services will be exported as they are implemented
  ],
})
export class QuizModule {}
