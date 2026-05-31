import type { GameState, PlayerAction } from '@wfk/shared';

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a player action is legal given the current game state.
 * Returns null if valid, otherwise a ValidationError describing the issue.
 *
 * This catches issues that the AI prompt should have prevented but didn't —
 * the engine is the source of truth, AI is just a decision maker.
 */
export function validateAction(state: GameState, action: PlayerAction): ValidationError | null {
  const actor = state.players.find((p) => p.id === action.playerId);
  if (!actor) {
    return new ValidationError(`Unknown player ${action.playerId}`, 'UNKNOWN_PLAYER');
  }
  // Dead players may only perform these "final-word" actions before they exit.
  const deadAllowedActions: PlayerAction['type'][] = ['HUNTER_SHOOT', 'TRANSFER_BADGE', 'DESTROY_BADGE'];
  if (!actor.alive && !deadAllowedActions.includes(action.type)) {
    return new ValidationError(`Player ${action.playerId} is dead`, 'DEAD_PLAYER');
  }

  const findTarget = (id: string) => state.players.find((p) => p.id === id);

  switch (action.type) {
    case 'WEREWOLF_KILL': {
      if (state.phase !== 'WEREWOLF_KILL') {
        return new ValidationError('Not in werewolf kill phase', 'WRONG_PHASE');
      }
      if (actor.role !== 'werewolf') {
        return new ValidationError('Not a werewolf', 'WRONG_ROLE');
      }
      const target = findTarget(action.targetId);
      if (!target) {
        return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
      }
      if (!target.alive) {
        return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
      }
      if (target.role === 'werewolf') {
        return new ValidationError('Cannot kill a werewolf teammate', 'KILL_TEAMMATE');
      }
      return null;
    }

    case 'SEER_CHECK': {
      if (state.phase !== 'SEER_CHECK') {
        return new ValidationError('Not in seer check phase', 'WRONG_PHASE');
      }
      if (actor.role !== 'seer') {
        return new ValidationError('Not the seer', 'WRONG_ROLE');
      }
      const target = findTarget(action.targetId);
      if (!target) {
        return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
      }
      if (!target.alive) {
        return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
      }
      if (state.day === 1 && action.targetId === action.playerId) {
        return new ValidationError('Cannot check self on day 1', 'CHECK_SELF_DAY_1');
      }
      return null;
    }

    case 'WITCH_HEAL': {
      if (state.phase !== 'WITCH_ACTION') {
        return new ValidationError('Not in witch action phase', 'WRONG_PHASE');
      }
      if (actor.role !== 'witch') {
        return new ValidationError('Not the witch', 'WRONG_ROLE');
      }
      if (!state.witchState.hasHeal) {
        return new ValidationError('Heal potion already used', 'NO_HEAL_LEFT');
      }
      // Self-heal restricted after night 1
      const wolfTarget = state.currentNight.werewolfTarget;
      if (state.day > 1 && wolfTarget === action.playerId) {
        return new ValidationError('Cannot self-heal after night 1', 'NO_SELF_HEAL');
      }
      // No wolf kill to heal
      if (!wolfTarget) {
        return new ValidationError('No one was killed tonight to heal', 'NO_KILL_TO_HEAL');
      }
      return null;
    }

    case 'WITCH_POISON': {
      if (state.phase !== 'WITCH_ACTION') {
        return new ValidationError('Not in witch action phase', 'WRONG_PHASE');
      }
      if (actor.role !== 'witch') {
        return new ValidationError('Not the witch', 'WRONG_ROLE');
      }
      if (!state.witchState.hasPoison) {
        return new ValidationError('Poison potion already used', 'NO_POISON_LEFT');
      }
      const target = findTarget(action.targetId);
      if (!target) {
        return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
      }
      if (!target.alive) {
        return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
      }
      if (action.targetId === action.playerId) {
        return new ValidationError('Witch cannot self-poison', 'POISON_SELF');
      }
      return null;
    }

    case 'WITCH_SKIP': {
      if (state.phase !== 'WITCH_ACTION') {
        return new ValidationError('Not in witch action phase', 'WRONG_PHASE');
      }
      if (actor.role !== 'witch') {
        return new ValidationError('Not the witch', 'WRONG_ROLE');
      }
      return null;
    }

    case 'HUNTER_SHOOT': {
      if (state.phase !== 'HUNTER_SHOOT_NIGHT' && state.phase !== 'HUNTER_SHOOT_DAY') {
        return new ValidationError('Not in hunter shoot phase', 'WRONG_PHASE');
      }
      if (actor.role !== 'hunter') {
        return new ValidationError('Not the hunter', 'WRONG_ROLE');
      }
      // Note: hunter must already be flagged dead — we still let action.playerId match.
      // The engine controls who gets to shoot via phase + pending actions.
      if (action.targetId !== null) {
        const target = findTarget(action.targetId);
        if (!target) {
          return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
        }
        if (!target.alive) {
          return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
        }
        if (action.targetId === action.playerId) {
          return new ValidationError('Hunter cannot shoot self', 'SHOOT_SELF');
        }
      }
      return null;
    }

    case 'GUARD_PROTECT': {
      if (state.phase !== 'GUARD_PROTECT') {
        return new ValidationError('Not in guard protect phase', 'WRONG_PHASE');
      }
      if (actor.role !== 'guard') {
        return new ValidationError('Not the guard', 'WRONG_ROLE');
      }
      const target = findTarget(action.targetId);
      if (!target) {
        return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
      }
      if (!target.alive) {
        return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
      }
      if (state.guardState.lastGuarded && action.targetId === state.guardState.lastGuarded) {
        return new ValidationError(
          `Cannot guard the same target two nights in a row (${state.guardState.lastGuarded})`,
          'GUARD_CONSECUTIVE',
        );
      }
      return null;
    }

    case 'KNIGHT_DUEL': {
      if (state.phase !== 'DAY_DISCUSSION') {
        return new ValidationError('Knight may only duel during day discussion', 'WRONG_PHASE');
      }
      if (actor.role !== 'knight') {
        return new ValidationError('Not the knight', 'WRONG_ROLE');
      }
      if (actor.revealed) {
        return new ValidationError('Knight already used their duel ability', 'KNIGHT_ALREADY_DUELED');
      }
      // Only the current speaker may act in DAY_DISCUSSION.
      const idx = state.currentDay.speeches.length;
      const expected = state.currentDay.speechOrder[idx];
      if (expected !== action.playerId) {
        return new ValidationError(
          `It is not your turn to act (current speaker is ${expected})`,
          'NOT_YOUR_TURN',
        );
      }
      if (action.targetId === action.playerId) {
        return new ValidationError('Cannot duel yourself', 'DUEL_SELF');
      }
      const target = findTarget(action.targetId);
      if (!target) {
        return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
      }
      if (!target.alive) {
        return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
      }
      return null;
    }

    case 'CUPID_LINK': {
      if (state.phase !== 'CUPID_LINK') {
        return new ValidationError('Cupid may only link on night 1', 'WRONG_PHASE');
      }
      if (actor.role !== 'cupid') {
        return new ValidationError('Not the cupid', 'WRONG_ROLE');
      }
      if (state.day !== 1) {
        return new ValidationError('Cupid link only on night 1', 'CUPID_TOO_LATE');
      }
      if (state.lovers) {
        return new ValidationError('Lovers already linked', 'LOVERS_ALREADY_SET');
      }
      if (action.target1Id === action.target2Id) {
        return new ValidationError('Cannot link a player with themselves', 'CUPID_DUPLICATE_TARGET');
      }
      const t1 = findTarget(action.target1Id);
      const t2 = findTarget(action.target2Id);
      if (!t1) return new ValidationError(`Unknown target ${action.target1Id}`, 'UNKNOWN_TARGET');
      if (!t2) return new ValidationError(`Unknown target ${action.target2Id}`, 'UNKNOWN_TARGET');
      if (!t1.alive) return new ValidationError(`Target ${action.target1Id} is dead`, 'DEAD_TARGET');
      if (!t2.alive) return new ValidationError(`Target ${action.target2Id} is dead`, 'DEAD_TARGET');
      return null;
    }

    case 'RUN_FOR_SHERIFF': {
      if (state.phase !== 'SHERIFF_RUNNING_FOR') {
        return new ValidationError('Not in sheriff election', 'WRONG_PHASE');
      }
      const election = state.sheriffElection;
      if (!election) {
        return new ValidationError('No active sheriff election', 'NO_ELECTION');
      }
      if (action.playerId in election.decisions) {
        return new ValidationError('Already decided in this election', 'ELECTION_ALREADY_DECIDED');
      }
      if (action.content.length === 0) {
        return new ValidationError('Campaign speech cannot be empty', 'EMPTY_SPEECH');
      }
      // Validate campaign speech length (only enforce max, not min for flexibility)
      const difficulty = state.config.difficulty || 'normal';
      const contentLength = action.content.length;
      const lengthLimits: Record<string, { max: number }> = {
        easy: { max: 200 },
        normal: { max: 180 },
        hard: { max: 150 },
        expert: { max: 120 },
      };
      const limits = lengthLimits[difficulty] ?? lengthLimits['normal'];
      if (limits && contentLength > limits.max) {
        return new ValidationError(
          `Campaign speech too long (${contentLength} chars, max ${limits.max} for ${difficulty} difficulty)`,
          'SPEECH_TOO_LONG',
        );
      }
      return null;
    }

    case 'SKIP_SHERIFF': {
      if (state.phase !== 'SHERIFF_RUNNING_FOR') {
        return new ValidationError('Not in sheriff election', 'WRONG_PHASE');
      }
      const election = state.sheriffElection;
      if (!election) {
        return new ValidationError('No active sheriff election', 'NO_ELECTION');
      }
      if (action.playerId in election.decisions) {
        return new ValidationError('Already decided in this election', 'ELECTION_ALREADY_DECIDED');
      }
      return null;
    }

    case 'SHERIFF_VOTE': {
      if (state.phase !== 'SHERIFF_VOTE') {
        return new ValidationError('Not in sheriff vote phase', 'WRONG_PHASE');
      }
      const election = state.sheriffElection;
      if (!election) {
        return new ValidationError('No active sheriff election', 'NO_ELECTION');
      }
      if (election.runners.includes(action.playerId)) {
        return new ValidationError('Runners cannot vote in their own election', 'RUNNER_CANNOT_VOTE');
      }
      if (action.targetId !== 'abstain') {
        if (!election.runners.includes(action.targetId)) {
          return new ValidationError(
            `Target ${action.targetId} is not a runner`,
            'NOT_A_RUNNER',
          );
        }
        const target = findTarget(action.targetId);
        if (!target || !target.alive) {
          return new ValidationError(`Target ${action.targetId} is invalid`, 'DEAD_TARGET');
        }
      }
      return null;
    }

    case 'TRANSFER_BADGE': {
      if (state.phase !== 'SHERIFF_BADGE_TRANSFER') {
        return new ValidationError('Not in badge transfer phase', 'WRONG_PHASE');
      }
      const pending = state.pendingBadgeTransfer;
      if (!pending || pending.sheriffId !== action.playerId) {
        return new ValidationError(
          `Only the dying sheriff can transfer the badge (expected ${pending?.sheriffId ?? 'none'})`,
          'NOT_DYING_SHERIFF',
        );
      }
      if (action.targetId === action.playerId) {
        return new ValidationError('Cannot transfer badge to self', 'TRANSFER_SELF');
      }
      const target = findTarget(action.targetId);
      if (!target) {
        return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
      }
      if (!target.alive) {
        return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
      }
      return null;
    }

    case 'DESTROY_BADGE': {
      if (state.phase !== 'SHERIFF_BADGE_TRANSFER') {
        return new ValidationError('Not in badge transfer phase', 'WRONG_PHASE');
      }
      const pending = state.pendingBadgeTransfer;
      if (!pending || pending.sheriffId !== action.playerId) {
        return new ValidationError(
          `Only the dying sheriff can destroy the badge`,
          'NOT_DYING_SHERIFF',
        );
      }
      return null;
    }

    case 'SPEAK': {
      if (state.phase !== 'DAY_DISCUSSION') {
        return new ValidationError('Not in day discussion phase', 'WRONG_PHASE');
      }
      if (action.content.length === 0) {
        return new ValidationError('Speech content cannot be empty', 'EMPTY_SPEECH');
      }
      // Validate speech length based on difficulty (only enforce max, not min for flexibility)
      const difficulty = state.config.difficulty || 'normal';
      const contentLength = action.content.length;
      const lengthLimits: Record<string, { max: number }> = {
        easy: { max: 200 },
        normal: { max: 150 },
        hard: { max: 120 },
        expert: { max: 100 },
      };
      const limits = lengthLimits[difficulty] ?? lengthLimits['normal'];
      if (limits && contentLength > limits.max) {
        return new ValidationError(
          `Speech too long (${contentLength} chars, max ${limits.max} for ${difficulty} difficulty)`,
          'SPEECH_TOO_LONG',
        );
      }
      return null;
    }

    case 'VOTE': {
      if (state.phase !== 'DAY_VOTE') {
        return new ValidationError('Not in day vote phase', 'WRONG_PHASE');
      }
      if (!actor.canVote) {
        return new ValidationError(
          `Player ${action.playerId} has lost voting rights (revealed idiot)`,
          'NO_VOTE_RIGHTS',
        );
      }
      if (action.targetId !== 'abstain') {
        const target = findTarget(action.targetId);
        if (!target) {
          return new ValidationError(`Unknown target ${action.targetId}`, 'UNKNOWN_TARGET');
        }
        if (!target.alive) {
          return new ValidationError(`Target ${action.targetId} is dead`, 'DEAD_TARGET');
        }
        if (action.targetId === action.playerId) {
          return new ValidationError('Cannot vote self', 'VOTE_SELF');
        }
      }
      return null;
    }

    default: {
      // Exhaustive check
      const _: never = action;
      return new ValidationError(`Unknown action type`, 'UNKNOWN_ACTION');
    }
  }
}
