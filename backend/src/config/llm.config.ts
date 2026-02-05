export const LLMConfig = {
  vllm: {
    endpoint: process.env.VLLM_ENDPOINT || 'http://localhost:8000',
    timeoutMs: parseInt(process.env.VLLM_TIMEOUT_MS || '3000', 10),
    maxRetries: parseInt(process.env.VLLM_MAX_RETRIES || '1', 10),
    modelName: process.env.VLLM_MODEL_NAME || 'openai/gpt-oss-20b',
  },
  cache: {
    ttlSeconds: parseInt(process.env.EVENT_CACHE_TTL_SECONDS || '300', 10),
    maxSize: parseInt(process.env.EVENT_CACHE_MAX_SIZE || '1000', 10),
  },
  features: {
    // Disable LLM events in test environment by default
    enabled: process.env.NODE_ENV === 'test' ? false : (process.env.LLM_EVENTS_ENABLED !== 'false'),
    triggerRate: parseFloat(process.env.LLM_EVENTS_TRIGGER_RATE || '0.1'),
  },
};
