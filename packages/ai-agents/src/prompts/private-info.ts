import type { GameState, Player } from '@wfk/shared';
import { ROLE_NAMES_ZH } from '@wfk/shared';

/**
 * Build the private-info text that goes into <private_info> for a given agent.
 * This is what ONLY this agent should know — teammates, check results, etc.
 *
 * CRITICAL: never include another agent's private info here. If you see
 * something that doesn't belong to this agent's perspective, that's a bug.
 */
export function buildPrivateInfo(state: GameState, agent: Player): string {
  const lines: string[] = [`你是【${ROLE_NAMES_ZH[agent.role]}】（${agent.id}）。`];

  switch (agent.role) {
    case 'werewolf': {
      const teammates = state.players.filter(
        (p) => p.role === 'werewolf' && p.id !== agent.id
      );
      const aliveMates = teammates.filter((p) => p.alive);
      const deadMates = teammates.filter((p) => !p.alive);
      if (aliveMates.length > 0) {
        lines.push(`你的狼队友（存活）：${aliveMates.map((t) => t.id).join(', ')}`);
      }
      if (deadMates.length > 0) {
        lines.push(`已阵亡的狼队友：${deadMates.map((t) => t.id).join(', ')}`);
      }
      if (teammates.length === 0) {
        lines.push('你是唯一存活的狼人（队友全亡）。');
      }
      break;
    }
    case 'seer': {
      if (state.seerRecords.length > 0) {
        lines.push('你的查验记录：');
        for (const r of state.seerRecords) {
          const label = r.result === 'wolf' ? '【狼人】' : '【好人】';
          lines.push(`  - 第 ${r.day} 晚 查 ${r.targetId} → ${label}`);
        }
      } else {
        lines.push('你还没有查验过任何玩家。');
      }
      break;
    }
    case 'witch': {
      const heal = state.witchState.hasHeal ? '【未使用】' : '【已使用】';
      const poison = state.witchState.hasPoison ? '【未使用】' : '【已使用】';
      lines.push(`你的药水：解药 ${heal}，毒药 ${poison}`);
      if (state.phase === 'WITCH_ACTION' && state.currentNight.werewolfTarget) {
        lines.push(`今晚被狼刀的玩家：${state.currentNight.werewolfTarget}`);
      }
      break;
    }
    case 'hunter': {
      if (agent.poisonedTonight) {
        lines.push('⚠ 你被女巫毒了。死亡时无法开枪。');
      } else {
        lines.push('你目前未被毒。死亡时可以开枪带走一名玩家。');
      }
      break;
    }
    case 'villager': {
      lines.push('你是普通平民，没有特殊技能或私密信息。');
      break;
    }
  }

  return lines.join('\n');
}
