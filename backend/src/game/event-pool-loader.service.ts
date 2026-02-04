import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventCacheService } from './event-cache.service';

/**
 * Event pool statistics for monitoring
 */
export interface EventPoolStats {
  totalChoices: number;
  totalTurns: number;
  investmentChoices: number;
  infraUpgradeChoices: number;
  staffHiringChoices: number;
  consultingChoices: number;
  avgChoicesPerTurn: number;
  maxChoicesPerTurn: number;
  minChoicesPerTurn: number;
  loadTimeMs: number;
}

/**
 * Preloads all event data on app startup for instant access
 *
 * This service ensures all event data is loaded and indexed before
 * the application starts accepting requests, eliminating cold start latency.
 */
@Injectable()
export class EventPoolLoaderService implements OnModuleInit {
  private readonly logger = new Logger(EventPoolLoaderService.name);
  private isLoaded = false;
  private stats: EventPoolStats | null = null;

  constructor(private readonly eventCache: EventCacheService) {}

  /**
   * Load event pool on module initialization
   */
  async onModuleInit() {
    const startTime = Date.now();
    this.logger.log('Loading event pool...');

    try {
      // EventCacheService already loads data in its onModuleInit
      // This service just validates and computes statistics
      await this.validateEventPool();
      await this.computeStatistics();

      const loadTime = Date.now() - startTime;
      this.isLoaded = true;

      this.logger.log(
        `Event pool loaded successfully in ${loadTime}ms - ` +
        `${this.stats!.totalChoices} choices across ${this.stats!.totalTurns} turns`
      );

      this.logDetailedStats();
    } catch (error) {
      this.logger.error('Failed to load event pool', error);
      throw error;
    }
  }

  /**
   * Validate that event pool is properly loaded
   */
  private async validateEventPool(): Promise<void> {
    const errors: string[] = [];

    // Check that we have data
    const turn1Choices = this.eventCache.getChoicesForTurn(1);
    if (turn1Choices.length === 0) {
      errors.push('No choices found for turn 1');
    }

    const turn1Info = this.eventCache.getTurn(1);
    if (!turn1Info) {
      errors.push('Turn 1 information not found');
    }

    // Validate choice references
    const sampleChoice = this.eventCache.getChoice(1);
    if (!sampleChoice) {
      errors.push('Choice ID 1 not found in cache');
    }

    // Check for orphaned choices (choices without valid turn)
    let orphanedChoices = 0;
    for (let choiceId = 1; choiceId <= 300; choiceId++) {
      const choice = this.eventCache.getChoice(choiceId);
      if (choice) {
        const turn = this.eventCache.getTurn(choice.turnNumber);
        if (!turn) {
          orphanedChoices++;
          this.logger.warn(
            `Orphaned choice detected: choiceId=${choiceId}, turnNumber=${choice.turnNumber}`
          );
        }
      }
    }

    if (orphanedChoices > 0) {
      errors.push(`Found ${orphanedChoices} orphaned choices`);
    }

    if (errors.length > 0) {
      throw new Error(`Event pool validation failed:\n${errors.join('\n')}`);
    }

    this.logger.log('Event pool validation passed');
  }

  /**
   * Compute statistics about the event pool
   */
  private async computeStatistics(): Promise<void> {
    let totalChoices = 0;
    let totalTurns = 0;
    let investmentChoices = 0;
    let infraUpgradeChoices = 0;
    let staffHiringChoices = 0;
    let consultingChoices = 0;
    let maxChoicesPerTurn = 0;
    let minChoicesPerTurn = Number.MAX_SAFE_INTEGER;
    let totalChoicesAcrossTurns = 0;

    // Scan all turns (assuming max 50 turns)
    for (let turnNumber = 1; turnNumber <= 50; turnNumber++) {
      const turn = this.eventCache.getTurn(turnNumber);
      if (!turn) continue;

      totalTurns++;
      const choices = this.eventCache.getChoicesForTurn(turnNumber);
      const choiceCount = choices.length;

      if (choiceCount > 0) {
        totalChoicesAcrossTurns += choiceCount;
        maxChoicesPerTurn = Math.max(maxChoicesPerTurn, choiceCount);
        minChoicesPerTurn = Math.min(minChoicesPerTurn, choiceCount);
      }

      // Count by type
      for (const choice of choices) {
        totalChoices++;

        if (this.eventCache.isInvestmentChoice(choice.choiceId)) {
          investmentChoices++;
        }
        if (this.eventCache.hasInfraUpgrade(choice.choiceId)) {
          infraUpgradeChoices++;
        }
        if (this.eventCache.isStaffHiringChoice(choice.choiceId)) {
          staffHiringChoices++;
        }
        if (this.eventCache.isConsultingChoice(choice.choiceId)) {
          consultingChoices++;
        }
      }
    }

    const avgChoicesPerTurn = totalTurns > 0
      ? Math.round((totalChoicesAcrossTurns / totalTurns) * 100) / 100
      : 0;

    this.stats = {
      totalChoices,
      totalTurns,
      investmentChoices,
      infraUpgradeChoices,
      staffHiringChoices,
      consultingChoices,
      avgChoicesPerTurn,
      maxChoicesPerTurn: maxChoicesPerTurn === 0 ? 0 : maxChoicesPerTurn,
      minChoicesPerTurn: minChoicesPerTurn === Number.MAX_SAFE_INTEGER ? 0 : minChoicesPerTurn,
      loadTimeMs: 0, // Will be set by onModuleInit
    };
  }

  /**
   * Log detailed statistics
   */
  private logDetailedStats(): void {
    if (!this.stats) return;

    this.logger.log('═══════════════════════════════════════════════════');
    this.logger.log('Event Pool Statistics:');
    this.logger.log(`  Total Choices: ${this.stats.totalChoices}`);
    this.logger.log(`  Total Turns: ${this.stats.totalTurns}`);
    this.logger.log(`  Avg Choices/Turn: ${this.stats.avgChoicesPerTurn}`);
    this.logger.log(`  Max Choices/Turn: ${this.stats.maxChoicesPerTurn}`);
    this.logger.log(`  Min Choices/Turn: ${this.stats.minChoicesPerTurn}`);
    this.logger.log('');
    this.logger.log('Choice Type Breakdown:');
    this.logger.log(`  Investment: ${this.stats.investmentChoices} ` +
      `(${this.getPercentage(this.stats.investmentChoices, this.stats.totalChoices)}%)`);
    this.logger.log(`  Infrastructure Upgrades: ${this.stats.infraUpgradeChoices} ` +
      `(${this.getPercentage(this.stats.infraUpgradeChoices, this.stats.totalChoices)}%)`);
    this.logger.log(`  Staff Hiring: ${this.stats.staffHiringChoices} ` +
      `(${this.getPercentage(this.stats.staffHiringChoices, this.stats.totalChoices)}%)`);
    this.logger.log(`  Consulting: ${this.stats.consultingChoices} ` +
      `(${this.getPercentage(this.stats.consultingChoices, this.stats.totalChoices)}%)`);
    this.logger.log('═══════════════════════════════════════════════════');
  }

  /**
   * Calculate percentage
   */
  private getPercentage(part: number, total: number): string {
    if (total === 0) return '0.00';
    return ((part / total) * 100).toFixed(2);
  }

  /**
   * Check if event pool is loaded and ready
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get event pool statistics
   */
  getStatistics(): EventPoolStats | null {
    return this.stats;
  }

  /**
   * Warmup cache with common access patterns
   * This preloads frequently accessed data to ensure optimal performance
   */
  async warmupCache(): Promise<void> {
    if (!this.isLoaded) {
      throw new Error('Event pool not loaded yet');
    }

    const startTime = Date.now();
    this.logger.log('Warming up cache with common access patterns...');

    // Access first 25 turns (most common gameplay scenario)
    for (let turn = 1; turn <= 25; turn++) {
      this.eventCache.getTurn(turn);
      this.eventCache.getChoicesForTurn(turn);
      this.eventCache.getHighImpactChoices(turn, 5);
    }

    // Access common special choices
    const commonChoiceIds = [1, 2, 3, 10, 20, 30, 40, 50]; // Example common choices
    for (const choiceId of commonChoiceIds) {
      this.eventCache.getChoice(choiceId);
    }

    const warmupTime = Date.now() - startTime;
    this.logger.log(`Cache warmup completed in ${warmupTime}ms`);
  }

  /**
   * Health check for event pool
   */
  healthCheck(): { status: 'ok' | 'error'; details: any } {
    try {
      if (!this.isLoaded) {
        return {
          status: 'error',
          details: { message: 'Event pool not loaded' },
        };
      }

      if (!this.stats) {
        return {
          status: 'error',
          details: { message: 'Event pool statistics not computed' },
        };
      }

      const cacheMetrics = this.eventCache.getPerformanceMetrics();

      return {
        status: 'ok',
        details: {
          isLoaded: this.isLoaded,
          stats: this.stats,
          cacheMetrics,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
