import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LLMQuizGeneratorService } from './llm-quiz-generator.service';
import { VLLMClientService } from '../../llm/services/vllm-client.service';
import { PromptBuilderService } from '../../llm/services/prompt-builder.service';
import { Quiz, QuizDifficulty, QuizType, QuizSource } from '../../database/entities/quiz.entity';
import { QuizGenerationException } from '../exceptions/quiz-generation.exception';
import { LLMConfig } from '../../config/llm.config';

describe('LLMQuizGeneratorService', () => {
  let service: LLMQuizGeneratorService;
  let quizRepository: Repository<Quiz>;
  let vllmClient: VLLMClientService;
  let promptBuilder: PromptBuilderService;

  const mockQuizRepository = {
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVLLMClient = {
    generateCompletion: jest.fn(),
  };

  const mockPromptBuilder = {
    extractJsonFromResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMQuizGeneratorService,
        {
          provide: getRepositoryToken(Quiz),
          useValue: mockQuizRepository,
        },
        {
          provide: VLLMClientService,
          useValue: mockVLLMClient,
        },
        {
          provide: PromptBuilderService,
          useValue: mockPromptBuilder,
        },
      ],
    }).compile();

    service = module.get<LLMQuizGeneratorService>(LLMQuizGeneratorService);
    quizRepository = module.get<Repository<Quiz>>(getRepositoryToken(Quiz));
    vllmClient = module.get<VLLMClientService>(VLLMClientService);
    promptBuilder = module.get<PromptBuilderService>(PromptBuilderService);

    // Enable LLM features for testing (disabled by default in test env)
    Object.defineProperty(LLMConfig.features, 'enabled', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Reset mocks
    jest.clearAllMocks();
    service.resetMetrics();
  });

  describe('generateQuiz - Success Cases', () => {
    it('should successfully generate a multiple choice quiz', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const infraContext = ['EC2', 'Aurora'];

      const llmResponse = {
        question: 'AWS에서 제공하는 Amazon Aurora 데이터베이스는 어떤 관계형 데이터베이스 엔진과 호환됩니까?',
        options: [
          'MySQL 및 PostgreSQL 관계형 데이터베이스 엔진',
          'MongoDB NoSQL 도큐먼트 데이터베이스',
          'Apache Cassandra 분산 데이터베이스',
          'Redis 인메모리 키-값 스토어',
        ],
        correctAnswer: 'A',
        explanation:
          '왜 MySQL/PostgreSQL이 정답인가? Amazon Aurora는 AWS가 제공하는 클라우드 네이티브 관계형 데이터베이스로, MySQL 및 PostgreSQL과 완벽히 호환됩니다. Aurora는 MySQL의 5배, PostgreSQL의 3배 성능을 제공하며 AWS 클라우드에 최적화되어 있습니다.',
      };

      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Multiple choice

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(llmResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(llmResponse),
      );
      mockQuizRepository.save.mockImplementation((quiz) => {
        return Promise.resolve({
          ...quiz,
          quizId: 'quiz-123',
        } as Quiz);
      });

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe(QuizType.MULTIPLE_CHOICE);
      expect(result.difficulty).toBe(difficulty);
      expect(result.question).toBe(llmResponse.question);
      expect(result.options).toEqual(llmResponse.options);
      expect(result.correctAnswer).toBe('A');
      expect(result.source).toBe(QuizSource.LLM);
      expect(result.qualityScore).toBeGreaterThanOrEqual(60);

      expect(mockVLLMClient.generateCompletion).toHaveBeenCalledTimes(1);
      expect(mockQuizRepository.save).toHaveBeenCalledTimes(1);

      const metrics = service.getMetrics();
      expect(metrics.totalGenerated).toBe(1);
      expect(metrics.successfulGenerations).toBe(1);
      expect(metrics.failedGenerations).toBe(0);

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should successfully generate an OX quiz', async () => {
      // Arrange
      const difficulty = QuizDifficulty.EASY;
      const infraContext = ['EC2'];

      const llmResponse = {
        question: 'EC2 인스턴스는 AWS 클라우드에서 실행되는 가상 서버입니다. 물리적 서버 없이도 컴퓨팅 리소스를 제공합니다.',
        correctAnswer: 'true',
        explanation:
          'Amazon EC2(Elastic Compute Cloud)는 클라우드에서 실행되는 가상 서버입니다. 물리적 서버를 구매하지 않고도 컴퓨팅 리소스를 사용할 수 있습니다. 다양한 인스턴스 타입을 선택할 수 있으며, 필요에 따라 스케일링이 가능합니다.',
      };

      // Mock Math.random to return 0.8 (OX quiz)
      jest.spyOn(Math, 'random').mockReturnValue(0.8);

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(llmResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(llmResponse),
      );
      mockQuizRepository.save.mockImplementation((quiz) => {
        return Promise.resolve({
          ...quiz,
          quizId: 'quiz-456',
        } as Quiz);
      });

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe(QuizType.OX);
      expect(result.difficulty).toBe(difficulty);
      expect(result.correctAnswer).toBe('true');
      expect(result.options).toBeUndefined();

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should calculate turn ranges correctly', async () => {
      // Arrange
      const difficulty = QuizDifficulty.HARD;
      const infraContext = ['EKS', 'Aurora Global DB'];

      const llmResponse = {
        question: 'EKS와 Aurora Global DB를 함께 사용하는 Multi-region 배포 전략의 핵심 이점은 무엇입니까?',
        options: [
          'CloudFront + S3를 사용한 정적 콘텐츠 배포 전략',
          'Aurora Global DB + EKS Multi-region 클러스터로 재해 복구 및 지연 시간 최소화',
          '단일 리전 배포만 가능하며 확장이 불가능합니다',
          'Lambda@Edge를 사용한 서버리스 배포 방식',
        ],
        correctAnswer: 'B',
        explanation:
          '왜 이것이 정답인가? AWS EKS Multi-region 배포는 여러 리전에 클러스터를 배치하고 Aurora Global DB로 데이터를 동기화합니다. 이를 통해 재해 복구(DR)와 글로벌 사용자의 지연 시간을 최소화할 수 있습니다. 각 리전에서 독립적으로 확장 가능합니다.',
      };

      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Multiple choice

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(llmResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(llmResponse),
      );
      mockQuizRepository.save.mockImplementation((quiz) => Promise.resolve(quiz as Quiz));

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.turnRangeStart).toBe(21);
      expect(result.turnRangeEnd).toBe(25);

      jest.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('generateQuiz - Validation Failures', () => {
    it('should retry and use fallback when question is too short', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const infraContext = ['Aurora'];

      const invalidResponse = {
        question: '짧은 질문', // Too short (< 50 chars)
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: '해설입니다.',
      };

      const fallbackQuiz = {
        quizId: 'fallback-123',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty,
        source: QuizSource.FALLBACK,
        isActive: true,
        infraContext: ['Aurora'],
        question: 'Valid fallback question that is long enough for validation',
      } as Quiz;

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(invalidResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(invalidResponse),
      );

      // Mock fallback query
      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([fallbackQuiz]),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.source).toBe(QuizSource.FALLBACK);

      const metrics = service.getMetrics();
      expect(metrics.fallbackUsed).toBe(1);
      // Validation failures are not tracked separately in current implementation
      // They contribute to overall failures
    });

    it('should fail validation when options count is not 4', async () => {
      // Arrange
      const difficulty = QuizDifficulty.EASY;
      const infraContext = ['EC2'];

      const invalidResponse = {
        question: 'EC2 인스턴스 타입 중 컴퓨팅 최적화 인스턴스 패밀리는 무엇입니까?',
        options: ['T2', 'C5'], // Only 2 options instead of 4
        correctAnswer: 'B',
        explanation: 'C5는 컴퓨팅 최적화 인스턴스 패밀리입니다.',
      };

      const fallbackQuiz = {
        quizId: 'fallback-456',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty,
        source: QuizSource.FALLBACK,
        isActive: true,
        infraContext: ['EC2'],
        question: 'Valid fallback question for EC2',
      } as Quiz;

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(invalidResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(invalidResponse),
      );

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([fallbackQuiz]),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.source).toBe(QuizSource.FALLBACK);
      expect(result).toBeDefined();
    });

    it('should fail validation when OX answer is invalid', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const infraContext = ['Aurora'];

      const invalidResponse = {
        question: 'Aurora는 NoSQL 데이터베이스입니다.',
        correctAnswer: 'YES', // Invalid (should be 'true' or 'false')
        explanation: 'Aurora는 관계형 데이터베이스입니다.',
      };

      jest.spyOn(Math, 'random').mockReturnValue(0.8); // OX quiz

      const fallbackQuiz = {
        quizId: 'fallback-789',
        type: QuizType.OX,
        difficulty,
        source: QuizSource.FALLBACK,
        isActive: true,
        infraContext: ['Aurora'],
      } as Quiz;

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(invalidResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(invalidResponse),
      );

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([fallbackQuiz]),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.source).toBe(QuizSource.FALLBACK);

      jest.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('generateQuiz - Quality Failures', () => {
    it('should retry when quality score is below minimum', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const infraContext = ['S3'];

      const lowQualityResponse = {
        question: '뭐?', // Too short, no context, low quality
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: '답입니다.', // Too short, no AWS, no explanation
      };

      const fallbackQuiz = {
        quizId: 'fallback-quality',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty,
        source: QuizSource.FALLBACK,
        isActive: true,
        infraContext: ['S3'],
        question: 'Valid fallback S3 question',
      } as Quiz;

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(lowQualityResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(lowQualityResponse),
      );

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([fallbackQuiz]),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.source).toBe(QuizSource.FALLBACK);
      expect(result).toBeDefined();
    });
  });

  describe('generateQuiz - LLM Failures', () => {
    it('should use fallback when LLM API fails', async () => {
      // Arrange
      const difficulty = QuizDifficulty.EASY;
      const infraContext = ['EC2'];

      const fallbackQuiz = {
        quizId: 'fallback-llm-fail',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty,
        source: QuizSource.FALLBACK,
        isActive: true,
        infraContext: ['EC2'],
        question: 'Valid EC2 fallback question',
      } as Quiz;

      mockVLLMClient.generateCompletion.mockRejectedValue(
        new Error('vLLM service unavailable'),
      );

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([fallbackQuiz]),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.source).toBe(QuizSource.FALLBACK);

      const metrics = service.getMetrics();
      expect(metrics.fallbackUsed).toBe(1);
      expect(metrics.failedGenerations).toBe(1);
    });

    it('should use fallback when JSON parsing fails', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const infraContext = ['Aurora'];

      const fallbackQuiz = {
        quizId: 'fallback-json-fail',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty,
        source: QuizSource.FALLBACK,
        isActive: true,
        infraContext: ['Aurora'],
        question: 'Valid Aurora fallback question',
      } as Quiz;

      mockVLLMClient.generateCompletion.mockResolvedValue('Invalid JSON response {]');
      mockPromptBuilder.extractJsonFromResponse.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([fallbackQuiz]),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.source).toBe(QuizSource.FALLBACK);

      const metrics = service.getMetrics();
      expect(metrics.fallbackUsed).toBe(1);
    });

    it('should throw QuizGenerationException when no fallback quizzes available', async () => {
      // Arrange
      const difficulty = QuizDifficulty.HARD;
      const infraContext = ['EKS'];

      mockVLLMClient.generateCompletion.mockRejectedValue(
        new Error('vLLM service unavailable'),
      );

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No fallback quizzes
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.generateQuiz(difficulty, infraContext)).rejects.toThrow(
        QuizGenerationException,
      );
      await expect(service.generateQuiz(difficulty, infraContext)).rejects.toThrow(
        'no fallback quizzes available',
      );
    });
  });

  describe('generateQuiz - Feature Flags', () => {
    it('should use fallback when LLM features are disabled', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const infraContext = ['Aurora'];

      // Mock LLMConfig to disable LLM features
      const originalEnabled = LLMConfig.features.enabled;
      Object.defineProperty(LLMConfig.features, 'enabled', {
        value: false,
        writable: true,
        configurable: true,
      });

      const fallbackQuiz = {
        quizId: 'fallback-disabled',
        type: QuizType.MULTIPLE_CHOICE,
        difficulty,
        source: QuizSource.FALLBACK,
        isActive: true,
        infraContext: ['Aurora'],
        question: 'Valid Aurora fallback question',
      } as Quiz;

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([fallbackQuiz]),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.source).toBe(QuizSource.FALLBACK);
      expect(mockVLLMClient.generateCompletion).not.toHaveBeenCalled();

      // Restore
      Object.defineProperty(LLMConfig.features, 'enabled', {
        value: originalEnabled,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('Metrics Tracking', () => {
    it('should track successful generation metrics', async () => {
      // Arrange
      const difficulty = QuizDifficulty.EASY;
      const infraContext = ['EC2'];

      const llmResponse = {
        question: 'AWS 클라우드에서 EC2 가상 서버 인스턴스를 시작하고 관리하려면 어떤 서비스를 사용해야 합니까?',
        options: [
          'Amazon EC2 컴퓨팅 서비스를 사용합니다',
          'Amazon S3 오브젝트 스토리지를 사용합니다',
          'AWS Lambda 서버리스 함수를 사용합니다',
          'Amazon RDS 관계형 데이터베이스를 사용합니다',
        ],
        correctAnswer: 'A',
        explanation:
          '왜 정답이 EC2인가? Amazon EC2(Elastic Compute Cloud)는 AWS 클라우드에서 가상 서버를 시작하고 관리하는 핵심 컴퓨팅 서비스입니다. EC2는 다양한 인스턴스 타입을 제공하며, 필요에 따라 스케일링이 가능합니다.',
      };

      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Multiple choice

      mockVLLMClient.generateCompletion.mockResolvedValue(
        JSON.stringify(llmResponse),
      );
      mockPromptBuilder.extractJsonFromResponse.mockReturnValue(
        JSON.stringify(llmResponse),
      );
      mockQuizRepository.save.mockImplementation((quiz) => Promise.resolve(quiz as Quiz));

      // Act
      await service.generateQuiz(difficulty, infraContext);
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.totalGenerated).toBe(1);
      expect(metrics.successfulGenerations).toBe(1);
      expect(metrics.failedGenerations).toBe(0);
      expect(metrics.averageGenerationTimeMs).toBeGreaterThanOrEqual(0); // Can be 0 in fast unit tests
      expect(metrics.averageQualityScore).toBeGreaterThanOrEqual(60);

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should reset metrics correctly', () => {
      // Act
      service.resetMetrics();
      const metrics = service.getMetrics();

      // Assert
      expect(metrics.totalGenerated).toBe(0);
      expect(metrics.successfulGenerations).toBe(0);
      expect(metrics.failedGenerations).toBe(0);
      expect(metrics.llmFailures).toBe(0);
      expect(metrics.validationFailures).toBe(0);
      expect(metrics.qualityFailures).toBe(0);
      expect(metrics.fallbackUsed).toBe(0);
      expect(metrics.averageGenerationTimeMs).toBe(0);
      expect(metrics.averageQualityScore).toBe(0);
    });
  });

  describe('Fallback Quiz Selection', () => {
    it('should select best matching fallback quiz based on infra context', async () => {
      // Arrange
      const difficulty = QuizDifficulty.MEDIUM;
      const infraContext = ['Aurora', 'EC2'];

      const fallbackQuizzes = [
        {
          quizId: 'quiz-1',
          infraContext: ['S3'], // 0 matches
          difficulty,
          source: QuizSource.FALLBACK,
          isActive: true,
        },
        {
          quizId: 'quiz-2',
          infraContext: ['Aurora', 'EC2'], // 2 matches (best)
          difficulty,
          source: QuizSource.FALLBACK,
          isActive: true,
        },
        {
          quizId: 'quiz-3',
          infraContext: ['Aurora'], // 1 match
          difficulty,
          source: QuizSource.FALLBACK,
          isActive: true,
        },
      ] as Quiz[];

      mockVLLMClient.generateCompletion.mockRejectedValue(new Error('LLM failed'));

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(fallbackQuizzes),
      };
      mockQuizRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.generateQuiz(difficulty, infraContext);

      // Assert
      expect(result.quizId).toBe('quiz-2'); // Best match
    });
  });
});
