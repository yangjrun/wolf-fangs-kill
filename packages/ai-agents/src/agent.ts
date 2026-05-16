import type {
  AgentDecision,
  AgentToolCall,
  GameState,
  LLMRequest,
  Persona,
  Player,
  TokenUsage,
  ToolName,
} from '@wfk/shared';
import { ALL_TOOLS } from '@wfk/shared';

import type { LLMClient } from './llm-client.js';
import { buildSystemPrompt } from './prompts/system.js';
import { buildUserMessage } from './prompts/user-message.js';
import { buildPrivateInfo } from './prompts/private-info.js';
import { getAllowedTools, getInstruction } from './tool-router.js';

export interface AgentOptions {
  player: Player;
  persona: Persona;
  client: LLMClient;
  model: string;
  maxTokens?: number;
}

/**
 * Single AI player. Owns its system prompt (static, cacheable). Has NO
 * persistent message history — every decide() call builds a fresh user
 * message from the current GameState, so:
 *
 * 1. Information isolation is automatic (no risk of leaking another agent's
 *    private info into this agent's history)
 * 2. Prompt caching hits on system + tools (~4-5K tokens, the largest static
 *    prefix), user messages are dynamic and not cached
 * 3. Replay is deterministic: same state → same prompt
 */
export class Agent {
  readonly playerId: string;
  readonly persona: Persona;
  readonly role: Player['role'];
  private readonly systemPrompt: string;
  private readonly client: LLMClient;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(opts: AgentOptions) {
    this.playerId = opts.player.id;
    this.persona = opts.persona;
    this.role = opts.player.role;
    this.client = opts.client;
    this.model = opts.model;
    this.maxTokens = opts.maxTokens ?? 8192;

    this.systemPrompt = buildSystemPrompt({
      persona: opts.persona,
      role: opts.player.role,
      playerId: opts.player.id,
      seat: opts.player.seat,
    });
  }

  /**
   * Ask the LLM to make a decision for the current game state.
   * The caller is responsible for ensuring this agent is actually pending
   * (i.e. shows up in getPendingActions for the current state).
   */
  async decide(state: GameState): Promise<AgentDecision> {
    const player = state.players.find((p) => p.id === this.playerId);
    if (!player) throw new Error(`Agent ${this.playerId} not in game state`);

    const allowed = getAllowedTools(state, player);
    if (allowed.length === 0) {
      throw new Error(
        `Agent ${this.playerId} has no allowed tools in phase ${state.phase} as ${this.role}`
      );
    }

    const privateInfo = buildPrivateInfo(state, player);
    const instruction = getInstruction(state, player);
    const userMessage = buildUserMessage({
      state,
      agentPlayer: player,
      privateInfo,
      instruction,
    });

    const request: LLMRequest = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: [
        {
          type: 'text',
          text: this.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      // Always send the full tool set. Mark cache_control on the last tool
      // so the entire array is cached together.
      tools: ALL_TOOLS.map((t, i) =>
        i === ALL_TOOLS.length - 1
          ? { ...t, cache_control: { type: 'ephemeral' } }
          : { ...t }
      ),
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      // Force the model to call a tool (not free-text)
      tool_choice: { type: 'any' },
    };

    const start = Date.now();
    const response = await this.client.call(request);
    const latencyMs = Date.now() - start;

    const toolCall = extractToolCall(response.content);
    if (!toolCall) {
      throw new Error(
        `Agent ${this.playerId} did not return a tool_use block. Stop reason: ${response.stop_reason}`
      );
    }

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreateTokens: response.usage.cache_creation_input_tokens ?? 0,
    };

    return { toolCall, usage, latencyMs };
  }
}

function extractToolCall(content: Array<Record<string, unknown>>): AgentToolCall | null {
  for (const block of content) {
    if (block['type'] === 'tool_use') {
      const name = String(block['name'] ?? '');
      const id = String(block['id'] ?? '');
      const input = (block['input'] ?? {}) as Record<string, unknown>;
      return { toolName: name as ToolName, input, toolUseId: id };
    }
  }
  return null;
}
