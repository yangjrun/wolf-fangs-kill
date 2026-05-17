import type { Faction, GameState, Role, WinCondition } from '@wfk/shared';
import { GOD_ROLES } from '@wfk/shared';

export interface WinCheckResult {
  winner: Faction | null;
  reason: string;
}

interface ConditionMatch {
  faction: Faction;
  reason: string;
}

function matchCondition(state: GameState, condition: WinCondition): ConditionMatch | null {
  const alive = state.players.filter((p) => p.alive);
  const aliveWolves = alive.filter((p) => p.role === 'werewolf');
  const aliveGods = alive.filter((p) => GOD_ROLES.has(p.role));
  const aliveVillagers = alive.filter((p) => p.role === 'villager');

  switch (condition.type) {
    case 'all-wolves-dead':
      return aliveWolves.length === 0
        ? { faction: condition.faction, reason: '所有狼人已死亡' }
        : null;
    case 'all-gods-dead':
      return aliveGods.length === 0
        ? { faction: condition.faction, reason: '屠神：所有神职已死亡' }
        : null;
    case 'all-villagers-dead':
      return aliveVillagers.length === 0
        ? { faction: condition.faction, reason: '屠民：所有平民已死亡' }
        : null;
    case 'either-gods-or-villagers-dead':
      if (aliveGods.length === 0) {
        return { faction: condition.faction, reason: '屠边（神）：所有神职已死亡' };
      }
      if (aliveVillagers.length === 0) {
        return { faction: condition.faction, reason: '屠边（民）：所有平民已死亡' };
      }
      return null;
    case 'only-lovers-alive': {
      if (!state.lovers) return null;
      const [a, b] = state.lovers;
      const aliveIds = new Set(alive.map((p) => p.id));
      // Both lovers alive AND exactly the only two alive players
      if (alive.length === 2 && aliveIds.has(a) && aliveIds.has(b)) {
        return { faction: condition.faction, reason: '只剩情侣双方存活：跨阵营情侣胜利' };
      }
      return null;
    }
    default: {
      const _exhaustive: never = condition;
      void _exhaustive;
      return null;
    }
  }
}

/**
 * Evaluate the board's configured win conditions in order. The first match
 * decides the game. Returns `winner: null` when the game should continue.
 */
export function evaluateWinConditions(
  state: GameState,
  conditions: readonly WinCondition[],
): WinCheckResult {
  for (const condition of conditions) {
    const match = matchCondition(state, condition);
    if (match) return { winner: match.faction, reason: match.reason };
  }
  return { winner: null, reason: '游戏继续' };
}

/**
 * Backward-compatible wrapper that reads win conditions from the embedded
 * board config on the GameState.
 */
export function checkWinCondition(state: GameState): WinCheckResult {
  return evaluateWinConditions(state, state.board.winConditions);
}

/** Count alive players grouped by role. */
export function countAliveByRole(state: GameState): Record<Role, number> {
  const counts: Record<Role, number> = {
    werewolf: 0,
    seer: 0,
    witch: 0,
    hunter: 0,
    guard: 0,
    idiot: 0,
    knight: 0,
    cupid: 0,
    villager: 0,
  };
  for (const p of state.players) {
    if (p.alive) counts[p.role]++;
  }
  return counts;
}
