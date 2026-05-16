import type { GameState, Player } from '@wfk/shared';
import { ALLOWED_TOOLS_PER_PHASE_AND_ROLE, type ToolName } from '@wfk/shared';

/**
 * Look up which tools the agent is allowed to call in the current phase
 * based on its role.
 */
export function getAllowedTools(state: GameState, agent: Player): readonly ToolName[] {
  const phaseMap = ALLOWED_TOOLS_PER_PHASE_AND_ROLE[state.phase];
  if (!phaseMap) return [];
  return phaseMap[agent.role] ?? [];
}

/**
 * Generate the per-phase instruction text for the agent. This goes inside
 * the <instruction> tag in the user message.
 */
export function getInstruction(state: GameState, agent: Player): string {
  const allowed = getAllowedTools(state, agent);
  if (allowed.length === 0) return '当前你不需要行动。';

  switch (state.phase) {
    case 'WEREWOLF_KILL':
      return '请调用 werewolf_kill 投票决定今晚击杀的目标。不能击杀狼队友。每个狼人独立投票，引擎按多数决定。';

    case 'SEER_CHECK':
      return state.day === 1
        ? '请调用 seer_check 查验一名玩家（第一晚不能查自己）。'
        : '请调用 seer_check 查验一名玩家。结果只有你能看到。';

    case 'WITCH_ACTION': {
      const opts: string[] = [];
      if (allowed.includes('witch_heal')) opts.push('witch_heal（使用解药救今晚被狼刀的人）');
      if (allowed.includes('witch_poison')) opts.push('witch_poison（使用毒药毒一名玩家）');
      opts.push('witch_skip（今晚不行动）');
      return `请使用以下工具之一：\n  - ${opts.join('\n  - ')}\n注意：同一晚不能同时救人和毒人。`;
    }

    case 'HUNTER_SHOOT_NIGHT':
    case 'HUNTER_SHOOT_DAY':
      return '你已出局。请调用 hunter_shoot 开枪带走一名玩家；如果不想开枪，target_id 传空字符串 ""。';

    case 'DAY_DISCUSSION':
      return '请调用 speak 发言。\n- content：公开发言（所有人可见）\n- internal_thought：你的内心独白（不会公开，仅用于复盘）';

    case 'DAY_VOTE':
      return "请调用 vote 投票。target_id 是要投出局的玩家 ID，或 'abstain' 表示弃票。不能投自己。";

    default:
      return '请按当前阶段行动。';
  }
}
