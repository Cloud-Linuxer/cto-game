import { Test, TestingModule } from '@nestjs/testing';
import { PromptBuilderService } from './prompt-builder.service';
import { LLMEventRequest } from '../dto/llm-request.dto';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptBuilderService],
    }).compile();

    service = module.get<PromptBuilderService>(PromptBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildEventPrompt', () => {
    it('should build complete prompt with all sections', () => {
      const request: LLMEventRequest = {
        gameState: {
          currentTurn: 5,
          cash: 100000000,
          users: 5000,
          trust: 60,
          infrastructure: ['EC2', 'Aurora'],
        },
      };

      const prompt = service.buildEventPrompt(request);

      expect(prompt).toContain('AWS 스타트업 타이쿤');
      expect(prompt).toContain('게임 규칙');
      expect(prompt).toContain('예시');
      expect(prompt).toContain('턴: 5/25');
      expect(prompt).toContain('자금: 100M원');
      expect(prompt).toContain('유저 수: 5K명');
      expect(prompt).toContain('신뢰도: 60/100');
      expect(prompt).toContain('인프라: EC2, Aurora');
    });

    it('should format cash correctly for different ranges', () => {
      const requestBillion: LLMEventRequest = {
        gameState: {
          currentTurn: 20,
          cash: 5000000000,
          users: 100000,
          trust: 80,
          infrastructure: ['EKS'],
        },
      };

      const prompt = service.buildEventPrompt(requestBillion);
      expect(prompt).toContain('5.0B원');
    });

    it('should format users correctly for different ranges', () => {
      const requestMillion: LLMEventRequest = {
        gameState: {
          currentTurn: 18,
          cash: 1000000000,
          users: 2500000,
          trust: 75,
          infrastructure: ['EKS', 'Aurora Global DB'],
        },
      };

      const prompt = service.buildEventPrompt(requestMillion);
      expect(prompt).toContain('2.5M명');
    });

    it('should identify correct game stage', () => {
      const stages = [
        { turn: 3, expectedStage: '초기 스타트업' },
        { turn: 8, expectedStage: '성장기' },
        { turn: 13, expectedStage: '확장기' },
        { turn: 18, expectedStage: '스케일업' },
        { turn: 23, expectedStage: 'IPO 준비' },
      ];

      stages.forEach(({ turn, expectedStage }) => {
        const request: LLMEventRequest = {
          gameState: {
            currentTurn: turn,
            cash: 100000000,
            users: 5000,
            trust: 60,
            infrastructure: ['EC2'],
          },
        };

        const prompt = service.buildEventPrompt(request);
        expect(prompt).toContain(`단계: ${expectedStage}`);
      });
    });
  });

  describe('extractJsonFromResponse', () => {
    it('should extract JSON from clean response', () => {
      const response = '{"eventType":"MARKET_OPPORTUNITY","title":"Test"}';
      const result = service.extractJsonFromResponse(response);
      expect(result).toBe(response);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should extract JSON from markdown code block', () => {
      const response = '```json\n{"eventType":"MARKET_OPPORTUNITY","title":"Test"}\n```';
      const result = service.extractJsonFromResponse(response);
      expect(result).toBe('{"eventType":"MARKET_OPPORTUNITY","title":"Test"}');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should extract JSON from response with extra text', () => {
      const response = 'Here is the event:\n{"eventType":"MARKET_OPPORTUNITY","title":"Test"}\nThat was it.';
      const result = service.extractJsonFromResponse(response);
      expect(result).toBe('{"eventType":"MARKET_OPPORTUNITY","title":"Test"}');
    });

    it('should throw error when no JSON found', () => {
      const response = 'No JSON here';
      expect(() => service.extractJsonFromResponse(response)).toThrow('No JSON object found');
    });

    it('should handle nested JSON objects', () => {
      const response = '{"outer":{"inner":"value"},"choices":[{"text":"test"}]}';
      const result = service.extractJsonFromResponse(response);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });
});
