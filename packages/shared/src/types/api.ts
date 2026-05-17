/**
 * Backend proxy API request/response types.
 * Kept loose (object-shaped) to avoid forcing all consumers to depend on @anthropic-ai/sdk.
 */

export interface SystemPromptBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  cache_control?: { type: 'ephemeral' };
}

export interface MessageContent {
  role: 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

export interface LLMRequest {
  model: string;
  max_tokens: number;
  system: SystemPromptBlock[];
  tools: ToolDefinition[];
  messages: MessageContent[];
  tool_choice?: { type: 'any' | 'auto' | 'tool'; name?: string };
  temperature?: number;
}

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface LLMResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: Array<Record<string, unknown>>;
  stop_reason: string | null;
  usage: LLMUsage;
}

export interface LLMErrorResponse {
  error: {
    type: string;
    message: string;
  };
}
