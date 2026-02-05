export interface LLMEventRequest {
  gameState: {
    currentTurn: number;
    cash: number;
    users: number;
    trust: number;
    infrastructure: string[];
  };
  eventContext?: {
    recentChoices?: string[];
    triggerCondition?: string;
  };
}
