import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { Turn } from './entities/turn.entity';
import { Choice } from './entities/choice.entity';
import { ChoiceHistory } from './entities/choice-history.entity';
import { Leaderboard } from './entities/leaderboard.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'cto_admin',
  password: process.env.DB_PASSWORD || 'cto_game_password',
  database: process.env.DB_NAME || 'cto_game',
  entities: [Game, Turn, Choice, ChoiceHistory, Leaderboard],
  synchronize: true, // 개발 환경에서만 사용, 프로덕션에서는 false
  logging: process.env.NODE_ENV === 'development',
};
