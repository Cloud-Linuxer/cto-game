import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Choice } from '../database/entities/choice.entity';
import { Turn } from '../database/entities/turn.entity';

/**
 * Event cache entry with pre-computed indexes
 */
interface CachedChoice {
  choiceId: number;
  turnNumber: number;
  text: string;
  effects: {
    users: number;
    cash: number;
    trust: number;
    infra: string[];
  };
  nextTurn: number;
  // Pre-computed metadata for O(1) filtering
  metadata: {
    isInvestment: boolean;
    isInfraUpgrade: boolean;
    isStaffHiring: boolean;
    isConsulting: boolean;
    effectMagnitude: number; // Sum of abs(users + cash + trust) for sorting
    infraTags: Set<string>; // Quick lookup for infrastructure requirements
  };
}

interface CachedTurn {
  turnId: number;
  turnNumber: number;
  eventText: string;
  description: string;
  choiceIds: number[]; // Pre-computed list of choice IDs for this turn
}

/**
 * High-performance event caching service with O(1) lookups
 *
 * Performance targets:
 * - Event check: < 1ms (p95)
 * - Memory usage: < 5MB (50 events)
 * - Concurrent 1000 games: CPU < 35%
 */
@Injectable()
export class EventCacheService implements OnModuleInit {
  private readonly logger = new Logger(EventCacheService.name);

  // Primary indexes (all O(1) lookup)
  private choiceById: Map<number, CachedChoice> = new Map();
  private choicesByTurn: Map<number, CachedChoice[]> = new Map();
  private turnByNumber: Map<number, CachedTurn> = new Map();

  // Secondary indexes for advanced filtering
  private investmentChoices: Set<number> = new Set();
  private infraUpgradeChoices: Set<number> = new Set();
  private staffHiringChoices: Set<number> = new Set();
  private consultingChoices: Set<number> = new Set();

  // Performance metrics
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalLookups = 0;

  constructor(
    @InjectRepository(Choice)
    private readonly choiceRepository: Repository<Choice>,
    @InjectRepository(Turn)
    private readonly turnRepository: Repository<Turn>,
  ) {}

  /**
   * Load all events into memory on app startup
   */
  async onModuleInit() {
    const startTime = Date.now();
    this.logger.log('Initializing event cache...');

    try {
      await this.loadAllChoices();
      await this.loadAllTurns();

      const loadTime = Date.now() - startTime;
      const memoryUsage = this.estimateMemoryUsage();

      this.logger.log(
        `Event cache initialized: ${this.choiceById.size} choices, ` +
        `${this.turnByNumber.size} turns loaded in ${loadTime}ms, ` +
        `estimated memory: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`
      );
    } catch (error) {
      this.logger.error('Failed to initialize event cache', error);
      throw error;
    }
  }

  /**
   * Load all choices with pre-computed metadata
   */
  private async loadAllChoices(): Promise<void> {
    const choices = await this.choiceRepository.find();

    for (const choice of choices) {
      const cached = this.createCachedChoice(choice);

      // Primary index
      this.choiceById.set(choice.choiceId, cached);

      // Turn-based index
      if (!this.choicesByTurn.has(choice.turnNumber)) {
        this.choicesByTurn.set(choice.turnNumber, []);
      }
      this.choicesByTurn.get(choice.turnNumber)!.push(cached);

      // Secondary indexes
      if (cached.metadata.isInvestment) {
        this.investmentChoices.add(choice.choiceId);
      }
      if (cached.metadata.isInfraUpgrade) {
        this.infraUpgradeChoices.add(choice.choiceId);
      }
      if (cached.metadata.isStaffHiring) {
        this.staffHiringChoices.add(choice.choiceId);
      }
      if (cached.metadata.isConsulting) {
        this.consultingChoices.add(choice.choiceId);
      }
    }

    // Sort choices within each turn by effect magnitude (descending)
    for (const [turn, choices] of this.choicesByTurn.entries()) {
      choices.sort((a, b) => b.metadata.effectMagnitude - a.metadata.effectMagnitude);
    }
  }

  /**
   * Load all turns with choice ID lists
   */
  private async loadAllTurns(): Promise<void> {
    const turns = await this.turnRepository.find();

    for (const turn of turns) {
      const choicesForTurn = this.choicesByTurn.get(turn.turnNumber) || [];

      this.turnByNumber.set(turn.turnNumber, {
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        eventText: turn.eventText,
        description: turn.description,
        choiceIds: choicesForTurn.map(c => c.choiceId),
      });
    }
  }

  /**
   * Create cached choice with pre-computed metadata
   */
  private createCachedChoice(choice: Choice): CachedChoice {
    const text = choice.text.toLowerCase();

    return {
      choiceId: choice.choiceId,
      turnNumber: choice.turnNumber,
      text: choice.text,
      effects: choice.effects,
      nextTurn: choice.nextTurn,
      metadata: {
        isInvestment: this.detectInvestment(text, choice.effects.cash),
        isInfraUpgrade: choice.effects.infra.length > 0,
        isStaffHiring: this.detectStaffHiring(text),
        isConsulting: text.includes('컨설팅') || text.includes('솔루션 아키텍트'),
        effectMagnitude: Math.abs(choice.effects.users) +
                         Math.abs(choice.effects.cash) +
                         Math.abs(choice.effects.trust),
        infraTags: new Set(choice.effects.infra),
      },
    };
  }

  /**
   * Detect investment choices
   */
  private detectInvestment(text: string, cashEffect: number): boolean {
    if (cashEffect < 1_000_000) return false; // Investment threshold
    return text.includes('투자') ||
           text.includes('펀딩') ||
           text.includes('시리즈') ||
           text.includes('피칭');
  }

  /**
   * Detect staff hiring choices
   */
  private detectStaffHiring(text: string): boolean {
    return (text.includes('채용') || text.includes('영입')) &&
           (text.includes('개발자') || text.includes('디자이너') || text.includes('기획자'));
  }

  // -------------------------------------------------------------------------
  // Public API - O(1) lookups
  // -------------------------------------------------------------------------

  /**
   * Get choice by ID (O(1))
   */
  getChoice(choiceId: number): CachedChoice | undefined {
    this.totalLookups++;
    const result = this.choiceById.get(choiceId);

    if (result) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }

    return result;
  }

  /**
   * Get all choices for a turn (O(1))
   */
  getChoicesForTurn(turnNumber: number): CachedChoice[] {
    this.totalLookups++;
    const result = this.choicesByTurn.get(turnNumber);

    if (result) {
      this.cacheHits++;
      return result;
    } else {
      this.cacheMisses++;
      return [];
    }
  }

  /**
   * Get turn information (O(1))
   */
  getTurn(turnNumber: number): CachedTurn | undefined {
    this.totalLookups++;
    const result = this.turnByNumber.get(turnNumber);

    if (result) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }

    return result;
  }

  /**
   * Check if choice is investment (O(1))
   */
  isInvestmentChoice(choiceId: number): boolean {
    return this.investmentChoices.has(choiceId);
  }

  /**
   * Check if choice has infrastructure upgrade (O(1))
   */
  hasInfraUpgrade(choiceId: number): boolean {
    return this.infraUpgradeChoices.has(choiceId);
  }

  /**
   * Check if choice is staff hiring (O(1))
   */
  isStaffHiringChoice(choiceId: number): boolean {
    return this.staffHiringChoices.has(choiceId);
  }

  /**
   * Check if choice is consulting (O(1))
   */
  isConsultingChoice(choiceId: number): boolean {
    return this.consultingChoices.has(choiceId);
  }

  /**
   * Get choices requiring specific infrastructure (O(n) where n = choices for turn)
   * Uses early exit optimization
   */
  getChoicesRequiringInfra(turnNumber: number, infraTag: string): CachedChoice[] {
    const choices = this.getChoicesForTurn(turnNumber);
    const results: CachedChoice[] = [];

    // Early exit optimization
    for (const choice of choices) {
      if (choice.metadata.infraTags.has(infraTag)) {
        results.push(choice);
      }

      // Early exit if we found enough choices (max 6 per turn)
      if (results.length >= 6) break;
    }

    return results;
  }

  /**
   * Get high-impact choices for turn (pre-sorted by magnitude)
   */
  getHighImpactChoices(turnNumber: number, limit: number = 3): CachedChoice[] {
    const choices = this.getChoicesForTurn(turnNumber);
    return choices.slice(0, limit); // Already sorted by effectMagnitude
  }

  // -------------------------------------------------------------------------
  // Performance monitoring
  // -------------------------------------------------------------------------

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics() {
    const hitRate = this.totalLookups > 0
      ? ((this.cacheHits / this.totalLookups) * 100).toFixed(2)
      : '0.00';

    return {
      totalLookups: this.totalLookups,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: `${hitRate}%`,
      cachedChoices: this.choiceById.size,
      cachedTurns: this.turnByNumber.size,
      estimatedMemoryMB: (this.estimateMemoryUsage() / 1024 / 1024).toFixed(2),
    };
  }

  /**
   * Estimate memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    // Rough estimation based on data structure sizes
    const choiceMemory = this.choiceById.size * 500; // ~500 bytes per cached choice
    const turnMemory = this.turnByNumber.size * 200; // ~200 bytes per cached turn
    const indexMemory = (
      this.investmentChoices.size +
      this.infraUpgradeChoices.size +
      this.staffHiringChoices.size +
      this.consultingChoices.size
    ) * 8; // 8 bytes per Set entry (number)

    return choiceMemory + turnMemory + indexMemory;
  }

  /**
   * Log performance metrics (for monitoring)
   */
  logPerformanceMetrics(): void {
    const metrics = this.getPerformanceMetrics();
    this.logger.log(
      `Cache performance: ${metrics.hitRate} hit rate, ` +
      `${metrics.totalLookups} lookups, ` +
      `${metrics.estimatedMemoryMB}MB memory`
    );
  }

  /**
   * Clear cache (for testing or hot reload)
   */
  clearCache(): void {
    this.choiceById.clear();
    this.choicesByTurn.clear();
    this.turnByNumber.clear();
    this.investmentChoices.clear();
    this.infraUpgradeChoices.clear();
    this.staffHiringChoices.clear();
    this.consultingChoices.clear();

    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalLookups = 0;

    this.logger.log('Cache cleared');
  }

  /**
   * Reload cache (for data updates)
   */
  async reloadCache(): Promise<void> {
    this.clearCache();
    await this.onModuleInit();
  }
}
