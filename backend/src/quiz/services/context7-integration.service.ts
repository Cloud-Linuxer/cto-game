import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Context7IntegrationService
 *
 * AWS 문서를 Context7 MCP 서버에서 가져와 퀴즈 생성을 보강하는 서비스
 *
 * Features:
 * - Infrastructure → AWS Service 매핑
 * - Context7 MCP 통합 (resolve-library-id, query-docs)
 * - Redis 캐싱 (30분 TTL)
 * - Fallback content 지원
 * - 문서 처리 및 포맷팅
 *
 * Epic: EPIC-07 (LLM Quiz System)
 * Task: #12
 */

export interface DocumentationMetrics {
  cacheHits: number;
  cacheMisses: number;
  mcpCalls: number;
  mcpFailures: number;
  fallbackUsed: number;
  hitRate: number;
}

interface CachedDocumentation {
  content: string;
  timestamp: number;
  source: 'mcp' | 'fallback';
}

@Injectable()
export class Context7IntegrationService implements OnModuleInit {
  private readonly logger = new Logger(Context7IntegrationService.name);
  private redis: Redis | null = null;
  private readonly CACHE_TTL_SECONDS = 1800; // 30 minutes
  private metrics: DocumentationMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    mcpCalls: 0,
    mcpFailures: 0,
    fallbackUsed: 0,
    hitRate: 0,
  };

  // Infrastructure to AWS Service mapping
  private readonly infraToServiceMap: Record<string, string[]> = {
    EC2: ['AWS EC2', 'EC2 instances', 'EC2 pricing', 'EC2 auto-scaling'],
    Aurora: [
      'Amazon Aurora',
      'RDS Aurora',
      'Aurora Serverless',
      'Aurora MySQL',
    ],
    EKS: ['Amazon EKS', 'Kubernetes on AWS', 'EKS architecture', 'EKS nodes'],
    ALB: [
      'Application Load Balancer',
      'AWS ALB',
      'ELB',
      'Load balancing',
    ],
    CloudFront: [
      'Amazon CloudFront',
      'CDN',
      'CloudFront configuration',
      'CloudFront caching',
    ],
    'Global DB': [
      'Aurora Global Database',
      'Multi-region database',
      'Global database',
    ],
    Redis: ['Amazon ElastiCache', 'ElastiCache Redis', 'Redis caching'],
    Karpenter: [
      'Karpenter',
      'EKS auto-scaling',
      'Node provisioning',
      'AWS Karpenter',
    ],
    S3: ['Amazon S3', 'S3 bucket', 'Object storage', 'S3 configuration'],
    Lambda: ['AWS Lambda', 'Serverless functions', 'Lambda functions'],
    DynamoDB: [
      'Amazon DynamoDB',
      'DynamoDB tables',
      'NoSQL database',
      'DynamoDB performance',
    ],
    RDS: ['Amazon RDS', 'RDS instances', 'Relational database'],
    VPC: ['Amazon VPC', 'Virtual Private Cloud', 'VPC configuration'],
    'Auto Scaling': [
      'AWS Auto Scaling',
      'Auto Scaling Groups',
      'ASG',
      'EC2 Auto Scaling',
    ],
  };

  // Fallback content for common topics
  private readonly fallbackContent: Record<string, string> = {
    'auto-scaling': `AWS Auto Scaling automatically adjusts compute capacity to maintain performance and optimize costs. It monitors applications and automatically adjusts capacity based on demand patterns. Key features include predictive scaling, dynamic scaling policies, and integration with CloudWatch metrics.`,

    performance: `AWS provides multiple services for performance optimization: CloudFront for content delivery, ElastiCache for caching, Auto Scaling for capacity management, and CloudWatch for monitoring. Best practices include implementing caching strategies, optimizing database queries, and using appropriate instance types.`,

    security: `AWS security follows the shared responsibility model. Key services include IAM for access control, VPC for network isolation, KMS for encryption, and CloudTrail for audit logging. Best practices include least privilege access, encryption at rest and in transit, and regular security audits.`,

    'cost-optimization': `AWS cost optimization strategies include: using Reserved Instances or Savings Plans for predictable workloads, right-sizing instances based on actual usage, implementing auto-scaling to match demand, and leveraging spot instances for flexible workloads. Regular cost monitoring with AWS Cost Explorer is essential.`,

    'high-availability': `AWS high availability architecture uses multiple Availability Zones, load balancing, auto-scaling, and health checks. Services like Aurora provide automatic failover, while Route 53 enables DNS-based failover. Multi-region deployments provide disaster recovery capabilities.`,

    monitoring: `Amazon CloudWatch provides comprehensive monitoring and observability. It collects metrics, logs, and events from AWS resources. Features include custom dashboards, alarms, automatic actions, and integration with other AWS services. CloudWatch Logs Insights enables log analysis and troubleshooting.`,

    database: `AWS offers multiple database services: Aurora for high-performance relational workloads, RDS for managed databases, DynamoDB for NoSQL, and ElastiCache for caching. Choose based on data structure, performance requirements, and scaling needs. Aurora Serverless enables automatic scaling.`,

    networking: `AWS networking services include VPC for isolation, ALB/NLB for load balancing, CloudFront for CDN, and Direct Connect for dedicated connections. Best practices include using private subnets, implementing security groups and NACLs, and enabling VPC Flow Logs for monitoring.`,

    serverless: `AWS serverless architecture uses Lambda for compute, API Gateway for APIs, DynamoDB for database, and S3 for storage. Benefits include automatic scaling, pay-per-use pricing, and reduced operational overhead. Ideal for event-driven workloads and microservices.`,

    containers: `Amazon EKS provides managed Kubernetes, while ECS offers container orchestration. Fargate enables serverless container execution. ECR provides container image registry. Karpenter optimizes node provisioning for EKS. Choose based on orchestration preferences and operational requirements.`,
  };

  async onModuleInit() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed, using in-memory fallback');
            return null;
          }
          return Math.min(times * 100, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected for Context7 documentation cache');
      });
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis: ${error.message}`);
      this.redis = null;
    }
  }

  /**
   * Fetch AWS documentation from Context7 MCP server
   *
   * @param topic - Quiz topic (e.g., "auto-scaling configuration")
   * @param infraContext - Infrastructure context (e.g., ["EKS", "Karpenter"])
   * @returns Documentation content string (max 1000 characters)
   */
  async fetchAWSDocumentation(
    topic: string,
    infraContext: string[],
  ): Promise<string> {
    const cacheKey = this.getCacheKey(topic, infraContext);

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      this.updateHitRate();
      this.logger.debug(
        `Cache hit for documentation: ${topic} [${infraContext.join(', ')}]`,
      );
      return cached.content;
    }

    this.metrics.cacheMisses++;
    this.updateHitRate();

    // Try to fetch from Context7 MCP
    try {
      const docs = await this.fetchFromMCP(topic, infraContext);
      if (docs) {
        // Cache successful response
        await this.saveToCache(cacheKey, docs, 'mcp');
        return docs;
      }
    } catch (error) {
      this.logger.error(`Context7 MCP call failed: ${error.message}`);
      this.metrics.mcpFailures++;
    }

    // Fallback to generic content
    this.metrics.fallbackUsed++;
    const fallbackDocs = this.getFallbackContent(topic);
    await this.saveToCache(cacheKey, fallbackDocs, 'fallback');
    this.logger.warn(
      `Using fallback documentation for topic: ${topic} [${infraContext.join(', ')}]`,
    );
    return fallbackDocs;
  }

  /**
   * Fetch documentation from Context7 MCP server
   *
   * Note: This is a placeholder implementation. In production, this would use
   * the actual MCP client to call mcp__context7__resolve-library-id and
   * mcp__context7__query-docs tools.
   */
  private async fetchFromMCP(
    topic: string,
    infraContext: string[],
  ): Promise<string | null> {
    this.metrics.mcpCalls++;

    // TODO: Implement actual MCP client integration
    // This requires adding the MCP client library to package.json
    //
    // Example implementation:
    // 1. Call mcp__context7__resolve-library-id to find AWS SDK library
    //    const libraryId = await mcpClient.call('mcp__context7__resolve-library-id', {
    //      query: 'AWS SDK',
    //    });
    //
    // 2. Build query based on infrastructure context
    //    const services = infraContext.flatMap(infra => this.infraToServiceMap[infra] || []);
    //    const query = `How to ${topic} with ${services.join(' and ')}?`;
    //
    // 3. Call mcp__context7__query-docs to fetch documentation
    //    const result = await mcpClient.call('mcp__context7__query-docs', {
    //      libraryId,
    //      query,
    //    });
    //
    // 4. Extract and process documentation
    //    return this.processDocumentation(result.documentation);

    // For now, return null to trigger fallback
    // This will be implemented when MCP client is integrated
    this.logger.debug(
      `MCP call would query: "${topic}" with context [${infraContext.join(', ')}]`,
    );
    return null;
  }

  /**
   * Get fallback content for a topic
   */
  private getFallbackContent(topic: string): string {
    const normalizedTopic = topic.toLowerCase().trim();

    // Try to find matching fallback content
    for (const [key, content] of Object.entries(this.fallbackContent)) {
      if (normalizedTopic.includes(key)) {
        return content;
      }
    }

    // Generic fallback
    return `AWS provides comprehensive cloud services for ${topic}. Best practices include implementing proper security controls, monitoring performance metrics, optimizing costs, and ensuring high availability. Consult AWS documentation for specific guidance on your use case.`;
  }

  /**
   * Process and format documentation for LLM consumption
   *
   * @param rawDocs - Raw documentation from Context7
   * @returns Processed documentation (max 1000 characters)
   */
  private processDocumentation(rawDocs: string): string {
    if (!rawDocs) {
      return '';
    }

    // Remove code examples (keep conceptual content)
    let processed = rawDocs.replace(/```[\s\S]*?```/g, '');

    // Remove excessive whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    // Extract relevant sections (architecture patterns, best practices)
    // This is a simple implementation - can be enhanced with more sophisticated parsing
    const sections = processed.split(/\n\n+/);
    const relevantSections = sections.filter(
      (section) =>
        section.toLowerCase().includes('architecture') ||
        section.toLowerCase().includes('best practice') ||
        section.toLowerCase().includes('pattern') ||
        section.toLowerCase().includes('configuration') ||
        section.length > 100, // Keep substantial sections
    );

    processed = relevantSections.join(' ').substring(0, 1000);

    return processed;
  }

  /**
   * Get documentation from cache
   */
  private async getFromCache(
    cacheKey: string,
  ): Promise<CachedDocumentation | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.error(`Cache get error: ${error.message}`);
    }

    return null;
  }

  /**
   * Save documentation to cache
   */
  private async saveToCache(
    cacheKey: string,
    content: string,
    source: 'mcp' | 'fallback',
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const cached: CachedDocumentation = {
        content,
        timestamp: Date.now(),
        source,
      };

      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL_SECONDS,
        JSON.stringify(cached),
      );

      this.logger.debug(
        `Cached documentation (${source}): ${cacheKey}, TTL: ${this.CACHE_TTL_SECONDS}s`,
      );
    } catch (error) {
      this.logger.error(`Cache set error: ${error.message}`);
    }
  }

  /**
   * Generate cache key for documentation
   */
  private getCacheKey(topic: string, infraContext: string[]): string {
    const normalizedTopic = topic.toLowerCase().replace(/\s+/g, '-');
    const normalizedInfra = infraContext
      .map((i) => i.toLowerCase())
      .sort()
      .join(',');
    return `context7:docs:${normalizedInfra}:${normalizedTopic}`;
  }

  /**
   * Get AWS service names from infrastructure context
   */
  getAWSServices(infraContext: string[]): string[] {
    const services = new Set<string>();

    for (const infra of infraContext) {
      const serviceNames = this.infraToServiceMap[infra];
      if (serviceNames) {
        serviceNames.forEach((service) => services.add(service));
      }
    }

    return Array.from(services);
  }

  /**
   * Build query string for Context7
   */
  buildQuery(topic: string, infraContext: string[]): string {
    const services = this.getAWSServices(infraContext);

    if (services.length === 0) {
      return `How to ${topic}?`;
    }

    if (services.length === 1) {
      return `How to ${topic} with ${services[0]}?`;
    }

    const primaryService = services[0];
    const secondaryServices = services.slice(1, 3); // Limit to 3 services max

    if (secondaryServices.length === 1) {
      return `How to ${topic} with ${primaryService} and ${secondaryServices[0]}?`;
    }

    return `How to ${topic} with ${primaryService}, ${secondaryServices.join(', ')}?`;
  }

  /**
   * Clear documentation cache
   */
  async clearCache(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys('context7:docs:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} cached documentation entries`);
      }
    } catch (error) {
      this.logger.error(`Cache clear error: ${error.message}`);
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): DocumentationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      mcpCalls: 0,
      mcpFailures: 0,
      fallbackUsed: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate metric
   */
  private updateHitRate(): void {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.hitRate = total > 0 ? this.metrics.cacheHits / total : 0;
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
