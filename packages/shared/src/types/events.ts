import type { DeathCause, Faction, Role } from './game.js';

export interface BaseEvent {
  timestamp: number;
  day: number;
  phase: string;
}

export type GameEvent =
  | (BaseEvent & {
      type: 'GAME_START';
      players: Array<{ id: string; seat: number; role: Role; isHuman: boolean; personaId?: string }>;
    })
  | (BaseEvent & { type: 'PHASE_TRANSITION'; from: string; to: string })
  | (BaseEvent & { type: 'WEREWOLF_VOTE'; voterId: string; targetId: string; reasoning: string })
  | (BaseEvent & { type: 'WEREWOLF_KILL_DECIDED'; targetId: string })
  | (BaseEvent & {
      type: 'SEER_CHECK';
      checkerId: string;
      targetId: string;
      result: 'good' | 'wolf';
      reasoning: string;
    })
  | (BaseEvent & { type: 'WITCH_HEAL'; witchId: string; targetId: string; reasoning: string })
  | (BaseEvent & { type: 'WITCH_POISON'; witchId: string; targetId: string; reasoning: string })
  | (BaseEvent & { type: 'WITCH_SKIP'; witchId: string; reasoning: string })
  | (BaseEvent & {
      type: 'HUNTER_SHOOT';
      hunterId: string;
      targetId: string | null;
      reasoning: string;
    })
  | (BaseEvent & {
      type: 'GUARD_PROTECT';
      guardId: string;
      targetId: string;
      reasoning: string;
    })
  | (BaseEvent & {
      type: 'IDIOT_REVEAL';
      playerId: string;
    })
  | (BaseEvent & {
      type: 'KNIGHT_DUEL';
      knightId: string;
      targetId: string;
      targetRole: Role;     // revealed by the duel
      killedId: string;     // either targetId (target was wolf) or knightId (target wasn't)
      reasoning: string;
    })
  | (BaseEvent & {
      type: 'CUPID_LINK';
      cupidId: string;
      target1Id: string;
      target2Id: string;
      reasoning: string;
    })
  | (BaseEvent & {
      type: 'SHERIFF_RUN';
      runnerId: string;
      content: string;
      internalThought: string;
    })
  | (BaseEvent & {
      type: 'SHERIFF_SKIP';
      playerId: string;
      reasoning: string;
    })
  | (BaseEvent & {
      type: 'SHERIFF_VOTE';
      voterId: string;
      targetId: string | 'abstain';
      reasoning: string;
    })
  | (BaseEvent & {
      type: 'SHERIFF_ELECTED';
      sheriffId: string | null;     // null if no one ran or all abstained
      tally: Record<string, number>;
    })
  | (BaseEvent & {
      type: 'BADGE_TRANSFERRED';
      fromId: string;
      toId: string;
      reasoning: string;
    })
  | (BaseEvent & {
      type: 'BADGE_DESTROYED';
      fromId: string;
      reasoning: string;
    })
  | (BaseEvent & { type: 'DEATH'; playerId: string; cause: DeathCause; killerId?: string })
  | (BaseEvent & {
      type: 'SPEAK';
      playerId: string;
      content: string;
      internalThought: string;
    })
  | (BaseEvent & { type: 'VOTE'; voterId: string; targetId: string | 'abstain'; reasoning: string })
  | (BaseEvent & { type: 'EXECUTION'; targetId: string })
  | (BaseEvent & { type: 'PEACEFUL_NIGHT' })
  | (BaseEvent & { type: 'GAME_END'; winner: Faction; reason: string });

export type EventType = GameEvent['type'];
