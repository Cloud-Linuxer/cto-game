import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';
import { TurnModule } from './turn/turn.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { databaseConfig } from './database/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(databaseConfig),
    GameModule,
    TurnModule,
    LeaderboardModule,
  ],
})
export class AppModule {}
