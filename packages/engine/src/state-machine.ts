import type {
  DayActions,
  DeathRecord,
  GameConfig,
  GameEvent,
  GameState,
  NightActions,
  PendingAction,
  Phase,
  Player,
  PlayerAction,
  Role,
  SeerRecord,
} from '@wfk/shared';
import { PHASE_ORDER, ROLE_COUNTS_9P, TOTAL_PLAYERS } from '@wfk/shared';

import { RNG } from './rng.js';
import { resolveDayVote, resolveNight, resolveWerewolfVote } from './resolver.js';
import { checkWinCondition } from './win-condition.js';
import { ValidationError, validateAction } from './validators.js';

// ─────────────────────────────────────────────────────────────────────────────
// Construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new game with random role assignment driven by the config seed.
 * Personas are NOT assigned here — that's a UI/AI-layer concern.
 */
export function createGame(config: GameConfig): GameState {
  const rng = new RNG(config.seed);

  const roleList: Role[] = [];
  for (const [role, count] of Object.entries(ROLE_COUNTS_9P)) {
    for (let i = 0; i < count; i++) roleList.push(role as Role);
  }
  const shuffled = rng.shuffle(roleList);

  const players: Player[] = Array.from({ length: TOTAL_PLAYERS }, (_, i) => ({
    id: `player_${i + 1}`,
    seat: i + 1,
    role: shuffled[i] as Role,
    alive: true,
    isHuman: config.humanPlayerId === `player_${i + 1}`,
    displayName: `Player ${i + 1}`,
    poisonedTonight: false,
  }));

  const emptyNight: NightActions = {
    werewolfVotes: {},
    witchHealUsed: false,
    witchSkipped: false,
  };
  const emptyDay: DayActions = {
    speechOrder: [],
    speeches: [],
    votes: {},
  };

  return {
    config,
    day: 1,
    phase: 'GAME_START',
    players,
    witchState: { hasHeal: true, hasPoison: true },
    seerRecords: [],
    currentNight: emptyNight,
    currentDay: emptyDay,
    deathLog: [],
    publicLog: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getAlive(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

export function findPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function getRng(state: GameState, salt: string): RNG {
  return new RNG(`${state.config.seed}|day${state.day}|${salt}`);
}

function eventBase(state: GameState): { timestamp: number; day: number; phase: string } {
  return { timestamp: Date.now(), day: state.day, phase: state.phase };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending actions: who needs to act in current phase
// ─────────────────────────────────────────────────────────────────────────────

export function getPendingActions(state: GameState): PendingAction[] {
  if (state.winner) return [];
  const alive = getAlive(state);

  switch (state.phase) {
    case 'WEREWOLF_KILL': {
      const wolves = alive.filter((p) => p.role === 'werewolf');
      return wolves
        .filter((w) => !(w.id in state.currentNight.werewolfVotes))
        .map((w) => ({
          playerId: w.id,
          allowedActionTypes: ['WEREWOLF_KILL' as const],
          instruction: '请投票决定今晚击杀的目标。',
        }));
    }
    case 'SEER_CHECK': {
      const seer = alive.find((p) => p.role === 'seer');
      if (!seer) return [];
      if (state.currentNight.seerCheckTarget) return [];
      return [
        {
          playerId: seer.id,
          allowedActionTypes: ['SEER_CHECK'],
          instruction: '请选择一名玩家查验其阵营。第一晚不能查自己。',
        },
      ];
    }
    case 'WITCH_ACTION': {
      const witch = alive.find((p) => p.role === 'witch');
      if (!witch) return [];
      const acted =
        state.currentNight.witchHealUsed ||
        state.currentNight.witchPoisonTarget ||
        state.currentNight.witchSkipped;
      if (acted) return [];
      const allowed: PendingAction['allowedActionTypes'] = ['WITCH_SKIP'];
      if (state.witchState.hasHeal && state.currentNight.werewolfTarget) {
        // Cannot self-heal after day 1
        const canSelfHeal =
          state.day === 1 || state.currentNight.werewolfTarget !== witch.id;
        if (canSelfHeal) allowed.push('WITCH_HEAL');
      }
      if (state.witchState.hasPoison) allowed.push('WITCH_POISON');
      return [
        {
          playerId: witch.id,
          allowedActionTypes: allowed,
          instruction: '你可以使用解药/毒药/或跳过。同一晚不能同时使用解药和毒药。',
        },
      ];
    }
    case 'HUNTER_SHOOT_NIGHT':
    case 'HUNTER_SHOOT_DAY': {
      const hunterId = state.pendingHunterShoot;
      if (!hunterId) return [];
      return [
        {
          playerId: hunterId,
          allowedActionTypes: ['HUNTER_SHOOT'],
          instruction: '你已出局，可以选择带走一名玩家，或不开枪。',
        },
      ];
    }
    case 'DAY_DISCUSSION': {
      const idx = state.currentDay.speeches.length;
      const speakerId = state.currentDay.speechOrder[idx];
      if (!speakerId) return [];
      const speaker = findPlayer(state, speakerId);
      if (!speaker || !speaker.alive) return [];
      return [
        {
          playerId: speakerId,
          allowedActionTypes: ['SPEAK'],
          instruction: '请发表你的看法。',
        },
      ];
    }
    case 'DAY_VOTE': {
      return alive
        .filter((p) => !(p.id in state.currentDay.votes))
        .map((p) => ({
          playerId: p.id,
          allowedActionTypes: ['VOTE' as const],
          instruction: '请投票决定谁出局，或弃票（abstain）。',
        }));
    }
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply a single PlayerAction
// ─────────────────────────────────────────────────────────────────────────────

export interface ApplyResult {
  next: GameState;
  events: GameEvent[];
  error?: ValidationError;
}

export function applyAction(state: GameState, action: PlayerAction): ApplyResult {
  const err = validateAction(state, action);
  if (err) return { next: state, events: [], error: err };

  const events: GameEvent[] = [];
  let next: GameState = state;

  switch (action.type) {
    case 'WEREWOLF_KILL': {
      next = {
        ...state,
        currentNight: {
          ...state.currentNight,
          werewolfVotes: {
            ...state.currentNight.werewolfVotes,
            [action.playerId]: action.targetId,
          },
        },
      };
      events.push({
        ...eventBase(state),
        type: 'WEREWOLF_VOTE',
        voterId: action.playerId,
        targetId: action.targetId,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'SEER_CHECK': {
      const target = findPlayer(state, action.targetId)!;
      const result: 'good' | 'wolf' = target.role === 'werewolf' ? 'wolf' : 'good';
      const record: SeerRecord = {
        day: state.day,
        targetId: action.targetId,
        result,
      };
      next = {
        ...state,
        currentNight: {
          ...state.currentNight,
          seerCheckTarget: action.targetId,
          seerCheckResult: result,
        },
        seerRecords: [...state.seerRecords, record],
      };
      events.push({
        ...eventBase(state),
        type: 'SEER_CHECK',
        checkerId: action.playerId,
        targetId: action.targetId,
        result,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'WITCH_HEAL': {
      next = {
        ...state,
        currentNight: { ...state.currentNight, witchHealUsed: true },
        witchState: {
          ...state.witchState,
          hasHeal: false,
          ...(state.currentNight.werewolfTarget
            ? { usedHealOn: state.currentNight.werewolfTarget }
            : {}),
        },
      };
      events.push({
        ...eventBase(state),
        type: 'WITCH_HEAL',
        witchId: action.playerId,
        targetId: state.currentNight.werewolfTarget!,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'WITCH_POISON': {
      next = {
        ...state,
        currentNight: { ...state.currentNight, witchPoisonTarget: action.targetId },
        witchState: {
          ...state.witchState,
          hasPoison: false,
          usedPoisonOn: action.targetId,
        },
      };
      events.push({
        ...eventBase(state),
        type: 'WITCH_POISON',
        witchId: action.playerId,
        targetId: action.targetId,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'WITCH_SKIP': {
      next = {
        ...state,
        currentNight: { ...state.currentNight, witchSkipped: true },
      };
      events.push({
        ...eventBase(state),
        type: 'WITCH_SKIP',
        witchId: action.playerId,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'HUNTER_SHOOT': {
      const additionalDeaths: DeathRecord[] = [];
      let updatedPlayers = state.players;
      if (action.targetId !== null) {
        updatedPlayers = state.players.map((p) =>
          p.id === action.targetId ? { ...p, alive: false } : p
        );
        additionalDeaths.push({
          playerId: action.targetId,
          day: state.day,
          phase: 'day',  // hunter shoots are always resolved in day-time bookkeeping
          cause: 'hunter_shot',
          killerId: action.playerId,
        });
      }
      next = {
        ...state,
        players: updatedPlayers,
        deathLog: [...state.deathLog, ...additionalDeaths],
        pendingHunterShoot: undefined,
      };
      events.push({
        ...eventBase(state),
        type: 'HUNTER_SHOOT',
        hunterId: action.playerId,
        targetId: action.targetId,
        reasoning: action.reasoning,
      });
      if (action.targetId) {
        events.push({
          ...eventBase(state),
          type: 'DEATH',
          playerId: action.targetId,
          cause: 'hunter_shot',
          killerId: action.playerId,
        });
      }
      break;
    }
    case 'SPEAK': {
      const speech = {
        playerId: action.playerId,
        content: action.content,
        internalThought: action.internalThought,
        day: state.day,
      };
      next = {
        ...state,
        currentDay: {
          ...state.currentDay,
          speeches: [...state.currentDay.speeches, speech],
        },
        publicLog: [...state.publicLog, speech],
      };
      events.push({
        ...eventBase(state),
        type: 'SPEAK',
        playerId: action.playerId,
        content: action.content,
        internalThought: action.internalThought,
      });
      break;
    }
    case 'VOTE': {
      next = {
        ...state,
        currentDay: {
          ...state.currentDay,
          votes: {
            ...state.currentDay.votes,
            [action.playerId]: action.targetId,
          },
        },
      };
      events.push({
        ...eventBase(state),
        type: 'VOTE',
        voterId: action.playerId,
        targetId: action.targetId,
        reasoning: action.reasoning,
      });
      break;
    }
    default: {
      const _: never = action;
      void _;
    }
  }

  return { next, events };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase advancement (engine-controlled, no external input)
// ─────────────────────────────────────────────────────────────────────────────

interface AdvanceResult {
  next: GameState;
  events: GameEvent[];
}

function transition(state: GameState, to: Phase): AdvanceResult {
  const events: GameEvent[] = [
    {
      type: 'PHASE_TRANSITION',
      timestamp: Date.now(),
      day: state.day,
      phase: state.phase,
      from: state.phase,
      to,
    },
  ];
  return { next: { ...state, phase: to }, events };
}

/**
 * Resolve any in-progress phase that has collected all required input and
 * move to the next phase. Returns new state + events generated.
 */
function advancePhase(state: GameState): AdvanceResult {
  const events: GameEvent[] = [];
  let s = state;

  switch (s.phase) {
    case 'GAME_START': {
      events.push({
        type: 'GAME_START',
        timestamp: Date.now(),
        day: s.day,
        phase: s.phase,
        players: s.players.map((p) => ({
          id: p.id,
          seat: p.seat,
          role: p.role,
          isHuman: p.isHuman,
          ...(p.personaId ? { personaId: p.personaId } : {}),
        })),
      });
      const t = transition(s, 'NIGHT_START');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'NIGHT_START': {
      // Reset night state for the new night
      s = {
        ...s,
        currentNight: { werewolfVotes: {}, witchHealUsed: false, witchSkipped: false },
        // Reset poisonedTonight (will be set again if witch poisons this night)
        players: s.players.map((p) => ({ ...p, poisonedTonight: false })),
      };
      const t = transition(s, 'WEREWOLF_KILL');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'WEREWOLF_KILL': {
      // All wolves have voted — resolve majority
      const rng = getRng(s, 'wolf-vote');
      const result = resolveWerewolfVote(s.currentNight.werewolfVotes, rng);
      s = {
        ...s,
        currentNight: {
          ...s.currentNight,
          ...(result.winnerId ? { werewolfTarget: result.winnerId } : {}),
        },
      };
      if (result.winnerId) {
        events.push({
          type: 'WEREWOLF_KILL_DECIDED',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          targetId: result.winnerId,
        });
      }
      const t = transition(s, 'SEER_CHECK');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'SEER_CHECK': {
      // Either seer is alive and has acted, or seer is dead — move on
      const t = transition(s, 'WITCH_ACTION');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'WITCH_ACTION': {
      const t = transition(s, 'NIGHT_RESOLVE');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'NIGHT_RESOLVE': {
      const { updatedPlayers, deaths, peaceful } = resolveNight(s);
      s = {
        ...s,
        players: updatedPlayers,
        deathLog: [...s.deathLog, ...deaths],
      };
      if (peaceful) {
        events.push({
          type: 'PEACEFUL_NIGHT',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
        });
      }
      for (const d of deaths) {
        events.push({
          type: 'DEATH',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          playerId: d.playerId,
          cause: d.cause,
        });
      }
      const t = transition(s, 'DAY_ANNOUNCE');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'DAY_ANNOUNCE': {
      // Check win condition first
      const win = checkWinCondition(s);
      if (win.winner) {
        s = { ...s, phase: 'GAME_END', winner: win.winner, endReason: win.reason };
        events.push({
          type: 'GAME_END',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          winner: win.winner,
          reason: win.reason,
        });
        return { next: s, events };
      }

      // Check if the hunter died tonight (and not by poison) → trigger HUNTER_SHOOT_NIGHT
      const recentNightDeaths = s.deathLog.filter(
        (d) => d.day === s.day && d.phase === 'night'
      );
      const hunterDeath = recentNightDeaths.find((d) => {
        const p = findPlayer(s, d.playerId);
        return p?.role === 'hunter' && d.cause !== 'witch_poison';
      });
      if (hunterDeath) {
        s = { ...s, pendingHunterShoot: hunterDeath.playerId };
        const t = transition(s, 'HUNTER_SHOOT_NIGHT');
        return { next: t.next, events: [...events, ...t.events] };
      }

      // Set up speaking order for today (start from a random alive player, seat order)
      const alive = getAlive(s);
      if (alive.length === 0) {
        // No one alive — should have hit win condition above
        s = { ...s, phase: 'GAME_END', winner: 'wolves', endReason: '所有玩家已死' };
        return { next: s, events };
      }
      const rng = getRng(s, 'speech-order');
      const startSeat = rng.int(0, alive.length - 1);
      const speechOrder = [...alive.slice(startSeat), ...alive.slice(0, startSeat)].map(
        (p) => p.id
      );
      s = {
        ...s,
        currentDay: { speechOrder, speeches: [], votes: {} },
      };
      const t = transition(s, 'DAY_DISCUSSION');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'HUNTER_SHOOT_NIGHT': {
      // After hunter has shot, continue to day discussion
      // Check win condition first
      const win = checkWinCondition(s);
      if (win.winner) {
        s = { ...s, phase: 'GAME_END', winner: win.winner, endReason: win.reason };
        events.push({
          type: 'GAME_END',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          winner: win.winner,
          reason: win.reason,
        });
        return { next: s, events };
      }
      const alive = getAlive(s);
      const rng = getRng(s, 'speech-order');
      const startSeat = rng.int(0, alive.length - 1);
      const speechOrder = [...alive.slice(startSeat), ...alive.slice(0, startSeat)].map(
        (p) => p.id
      );
      s = { ...s, currentDay: { speechOrder, speeches: [], votes: {} } };
      const t = transition(s, 'DAY_DISCUSSION');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'DAY_DISCUSSION': {
      // All speeches done — go to vote
      const t = transition(s, 'DAY_VOTE');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'DAY_VOTE': {
      const result = resolveDayVote(s.currentDay.votes);
      s = {
        ...s,
        currentDay: {
          ...s.currentDay,
          ...(result.winnerId ? { executedId: result.winnerId } : {}),
        },
      };
      const t = transition(s, 'EXECUTION');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'EXECUTION': {
      const executedId = s.currentDay.executedId;
      if (executedId) {
        const executed = findPlayer(s, executedId);
        s = {
          ...s,
          players: s.players.map((p) =>
            p.id === executedId ? { ...p, alive: false } : p
          ),
          deathLog: [
            ...s.deathLog,
            { playerId: executedId, day: s.day, phase: 'day', cause: 'vote' },
          ],
        };
        events.push({
          type: 'EXECUTION',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          targetId: executedId,
        });
        events.push({
          type: 'DEATH',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          playerId: executedId,
          cause: 'vote',
        });

        // If executed is hunter (and not poisoned), trigger HUNTER_SHOOT_DAY
        if (executed?.role === 'hunter' && !executed.poisonedTonight) {
          s = { ...s, pendingHunterShoot: executedId };
          const t = transition(s, 'HUNTER_SHOOT_DAY');
          return { next: t.next, events: [...events, ...t.events] };
        }
      }
      // Check win
      const win = checkWinCondition(s);
      if (win.winner) {
        s = { ...s, phase: 'GAME_END', winner: win.winner, endReason: win.reason };
        events.push({
          type: 'GAME_END',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          winner: win.winner,
          reason: win.reason,
        });
        return { next: s, events };
      }
      // Next day
      s = { ...s, day: s.day + 1 };
      const t = transition(s, 'NIGHT_START');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'HUNTER_SHOOT_DAY': {
      const win = checkWinCondition(s);
      if (win.winner) {
        s = { ...s, phase: 'GAME_END', winner: win.winner, endReason: win.reason };
        events.push({
          type: 'GAME_END',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          winner: win.winner,
          reason: win.reason,
        });
        return { next: s, events };
      }
      s = { ...s, day: s.day + 1 };
      const t = transition(s, 'NIGHT_START');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'GAME_END':
      return { next: s, events };

    default: {
      const _: never = s.phase;
      void _;
      return { next: s, events };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public engine driver: progress until external input is needed (or game ends)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgressResult {
  next: GameState;
  events: GameEvent[];
  pending: PendingAction[];
}

const MAX_ITERATIONS = 100;  // safety against infinite loops

export function progress(state: GameState): ProgressResult {
  let current = state;
  const events: GameEvent[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (current.phase === 'GAME_END') {
      return { next: current, events, pending: [] };
    }

    const pending = getPendingActions(current);
    if (pending.length > 0) {
      return { next: current, events, pending };
    }

    const { next, events: stepEvents } = advancePhase(current);
    events.push(...stepEvents);
    if (next === current) {
      // No progress — bug guard
      return { next: current, events, pending: [] };
    }
    current = next;
  }

  throw new Error(`Engine looped ${MAX_ITERATIONS} times without producing pending actions`);
}

// Export for testing
export { advancePhase as _advancePhaseForTest };
