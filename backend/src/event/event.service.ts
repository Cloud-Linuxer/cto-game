import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../database/entities/game.entity';
import { EventState } from '../database/entities/event-state.entity';
import { EventHistory } from '../database/entities/event-history.entity';
import { DynamicEvent, EventType, EventSeverity } from '../database/entities/dynamic-event.entity';
import * as seedrandom from 'seedrandom';
import { SecureRandomService } from '../security/secure-random.service';

/**
 * EventService
 *
 * Manages random event system:
 * - Checks if events should trigger
 * - Evaluates trigger conditions
 * - Applies event effects
 * - Tracks event state and history
 */
@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(EventState)
    private readonly eventStateRepository: Repository<EventState>,
    @InjectRepository(EventHistory)
    private readonly eventHistoryRepository: Repository<EventHistory>,
    @InjectRepository(DynamicEvent)
    private readonly dynamicEventRepository: Repository<DynamicEvent>,
    private readonly secureRandomService: SecureRandomService,
  ) {}

  /**
   * Check if a random event should trigger for the current game state
   */
  async checkRandomEvent(game: Game): Promise<DynamicEvent | null> {
    try {
      // Get all available events
      const allEvents = await this.dynamicEventRepository.find();

      if (!allEvents || allEvents.length === 0) {
        this.logger.warn('No events available in database');
        return null;
      }

      // Filter events by trigger conditions
      const eligibleEvents = await this.filterEligibleEvents(game, allEvents);

      if (eligibleEvents.length === 0) {
        return null;
      }

      // Use seeded random for reproducibility
      const rng = seedrandom(`${game.gameId}-${game.eventSeed}-${game.currentTurn}`);
      const randomValue = rng();

      // Check probability for each eligible event
      for (const event of eligibleEvents) {
        const probability = event.triggerCondition?.probability || 15;
        const threshold = probability / 100;

        if (randomValue < threshold) {
          this.logger.log(
            `Event triggered: ${event.eventId} (probability: ${probability}%, roll: ${(randomValue * 100).toFixed(2)}%)`,
          );
          return event;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Error checking random event: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Filter events that meet trigger conditions
   */
  private async filterEligibleEvents(
    game: Game,
    events: DynamicEvent[],
  ): Promise<DynamicEvent[]> {
    const eligible: DynamicEvent[] = [];

    for (const event of events) {
      if (await this.evaluateTriggerCondition(game, event)) {
        eligible.push(event);
      }
    }

    // Sort by priority (higher first)
    return eligible.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Evaluate if an event's trigger condition is met
   */
  async evaluateTriggerCondition(
    game: Game,
    event: DynamicEvent,
  ): Promise<boolean> {
    const condition = event.triggerCondition;

    if (!condition) {
      return true;
    }

    // Check turn range
    if (condition.minTurn && game.currentTurn < condition.minTurn) {
      return false;
    }
    if (condition.maxTurn && game.currentTurn > condition.maxTurn) {
      return false;
    }

    // Check user thresholds
    if (condition.minUsers && game.users < condition.minUsers) {
      return false;
    }
    if (condition.maxUsers && game.users > condition.maxUsers) {
      return false;
    }

    // Check cash thresholds
    if (condition.minCash && game.cash < condition.minCash) {
      return false;
    }
    if (condition.maxCash && game.cash > condition.maxCash) {
      return false;
    }

    // Check trust thresholds
    if (condition.minTrust && game.trust < condition.minTrust) {
      return false;
    }
    if (condition.maxTrust && game.trust > condition.maxTrust) {
      return false;
    }

    // Check infrastructure requirements
    if (condition.requiredInfra) {
      const hasAll = condition.requiredInfra.every((infra) =>
        game.infrastructure.includes(infra),
      );
      if (!hasAll) {
        return false;
      }
    }

    if (condition.excludedInfra) {
      const hasAny = condition.excludedInfra.some((infra) =>
        game.infrastructure.includes(infra),
      );
      if (hasAny) {
        return false;
      }
    }

    if (
      condition.minInfraCount &&
      game.infrastructure.length < condition.minInfraCount
    ) {
      return false;
    }

    if (
      condition.maxInfraCount &&
      game.infrastructure.length > condition.maxInfraCount
    ) {
      return false;
    }

    // Check staff requirements
    if (condition.requiredStaff) {
      const hasAll = condition.requiredStaff.every((staff) =>
        game.hiredStaff.includes(staff),
      );
      if (!hasAll) {
        return false;
      }
    }

    if (
      condition.minStaffCount &&
      game.hiredStaff.length < condition.minStaffCount
    ) {
      return false;
    }

    // Check game state conditions
    if (
      condition.capacityExceeded !== undefined &&
      (game.users > game.maxUserCapacity) !== condition.capacityExceeded
    ) {
      return false;
    }

    if (
      condition.multiChoiceEnabled !== undefined &&
      game.multiChoiceEnabled !== condition.multiChoiceEnabled
    ) {
      return false;
    }

    // Check difficulty
    if (condition.difficulties && condition.difficulties.length > 0) {
      if (!condition.difficulties.includes(game.difficultyMode)) {
        return false;
      }
    }

    // Check cooldown
    if (condition.cooldownTurns && condition.cooldownTurns > 0) {
      const eventState = await this.eventStateRepository.findOne({
        where: { gameId: game.gameId, eventId: event.eventId },
      });

      if (eventState && eventState.lastTriggeredTurn) {
        const turnsSinceLastTrigger =
          game.currentTurn - eventState.lastTriggeredTurn;
        if (turnsSinceLastTrigger < condition.cooldownTurns) {
          return false;
        }
      }
    }

    // Check one-time events
    if (event.isOneTime) {
      const eventState = await this.eventStateRepository.findOne({
        where: { gameId: game.gameId, eventId: event.eventId },
      });

      if (eventState && eventState.isCompleted) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute event response after player choice
   */
  async executeEventResponse(
    gameId: string,
    eventId: string,
    choiceId: string,
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({ where: { gameId } });
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    const event = await this.dynamicEventRepository.findOne({
      where: { eventId },
    });
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Find selected choice
    const choice = event.choices.find((c) => c.choiceId === choiceId);
    if (!choice) {
      throw new Error(`Choice not found: ${choiceId} in event ${eventId}`);
    }

    // Record state before applying effects
    const stateBefore = {
      users: game.users,
      cash: game.cash,
      trust: game.trust,
      infrastructure: [...game.infrastructure],
    };

    // Apply choice effects
    this.applyEventEffect(game, choice.effect);

    // Apply choice costs
    if (choice.cashCost) {
      game.cash -= choice.cashCost;
    }
    if (choice.trustCost) {
      game.trust -= choice.trustCost;
    }

    // Update event state
    await this.updateEventState(game, event, choiceId);

    // Record history
    await this.recordEventHistory(game, event, choice, stateBefore);

    // Save updated game
    await this.gameRepository.save(game);

    this.logger.log(
      `Event response executed: ${eventId}, choice: ${choiceId}, game: ${gameId}`,
    );

    return game;
  }

  /**
   * Apply event effect to game state
   */
  private applyEventEffect(game: Game, effect: any): void {
    if (!effect) {
      return;
    }

    // User changes
    if (effect.usersDelta) {
      game.users = Math.max(0, game.users + effect.usersDelta);
    }
    if (effect.usersMultiplier) {
      game.users = Math.floor(game.users * effect.usersMultiplier);
    }

    // Cash changes
    if (effect.cashDelta) {
      game.cash += effect.cashDelta;
    }
    if (effect.cashMultiplier) {
      game.cash = Math.floor(game.cash * effect.cashMultiplier);
    }

    // Trust changes
    if (effect.trustDelta) {
      game.trust = Math.max(0, Math.min(100, game.trust + effect.trustDelta));
    }
    if (effect.trustMultiplier) {
      game.trust = Math.max(
        0,
        Math.min(100, Math.floor(game.trust * effect.trustMultiplier)),
      );
    }

    // Infrastructure changes
    if (effect.addInfrastructure) {
      effect.addInfrastructure.forEach((infra: string) => {
        if (!game.infrastructure.includes(infra)) {
          game.infrastructure.push(infra);
        }
      });
    }
    if (effect.removeInfrastructure) {
      game.infrastructure = game.infrastructure.filter(
        (infra) => !effect.removeInfrastructure.includes(infra),
      );
    }

    // Capacity changes
    if (effect.maxCapacityDelta) {
      game.maxUserCapacity = Math.max(
        0,
        game.maxUserCapacity + effect.maxCapacityDelta,
      );
    }
    if (effect.maxCapacityMultiplier) {
      game.maxUserCapacity = Math.floor(
        game.maxUserCapacity * effect.maxCapacityMultiplier,
      );
    }

    // Multiplier effects
    if (effect.userAcquisitionMultiplierDelta) {
      game.userAcquisitionMultiplier += effect.userAcquisitionMultiplierDelta;
    }
    if (effect.trustMultiplierDelta) {
      game.trustMultiplier += effect.trustMultiplierDelta;
    }

    // Special effects
    if (effect.endGame) {
      if (effect.setStatus) {
        game.status = effect.setStatus as any;
      }
    }
  }

  /**
   * Update event state tracking
   */
  private async updateEventState(
    game: Game,
    event: DynamicEvent,
    choiceId: string,
  ): Promise<void> {
    let eventState = await this.eventStateRepository.findOne({
      where: { gameId: game.gameId, eventId: event.eventId },
    });

    if (!eventState) {
      eventState = this.eventStateRepository.create({
        gameId: game.gameId,
        eventId: event.eventId,
        eventType: event.eventType,
        severity: event.severity,
        triggerCount: 0,
        cooldownRemaining: 0,
        isActive: false,
        isCompleted: false,
      });
    }

    eventState.triggerCount += 1;
    eventState.lastTriggeredTurn = game.currentTurn;
    eventState.selectedChoiceId = choiceId;
    eventState.choiceSelectedTurn = game.currentTurn;
    eventState.isActive = false;
    eventState.isCompleted = event.isOneTime || false;

    if (event.triggerCondition?.cooldownTurns) {
      eventState.cooldownRemaining = event.triggerCondition.cooldownTurns;
    }

    await this.eventStateRepository.save(eventState);
  }

  /**
   * Record event to history for analytics
   */
  private async recordEventHistory(
    game: Game,
    event: DynamicEvent,
    choice: any,
    stateBefore: any,
  ): Promise<void> {
    const history = this.eventHistoryRepository.create({
      gameId: game.gameId,
      eventId: event.eventId,
      eventType: event.eventType,
      severity: event.severity,
      turnNumber: game.currentTurn,
      eventTitle: event.title,
      eventDescription: event.description,
      selectedChoiceId: choice.choiceId,
      selectedChoiceText: choice.text,
      usersBefore: stateBefore.users,
      cashBefore: stateBefore.cash,
      trustBefore: stateBefore.trust,
      infrastructureBefore: stateBefore.infrastructure,
      usersAfter: game.users,
      cashAfter: game.cash,
      trustAfter: game.trust,
      infrastructureAfter: game.infrastructure,
      usersDelta: game.users - stateBefore.users,
      cashDelta: game.cash - stateBefore.cash,
      trustDelta: game.trust - stateBefore.trust,
      difficultyMode: game.difficultyMode,
      triggerConditions: event.triggerCondition || {},
      appliedEffects: choice.effect || {},
      metadata: {},
    });

    await this.eventHistoryRepository.save(history);
  }

  /**
   * Initialize event seed for a new game
   */
  initializeEventSeed(game: Game): void {
    if (!game.eventSeed) {
      game.eventSeed = this.secureRandomService.generateSecureInt(2147483647);
    }
  }

  /**
   * Get event history for a game
   */
  async getEventHistory(gameId: string): Promise<EventHistory[]> {
    return this.eventHistoryRepository.find({
      where: { gameId },
      order: { turnNumber: 'ASC' },
    });
  }

  /**
   * Get active event states for a game
   */
  async getActiveEventStates(gameId: string): Promise<EventState[]> {
    return this.eventStateRepository.find({
      where: { gameId, isActive: true },
    });
  }
}
