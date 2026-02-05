import { Test, TestingModule } from '@nestjs/testing';
import { Context7IntegrationService } from './context7-integration.service';

describe('Context7IntegrationService', () => {
  let service: Context7IntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Context7IntegrationService],
    }).compile();

    service = module.get<Context7IntegrationService>(
      Context7IntegrationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize service', async () => {
      await service.onModuleInit();
      expect(service).toBeDefined();
    });

    it('should handle Redis initialization errors gracefully', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('fetchAWSDocumentation', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return fallback documentation when Redis is unavailable', async () => {
      const result = await service.fetchAWSDocumentation('auto-scaling', [
        'EKS',
      ]);

      expect(result).toContain('Auto Scaling');
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should use fallback content for known topics', async () => {
      const result = await service.fetchAWSDocumentation('performance', [
        'CloudFront',
      ]);

      expect(result).toContain('performance optimization');
      expect(result).toContain('CloudFront');
    });

    it('should handle multiple infrastructure contexts', async () => {
      const result = await service.fetchAWSDocumentation('high-availability', [
        'Aurora',
        'ALB',
        'Auto Scaling',
      ]);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return generic fallback for unknown topics', async () => {
      const result = await service.fetchAWSDocumentation(
        'unknown-obscure-topic',
        ['EC2'],
      );

      expect(result).toContain('AWS provides comprehensive cloud services');
      expect(result).toContain('unknown-obscure-topic');
    });

    it('should limit documentation to 1000 characters', async () => {
      const result = await service.fetchAWSDocumentation('database', [
        'Aurora',
        'RDS',
      ]);

      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should track fallback usage in metrics', async () => {
      await service.fetchAWSDocumentation('security', ['VPC']);

      const metrics = service.getMetrics();
      expect(metrics.fallbackUsed).toBeGreaterThan(0);
    });
  });

  describe('getAWSServices', () => {
    it('should map EC2 infrastructure to AWS services', () => {
      const services = service.getAWSServices(['EC2']);

      expect(services).toContain('AWS EC2');
      expect(services).toContain('EC2 instances');
      expect(services).toContain('EC2 pricing');
    });

    it('should map EKS infrastructure to AWS services', () => {
      const services = service.getAWSServices(['EKS']);

      expect(services).toContain('Amazon EKS');
      expect(services).toContain('Kubernetes on AWS');
      expect(services).toContain('EKS architecture');
    });

    it('should map Aurora infrastructure to AWS services', () => {
      const services = service.getAWSServices(['Aurora']);

      expect(services).toContain('Amazon Aurora');
      expect(services).toContain('RDS Aurora');
      expect(services).toContain('Aurora Serverless');
    });

    it('should handle multiple infrastructure contexts', () => {
      const services = service.getAWSServices(['EKS', 'Aurora', 'CloudFront']);

      expect(services.length).toBeGreaterThan(3);
      expect(services).toContain('Amazon EKS');
      expect(services).toContain('Amazon Aurora');
      expect(services).toContain('Amazon CloudFront');
    });

    it('should return empty array for unknown infrastructure', () => {
      const services = service.getAWSServices(['UnknownInfra']);

      expect(services).toEqual([]);
    });

    it('should deduplicate services', () => {
      const services = service.getAWSServices(['Aurora', 'RDS']);

      const uniqueServices = new Set(services);
      expect(services.length).toBe(uniqueServices.size);
    });
  });

  describe('buildQuery', () => {
    it('should build query for single infrastructure', () => {
      const query = service.buildQuery('configure auto-scaling', ['EC2']);

      expect(query).toContain('How to configure auto-scaling with');
      expect(query).toContain('EC2');
      expect(query).toContain('?');
    });

    it('should build query for two services', () => {
      const query = service.buildQuery('setup load balancing', ['ALB', 'EC2']);

      expect(query).toContain('How to setup load balancing with');
      // With 2 infra, we get multiple services, so either 'and' or commas
      expect(query.length).toBeGreaterThan(20);
    });

    it('should build query for multiple services', () => {
      const query = service.buildQuery('optimize performance', [
        'CloudFront',
        'Redis',
        'Aurora',
      ]);

      expect(query).toContain('How to optimize performance with');
      expect(query).toContain('CloudFront');
    });

    it('should handle no infrastructure context', () => {
      const query = service.buildQuery('implement security', []);

      expect(query).toBe('How to implement security?');
    });

    it('should limit services in query to 3', () => {
      const query = service.buildQuery('deploy application', [
        'EC2',
        'EKS',
        'Aurora',
        'ALB',
        'CloudFront',
      ]);

      // Query should not contain all 5 services
      const serviceCount = (query.match(/,/g) || []).length + 1;
      expect(serviceCount).toBeLessThanOrEqual(3);
    });

    it('should handle unknown infrastructure gracefully', () => {
      const query = service.buildQuery('test query', ['UnknownInfra']);

      expect(query).toBe('How to test query?');
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      service.resetMetrics();
    });

    it('should handle cache operations gracefully when Redis unavailable', async () => {
      const result = await service.fetchAWSDocumentation('monitoring', ['CloudFront']);

      expect(result).toBeTruthy();
      expect(result).toContain('CloudWatch');
    });

    it('should track cache misses when Redis unavailable', async () => {
      await service.fetchAWSDocumentation('serverless', ['Lambda']);

      const metrics = service.getMetrics();
      expect(metrics.cacheMisses).toBeGreaterThan(0);
    });

    it('should use fallback gracefully', async () => {
      const result = await service.fetchAWSDocumentation('containers', ['EKS']);

      expect(result).toBeTruthy();
      expect(result).toContain('EKS');
    });

    it('should calculate hit rate from tracked metrics', async () => {
      await service.fetchAWSDocumentation('topic1', ['EC2']);
      await service.fetchAWSDocumentation('topic2', ['EKS']);

      const metrics = service.getMetrics();
      expect(metrics.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('clearCache', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle cache clear when Redis unavailable', async () => {
      await expect(service.clearCache()).resolves.not.toThrow();
    });

    it('should handle no Redis connection gracefully', async () => {
      const serviceWithoutRedis = new Context7IntegrationService();
      await expect(serviceWithoutRedis.clearCache()).resolves.not.toThrow();
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      service.resetMetrics();
    });

    it('should track cache misses when Redis unavailable', async () => {
      await service.fetchAWSDocumentation('test1', ['EC2']);
      await service.fetchAWSDocumentation('test2', ['EKS']);

      const metrics = service.getMetrics();
      expect(metrics.cacheMisses).toBe(2);
    });

    it('should track fallback usage', async () => {
      await service.fetchAWSDocumentation('topic', ['EC2']);

      const metrics = service.getMetrics();
      expect(metrics.fallbackUsed).toBeGreaterThan(0);
    });

    it('should reset metrics correctly', async () => {
      await service.fetchAWSDocumentation('test', ['EC2']);

      let metrics = service.getMetrics();
      expect(metrics.cacheMisses).toBeGreaterThan(0);

      service.resetMetrics();

      metrics = service.getMetrics();
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.mcpCalls).toBe(0);
      expect(metrics.mcpFailures).toBe(0);
      expect(metrics.fallbackUsed).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });

    it('should return metrics copy, not reference', () => {
      const metrics1 = service.getMetrics();
      const metrics2 = service.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });

    it('should track all metric types', async () => {
      await service.fetchAWSDocumentation('test', ['EC2']);

      const metrics = service.getMetrics();
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('mcpCalls');
      expect(metrics).toHaveProperty('mcpFailures');
      expect(metrics).toHaveProperty('fallbackUsed');
      expect(metrics).toHaveProperty('hitRate');
    });
  });

  describe('fallback content', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should provide fallback for auto-scaling topic', async () => {
      const result = await service.fetchAWSDocumentation('auto-scaling', [
        'EC2',
      ]);

      expect(result).toContain('Auto Scaling');
      expect(result).toContain('capacity');
    });

    it('should provide fallback for performance topic', async () => {
      const result = await service.fetchAWSDocumentation('performance', [
        'CloudFront',
      ]);

      expect(result).toContain('performance');
      expect(result).toContain('CloudFront');
    });

    it('should provide fallback for security topic', async () => {
      const result = await service.fetchAWSDocumentation('security', ['VPC']);

      expect(result).toContain('security');
      expect(result).toContain('IAM');
    });

    it('should provide fallback for cost-optimization topic', async () => {
      const result = await service.fetchAWSDocumentation('cost-optimization', [
        'EC2',
      ]);

      expect(result).toContain('cost');
      expect(result).toContain('Reserved Instances');
    });

    it('should provide fallback for high-availability topic', async () => {
      const result = await service.fetchAWSDocumentation('high-availability', [
        'Aurora',
      ]);

      expect(result).toContain('high availability');
      expect(result).toContain('Availability Zones');
    });

    it('should provide fallback for monitoring topic', async () => {
      const result = await service.fetchAWSDocumentation('monitoring', [
        'CloudFront',
      ]);

      expect(result).toContain('CloudWatch');
      expect(result).toContain('monitoring');
    });

    it('should provide fallback for database topic', async () => {
      const result = await service.fetchAWSDocumentation('database', [
        'Aurora',
      ]);

      expect(result).toContain('database');
      expect(result).toContain('Aurora');
    });

    it('should provide fallback for networking topic', async () => {
      const result = await service.fetchAWSDocumentation('networking', ['VPC']);

      expect(result).toContain('VPC');
      expect(result).toContain('networking');
    });

    it('should provide fallback for serverless topic', async () => {
      const result = await service.fetchAWSDocumentation('serverless', [
        'Lambda',
      ]);

      expect(result).toContain('Lambda');
      expect(result).toContain('serverless');
    });

    it('should provide fallback for containers topic', async () => {
      const result = await service.fetchAWSDocumentation('containers', ['EKS']);

      expect(result).toContain('EKS');
      expect(result).toContain('Kubernetes');
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle cleanup gracefully', async () => {
      await service.onModuleInit();
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });

    it('should handle no Redis connection gracefully', async () => {
      const serviceWithoutRedis = new Context7IntegrationService();
      await expect(serviceWithoutRedis.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('infrastructure mapping coverage', () => {
    it('should have mappings for all common AWS services', () => {
      const expectedInfra = [
        'EC2',
        'Aurora',
        'EKS',
        'ALB',
        'CloudFront',
        'Global DB',
        'Redis',
        'Karpenter',
        'S3',
        'Lambda',
        'DynamoDB',
        'RDS',
        'VPC',
        'Auto Scaling',
      ];

      expectedInfra.forEach((infra) => {
        const services = service.getAWSServices([infra]);
        expect(services.length).toBeGreaterThan(0);
      });
    });

    it('should map Global DB correctly', () => {
      const services = service.getAWSServices(['Global DB']);

      expect(services).toContain('Aurora Global Database');
      expect(services).toContain('Multi-region database');
    });

    it('should map Karpenter correctly', () => {
      const services = service.getAWSServices(['Karpenter']);

      expect(services).toContain('Karpenter');
      expect(services).toContain('EKS auto-scaling');
    });
  });
});
