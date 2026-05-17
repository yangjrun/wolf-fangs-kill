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
 *
 * For any action that takes a target_id we list the exact set of legal target
 * IDs inline. The engine validator will reject anything else, so giving the
 * model a hard whitelist here is the cheapest way to keep it from picking
 * dead players, teammates, or itself.
 */
export function getInstruction(state: GameState, agent: Player): string {
  const allowed = getAllowedTools(state, agent);
  if (allowed.length === 0) return '当前你不需要行动。';

  const aliveIds = state.players.filter((p) => p.alive).map((p) => p.id);
  const aliveExceptSelf = aliveIds.filter((id) => id !== agent.id);

  switch (state.phase) {
    case 'SHERIFF_RUNNING_FOR': {
      return [
        '你可以选择参选警长（调用 run_for_sheriff，附上竞选发言）或放弃（调用 skip_sheriff）。',
        '警长拥有 1.5 票权重，是好人重要资源；狼人也可上警伪装好人。',
      ].join('\n');
    }
    case 'SHERIFF_VOTE': {
      const election = state.sheriffElection;
      const runners = election?.runners ?? [];
      const aliveRunners = runners.filter((id) =>
        state.players.find((p) => p.id === id)?.alive,
      );
      return [
        '请调用 sheriff_vote 投票给一名上警玩家，或 "abstain" 弃票。',
        `target_id 必须是以下上警玩家之一：${aliveRunners.join(', ') || '（无）'}`,
        '上警的玩家不能投自己。',
      ].join('\n');
    }
    case 'SHERIFF_BADGE_TRANSFER': {
      const candidates = aliveExceptSelf;
      return [
        '你作为警长已出局，请做出最后选择：',
        `  - transfer_badge：将警徽传给一位存活玩家（target_id 必须是以下之一：${candidates.join(', ') || '（无）'}）`,
        '  - destroy_badge：撕毁警徽，本局后续无警长',
      ].join('\n');
    }
    case 'CUPID_LINK': {
      const targets = aliveIds;
      return [
        '请调用 cupid_link 选择两名玩家结为情侣（首夜专属，仅此一次）。',
        `target1_id 和 target2_id 必须各是以下存活玩家之一，且不能相同：${targets.join(', ') || '（无）'}`,
        '选择策略：跨阵营情侣可形成新阵营（只剩两情侣时共同获胜）；同阵营情侣则强化联盟。你也可以选择自己 + 某人。',
      ].join('\n');
    }
    case 'GUARD_PROTECT': {
      const lastGuarded = state.guardState.lastGuarded;
      const targets = aliveIds.filter((id) => id !== lastGuarded);
      return [
        '请调用 guard_protect 守护一名玩家。被守的人今晚免狼刀。',
        `target_id 必须是以下存活玩家之一：${targets.join(', ') || '（无）'}`,
        ...(lastGuarded ? [`不能再守上一晚守过的玩家（${lastGuarded}）。`] : []),
        '注意：若被守的玩家同时被女巫救，会触发"同守同救"导致目标仍然死亡。',
      ].join('\n');
    }

    case 'WEREWOLF_KILL': {
      const targets = state.players
        .filter((p) => p.alive && p.role !== 'werewolf')
        .map((p) => p.id);
      return [
        '请调用 werewolf_kill 投票决定今晚击杀的目标。',
        `target_id 必须是以下存活非狼玩家之一：${targets.join(', ') || '（无）'}`,
        '每个狼人独立投票，引擎按多数决定；严禁刀狼队友。',
      ].join('\n');
    }

    case 'SEER_CHECK': {
      const baseTargets =
        state.day === 1 ? aliveExceptSelf : aliveIds;
      return [
        '请调用 seer_check 查验一名玩家。结果只有你能看到。',
        `target_id 必须是以下存活玩家之一：${baseTargets.join(', ') || '（无）'}`,
        ...(state.day === 1 ? ['第一晚不能查自己。'] : []),
      ].join('\n');
    }

    case 'WITCH_ACTION': {
      const opts: string[] = [];
      if (allowed.includes('witch_heal')) opts.push('witch_heal（使用解药救今晚被狼刀的人）');
      if (allowed.includes('witch_poison'))
        opts.push(
          `witch_poison（毒一名玩家；target_id 必须是以下之一：${
            aliveExceptSelf.join(', ') || '（无）'
          }；不能毒自己）`
        );
      opts.push('witch_skip（今晚不行动）');
      return [
        '请使用以下工具之一：',
        ...opts.map((o) => `  - ${o}`),
        '注意：同一晚不能同时救人和毒人。',
      ].join('\n');
    }

    case 'HUNTER_SHOOT_NIGHT':
    case 'HUNTER_SHOOT_DAY':
      return [
        '你已出局。请调用 hunter_shoot。',
        `target_id 必须是以下存活玩家之一：${aliveExceptSelf.join(', ') || '（无）'}`,
        '如果不想开枪，target_id 传空字符串 ""。',
      ].join('\n');

    case 'DAY_DISCUSSION': {
      if (allowed.includes('knight_duel')) {
        const dueltargets = aliveExceptSelf;
        return [
          '你是骑士，且尚未使用决斗。你可以选择：',
          '  - 调用 speak 正常发言（content 公开 + internal_thought 内心独白）',
          `  - 调用 knight_duel 向某人发起决斗（target_id 必须是以下存活玩家之一：${
            dueltargets.join(', ') || '（无）'
          }）。`,
          '决斗即翻牌：对方是狼则狼死，否则你自爆。决斗代替本回合发言，仅能用一次。',
        ].join('\n');
      }
      return '请调用 speak 发言。\n- content：公开发言（所有人可见）\n- internal_thought：你的内心独白（不会公开，仅用于复盘）';
    }

    case 'DAY_VOTE':
      return [
        '请调用 vote 投票。',
        `target_id 必须是以下存活玩家之一：${
          aliveExceptSelf.join(', ') || '（无）'
        }，或 "abstain" 表示弃票。不能投自己，不能投已出局的玩家。`,
      ].join('\n');

    default:
      return '请按当前阶段行动。';
  }
}
