import type { DeathRecord, GameState, Player } from '@wfk/shared';
import { RNG } from './rng.js';

export interface NightResolveResult {
  updatedPlayers: Player[];
  deaths: DeathRecord[];
  peaceful: boolean;
}

/**
 * Resolve the night actions into deaths:
 * - Wolf kill applies unless witch healed
 * - Witch poison applies independently
 * - poisonedTonight flag is set on the poisoned player (affects hunter shooting)
 */
export function resolveNight(state: GameState): NightResolveResult {
  const { werewolfTarget, witchHealUsed, witchPoisonTarget } = state.currentNight;
  const deaths: DeathRecord[] = [];

  // Reset poisonedTonight flags before applying this night's poison
  const updatedPlayers = state.players.map((p) => ({ ...p, poisonedTonight: false }));

  if (werewolfTarget && !witchHealUsed) {
    const idx = updatedPlayers.findIndex((p) => p.id === werewolfTarget);
    if (idx >= 0 && updatedPlayers[idx]!.alive) {
      updatedPlayers[idx] = { ...updatedPlayers[idx]!, alive: false };
      deaths.push({
        playerId: werewolfTarget,
        day: state.day,
        phase: 'night',
        cause: 'wolf_kill',
      });
    }
  }

  if (witchPoisonTarget) {
    const idx = updatedPlayers.findIndex((p) => p.id === witchPoisonTarget);
    if (idx >= 0 && updatedPlayers[idx]!.alive) {
      updatedPlayers[idx] = {
        ...updatedPlayers[idx]!,
        alive: false,
        poisonedTonight: true,
      };
      deaths.push({
        playerId: witchPoisonTarget,
        day: state.day,
        phase: 'night',
        cause: 'witch_poison',
      });
    }
  }

  return {
    updatedPlayers,
    deaths,
    peaceful: deaths.length === 0,
  };
}

export interface VoteResolveResult {
  winnerId: string | null;  // null if no votes or tie unresolved
  tied: boolean;
  tally: Record<string, number>;
}

/**
 * Werewolf vote: majority decides. Ties broken by RNG.
 */
export function resolveWerewolfVote(
  votes: Record<string, string>,
  rng: RNG
): VoteResolveResult {
  const tally = computeTally(votes);
  const entries = Object.entries(tally);
  if (entries.length === 0) return { winnerId: null, tied: false, tally };

  const maxVotes = Math.max(...entries.map(([, v]) => v));
  const topTargets = entries.filter(([, v]) => v === maxVotes).map(([k]) => k);

  if (topTargets.length === 1) return { winnerId: topTargets[0]!, tied: false, tally };
  return { winnerId: rng.pick(topTargets), tied: true, tally };
}

/**
 * Day vote: majority is executed. Ties = no execution (MVP rule).
 */
export function resolveDayVote(votes: Record<string, string>): VoteResolveResult {
  const tally = computeTally(votes);
  const entries = Object.entries(tally);
  if (entries.length === 0) return { winnerId: null, tied: false, tally };

  const maxVotes = Math.max(...entries.map(([, v]) => v));
  const topTargets = entries.filter(([, v]) => v === maxVotes).map(([k]) => k);

  if (topTargets.length === 1) return { winnerId: topTargets[0]!, tied: false, tally };
  return { winnerId: null, tied: true, tally };
}

function computeTally(votes: Record<string, string>): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const target of Object.values(votes)) {
    if (target === 'abstain') continue;
    tally[target] = (tally[target] || 0) + 1;
  }
  return tally;
}
