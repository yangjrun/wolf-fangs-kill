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
