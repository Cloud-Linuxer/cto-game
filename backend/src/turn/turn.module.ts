import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurnController } from './turn.controller';
import { TurnService } from './turn.service';
import { Turn } from '../database/entities/turn.entity';
import { Choice } from '../database/entities/choice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Turn, Choice])],
  controllers: [TurnController],
  providers: [TurnService],
  exports: [TurnService],
})
export class TurnModule {}
