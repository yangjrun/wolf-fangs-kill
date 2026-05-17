import type { DeathRecord, GameState, Player } from '@wfk/shared';
import { RNG } from './rng.js';

export interface NightResolveResult {
  updatedPlayers: Player[];
  deaths: DeathRecord[];
  peaceful: boolean;
}

/**
 * If one of the cupid-linked lovers is among the newly dead, the surviving
 * partner dies of a broken heart. Returns the updated player list and the
 * extra death record. Idempotent if no lover is dying or both already dead.
 */
export function propagateLoverDeath(
  state: GameState,
  players: readonly Player[],
  newlyDeadIds: readonly string[],
  killPhase: 'night' | 'day',
): { players: Player[]; extraDeaths: DeathRecord[] } {
  if (!state.lovers) return { players: [...players], extraDeaths: [] };
  const [a, b] = state.lovers;
  const dyingLover = newlyDeadIds.includes(a)
    ? a
    : newlyDeadIds.includes(b)
      ? b
      : null;
  if (!dyingLover) return { players: [...players], extraDeaths: [] };
  const other = dyingLover === a ? b : a;
  const otherPlayer = players.find((p) => p.id === other);
  if (!otherPlayer || !otherPlayer.alive || newlyDeadIds.includes(other)) {
    return { players: [...players], extraDeaths: [] };
  }
  return {
    players: players.map((p) =>
      p.id === other ? { ...p, alive: false } : p,
    ),
    extraDeaths: [
      {
        playerId: other,
        day: state.day,
        phase: killPhase,
        cause: 'broken_heart',
      },
    ],
  };
}

/**
 * Resolve the night actions into deaths:
 * - Wolf kill applies unless witch healed OR guard protected the same target.
 * - But if BOTH the witch heals AND the guard protects the wolf target on the
 *   same night (经典"同守同救"), the two effects cancel and the target dies.
 * - Witch poison applies independently.
 * - poisonedTonight flag is set on the poisoned player (affects hunter shooting).
 * - If a cupid-linked lover dies, the partner dies of a broken heart.
 */
export function resolveNight(state: GameState): NightResolveResult {
  const { werewolfTarget, witchHealUsed, witchPoisonTarget, guardTarget } = state.currentNight;
  const deaths: DeathRecord[] = [];

  // Reset poisonedTonight flags before applying this night's poison
  let updatedPlayers = state.players.map((p) => ({ ...p, poisonedTonight: false }));

  if (werewolfTarget) {
    const guardSaved = guardTarget !== undefined && guardTarget === werewolfTarget;
    const healed = witchHealUsed;
    // Both protections on the same target cancel each other (同守同救 → death).
    const cancelled = (guardSaved || healed) && !(guardSaved && healed);

    if (!cancelled) {
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

  // Propagate broken-heart deaths from any lover that died this night.
  const propag = propagateLoverDeath(
    state,
    updatedPlayers,
    deaths.map((d) => d.playerId),
    'night',
  );
  updatedPlayers = propag.players;
  deaths.push(...propag.extraDeaths);

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
 * Sheriff election: same rules as werewolf vote (majority, RNG ties). Empty
 * votes / all-abstain means no sheriff is elected.
 */
export function resolveSheriffVote(
  votes: Record<string, string>,
  rng: RNG,
): VoteResolveResult {
  return resolveWerewolfVote(votes, rng);
}

/**
 * Day vote: majority is executed. Ties = no execution.
 * Sheriff (if alive) contributes 1.5 votes; everyone else 1.0.
 */
export function resolveDayVote(
  votes: Record<string, string>,
  sheriffId?: string | null,
): VoteResolveResult {
  const tally: Record<string, number> = {};
  for (const [voterId, target] of Object.entries(votes)) {
    if (target === 'abstain') continue;
    const weight = sheriffId && voterId === sheriffId ? 1.5 : 1.0;
    tally[target] = (tally[target] ?? 0) + weight;
  }
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
