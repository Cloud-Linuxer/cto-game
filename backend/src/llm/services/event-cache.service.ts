import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMConfig } from '../../config/llm.config';
import { LLMGeneratedEvent } from '../dto/llm-response.dto';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  hitRate: number;
}

@Injectable()
export class EventCacheService implements OnModuleInit {
  private readonly logger = new Logger(EventCacheService.name);
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, { event: LLMGeneratedEvent; expiresAt: number }> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    hitRate: 0,
  };

  async onModuleInit() {
    try {
      // Try to connect to Redis, but don't fail if not available
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed, cache disabled');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
        this.redis = null; // Disable cache on error
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected, event cache enabled');
      });
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis: ${error.message}`);
      this.redis = null;
    }
  }

  async get(gameState: any): Promise<LLMGeneratedEvent | null> {
    const key = this.getCacheKey(gameState);

    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(key);

        if (cached) {
          this.metrics.hits++;
          this.updateHitRate();
          this.logger.debug(`Cache hit (Redis) for key: ${key}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.error(`Redis get error: ${error.message}`);
        // Fall through to in-memory cache
      }
    }

    // Fallback to in-memory cache
    const cached = this.inMemoryCache.get(key);
    if (cached) {
      // Check expiration
      if (Date.now() < cached.expiresAt) {
        this.metrics.hits++;
        this.updateHitRate();
        this.logger.debug(`Cache hit (in-memory) for key: ${key}`);
        return cached.event;
      } else {
        // Expired, remove from cache
        this.inMemoryCache.delete(key);
      }
    }

    this.metrics.misses++;
    this.updateHitRate();
    this.logger.debug(`Cache miss for key: ${key}`);
    return null;
  }

  async set(gameState: any, event: LLMGeneratedEvent): Promise<void> {
    const key = this.getCacheKey(gameState);
    const ttl = LLMConfig.cache.ttlSeconds;

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(event));
        this.metrics.sets++;
        this.logger.debug(`Cached event (Redis) for key: ${key}, TTL: ${ttl}s`);
        return;
      } catch (error) {
        this.logger.error(`Redis set error: ${error.message}`);
        // Fall through to in-memory cache
      }
    }

    // Fallback to in-memory cache
    const expiresAt = Date.now() + ttl * 1000;
    this.inMemoryCache.set(key, { event, expiresAt });
    this.metrics.sets++;
    this.logger.debug(`Cached event (in-memory) for key: ${key}, TTL: ${ttl}s`);

    // Limit in-memory cache size to prevent memory leak
    if (this.inMemoryCache.size > LLMConfig.cache.maxSize) {
      // Remove oldest entries (simple LRU)
      const keysToDelete = Array.from(this.inMemoryCache.keys()).slice(0, 100);
      keysToDelete.forEach((k) => this.inMemoryCache.delete(k));
      this.logger.debug(`Evicted ${keysToDelete.length} entries from in-memory cache`);
    }
  }

  async clear(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys('event:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} cached events`);
      }
    } catch (error) {
      this.logger.error(`Cache clear error: ${error.message}`);
    }
  }

  private getCacheKey(gameState: any): string {
    // Normalize game state into buckets for better hit rate
    const turnBucket = Math.floor(gameState.currentTurn / 5); // 0-4, 5-9, 10-14, etc.
    const cashTier = this.getCashTier(gameState.cash);
    const userTier = this.getUserTier(gameState.users);
    const trustTier = this.getTrustTier(gameState.trust);

    return `event:${turnBucket}:${cashTier}:${userTier}:${trustTier}`;
  }

  private getCashTier(cash: number): string {
    if (cash < 0) return 'negative';
    if (cash < 50000000) return 'low'; // < 50M
    if (cash < 200000000) return 'medium'; // 50M-200M
    if (cash < 1000000000) return 'high'; // 200M-1B
    return 'very-high'; // > 1B
  }

  private getUserTier(users: number): string {
    if (users < 1000) return 'startup'; // < 1K
    if (users < 10000) return 'growth'; // 1K-10K
    if (users < 100000) return 'scale'; // 10K-100K
    if (users < 1000000) return 'large'; // 100K-1M
    return 'massive'; // > 1M
  }

  private getTrustTier(trust: number): string {
    if (trust < 30) return 'critical'; // < 30
    if (trust < 50) return 'low'; // 30-50
    if (trust < 70) return 'medium'; // 50-70
    if (trust < 90) return 'high'; // 70-90
    return 'excellent'; // 90+
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      hitRate: 0,
    };
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
