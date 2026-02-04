import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { Game } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { Turn } from '../database/entities/turn.entity';

// Performance optimization services
import { EventCacheService } from './event-cache.service';
import { EventPoolLoaderService } from './event-pool-loader.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { OptimizedEventMatcherService } from './optimized-event-matcher.service';
import { PerformanceController } from './performance.controller';

// Event module for random events
import { EventModule } from '../event/event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Choice, ChoiceHistory, Turn]),
    EventModule,
  ],
  controllers: [GameController], // PerformanceController - 이벤트 데이터 준비 후 활성화
  providers: [
    GameService,
    EventCacheService,
    // EventPoolLoaderService, // TODO: 이벤트 데이터 파일 생성 후 활성화
    PerformanceMonitorService,
    OptimizedEventMatcherService,
  ],
  exports: [
    GameService,
    EventCacheService,
    OptimizedEventMatcherService,
    PerformanceMonitorService,
  ],
})
export class GameModule {}
