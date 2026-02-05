import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LLMEventGeneratorService } from './services/llm-event-generator.service';
import { EventCacheService } from './services/event-cache.service';
import { LLMConfig } from '../config/llm.config';

/**
 * LLM Metrics API
 *
 * EPIC-06 Feature 4: 모니터링 및 알람 설정
 *
 * 제공하는 메트릭:
 * - 생성 메트릭 (총 생성 수, 성공/실패율, 평균 생성 시간)
 * - 캐시 메트릭 (hit rate, hits, misses, sets)
 * - 품질 메트릭 (평균 품질 점수, 등급 분포) - 추후 확장
 * - 시스템 상태 (vLLM, Redis, LLM 기능 활성화 여부)
 */
@ApiTags('LLM Monitoring')
@Controller('api/llm')
export class LLMController {
  private readonly logger = new Logger(LLMController.name);

  constructor(
    private readonly llmGenerator: LLMEventGeneratorService,
    private readonly eventCache: EventCacheService,
  ) {}

  /**
   * GET /api/llm/metrics
   *
   * LLM 시스템의 전체 메트릭 조회
   */
  @Get('metrics')
  @ApiOperation({ summary: 'LLM 시스템 메트릭 조회' })
  @ApiResponse({
    status: 200,
    description: 'LLM 메트릭 정보',
    schema: {
      type: 'object',
      properties: {
        generation: {
          type: 'object',
          properties: {
            totalGenerated: { type: 'number', description: '총 생성된 이벤트 수' },
            successfulValidations: { type: 'number', description: '검증 성공 수' },
            failedValidations: { type: 'number', description: '검증 실패 수' },
            llmFailures: { type: 'number', description: 'LLM 호출 실패 수' },
            averageGenerationTimeMs: { type: 'number', description: '평균 생성 시간 (ms)' },
            successRate: { type: 'number', description: '성공률 (0-1)' },
            failureRate: { type: 'number', description: '실패율 (0-1)' },
          },
        },
        cache: {
          type: 'object',
          properties: {
            hits: { type: 'number', description: '캐시 히트 수' },
            misses: { type: 'number', description: '캐시 미스 수' },
            sets: { type: 'number', description: '캐시 저장 수' },
            hitRate: { type: 'number', description: '캐시 히트율 (0-1)' },
          },
        },
        system: {
          type: 'object',
          properties: {
            llmEnabled: { type: 'boolean', description: 'LLM 기능 활성화 여부' },
            vllmEndpoint: { type: 'string', description: 'vLLM 엔드포인트' },
            cacheMaxSize: { type: 'number', description: '캐시 최대 크기' },
            cacheTTL: { type: 'number', description: '캐시 TTL (초)' },
          },
        },
        timestamp: { type: 'string', description: '메트릭 수집 시각' },
      },
    },
  })
  getMetrics() {
    try {
      // LLM Generator 메트릭
      const genMetrics = this.llmGenerator.getMetrics();

      // Cache 메트릭
      const cacheMetrics = this.eventCache.getMetrics();

      // 성공률 및 실패율 계산
      const totalAttempts = genMetrics.totalGenerated;
      const successRate = totalAttempts > 0 ? genMetrics.successfulValidations / totalAttempts : 0;
      const failureRate =
        totalAttempts > 0 ? (genMetrics.failedValidations + genMetrics.llmFailures) / totalAttempts : 0;

      const metrics = {
        generation: {
          totalGenerated: genMetrics.totalGenerated,
          successfulValidations: genMetrics.successfulValidations,
          failedValidations: genMetrics.failedValidations,
          llmFailures: genMetrics.llmFailures,
          averageGenerationTimeMs: Math.round(genMetrics.averageGenerationTimeMs),
          successRate: Math.round(successRate * 1000) / 1000, // 소수점 3자리
          failureRate: Math.round(failureRate * 1000) / 1000,
        },
        cache: {
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses,
          sets: cacheMetrics.sets,
          hitRate: Math.round(cacheMetrics.hitRate * 1000) / 1000,
        },
        system: {
          llmEnabled: LLMConfig.features.enabled,
          vllmEndpoint: LLMConfig.vllm.endpoint,
          cacheMaxSize: LLMConfig.cache.maxSize,
          cacheTTL: LLMConfig.cache.ttlSeconds,
        },
        timestamp: new Date().toISOString(),
      };

      this.logger.log('Metrics retrieved successfully');
      return metrics;
    } catch (error) {
      this.logger.error(`Failed to retrieve metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/llm/health
   *
   * LLM 시스템 헬스 체크
   */
  @Get('health')
  @ApiOperation({ summary: 'LLM 시스템 헬스 체크' })
  @ApiResponse({
    status: 200,
    description: 'LLM 시스템 상태',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        checks: {
          type: 'object',
          properties: {
            llmEnabled: { type: 'boolean' },
            recentFailureRate: { type: 'number' },
            cacheHitRate: { type: 'number' },
            averageLatency: { type: 'number' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  getHealth() {
    try {
      const genMetrics = this.llmGenerator.getMetrics();
      const cacheMetrics = this.eventCache.getMetrics();

      const totalAttempts = genMetrics.totalGenerated;
      const failureRate =
        totalAttempts > 0 ? (genMetrics.failedValidations + genMetrics.llmFailures) / totalAttempts : 0;

      // Health status 판정
      let status: 'healthy' | 'degraded' | 'unhealthy';

      if (!LLMConfig.features.enabled) {
        status = 'degraded'; // LLM 비활성화
      } else if (failureRate > 0.1) {
        // 실패율 >10%
        status = 'unhealthy';
      } else if (cacheMetrics.hitRate < 0.4 || genMetrics.averageGenerationTimeMs > 3000) {
        // 캐시 히트율 <40% 또는 평균 응답 시간 >3s
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      const health = {
        status,
        checks: {
          llmEnabled: LLMConfig.features.enabled,
          recentFailureRate: Math.round(failureRate * 1000) / 1000,
          cacheHitRate: Math.round(cacheMetrics.hitRate * 1000) / 1000,
          averageLatency: Math.round(genMetrics.averageGenerationTimeMs),
        },
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`Health check: ${status}`);
      return health;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        checks: {
          llmEnabled: false,
          recentFailureRate: 1.0,
          cacheHitRate: 0,
          averageLatency: 0,
        },
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * GET /api/llm/config
   *
   * LLM 시스템 설정 조회 (디버깅용)
   */
  @Get('config')
  @ApiOperation({ summary: 'LLM 시스템 설정 조회' })
  @ApiResponse({
    status: 200,
    description: 'LLM 시스템 설정',
    schema: {
      type: 'object',
      properties: {
        vllm: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            timeoutMs: { type: 'number' },
            maxRetries: { type: 'number' },
            modelName: { type: 'string' },
          },
        },
        cache: {
          type: 'object',
          properties: {
            ttlSeconds: { type: 'number' },
            maxSize: { type: 'number' },
          },
        },
        features: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            triggerRate: { type: 'number' },
          },
        },
      },
    },
  })
  getConfig() {
    this.logger.log('Config retrieved');
    return {
      vllm: {
        endpoint: LLMConfig.vllm.endpoint,
        timeoutMs: LLMConfig.vllm.timeoutMs,
        maxRetries: LLMConfig.vllm.maxRetries,
        modelName: LLMConfig.vllm.modelName,
      },
      cache: {
        ttlSeconds: LLMConfig.cache.ttlSeconds,
        maxSize: LLMConfig.cache.maxSize,
      },
      features: {
        enabled: LLMConfig.features.enabled,
        triggerRate: LLMConfig.features.triggerRate,
      },
    };
  }
}
