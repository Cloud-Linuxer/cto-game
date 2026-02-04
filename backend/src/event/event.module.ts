import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { Game } from '../database/entities/game.entity';
import { EventState } from '../database/entities/event-state.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { DynamicEvent } from '../database/entities/dynamic-event.entity';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, EventState, EventHistory, DynamicEvent]),
    SecurityModule,
  ],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
