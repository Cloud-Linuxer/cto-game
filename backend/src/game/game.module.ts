import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { Game } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { Turn } from '../database/entities/turn.entity';
import { TrustHistory } from '../database/entities/trust-history.entity';
import { Quiz } from '../database/entities/quiz.entity';
import { QuizHistory } from '../database/entities/quiz-history.entity';

// Performance optimization services
import { EventCacheService } from './event-cache.service';
import { EventPoolLoaderService } from './event-pool-loader.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { OptimizedEventMatcherService } from './optimized-event-matcher.service';
import { PerformanceController } from './performance.controller';

// Trust history service
import { TrustHistoryService } from './trust-history.service';

// Alternative investment service
import { AlternativeInvestmentService } from './alternative-investment.service';

// Event module for random events
import { EventModule } from '../event/event.module';

// Quiz module for quiz system (EPIC-07)
import { QuizModule } from '../quiz/quiz.module';

// Security module for secure random service
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      Choice,
      ChoiceHistory,
      Turn,
      TrustHistory,
      Quiz,
      QuizHistory,
    ]),
    EventModule,
    QuizModule,
    SecurityModule,
  ],
  controllers: [GameController], // PerformanceController - 이벤트 데이터 준비 후 활성화
  providers: [
    GameService,
    TrustHistoryService,
    AlternativeInvestmentService,
    EventCacheService,
    // EventPoolLoaderService, // TODO: 이벤트 데이터 파일 생성 후 활성화
    PerformanceMonitorService,
    OptimizedEventMatcherService,
  ],
  exports: [
    GameService,
    TrustHistoryService,
    AlternativeInvestmentService,
    EventCacheService,
    OptimizedEventMatcherService,
    PerformanceMonitorService,
  ],
})
export class GameModule {}
