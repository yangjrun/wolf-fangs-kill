import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  findPlayer,
  getAlive,
  getPendingActions,
  progress,
} from '../src/state-machine.js';
import { checkWinCondition, evaluateWinConditions } from '../src/win-condition.js';
import { RNG } from '../src/rng.js';
import { narrationForPhase, PHASE_NARRATION_OPEN } from '@wfk/shared';
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
  if (pending.allowedActionTypes.includes('GUARD_PROTECT')) {
    const last = state.guardState.lastGuarded;
    const target = alive.find((p) => p.id !== last) ?? alive[0]!;
    return { type: 'GUARD_PROTECT', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('CUPID_LINK')) {
    const t1 = others[0] ?? alive[0]!;
    const t2 = others.find((p) => p.id !== t1.id) ?? others[1] ?? alive[1]!;
    return {
      type: 'CUPID_LINK',
      playerId: actor.id,
      target1Id: t1.id,
      target2Id: t2.id,
      reasoning: 'bot',
    };
  }
  if (pending.allowedActionTypes.includes('RUN_FOR_SHERIFF')) {
    // Default bot: skip running (deterministic, simpler tests)
    return { type: 'SKIP_SHERIFF', playerId: actor.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('SHERIFF_VOTE')) {
    const runners = state.sheriffElection?.runners.filter((id) =>
      state.players.find((p) => p.id === id)?.alive,
    ) ?? [];
    return {
      type: 'SHERIFF_VOTE',
      playerId: actor.id,
      targetId: runners[0] ?? 'abstain',
      reasoning: 'bot',
    };
  }
  if (pending.allowedActionTypes.includes('TRANSFER_BADGE')) {
    const candidate = alive.find((p) => p.id !== actor.id);
    if (!candidate) {
      return { type: 'DESTROY_BADGE', playerId: actor.id, reasoning: 'bot' };
    }
    return {
      type: 'TRANSFER_BADGE',
      playerId: actor.id,
      targetId: candidate.id,
      reasoning: 'bot',
    };
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

// ─────────────────────────────────────────────────────────────────────────────
// Guard role tests (Phase 1.1)
// ─────────────────────────────────────────────────────────────────────────────

const GUARD_SEED = 'guard-test-001';

/**
 * Advance the state until it reaches the target phase, applying any non-guard
 * actions via chooseDefaultAction. The guard is left to act manually so tests
 * can drive it deliberately.
 */
function advanceUntilPhase(
  state: GameState,
  target: GameState['phase'],
  options: { autoGuard?: (s: GameState, p: PendingAction) => PlayerAction } = {},
): GameState {
  let s = state;
  for (let i = 0; i < 200; i++) {
    if (s.phase === target) return s;
    if (s.phase === 'GAME_END') throw new Error('Game ended before reaching target phase');
    const { next, pending } = progress(s);
    s = next;
    if (s.phase === target) return s;
    for (const p of pending) {
      const isGuardPending = p.allowedActionTypes.includes('GUARD_PROTECT');
      const action = isGuardPending && options.autoGuard
        ? options.autoGuard(s, p)
        : chooseDefaultAction(s, p);
      const result = applyAction(s, action);
      if (result.error) throw new Error(`Failed to advance: ${result.error.message}`);
      s = result.next;
    }
  }
  throw new Error(`Did not reach ${target} in 200 iterations`);
}

describe('Guard role', () => {
  it('creates a 9-guard board with guard role', () => {
    const state = createGame({ seed: GUARD_SEED, boardId: '9-guard' });
    expect(state.board.id).toBe('9-guard');
    expect(state.players).toHaveLength(9);
    const guards = state.players.filter((p) => p.role === 'guard');
    expect(guards).toHaveLength(1);
    expect(state.guardState.lastGuarded).toBeNull();
  });

  it('first night enters GUARD_PROTECT before WEREWOLF_KILL', () => {
    const initial = createGame({ seed: GUARD_SEED, boardId: '9-guard' });
    const { next, pending } = progress(initial);
    expect(next.phase).toBe('GUARD_PROTECT');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.allowedActionTypes).toEqual(['GUARD_PROTECT']);
  });

  it('cancels the wolf kill when guard protects the wolf target', () => {
    let state = createGame({ seed: GUARD_SEED, boardId: '9-guard' });

    // Drive guard to protect player_1 (regardless of seed).
    state = advanceUntilPhase(state, 'WEREWOLF_KILL', {
      autoGuard: (s, p) => ({
        type: 'GUARD_PROTECT',
        playerId: p.playerId,
        targetId: 'player_1',
        reasoning: 'test',
      }),
    });

    // All wolves vote player_1
    const wolves = state.players.filter((p) => p.role === 'werewolf' && p.alive);
    for (const w of wolves) {
      const r = applyAction(state, {
        type: 'WEREWOLF_KILL',
        playerId: w.id,
        targetId: 'player_1',
        reasoning: 'test',
      });
      state = r.next;
    }

    // Drive through seer + witch (witch skips so no heal interferes)
    state = advanceUntilPhase(state, 'DAY_DISCUSSION');

    const p1 = state.players.find((p) => p.id === 'player_1')!;
    expect(p1.alive).toBe(true);
    const wolfDeaths = state.deathLog.filter((d) => d.cause === 'wolf_kill');
    expect(wolfDeaths).toHaveLength(0);
  });

  it('kills the target when witch heals AND guard protects same target (同守同救)', () => {
    let state = createGame({ seed: GUARD_SEED, boardId: '9-guard' });
    state = advanceUntilPhase(state, 'WEREWOLF_KILL', {
      autoGuard: (s, p) => ({
        type: 'GUARD_PROTECT',
        playerId: p.playerId,
        targetId: 'player_1',
        reasoning: 'test',
      }),
    });

    const wolves = state.players.filter((p) => p.role === 'werewolf' && p.alive);
    for (const w of wolves) {
      const r = applyAction(state, {
        type: 'WEREWOLF_KILL',
        playerId: w.id,
        targetId: 'player_1',
        reasoning: 'test',
      });
      state = r.next;
    }

    // Advance to witch phase, then force witch to heal
    state = advanceUntilPhase(state, 'WITCH_ACTION');
    const witch = state.players.find((p) => p.role === 'witch' && p.alive)!;
    const healResult = applyAction(state, {
      type: 'WITCH_HEAL',
      playerId: witch.id,
      reasoning: 'test',
    });
    expect(healResult.error).toBeUndefined();
    state = healResult.next;

    // Resolve and verify player_1 still died
    state = advanceUntilPhase(state, 'DAY_DISCUSSION');
    const p1 = state.players.find((p) => p.id === 'player_1')!;
    expect(p1.alive).toBe(false);
    const wolfDeaths = state.deathLog.filter(
      (d) => d.playerId === 'player_1' && d.cause === 'wolf_kill',
    );
    expect(wolfDeaths).toHaveLength(1);
  });

  it('rejects guarding the same target two nights in a row', () => {
    const initial = createGame({ seed: GUARD_SEED, boardId: '9-guard' });
    // Advance to first GUARD_PROTECT to capture the live guard player id.
    const { next: atGuardProtect } = progress(initial);
    expect(atGuardProtect.phase).toBe('GUARD_PROTECT');
    const guard = atGuardProtect.players.find((p) => p.role === 'guard')!;

    // Simulate having guarded player_2 last night without running a full night.
    // The validator only depends on guardState.lastGuarded, currentNight, and player aliveness.
    const stateWithLast: GameState = {
      ...atGuardProtect,
      guardState: { lastGuarded: 'player_2' },
    };

    const result = applyAction(stateWithLast, {
      type: 'GUARD_PROTECT',
      playerId: guard.id,
      targetId: 'player_2',
      reasoning: 'try connect-guard',
    });
    expect(result.error?.code).toBe('GUARD_CONSECUTIVE');
  });

  it('runs a full game with guard board without errors', () => {
    let state = createGame({ seed: GUARD_SEED, boardId: '9-guard' });
    let turns = 0;
    const MAX_TURNS = 500;

    while (state.phase !== 'GAME_END' && turns < MAX_TURNS) {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase === 'GAME_END') break;
      for (const p of pending) {
        let action: PlayerAction;
        if (p.allowedActionTypes.includes('GUARD_PROTECT')) {
          // Pick first alive non-last-guarded target
          const last = state.guardState.lastGuarded;
          const target = state.players.find((pp) => pp.alive && pp.id !== last)!;
          action = {
            type: 'GUARD_PROTECT',
            playerId: p.playerId,
            targetId: target.id,
            reasoning: 'bot',
          };
        } else {
          action = chooseDefaultAction(state, p);
        }
        const result = applyAction(state, action);
        if (result.error) {
          throw new Error(`Invalid action: ${result.error.message}`);
        }
        state = result.next;
      }
      turns++;
    }

    expect(state.phase).toBe('GAME_END');
    expect(['wolves', 'villagers']).toContain(state.winner);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Idiot role tests (Phase 1.2)
// ─────────────────────────────────────────────────────────────────────────────

const IDIOT_SEED = 'idiot-test-001';

describe('Idiot role', () => {
  it('creates a 9-idiot board with idiot role + revealed/canVote fields', () => {
    const state = createGame({ seed: IDIOT_SEED, boardId: '9-idiot' });
    expect(state.board.id).toBe('9-idiot');
    const idiots = state.players.filter((p) => p.role === 'idiot');
    expect(idiots).toHaveLength(1);
    expect(state.players.every((p) => p.canVote && !p.revealed)).toBe(true);
  });

  it('reveals (does not kill) idiot when voted out the first time', () => {
    const initial = createGame({ seed: IDIOT_SEED, boardId: '9-idiot' });
    const idiot = initial.players.find((p) => p.role === 'idiot')!;
    // Force state into EXECUTION with executedId = idiot
    const stateAtExecution: GameState = {
      ...initial,
      phase: 'EXECUTION',
      currentDay: { ...initial.currentDay, executedId: idiot.id },
    };
    // Apply phase advance manually via progress (which will run advancePhase
    // since no pending actions exist in EXECUTION).
    const { next, events } = progress(stateAtExecution);

    const updated = next.players.find((p) => p.id === idiot.id)!;
    expect(updated.alive).toBe(true);
    expect(updated.revealed).toBe(true);
    expect(updated.canVote).toBe(false);
    expect(events.some((e) => e.type === 'IDIOT_REVEAL' && e.playerId === idiot.id)).toBe(true);
    // No DEATH event for the idiot
    expect(events.some((e) => e.type === 'DEATH' && e.playerId === idiot.id)).toBe(false);
  });

  it('rejects VOTE action from a revealed idiot', () => {
    const initial = createGame({ seed: IDIOT_SEED, boardId: '9-idiot' });
    const idiot = initial.players.find((p) => p.role === 'idiot')!;
    const target = initial.players.find((p) => p.id !== idiot.id)!;
    const revealedState: GameState = {
      ...initial,
      phase: 'DAY_VOTE',
      players: initial.players.map((p) =>
        p.id === idiot.id ? { ...p, revealed: true, canVote: false } : p,
      ),
    };
    const result = applyAction(revealedState, {
      type: 'VOTE',
      playerId: idiot.id,
      targetId: target.id,
      reasoning: 'try',
    });
    expect(result.error?.code).toBe('NO_VOTE_RIGHTS');
  });

  it('kills idiot normally on a SECOND vote-out (revealed flag already set)', () => {
    const initial = createGame({ seed: IDIOT_SEED, boardId: '9-idiot' });
    const idiot = initial.players.find((p) => p.role === 'idiot')!;
    const stateAtExecution: GameState = {
      ...initial,
      phase: 'EXECUTION',
      currentDay: { ...initial.currentDay, executedId: idiot.id },
      players: initial.players.map((p) =>
        p.id === idiot.id ? { ...p, revealed: true, canVote: false } : p,
      ),
    };
    const { next, events } = progress(stateAtExecution);
    const updated = next.players.find((p) => p.id === idiot.id)!;
    expect(updated.alive).toBe(false);
    expect(events.some((e) => e.type === 'DEATH' && e.playerId === idiot.id)).toBe(true);
  });

  it('runs a full game with idiot board without errors', () => {
    let state = createGame({ seed: IDIOT_SEED, boardId: '9-idiot' });
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
          throw new Error(`Invalid action: ${result.error.message}`);
        }
        state = result.next;
      }
      turns++;
    }

    expect(state.phase).toBe('GAME_END');
    expect(['wolves', 'villagers']).toContain(state.winner);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Knight role tests (Phase 1.3)
// ─────────────────────────────────────────────────────────────────────────────

const KNIGHT_SEED = 'knight-test-001';

/**
 * Drive the engine until DAY_DISCUSSION with the knight as the current speaker,
 * so we can deterministically apply a KNIGHT_DUEL action.
 */
function driveToKnightSpeakingTurn(state: GameState): GameState {
  let s = state;
  const MAX = 300;
  for (let i = 0; i < MAX; i++) {
    if (s.phase === 'GAME_END') throw new Error('Game ended before knight could speak');
    const { next, pending } = progress(s);
    s = next;
    if (s.phase === 'DAY_DISCUSSION' && pending.length > 0) {
      const knight = s.players.find((p) => p.role === 'knight' && p.alive);
      if (knight && pending[0]!.playerId === knight.id) return s;
    }
    for (const p of pending) {
      // Skip the knight's own turn (let the test handle it)
      const actor = s.players.find((pp) => pp.id === p.playerId);
      if (actor?.role === 'knight' && p.allowedActionTypes.includes('KNIGHT_DUEL')) {
        return s;
      }
      const action = chooseDefaultAction(s, p);
      const r = applyAction(s, action);
      if (r.error) throw new Error(`Bot error: ${r.error.message}`);
      s = r.next;
    }
  }
  throw new Error('Did not reach knight speaking turn');
}

describe('Knight role', () => {
  it('creates a 9-knight board with a knight role', () => {
    const state = createGame({ seed: KNIGHT_SEED, boardId: '9-knight' });
    expect(state.board.id).toBe('9-knight');
    const knights = state.players.filter((p) => p.role === 'knight');
    expect(knights).toHaveLength(1);
  });

  it("knight duel: target is wolf → wolf dies, knight stays alive and is revealed", () => {
    let state = createGame({ seed: KNIGHT_SEED, boardId: '9-knight' });
    state = driveToKnightSpeakingTurn(state);
    const knight = state.players.find((p) => p.role === 'knight' && p.alive)!;
    const wolfTarget = state.players.find((p) => p.role === 'werewolf' && p.alive)!;

    const result = applyAction(state, {
      type: 'KNIGHT_DUEL',
      playerId: knight.id,
      targetId: wolfTarget.id,
      reasoning: 'test',
    });
    expect(result.error).toBeUndefined();

    const knightAfter = result.next.players.find((p) => p.id === knight.id)!;
    const wolfAfter = result.next.players.find((p) => p.id === wolfTarget.id)!;
    expect(knightAfter.alive).toBe(true);
    expect(knightAfter.revealed).toBe(true);
    expect(wolfAfter.alive).toBe(false);
    expect(wolfAfter.revealed).toBe(true);
    expect(result.next.deathLog.some((d) => d.playerId === wolfTarget.id && d.cause === 'knight_duel')).toBe(true);
    expect(result.events.some((e) => e.type === 'KNIGHT_DUEL' && e.killedId === wolfTarget.id)).toBe(true);
  });

  it('knight duel: target is non-wolf → knight self-detonates', () => {
    let state = createGame({ seed: KNIGHT_SEED, boardId: '9-knight' });
    state = driveToKnightSpeakingTurn(state);
    const knight = state.players.find((p) => p.role === 'knight' && p.alive)!;
    const goodTarget = state.players.find((p) => p.role === 'villager' && p.alive)!;

    const result = applyAction(state, {
      type: 'KNIGHT_DUEL',
      playerId: knight.id,
      targetId: goodTarget.id,
      reasoning: 'test',
    });
    expect(result.error).toBeUndefined();

    const knightAfter = result.next.players.find((p) => p.id === knight.id)!;
    const targetAfter = result.next.players.find((p) => p.id === goodTarget.id)!;
    expect(knightAfter.alive).toBe(false);
    expect(knightAfter.revealed).toBe(true);
    expect(targetAfter.alive).toBe(true);
    expect(targetAfter.revealed).toBe(true);
    expect(result.next.deathLog.some((d) => d.playerId === knight.id && d.cause === 'knight_duel')).toBe(true);
  });

  it('rejects a second knight duel after the first', () => {
    let state = createGame({ seed: KNIGHT_SEED, boardId: '9-knight' });
    state = driveToKnightSpeakingTurn(state);
    const knight = state.players.find((p) => p.role === 'knight' && p.alive)!;
    const wolf = state.players.find((p) => p.role === 'werewolf' && p.alive)!;

    // First duel: success
    const r1 = applyAction(state, {
      type: 'KNIGHT_DUEL',
      playerId: knight.id,
      targetId: wolf.id,
      reasoning: 'first',
    });
    expect(r1.error).toBeUndefined();
    const stateAfter = r1.next;

    // Find another wolf or any alive target and try a second duel.
    const anyTarget = stateAfter.players.find(
      (p) => p.alive && p.id !== knight.id,
    )!;
    const r2 = applyAction(stateAfter, {
      type: 'KNIGHT_DUEL',
      playerId: knight.id,
      targetId: anyTarget.id,
      reasoning: 'second',
    });
    expect(r2.error?.code).toBe('KNIGHT_ALREADY_DUELED');
  });

  it('runs a full game with knight board without errors', () => {
    let state = createGame({ seed: KNIGHT_SEED, boardId: '9-knight' });
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
          throw new Error(`Invalid action: ${result.error.message}`);
        }
        state = result.next;
      }
      turns++;
    }

    expect(state.phase).toBe('GAME_END');
    expect(['wolves', 'villagers']).toContain(state.winner);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cupid role tests (Phase 1.4)
// ─────────────────────────────────────────────────────────────────────────────

const CUPID_SEED = 'cupid-test-001';

describe('Cupid role', () => {
  it('creates a 9-cupid board with cupid role and loversCrossWin feature', () => {
    const state = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
    expect(state.board.id).toBe('9-cupid');
    expect(state.board.features.loversCrossWin).toBe(true);
    const cupids = state.players.filter((p) => p.role === 'cupid');
    expect(cupids).toHaveLength(1);
    expect(state.lovers).toBeUndefined();
  });

  it('first night enters CUPID_LINK before WEREWOLF_KILL', () => {
    const initial = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
    const { next, pending } = progress(initial);
    expect(next.phase).toBe('CUPID_LINK');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.allowedActionTypes).toEqual(['CUPID_LINK']);
  });

  it('cupid links two lovers; state.lovers is set', () => {
    const initial = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
    const { next } = progress(initial);
    const cupid = next.players.find((p) => p.role === 'cupid')!;
    const result = applyAction(next, {
      type: 'CUPID_LINK',
      playerId: cupid.id,
      target1Id: 'player_1',
      target2Id: 'player_2',
      reasoning: 'test',
    });
    expect(result.error).toBeUndefined();
    expect(result.next.lovers).toEqual(['player_1', 'player_2']);
  });

  it('lover propagation: night wolf-kill of one lover kills the other (broken_heart)', () => {
    const initial = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
    // Set lovers manually + force phase to NIGHT_RESOLVE with a wolf target.
    const state: GameState = {
      ...initial,
      phase: 'NIGHT_RESOLVE',
      lovers: ['player_1', 'player_2'] as const,
      currentNight: {
        werewolfVotes: {},
        werewolfTarget: 'player_1',
        witchHealUsed: false,
        witchSkipped: true,
      },
    };
    const { next } = progress(state);
    const p1 = next.players.find((p) => p.id === 'player_1')!;
    const p2 = next.players.find((p) => p.id === 'player_2')!;
    expect(p1.alive).toBe(false);
    expect(p2.alive).toBe(false);
    expect(next.deathLog.some((d) => d.playerId === 'player_2' && d.cause === 'broken_heart')).toBe(true);
  });

  it('only-lovers-alive: cross-faction lovers win when only they remain', () => {
    const initial = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
    // Find one wolf and one non-wolf to make cross-faction lovers
    const wolf = initial.players.find((p) => p.role === 'werewolf')!;
    const nonWolf = initial.players.find((p) => p.role !== 'werewolf' && p.role !== 'cupid')!;
    const state: GameState = {
      ...initial,
      lovers: [wolf.id, nonWolf.id] as const,
      players: initial.players.map((p) =>
        p.id === wolf.id || p.id === nonWolf.id ? p : { ...p, alive: false },
      ),
    };
    const win = evaluateWinConditions(state, state.board.winConditions);
    expect(win.winner).toBe('lovers');
  });

  it('CUPID_LINK only available on day 1', () => {
    const initial = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
    // Force day=2 with no lovers set, in CUPID_LINK phase
    const stateDay2: GameState = {
      ...initial,
      day: 2,
      phase: 'CUPID_LINK',
    };
    // No pending action because day !== 1
    const pending = getPendingActions(stateDay2);
    expect(pending).toHaveLength(0);
  });

  it('rejects re-linking lovers', () => {
    const initial = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
    const { next } = progress(initial);
    const cupid = next.players.find((p) => p.role === 'cupid')!;
    const stateLinked: GameState = {
      ...next,
      lovers: ['player_3', 'player_4'] as const,
    };
    const result = applyAction(stateLinked, {
      type: 'CUPID_LINK',
      playerId: cupid.id,
      target1Id: 'player_5',
      target2Id: 'player_6',
      reasoning: 'try again',
    });
    expect(result.error?.code).toBe('LOVERS_ALREADY_SET');
  });

  it('runs a full game with cupid board without errors', () => {
    let state = createGame({ seed: CUPID_SEED, boardId: '9-cupid' });
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
          throw new Error(`Invalid action: ${result.error.message}`);
        }
        state = result.next;
      }
      turns++;
    }

    expect(state.phase).toBe('GAME_END');
    expect(['wolves', 'villagers', 'lovers']).toContain(state.winner);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Board variants (12-player, slaughter-side, predefined gods)
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 2 board variants', () => {
  it('12-full: creates 12 players with full god lineup', () => {
    const state = createGame({ seed: 'board-12-full', boardId: '12-full' });
    expect(state.players).toHaveLength(12);
    const counts = state.players.reduce<Record<string, number>>((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    }, {});
    expect(counts.werewolf).toBe(4);
    expect(counts.seer).toBe(1);
    expect(counts.witch).toBe(1);
    expect(counts.hunter).toBe(1);
    expect(counts.guard).toBe(1);
    expect(counts.idiot).toBe(1);
    expect(counts.villager).toBe(3);
  });

  it('12-swhi: creates 12 players with seer/witch/hunter/idiot god set', () => {
    const state = createGame({ seed: 'board-12-swhi', boardId: '12-swhi' });
    expect(state.players).toHaveLength(12);
    const counts = state.players.reduce<Record<string, number>>((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    }, {});
    expect(counts.werewolf).toBe(4);
    expect(counts.seer).toBe(1);
    expect(counts.witch).toBe(1);
    expect(counts.hunter).toBe(1);
    expect(counts.idiot).toBe(1);
    expect(counts.guard ?? 0).toBe(0);
    expect(counts.villager).toBe(4);
  });

  it('9-slaughter: wolves win immediately after all gods are dead (without needing villagers dead)', () => {
    const initial = createGame({ seed: 'slaughter-test', boardId: '9-slaughter' });
    // Kill all gods (seer/witch/hunter), keep villagers alive
    const killed = initial.players.map((p) =>
      ['seer', 'witch', 'hunter'].includes(p.role) ? { ...p, alive: false } : p,
    );
    const test: GameState = { ...initial, players: killed };
    const win = evaluateWinConditions(test, test.board.winConditions);
    expect(win.winner).toBe('wolves');
    // Villagers are still alive — slaughter rule fires
    expect(test.players.filter((p) => p.alive && p.role === 'villager')).toHaveLength(3);
  });

  it('9-slaughter: wolves also win when all villagers dead even with gods alive', () => {
    const initial = createGame({ seed: 'slaughter-test', boardId: '9-slaughter' });
    const killed = initial.players.map((p) =>
      p.role === 'villager' ? { ...p, alive: false } : p,
    );
    const test: GameState = { ...initial, players: killed };
    const win = evaluateWinConditions(test, test.board.winConditions);
    expect(win.winner).toBe('wolves');
  });

  it('runs a full game on 12-full board', () => {
    let state = createGame({ seed: '12-full-game', boardId: '12-full' });
    let turns = 0;
    const MAX_TURNS = 500;
    while (state.phase !== 'GAME_END' && turns < MAX_TURNS) {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase === 'GAME_END') break;
      for (const p of pending) {
        const action = chooseDefaultAction(state, p);
        const result = applyAction(state, action);
        if (result.error) throw new Error(`Invalid action: ${result.error.message}`);
        state = result.next;
      }
      turns++;
    }
    expect(state.phase).toBe('GAME_END');
  });

  it('runs a full game on 12-swhi board', () => {
    let state = createGame({ seed: '12-swhi-game', boardId: '12-swhi' });
    let turns = 0;
    const MAX_TURNS = 500;
    while (state.phase !== 'GAME_END' && turns < MAX_TURNS) {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase === 'GAME_END') break;
      for (const p of pending) {
        const action = chooseDefaultAction(state, p);
        const result = applyAction(state, action);
        if (result.error) throw new Error(`Invalid action: ${result.error.message}`);
        state = result.next;
      }
      turns++;
    }
    expect(state.phase).toBe('GAME_END');
  });

  it('runs a full game on 9-slaughter board', () => {
    let state = createGame({ seed: '9-slaughter-game', boardId: '9-slaughter' });
    let turns = 0;
    const MAX_TURNS = 500;
    while (state.phase !== 'GAME_END' && turns < MAX_TURNS) {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase === 'GAME_END') break;
      for (const p of pending) {
        const action = chooseDefaultAction(state, p);
        const result = applyAction(state, action);
        if (result.error) throw new Error(`Invalid action: ${result.error.message}`);
        state = result.next;
      }
      turns++;
    }
    expect(state.phase).toBe('GAME_END');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2.4: Sheriff system (election + 1.5 vote weight + badge transfer)
// ─────────────────────────────────────────────────────────────────────────────

const SHERIFF_SEED = 'sheriff-test-001';

/** Test bot variant: half of players run for sheriff so vote phase has runners. */
function chooseActionWithSheriffRun(state: GameState, pending: PendingAction): PlayerAction {
  if (pending.allowedActionTypes.includes('RUN_FOR_SHERIFF')) {
    // Even-numbered seats run; odd skip.
    const actor = findPlayer(state, pending.playerId)!;
    if (actor.seat % 2 === 0) {
      return {
        type: 'RUN_FOR_SHERIFF',
        playerId: actor.id,
        content: '我能带领大家找狼。',
        internalThought: 'bot run',
      };
    }
    return { type: 'SKIP_SHERIFF', playerId: actor.id, reasoning: 'bot skip' };
  }
  return chooseDefaultAction(state, pending);
}

describe('Sheriff system', () => {
  it('creates a 12-sheriff board with features.sheriff=true', () => {
    const state = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    expect(state.board.features.sheriff).toBe(true);
    expect(state.players).toHaveLength(12);
    expect(state.sheriff).toEqual({ playerId: null, badgeDestroyed: false });
  });

  it('GAME_START transitions to SHERIFF_RUNNING_FOR when sheriff feature enabled', () => {
    const initial = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    const { next, pending } = progress(initial);
    expect(next.phase).toBe('SHERIFF_RUNNING_FOR');
    expect(pending.length).toBe(12);
    expect(
      pending.every((p) =>
        p.allowedActionTypes.includes('RUN_FOR_SHERIFF') &&
        p.allowedActionTypes.includes('SKIP_SHERIFF'),
      ),
    ).toBe(true);
  });

  it('skips election entirely if nobody runs', () => {
    let state = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    // All skip
    while (state.phase === 'GAME_START' || state.phase === 'SHERIFF_RUNNING_FOR') {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase !== 'SHERIFF_RUNNING_FOR') break;
      for (const p of pending) {
        const result = applyAction(state, {
          type: 'SKIP_SHERIFF',
          playerId: p.playerId,
          reasoning: 'test',
        });
        state = result.next;
      }
    }
    // Skipped election should advance straight to NIGHT_START
    expect(state.sheriff.playerId).toBeNull();
    expect(state.phase).not.toBe('SHERIFF_VOTE');
  });

  it('elects a sheriff via vote and sets sheriff.playerId', () => {
    let state = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    let safety = 0;
    while (state.phase !== 'NIGHT_START' && safety++ < 100) {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase === 'NIGHT_START' || state.phase === 'GAME_END') break;
      for (const p of pending) {
        const action = chooseActionWithSheriffRun(state, p);
        const result = applyAction(state, action);
        if (result.error) throw new Error(`Invalid: ${result.error.message}`);
        state = result.next;
      }
    }
    // Sheriff election ran. Sheriff should be elected (some even-seat player).
    expect(state.sheriff.playerId).toBeTruthy();
    expect(state.sheriffElection).toBeUndefined();
  });

  it('sheriff vote weight is 1.5 in day vote', () => {
    // Construct a state with sheriff set and ALL 12 players' votes recorded.
    // 3 voters for A (incl. sheriff @ 1.5) vs 3 voters for B (no sheriff) →
    // without weight: tied (3-3, no execution). With weight: A wins (3.5-3).
    const initial = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    const sheriffId = 'player_1';
    const targetA = 'player_5';
    const targetB = 'player_6';
    const state: GameState = {
      ...initial,
      phase: 'DAY_VOTE',
      sheriff: { playerId: sheriffId, badgeDestroyed: false },
      currentDay: {
        speechOrder: [],
        speeches: [],
        votes: {
          player_1: targetA,   // sheriff (1.5)
          player_2: targetA,   // 1
          player_3: targetA,   // 1
          player_4: targetB,   // 1
          player_5: 'abstain', // target itself
          player_6: 'abstain', // target itself
          player_7: targetB,   // 1
          player_8: targetB,   // 1
          player_9: 'abstain',
          player_10: 'abstain',
          player_11: 'abstain',
          player_12: 'abstain',
        },
      },
    };
    // All players have voted → advancePhase runs DAY_VOTE → EXECUTION.
    const { next } = progress(state);
    expect(next.currentDay.executedId).toBe(targetA);
  });

  it('triggers badge transfer when sheriff dies (vote execution)', () => {
    const initial = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    const sheriffId = 'player_1';
    const state: GameState = {
      ...initial,
      phase: 'EXECUTION',
      sheriff: { playerId: sheriffId, badgeDestroyed: false },
      currentDay: {
        speechOrder: [],
        speeches: [],
        votes: {},
        executedId: sheriffId,
      },
    };
    const { next, pending } = progress(state);
    expect(next.phase).toBe('SHERIFF_BADGE_TRANSFER');
    expect(next.pendingBadgeTransfer?.sheriffId).toBe(sheriffId);
    expect(pending[0]?.playerId).toBe(sheriffId);
    expect(pending[0]?.allowedActionTypes).toContain('TRANSFER_BADGE');
    expect(pending[0]?.allowedActionTypes).toContain('DESTROY_BADGE');
  });

  it('TRANSFER_BADGE assigns new sheriff and resumes flow', () => {
    const initial = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    const oldSheriff = 'player_1';
    const newSheriff = 'player_2';
    const state: GameState = {
      ...initial,
      phase: 'SHERIFF_BADGE_TRANSFER',
      sheriff: { playerId: oldSheriff, badgeDestroyed: false },
      players: initial.players.map((p) =>
        p.id === oldSheriff ? { ...p, alive: false } : p,
      ),
      pendingBadgeTransfer: { sheriffId: oldSheriff, resumeTo: 'NIGHT_START' },
      currentDay: { speechOrder: [], speeches: [], votes: {} },
    };
    const result = applyAction(state, {
      type: 'TRANSFER_BADGE',
      playerId: oldSheriff,
      targetId: newSheriff,
      reasoning: 'test',
    });
    expect(result.error).toBeUndefined();
    expect(result.next.sheriff.playerId).toBe(newSheriff);
    expect(result.next.sheriff.badgeDestroyed).toBe(false);
    expect(result.next.pendingBadgeTransfer?.resolved).toBe(true);
  });

  it('DESTROY_BADGE sets badgeDestroyed=true and clears sheriff', () => {
    const initial = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    const oldSheriff = 'player_1';
    const state: GameState = {
      ...initial,
      phase: 'SHERIFF_BADGE_TRANSFER',
      sheriff: { playerId: oldSheriff, badgeDestroyed: false },
      players: initial.players.map((p) =>
        p.id === oldSheriff ? { ...p, alive: false } : p,
      ),
      pendingBadgeTransfer: { sheriffId: oldSheriff, resumeTo: 'NIGHT_START' },
      currentDay: { speechOrder: [], speeches: [], votes: {} },
    };
    const result = applyAction(state, {
      type: 'DESTROY_BADGE',
      playerId: oldSheriff,
      reasoning: 'test',
    });
    expect(result.error).toBeUndefined();
    expect(result.next.sheriff).toEqual({ playerId: null, badgeDestroyed: true });
  });

  it('runs a full game on 12-sheriff board with sheriff election', () => {
    let state = createGame({ seed: SHERIFF_SEED, boardId: '12-sheriff' });
    let turns = 0;
    const MAX_TURNS = 500;
    while (state.phase !== 'GAME_END' && turns < MAX_TURNS) {
      const { next, pending } = progress(state);
      state = next;
      if (state.phase === 'GAME_END') break;
      for (const p of pending) {
        const action = chooseActionWithSheriffRun(state, p);
        const result = applyAction(state, action);
        if (result.error) throw new Error(`Invalid: ${result.error.message}`);
        state = result.next;
      }
      turns++;
    }
    expect(state.phase).toBe('GAME_END');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Narration (text-only checks; speech synthesis is browser-only)
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 3 narration constants', () => {
  it('provides narration for night opening phases', () => {
    expect(narrationForPhase('NIGHT_START')).toContain('天黑');
    expect(narrationForPhase('WEREWOLF_KILL')).toContain('狼人');
    expect(narrationForPhase('SEER_CHECK')).toContain('预言家');
    expect(narrationForPhase('WITCH_ACTION')).toContain('女巫');
  });

  it('provides narration for sheriff phases', () => {
    expect(narrationForPhase('SHERIFF_RUNNING_FOR')).toContain('警长');
    expect(narrationForPhase('SHERIFF_VOTE')).toContain('警长');
    expect(narrationForPhase('SHERIFF_BADGE_TRANSFER')).toContain('警徽');
  });

  it('returns undefined for unmapped phases', () => {
    expect(narrationForPhase('GAME_START')).toBeUndefined();
    expect(narrationForPhase('GAME_END')).toBeUndefined();
  });

  it('PHASE_NARRATION_OPEN covers all gameplay phases', () => {
    // Sanity: any phase commonly encountered in a game has narration.
    const required = [
      'NIGHT_START',
      'WEREWOLF_KILL',
      'SEER_CHECK',
      'WITCH_ACTION',
      'NIGHT_RESOLVE',
      'DAY_DISCUSSION',
      'DAY_VOTE',
    ] as const;
    for (const phase of required) {
      expect(PHASE_NARRATION_OPEN[phase]).toBeTruthy();
    }
  });
});
