import type { Difficulty, GameState, Player } from '@wfk/shared';
import { DIFFICULTY_OBSCURE_TEAMMATES, ROLE_NAMES_ZH } from '@wfk/shared';

/**
 * Build the private-info text that goes into <private_info> for a given agent.
 * This is what ONLY this agent should know — teammates, check results, etc.
 *
 * CRITICAL: never include another agent's private info here. If you see
 * something that doesn't belong to this agent's perspective, that's a bug.
 *
 * Difficulty modulates how much information is exposed. In hard mode, wolves
 * see only a numeric hint about their teammates' seats instead of explicit ids.
 */
export function buildPrivateInfo(
  state: GameState,
  agent: Player,
  difficulty: Difficulty = 'normal',
): string {
  const lines: string[] = [`你是【${ROLE_NAMES_ZH[agent.role]}】（${agent.id}）。`];
  const obscureMates = DIFFICULTY_OBSCURE_TEAMMATES[difficulty];

  switch (agent.role) {
    case 'werewolf': {
      const teammates = state.players.filter(
        (p) => p.role === 'werewolf' && p.id !== agent.id
      );
      const aliveMates = teammates.filter((p) => p.alive);
      const deadMates = teammates.filter((p) => !p.alive);
      if (obscureMates && aliveMates.length > 0) {
        // Hard mode: give a structural hint instead of explicit ids.
        const seatSum = aliveMates.reduce((acc, p) => acc + p.seat, 0);
        const seatCount = aliveMates.length;
        lines.push(
          `你的狼队友（存活）：${seatCount} 位，座位号之和为 ${seatSum}。你必须通过夜间投票/白天默契推断具体身份。`,
        );
      } else if (aliveMates.length > 0) {
        lines.push(`你的狼队友（存活）：${aliveMates.map((t) => t.id).join(', ')}`);
      }
      if (deadMates.length > 0) {
        // Dead teammates are public knowledge; show them regardless of difficulty.
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
    case 'guard': {
      const last = state.guardState.lastGuarded;
      if (last) {
        lines.push(`你上一晚守护的目标：${last}（今晚不能再守同一人）。`);
      } else {
        lines.push('你还没有守护过任何人（第一晚无连守限制）。');
      }
      break;
    }
    case 'idiot': {
      if (agent.revealed) {
        lines.push('⚠ 你已经翻牌为白痴，免疫此后所有投票出局，但失去了投票权。');
      } else {
        lines.push('你还没翻牌。被投出局时会自动翻牌：免死但失去投票权。');
      }
      break;
    }
    case 'knight': {
      if (agent.revealed) {
        lines.push('⚠ 你已经发动过决斗，技能已用尽。');
      } else {
        lines.push('你的决斗技能尚未使用（每局仅一次）。');
      }
      break;
    }
    case 'cupid': {
      if (state.lovers) {
        lines.push(`你已经连接情侣：${state.lovers[0]} ❤ ${state.lovers[1]}`);
      } else {
        lines.push('你尚未连接情侣（首夜可使用 cupid_link 选择两位玩家结为情侣）。');
      }
      break;
    }
    case 'villager': {
      lines.push('你是普通平民，没有特殊技能或私密信息。');
      break;
    }
  }

  // Cross-cutting: cupid-linked lovers see their partner regardless of role.
  if (state.lovers && agent.role !== 'cupid') {
    const [a, b] = state.lovers;
    if (agent.id === a || agent.id === b) {
      const partner = agent.id === a ? b : a;
      const partnerPlayer = state.players.find((p) => p.id === partner);
      const partnerRole = partnerPlayer ? ROLE_NAMES_ZH[partnerPlayer.role] : '?';
      lines.push(`❤ 你是丘比特连接的情侣之一。你的伴侣：${partner}（${partnerRole}）。`);
      lines.push('  规则：一方死亡另一方殉情；跨阵营情侣只剩你们俩存活时共同获胜。');
    }
  }

  // Cross-cutting: sheriff badge holder is public info.
  if (state.sheriff.playerId) {
    if (state.sheriff.playerId === agent.id) {
      lines.push('🎖 你当前持有警徽（1.5 票权重，死亡可传递或撕毁）。');
    } else {
      lines.push(`🎖 当前警长：${state.sheriff.playerId}（1.5 票权重）。`);
    }
  } else if (state.sheriff.badgeDestroyed) {
    lines.push('🎖 警徽已被撕毁，本局后续无警长。');
  }

  return lines.join('\n');
}
