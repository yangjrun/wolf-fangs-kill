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
  // HUNTER_SHOOT is the only action a dead player can perform (they died this phase).
  if (!actor.alive && action.type !== 'HUNTER_SHOOT') {
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

    case 'SPEAK': {
      if (state.phase !== 'DAY_DISCUSSION') {
        return new ValidationError('Not in day discussion phase', 'WRONG_PHASE');
      }
      if (action.content.length === 0) {
        return new ValidationError('Speech content cannot be empty', 'EMPTY_SPEECH');
      }
      return null;
    }

    case 'VOTE': {
      if (state.phase !== 'DAY_VOTE') {
        return new ValidationError('Not in day vote phase', 'WRONG_PHASE');
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
