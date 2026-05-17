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
import { getBoard } from '@wfk/shared';

import { RNG } from './rng.js';
import {
  propagateLoverDeath,
  resolveDayVote,
  resolveNight,
  resolveSheriffVote,
  resolveWerewolfVote,
} from './resolver.js';
import { evaluateWinConditions } from './win-condition.js';
import { ValidationError, validateAction } from './validators.js';

// ─────────────────────────────────────────────────────────────────────────────
// Construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new game with random role assignment driven by the config seed.
 * Personas are NOT assigned here — that's a UI/AI-layer concern.
 */
export function createGame(config: GameConfig): GameState {
  const board = getBoard(config.boardId);
  const rng = new RNG(config.seed);

  const shuffled = rng.shuffle([...board.roles]);
  if (shuffled.length !== board.totalPlayers) {
    throw new Error(
      `Board ${board.id} role list length (${shuffled.length}) does not match totalPlayers (${board.totalPlayers})`,
    );
  }

  const players: Player[] = Array.from({ length: board.totalPlayers }, (_, i) => ({
    id: `player_${i + 1}`,
    seat: i + 1,
    role: shuffled[i] as Role,
    alive: true,
    isHuman: config.humanPlayerId === `player_${i + 1}`,
    displayName: `Player ${i + 1}`,
    poisonedTonight: false,
    canVote: true,
    revealed: false,
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
    board,
    day: 1,
    phase: 'GAME_START',
    players,
    witchState: { hasHeal: true, hasPoison: true },
    guardState: { lastGuarded: null },
    sheriff: { playerId: null, badgeDestroyed: false },
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
    case 'SHERIFF_RUNNING_FOR': {
      const election = state.sheriffElection;
      if (!election) return [];
      return alive
        .filter((p) => !(p.id in election.decisions))
        .map((p) => ({
          playerId: p.id,
          allowedActionTypes: ['RUN_FOR_SHERIFF' as const, 'SKIP_SHERIFF' as const],
          instruction: '请选择是否参选警长。参选需附上竞选发言。',
        }));
    }
    case 'SHERIFF_VOTE': {
      const election = state.sheriffElection;
      if (!election) return [];
      // Non-runners vote for one of the runners
      return alive
        .filter((p) => !election.runners.includes(p.id) && !(p.id in election.votes))
        .map((p) => ({
          playerId: p.id,
          allowedActionTypes: ['SHERIFF_VOTE' as const],
          instruction: '请为一名上警玩家投票（或弃票）。',
        }));
    }
    case 'SHERIFF_BADGE_TRANSFER': {
      const pending = state.pendingBadgeTransfer;
      if (!pending || pending.resolved) return [];
      return [
        {
          playerId: pending.sheriffId,
          allowedActionTypes: ['TRANSFER_BADGE', 'DESTROY_BADGE'],
          instruction: '你作为警长已出局，可以将警徽传给一名存活玩家，或撕毁警徽。',
        },
      ];
    }
    case 'CUPID_LINK': {
      if (state.lovers) return [];
      if (state.day !== 1) return [];
      const cupid = alive.find((p) => p.role === 'cupid');
      if (!cupid) return [];
      return [
        {
          playerId: cupid.id,
          allowedActionTypes: ['CUPID_LINK'],
          instruction: '请选择两名玩家结为情侣（仅首夜可用）。',
        },
      ];
    }
    case 'GUARD_PROTECT': {
      const guard = alive.find((p) => p.role === 'guard');
      if (!guard) return [];
      if (state.currentNight.guardTarget) return [];
      const lastGuarded = state.guardState.lastGuarded;
      const note = lastGuarded
        ? `不能再守上一晚守过的玩家（${lastGuarded}）。`
        : '第一晚无连守限制。';
      return [
        {
          playerId: guard.id,
          allowedActionTypes: ['GUARD_PROTECT'],
          instruction: `请选择今晚守护的目标。${note}`,
        },
      ];
    }
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
      const allowedActionTypes: PendingAction['allowedActionTypes'] = ['SPEAK'];
      // Knight may use the one-shot duel ability in place of speaking.
      if (speaker.role === 'knight' && !speaker.revealed) {
        allowedActionTypes.push('KNIGHT_DUEL');
      }
      return [
        {
          playerId: speakerId,
          allowedActionTypes,
          instruction:
            speaker.role === 'knight' && !speaker.revealed
              ? '请发表你的看法，或调用 knight_duel 向某人发起决斗（每局仅一次）。'
              : '请发表你的看法。',
        },
      ];
    }
    case 'DAY_VOTE': {
      return alive
        .filter((p) => p.canVote && !(p.id in state.currentDay.votes))
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
    case 'GUARD_PROTECT': {
      next = {
        ...state,
        currentNight: { ...state.currentNight, guardTarget: action.targetId },
      };
      events.push({
        ...eventBase(state),
        type: 'GUARD_PROTECT',
        guardId: action.playerId,
        targetId: action.targetId,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'KNIGHT_DUEL': {
      const target = findPlayer(state, action.targetId)!;
      const targetIsWolf = target.role === 'werewolf';
      const killedId = targetIsWolf ? action.targetId : action.playerId;
      const survivorVerb = targetIsWolf ? '决斗胜利' : '决斗失败';
      const summary = targetIsWolf
        ? `我作为骑士向 ${action.targetId} 发起决斗 — 决斗胜利，对方是狼人。`
        : `我作为骑士向 ${action.targetId} 发起决斗 — 决斗失败，对方不是狼人，我自爆出局。`;

      const playersAfterDuel = state.players.map((p) => {
        if (p.id === action.playerId || p.id === action.targetId) {
          return { ...p, revealed: true, ...(p.id === killedId ? { alive: false } : {}) };
        }
        return p;
      });

      const primaryDeath: DeathRecord = {
        playerId: killedId,
        day: state.day,
        phase: 'day',
        cause: 'knight_duel',
        ...(killedId === action.targetId ? { killerId: action.playerId } : {}),
      };

      // Propagate lover death if the killed person had a partner.
      const propag = propagateLoverDeath(state, playersAfterDuel, [killedId], 'day');
      const allDeaths = [primaryDeath, ...propag.extraDeaths];

      const syntheticSpeech = {
        playerId: action.playerId,
        content: summary,
        internalThought: action.reasoning,
        day: state.day,
      };

      next = {
        ...state,
        players: propag.players,
        deathLog: [...state.deathLog, ...allDeaths],
        currentDay: {
          ...state.currentDay,
          speeches: [...state.currentDay.speeches, syntheticSpeech],
        },
        publicLog: [...state.publicLog, syntheticSpeech],
      };
      events.push({
        ...eventBase(state),
        type: 'KNIGHT_DUEL',
        knightId: action.playerId,
        targetId: action.targetId,
        targetRole: target.role,
        killedId,
        reasoning: action.reasoning,
      });
      events.push({
        ...eventBase(state),
        type: 'DEATH',
        playerId: killedId,
        cause: 'knight_duel',
        ...(killedId === action.targetId ? { killerId: action.playerId } : {}),
      });
      for (const d of propag.extraDeaths) {
        events.push({
          ...eventBase(state),
          type: 'DEATH',
          playerId: d.playerId,
          cause: 'broken_heart',
        });
      }
      events.push({
        ...eventBase(state),
        type: 'SPEAK',
        playerId: action.playerId,
        content: summary,
        internalThought: `${survivorVerb}：${action.reasoning}`,
      });
      break;
    }
    case 'CUPID_LINK': {
      next = {
        ...state,
        lovers: [action.target1Id, action.target2Id] as const,
      };
      events.push({
        ...eventBase(state),
        type: 'CUPID_LINK',
        cupidId: action.playerId,
        target1Id: action.target1Id,
        target2Id: action.target2Id,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'RUN_FOR_SHERIFF': {
      const election = state.sheriffElection ?? {
        runners: [],
        speeches: {},
        decisions: {},
        votes: {},
      };
      const campaignSpeech = {
        playerId: action.playerId,
        content: action.content,
        internalThought: action.internalThought,
        day: state.day,
      };
      next = {
        ...state,
        sheriffElection: {
          ...election,
          runners: [...election.runners, action.playerId],
          speeches: { ...election.speeches, [action.playerId]: action.content },
          decisions: { ...election.decisions, [action.playerId]: 'run' },
        },
        publicLog: [...state.publicLog, campaignSpeech],
      };
      events.push({
        ...eventBase(state),
        type: 'SHERIFF_RUN',
        runnerId: action.playerId,
        content: action.content,
        internalThought: action.internalThought,
      });
      break;
    }
    case 'SKIP_SHERIFF': {
      const election = state.sheriffElection ?? {
        runners: [],
        speeches: {},
        decisions: {},
        votes: {},
      };
      next = {
        ...state,
        sheriffElection: {
          ...election,
          decisions: { ...election.decisions, [action.playerId]: 'skip' },
        },
      };
      events.push({
        ...eventBase(state),
        type: 'SHERIFF_SKIP',
        playerId: action.playerId,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'SHERIFF_VOTE': {
      const election = state.sheriffElection!;
      next = {
        ...state,
        sheriffElection: {
          ...election,
          votes: { ...election.votes, [action.playerId]: action.targetId },
        },
      };
      events.push({
        ...eventBase(state),
        type: 'SHERIFF_VOTE',
        voterId: action.playerId,
        targetId: action.targetId,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'TRANSFER_BADGE': {
      next = {
        ...state,
        sheriff: { playerId: action.targetId, badgeDestroyed: false },
        pendingBadgeTransfer: state.pendingBadgeTransfer
          ? { ...state.pendingBadgeTransfer, resolved: true }
          : undefined,
      };
      events.push({
        ...eventBase(state),
        type: 'BADGE_TRANSFERRED',
        fromId: action.playerId,
        toId: action.targetId,
        reasoning: action.reasoning,
      });
      break;
    }
    case 'DESTROY_BADGE': {
      next = {
        ...state,
        sheriff: { playerId: null, badgeDestroyed: true },
        pendingBadgeTransfer: state.pendingBadgeTransfer
          ? { ...state.pendingBadgeTransfer, resolved: true }
          : undefined,
      };
      events.push({
        ...eventBase(state),
        type: 'BADGE_DESTROYED',
        fromId: action.playerId,
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
      // Propagate lover death if the shot target had a partner.
      const propag = propagateLoverDeath(
        state,
        updatedPlayers,
        additionalDeaths.map((d) => d.playerId),
        'day',
      );
      updatedPlayers = propag.players;
      additionalDeaths.push(...propag.extraDeaths);

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
      for (const d of propag.extraDeaths) {
        events.push({
          ...eventBase(state),
          type: 'DEATH',
          playerId: d.playerId,
          cause: 'broken_heart',
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
 * If the sheriff has died and the badge hasn't been destroyed, set up a pending
 * badge-transfer interruption. Returns the updated state and whether the
 * interruption was triggered. Callers should check `triggered` and transition
 * to SHERIFF_BADGE_TRANSFER instead of their normal next phase.
 */
function maybeTriggerBadgeTransfer(
  s: GameState,
  resumeTo: Phase,
): { state: GameState; triggered: boolean } {
  if (!s.sheriff.playerId || s.sheriff.badgeDestroyed) return { state: s, triggered: false };
  if (s.pendingBadgeTransfer) return { state: s, triggered: false };
  const sheriffPlayer = s.players.find((p) => p.id === s.sheriff.playerId);
  if (!sheriffPlayer || sheriffPlayer.alive) return { state: s, triggered: false };
  return {
    state: {
      ...s,
      pendingBadgeTransfer: { sheriffId: s.sheriff.playerId, resumeTo },
    },
    triggered: true,
  };
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
      if (s.board.features.sheriff) {
        s = {
          ...s,
          sheriffElection: { runners: [], speeches: {}, decisions: {}, votes: {} },
        };
        const t = transition(s, 'SHERIFF_RUNNING_FOR');
        return { next: t.next, events: [...events, ...t.events] };
      }
      const t = transition(s, 'NIGHT_START');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'SHERIFF_RUNNING_FOR': {
      // All alive players have decided run/skip. Move to vote (or skip vote
      // entirely if no one ran).
      const election = s.sheriffElection;
      const runners = election?.runners ?? [];
      if (runners.length === 0) {
        // Nobody ran — no sheriff this game (badge stays unassigned).
        events.push({
          type: 'SHERIFF_ELECTED',
          timestamp: Date.now(),
          day: s.day,
          phase: s.phase,
          sheriffId: null,
          tally: {},
        });
        s = { ...s, sheriffElection: undefined };
        const t = transition(s, 'NIGHT_START');
        return { next: t.next, events: [...events, ...t.events] };
      }
      const t = transition(s, 'SHERIFF_VOTE');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'SHERIFF_VOTE': {
      const election = s.sheriffElection!;
      const rng = getRng(s, 'sheriff-vote');
      // Filter out abstain votes for the resolver (which expects target ids).
      const valid: Record<string, string> = {};
      for (const [voter, target] of Object.entries(election.votes)) {
        if (target !== 'abstain') valid[voter] = target;
      }
      const result = resolveSheriffVote(valid, rng);
      events.push({
        type: 'SHERIFF_ELECTED',
        timestamp: Date.now(),
        day: s.day,
        phase: s.phase,
        sheriffId: result.winnerId,
        tally: result.tally,
      });
      s = {
        ...s,
        sheriff: {
          playerId: result.winnerId,
          badgeDestroyed: false,
        },
        sheriffElection: undefined,
      };
      const t = transition(s, 'NIGHT_START');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'SHERIFF_BADGE_TRANSFER': {
      // Action has been applied (pendingBadgeTransfer.resolved is true);
      // resume the normal flow.
      const pending = s.pendingBadgeTransfer;
      const resumeTo = pending?.resumeTo ?? 'NIGHT_START';
      s = { ...s, pendingBadgeTransfer: undefined };
      const t = transition(s, resumeTo);
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
      const t = transition(s, 'CUPID_LINK');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'CUPID_LINK': {
      const t = transition(s, 'GUARD_PROTECT');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'GUARD_PROTECT': {
      // Lock in this night's guard target as next night's "last guarded".
      const guardedTonight = s.currentNight.guardTarget ?? null;
      s = {
        ...s,
        guardState: { lastGuarded: guardedTonight },
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
      // Sheriff died this night → trigger badge transfer before announce.
      const sheriffCheck = maybeTriggerBadgeTransfer(s, 'DAY_ANNOUNCE');
      if (sheriffCheck.triggered) {
        s = sheriffCheck.state;
        const t = transition(s, 'SHERIFF_BADGE_TRANSFER');
        return { next: t.next, events: [...events, ...t.events] };
      }
      const t = transition(s, 'DAY_ANNOUNCE');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'DAY_ANNOUNCE': {
      // Check win condition first
      const win = evaluateWinConditions(s, s.board.winConditions);
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

      // Check if the hunter died tonight (and not by poison / broken heart) → trigger HUNTER_SHOOT_NIGHT
      const recentNightDeaths = s.deathLog.filter(
        (d) => d.day === s.day && d.phase === 'night'
      );
      const hunterDeath = recentNightDeaths.find((d) => {
        const p = findPlayer(s, d.playerId);
        return p?.role === 'hunter' && d.cause !== 'witch_poison' && d.cause !== 'broken_heart';
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
      // Hunter shoot may have killed the sheriff; resolve badge first.
      const sheriffCheck = maybeTriggerBadgeTransfer(s, 'HUNTER_SHOOT_NIGHT');
      if (sheriffCheck.triggered) {
        s = sheriffCheck.state;
        const t = transition(s, 'SHERIFF_BADGE_TRANSFER');
        return { next: t.next, events: [...events, ...t.events] };
      }
      // After hunter has shot, continue to day discussion
      // Check win condition first
      const win = evaluateWinConditions(s, s.board.winConditions);
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
      // Knight duel mid-discussion may have killed the sheriff.
      const sheriffCheck = maybeTriggerBadgeTransfer(s, 'DAY_DISCUSSION');
      if (sheriffCheck.triggered) {
        s = sheriffCheck.state;
        const t = transition(s, 'SHERIFF_BADGE_TRANSFER');
        return { next: t.next, events: [...events, ...t.events] };
      }
      // A knight duel mid-discussion may have just ended the game.
      const win = evaluateWinConditions(s, s.board.winConditions);
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
      // All speeches done — go to vote
      const t = transition(s, 'DAY_VOTE');
      return { next: t.next, events: [...events, ...t.events] };
    }

    case 'DAY_VOTE': {
      const sheriffId = s.sheriff.playerId
        && s.players.find((p) => p.id === s.sheriff.playerId)?.alive
        ? s.sheriff.playerId
        : null;
      const result = resolveDayVote(s.currentDay.votes, sheriffId);
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
      const executed = executedId ? findPlayer(s, executedId) : null;
      // Idempotency: if we've already recorded the vote death (e.g., on re-entry
      // after a badge transfer), skip the death-application step.
      const alreadyExecuted = !!executedId && s.deathLog.some(
        (d) => d.day === s.day && d.phase === 'day' && d.playerId === executedId && d.cause === 'vote'
      );

      if (executedId && !alreadyExecuted) {
        // Idiot survives the first vote-out: reveal, lose voting rights, no death.
        if (executed?.role === 'idiot' && !executed.revealed) {
          s = {
            ...s,
            players: s.players.map((p) =>
              p.id === executedId ? { ...p, revealed: true, canVote: false } : p,
            ),
          };
          events.push({
            type: 'IDIOT_REVEAL',
            timestamp: Date.now(),
            day: s.day,
            phase: s.phase,
            playerId: executedId,
          });
          // Check win condition (idiot reveal doesn't kill, but vote could have ended earlier)
          const win = evaluateWinConditions(s, s.board.winConditions);
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

        // Propagate lover death if the executed had a partner.
        const propag = propagateLoverDeath(s, s.players, [executedId], 'day');
        if (propag.extraDeaths.length > 0) {
          s = {
            ...s,
            players: propag.players,
            deathLog: [...s.deathLog, ...propag.extraDeaths],
          };
          for (const d of propag.extraDeaths) {
            events.push({
              type: 'DEATH',
              timestamp: Date.now(),
              day: s.day,
              phase: s.phase,
              playerId: d.playerId,
              cause: 'broken_heart',
            });
          }
        }
      }

      // Sheriff death check (must precede hunter trigger)
      const sheriffCheck = maybeTriggerBadgeTransfer(s, 'EXECUTION');
      if (sheriffCheck.triggered) {
        s = sheriffCheck.state;
        const t = transition(s, 'SHERIFF_BADGE_TRANSFER');
        return { next: t.next, events: [...events, ...t.events] };
      }

      // If executed is hunter (and not poisoned), trigger HUNTER_SHOOT_DAY.
      // Idempotency: only set pendingHunterShoot if not already set.
      if (executed?.role === 'hunter' && !executed.poisonedTonight && !s.pendingHunterShoot) {
        s = { ...s, pendingHunterShoot: executedId! };
        const t = transition(s, 'HUNTER_SHOOT_DAY');
        return { next: t.next, events: [...events, ...t.events] };
      }
      // Check win
      const win = evaluateWinConditions(s, s.board.winConditions);
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
      const sheriffCheck = maybeTriggerBadgeTransfer(s, 'HUNTER_SHOOT_DAY');
      if (sheriffCheck.triggered) {
        s = sheriffCheck.state;
        const t = transition(s, 'SHERIFF_BADGE_TRANSFER');
        return { next: t.next, events: [...events, ...t.events] };
      }
      const win = evaluateWinConditions(s, s.board.winConditions);
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
