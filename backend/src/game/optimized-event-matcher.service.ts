import { Injectable, Logger } from '@nestjs/common';
import { EventCacheService } from './event-cache.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { Game } from '../database/entities/game.entity';

/**
 * Event matching criteria for intelligent filtering
 */
interface EventMatchCriteria {
  turnNumber: number;
  gameState?: {
    users?: number;
    cash?: number;
    trust?: number;
    infrastructure?: string[];
    hasConsultingEffect?: boolean;
  };
  filters?: {
    includeInvestment?: boolean;
    includeInfraUpgrade?: boolean;
    includeStaffHiring?: boolean;
    includeConsulting?: boolean;
    minEffectMagnitude?: number;
  };
}

/**
 * Matched event result with metadata
 */
interface MatchedEvent {
  choiceId: number;
  text: string;
  effects: {
    users: number;
    cash: number;
    trust: number;
    infra: string[];
  };
  nextTurn: number;
  score: number; // Relevance score for sorting
  reason?: string; // Why this event matched
}

/**
 * Optimized event matcher with O(1) lookups and early exit patterns
 *
 * Performance optimization strategies:
 * 1. Use EventCacheService for O(1) indexed lookups
 * 2. Apply early exit when conditions are not met
 * 3. Filter by pre-computed metadata before expensive checks
 * 4. Lazy evaluation of complex conditions
 * 5. Batch operations where possible
 */
@Injectable()
export class OptimizedEventMatcherService {
  private readonly logger = new Logger(OptimizedEventMatcherService.name);

  constructor(
    private readonly eventCache: EventCacheService,
    private readonly performanceMonitor: PerformanceMonitorService,
  ) {}

  /**
   * Get valid choices for current game state with performance tracking
   */
  getValidChoices(game: Game): MatchedEvent[] {
    return this.performanceMonitor.measureSync(
      'eventCheck',
      () => this._getValidChoicesOptimized(game),
      { turnNumber: game.currentTurn, users: game.users }
    );
  }

  /**
   * Internal optimized implementation with early exits
   */
  private _getValidChoicesOptimized(game: Game): MatchedEvent[] {
    // Early exit: invalid turn number
    if (game.currentTurn < 1 || game.currentTurn > 50) {
      return [];
    }

    // O(1) lookup for turn choices
    const choices = this.eventCache.getChoicesForTurn(game.currentTurn);

    // Early exit: no choices available
    if (choices.length === 0) {
      return [];
    }

    const results: MatchedEvent[] = [];

    // Filter with early exits
    for (const choice of choices) {
      // Early exit: skip if doesn't meet basic criteria
      if (!this.meetsBasicCriteria(choice, game)) {
        continue; // Skip to next iteration immediately
      }

      const score = this.calculateRelevanceScore(choice, game);

      results.push({
        choiceId: choice.choiceId,
        text: choice.text,
        effects: choice.effects,
        nextTurn: choice.nextTurn,
        score,
      });

      // Early exit: limit results to reasonable number (max 6 per turn)
      if (results.length >= 6) {
        break;
      }
    }

    // Sort by relevance score (descending)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Check basic criteria with early exits
   */
  private meetsBasicCriteria(
    choice: { choiceId: number; metadata: any },
    game: Game
  ): boolean {
    // Investment choices require minimum trust (early exit optimization)
    if (this.eventCache.isInvestmentChoice(choice.choiceId)) {
      if (game.trust < 30) {
        return false; // Early exit
      }
    }

    // Infrastructure upgrades require cash (early exit)
    if (this.eventCache.hasInfraUpgrade(choice.choiceId)) {
      if (game.cash < 500_000) {
        return false; // Early exit
      }
    }

    // Staff hiring requires cash and turn > 3 (early exit)
    if (this.eventCache.isStaffHiringChoice(choice.choiceId)) {
      if (game.cash < 1_000_000 || game.currentTurn < 3) {
        return false; // Early exit
      }
    }

    return true; // Passed all checks
  }

  /**
   * Calculate relevance score for intelligent sorting
   * Higher score = more relevant to current game state
   */
  private calculateRelevanceScore(
    choice: { effects: any; metadata: any },
    game: Game
  ): number {
    let score = 100; // Base score

    // Boost investment choices if cash is low
    if (game.cash < 5_000_000) {
      if (choice.effects.cash > 1_000_000) {
        score += 50;
      }
    }

    // Boost infrastructure if near capacity
    const capacityRatio = game.maxUserCapacity > 0
      ? game.users / game.maxUserCapacity
      : 0;

    if (capacityRatio > 0.7) {
      if (choice.effects.infra.length > 0) {
        score += 40;
      }
    }

    // Boost trust recovery if trust is low
    if (game.trust < 50) {
      if (choice.effects.trust > 0) {
        score += 30;
      }
    }

    // Add effect magnitude bonus
    score += choice.metadata.effectMagnitude / 1000;

    return score;
  }

  /**
   * Match events with custom criteria (advanced filtering)
   */
  matchEvents(criteria: EventMatchCriteria): MatchedEvent[] {
    return this.performanceMonitor.measureSync(
      'eventMatch',
      () => this._matchEventsOptimized(criteria),
      { turnNumber: criteria.turnNumber }
    );
  }

  /**
   * Internal optimized event matching
   */
  private _matchEventsOptimized(criteria: EventMatchCriteria): MatchedEvent[] {
    // O(1) lookup
    const choices = this.eventCache.getChoicesForTurn(criteria.turnNumber);

    // Early exit: no choices
    if (choices.length === 0) {
      return [];
    }

    const results: MatchedEvent[] = [];

    for (const choice of choices) {
      // Early exit: apply filters
      if (criteria.filters) {
        // Type filters with early exits
        if (criteria.filters.includeInvestment === false &&
            this.eventCache.isInvestmentChoice(choice.choiceId)) {
          continue; // Skip
        }

        if (criteria.filters.includeInfraUpgrade === false &&
            this.eventCache.hasInfraUpgrade(choice.choiceId)) {
          continue; // Skip
        }

        if (criteria.filters.includeStaffHiring === false &&
            this.eventCache.isStaffHiringChoice(choice.choiceId)) {
          continue; // Skip
        }

        if (criteria.filters.includeConsulting === false &&
            this.eventCache.isConsultingChoice(choice.choiceId)) {
          continue; // Skip
        }

        // Magnitude filter (early exit)
        if (criteria.filters.minEffectMagnitude !== undefined) {
          if (choice.metadata.effectMagnitude < criteria.filters.minEffectMagnitude) {
            continue; // Skip
          }
        }
      }

      results.push({
        choiceId: choice.choiceId,
        text: choice.text,
        effects: choice.effects,
        nextTurn: choice.nextTurn,
        score: choice.metadata.effectMagnitude,
      });
    }

    return results;
  }

  /**
   * Get high-priority events (fast path for common use case)
   */
  getHighPriorityEvents(turnNumber: number, limit: number = 3): MatchedEvent[] {
    return this.performanceMonitor.measureSync(
      'highPriorityEvents',
      () => {
        // O(1) lookup, already sorted by magnitude
        const choices = this.eventCache.getHighImpactChoices(turnNumber, limit);

        return choices.map(choice => ({
          choiceId: choice.choiceId,
          text: choice.text,
          effects: choice.effects,
          nextTurn: choice.nextTurn,
          score: choice.metadata.effectMagnitude,
          reason: 'High impact',
        }));
      },
      { turnNumber, limit }
    );
  }

  /**
   * Check if specific choice is valid for game state (O(1) check)
   */
  isChoiceValid(choiceId: number, game: Game): boolean {
    return this.performanceMonitor.measureSync(
      'choiceValidation',
      () => {
        // O(1) lookup
        const choice = this.eventCache.getChoice(choiceId);

        // Early exit: choice not found
        if (!choice) {
          return false;
        }

        // Early exit: wrong turn
        if (choice.turnNumber !== game.currentTurn) {
          return false;
        }

        // Apply basic criteria with early exits
        return this.meetsBasicCriteria(choice, game);
      },
      { choiceId, turnNumber: game.currentTurn }
    );
  }

  /**
   * Batch validation (optimized for multiple choices)
   */
  validateChoices(choiceIds: number[], game: Game): Map<number, boolean> {
    return this.performanceMonitor.measureSync(
      'batchValidation',
      () => {
        const results = new Map<number, boolean>();

        for (const choiceId of choiceIds) {
          // Early exit per choice
          const choice = this.eventCache.getChoice(choiceId);

          if (!choice || choice.turnNumber !== game.currentTurn) {
            results.set(choiceId, false);
            continue; // Next choice
          }

          results.set(choiceId, this.meetsBasicCriteria(choice, game));
        }

        return results;
      },
      { choiceCount: choiceIds.length }
    );
  }

  /**
   * Get recommended choices based on game state analysis
   */
  getRecommendedChoices(game: Game, count: number = 3): MatchedEvent[] {
    return this.performanceMonitor.measureSync(
      'recommendedChoices',
      () => {
        const validChoices = this._getValidChoicesOptimized(game);

        // Already sorted by relevance score
        return validChoices.slice(0, count);
      },
      { turnNumber: game.currentTurn, count }
    );
  }

  /**
   * Performance health check
   */
  getPerformanceHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    details: any;
  } {
    const stats = this.performanceMonitor.getStats('eventCheck');
    const targetCheck = this.performanceMonitor.checkPerformanceTargets();

    if (!stats) {
      return {
        status: 'healthy',
        details: { message: 'No measurements yet' },
      };
    }

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (stats.p95Ms > 1.0 && stats.p95Ms <= 2.0) {
      status = 'degraded';
    } else if (stats.p95Ms > 2.0) {
      status = 'critical';
    }

    return {
      status,
      details: {
        eventCheckP95Ms: stats.p95Ms,
        targetMet: targetCheck.passed,
        violations: targetCheck.violations,
        systemMetrics: this.performanceMonitor.getSystemMetrics(),
      },
    };
  }
}
