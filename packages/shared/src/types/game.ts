/**
 * Core game domain types for Wolf Fangs Kill (9-player werewolf, no badge).
 */

export type Role = 'werewolf' | 'seer' | 'witch' | 'hunter' | 'villager';
export type Faction = 'wolves' | 'villagers';

export type Phase =
  | 'GAME_START'
  | 'NIGHT_START'
  | 'WEREWOLF_KILL'
  | 'SEER_CHECK'
  | 'WITCH_ACTION'
  | 'NIGHT_RESOLVE'
  | 'DAY_ANNOUNCE'
  | 'HUNTER_SHOOT_NIGHT'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTE'
  | 'EXECUTION'
  | 'HUNTER_SHOOT_DAY'
  | 'GAME_END';

export interface Player {
  id: string;          // 'player_1' .. 'player_9'
  seat: number;        // 1 .. 9
  role: Role;
  alive: boolean;
  isHuman: boolean;
  personaId?: string;  // only set for AI players
  displayName: string;
  poisonedTonight: boolean;  // affects hunter shoot ability
}

export interface WitchState {
  hasHeal: boolean;
  hasPoison: boolean;
  usedHealOn?: string;
  usedPoisonOn?: string;
}

export interface SeerRecord {
  day: number;
  targetId: string;
  result: 'good' | 'wolf';
}

export interface NightActions {
  werewolfVotes: Record<string, string>;  // wolfId -> targetId
  werewolfTarget?: string;                // resolved kill target
  seerCheckTarget?: string;
  seerCheckResult?: 'good' | 'wolf';
  witchHealUsed: boolean;
  witchPoisonTarget?: string;
  witchSkipped: boolean;
}

export interface Speech {
  playerId: string;
  content: string;
  internalThought: string;
  day: number;
}

export interface DayActions {
  speechOrder: string[];   // ordered playerIds for today's discussion (set at DAY_ANNOUNCE)
  speeches: Speech[];
  votes: Record<string, string>;  // voterId -> targetId | 'abstain'
  executedId?: string;
}

export type DeathCause = 'wolf_kill' | 'witch_poison' | 'vote' | 'hunter_shot';

export interface DeathRecord {
  playerId: string;
  day: number;
  phase: 'night' | 'day';
  cause: DeathCause;
  killerId?: string;
}

export interface GameConfig {
  seed: string;
  humanPlayerId?: string;  // undefined = pure AI spectator mode
  model?: string;          // default 'claude-sonnet-4-6'
}

export interface GameState {
  config: GameConfig;
  day: number;
  phase: Phase;
  players: Player[];
  witchState: WitchState;
  seerRecords: SeerRecord[];
  currentNight: NightActions;
  currentDay: DayActions;
  deathLog: DeathRecord[];
  publicLog: Speech[];   // all speeches across all days, in order
  pendingHunterShoot?: string;  // hunter id who must shoot before game continues
  winner?: Faction;
  endReason?: string;
}

// Player actions that the engine accepts
export type PlayerAction =
  | { type: 'WEREWOLF_KILL'; playerId: string; targetId: string; reasoning: string }
  | { type: 'SEER_CHECK'; playerId: string; targetId: string; reasoning: string }
  | { type: 'WITCH_HEAL'; playerId: string; reasoning: string }
  | { type: 'WITCH_POISON'; playerId: string; targetId: string; reasoning: string }
  | { type: 'WITCH_SKIP'; playerId: string; reasoning: string }
  | { type: 'HUNTER_SHOOT'; playerId: string; targetId: string | null; reasoning: string }
  | { type: 'SPEAK'; playerId: string; content: string; internalThought: string }
  | { type: 'VOTE'; playerId: string; targetId: string | 'abstain'; reasoning: string };

// Engine indicates which players need to act and what tools they may use
export interface PendingAction {
  playerId: string;
  allowedActionTypes: PlayerAction['type'][];
  instruction: string;  // localized instruction text
}
