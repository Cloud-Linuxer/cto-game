import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { GameResponseDto } from '../common/dto';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(Choice)
    private readonly choiceRepository: Repository<Choice>,
    @InjectRepository(ChoiceHistory)
    private readonly historyRepository: Repository<ChoiceHistory>,
  ) {}

  /**
   * 새 게임 시작
   */
  async startGame(): Promise<GameResponseDto> {
    const game = new Game();
    game.currentTurn = 1;
    game.users = 0;
    game.cash = 10000000; // 초기 자금 1000만원
    game.trust = 50;
    game.infrastructure = ['EC2'];
    game.status = GameStatus.PLAYING;
    game.investmentRounds = 0; // 투자 라운드 0회
    game.equityPercentage = 100; // 지분율 100%

    const savedGame = await this.gameRepository.save(game);
    return this.toDto(savedGame);
  }

  /**
   * 게임 상태 조회
   */
  async getGame(gameId: string): Promise<GameResponseDto> {
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    return this.toDto(game);
  }

  /**
   * 선택 실행
   */
  async executeChoice(
    gameId: string,
    choiceId: number,
  ): Promise<GameResponseDto> {
    // 1. 게임 조회 및 검증
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException(
        `게임이 이미 종료되었습니다: ${game.status}`,
      );
    }

    // 2. 선택지 조회 및 검증
    const choice = await this.choiceRepository.findOne({
      where: { choiceId },
    });

    if (!choice) {
      throw new NotFoundException(`선택지를 찾을 수 없습니다: ${choiceId}`);
    }

    if (choice.turnNumber !== game.currentTurn) {
      throw new BadRequestException(
        `현재 턴(${game.currentTurn})의 선택지가 아닙니다`,
      );
    }

    // 3. 효과 적용
    game.users += choice.effects.users;
    game.cash += choice.effects.cash;
    game.trust += choice.effects.trust;
    game.infrastructure = this.mergeInfrastructure(
      game.infrastructure,
      choice.effects.infra,
    );

    // DR 구성 여부 체크
    if (choice.effects.infra.includes('dr-configured')) {
      game.hasDR = true;
    }

    // 4. 선택 히스토리 저장
    const history = new ChoiceHistory();
    history.gameId = gameId;
    history.turnNumber = game.currentTurn;
    history.choiceId = choiceId;
    await this.historyRepository.save(history);

    // 5. 턴 진행
    let nextTurn = choice.nextTurn;

    // 긴급 이벤트 체크 (현재 턴이 긴급 이벤트가 아닐 때만)
    const currentIsEmergency = game.currentTurn >= 888 && game.currentTurn <= 890;
    if (nextTurn === 19 && !game.hasDR && !currentIsEmergency) {
      // 턴 18 다음 턴(19)으로 가는데 DR이 없으면 긴급 이벤트 발생
      nextTurn = 888; // 리전 장애 긴급 이벤트 턴
    }

    console.log(`[DEBUG] Before: currentTurn=${game.currentTurn}, nextTurn=${nextTurn}, choiceId=${choiceId}`);
    game.currentTurn = nextTurn;
    console.log(`[DEBUG] After: game.currentTurn=${game.currentTurn}`);

    // 6. 승패 조건 체크
    game.status = this.checkGameStatus(game);
    console.log(`[DEBUG] Game status after check: ${game.status}`);

    // 7. 게임 상태 저장
    const updatedGame = await this.gameRepository.save(game);
    return this.toDto(updatedGame);
  }

  /**
   * 게임 삭제
   */
  async deleteGame(gameId: string): Promise<void> {
    const result = await this.gameRepository.delete({ gameId });

    if (result.affected === 0) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }
  }

  /**
   * 인프라 병합 (중복 제거)
   */
  private mergeInfrastructure(
    current: string[],
    additions: string[],
  ): string[] {
    const merged = new Set([...current, ...additions]);
    return Array.from(merged);
  }

  /**
   * 승패 조건 체크
   */
  private checkGameStatus(game: Game): GameStatus {
    // 실패 조건 체크 (우선순위 높음)
    if (game.cash < 0) {
      return GameStatus.LOST_BANKRUPT; // 파산
    }

    if (game.users > 0 && game.trust < 20) {
      return GameStatus.LOST_OUTAGE; // 서버 다운 → 신뢰도 급락 (회생 불가)
    }

    if (game.equityPercentage < 20) {
      return GameStatus.LOST_EQUITY; // 투자자에게 지분 빼앗김 (80% 초과 희석)
    }

    // 긴급 이벤트 턴은 게임 종료 조건에서 제외 (888, 889, 890)
    const isEmergencyEvent = game.currentTurn >= 888 && game.currentTurn <= 890;

    // 22턴 초과 시 IPO 조건 체크 (긴급 이벤트 제외)
    if (game.currentTurn > 22 && !isEmergencyEvent) {
      const hasIPO = this.checkIPOConditions(game);
      if (!hasIPO) {
        return GameStatus.LOST_FAILED_IPO; // IPO 실패
      }
    }

    // 성공 조건 체크 (IPO 성공)
    if (
      game.users >= 100000 &&
      game.cash >= 300000000 &&
      game.trust >= 99 &&
      game.infrastructure.includes('Aurora Global DB') &&
      game.infrastructure.includes('EKS')
    ) {
      return GameStatus.WON_IPO;
    }

    // 게임 진행 중
    return GameStatus.PLAYING;
  }

  /**
   * IPO 조건 확인
   */
  private checkIPOConditions(game: Game): boolean {
    return game.users >= 100000 && game.cash >= 300000000 && game.trust >= 99;
  }

  /**
   * Entity to DTO 변환
   */
  private toDto(game: Game): GameResponseDto {
    return {
      gameId: game.gameId,
      currentTurn: game.currentTurn,
      users: game.users,
      cash: game.cash,
      trust: game.trust,
      infrastructure: game.infrastructure,
      status: game.status,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }
}
