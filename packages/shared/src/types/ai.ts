export interface Persona {
  id: string;
  name: string;
  avatar: string;
  description: string;   // injected into system prompt
  speechStyle: string;   // exemplar quote
}

export interface AgentToolCall {
  toolName: string;
  input: Record<string, unknown>;
  toolUseId: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

export interface AgentDecision {
  toolCall: AgentToolCall;
  usage: TokenUsage;
  latencyMs: number;
}
