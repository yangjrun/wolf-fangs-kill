/**
 * Core game domain types for Wolf Fangs Kill.
 */

export type Role = 'werewolf' | 'seer' | 'witch' | 'hunter' | 'guard' | 'idiot' | 'knight' | 'cupid' | 'villager';
export type Faction = 'wolves' | 'villagers' | 'lovers';

/**
 * Win conditions are configurable per board. The engine evaluates these in
 * order and returns the first match. New conditions extend the union without
 * touching the engine's evaluator.
 */
export type WinCondition =
  | { type: 'all-wolves-dead'; faction: Faction }
  | { type: 'all-gods-dead'; faction: Faction }
  | { type: 'all-villagers-dead'; faction: Faction }
  | { type: 'either-gods-or-villagers-dead'; faction: Faction }
  | { type: 'only-lovers-alive'; faction: Faction };

/**
 * Optional gameplay features a board may enable. Engine and AI layers check
 * these flags to opt into extra mechanics without affecting standard boards.
 */
export interface BoardFeatures {
  sheriff?: boolean;
  loversCrossWin?: boolean;
}

/**
 * Self-contained board definition: who plays, in what phase order, and how
 * winning is decided. Resolved boards are embedded in GameState so the engine
 * never needs a global registry lookup mid-game.
 */
export interface BoardConfig {
  id: string;
  name: string;
  totalPlayers: number;
  roles: readonly Role[];
  phaseOrder: readonly Phase[];
  winConditions: readonly WinCondition[];
  features: BoardFeatures;
}

export type Phase =
  | 'GAME_START'
  | 'SHERIFF_RUNNING_FOR'
  | 'SHERIFF_VOTE'
  | 'SHERIFF_BADGE_TRANSFER'
  | 'NIGHT_START'
  | 'CUPID_LINK'
  | 'GUARD_PROTECT'
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
  canVote: boolean;          // false for revealed idiots
  revealed: boolean;         // true for idiots who survived a vote-out
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
  guardTarget?: string;                   // who the guard protected this night
}

export interface GuardState {
  lastGuarded: string | null;             // who the guard protected last night (cannot guard same target consecutively)
}

export interface SheriffState {
  playerId: string | null;     // current sheriff (null if not yet elected or badge destroyed)
  badgeDestroyed: boolean;     // true once the badge has been destroyed (no more transfers)
}

export interface SheriffElectionState {
  runners: string[];                              // playerIds who chose to run
  speeches: Record<string, string>;               // playerId -> campaign speech content
  decisions: Record<string, 'run' | 'skip'>;      // playerId -> their declared choice
  votes: Record<string, string | 'abstain'>;      // voterId -> runnerId or abstain
}

export interface PendingBadgeTransfer {
  sheriffId: string;     // dying / dead sheriff who must act
  resumeTo: Phase;       // phase to resume normal flow after badge action
  resolved?: boolean;    // set true once TRANSFER_BADGE or DESTROY_BADGE has been applied
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

export type DeathCause = 'wolf_kill' | 'witch_poison' | 'vote' | 'hunter_shot' | 'knight_duel' | 'broken_heart';

export interface DeathRecord {
  playerId: string;
  day: number;
  phase: 'night' | 'day';
  cause: DeathCause;
  killerId?: string;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameConfig {
  seed: string;
  humanPlayerId?: string;  // undefined = pure AI spectator mode
  model?: string;          // default 'claude-sonnet-4-6'
  boardId?: string;        // selects a BoardConfig from boards.ts; defaults to '9-standard'
  difficulty?: Difficulty; // AI difficulty level; defaults to 'normal'
}

export interface GameState {
  config: GameConfig;
  board: BoardConfig;      // resolved board definition (roles, phases, win conditions)
  day: number;
  phase: Phase;
  players: Player[];
  witchState: WitchState;
  guardState: GuardState;
  sheriff: SheriffState;
  sheriffElection?: SheriffElectionState;
  pendingBadgeTransfer?: PendingBadgeTransfer;
  seerRecords: SeerRecord[];
  currentNight: NightActions;
  currentDay: DayActions;
  deathLog: DeathRecord[];
  publicLog: Speech[];   // all speeches across all days, in order
  pendingHunterShoot?: string;  // hunter id who must shoot before game continues
  lovers?: readonly [string, string];  // cupid-linked lover pair; undefined until CUPID_LINK
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
  | { type: 'GUARD_PROTECT'; playerId: string; targetId: string; reasoning: string }
  | { type: 'KNIGHT_DUEL'; playerId: string; targetId: string; reasoning: string }
  | { type: 'CUPID_LINK'; playerId: string; target1Id: string; target2Id: string; reasoning: string }
  | { type: 'RUN_FOR_SHERIFF'; playerId: string; content: string; internalThought: string }
  | { type: 'SKIP_SHERIFF'; playerId: string; reasoning: string }
  | { type: 'SHERIFF_VOTE'; playerId: string; targetId: string | 'abstain'; reasoning: string }
  | { type: 'TRANSFER_BADGE'; playerId: string; targetId: string; reasoning: string }
  | { type: 'DESTROY_BADGE'; playerId: string; reasoning: string }
  | { type: 'SPEAK'; playerId: string; content: string; internalThought: string }
  | { type: 'VOTE'; playerId: string; targetId: string | 'abstain'; reasoning: string };

// Engine indicates which players need to act and what tools they may use
export interface PendingAction {
  playerId: string;
  allowedActionTypes: PlayerAction['type'][];
  instruction: string;  // localized instruction text
}
