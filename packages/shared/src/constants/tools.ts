import type { Phase, Role, PlayerAction } from '../types/game.js';
import type { ToolDefinition } from '../types/api.js';

export type ToolName =
  | 'werewolf_kill'
  | 'seer_check'
  | 'witch_heal'
  | 'witch_poison'
  | 'witch_skip'
  | 'hunter_shoot'
  | 'guard_protect'
  | 'knight_duel'
  | 'cupid_link'
  | 'run_for_sheriff'
  | 'skip_sheriff'
  | 'sheriff_vote'
  | 'transfer_badge'
  | 'destroy_badge'
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
    name: 'guard_protect',
    description:
      '守卫每晚守护一名玩家，被守的玩家当晚免狼刀。不能连续两晚守同一人。守人 + 女巫同晚救同一人会双解死亡（同守同救）。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: {
          type: 'string',
          description: '要守护的玩家 ID。不能等于上一晚守护的目标。',
        },
        reasoning: {
          type: 'string',
          description: '为什么选这个目标。内心独白，不会公开。',
        },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'knight_duel',
    description:
      '骑士每局只能用一次。白天发言时间向一名玩家发起决斗：目标当场翻牌。目标若是狼则狼死、骑士免疫；目标若非狼则骑士自爆死亡。决斗会替代你本回合的发言。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: {
          type: 'string',
          description: '要决斗的玩家 ID（必须存活，不能是自己）。',
        },
        reasoning: {
          type: 'string',
          description: '为什么选这个目标。内心独白。',
        },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'cupid_link',
    description:
      '丘比特首夜将两名玩家连为情侣。情侣双方互相知道身份，一方死亡另一方殉情。跨阵营情侣可形成新阵营：只剩两人存活时共同获胜。',
    input_schema: {
      type: 'object',
      properties: {
        target1_id: {
          type: 'string',
          description: '第一位情侣的玩家 ID',
        },
        target2_id: {
          type: 'string',
          description: '第二位情侣的玩家 ID（必须与 target1 不同）',
        },
        reasoning: {
          type: 'string',
          description: '为什么选这两位组成情侣。内心独白。',
        },
      },
      required: ['target1_id', 'target2_id', 'reasoning'],
    },
  },
  {
    name: 'run_for_sheriff',
    description:
      '宣布参选警长，并发表竞选发言。content 是公开发言（其他玩家可见），internal_thought 是内心独白（不公开）。',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: '竞选发言内容（公开）。',
        },
        internal_thought: {
          type: 'string',
          description: '你的真实策略和身份伪装思路。不会公开。',
        },
      },
      required: ['content', 'internal_thought'],
    },
  },
  {
    name: 'skip_sheriff',
    description: '放弃参选警长。',
    input_schema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string', description: '为什么不上警。内心独白。' },
      },
      required: ['reasoning'],
    },
  },
  {
    name: 'sheriff_vote',
    description:
      '在警长选举中投票给一名参选者，或弃票。仅未上警的玩家可投。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: {
          type: 'string',
          description: "要投票给的参选者 ID，或 'abstain' 表示弃票",
        },
        reasoning: { type: 'string', description: '为什么投这个目标。内心独白。' },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'transfer_badge',
    description:
      '警长死亡时将警徽传递给一名存活玩家。新警长继承 1.5 票权。',
    input_schema: {
      type: 'object',
      properties: {
        target_id: { type: 'string', description: '接任警长的玩家 ID（必须存活）' },
        reasoning: { type: 'string', description: '为什么传给此人。内心独白。' },
      },
      required: ['target_id', 'reasoning'],
    },
  },
  {
    name: 'destroy_badge',
    description: '撕毁警徽：不传给任何人，警徽永久销毁，本局后续无警长。',
    input_schema: {
      type: 'object',
      properties: {
        reasoning: { type: 'string', description: '为什么撕掉警徽。内心独白。' },
      },
      required: ['reasoning'],
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
  CUPID_LINK: {
    cupid: ['cupid_link'],
  },
  GUARD_PROTECT: {
    guard: ['guard_protect'],
  },
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
  SHERIFF_RUNNING_FOR: {
    werewolf: ['run_for_sheriff', 'skip_sheriff'],
    seer: ['run_for_sheriff', 'skip_sheriff'],
    witch: ['run_for_sheriff', 'skip_sheriff'],
    hunter: ['run_for_sheriff', 'skip_sheriff'],
    guard: ['run_for_sheriff', 'skip_sheriff'],
    idiot: ['run_for_sheriff', 'skip_sheriff'],
    knight: ['run_for_sheriff', 'skip_sheriff'],
    cupid: ['run_for_sheriff', 'skip_sheriff'],
    villager: ['run_for_sheriff', 'skip_sheriff'],
  },
  SHERIFF_VOTE: {
    werewolf: ['sheriff_vote'],
    seer: ['sheriff_vote'],
    witch: ['sheriff_vote'],
    hunter: ['sheriff_vote'],
    guard: ['sheriff_vote'],
    idiot: ['sheriff_vote'],
    knight: ['sheriff_vote'],
    cupid: ['sheriff_vote'],
    villager: ['sheriff_vote'],
  },
  SHERIFF_BADGE_TRANSFER: {
    werewolf: ['transfer_badge', 'destroy_badge'],
    seer: ['transfer_badge', 'destroy_badge'],
    witch: ['transfer_badge', 'destroy_badge'],
    hunter: ['transfer_badge', 'destroy_badge'],
    guard: ['transfer_badge', 'destroy_badge'],
    idiot: ['transfer_badge', 'destroy_badge'],
    knight: ['transfer_badge', 'destroy_badge'],
    cupid: ['transfer_badge', 'destroy_badge'],
    villager: ['transfer_badge', 'destroy_badge'],
  },
  DAY_DISCUSSION: {
    werewolf: ['speak'],
    seer: ['speak'],
    witch: ['speak'],
    hunter: ['speak'],
    guard: ['speak'],
    idiot: ['speak'],
    knight: ['speak', 'knight_duel'],
    cupid: ['speak'],
    villager: ['speak'],
  },
  DAY_VOTE: {
    werewolf: ['vote'],
    seer: ['vote'],
    witch: ['vote'],
    hunter: ['vote'],
    guard: ['vote'],
    idiot: ['vote'],
    knight: ['vote'],
    cupid: ['vote'],
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
  guard_protect: 'GUARD_PROTECT',
  knight_duel: 'KNIGHT_DUEL',
  cupid_link: 'CUPID_LINK',
  run_for_sheriff: 'RUN_FOR_SHERIFF',
  skip_sheriff: 'SKIP_SHERIFF',
  sheriff_vote: 'SHERIFF_VOTE',
  transfer_badge: 'TRANSFER_BADGE',
  destroy_badge: 'DESTROY_BADGE',
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
    case 'guard_protect':
      if (!targetId) return null;
      return { type: 'GUARD_PROTECT', playerId, targetId, reasoning };
    case 'knight_duel':
      if (!targetId) return null;
      return { type: 'KNIGHT_DUEL', playerId, targetId, reasoning };
    case 'cupid_link': {
      const t1 = typeof input['target1_id'] === 'string' ? (input['target1_id'] as string) : '';
      const t2 = typeof input['target2_id'] === 'string' ? (input['target2_id'] as string) : '';
      if (!t1 || !t2) return null;
      return { type: 'CUPID_LINK', playerId, target1Id: t1, target2Id: t2, reasoning };
    }
    case 'run_for_sheriff':
      return {
        type: 'RUN_FOR_SHERIFF',
        playerId,
        content: String(input['content'] ?? ''),
        internalThought: String(input['internal_thought'] ?? ''),
      };
    case 'skip_sheriff':
      return { type: 'SKIP_SHERIFF', playerId, reasoning };
    case 'sheriff_vote':
      if (!targetId) return null;
      return { type: 'SHERIFF_VOTE', playerId, targetId, reasoning };
    case 'transfer_badge':
      if (!targetId) return null;
      return { type: 'TRANSFER_BADGE', playerId, targetId, reasoning };
    case 'destroy_badge':
      return { type: 'DESTROY_BADGE', playerId, reasoning };
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
