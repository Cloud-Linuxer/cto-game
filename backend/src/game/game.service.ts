import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus, GameGrade, CapacityWarningLevel } from '../database/entities/game.entity';
import { Choice } from '../database/entities/choice.entity';
import { ChoiceHistory } from '../database/entities/choice-history.entity';
import { GameResponseDto } from '../common/dto';
import {
  GAME_CONSTANTS,
  DIFFICULTY_CONFIGS,
  VICTORY_PATH_CONDITIONS,
  DifficultyMode,
  DifficultyConfig,
  VictoryPath,
  VictoryPathCondition,
} from './game-constants';
import { EventService } from '../event/event.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(Choice)
    private readonly choiceRepository: Repository<Choice>,
    @InjectRepository(ChoiceHistory)
    private readonly historyRepository: Repository<ChoiceHistory>,
    private readonly eventService: EventService,
  ) {}

  // ---------------------------------------------------------------------------
  // Difficulty helpers
  // ---------------------------------------------------------------------------

  private getDifficultyConfig(game: Game): DifficultyConfig {
    const mode = (game.difficultyMode || 'NORMAL') as DifficultyMode;
    return DIFFICULTY_CONFIGS[mode] || DIFFICULTY_CONFIGS.NORMAL;
  }

  private getMaxTurns(game: Game): number {
    return this.getDifficultyConfig(game).maxTurns;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * 새 게임 시작
   */
  async startGame(difficultyMode?: DifficultyMode): Promise<GameResponseDto> {
    const mode = difficultyMode || 'NORMAL';
    const config = DIFFICULTY_CONFIGS[mode];

    const game = new Game();
    game.currentTurn = 1;
    game.users = GAME_CONSTANTS.INITIAL_USERS;
    game.cash = config.initialCash;
    game.trust = config.initialTrust;
    game.infrastructure = [...GAME_CONSTANTS.INITIAL_INFRASTRUCTURE];
    game.status = GameStatus.PLAYING;
    game.investmentRounds = GAME_CONSTANTS.INITIAL_INVESTMENT_ROUNDS;
    game.equityPercentage = GAME_CONSTANTS.INITIAL_EQUITY_PERCENTAGE;
    game.multiChoiceEnabled = false;
    game.userAcquisitionMultiplier = GAME_CONSTANTS.INITIAL_USER_ACQUISITION_MULTIPLIER;
    game.trustMultiplier = GAME_CONSTANTS.INITIAL_TRUST_MULTIPLIER;
    game.maxUserCapacity = config.initialMaxCapacity;
    game.hasConsultingEffect = false;
    game.hiredStaff = [];
    game.difficultyMode = mode;
    game.grade = null;
    game.capacityExceededCount = 0;
    game.resilienceStacks = 0;
    game.consecutiveNegativeCashTurns = 0;

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
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException(
        `게임이 이미 종료되었습니다: ${game.status}`,
      );
    }

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

    const config = this.getDifficultyConfig(game);
    const maxTurns = this.getMaxTurns(game);
    const recoveryMessages: string[] = [];

    // --- Phase 3: Turn-start recovery ---
    const turnRecovery = this.applyTurnStartRecovery(game, config);
    recoveryMessages.push(...turnRecovery);

    // --- Investment check (scaled, not blocking) ---
    const isEarlyPitching =
      game.currentTurn === GAME_CONSTANTS.EARLY_PITCH_TURN &&
      choiceId === GAME_CONSTANTS.EARLY_PITCH_CHOICE_ID;
    let earlyPitchingFailed = false;
    let investmentScaleFactor = 1.0;

    const isSeriesAInvestment =
      game.currentTurn === GAME_CONSTANTS.SERIES_A_TURN &&
      choice.effects.cash > GAME_CONSTANTS.SERIES_A_MIN_CASH_EFFECT;
    const isSeriesBInvestment =
      game.currentTurn === GAME_CONSTANTS.SERIES_B_TURN &&
      choice.effects.cash > GAME_CONSTANTS.SERIES_B_MIN_CASH_EFFECT;
    const isSeriesCInvestment =
      game.currentTurn === GAME_CONSTANTS.SERIES_C_TURN &&
      choice.effects.cash > GAME_CONSTANTS.SERIES_C_MIN_CASH_EFFECT;

    // Early pitch: penalty but NOT trust=0 wipeout
    if (isEarlyPitching && game.trust < config.earlyPitchTrustThreshold) {
      earlyPitchingFailed = true;
      this.logger.warn(
        `초기 투자 피칭 실패: 신뢰도 ${game.trust}% < ${config.earlyPitchTrustThreshold}%`,
      );
    }

    // Series investments: scale instead of block
    if (isSeriesAInvestment) {
      investmentScaleFactor = this.calculateInvestmentScale(game.trust, config.seriesAMinTrust);
    }
    if (isSeriesBInvestment) {
      investmentScaleFactor = this.calculateInvestmentScale(game.trust, config.seriesBMinTrust);
    }
    if (isSeriesCInvestment) {
      investmentScaleFactor = this.calculateInvestmentScale(game.trust, config.seriesCMinTrust);
    }

    // --- Capacity check (graduated penalty) ---
    let capacityExceeded = false;
    let capacityPenalty = 0;
    if (game.users > game.maxUserCapacity) {
      capacityPenalty = this.calculateCapacityPenalty(game.users, game.maxUserCapacity);
      game.trust = Math.max(0, game.trust - capacityPenalty);
      capacityExceeded = true;
      game.capacityExceededCount++;
      const resilienceMsg = this.awardResilienceStack(game);
      if (resilienceMsg) recoveryMessages.push(resilienceMsg);
      this.logger.verbose(
        `턴 시작 시 용량 초과 페널티: users=${game.users}, maxCapacity=${game.maxUserCapacity}, penalty=-${capacityPenalty}`,
      );
    }

    // --- Infra update ---
    game.infrastructure = this.mergeInfrastructure(
      game.infrastructure,
      choice.effects.infra,
    );

    if (choice.effects.infra.includes('dr-configured')) {
      game.hasDR = true;
    }

    // Recalculate capacity (additive system) + resilience bonus
    const baseCapacity = this.calculateMaxCapacity(game.infrastructure, game.hasConsultingEffect);
    game.maxUserCapacity = this.applyResilienceToCapacity(baseCapacity, game.resilienceStacks);

    // Phase 3: Comeback multiplier
    const comebackMult = this.getComebackMultiplier(game, config);

    // --- Apply effects ---
    if (earlyPitchingFailed) {
      // Penalty: lose half current trust instead of resetting to 0
      const trustLoss = Math.max(5, Math.floor(game.trust * 0.5));
      game.trust = Math.max(0, game.trust - trustLoss);
      this.logger.warn(`초기 투자 피칭 실패: 신뢰도 -${trustLoss} (기존 전액 초기화에서 변경)`);
    } else {
      // Apply effects with difficulty multipliers + comeback bonus
      let userGain = this.applyEffectMultiplier(
        Math.floor(choice.effects.users * game.userAcquisitionMultiplier),
        config,
      );
      if (userGain > 0 && comebackMult > 1.0) {
        userGain = Math.floor(userGain * comebackMult);
      }
      const newUserCount = game.users + userGain;

      if (newUserCount > game.maxUserCapacity) {
        game.users = newUserCount;
        const newPenalty = this.calculateCapacityPenalty(newUserCount, game.maxUserCapacity);
        game.trust = Math.max(0, game.trust - newPenalty);
        capacityExceeded = true;
        capacityPenalty = newPenalty;
        game.capacityExceededCount++;
        // Phase 3: Award resilience stack for surviving capacity exceeded
        const resilienceMsg = this.awardResilienceStack(game);
        if (resilienceMsg) recoveryMessages.push(resilienceMsg);
        this.logger.warn(
          `용량 초과! users=${newUserCount}, maxCapacity=${game.maxUserCapacity}, penalty=-${newPenalty}`,
        );
      } else {
        game.users = newUserCount;
      }

      // Cash: apply investment scaling for series rounds + comeback
      let cashEffect = choice.effects.cash;
      if (investmentScaleFactor !== 1.0 && cashEffect > 0) {
        cashEffect = Math.floor(cashEffect * investmentScaleFactor);
        this.logger.debug(`투자 배율 적용: ${investmentScaleFactor.toFixed(2)}x -> cash=${cashEffect}`);
      }
      if (cashEffect > 0 && comebackMult > 1.0) {
        cashEffect = Math.floor(cashEffect * comebackMult);
      }
      game.cash += cashEffect;

      // Trust: apply multiplier + comeback
      let trustGain = this.applyTrustEffectMultiplier(
        Math.floor(choice.effects.trust * game.trustMultiplier),
        config,
      );
      if (trustGain > 0 && comebackMult > 1.0) {
        trustGain = Math.floor(trustGain * comebackMult);
      }
      game.trust += trustGain;
    }

    // Staff hiring
    this.applyStaffHiring(choice, game);

    // History
    const history = new ChoiceHistory();
    history.gameId = gameId;
    history.turnNumber = game.currentTurn;
    history.choiceId = choiceId;
    await this.historyRepository.save(history);

    // Consulting effect
    const consultingMessage = this.applyConsultingEffect(choiceId, game);

    // --- Turn progression ---
    let nextTurn = choice.nextTurn;

    if (nextTurn > maxTurns && !this.isSpecialTurn(nextTurn)) {
      nextTurn = maxTurns;
    }

    // IPO continue choice
    if (choiceId === GAME_CONSTANTS.IPO_CONTINUE_CHOICE_ID) {
      const returnTurn = game.ipoAchievedTurn || game.currentTurn + 1;
      if (returnTurn > maxTurns) {
        game.status = GameStatus.WON_IPO;
        nextTurn = maxTurns;
      } else {
        nextTurn = returnTurn;
        game.ipoConditionMet = false;
      }
    }

    // Emergency event check
    const currentIsEmergency = this.isEmergencyTurn(game.currentTurn);
    if (nextTurn === GAME_CONSTANTS.EMERGENCY_TRIGGER_NEXT_TURN && !game.hasDR && !currentIsEmergency) {
      nextTurn = GAME_CONSTANTS.EMERGENCY_REDIRECT_TURN;
    }

    // IPO condition check
    if (game.currentTurn !== GAME_CONSTANTS.IPO_SELECTION_TURN && !game.ipoConditionMet) {
      const ipoConditionsMet = this.checkFullIPOConditions(game);
      if (ipoConditionsMet) {
        game.ipoConditionMet = true;
        game.ipoAchievedTurn = nextTurn;
        nextTurn = GAME_CONSTANTS.IPO_SELECTION_TURN;
      }
    }

    // Absolute turn cap
    if (nextTurn > maxTurns && !this.isSpecialTurn(nextTurn)) {
      nextTurn = maxTurns;
    }

    game.currentTurn = nextTurn;

    // Force single choice on final turn
    if (game.currentTurn === maxTurns) {
      game.multiChoiceEnabled = false;
    }

    // --- Win/lose check ---
    if (game.currentTurn !== GAME_CONSTANTS.IPO_SELECTION_TURN) {
      game.status = this.checkGameStatus(game);
    }

    // Final turn completion: check all victory paths
    const previousTurn = history.turnNumber;
    if (previousTurn === maxTurns && game.status === GameStatus.PLAYING) {
      const bestPath = this.findBestVictoryPath(game);
      if (bestPath) {
        game.status = this.victoryPathToStatus(bestPath);
      } else {
        game.status = GameStatus.LOST_FIRED_CTO;
      }
    }

    // Calculate grade on game end
    if (game.status !== GameStatus.PLAYING) {
      game.grade = this.calculateGrade(game);
    }

    // Save
    const updatedGame = await this.gameRepository.save(game);
    const dto = this.toDto(updatedGame);

    // Attach extra info
    if (earlyPitchingFailed) {
      dto.investmentFailed = true;
      dto.investmentFailureMessage = '초기 투자 피칭에 실패했습니다. 신뢰도가 부족하여 투자 규모가 축소되었습니다.';
    }

    if (investmentScaleFactor < 1.0 && !earlyPitchingFailed) {
      dto.investmentFailed = true;
      dto.investmentFailureMessage = `신뢰도 부족으로 투자 규모가 ${Math.round(investmentScaleFactor * 100)}%로 축소되었습니다.`;
    }

    if (capacityExceeded) {
      dto.capacityExceeded = true;
      dto.capacityExceededMessage = `인프라 용량(${game.maxUserCapacity.toLocaleString()}명)을 초과하여 서비스 장애가 발생했습니다. 신뢰도 -${capacityPenalty}`;
    }

    if (consultingMessage) {
      dto.consultingMessage = consultingMessage;
    }

    // Phase 3: Recovery info
    if (comebackMult > 1.0) {
      dto.comebackActive = true;
      recoveryMessages.push(`위기 극복 보너스 활성! 긍정적 효과 ${Math.round((comebackMult - 1) * 100)}% 증가`);
    }
    if (recoveryMessages.length > 0) {
      dto.recoveryMessages = recoveryMessages;
    }

    // --- Dynamic Event System (EPIC-03) ---
    // Check if a random event should trigger after this turn
    if (game.status === GameStatus.PLAYING) {
      try {
        const triggeredEvent = await this.eventService.checkRandomEvent(updatedGame);

        if (triggeredEvent) {
          dto.randomEventTriggered = true;
          dto.randomEventData = {
            eventId: triggeredEvent.eventId,
            eventType: triggeredEvent.eventType,
            eventText: this.interpolateEventText(triggeredEvent.description, updatedGame),
            severity: triggeredEvent.severity,
            choices: triggeredEvent.choices.map((choice) => ({
              choiceId: choice.choiceId,
              text: choice.text,
              effects: {
                usersDelta: choice.effect?.usersDelta,
                cashDelta: choice.effect?.cashDelta,
                trustDelta: choice.effect?.trustDelta,
                addInfrastructure: choice.effect?.addInfrastructure,
              },
            })),
          };

          this.logger.log(
            `Random event triggered for game ${gameId}: ${triggeredEvent.eventId} (${triggeredEvent.eventType})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to check random event for game ${gameId}: ${error.message}`,
          error.stack,
        );
        // Don't fail the entire request if event check fails
      }
    }

    return dto;
  }

  /**
   * 여러 선택 동시 실행 (1턴에 2개 행동)
   */
  async executeMultipleChoices(
    gameId: string,
    choiceIds: number[],
  ): Promise<GameResponseDto> {
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    if (game.status !== GameStatus.PLAYING) {
      throw new BadRequestException(
        `게임이 이미 종료되었습니다: ${game.status}`,
      );
    }

    const config = this.getDifficultyConfig(game);
    const maxTurns = this.getMaxTurns(game);
    const currentTurn = game.currentTurn;
    let capacityExceeded = false;
    let capacityPenalty = 0;
    let consultingMessage: string | undefined;
    let hasConsultingEffectApplied = false;
    let nextTurn = currentTurn;
    const recoveryMessages: string[] = [];

    // Phase 3: Turn-start recovery
    const turnRecovery = this.applyTurnStartRecovery(game, config);
    recoveryMessages.push(...turnRecovery);

    // Phase 3: Comeback multiplier
    const comebackMult = this.getComebackMultiplier(game, config);

    for (const choiceId of choiceIds) {
      const choice = await this.choiceRepository.findOne({
        where: { choiceId },
      });

      if (!choice) {
        throw new NotFoundException(`선택지를 찾을 수 없습니다: ${choiceId}`);
      }

      if (choice.turnNumber !== currentTurn) {
        throw new BadRequestException(
          `현재 턴(${currentTurn})의 선택지가 아닙니다`,
        );
      }

      // Infra
      game.infrastructure = this.mergeInfrastructure(
        game.infrastructure,
        choice.effects.infra,
      );

      if (choice.effects.infra.includes('dr-configured')) {
        game.hasDR = true;
      }

      // Effects with difficulty multiplier + comeback
      let userGain = this.applyEffectMultiplier(
        Math.floor(choice.effects.users * game.userAcquisitionMultiplier),
        config,
      );
      if (userGain > 0 && comebackMult > 1.0) userGain = Math.floor(userGain * comebackMult);
      game.users += userGain;

      let cashEffect = choice.effects.cash;
      if (cashEffect > 0 && comebackMult > 1.0) cashEffect = Math.floor(cashEffect * comebackMult);
      game.cash += cashEffect;

      let trustGain = this.applyTrustEffectMultiplier(
        Math.floor(choice.effects.trust * game.trustMultiplier),
        config,
      );
      if (trustGain > 0 && comebackMult > 1.0) trustGain = Math.floor(trustGain * comebackMult);
      game.trust += trustGain;

      // Staff
      this.applyStaffHiring(choice, game);

      // Consulting
      if (choiceId === GAME_CONSTANTS.CONSULTING_CHOICE_ID && !game.hasConsultingEffect) {
        hasConsultingEffectApplied = true;
        game.hasConsultingEffect = true;
      }

      nextTurn = choice.nextTurn;

      // History
      const history = new ChoiceHistory();
      history.gameId = gameId;
      history.turnNumber = currentTurn;
      history.choiceId = choiceId;
      await this.historyRepository.save(history);
    }

    // Capacity check (graduated)
    if (game.users > game.maxUserCapacity) {
      capacityPenalty = this.calculateCapacityPenalty(game.users, game.maxUserCapacity);
      game.trust = Math.max(0, game.trust - capacityPenalty);
      capacityExceeded = true;
      game.capacityExceededCount++;
      const resilienceMsg = this.awardResilienceStack(game);
      if (resilienceMsg) recoveryMessages.push(resilienceMsg);
    }

    // Recalculate capacity + resilience bonus
    const rawCapacity = this.calculateMaxCapacity(game.infrastructure, game.hasConsultingEffect);
    game.maxUserCapacity = this.applyResilienceToCapacity(rawCapacity, game.resilienceStacks);

    // Consulting message
    if (hasConsultingEffectApplied) {
      const baseCapacity = Math.floor(game.maxUserCapacity / GAME_CONSTANTS.CONSULTING_CAPACITY_MULTIPLIER);
      consultingMessage = `🎯 AWS Solutions Architect 컨설팅 효과가 발생했습니다!\n\n아키텍처의 성능이 극대화되어 병목 현상이 해소되었습니다.\n인프라 수용량이 ${baseCapacity.toLocaleString()}명에서 ${game.maxUserCapacity.toLocaleString()}명으로 ${GAME_CONSTANTS.CONSULTING_CAPACITY_MULTIPLIER}배 증가했습니다.`;
    }

    // Turn progression
    const currentIsEmergency = this.isEmergencyTurn(game.currentTurn);
    if (nextTurn === GAME_CONSTANTS.EMERGENCY_TRIGGER_NEXT_TURN && !game.hasDR && !currentIsEmergency) {
      nextTurn = GAME_CONSTANTS.EMERGENCY_REDIRECT_TURN;
    }

    if (nextTurn > maxTurns && !this.isSpecialTurn(nextTurn)) {
      nextTurn = maxTurns;
    }

    const shouldEndGame = currentTurn === maxTurns && game.status === GameStatus.PLAYING;

    game.currentTurn = nextTurn;

    // Post-turn capacity check
    if (game.users > game.maxUserCapacity && !capacityExceeded) {
      capacityPenalty = this.calculateCapacityPenalty(game.users, game.maxUserCapacity);
      game.trust = Math.max(0, game.trust - capacityPenalty);
      capacityExceeded = true;
      game.capacityExceededCount++;
    }

    // Win/lose check
    game.status = this.checkGameStatus(game);

    if (shouldEndGame) {
      const bestPath = this.findBestVictoryPath(game);
      game.status = bestPath ? this.victoryPathToStatus(bestPath) : GameStatus.LOST_FIRED_CTO;
    }

    // Grade on end
    if (game.status !== GameStatus.PLAYING) {
      game.grade = this.calculateGrade(game);
    }

    const updatedGame = await this.gameRepository.save(game);
    const dto = this.toDto(updatedGame);

    if (capacityExceeded) {
      dto.capacityExceeded = true;
      dto.capacityExceededMessage = `인프라 용량(${game.maxUserCapacity.toLocaleString()}명)을 초과하여 서비스 장애가 발생했습니다. 신뢰도 -${capacityPenalty}`;
    }

    if (consultingMessage) {
      dto.consultingMessage = consultingMessage;
    }

    // Phase 3: Recovery info
    if (comebackMult > 1.0) {
      dto.comebackActive = true;
      recoveryMessages.push(`위기 극복 보너스 활성! 긍정적 효과 ${Math.round((comebackMult - 1) * 100)}% 증가`);
    }
    if (recoveryMessages.length > 0) {
      dto.recoveryMessages = recoveryMessages;
    }

    return dto;
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

  // ---------------------------------------------------------------------------
  // Private: Balance mechanics
  // ---------------------------------------------------------------------------

  /**
   * 투자 배율 계산: blocking 대신 trust/목표 비율로 투자금 스케일링
   */
  private calculateInvestmentScale(currentTrust: number, targetTrust: number): number {
    if (targetTrust <= 0) return 1.0;
    const ratio = currentTrust / targetTrust;
    return Math.min(
      GAME_CONSTANTS.INVESTMENT_MAX_SCALE,
      Math.max(GAME_CONSTANTS.INVESTMENT_MIN_SCALE, ratio),
    );
  }

  /**
   * 용량 초과 페널티: 초과 비율에 따른 단계적 페널티
   */
  private calculateCapacityPenalty(users: number, maxCapacity: number): number {
    if (maxCapacity <= 0) return GAME_CONSTANTS.CAPACITY_EXCEEDED_TRUST_PENALTY;

    const excessRatio = (users - maxCapacity) / maxCapacity;
    const tiers = GAME_CONSTANTS.CAPACITY_PENALTY_TIERS;

    // Find the matching tier (tiers are sorted ascending by excessRatio)
    let penalty = tiers[0].penalty; // minimum penalty
    for (const tier of tiers) {
      if (excessRatio >= tier.excessRatio) {
        penalty = tier.penalty;
      }
    }

    return penalty;
  }

  /**
   * 효과 배율 적용 (유저 수): 양수면 positive multiplier, 음수면 negative multiplier
   */
  private applyEffectMultiplier(value: number, config: DifficultyConfig): number {
    if (value >= 0) {
      return Math.floor(value * config.positiveEffectMultiplier);
    }
    return Math.floor(value * config.negativeEffectMultiplier);
  }

  /**
   * 신뢰도 효과 배율 적용
   */
  private applyTrustEffectMultiplier(value: number, config: DifficultyConfig): number {
    if (value >= 0) {
      return Math.floor(value * config.positiveEffectMultiplier);
    }
    return Math.floor(value * config.negativeEffectMultiplier);
  }

  /**
   * 등급 계산 (게임 종료 시)
   */
  private calculateGrade(game: Game): GameGrade {
    const thresholds = GAME_CONSTANTS.GRADE_THRESHOLDS;

    if (
      game.users >= thresholds.S.minUsers &&
      game.cash >= thresholds.S.minCash &&
      game.trust >= thresholds.S.minTrust
    ) {
      return 'S';
    }
    if (
      game.users >= thresholds.A.minUsers &&
      game.cash >= thresholds.A.minCash &&
      game.trust >= thresholds.A.minTrust
    ) {
      return 'A';
    }
    if (
      game.users >= thresholds.B.minUsers &&
      game.cash >= thresholds.B.minCash &&
      game.trust >= thresholds.B.minTrust
    ) {
      return 'B';
    }
    if (
      game.users >= thresholds.C.minUsers &&
      game.cash >= thresholds.C.minCash &&
      game.trust >= thresholds.C.minTrust
    ) {
      return 'C';
    }
    return 'F';
  }

  /**
   * 용량 경고 레벨 계산
   */
  private getCapacityWarningLevel(game: Game): CapacityWarningLevel {
    if (game.maxUserCapacity <= 0) return 'RED';
    const ratio = game.users / game.maxUserCapacity;
    if (ratio >= GAME_CONSTANTS.CAPACITY_WARNING_RED) return 'RED';
    if (ratio >= GAME_CONSTANTS.CAPACITY_WARNING_YELLOW) return 'YELLOW';
    return 'GREEN';
  }

  // ---------------------------------------------------------------------------
  // Private: Staff & consulting
  // ---------------------------------------------------------------------------

  private applyStaffHiring(choice: Choice, game: Game): void {
    if (choice.text.includes('개발자') && choice.text.includes('채용')) {
      game.multiChoiceEnabled = true;
      if (!game.hiredStaff.includes('개발자')) {
        game.hiredStaff.push('개발자');
      }
    }

    if (choice.text.includes('디자이너') && choice.text.includes('채용')) {
      // Graduated multiplier: base + per-hire bonus
      const currentMultiplier = game.userAcquisitionMultiplier;
      game.userAcquisitionMultiplier = Math.min(
        2.5,
        currentMultiplier + GAME_CONSTANTS.STAFF_MULTIPLIERS.DESIGNER_USERS - 1.0 + GAME_CONSTANTS.STAFF_HIRE_BONUS * game.hiredStaff.length,
      );
      if (!game.hiredStaff.includes('디자이너')) {
        game.hiredStaff.push('디자이너');
      }
    }

    if (choice.text.includes('기획자') && choice.text.includes('채용')) {
      const currentMultiplier = game.trustMultiplier;
      game.trustMultiplier = Math.min(
        2.5,
        currentMultiplier + GAME_CONSTANTS.STAFF_MULTIPLIERS.PLANNER_TRUST - 1.0 + GAME_CONSTANTS.STAFF_HIRE_BONUS * game.hiredStaff.length,
      );
      if (!game.hiredStaff.includes('기획자')) {
        game.hiredStaff.push('기획자');
      }
    }
  }

  private applyConsultingEffect(choiceId: number, game: Game): string | undefined {
    if (choiceId !== GAME_CONSTANTS.CONSULTING_CHOICE_ID || game.hasConsultingEffect) {
      return undefined;
    }

    const oldCapacity = game.maxUserCapacity;
    game.hasConsultingEffect = true;
    game.maxUserCapacity = oldCapacity * GAME_CONSTANTS.CONSULTING_CAPACITY_MULTIPLIER;

    return (
      `🎯 AWS Solutions Architect 컨설팅 효과가 발생했습니다!\n\n` +
      `아키텍처의 성능이 극대화되어 병목 현상이 해소되었습니다.\n` +
      `인프라 수용량이 ${oldCapacity.toLocaleString()}명에서 ` +
      `${game.maxUserCapacity.toLocaleString()}명으로 ` +
      `${GAME_CONSTANTS.CONSULTING_CAPACITY_MULTIPLIER}배 증가했습니다.`
    );
  }

  // ---------------------------------------------------------------------------
  // Private: Capacity calculation (ADDITIVE system)
  // ---------------------------------------------------------------------------

  /**
   * Additive capacity: base + sum of each infra's contribution.
   * Old system used "max of all infra" which was too binary.
   */
  private calculateMaxCapacity(infrastructure: string[], hasConsultingEffect: boolean): number {
    let totalCapacity = GAME_CONSTANTS.BASE_CAPACITY;

    for (const infra of infrastructure) {
      const contribution = GAME_CONSTANTS.INFRASTRUCTURE_CAPACITY[infra];
      if (contribution) {
        totalCapacity += contribution;
      }
    }

    if (hasConsultingEffect) {
      totalCapacity = totalCapacity * GAME_CONSTANTS.CONSULTING_CAPACITY_MULTIPLIER;
    }

    return totalCapacity;
  }

  // ---------------------------------------------------------------------------
  // Private: Recovery & Resilience mechanics (Phase 3)
  // ---------------------------------------------------------------------------

  /**
   * Apply turn-start recovery effects:
   * - Natural trust recovery when trust is low
   * - Debt interest when cash is negative
   * - Resilience bonus to capacity
   * Returns messages describing what recovery happened.
   */
  private applyTurnStartRecovery(game: Game, config: DifficultyConfig): string[] {
    const messages: string[] = [];
    const recovery = GAME_CONSTANTS.TRUST_RECOVERY;
    const resilience = GAME_CONSTANTS.RESILIENCE;

    // --- Natural trust recovery ---
    if (game.trust < recovery.THRESHOLD && game.trust < recovery.MAX_NATURAL) {
      let recoveryAmount = 0;

      if (game.trust < recovery.DANGER_THRESHOLD) {
        recoveryAmount = recovery.DANGER_RECOVERY_AMOUNT;
      } else {
        recoveryAmount = recovery.RECOVERY_AMOUNT;
      }

      // Resilience stacks boost trust recovery
      recoveryAmount += game.resilienceStacks * resilience.TRUST_RECOVERY_PER_STACK;

      const newTrust = Math.min(recovery.MAX_NATURAL, game.trust + recoveryAmount);
      const actualRecovery = newTrust - game.trust;
      if (actualRecovery > 0) {
        game.trust = newTrust;
        messages.push(`시장 안정화로 신뢰도가 +${actualRecovery}% 회복되었습니다.`);
        this.logger.debug(`Natural trust recovery: +${actualRecovery} (stacks=${game.resilienceStacks})`);
      }
    }

    // --- Debt interest ---
    if (game.cash < 0) {
      const interest = Math.floor(Math.abs(game.cash) * GAME_CONSTANTS.BANKRUPTCY_GRACE.DEBT_INTEREST_RATE);
      game.cash -= interest;
      game.consecutiveNegativeCashTurns++;
      if (interest > 0) {
        messages.push(`부채 이자로 ${interest.toLocaleString()}원이 추가 발생했습니다. (연속 ${game.consecutiveNegativeCashTurns}턴 적자)`);
      }
    } else {
      // Reset grace counter when cash is positive
      game.consecutiveNegativeCashTurns = 0;
    }

    return messages;
  }

  /**
   * Award resilience stack when surviving capacity exceeded events.
   * Only awarded once per capacity exceeded event, capped at MAX_STACKS.
   */
  private awardResilienceStack(game: Game): string | null {
    const resilience = GAME_CONSTANTS.RESILIENCE;
    if (game.resilienceStacks < resilience.MAX_STACKS) {
      game.resilienceStacks++;
      const bonusPercent = game.resilienceStacks * resilience.CAPACITY_BONUS_PER_STACK * 100;
      return `인프라 장애를 극복하여 복원력이 향상되었습니다! (복원력 ${game.resilienceStacks}/${resilience.MAX_STACKS}, 용량 +${bonusPercent}%)`;
    }
    return null;
  }

  /**
   * Check if comeback multiplier should apply for a given metric.
   * Returns the multiplier (1.0 if no comeback, >1.0 if in danger zone).
   */
  private getComebackMultiplier(game: Game, config: DifficultyConfig): number {
    const comeback = GAME_CONSTANTS.COMEBACK;

    // Check if any primary metric is in danger zone relative to easiest victory path
    const userRatio = game.users / config.ipoMinUsers;
    const cashRatio = game.cash / config.ipoMinCash;
    const trustRatio = game.trust / config.ipoMinTrust;

    const inDanger = userRatio < comeback.DANGER_ZONE_RATIO ||
      cashRatio < comeback.DANGER_ZONE_RATIO ||
      trustRatio < comeback.DANGER_ZONE_RATIO;

    return inDanger ? comeback.COMEBACK_MULTIPLIER : 1.0;
  }

  /**
   * Apply resilience bonus to max capacity.
   */
  private applyResilienceToCapacity(baseCapacity: number, resilienceStacks: number): number {
    const bonus = resilienceStacks * GAME_CONSTANTS.RESILIENCE.CAPACITY_BONUS_PER_STACK;
    return Math.floor(baseCapacity * (1 + bonus));
  }

  // ---------------------------------------------------------------------------
  // Private: Victory path mechanics
  // ---------------------------------------------------------------------------

  /**
   * Check if a specific victory path condition is met.
   */
  private checkVictoryPath(game: Game, path: VictoryPath): boolean {
    const mode = (game.difficultyMode || 'NORMAL') as DifficultyMode;
    const conditions = VICTORY_PATH_CONDITIONS[mode]?.[path];
    if (!conditions) return false;

    if (game.users < conditions.minUsers) return false;
    if (game.cash < conditions.minCash) return false;
    if (game.trust < conditions.minTrust) return false;

    if (conditions.minInfraCount && game.infrastructure.length < conditions.minInfraCount) {
      return false;
    }

    if (conditions.requiredInfra) {
      for (const infra of conditions.requiredInfra) {
        if (!game.infrastructure.includes(infra)) return false;
      }
    }

    return true;
  }

  /**
   * Find the best (highest priority) victory path that the game qualifies for.
   * Priority order: IPO > TECH_LEADER > ACQUISITION > PROFITABILITY
   */
  private findBestVictoryPath(game: Game): VictoryPath | null {
    const paths: VictoryPath[] = ['IPO', 'TECH_LEADER', 'ACQUISITION', 'PROFITABILITY'];
    for (const path of paths) {
      if (this.checkVictoryPath(game, path)) {
        return path;
      }
    }
    return null;
  }

  /**
   * Map VictoryPath to GameStatus
   */
  private victoryPathToStatus(path: VictoryPath): GameStatus {
    switch (path) {
      case 'IPO': return GameStatus.WON_IPO;
      case 'ACQUISITION': return GameStatus.WON_ACQUISITION;
      case 'PROFITABILITY': return GameStatus.WON_PROFITABILITY;
      case 'TECH_LEADER': return GameStatus.WON_TECH_LEADER;
    }
  }

  /**
   * Map GameStatus to VictoryPath (for won statuses)
   */
  private statusToVictoryPath(status: GameStatus): VictoryPath | null {
    switch (status) {
      case GameStatus.WON_IPO: return 'IPO';
      case GameStatus.WON_ACQUISITION: return 'ACQUISITION';
      case GameStatus.WON_PROFITABILITY: return 'PROFITABILITY';
      case GameStatus.WON_TECH_LEADER: return 'TECH_LEADER';
      default: return null;
    }
  }

  /**
   * Calculate progress (0-100%) toward each victory path.
   */
  private calculateVictoryPathProgress(game: Game): Record<string, number> {
    const mode = (game.difficultyMode || 'NORMAL') as DifficultyMode;
    const allConditions = VICTORY_PATH_CONDITIONS[mode];
    if (!allConditions) return {};

    const progress: Record<string, number> = {};

    for (const [path, conditions] of Object.entries(allConditions) as [VictoryPath, VictoryPathCondition][]) {
      const metrics: number[] = [];

      metrics.push(Math.min(100, (game.users / conditions.minUsers) * 100));
      metrics.push(Math.min(100, (game.cash / conditions.minCash) * 100));
      metrics.push(Math.min(100, (game.trust / conditions.minTrust) * 100));

      if (conditions.minInfraCount) {
        metrics.push(Math.min(100, (game.infrastructure.length / conditions.minInfraCount) * 100));
      }

      if (conditions.requiredInfra && conditions.requiredInfra.length > 0) {
        const met = conditions.requiredInfra.filter(i => game.infrastructure.includes(i)).length;
        metrics.push((met / conditions.requiredInfra.length) * 100);
      }

      // Average of all metric progress values
      const avg = metrics.reduce((a, b) => a + b, 0) / metrics.length;
      progress[path] = Math.round(avg);
    }

    return progress;
  }

  // ---------------------------------------------------------------------------
  // Private: Turn helpers
  // ---------------------------------------------------------------------------

  private isEmergencyTurn(turn: number): boolean {
    return turn >= GAME_CONSTANTS.EMERGENCY_TURN_START && turn <= GAME_CONSTANTS.EMERGENCY_TURN_END;
  }

  private isSpecialTurn(turn: number): boolean {
    return this.isEmergencyTurn(turn) || turn === GAME_CONSTANTS.IPO_SELECTION_TURN;
  }

  private mergeInfrastructure(current: string[], additions: string[]): string[] {
    const merged = new Set([...current, ...additions]);
    return Array.from(merged);
  }

  // ---------------------------------------------------------------------------
  // Private: Win/lose conditions
  // ---------------------------------------------------------------------------

  private checkGameStatus(game: Game): GameStatus {
    const config = this.getDifficultyConfig(game);
    const maxTurns = this.getMaxTurns(game);

    // Bankruptcy: grace period before actual bankruptcy
    if (game.cash < config.bankruptcyThreshold) {
      // Hard threshold exceeded → immediate bankruptcy (no grace)
      return GameStatus.LOST_BANKRUPT;
    }
    if (game.cash < 0 && game.consecutiveNegativeCashTurns >= GAME_CONSTANTS.BANKRUPTCY_GRACE.GRACE_TURNS) {
      // Grace period exhausted → bankruptcy
      return GameStatus.LOST_BANKRUPT;
    }

    // Outage: trust below threshold (graduated by difficulty)
    if (game.users > 0 && game.trust < config.trustOutageThreshold) {
      return GameStatus.LOST_OUTAGE;
    }

    // Equity dilution
    if (game.equityPercentage < GAME_CONSTANTS.EQUITY_MIN_THRESHOLD) {
      return GameStatus.LOST_EQUITY;
    }

    // Emergency turns exempt from max turn check
    const isEmergencyEvent = this.isEmergencyTurn(game.currentTurn);

    if (game.currentTurn >= maxTurns && !isEmergencyEvent) {
      const bestPath = this.findBestVictoryPath(game);
      if (!bestPath) {
        return GameStatus.LOST_FIRED_CTO;
      }
    }

    // IPO success check
    if (game.currentTurn !== GAME_CONSTANTS.IPO_SELECTION_TURN) {
      if (this.checkFullIPOConditions(game)) {
        if (game.currentTurn === GAME_CONSTANTS.IPO_FINAL_SUCCESS_TURN) {
          return GameStatus.WON_IPO;
        }
      }
    }

    return GameStatus.PLAYING;
  }

  private checkIPOConditions(game: Game): boolean {
    const config = this.getDifficultyConfig(game);
    return (
      game.users >= config.ipoMinUsers &&
      game.cash >= config.ipoMinCash &&
      game.trust >= config.ipoMinTrust
    );
  }

  private checkFullIPOConditions(game: Game): boolean {
    const config = this.getDifficultyConfig(game);

    const usersCheck = game.users >= config.ipoMinUsers;
    const cashCheck = game.cash >= config.ipoMinCash;
    const trustCheck = game.trust >= config.ipoMinTrust;
    const infraCheck = GAME_CONSTANTS.IPO_REQUIRED_INFRA.every((infra) =>
      game.infrastructure.includes(infra),
    );

    this.logger.debug(
      `IPO check: users=${usersCheck}(${game.users}/${config.ipoMinUsers}), cash=${cashCheck}(${game.cash}/${config.ipoMinCash}), trust=${trustCheck}(${game.trust}/${config.ipoMinTrust}), infra=${infraCheck}`,
    );

    return usersCheck && cashCheck && trustCheck && infraCheck;
  }

  // ---------------------------------------------------------------------------
  // DTO conversion
  // ---------------------------------------------------------------------------

  private toDto(game: Game): GameResponseDto {
    const config = this.getDifficultyConfig(game);
    const capacityWarning = this.getCapacityWarningLevel(game);
    const maxTurns = this.getMaxTurns(game);

    // Build warnings array
    const warnings: string[] = [];
    if (capacityWarning === 'YELLOW') {
      warnings.push(`인프라 용량의 ${Math.round((game.users / game.maxUserCapacity) * 100)}%를 사용 중입니다. 인프라 확장을 고려하세요.`);
    }
    if (capacityWarning === 'RED') {
      warnings.push(`인프라 용량의 ${Math.round((game.users / game.maxUserCapacity) * 100)}%를 사용 중입니다! 즉시 인프라를 확장하세요!`);
    }
    if (game.trust > 0 && game.trust < config.trustOutageThreshold + 10) {
      warnings.push(`신뢰도가 ${game.trust}%로 위험 수준에 접근 중입니다. ${config.trustOutageThreshold}% 미만이 되면 서비스가 중단됩니다.`);
    }
    if (game.cash > 0 && game.cash < 3_000_000) {
      warnings.push(`자금이 ${game.cash.toLocaleString()}원으로 부족합니다. 파산 위험이 있습니다.`);
    }

    // Victory path progress (always calculated for UI)
    const victoryPathProgress = this.calculateVictoryPathProgress(game);
    const victoryPath = this.statusToVictoryPath(game.status);

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
      maxUserCapacity: game.maxUserCapacity,
      hiredStaff: game.hiredStaff,
      multiChoiceEnabled: game.multiChoiceEnabled,
      // Phase 1 additions
      difficultyMode: game.difficultyMode,
      grade: game.grade,
      maxTurns,
      capacityWarningLevel: capacityWarning,
      warnings,
      capacityUsagePercent: game.maxUserCapacity > 0
        ? Math.round((game.users / game.maxUserCapacity) * 100)
        : 0,
      // Phase 2 additions
      victoryPath,
      victoryPathProgress,
      // Phase 3 additions
      resilienceStacks: game.resilienceStacks,
      bankruptcyGraceTurns: game.cash < 0
        ? Math.max(0, GAME_CONSTANTS.BANKRUPTCY_GRACE.GRACE_TURNS - game.consecutiveNegativeCashTurns)
        : undefined,
      comebackActive: this.getComebackMultiplier(game, config) > 1.0,
    };
  }

  /**
   * Interpolate event text with game state values
   * Replaces placeholders like {users}, {cash}, {trust} with actual values
   */
  private interpolateEventText(text: string, game: Game): string {
    if (!text) return '';

    return text
      .replace(/{users}/g, game.users.toLocaleString())
      .replace(/{cash}/g, game.cash.toLocaleString())
      .replace(/{trust}/g, game.trust.toString())
      .replace(/{currentTurn}/g, game.currentTurn.toString())
      .replace(/{infrastructure}/g, game.infrastructure.join(', '));
  }
}
