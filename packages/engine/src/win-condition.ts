import type { Faction, GameState, Role } from '@wfk/shared';
import { GOD_ROLES } from '@wfk/shared';

export interface WinCheckResult {
  winner: Faction | null;
  reason: string;
}

/**
 * Check win condition for 9-player board (3 wolves + 3 gods + 3 villagers, no badge):
 * - Wolves win if all gods are dead (屠神) OR all villagers are dead (屠民)
 * - Villagers win if all wolves are dead
 */
export function checkWinCondition(state: GameState): WinCheckResult {
  const alive = state.players.filter((p) => p.alive);

  const aliveWolves = alive.filter((p) => p.role === 'werewolf');
  const aliveGods = alive.filter((p) => GOD_ROLES.has(p.role));
  const aliveVillagers = alive.filter((p) => p.role === 'villager');

  if (aliveWolves.length === 0) {
    return { winner: 'villagers', reason: '所有狼人已死亡' };
  }
  if (aliveGods.length === 0) {
    return { winner: 'wolves', reason: '屠神：所有神职已死亡' };
  }
  if (aliveVillagers.length === 0) {
    return { winner: 'wolves', reason: '屠民：所有平民已死亡' };
  }

  return { winner: null, reason: '游戏继续' };
}

/** Count alive players grouped by role. */
export function countAliveByRole(state: GameState): Record<Role, number> {
  const counts: Record<Role, number> = {
    werewolf: 0,
    seer: 0,
    witch: 0,
    hunter: 0,
    villager: 0,
  };
  for (const p of state.players) {
    if (p.alive) counts[p.role]++;
  }
  return counts;
}
