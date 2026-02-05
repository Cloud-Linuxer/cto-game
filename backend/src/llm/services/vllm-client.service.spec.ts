import { Test, TestingModule } from '@nestjs/testing';
import { VLLMClientService } from './vllm-client.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('VLLMClientService', () => {
  let service: VLLMClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VLLMClientService],
    }).compile();

    service = module.get<VLLMClientService>(VLLMClientService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCompletion', () => {
    it('should successfully generate completion', async () => {
      const mockResponse = {
        data: {
          id: 'test-id',
          object: 'text_completion',
          created: Date.now(),
          model: 'gpt-oss-20b',
          choices: [
            {
              text: '{"eventType":"MARKET_OPPORTUNITY","title":"Test Event"}',
              index: 0,
              logprobs: null,
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        },
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        get: jest.fn(),
      });

      // Recreate service with mocked axios
      const module: TestingModule = await Test.createTestingModule({
        providers: [VLLMClientService],
      }).compile();
      service = module.get<VLLMClientService>(VLLMClientService);

      const result = await service.generateCompletion('test prompt');

      expect(result).toBe('{"eventType":"MARKET_OPPORTUNITY","title":"Test Event"}');
    });

    it('should throw error when no choices returned', async () => {
      const mockResponse = {
        data: {
          id: 'test-id',
          choices: [],
          usage: { prompt_tokens: 100, completion_tokens: 0, total_tokens: 100 },
        },
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        get: jest.fn(),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VLLMClientService],
      }).compile();
      service = module.get<VLLMClientService>(VLLMClientService);

      await expect(service.generateCompletion('test')).rejects.toThrow('No completion choices');
    });

    it('should retry on timeout and eventually fail', async () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Timeout',
        isAxiosError: true,
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn().mockRejectedValue(timeoutError),
        get: jest.fn(),
      });
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      const module: TestingModule = await Test.createTestingModule({
        providers: [VLLMClientService],
      }).compile();
      service = module.get<VLLMClientService>(VLLMClientService);

      await expect(service.generateCompletion('test')).rejects.toThrow('vLLM API failed');
    }, 10000);
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn(),
        get: jest.fn().mockResolvedValue({ status: 200 }),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VLLMClientService],
      }).compile();
      service = module.get<VLLMClientService>(VLLMClientService);

      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when service is down', async () => {
      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn(),
        get: jest.fn().mockRejectedValue(new Error('Connection refused')),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [VLLMClientService],
      }).compile();
      service = module.get<VLLMClientService>(VLLMClientService);

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });
  });
});
