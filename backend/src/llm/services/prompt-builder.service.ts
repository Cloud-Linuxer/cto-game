import { Injectable } from '@nestjs/common';
import { SYSTEM_PROMPT, buildContextPrompt } from '../templates/system-prompt.template';
import { getFewShotPrompt } from '../templates/few-shot-examples';
import { LLMEventRequest } from '../dto/llm-request.dto';

@Injectable()
export class PromptBuilderService {
  buildEventPrompt(request: LLMEventRequest): string {
    const systemPrompt = SYSTEM_PROMPT;
    const fewShotExamples = getFewShotPrompt();
    const contextPrompt = buildContextPrompt(request.gameState);

    return `${systemPrompt}

${fewShotExamples}

${contextPrompt}

응답 (JSON만):`;
  }

  extractJsonFromResponse(rawResponse: string): string {
    // Remove any markdown code blocks
    let cleaned = rawResponse.trim();

    // Remove ```json and ``` if present
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');

    // Find JSON object boundaries
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in response');
    }

    return cleaned.substring(jsonStart, jsonEnd + 1);
  }
}
