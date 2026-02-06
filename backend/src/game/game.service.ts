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
import { TrustChangeFactor } from '../database/entities/trust-history.entity';
import { Quiz, QuizDifficulty } from '../database/entities/quiz.entity';
import { QuizHistory } from '../database/entities/quiz-history.entity';
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
import { TrustHistoryService } from './trust-history.service';
import { AlternativeInvestmentService } from './alternative-investment.service';
import { QuizService } from '../quiz/quiz.service';
import { SecureRandomService } from '../security/secure-random.service';

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
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizHistory)
    private readonly quizHistoryRepository: Repository<QuizHistory>,
    private readonly eventService: EventService,
    private readonly trustHistoryService: TrustHistoryService,
    private readonly alternativeInvestmentService: AlternativeInvestmentService,
    private readonly quizService: QuizService,
    private readonly secureRandomService: SecureRandomService,
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
    game.capacityWarningActive = false;
    game.consecutiveCapacityExceeded = 0;
    game.consecutiveStableTurns = 0; // EPIC-04 Feature 3
    game.bridgeFinancingUsed = 0; // EPIC-04 Feature 6
    game.governmentGrantUsed = false; // EPIC-04 Feature 6
    game.governmentReportRequired = false; // EPIC-04 Feature 6

    // Save game first to get gameId, then generate quiz turns
    const savedGame = await this.gameRepository.save(game);

    // EPIC-07: Generate 5 random quiz turns with minimum 3-turn spacing
    savedGame.quizTurns = this.generateQuizTurns(savedGame.gameId);
    savedGame.correctQuizCount = 0;
    savedGame.quizBonus = 0;

    // Save again with quiz turns
    const finalGame = await this.gameRepository.save(savedGame);
    return this.toDto(finalGame);
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

    // EPIC-07: Check if there's a pending quiz that must be answered before proceeding
    const hasPendingQuiz = game.quizTurns && game.quizTurns.includes(game.currentTurn);
    if (hasPendingQuiz) {
      const quizHistory = await this.quizHistoryRepository.findOne({
        where: { gameId, turnNumber: game.currentTurn },
      });

      if (!quizHistory) {
        throw new BadRequestException(
          '퀴즈를 먼저 풀어야 다음 턴으로 진행할 수 있습니다.',
        );
      }
    }

    const config = this.getDifficultyConfig(game);
    const maxTurns = this.getMaxTurns(game);
    const recoveryMessages: string[] = [];

    // --- Trust change tracking (EPIC-04 Feature 5) ---
    const trustBefore = game.trust;
    const trustFactors: TrustChangeFactor[] = [];

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

    // --- Capacity warning system (EPIC-04 Feature 2) ---
    // Track whether capacity is exceeded and what penalty/message to show
    let capacityExceeded = false;
    let capacityPenalty = 0;
    let capacityWarningMessage: string | undefined;

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
      trustFactors.push({
        type: 'penalty',
        amount: -trustLoss,
        message: '초기 투자 피칭 실패',
      });
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
      game.users = newUserCount;

      // Check capacity AFTER all effects are applied and capacity is recalculated
      // The consecutive counter is updated at the END of the turn, not during processing

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

      // Trust: apply multipliers with EPIC-08 cap
      const originalTrustEffect = choice.effects.trust;

      // Step 1: Calculate total multiplier (staff × difficulty × comeback)
      let totalMultiplier = game.trustMultiplier;
      if (originalTrustEffect > 0) {
        totalMultiplier *= config.positiveEffectMultiplier;
        totalMultiplier *= this.getComebackMultiplier(game, config);
      } else if (originalTrustEffect < 0) {
        // Negative effects: only difficulty multiplier, no staff/comeback
        totalMultiplier = config.negativeEffectMultiplier;
      }

      // Step 2: Apply EPIC-08 cap to positive effects
      if (originalTrustEffect > 0) {
        totalMultiplier = Math.min(totalMultiplier, GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);
      }

      // Step 3: Calculate trust gain
      let trustGain = Math.floor(originalTrustEffect * totalMultiplier);

      // Step 4: Transparency bonus (EPIC-04 Feature 3)
      if (choice.tags?.includes('transparency') && game.capacityWarningActive && trustGain > 0) {
        const beforeTransparency = trustGain;
        trustGain = Math.floor(trustGain * GAME_CONSTANTS.TRANSPARENCY.EFFECT_MULTIPLIER);

        // EPIC-08: Re-apply cap after transparency bonus
        const maxAllowedGain = Math.floor(originalTrustEffect * GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);
        if (trustGain > maxAllowedGain) {
          trustGain = maxAllowedGain;
        }

        recoveryMessages.push(`💬 투명한 소통이 신뢰 회복을 가속화했습니다 (신뢰도 회복 ${beforeTransparency} → ${trustGain})`);
        this.logger.debug(`Transparency bonus applied: ${beforeTransparency} → ${trustGain}, capped at ${GAME_CONSTANTS.TRUST_MULTIPLIER_CAP}x`);
      }

      // Step 5: Apply diminishing returns based on current trust level (EPIC-08 Phase 3)
      if (trustGain > 0) {
        const beforeDiminishing = trustGain;
        trustGain = this.applyDiminishingReturns(trustGain, game.trust);

        if (trustGain < beforeDiminishing) {
          this.logger.debug(`Diminishing returns: ${beforeDiminishing} → ${trustGain} at trust ${game.trust}`);
        }
      }

      game.trust += trustGain;

      // Track trust change from choice effect
      if (trustGain !== 0) {
        const choiceText = choice.text.length > 30 ? choice.text.substring(0, 30) + '...' : choice.text;
        trustFactors.push({
          type: 'choice',
          amount: trustGain,
          message: `선택: ${choiceText}`,
        });
      }
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

    // --- Final capacity check and consecutive counter update (EPIC-04 Feature 2) ---
    // This happens AFTER all effects and infrastructure changes are applied
    if (game.users > game.maxUserCapacity) {
      const fullPenalty = this.calculateCapacityPenalty(game.users, game.maxUserCapacity);

      // EPIC-09: 3-tier progressive penalty system
      if (game.consecutiveCapacityExceeded === 0) {
        // First capacity exceeded: 33% penalty
        capacityPenalty = Math.floor(fullPenalty * 0.33);
        capacityWarningMessage = '⚠️ 서비스 응답 지연 발생 - 다음 턴까지 인프라를 개선하세요';
        this.logger.warn(
          `첫 용량 초과 경고: users=${game.users}, maxCapacity=${game.maxUserCapacity}, reducedPenalty=-${capacityPenalty} (원래 -${fullPenalty}, 33%)`,
        );
      } else if (game.consecutiveCapacityExceeded === 1) {
        // Second capacity exceeded: 67% penalty
        capacityPenalty = Math.floor(fullPenalty * 0.67);
        capacityWarningMessage = `⚠️ 서비스 지연 심화! (연속 2회) - 즉시 조치 필요`;
        this.logger.warn(
          `2회 연속 용량 초과: users=${game.users}, maxCapacity=${game.maxUserCapacity}, penalty=-${capacityPenalty} (원래 -${fullPenalty}, 67%)`,
        );
      } else {
        // Third or subsequent: full penalty
        capacityPenalty = fullPenalty;
        capacityWarningMessage = `🔥 서비스 장애 발생! (연속 ${game.consecutiveCapacityExceeded + 1}회)`;
        this.logger.warn(
          `연속 용량 초과 (${game.consecutiveCapacityExceeded + 1}회): users=${game.users}, maxCapacity=${game.maxUserCapacity}, penalty=-${fullPenalty} (100%)`,
        );
      }

      game.trust = Math.max(0, game.trust - capacityPenalty);
      capacityExceeded = true;
      game.capacityExceededCount++;

      // 수용량 초과 시 사용자 20% 이탈 (churn)
      const usersBefore = game.users;
      const churnRate = 0.20; // 20% 이탈
      const usersLost = Math.floor(game.users * churnRate);
      game.users = Math.max(0, game.users - usersLost);

      this.logger.warn(
        `수용량 초과로 사용자 이탈: ${usersBefore.toLocaleString()} → ${game.users.toLocaleString()} (-${usersLost.toLocaleString()}, -20%)`,
      );

      // Track capacity penalty
      trustFactors.push({
        type: 'penalty',
        amount: -capacityPenalty,
        message: `용량 초과 (${usersBefore.toLocaleString()}명 > ${game.maxUserCapacity.toLocaleString()}명) → 사용자 ${usersLost.toLocaleString()}명 이탈`,
      });

      // Award resilience stack + crisis recovery bonus (EPIC-04 Feature 3: increased to 5)
      const resilienceMsg = this.awardResilienceStack(game);
      if (resilienceMsg) recoveryMessages.push(resilienceMsg);

      // Crisis recovery bonus when surviving capacity exceeded (after resilience stack award)
      if (game.capacityExceededCount > 0 && game.resilienceStacks > 0) {
        const crisisBonus = GAME_CONSTANTS.TRUST_RECOVERY.CRISIS_RECOVERY_BONUS;
        game.trust = Math.min(100, game.trust + crisisBonus);
        recoveryMessages.push(`✅ 장애 극복으로 신뢰도가 회복되었습니다 (+${crisisBonus})`);
        this.logger.debug(`Crisis recovery bonus applied: +${crisisBonus} trust`);

        // Track crisis recovery bonus
        trustFactors.push({
          type: 'recovery',
          amount: crisisBonus,
          message: '장애 극복 보너스',
        });
      }

      // Increment consecutive counter
      game.capacityWarningActive = true;
      game.consecutiveCapacityExceeded++;

      // Reset stable operations counter (EPIC-04 Feature 3)
      game.consecutiveStableTurns = 0;
    } else {
      // Capacity normalized - reset consecutive counter
      if (game.consecutiveCapacityExceeded > 0) {
        this.logger.debug(`용량 정상화: 경고 카운터 리셋 (이전: ${game.consecutiveCapacityExceeded}회)`);
      }
      game.consecutiveCapacityExceeded = 0;
      game.capacityWarningActive = false;

      // --- EPIC-04 Feature 3: Stable operations bonus ---
      // Check if capacity is at or below 80% threshold
      const capacityRatio = game.maxUserCapacity > 0 ? game.users / game.maxUserCapacity : 0;
      if (capacityRatio <= GAME_CONSTANTS.STABLE_OPERATIONS.CAPACITY_THRESHOLD) {
        game.consecutiveStableTurns++;
        if (game.consecutiveStableTurns >= GAME_CONSTANTS.STABLE_OPERATIONS.REQUIRED_TURNS) {
          const stableBonus = GAME_CONSTANTS.STABLE_OPERATIONS.TRUST_BONUS;
          game.trust = Math.min(100, game.trust + stableBonus);
          recoveryMessages.push(`✅ 안정적 서비스 운영이 시장 신뢰를 높였습니다 (+${stableBonus})`);
          this.logger.debug(
            `Stable operations bonus: ${game.consecutiveStableTurns} turns at ≤80% capacity, +${stableBonus} trust`,
          );

          // Track stable operations bonus
          trustFactors.push({
            type: 'bonus',
            amount: stableBonus,
            message: `안정 운영 보너스 (${game.consecutiveStableTurns}턴 연속)`,
          });

          game.consecutiveStableTurns = 0; // Reset after bonus awarded
        }
      } else {
        // Capacity above 80% but not exceeded - reset stable counter
        game.consecutiveStableTurns = 0;
      }
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

    // --- EPIC-04 Feature 5: Record trust history ---
    const trustAfter = game.trust;
    const trustChange = trustAfter - trustBefore;
    if (trustChange !== 0 || trustFactors.length > 0) {
      await this.trustHistoryService.record({
        gameId,
        turnNumber: game.currentTurn - 1, // Record for the turn that just completed
        trustBefore,
        trustAfter,
        change: trustChange,
        factors: trustFactors,
      });
    }

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
      const baseMessage = `인프라 용량(${game.maxUserCapacity.toLocaleString()}명)을 초과했습니다. 신뢰도 -${capacityPenalty}`;
      dto.capacityExceededMessage = capacityWarningMessage
        ? `${capacityWarningMessage}\n${baseMessage}`
        : baseMessage;
      if (capacityWarningMessage) {
        dto.capacityWarningMessage = capacityWarningMessage;
      }
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

    // EPIC-07: Check if there's a pending quiz that must be answered before proceeding
    const hasPendingQuiz = game.quizTurns && game.quizTurns.includes(game.currentTurn);
    if (hasPendingQuiz) {
      const quizHistory = await this.quizHistoryRepository.findOne({
        where: { gameId, turnNumber: game.currentTurn },
      });

      if (!quizHistory) {
        throw new BadRequestException(
          '퀴즈를 먼저 풀어야 다음 턴으로 진행할 수 있습니다.',
        );
      }
    }

    const config = this.getDifficultyConfig(game);
    const maxTurns = this.getMaxTurns(game);
    const currentTurn = game.currentTurn;
    let capacityExceeded = false;
    let capacityPenalty = 0;
    let capacityWarningMessage: string | undefined;
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

      // Trust: apply multipliers with EPIC-08 cap
      const originalTrustEffect = choice.effects.trust;

      // Calculate total multiplier (staff × difficulty × comeback) with cap
      let totalMultiplier = game.trustMultiplier;
      if (originalTrustEffect > 0) {
        totalMultiplier *= config.positiveEffectMultiplier;
        totalMultiplier *= this.getComebackMultiplier(game, config);
        totalMultiplier = Math.min(totalMultiplier, GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);
      } else if (originalTrustEffect < 0) {
        totalMultiplier = config.negativeEffectMultiplier;
      }

      let trustGain = Math.floor(originalTrustEffect * totalMultiplier);

      // EPIC-04 Feature 3: Transparency bonus
      if (choice.tags?.includes('transparency') && game.capacityWarningActive && trustGain > 0) {
        const beforeTransparency = trustGain;
        trustGain = Math.floor(trustGain * GAME_CONSTANTS.TRANSPARENCY.EFFECT_MULTIPLIER);

        // EPIC-08: Re-apply cap after transparency bonus
        const maxAllowedGain = Math.floor(originalTrustEffect * GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);
        if (trustGain > maxAllowedGain) {
          trustGain = maxAllowedGain;
        }

        recoveryMessages.push(`💬 투명한 소통이 신뢰 회복을 가속화했습니다 (신뢰도 회복 ${beforeTransparency} → ${trustGain})`);
      }

      // EPIC-08 Phase 3: Apply diminishing returns
      if (trustGain > 0) {
        trustGain = this.applyDiminishingReturns(trustGain, game.trust);
      }

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

    // Recalculate capacity + resilience bonus BEFORE checking
    const rawCapacity = this.calculateMaxCapacity(game.infrastructure, game.hasConsultingEffect);
    game.maxUserCapacity = this.applyResilienceToCapacity(rawCapacity, game.resilienceStacks);

    // Capacity check (graduated with warning system) - AFTER recalculation
    if (game.users > game.maxUserCapacity) {
      const fullPenalty = this.calculateCapacityPenalty(game.users, game.maxUserCapacity);

      // EPIC-09: 3-tier progressive penalty system
      if (game.consecutiveCapacityExceeded === 0) {
        // First capacity exceeded: 33% penalty
        capacityPenalty = Math.floor(fullPenalty * 0.33);
        capacityWarningMessage = '⚠️ 서비스 응답 지연 발생 - 다음 턴까지 인프라를 개선하세요';
      } else if (game.consecutiveCapacityExceeded === 1) {
        // Second capacity exceeded: 67% penalty
        capacityPenalty = Math.floor(fullPenalty * 0.67);
        capacityWarningMessage = `⚠️ 서비스 지연 심화! (연속 2회) - 즉시 조치 필요`;
      } else {
        // Third or subsequent: full penalty
        capacityPenalty = fullPenalty;
        capacityWarningMessage = `🔥 서비스 장애 발생! (연속 ${game.consecutiveCapacityExceeded + 1}회)`;
      }

      game.trust = Math.max(0, game.trust - capacityPenalty);
      capacityExceeded = true;
      game.capacityExceededCount++;

      // 수용량 초과 시 사용자 20% 이탈 (churn)
      const usersBefore = game.users;
      const churnRate = 0.20; // 20% 이탈
      const usersLost = Math.floor(game.users * churnRate);
      game.users = Math.max(0, game.users - usersLost);

      this.logger.warn(
        `[MultiChoice] 수용량 초과로 사용자 이탈: ${usersBefore.toLocaleString()} → ${game.users.toLocaleString()} (-${usersLost.toLocaleString()}, -20%)`,
      );

      const resilienceMsg = this.awardResilienceStack(game);
      if (resilienceMsg) recoveryMessages.push(resilienceMsg);

      // EPIC-04 Feature 3: Crisis recovery bonus (increased to 5)
      if (game.capacityExceededCount > 0 && game.resilienceStacks > 0) {
        const crisisBonus = GAME_CONSTANTS.TRUST_RECOVERY.CRISIS_RECOVERY_BONUS;
        game.trust = Math.min(100, game.trust + crisisBonus);
        recoveryMessages.push(`✅ 장애 극복으로 신뢰도가 회복되었습니다 (+${crisisBonus})`);
      }

      // Increment consecutive counter
      game.capacityWarningActive = true;
      game.consecutiveCapacityExceeded++;

      // Reset stable operations counter
      game.consecutiveStableTurns = 0;
    } else {
      // Capacity normalized: reset warning counters
      if (game.consecutiveCapacityExceeded > 0) {
        this.logger.debug(`용량 정상화: 경고 카운터 리셋 (이전: ${game.consecutiveCapacityExceeded}회)`);
      }
      game.consecutiveCapacityExceeded = 0;
      game.capacityWarningActive = false;

      // --- EPIC-04 Feature 3: Stable operations bonus ---
      const capacityRatio = game.maxUserCapacity > 0 ? game.users / game.maxUserCapacity : 0;
      if (capacityRatio <= GAME_CONSTANTS.STABLE_OPERATIONS.CAPACITY_THRESHOLD) {
        game.consecutiveStableTurns++;
        if (game.consecutiveStableTurns >= GAME_CONSTANTS.STABLE_OPERATIONS.REQUIRED_TURNS) {
          const stableBonus = GAME_CONSTANTS.STABLE_OPERATIONS.TRUST_BONUS;
          game.trust = Math.min(100, game.trust + stableBonus);
          recoveryMessages.push(`✅ 안정적 서비스 운영이 시장 신뢰를 높였습니다 (+${stableBonus})`);
          game.consecutiveStableTurns = 0;
        }
      } else {
        game.consecutiveStableTurns = 0;
      }
    }

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
      const baseMessage = `인프라 용량(${game.maxUserCapacity.toLocaleString()}명)을 초과했습니다. 신뢰도 -${capacityPenalty}`;
      dto.capacityExceededMessage = capacityWarningMessage
        ? `${capacityWarningMessage}\n${baseMessage}`
        : baseMessage;
      if (capacityWarningMessage) {
        dto.capacityWarningMessage = capacityWarningMessage;
      }
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
    // Delete associated trust history first
    await this.trustHistoryService.deleteHistory(gameId);

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
   * Apply diminishing returns to trust gains based on current trust level (EPIC-08 Phase 3).
   * Higher trust = harder to gain more trust (natural market saturation).
   *
   * Tiers:
   * - 0-60: 1.0x (normal growth)
   * - 60-75: 0.7x (30% reduction)
   * - 75-85: 0.5x (50% reduction)
   * - 85-100: 0.3x (70% reduction)
   */
  private applyDiminishingReturns(trustGain: number, currentTrust: number): number {
    const settings = GAME_CONSTANTS.TRUST_DIMINISHING_RETURNS;

    if (!settings.ENABLED || trustGain <= 0) {
      return trustGain;
    }

    // Find the tier for current trust level
    const currentTier = settings.TIERS.find(
      (tier) => currentTrust >= tier.minTrust && currentTrust < tier.maxTrust
    ) || settings.TIERS[settings.TIERS.length - 1]; // Default to last tier if >= 100

    const adjustedGain = Math.floor(trustGain * currentTier.multiplier);

    this.logger.debug(
      `Diminishing returns applied: trust=${currentTrust}, tier=${currentTier.minTrust}-${currentTier.maxTrust}, ` +
      `multiplier=${currentTier.multiplier}, gain=${trustGain} → ${adjustedGain}`
    );

    return adjustedGain;
  }

  /**
   * 신뢰도 효과 배율 적용
   */
  /**
   * Apply trust effect multiplier with cap (EPIC-08).
   * Combines difficulty multiplier and comeback bonus, then applies cap.
   * Note: Staff multiplier (game.trustMultiplier) should be applied BEFORE calling this.
   */
  private applyTrustEffectMultiplier(
    value: number,
    config: DifficultyConfig,
    game: Game
  ): number {
    if (value === 0) return 0;

    let totalMultiplier = 1.0;

    if (value > 0) {
      // Positive effects: apply difficulty multiplier + comeback
      totalMultiplier = config.positiveEffectMultiplier;
      totalMultiplier *= this.getComebackMultiplier(game, config);

      // Apply multiplier cap (EPIC-08) to prevent extreme stacking
      totalMultiplier = Math.min(totalMultiplier, GAME_CONSTANTS.TRUST_MULTIPLIER_CAP);
    } else {
      // Negative effects: only difficulty multiplier (no cap needed)
      totalMultiplier = config.negativeEffectMultiplier;
    }

    return Math.floor(value * totalMultiplier);
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
      // EPIC-07: Quiz System additions
      quizTurns: game.quizTurns,
      correctQuizCount: game.correctQuizCount,
      quizBonus: game.quizBonus,
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

  // ---------------------------------------------------------------------------
  // Quiz System Integration (EPIC-07)
  // ---------------------------------------------------------------------------

  /**
   * Generate 5 random quiz turns with minimum 3-turn spacing
   *
   * Uses SecureRandomService for reproducible random generation based on game seed.
   * Ensures no two quiz turns are closer than 3 turns apart.
   *
   * @param gameSeed Game ID used as seed for reproducibility
   * @returns Array of 5 turn numbers sorted in ascending order
   */
  private generateQuizTurns(gameSeed: string): number[] {
    const turns: number[] = [];
    const availableTurns = Array.from({ length: 25 }, (_, i) => i + 1);

    // Create a simple seeded random function based on gameSeed
    // Using a hash-based approach for reproducibility
    const createHash = require('crypto').createHash;
    const seedHash = createHash('sha256').update(gameSeed).digest();

    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    while (turns.length < 5 && attempts < maxAttempts) {
      attempts++;

      if (availableTurns.length === 0) {
        this.logger.warn(
          `No more available turns for quiz generation. Generated ${turns.length}/5 quizzes.`,
        );
        break;
      }

      // Select random turn from available turns using hash + attempt as seed
      const attemptSeed = createHash('sha256')
        .update(gameSeed + attempts.toString())
        .digest();
      const randomIndex = attemptSeed.readUInt32BE(0) % availableTurns.length;
      const selectedTurn = availableTurns[randomIndex];

      // Check minimum 3-turn spacing with all existing quiz turns
      const hasValidSpacing = turns.every(
        (existingTurn) => Math.abs(existingTurn - selectedTurn) >= 3,
      );

      if (hasValidSpacing) {
        turns.push(selectedTurn);
        this.logger.debug(`Quiz turn selected: ${selectedTurn}`);
      }

      // Remove selected turn from available pool regardless of spacing result
      availableTurns.splice(randomIndex, 1);
    }

    if (turns.length < 5) {
      this.logger.warn(
        `Could not generate 5 quiz turns with 3-turn spacing. Generated ${turns.length} turns after ${attempts} attempts.`,
      );
    }

    const sortedTurns = turns.sort((a, b) => a - b);
    this.logger.log(
      `Quiz turns generated: [${sortedTurns.join(', ')}] for game seed ${gameSeed}`,
    );

    return sortedTurns;
  }

  /**
   * Calculate quiz difficulty based on current turn number
   *
   * Turn ranges:
   * - 1-10: EASY
   * - 11-20: MEDIUM
   * - 21-25: HARD
   *
   * @param turnNumber Current turn number
   * @returns Quiz difficulty level
   */
  private calculateQuizDifficulty(turnNumber: number): QuizDifficulty {
    if (turnNumber <= 10) {
      return QuizDifficulty.EASY;
    }
    if (turnNumber <= 20) {
      return QuizDifficulty.MEDIUM;
    }
    return QuizDifficulty.HARD;
  }

  /**
   * Check if there's a pending quiz for the current turn
   *
   * This method should be called:
   * 1. After each turn progression (in executeChoice)
   * 2. By the frontend to display quiz modal
   *
   * @param gameId Game ID
   * @returns Quiz object if quiz should be shown, null otherwise
   * @throws NotFoundException if game not found
   */
  async checkForQuiz(gameId: string): Promise<Quiz | null> {
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    const currentTurn = game.currentTurn;
    const shouldShowQuiz = game.quizTurns && game.quizTurns.includes(currentTurn);

    if (!shouldShowQuiz) {
      this.logger.debug(
        `No quiz for game ${gameId} at turn ${currentTurn}. Quiz turns: [${game.quizTurns ? game.quizTurns.join(', ') : 'none'}]`,
      );
      return null;
    }

    // Check if quiz was already answered for this turn
    const existingAnswer = await this.quizHistoryRepository.findOne({
      where: { gameId, turnNumber: currentTurn },
    });

    if (existingAnswer) {
      this.logger.debug(
        `Quiz already answered for game ${gameId} at turn ${currentTurn}`,
      );
      return null;
    }

    // Generate quiz based on current game state
    const difficulty = this.calculateQuizDifficulty(currentTurn);
    const infraContext = game.infrastructure;

    this.logger.log(
      `Generating quiz for game ${gameId} at turn ${currentTurn}: difficulty=${difficulty}, infra=${infraContext.join(',')}`,
    );

    try {
      const quiz = await this.quizService.generateQuiz({
        difficulty,
        infraContext,
        turnNumber: currentTurn,
        gameId: game.gameId,
        useCache: true,
      });

      return quiz;
    } catch (error) {
      this.logger.error(
        `Failed to generate quiz for game ${gameId} at turn ${currentTurn}: ${error.message}`,
        error.stack,
      );
      // Return null instead of throwing to allow game to continue without quiz
      return null;
    }
  }

  /**
   * Handle quiz answer submission
   *
   * Validates answer, records history, and updates game statistics.
   *
   * @param gameId Game ID
   * @param quizId Quiz ID
   * @param answer Player's answer ('A', 'B', 'C', 'D' or 'true', 'false')
   * @returns Object containing answer correctness, correct answer, and explanation
   * @throws NotFoundException if game or quiz not found
   * @throws BadRequestException if answer format is invalid
   */
  async handleQuizAnswer(
    gameId: string,
    quizId: string,
    answer: string,
  ): Promise<{ isCorrect: boolean; correctAnswer: string; explanation: string }> {
    const game = await this.gameRepository.findOne({ where: { gameId } });

    if (!game) {
      throw new NotFoundException(`게임을 찾을 수 없습니다: ${gameId}`);
    }

    // Validate answer with QuizService
    const isCorrect = await this.quizService.validateAnswer(quizId, answer);

    // Record answer in quiz history
    await this.quizService.recordAnswer(
      gameId,
      quizId,
      answer,
      isCorrect,
      game.currentTurn,
    );

    // Update game statistics
    if (isCorrect) {
      game.correctQuizCount += 1;
      this.logger.log(
        `Correct quiz answer for game ${gameId}. Total correct: ${game.correctQuizCount}/5`,
      );
    } else {
      this.logger.log(
        `Incorrect quiz answer for game ${gameId}. Total correct: ${game.correctQuizCount}/5`,
      );
    }

    // Calculate and update bonus score
    game.quizBonus = this.quizService.calculateQuizBonus(game.correctQuizCount);

    await this.gameRepository.save(game);

    // Get quiz for explanation
    const quiz = await this.quizRepository.findOne({ where: { quizId } });

    if (!quiz) {
      throw new NotFoundException(`퀴즈를 찾을 수 없습니다: ${quizId}`);
    }

    this.logger.log(
      `Quiz answer handled: gameId=${gameId}, quizId=${quizId}, isCorrect=${isCorrect}, bonus=${game.quizBonus}`,
    );

    return {
      isCorrect,
      correctAnswer: quiz.correctAnswer,
      explanation: quiz.explanation,
    };
  }
}
