import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventCacheService } from './event-cache.service';
import { EventPoolLoaderService } from './event-pool-loader.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { OptimizedEventMatcherService } from './optimized-event-matcher.service';

/**
 * Performance monitoring and health check endpoints
 */
@ApiTags('Performance')
@Controller('performance')
export class PerformanceController {
  private readonly logger = new Logger(PerformanceController.name);

  constructor(
    private readonly eventCache: EventCacheService,
    private readonly eventPoolLoader: EventPoolLoaderService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly eventMatcher: OptimizedEventMatcherService,
  ) {}

  /**
   * Get comprehensive performance metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  getMetrics() {
    return {
      cache: this.eventCache.getPerformanceMetrics(),
      system: this.performanceMonitor.getSystemMetrics(),
      operations: this.performanceMonitor.getAllStats(),
      targets: this.performanceMonitor.checkPerformanceTargets(),
      eventPool: this.eventPoolLoader.getStatistics(),
    };
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check for event system performance' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  getHealth() {
    const eventPoolHealth = this.eventPoolLoader.healthCheck();
    const matcherHealth = this.eventMatcher.getPerformanceHealth();
    const targetCheck = this.performanceMonitor.checkPerformanceTargets();

    const overallStatus =
      eventPoolHealth.status === 'ok' &&
      matcherHealth.status === 'healthy' &&
      targetCheck.passed
        ? 'healthy'
        : eventPoolHealth.status === 'error' || matcherHealth.status === 'critical'
        ? 'critical'
        : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components: {
        eventPool: eventPoolHealth,
        eventMatcher: matcherHealth,
        performanceTargets: targetCheck,
      },
    };
  }

  /**
   * Get detailed performance report
   */
  @Get('report')
  @ApiOperation({ summary: 'Generate detailed performance report' })
  @ApiResponse({ status: 200, description: 'Performance report generated' })
  getReport() {
    const report = this.performanceMonitor.generateReport();
    this.logger.log('Performance report requested');

    return {
      report,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get cache statistics
   */
  @Get('cache')
  @ApiOperation({ summary: 'Get cache performance statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved' })
  getCacheStats() {
    const metrics = this.eventCache.getPerformanceMetrics();

    return {
      ...metrics,
      isWarmed: parseFloat(metrics.hitRate) > 90,
      recommendation:
        parseFloat(metrics.hitRate) < 90
          ? 'Cache may need warmup or reload'
          : 'Cache performance is optimal',
    };
  }

  /**
   * Get event pool statistics
   */
  @Get('event-pool')
  @ApiOperation({ summary: 'Get event pool statistics' })
  @ApiResponse({ status: 200, description: 'Event pool statistics retrieved' })
  getEventPoolStats() {
    const stats = this.eventPoolLoader.getStatistics();
    const isReady = this.eventPoolLoader.isReady();

    return {
      isReady,
      stats,
      message: isReady
        ? 'Event pool is loaded and ready'
        : 'Event pool is not ready yet',
    };
  }

  /**
   * Warmup cache (for maintenance or after reload)
   */
  @Get('warmup')
  @ApiOperation({ summary: 'Warmup event cache with common access patterns' })
  @ApiResponse({ status: 200, description: 'Cache warmup completed' })
  async warmupCache() {
    const start = Date.now();
    await this.eventPoolLoader.warmupCache();
    const duration = Date.now() - start;

    this.logger.log(`Cache warmup completed in ${duration}ms`);

    return {
      success: true,
      durationMs: duration,
      message: 'Cache warmed up successfully',
    };
  }

  /**
   * Check if performance targets are met
   */
  @Get('targets')
  @ApiOperation({ summary: 'Check if performance targets are met' })
  @ApiResponse({ status: 200, description: 'Target check completed' })
  checkTargets() {
    const check = this.performanceMonitor.checkPerformanceTargets();
    const eventCheckStats = this.performanceMonitor.getStats('eventCheck');
    const systemMetrics = this.performanceMonitor.getSystemMetrics();

    return {
      passed: check.passed,
      violations: check.violations,
      targets: {
        eventCheckP95: {
          target: '< 1ms',
          actual: eventCheckStats ? `${eventCheckStats.p95Ms.toFixed(3)}ms` : 'N/A',
          met: eventCheckStats ? eventCheckStats.p95Ms < 1.0 : null,
        },
        memoryUsage: {
          target: '< 5MB',
          actual: `${systemMetrics.memoryUsageMB.toFixed(2)}MB`,
          met: systemMetrics.memoryUsageMB < 5.0,
        },
        cpuUsage: {
          target: '< 35%',
          actual: 'Not available',
          met: null,
        },
      },
    };
  }
}
