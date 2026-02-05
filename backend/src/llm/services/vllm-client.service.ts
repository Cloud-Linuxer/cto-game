import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { LLMConfig } from '../../config/llm.config';
import { VLLMCompletionRequest, VLLMCompletionResponse } from '../dto/llm-response.dto';

@Injectable()
export class VLLMClientService {
  private readonly logger = new Logger(VLLMClientService.name);
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: LLMConfig.vllm.endpoint,
      timeout: LLMConfig.vllm.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async generateCompletion(prompt: string): Promise<string> {
    const request: VLLMCompletionRequest = {
      model: LLMConfig.vllm.modelName,
      prompt,
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 0.9,
      stop: ['---', '\n\n\n'],
    };

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= LLMConfig.vllm.maxRetries; attempt++) {
      try {
        this.logger.debug(`Calling vLLM API (attempt ${attempt + 1}/${LLMConfig.vllm.maxRetries + 1})`);

        const response = await this.client.post<VLLMCompletionResponse>(
          '/v1/completions',
          request,
        );

        const duration = Date.now() - startTime;
        this.logger.log(`vLLM API call successful in ${duration}ms`);

        if (!response.data.choices || response.data.choices.length === 0) {
          throw new Error('No completion choices returned from vLLM');
        }

        return response.data.choices[0].text;
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - startTime;

        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            this.logger.error(`vLLM service not available at ${LLMConfig.vllm.endpoint}`);
          } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            this.logger.warn(`vLLM API timeout after ${duration}ms (attempt ${attempt + 1})`);
          } else {
            this.logger.error(`vLLM API error: ${error.message}`, error.response?.data);
          }
        } else {
          this.logger.error(`Unexpected error calling vLLM: ${error.message}`);
        }

        // Don't retry on last attempt
        if (attempt === LLMConfig.vllm.maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }

    throw new Error(`vLLM API failed after ${LLMConfig.vllm.maxRetries + 1} attempts: ${lastError?.message}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 2000 });
      return true;
    } catch (error) {
      this.logger.warn('vLLM health check failed');
      return false;
    }
  }
}
