import { Injectable, Logger } from '@nestjs/common';

/**
 * Performance measurement for event operations
 */
interface PerformanceMeasurement {
  operation: string;
  durationMs: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Performance statistics aggregation
 */
export interface PerformanceStats {
  operation: string;
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

/**
 * System performance metrics
 */
export interface SystemMetrics {
  cpuUsagePercent?: number;
  memoryUsageMB: number;
  activeGames: number;
  requestsPerSecond: number;
}

/**
 * Performance monitoring service for event system
 *
 * Tracks and analyzes performance metrics to ensure:
 * - Event check: < 1ms (p95)
 * - Memory usage: < 5MB (50 events)
 * - Concurrent 1000 games: CPU < 35%
 */
@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);

  // Circular buffer for recent measurements (last 10,000 operations)
  private readonly maxMeasurements = 10_000;
  private measurements: Map<string, PerformanceMeasurement[]> = new Map();

  // Real-time metrics tracking
  private activeGames = 0;
  private requestCounter = 0;
  private lastRequestCounterReset = Date.now();

  // Performance targets
  private readonly targets = {
    eventCheckP95Ms: 1.0,
    memoryLimitMB: 5.0,
    cpuLimitPercent: 35.0,
  };

  /**
   * Start performance measurement
   */
  startMeasurement(operation: string): (metadata?: Record<string, any>) => void {
    const startTime = performance.now();

    // Return completion function for convenience
    return (metadata?: Record<string, any>) => {
      this.endMeasurement(operation, startTime, metadata);
    };
  }

  /**
   * End performance measurement
   */
  private endMeasurement(
    operation: string,
    startTime: number,
    metadata?: Record<string, any>
  ): void {
    const endTime = performance.now();
    const durationMs = endTime - startTime;

    const measurement: PerformanceMeasurement = {
      operation,
      durationMs,
      timestamp: new Date(),
      metadata,
    };

    this.recordMeasurement(measurement);

    // Warn if operation exceeds target
    if (operation === 'eventCheck' && durationMs > this.targets.eventCheckP95Ms) {
      this.logger.warn(
        `Event check exceeded target: ${durationMs.toFixed(3)}ms > ${this.targets.eventCheckP95Ms}ms`,
        metadata
      );
    }
  }

  /**
   * Record measurement in circular buffer
   */
  private recordMeasurement(measurement: PerformanceMeasurement): void {
    if (!this.measurements.has(measurement.operation)) {
      this.measurements.set(measurement.operation, []);
    }

    const buffer = this.measurements.get(measurement.operation)!;
    buffer.push(measurement);

    // Maintain circular buffer size
    if (buffer.length > this.maxMeasurements) {
      buffer.shift(); // Remove oldest measurement
    }
  }

  /**
   * Measure async operation with automatic timing
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const complete = this.startMeasurement(operation);

    try {
      const result = await fn();
      complete(metadata);
      return result;
    } catch (error) {
      complete({ ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Measure synchronous operation with automatic timing
   */
  measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const complete = this.startMeasurement(operation);

    try {
      const result = fn();
      complete(metadata);
      return result;
    } catch (error) {
      complete({ ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string): PerformanceStats | null {
    const measurements = this.measurements.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const durations = measurements.map(m => m.durationMs).sort((a, b) => a - b);
    const count = durations.length;
    const totalMs = durations.reduce((sum, d) => sum + d, 0);

    return {
      operation,
      count,
      totalMs,
      avgMs: totalMs / count,
      minMs: durations[0],
      maxMs: durations[count - 1],
      p50Ms: this.percentile(durations, 50),
      p95Ms: this.percentile(durations, 95),
      p99Ms: this.percentile(durations, 99),
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): PerformanceStats[] {
    const stats: PerformanceStats[] = [];

    for (const operation of this.measurements.keys()) {
      const operationStats = this.getStats(operation);
      if (operationStats) {
        stats.push(operationStats);
      }
    }

    return stats.sort((a, b) => b.count - a.count); // Sort by frequency
  }

  /**
   * Track active game count
   */
  incrementActiveGames(): void {
    this.activeGames++;
  }

  /**
   * Decrement active game count
   */
  decrementActiveGames(): void {
    this.activeGames = Math.max(0, this.activeGames - 1);
  }

  /**
   * Track request (for RPS calculation)
   */
  trackRequest(): void {
    this.requestCounter++;
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;

    // Calculate RPS
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRequestCounterReset) / 1000;
    const requestsPerSecond = elapsedSeconds > 0
      ? Math.round(this.requestCounter / elapsedSeconds)
      : 0;

    // Reset counter every minute
    if (elapsedSeconds >= 60) {
      this.requestCounter = 0;
      this.lastRequestCounterReset = now;
    }

    return {
      memoryUsageMB,
      activeGames: this.activeGames,
      requestsPerSecond,
    };
  }

  /**
   * Check if performance meets targets
   */
  checkPerformanceTargets(): {
    passed: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // Check event check p95 target
    const eventCheckStats = this.getStats('eventCheck');
    if (eventCheckStats && eventCheckStats.p95Ms > this.targets.eventCheckP95Ms) {
      violations.push(
        `Event check p95 (${eventCheckStats.p95Ms.toFixed(3)}ms) exceeds target ` +
        `(${this.targets.eventCheckP95Ms}ms)`
      );
    }

    // Check memory target
    const systemMetrics = this.getSystemMetrics();
    if (systemMetrics.memoryUsageMB > this.targets.memoryLimitMB) {
      violations.push(
        `Memory usage (${systemMetrics.memoryUsageMB.toFixed(2)}MB) exceeds target ` +
        `(${this.targets.memoryLimitMB}MB)`
      );
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const allStats = this.getAllStats();
    const systemMetrics = this.getSystemMetrics();
    const targetCheck = this.checkPerformanceTargets();

    let report = '═══════════════════════════════════════════════════\n';
    report += 'Performance Monitoring Report\n';
    report += '═══════════════════════════════════════════════════\n\n';

    // System metrics
    report += 'System Metrics:\n';
    report += `  Memory Usage: ${systemMetrics.memoryUsageMB.toFixed(2)}MB\n`;
    report += `  Active Games: ${systemMetrics.activeGames}\n`;
    report += `  Requests/Second: ${systemMetrics.requestsPerSecond}\n\n`;

    // Performance targets
    report += 'Performance Target Status:\n';
    if (targetCheck.passed) {
      report += '  ✅ All targets met\n';
    } else {
      report += '  ❌ Target violations:\n';
      for (const violation of targetCheck.violations) {
        report += `     - ${violation}\n`;
      }
    }
    report += '\n';

    // Operation statistics
    report += 'Operation Statistics:\n';
    for (const stats of allStats) {
      report += `  ${stats.operation}:\n`;
      report += `    Count: ${stats.count}\n`;
      report += `    Avg: ${stats.avgMs.toFixed(3)}ms\n`;
      report += `    p50: ${stats.p50Ms.toFixed(3)}ms\n`;
      report += `    p95: ${stats.p95Ms.toFixed(3)}ms\n`;
      report += `    p99: ${stats.p99Ms.toFixed(3)}ms\n`;
      report += `    Min: ${stats.minMs.toFixed(3)}ms\n`;
      report += `    Max: ${stats.maxMs.toFixed(3)}ms\n\n`;
    }

    report += '═══════════════════════════════════════════════════\n';

    return report;
  }

  /**
   * Log performance report
   */
  logReport(): void {
    const report = this.generateReport();
    this.logger.log('\n' + report);
  }

  /**
   * Clear all measurements (for testing)
   */
  clearMeasurements(): void {
    this.measurements.clear();
    this.requestCounter = 0;
    this.lastRequestCounterReset = Date.now();
    this.logger.log('Performance measurements cleared');
  }

  /**
   * Get raw measurements for analysis
   */
  getRawMeasurements(operation: string): PerformanceMeasurement[] {
    return this.measurements.get(operation) || [];
  }

  /**
   * Export measurements as JSON
   */
  exportMeasurements(): Record<string, PerformanceMeasurement[]> {
    const exported: Record<string, PerformanceMeasurement[]> = {};

    for (const [operation, measurements] of this.measurements.entries()) {
      exported[operation] = measurements;
    }

    return exported;
  }
}
