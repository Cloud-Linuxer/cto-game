import { Test, TestingModule } from '@nestjs/testing';
import { QuizValidatorService } from './quiz-validator.service';
import { Quiz, QuizType, QuizDifficulty } from '../../database/entities/quiz.entity';

describe('QuizValidatorService', () => {
  let service: QuizValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuizValidatorService],
    }).compile();

    service = module.get<QuizValidatorService>(QuizValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Stage 1: Structure Validation', () => {
    describe('Question Validation', () => {
      it('should pass with valid question', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'EC2 인스턴스에서 Auto Scaling을 구성할 때 가장 중요하게 고려해야 할 지표는 무엇인가요?',
          options: [
            'CPU 사용률을 모니터링합니다',
            '네트워크 트래픽을 측정합니다',
            '디스크 입출력을 확인합니다',
            '메모리 사용률을 관찰합니다',
          ],
          correctAnswer: 'A',
          explanation:
            'CPU 사용률은 Auto Scaling의 가장 기본적인 지표입니다. 대부분의 웹 애플리케이션에서 CPU가 높아지면 스케일 아웃을 통해 부하를 분산시켜야 합니다. CloudWatch를 통해 CPU 임계값을 설정하고 자동으로 인스턴스를 추가하거나 제거할 수 있으며, 이는 성능과 비용 효율성을 동시에 달성하는 권장 방법입니다.',
        };

        const result = await service.validate(quiz);
        if (!result.isValid) {
          console.log('Validation errors:', result.errors);
          console.log('Validation warnings:', result.warnings);
        }
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail if question is missing', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('질문'))).toBe(true);
      });

      it('should fail if question is too short', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question: 'EC2란?', // 너무 짧음 (50자 미만)
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('질문 길이') && e.includes('범위')),
        ).toBe(true);
      });

      it('should fail if question is too long', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question: 'A'.repeat(301), // 300자 초과
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('질문 길이') && e.includes('범위')),
        ).toBe(true);
      });

      it('should fail if question contains HTML tags', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            '<script>alert("XSS")</script> EC2 인스턴스의 주요 기능은 무엇인가요?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('HTML 태그') || e.includes('스크립트'))).toBe(
          true,
        );
      });

      it('should fail if question contains script injection', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'javascript:void(0) EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('스크립트'))).toBe(true);
      });

      it('should fail if question is only whitespace', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question: '   \n\t   ',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('비어있거나 공백'))).toBe(true);
      });
    });

    describe('Options Validation (MULTIPLE_CHOICE)', () => {
      it('should pass with exactly 4 valid options', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question:
            'Aurora는 어떤 AWS 서비스의 관리형 버전인가요? 이것은 충분히 긴 질문입니다.',
          options: [
            'MySQL 및 PostgreSQL',
            'MongoDB',
            'Redis',
            'Cassandra',
          ],
          correctAnswer: 'A',
          explanation:
            'Aurora는 MySQL과 PostgreSQL 호환 관계형 데이터베이스입니다. ' +
            'AWS에서 개발한 클라우드 최적화 엔진으로 뛰어난 성능과 가용성을 제공합니다. ' +
            'Multi-AZ 복제와 자동 백업 기능을 기본 제공합니다.',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(true);
      });

      it('should fail if options array is missing for MULTIPLE_CHOICE', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('선택지') && e.includes('누락'))).toBe(
          true,
        );
      });

      it('should fail if options count is not exactly 4', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['Option A', 'Option B', 'Option C'], // 3개만
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('정확히 4개'))).toBe(true);
      });

      it('should fail if any option is empty', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['Option A', '', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('선택지') && e.includes('비어있'))).toBe(
          true,
        );
      });

      it('should fail if options are too short', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['A', 'B', 'C', 'D'], // 5자 미만
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('선택지') && e.includes('길이')),
        ).toBe(true);
      });

      it('should fail if options are too long', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: [
            'A'.repeat(101), // 100자 초과
            'Option B',
            'Option C',
            'Option D',
          ],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('선택지') && e.includes('길이')),
        ).toBe(true);
      });

      it('should fail if options have duplicates', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: [
            'Option A',
            'Option B',
            'Option A', // 중복
            'Option D',
          ],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('중복'))).toBe(true);
      });
    });

    describe('Correct Answer Validation', () => {
      it('should pass with valid correctAnswer for MULTIPLE_CHOICE', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'B',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(true);
      });

      it('should pass with valid correctAnswer for OX quiz', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.OX,
          question:
            'Aurora는 MySQL과 호환되는 관계형 데이터베이스인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'true',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(true);
      });

      it('should fail if correctAnswer is missing', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('정답') && e.includes('누락'))).toBe(
          true,
        );
      });

      it('should fail if correctAnswer is invalid for MULTIPLE_CHOICE', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question:
            'EC2 인스턴스의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'E', // 잘못된 정답
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('정답')),
        ).toBe(true);
      });

      it('should fail if correctAnswer is invalid for OX quiz', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.OX,
          question:
            'Aurora는 MySQL과 호환되는 관계형 데이터베이스인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'yes', // 잘못된 정답 (true/false만 허용)
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('true') && e.includes('false')),
        ).toBe(true);
      });
    });

    describe('Explanation Validation', () => {
      it('should pass with valid explanation', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.OX,
          question:
            'Aurora는 MySQL과 호환되는 관계형 데이터베이스인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'true',
          explanation:
            'Aurora는 MySQL 및 PostgreSQL과 호환되는 완전 관리형 관계형 데이터베이스입니다. ' +
            'AWS에서 개발한 클라우드 네이티브 엔진으로 기존 MySQL보다 최대 5배 빠른 성능을 제공합니다.',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(true);
      });

      it('should fail if explanation is missing', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.OX,
          question:
            'Aurora는 MySQL과 호환되는 관계형 데이터베이스인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'true',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('설명') && e.includes('누락'))).toBe(
          true,
        );
      });

      it('should fail if explanation is too short', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.OX,
          question:
            'Aurora는 MySQL과 호환되는 관계형 데이터베이스인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'true',
          explanation: '맞습니다.', // 100자 미만
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('설명 길이') && e.includes('범위')),
        ).toBe(true);
      });

      it('should fail if explanation is too long', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.OX,
          question:
            'Aurora는 MySQL과 호환되는 관계형 데이터베이스인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'true',
          explanation: 'A'.repeat(501), // 500자 초과
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('설명 길이') && e.includes('범위')),
        ).toBe(true);
      });

      it('should fail if explanation contains HTML tags', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.OX,
          question:
            'Aurora는 MySQL과 호환되는 관계형 데이터베이스인가요? 이것은 충분히 긴 질문입니다.',
          correctAnswer: 'true',
          explanation:
            '<b>Aurora</b>는 MySQL과 호환됩니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('HTML 태그'))).toBe(true);
      });
    });
  });

  describe('Stage 2: Balance Validation', () => {
    describe('Difficulty Validation', () => {
      it('should pass with valid difficulty', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question: 'EC2는 무엇의 약자인가요? 이것은 충분히 긴 질문입니다. 추가로 더 길게 작성합니다.',
          options: [
            'Elastic Compute Cloud',
            'Elastic Container Cloud',
            'Elastic Cache Cloud',
            'Elastic Control Cloud',
          ],
          correctAnswer: 'A',
          explanation:
            'EC2는 Elastic Compute Cloud의 약자로, AWS의 대표적인 컴퓨팅 서비스입니다. ' +
            '가상 서버를 클라우드에서 실행할 수 있게 해주며, 필요에 따라 용량을 탄력적으로 조절할 수 있습니다.',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(true);
      });

      it('should warn if difficulty is missing', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          question: 'EC2의 주요 기능은 무엇인가요? 이것은 충분히 긴 질문입니다. 추가로 더 길게 작성합니다.',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        // difficulty는 선택사항이므로 경고만
        expect(result.warnings.some((w) => w.includes('난이도'))).toBe(true);
      });
    });

    describe('Option Balance Validation', () => {
      it('should warn if option lengths are unbalanced', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'EC2 인스턴스를 선택할 때 고려해야 할 요소는? 이것은 충분히 긴 질문입니다.',
          options: [
            'CPU, 메모리, 네트워크 성능, 스토리지 타입, 가격, 사용 사례에 맞는 인스턴스 패밀리 선택', // 매우 긴 선택지
            'CPU',
            '메모리',
            '네트워크',
          ],
          correctAnswer: 'A',
          explanation:
            'EC2 인스턴스 선택 시 CPU, 메모리, 네트워크, 스토리지 등을 종합적으로 고려해야 합니다. ' +
            '워크로드 특성에 맞는 인스턴스 타입을 선택하는 것이 비용 효율성과 성능에 중요합니다.',
        };

        const result = await service.validate(quiz);
        // 길이 불균형은 경고
        expect(
          result.warnings.some((w) => w.includes('선택지 길이') && w.includes('편차')),
        ).toBe(true);
      });

      it('should warn if correct answer is obviously longest', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'Auto Scaling의 주요 이점은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: [
            '자동으로 인스턴스 개수를 조절하여 비용을 절감하고 성능을 최적화하며 가용성을 높일 수 있습니다', // 정답이 매우 긺
            '비용 절감',
            '성능 향상',
            '보안 강화',
          ],
          correctAnswer: 'A',
          explanation:
            'Auto Scaling은 트래픽에 따라 자동으로 EC2 인스턴스를 추가하거나 제거합니다. ' +
            '이를 통해 비용 효율성과 애플리케이션 가용성을 동시에 달성할 수 있습니다.',
        };

        const result = await service.validate(quiz);
        expect(
          result.warnings.some((w) => w.includes('정답') && w.includes('현저히')),
        ).toBe(true);
      });

      it('should warn if correct answer has obvious keyword', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'RDS의 백업 정책으로 항상 권장되는 것은? 이것은 충분히 긴 질문입니다.',
          options: [
            '항상 자동 백업을 활성화하고 Multi-AZ를 사용합니다', // "항상" 키워드
            '수동 백업만 사용',
            '백업 비활성화',
            '주간 백업',
          ],
          correctAnswer: 'A',
          explanation:
            'RDS는 자동 백업과 Multi-AZ 구성을 통해 데이터 손실을 방지하고 고가용성을 제공합니다. ' +
            'Production 환경에서는 반드시 자동 백업을 활성화하고 Multi-AZ를 사용하는 것이 권장됩니다.',
        };

        const result = await service.validate(quiz);
        // 명백한 키워드는 경고
        expect(
          result.warnings.some((w) => w.includes('명백한 키워드')),
        ).toBe(true);
      });
    });

    describe('Difficulty Complexity Matching', () => {
      it('should warn if EASY quiz is too complex', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.EASY,
          question:
            'Multi-Region Aurora Global DB 환경에서 Cross-Region Replication 지연을 최소화하기 위한 DR 전략과 고가용성 아키텍처 설계 시 고려해야 할 성능 최적화 방법은?',
          options: [
            'Read Replica와 Write Forwarding 최적화',
            'Single Region 사용',
            'Cache만 사용',
            'Manual Failover',
          ],
          correctAnswer: 'A',
          explanation:
            'Multi-Region 환경에서 Aurora Global DB는 Read Replica와 Write Forwarding을 통해 지연을 최소화합니다. ' +
            'DR 계획에는 RPO/RTO 목표를 정의하고 자동 Failover 메커니즘을 구성해야 합니다.',
        };

        const result = await service.validate(quiz);
        expect(
          result.warnings.some((w) => w.includes('EASY') && w.includes('복잡')),
        ).toBe(true);
      });

      it('should warn if HARD quiz is too simple', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.HARD,
          question: 'EC2는 무엇인가요? 이것은 충분히 긴 질문입니다. 추가로 더 길게 작성합니다.',
          options: [
            '가상 서버 서비스',
            '스토리지 서비스',
            '데이터베이스 서비스',
            '네트워크 서비스',
          ],
          correctAnswer: 'A',
          explanation:
            'EC2는 Elastic Compute Cloud의 약자로 AWS의 가상 서버 서비스입니다. ' +
            '클라우드에서 컴퓨팅 리소스를 쉽게 확보하고 관리할 수 있게 해줍니다.',
        };

        const result = await service.validate(quiz);
        expect(
          result.warnings.some((w) => w.includes('HARD') && w.includes('단순')),
        ).toBe(true);
      });
    });
  });

  describe('Stage 3: Content Quality Validation', () => {
    describe('Korean Language Validation', () => {
      it('should pass with primarily Korean text (>50%)', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            '오로라 데이터베이스는 뮤에스큐엘과 호환되나요? 이것은 충분히 긴 질문입니다.',
          options: [
            '네, 완전히 호환됩니다',
            '아니요, 호환되지 않습니다',
            '부분적으로만 호환됩니다',
            '특수 설정이 필요합니다',
          ],
          correctAnswer: 'A',
          explanation:
            '오로라는 뮤에스큐엘 및 포스트그레에스큐엘과 완전히 호환되는 관계형 데이터베이스입니다. ' +
            '기존 애플리케이션을 수정 없이 바로 사용할 수 있으며 성능은 최대 다섯 배 빠릅니다.',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(true);
      });

      it('should fail if Korean ratio is too low (<50%)', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'What is the primary benefit of using Aurora over standard MySQL database engine solution?',
          options: [
            'Better performance',
            'Lower cost',
            'Easier setup',
            'More features',
          ],
          correctAnswer: 'A',
          explanation:
            'Aurora provides up to 5x better performance than standard MySQL with automatic scaling and high availability features built-in for cloud-native applications.',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('한국어 비율'))).toBe(true);
      });
    });

    describe('AWS Terminology Validation', () => {
      it('should warn about incorrect AWS terminology', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'ec2 server에서 사용할 수 있는 amazon aurora 데이터베이스의 주요 장점은 무엇인가요?',
          options: [
            '높은 성능과 가용성',
            '저렴한 비용',
            '쉬운 설정',
            '다양한 기능',
          ],
          correctAnswer: 'A',
          explanation:
            'amazon aurora는 기존 MySQL보다 최대 5배 빠른 성능을 제공합니다. ' +
            '자동 확장과 높은 가용성 기능이 내장되어 있어 클라우드 네이티브 애플리케이션에 최적화되어 있습니다.',
        };

        const result = await service.validate(quiz);
        // AWS 용어 오류는 경고
        expect(result.warnings.some((w) => w.includes('AWS 용어'))).toBe(true);
      });
    });

    describe('Educational Value Validation', () => {
      it('should fail if explanation just repeats the question', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'Aurora 데이터베이스의 주요 장점은 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: [
            '높은 성능',
            '저렴한 비용',
            '쉬운 설정',
            '다양한 기능',
          ],
          correctAnswer: 'A',
          explanation:
            'Aurora 데이터베이스의 주요 장점은 높은 성능입니다. Aurora는 매우 성능이 좋은 데이터베이스로 주요 장점이 성능입니다.',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('질문을 단순히 반복')),
        ).toBe(true);
      });

      it('should warn if explanation lacks educational content', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'EKS는 어떤 서비스인가요? 이것은 충분히 긴 질문입니다. 추가로 더 길게 작성합니다.',
          options: [
            '쿠버네티스 관리 서비스',
            '컨테이너 레지스트리',
            '서버리스 컴퓨팅',
            '로드 밸런서',
          ],
          correctAnswer: 'A',
          explanation:
            'EKS는 Elastic Kubernetes Service입니다. 쿠버네티스를 관리해주는 서비스이며 매우 유용한 도구입니다. 많은 회사에서 사용하고 있습니다.',
        };

        const result = await service.validate(quiz);
        expect(
          result.warnings.some((w) => w.includes('Best Practice') || w.includes('이유')),
        ).toBe(true);
      });

      it('should pass with good educational content', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'EKS를 사용하는 주요 이유는 무엇인가요? 이것은 충분히 긴 질문입니다. 추가로 더 길게 작성합니다.',
          options: [
            '관리형 쿠버네티스 서비스',
            '저렴한 비용',
            '쉬운 설정',
            '빠른 성능',
          ],
          correctAnswer: 'A',
          explanation:
            'EKS(Elastic Kubernetes Service)는 AWS에서 제공하는 관리형 쿠버네티스 서비스입니다. ' +
            '쿠버네티스 컨트롤 플레인을 자동으로 관리하고 업그레이드해주기 때문에 운영 부담을 크게 줄일 수 있습니다. ' +
            'AWS 서비스와의 통합이 뛰어나 IAM 권한 관리, VPC 네트워킹, ELB 로드 밸런싱 등을 쉽게 구성할 수 있습니다.',
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Content Safety Validation', () => {
      it('should fail if forbidden words are present', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            '씨발 이런 서버가 다운되면 어떻게 해야 하나요? 이것은 충분히 긴 질문입니다.',
          options: ['재시작', '교체', '복구', '무시'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('부적절한 단어'))).toBe(true);
      });

      it('should fail if personal information is detected', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            '이메일 admin@example.com으로 문의하세요. EC2 설정 방법은? 이것은 충분히 긴 질문입니다.',
          options: ['콘솔 사용', 'CLI 사용', 'API 사용', '전화 문의'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('개인정보'))).toBe(true);
      });

      it('should fail if phone number is detected', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            '지원팀 010-1234-5678로 연락하세요. EC2는 무엇인가요? 이것은 충분히 긴 질문입니다.',
          options: ['가상 서버', '스토리지', '데이터베이스', '네트워크'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('개인정보'))).toBe(true);
      });

      it('should fail if password is exposed', async () => {
        const quiz: Partial<Quiz> = {
          type: QuizType.MULTIPLE_CHOICE,
          difficulty: QuizDifficulty.MEDIUM,
          question:
            'RDS 비밀번호: admin1234를 사용합니다. 보안 설정은? 이것은 충분히 긴 질문입니다.',
          options: ['IAM', 'Security Group', 'KMS', 'WAF'],
          correctAnswer: 'A',
          explanation: '이것은 설명입니다. ' + '충분히 길게 작성해야 합니다. '.repeat(5),
        };

        const result = await service.validate(quiz);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('개인정보'))).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null quiz object', async () => {
      const result = await service.validate(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined quiz object', async () => {
      const result = await service.validate(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty quiz object', async () => {
      const result = await service.validate({});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle quiz with malformed fields', async () => {
      const quiz: any = {
        type: 123, // 잘못된 타입
        question: ['array', 'instead', 'of', 'string'], // 잘못된 타입
        options: 'string instead of array', // 잘못된 타입
        correctAnswer: { key: 'value' }, // 잘못된 타입
        explanation: 12345, // 잘못된 타입
      };

      const result = await service.validate(quiz);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Full Quiz Validation', () => {
    it('should validate a complete valid MULTIPLE_CHOICE quiz', async () => {
      const quiz: Partial<Quiz> = {
        type: QuizType.MULTIPLE_CHOICE,
        difficulty: QuizDifficulty.MEDIUM,
        question:
          '대규모 트래픽을 처리하기 위해 EKS 클러스터에 Karpenter를 도입하려고 합니다. Karpenter의 주요 장점은 무엇인가요?',
        options: [
          'Pod의 요구사항에 따라 노드를 자동으로 프로비저닝하고 최적화합니다',
          '모든 노드를 동일한 크기로 유지합니다',
          'Pod를 수동으로 스케줄링합니다',
          '클러스터를 정적으로 관리합니다',
        ],
        correctAnswer: 'A',
        explanation:
          'Karpenter는 쿠버네티스 워크로드의 요구사항을 실시간으로 분석하여 최적의 노드를 프로비저닝합니다. ' +
          '기존 Cluster Autoscaler보다 빠른 스케일링과 비용 효율성을 제공하며, ' +
          'Pod의 리소스 요청과 제약 조건을 고려하여 가장 적합한 인스턴스 타입을 선택합니다. ' +
          '이를 통해 리소스 낭비를 최소화하고 성능을 최적화할 수 있습니다.',
        infraContext: ['EKS', 'Karpenter'],
      };

      const result = await service.validate(quiz);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.breakdown.structure.passed).toBe(true);
      expect(result.breakdown.balance.passed).toBe(true);
      expect(result.breakdown.content.passed).toBe(true);
    });

    it('should validate a complete valid OX quiz', async () => {
      const quiz: Partial<Quiz> = {
        type: QuizType.OX,
        difficulty: QuizDifficulty.EASY,
        question:
          'Aurora Global Database는 여러 AWS 리전에 걸쳐 데이터를 복제할 수 있나요?',
        correctAnswer: 'true',
        explanation:
          'Aurora Global Database는 최대 5개의 AWS 리전에 걸쳐 데이터를 복제할 수 있습니다. ' +
          '주 리전에서 쓰기 작업을 처리하고, 보조 리전에서는 읽기 전용 복제본을 제공합니다. ' +
          '복제 지연은 일반적으로 1초 미만이며, 재해 복구와 글로벌 사용자에게 낮은 지연시간을 제공하는 데 유용합니다.',
        infraContext: ['Aurora', 'Aurora Global DB'],
      };

      const result = await service.validate(quiz);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
