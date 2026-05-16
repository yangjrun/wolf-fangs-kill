import type { Phase, Role, PlayerAction } from '../types/game.js';
import type { ToolDefinition } from '../types/api.js';

export type ToolName =
  | 'werewolf_kill'
  | 'seer_check'
  | 'witch_heal'
  | 'witch_poison'
  | 'witch_skip'
  | 'hunter_shoot'
  | 'speak'
  | 'vote';

/**
 * All tools the AI can call. Defined as a stable readonly array to ensure
 * deterministic ordering for prompt caching (changing tool order invalidates cache).
 */
export const ALL_TOOLS: readonly ToolDefinition[] = [
  {
    name: 'werewolf_kill',
    description:
      '狼人投票决定今晚击杀的目标。所有狼人独立投票，引擎按多数决裁定。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: {
          type: 'string',
          description: "要击杀的玩家 ID，例如 'player_3'",
        },
        reasoning: {
          type: 'string',
          description: '为什么选这个目标。这是你的内心独白，不会被其他玩家看到。',
        },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'seer_check',
    description:
      '查验一名玩家的阵营。结果只有你能看到。第一晚不能查自己。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: { type: 'string', description: '要查验的玩家 ID' },
        reasoning: {
          type: 'string',
          description: '为什么选这个目标。内心独白，不会公开。',
        },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'witch_heal',
    description:
      '使用解药救今晚被狼刀的玩家。解药只能用一次，且第一晚可救自己，之后不能自救。',
    input_schema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string', description: '为什么决定救人。内心独白。' },
      },
      required: ['reasoning'],
    },
  },
  {
    name: 'witch_poison',
    description:
      '使用毒药毒杀一名玩家。毒药只能用一次。同一晚不能同时使用解药和毒药。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: { type: 'string', description: '要毒杀的玩家 ID' },
        reasoning: { type: 'string', description: '为什么选这个目标。内心独白。' },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'witch_skip',
    description: '今晚不使用任何药水。',
    input_schema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string', description: '为什么决定跳过。内心独白。' },
      },
      required: ['reasoning'],
    },
  },
  {
    name: 'hunter_shoot',
    description:
      '猎人死亡时开枪带走一名玩家。可以选择不开枪（target_id 传空字符串）。被女巫毒死时不能开枪。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: {
          type: 'string',
          description: "要带走的玩家 ID，或空字符串 '' 表示不开枪",
        },
        reasoning: {
          type: 'string',
          description: '为什么选这个目标（或为什么不开枪）。内心独白。',
        },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'speak',
    description:
      '白天公开发言。content 会被所有玩家看到，internal_thought 不会。',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: '公开发言内容，其他玩家会看到。',
        },
        internal_thought: {
          type: 'string',
          description: '你的真实想法和策略，永远不会被其他玩家看到，仅用于复盘。',
        },
      },
      required: ['content', 'internal_thought'],
    },
  },
  {
    name: 'vote',
    description:
      "白天投票出局一名玩家。所有人独立投票，多数决。可投 'abstain' 弃票。",
    input_schema: {
      type: 'object',
      properties: {
        target_id: {
          type: 'string',
          description: "要投出局的玩家 ID，或 'abstain' 表示弃票",
        },
        reasoning: { type: 'string', description: '为什么投这个目标。内心独白。' },
      },
      required: ['target_id', 'reasoning'],
    },
  },
] as const;

export const TOOL_NAMES: readonly ToolName[] = ALL_TOOLS.map((t) => t.name as ToolName);

/** Which tools are allowed for a given (phase, role) combination. */
export const ALLOWED_TOOLS_PER_PHASE_AND_ROLE: Partial<
  Record<Phase, Partial<Record<Role, readonly ToolName[]>>>
> = {
  WEREWOLF_KILL: {
    werewolf: ['werewolf_kill'],
  },
  SEER_CHECK: {
    seer: ['seer_check'],
  },
  WITCH_ACTION: {
    witch: ['witch_heal', 'witch_poison', 'witch_skip'],
  },
  HUNTER_SHOOT_NIGHT: {
    hunter: ['hunter_shoot'],
  },
  HUNTER_SHOOT_DAY: {
    hunter: ['hunter_shoot'],
  },
  DAY_DISCUSSION: {
    werewolf: ['speak'],
    seer: ['speak'],
    witch: ['speak'],
    hunter: ['speak'],
    villager: ['speak'],
  },
  DAY_VOTE: {
    werewolf: ['vote'],
    seer: ['vote'],
    witch: ['vote'],
    hunter: ['vote'],
    villager: ['vote'],
  },
};

/** Map tool name to the engine PlayerAction type. */
export const TOOL_TO_ACTION_TYPE: Record<ToolName, PlayerAction['type']> = {
  werewolf_kill: 'WEREWOLF_KILL',
  seer_check: 'SEER_CHECK',
  witch_heal: 'WITCH_HEAL',
  witch_poison: 'WITCH_POISON',
  witch_skip: 'WITCH_SKIP',
  hunter_shoot: 'HUNTER_SHOOT',
  speak: 'SPEAK',
  vote: 'VOTE',
};

/** Convert a tool call to a PlayerAction (or null if invalid). */
export function toolCallToAction(
  toolName: string,
  input: Record<string, unknown>,
  playerId: string
): PlayerAction | null {
  const reasoning = String(input['reasoning'] ?? '');
  const targetId = typeof input['target_id'] === 'string' ? (input['target_id'] as string) : undefined;
  switch (toolName) {
    case 'werewolf_kill':
      if (!targetId) return null;
      return { type: 'WEREWOLF_KILL', playerId, targetId, reasoning };
    case 'seer_check':
      if (!targetId) return null;
      return { type: 'SEER_CHECK', playerId, targetId, reasoning };
    case 'witch_heal':
      return { type: 'WITCH_HEAL', playerId, reasoning };
    case 'witch_poison':
      if (!targetId) return null;
      return { type: 'WITCH_POISON', playerId, targetId, reasoning };
    case 'witch_skip':
      return { type: 'WITCH_SKIP', playerId, reasoning };
    case 'hunter_shoot':
      return {
        type: 'HUNTER_SHOOT',
        playerId,
        targetId: targetId && targetId !== '' ? targetId : null,
        reasoning,
      };
    case 'speak':
      return {
        type: 'SPEAK',
        playerId,
        content: String(input['content'] ?? ''),
        internalThought: String(input['internal_thought'] ?? ''),
      };
    case 'vote':
      if (!targetId) return null;
      return { type: 'VOTE', playerId, targetId, reasoning };
    default:
      return null;
  }
}
