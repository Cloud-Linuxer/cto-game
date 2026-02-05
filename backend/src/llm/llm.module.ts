import { Module } from '@nestjs/common';
import { VLLMClientService } from './services/vllm-client.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { EventCacheService } from './services/event-cache.service';
import { LLMEventGeneratorService } from './services/llm-event-generator.service';
import { EventQualityScorerService } from './services/event-quality-scorer.service';
import { LLMResponseValidatorService } from './validators/llm-response-validator.service';
import { LLMController } from './llm.controller';

@Module({
  controllers: [LLMController],
  providers: [
    VLLMClientService,
    PromptBuilderService,
    EventCacheService,
    LLMEventGeneratorService,
    EventQualityScorerService,
    LLMResponseValidatorService,
  ],
  exports: [
    LLMEventGeneratorService,
    EventQualityScorerService,
    VLLMClientService,
    PromptBuilderService, // Quiz 모듈에서 사용
    EventCacheService,
  ],
})
export class LLMModule {}
