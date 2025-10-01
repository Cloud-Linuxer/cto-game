import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turn } from '../database/entities/turn.entity';
import { Choice } from '../database/entities/choice.entity';
import { TurnResponseDto, ChoiceResponseDto } from '../common/dto';

@Injectable()
export class TurnService {
  constructor(
    @InjectRepository(Turn)
    private readonly turnRepository: Repository<Turn>,
    @InjectRepository(Choice)
    private readonly choiceRepository: Repository<Choice>,
  ) {}

  /**
   * 특정 턴 정보 조회 (선택지 포함)
   */
  async getTurnInfo(turnNumber: number): Promise<TurnResponseDto> {
    const turn = await this.turnRepository.findOne({
      where: { turnNumber },
    });

    if (!turn) {
      throw new NotFoundException(`턴을 찾을 수 없습니다: ${turnNumber}`);
    }

    const choices = await this.choiceRepository.find({
      where: { turnNumber },
    });

    return {
      turnId: turn.turnId,
      turnNumber: turn.turnNumber,
      eventText: turn.eventText,
      description: turn.description,
      choices: choices.map((choice) => this.choiceToDto(choice)),
    };
  }

  /**
   * 모든 턴 목록 조회
   */
  async getAllTurns(): Promise<TurnResponseDto[]> {
    const turns = await this.turnRepository.find({
      order: { turnNumber: 'ASC' },
    });

    const result: TurnResponseDto[] = [];

    for (const turn of turns) {
      const choices = await this.choiceRepository.find({
        where: { turnNumber: turn.turnNumber },
      });

      result.push({
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        eventText: turn.eventText,
        description: turn.description,
        choices: choices.map((choice) => this.choiceToDto(choice)),
      });
    }

    return result;
  }

  /**
   * Choice Entity to DTO 변환
   */
  private choiceToDto(choice: Choice): ChoiceResponseDto {
    return {
      choiceId: choice.choiceId,
      turnNumber: choice.turnNumber,
      text: choice.text,
      effects: choice.effects,
      nextTurn: choice.nextTurn,
      category: choice.category,
      description: choice.description,
    };
  }
}
