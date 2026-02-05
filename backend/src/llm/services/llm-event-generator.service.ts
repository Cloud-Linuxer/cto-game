import { Injectable, Logger } from '@nestjs/common';
import { VLLMClientService } from './vllm-client.service';
import { PromptBuilderService } from './prompt-builder.service';
import { EventCacheService } from './event-cache.service';
import { LLMResponseValidatorService } from '../validators/llm-response-validator.service';
import { LLMEventRequest } from '../dto/llm-request.dto';
import { LLMGeneratedEvent } from '../dto/llm-response.dto';
import { LLMConfig } from '../../config/llm.config';

export interface EventGenerationMetrics {
  totalGenerated: number;
  successfulValidations: number;
  failedValidations: number;
  cacheHits: number;
  cacheMisses: number;
  averageGenerationTimeMs: number;
  llmFailures: number;
}

@Injectable()
export class LLMEventGeneratorService {
  private readonly logger = new Logger(LLMEventGeneratorService.name);
  private metrics: EventGenerationMetrics = {
    totalGenerated: 0,
    successfulValidations: 0,
    failedValidations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageGenerationTimeMs: 0,
    llmFailures: 0,
  };

  constructor(
    private readonly vllmClient: VLLMClientService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly eventCache: EventCacheService,
    private readonly validator: LLMResponseValidatorService,
  ) {}

  async generateEvent(request: LLMEventRequest): Promise<LLMGeneratedEvent | null> {
    if (!LLMConfig.features.enabled) {
      this.logger.debug('LLM events disabled by feature flag');
      return null;
    }

    const startTime = Date.now();
    this.metrics.totalGenerated++;

    try {
      // Check cache first
      const cachedEvent = await this.eventCache.get(request.gameState);
      if (cachedEvent) {
        this.metrics.cacheHits++;
        const duration = Date.now() - startTime;
        this.updateAverageGenerationTime(duration);
        this.logger.log(`Cache hit! Returned event in ${duration}ms`);
        return cachedEvent;
      }

      this.metrics.cacheMisses++;

      // Build prompt
      const prompt = this.promptBuilder.buildEventPrompt(request);
      this.logger.debug('Generated prompt for event generation');

      // Call LLM
      let rawResponse: string;
      try {
        rawResponse = await this.vllmClient.generateCompletion(prompt);
        this.logger.debug('Received response from vLLM');
      } catch (error) {
        this.metrics.llmFailures++;
        this.logger.error(`LLM generation failed: ${error.message}`);
        return null;
      }

      // Extract JSON
      let jsonResponse: string;
      try {
        jsonResponse = this.promptBuilder.extractJsonFromResponse(rawResponse);
      } catch (error) {
        this.logger.error(`Failed to extract JSON from response: ${error.message}`);
        this.metrics.failedValidations++;
        return null;
      }

      // Parse JSON
      let parsedEvent: LLMGeneratedEvent;
      try {
        parsedEvent = JSON.parse(jsonResponse);
      } catch (error) {
        this.logger.error(`Failed to parse JSON: ${error.message}`);
        this.metrics.failedValidations++;
        return null;
      }

      // Validate event
      const validationResult = await this.validator.validate(parsedEvent, request.gameState);

      if (!validationResult.isValid) {
        this.logger.warn(`Event validation failed: ${validationResult.errors.join(', ')}`);

        // Try auto-fix if available
        if (validationResult.fixedEvent) {
          this.logger.log('Using auto-fixed event');
          parsedEvent = validationResult.fixedEvent;
          this.metrics.successfulValidations++;
        } else {
          this.metrics.failedValidations++;
          return null;
        }
      } else {
        // Even if valid, use fixed event if provided (minor fixes applied)
        if (validationResult.fixedEvent) {
          this.logger.log('Using auto-fixed event (valid with minor fixes)');
          parsedEvent = validationResult.fixedEvent;
        }
        this.metrics.successfulValidations++;
      }

      // Store in cache
      await this.eventCache.set(request.gameState, parsedEvent);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateAverageGenerationTime(duration);

      this.logger.log(`Successfully generated event in ${duration}ms`);
      return parsedEvent;
    } catch (error) {
      this.logger.error(`Unexpected error in event generation: ${error.message}`, error.stack);
      return null;
    }
  }

  async generateEventWithFallback(
    request: LLMEventRequest,
    fallbackFn: () => Promise<any>,
  ): Promise<any> {
    // Try LLM generation first
    const llmEvent = await this.generateEvent(request);

    if (llmEvent) {
      return this.convertToEventEntity(llmEvent);
    }

    // Fallback to static event
    this.logger.debug('Falling back to static event generation');
    return await fallbackFn();
  }

  private convertToEventEntity(llmEvent: LLMGeneratedEvent): any {
    // Convert LLM-generated event to DynamicEventEntity format
    return {
      eventType: llmEvent.eventType,
      title: llmEvent.title,
      description: llmEvent.description,
      choices: llmEvent.choices.map((choice, index) => ({
        choiceId: index + 1,
        text: choice.text,
        effects: {
          usersDelta: choice.effects.usersDelta || 0,
          cashDelta: choice.effects.cashDelta || 0,
          trustDelta: choice.effects.trustDelta || 0,
          addInfrastructure: choice.effects.addInfrastructure || [],
          removeInfrastructure: choice.effects.removeInfrastructure || [],
        },
        resultText: choice.resultText || '',
      })),
      isActive: true,
      createdAt: new Date(),
      generatedByLLM: true,
    };
  }

  private updateAverageGenerationTime(newDuration: number): void {
    const totalTime = this.metrics.averageGenerationTimeMs * (this.metrics.totalGenerated - 1);
    this.metrics.averageGenerationTimeMs = (totalTime + newDuration) / this.metrics.totalGenerated;
  }

  getMetrics(): EventGenerationMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalGenerated: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageGenerationTimeMs: 0,
      llmFailures: 0,
    };
  }
}
