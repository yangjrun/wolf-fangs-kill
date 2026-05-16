import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  findPlayer,
  getAlive,
  getPendingActions,
  progress,
} from '../src/state-machine.js';
import { checkWinCondition } from '../src/win-condition.js';
import { RNG } from '../src/rng.js';
import type { GameState, PendingAction, PlayerAction } from '@wfk/shared';

const TEST_SEED = 'test-seed-001';

describe('createGame', () => {
  it('creates 9 players with the correct role distribution', () => {
    const state = createGame({ seed: TEST_SEED });
    expect(state.players).toHaveLength(9);

    const roleCounts = state.players.reduce<Record<string, number>>((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    }, {});

    expect(roleCounts.werewolf).toBe(3);
    expect(roleCounts.seer).toBe(1);
    expect(roleCounts.witch).toBe(1);
    expect(roleCounts.hunter).toBe(1);
    expect(roleCounts.villager).toBe(3);
  });

  it('is deterministic given the same seed', () => {
    const s1 = createGame({ seed: TEST_SEED });
    const s2 = createGame({ seed: TEST_SEED });
    expect(s1.players.map((p) => p.role)).toEqual(s2.players.map((p) => p.role));
  });

  it('marks the human player correctly', () => {
    const state = createGame({ seed: TEST_SEED, humanPlayerId: 'player_3' });
    expect(state.players.find((p) => p.id === 'player_3')?.isHuman).toBe(true);
    expect(state.players.filter((p) => p.isHuman)).toHaveLength(1);
  });

  it('starts in GAME_START phase on day 1 with full witch potions', () => {
    const state = createGame({ seed: TEST_SEED });
    expect(state.phase).toBe('GAME_START');
    expect(state.day).toBe(1);
    expect(state.witchState.hasHeal).toBe(true);
    expect(state.witchState.hasPoison).toBe(true);
  });
});

describe('progress', () => {
  it('advances from GAME_START to WEREWOLF_KILL on first call', () => {
    const initial = createGame({ seed: TEST_SEED });
    const { next, pending } = progress(initial);
    expect(next.phase).toBe('WEREWOLF_KILL');
    expect(pending.length).toBe(3);  // 3 wolves
    expect(pending.every((p) => p.allowedActionTypes.includes('WEREWOLF_KILL'))).toBe(true);
  });
});

describe('RNG', () => {
  it('is deterministic given the same seed', () => {
    const r1 = new RNG('abc');
    const r2 = new RNG('abc');
    for (let i = 0; i < 10; i++) {
      expect(r1.next()).toBe(r2.next());
    }
  });

  it('shuffles arrays without dropping elements', () => {
    const rng = new RNG('xyz');
    const result = rng.shuffle([1, 2, 3, 4, 5]);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// A simple deterministic bot strategy that picks the first legal action.
// Used to drive full-game integration tests.
// ─────────────────────────────────────────────────────────────────────────────

function chooseDefaultAction(state: GameState, pending: PendingAction): PlayerAction {
  const actor = findPlayer(state, pending.playerId)!;
  const alive = getAlive(state);
  const others = alive.filter((p) => p.id !== actor.id);

  if (pending.allowedActionTypes.includes('WEREWOLF_KILL')) {
    const target = alive.find((p) => p.role !== 'werewolf')!;
    return {
      type: 'WEREWOLF_KILL',
      playerId: actor.id,
      targetId: target.id,
      reasoning: 'bot',
    };
  }
  if (pending.allowedActionTypes.includes('SEER_CHECK')) {
    // Day 1: cannot check self. Pick first non-self alive.
    const target = others[0] ?? alive[0]!;
    return { type: 'SEER_CHECK', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('WITCH_SKIP')) {
    return { type: 'WITCH_SKIP', playerId: actor.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('HUNTER_SHOOT')) {
    return { type: 'HUNTER_SHOOT', playerId: actor.id, targetId: null, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('SPEAK')) {
    return {
      type: 'SPEAK',
      playerId: actor.id,
      content: '我没什么发现。',
      internalThought: 'bot',
    };
  }
  if (pending.allowedActionTypes.includes('VOTE')) {
    if (others.length === 0) {
      return { type: 'VOTE', playerId: actor.id, targetId: 'abstain', reasoning: 'bot' };
    }
    return {
      type: 'VOTE',
      playerId: actor.id,
      targetId: others[0]!.id,
      reasoning: 'bot',
    };
  }
  throw new Error(`No action chosen for ${pending.playerId}`);
}

describe('Full game integration', () => {
  it('runs to completion within a reasonable number of turns', () => {
    let state = createGame({ seed: TEST_SEED });
    let turns = 0;
    const MAX_TURNS = 500;

    while (state.phase !== 'GAME_END' && turns < MAX_TURNS) {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase === 'GAME_END') break;
      for (const p of pending) {
        const action = chooseDefaultAction(state, p);
        const result = applyAction(state, action);
        if (result.error) {
          throw new Error(`Bot generated invalid action: ${result.error.message}`);
        }
        state = result.next;
      }
      turns++;
    }

    expect(state.phase).toBe('GAME_END');
    expect(state.winner).toBeDefined();
    expect(['wolves', 'villagers']).toContain(state.winner);
    expect(turns).toBeLessThan(MAX_TURNS);
  });

  it('produces consistent winners with the same seed', () => {
    const runs = ['seed-A', 'seed-B', 'seed-C'].map((seed) => {
      let state = createGame({ seed });
      let turns = 0;
      while (state.phase !== 'GAME_END' && turns < 500) {
        const { next, pending } = progress(state);
        state = next;
        if (state.phase === 'GAME_END') break;
        for (const p of pending) {
          const action = chooseDefaultAction(state, p);
          state = applyAction(state, action).next;
        }
        turns++;
      }
      return state.winner;
    });

    // Re-run with the same seeds, should match
    const runs2 = ['seed-A', 'seed-B', 'seed-C'].map((seed) => {
      let state = createGame({ seed });
      let turns = 0;
      while (state.phase !== 'GAME_END' && turns < 500) {
        const { next, pending } = progress(state);
        state = next;
        if (state.phase === 'GAME_END') break;
        for (const p of pending) {
          const action = chooseDefaultAction(state, p);
          state = applyAction(state, action).next;
        }
        turns++;
      }
      return state.winner;
    });

    expect(runs).toEqual(runs2);
  });
});

describe('Win conditions', () => {
  it('villagers win when all wolves are dead', () => {
    const state = createGame({ seed: TEST_SEED });
    const killed = state.players.map((p) =>
      p.role === 'werewolf' ? { ...p, alive: false } : p
    );
    const test: GameState = { ...state, players: killed };
    expect(checkWinCondition(test).winner).toBe('villagers');
  });

  it('wolves win on tu-shen (all gods dead)', () => {
    const state = createGame({ seed: TEST_SEED });
    const killed = state.players.map((p) => {
      if (p.role === 'seer' || p.role === 'witch' || p.role === 'hunter') {
        return { ...p, alive: false };
      }
      return p;
    });
    const test: GameState = { ...state, players: killed };
    expect(checkWinCondition(test).winner).toBe('wolves');
  });

  it('wolves win on tu-min (all villagers dead)', () => {
    const state = createGame({ seed: TEST_SEED });
    const killed = state.players.map((p) =>
      p.role === 'villager' ? { ...p, alive: false } : p
    );
    const test: GameState = { ...state, players: killed };
    expect(checkWinCondition(test).winner).toBe('wolves');
  });

  it('returns null when game should continue', () => {
    const state = createGame({ seed: TEST_SEED });
    expect(checkWinCondition(state).winner).toBeNull();
  });
});

describe('Action validation', () => {
  it('rejects WEREWOLF_KILL targeting a teammate', () => {
    const state = createGame({ seed: TEST_SEED });
    const { next } = progress(state);
    const wolves = next.players.filter((p) => p.role === 'werewolf');
    const wolfA = wolves[0]!;
    const wolfB = wolves[1]!;
    const result = applyAction(next, {
      type: 'WEREWOLF_KILL',
      playerId: wolfA.id,
      targetId: wolfB.id,
      reasoning: 'test',
    });
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('KILL_TEAMMATE');
  });

  it('rejects seer checking self on day 1', () => {
    const state = createGame({ seed: TEST_SEED });
    // Advance to SEER_CHECK by applying all wolf votes
    let s = state;
    let pending: PendingAction[] = [];
    do {
      const result = progress(s);
      s = result.next;
      pending = result.pending;
      if (s.phase === 'WEREWOLF_KILL') {
        const wolves = s.players.filter((p) => p.role === 'werewolf' && p.alive);
        const victim = s.players.find((p) => p.role !== 'werewolf' && p.alive)!;
        for (const w of wolves) {
          const r = applyAction(s, {
            type: 'WEREWOLF_KILL',
            playerId: w.id,
            targetId: victim.id,
            reasoning: 'test',
          });
          s = r.next;
        }
      } else {
        break;
      }
    } while (s.phase !== 'SEER_CHECK');

    const seer = s.players.find((p) => p.role === 'seer')!;
    const result = applyAction(s, {
      type: 'SEER_CHECK',
      playerId: seer.id,
      targetId: seer.id,
      reasoning: 'test',
    });
    expect(result.error?.code).toBe('CHECK_SELF_DAY_1');
  });
});
