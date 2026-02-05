export interface VLLMCompletionRequest {
  model: string;
  prompt: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stop?: string[];
}

export interface VLLMCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    logprobs: null;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMGeneratedEvent {
  eventType: string;
  title: string;
  description: string;
  choices: Array<{
    text: string;
    effects: {
      usersDelta?: number;
      cashDelta?: number;
      trustDelta?: number;
      addInfrastructure?: string[];
      removeInfrastructure?: string[];
    };
    resultText?: string;
  }>;
}
