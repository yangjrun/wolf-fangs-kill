import type { GameState, PendingAction, PlayerAction, TokenUsage } from '@wfk/shared';
import { toolCallToAction } from '@wfk/shared';
import pLimit from 'p-limit';

import type { Agent } from './agent.js';
import type { FlowToken } from './flow-token.js';

export interface OrchestratorOptions {
  agents: Map<string, Agent>;
  maxConcurrency?: number;
  flowToken?: FlowToken;
  /** Optional per-decision observer (e.g. for logging). */
  onDecision?: (info: {
    playerId: string;
    action: PlayerAction;
    reasoning: string;
    latencyMs: number;
    usage: TokenUsage;
    stats?: {
      contentLength?: number;
      reasoningLength?: number;
      internalThoughtLength?: number;
    };
  }) => void;
}

export class OrchestratorError extends Error {
  constructor(
    message: string,
    public playerId: string
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

/**
 * Coordinate multiple AI agents within a single phase.
 *
 * Concurrency rules:
 *   - WEREWOLF_KILL: parallel (each wolf votes independently)
 *   - SEER/WITCH/HUNTER: single (one agent decides per phase)
 *   - DAY_DISCUSSION: serial (later speakers see earlier speeches —
 *     the caller is responsible for applying each speech to state before
 *     calling for the next)
 *   - DAY_VOTE: parallel (each player votes independently without seeing
 *     others' votes first)
 *
 * `decideParallel` is safe for parallel phases. For serial phases, call
 * `decideSingle` repeatedly with each pending player.
 */
export class Orchestrator {
  private limit: ReturnType<typeof pLimit>;
  private agents: Map<string, Agent>;
  private flowToken?: FlowToken;
  private onDecision?: OrchestratorOptions['onDecision'];

  constructor(opts: OrchestratorOptions) {
    this.agents = opts.agents;
    this.limit = pLimit(opts.maxConcurrency ?? 5);
    if (opts.flowToken !== undefined) this.flowToken = opts.flowToken;
    if (opts.onDecision !== undefined) this.onDecision = opts.onDecision;
  }

  /**
   * Decide actions for all pending players in parallel.
   * Returns actions in the same order as `pending` (NOT first-completed order).
   */
  async decideParallel(state: GameState, pending: PendingAction[]): Promise<PlayerAction[]> {
    const tasks = pending.map((p) =>
      this.limit(() => this.decideOne(state, p))
    );
    return Promise.all(tasks);
  }

  /**
   * Decide for a single pending player (use in serial phases like DAY_DISCUSSION).
   */
  async decideSingle(state: GameState, pending: PendingAction): Promise<PlayerAction> {
    return this.decideOne(state, pending);
  }

  private async decideOne(state: GameState, pending: PendingAction): Promise<PlayerAction> {
    const agent = this.agents.get(pending.playerId);
    if (!agent) {
      throw new OrchestratorError(`No agent registered for ${pending.playerId}`, pending.playerId);
    }

    const decision = await agent.decide(state);

    if (this.flowToken && !this.flowToken.isValid()) {
      throw new OrchestratorError('Flow invalidated mid-decision', pending.playerId);
    }

    const action = toolCallToAction(
      decision.toolCall.toolName,
      decision.toolCall.input,
      pending.playerId
    );
    if (!action) {
      throw new OrchestratorError(
        `Tool ${decision.toolCall.toolName} could not be converted to action`,
        pending.playerId
      );
    }

    if (!pending.allowedActionTypes.includes(action.type)) {
      throw new OrchestratorError(
        `Agent ${pending.playerId} returned ${action.type} but allowed: ${pending.allowedActionTypes.join(', ')}`,
        pending.playerId
      );
    }

    if (this.onDecision) {
      const reasoning =
        typeof decision.toolCall.input['reasoning'] === 'string'
          ? (decision.toolCall.input['reasoning'] as string)
          : (decision.toolCall.input['internal_thought'] as string) ?? '';

      // Extract statistics from the action
      const stats: {
        contentLength?: number;
        reasoningLength?: number;
        internalThoughtLength?: number;
      } = {};

      if (typeof decision.toolCall.input['content'] === 'string') {
        stats.contentLength = (decision.toolCall.input['content'] as string).length;
      }
      if (typeof decision.toolCall.input['reasoning'] === 'string') {
        stats.reasoningLength = (decision.toolCall.input['reasoning'] as string).length;
      }
      if (typeof decision.toolCall.input['internal_thought'] === 'string') {
        stats.internalThoughtLength = (decision.toolCall.input['internal_thought'] as string).length;
      }

      this.onDecision({
        playerId: pending.playerId,
        action,
        reasoning,
        latencyMs: decision.latencyMs,
        usage: decision.usage,
        stats,
      });
    }

    return action;
  }
}
