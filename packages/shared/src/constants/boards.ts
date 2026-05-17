import type { BoardConfig, Phase, Role, WinCondition } from '../types/game.js';

/**
 * Standard phase order for boards without sheriff or special pre-game phases.
 * CUPID_LINK + GUARD_PROTECT both run every night; the engine fast-transitions
 * through whichever has no live actor (no cupid → CUPID_LINK is empty; no
 * guard → GUARD_PROTECT is empty; CUPID_LINK after day 1 is also empty).
 */
const STANDARD_PHASE_ORDER: readonly Phase[] = [
  'NIGHT_START',
  'CUPID_LINK',
  'GUARD_PROTECT',
  'WEREWOLF_KILL',
  'SEER_CHECK',
  'WITCH_ACTION',
  'NIGHT_RESOLVE',
  'DAY_ANNOUNCE',
  'HUNTER_SHOOT_NIGHT',
  'DAY_DISCUSSION',
  'DAY_VOTE',
  'EXECUTION',
  'HUNTER_SHOOT_DAY',
] as const;

/**
 * Standard win conditions: villagers win by killing all wolves; wolves win by
 * killing all gods (屠神) or all villagers (屠民).
 */
const STANDARD_WIN_CONDITIONS: readonly WinCondition[] = [
  { type: 'all-wolves-dead', faction: 'villagers' },
  { type: 'all-gods-dead', faction: 'wolves' },
  { type: 'all-villagers-dead', faction: 'wolves' },
] as const;

/** 9-player standard: 3 wolves + seer + witch + hunter + 3 villagers, no badge. */
const ROLES_9_STANDARD: readonly Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'hunter',
  'villager',
  'villager',
  'villager',
] as const;

export const BOARD_9_STANDARD: BoardConfig = {
  id: '9-standard',
  name: '9 人标准局',
  totalPlayers: 9,
  roles: ROLES_9_STANDARD,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: STANDARD_WIN_CONDITIONS,
  features: {},
};

/** 9-player guard variant: 3 wolves + seer + witch + hunter + guard + 2 villagers. */
const ROLES_9_GUARD: readonly Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'hunter',
  'guard',
  'villager',
  'villager',
] as const;

export const BOARD_9_GUARD_VARIANT: BoardConfig = {
  id: '9-guard',
  name: '9 人守卫变体',
  totalPlayers: 9,
  roles: ROLES_9_GUARD,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: STANDARD_WIN_CONDITIONS,
  features: {},
};

/** 9-player idiot variant: 3 wolves + seer + witch + hunter + idiot + 2 villagers. */
const ROLES_9_IDIOT: readonly Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'hunter',
  'idiot',
  'villager',
  'villager',
] as const;

export const BOARD_9_IDIOT_VARIANT: BoardConfig = {
  id: '9-idiot',
  name: '9 人白痴变体',
  totalPlayers: 9,
  roles: ROLES_9_IDIOT,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: STANDARD_WIN_CONDITIONS,
  features: {},
};

/** 9-player knight variant: 3 wolves + seer + witch + hunter + knight + 2 villagers. */
const ROLES_9_KNIGHT: readonly Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'hunter',
  'knight',
  'villager',
  'villager',
] as const;

export const BOARD_9_KNIGHT_VARIANT: BoardConfig = {
  id: '9-knight',
  name: '9 人骑士变体',
  totalPlayers: 9,
  roles: ROLES_9_KNIGHT,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: STANDARD_WIN_CONDITIONS,
  features: {},
};

/** 9-player cupid variant: 3 wolves + seer + witch + hunter + cupid + 2 villagers. */
const ROLES_9_CUPID: readonly Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'hunter',
  'cupid',
  'villager',
  'villager',
] as const;

/** Cupid board uses lover-cross-win: lovers form their own faction when only they remain. */
const CUPID_WIN_CONDITIONS: readonly WinCondition[] = [
  { type: 'only-lovers-alive', faction: 'lovers' },
  { type: 'all-wolves-dead', faction: 'villagers' },
  { type: 'all-gods-dead', faction: 'wolves' },
  { type: 'all-villagers-dead', faction: 'wolves' },
] as const;

export const BOARD_9_CUPID_VARIANT: BoardConfig = {
  id: '9-cupid',
  name: '9 人丘比特变体',
  totalPlayers: 9,
  roles: ROLES_9_CUPID,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: CUPID_WIN_CONDITIONS,
  features: { loversCrossWin: true },
};

/**
 * 9-player slaughter-side (屠边局):
 * 3 wolves + seer + witch + hunter + 3 villagers — same roles as standard
 * but with the 屠边 win condition: wolves win when EITHER all gods OR all
 * villagers are dead (not requiring both).
 */
const SLAUGHTER_WIN_CONDITIONS: readonly WinCondition[] = [
  { type: 'all-wolves-dead', faction: 'villagers' },
  { type: 'either-gods-or-villagers-dead', faction: 'wolves' },
] as const;

export const BOARD_9_SLAUGHTER_SIDE: BoardConfig = {
  id: '9-slaughter',
  name: '9 人屠边局',
  totalPlayers: 9,
  roles: ROLES_9_STANDARD,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: SLAUGHTER_WIN_CONDITIONS,
  features: {},
};

/**
 * 12-player full-gods board (狼/预/女/猎/守/白):
 * 4 wolves + seer + witch + hunter + guard + idiot + 3 villagers = 12.
 */
const ROLES_12_FULL: readonly Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'hunter',
  'guard',
  'idiot',
  'villager',
  'villager',
  'villager',
] as const;

export const BOARD_12_FULL_GODS: BoardConfig = {
  id: '12-full',
  name: '12 人完整神局',
  totalPlayers: 12,
  roles: ROLES_12_FULL,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: STANDARD_WIN_CONDITIONS,
  features: {},
};

/**
 * 12-player Pre-Witch-Hunter-Idiot (预女猎白) board:
 * 4 wolves + seer + witch + hunter + idiot + 4 villagers = 12, no guard.
 */
const ROLES_12_SWHI: readonly Role[] = [
  'werewolf',
  'werewolf',
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'hunter',
  'idiot',
  'villager',
  'villager',
  'villager',
  'villager',
] as const;

export const BOARD_12_SWHI: BoardConfig = {
  id: '12-swhi',
  name: '12 人预女猎白',
  totalPlayers: 12,
  roles: ROLES_12_SWHI,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: STANDARD_WIN_CONDITIONS,
  features: {},
};

/**
 * 12-player sheriff board: same role composition as 12-full but with the
 * sheriff election system enabled (1.5 vote weight, badge transfer on death).
 */
export const BOARD_12_SHERIFF: BoardConfig = {
  id: '12-sheriff',
  name: '12 人警长局',
  totalPlayers: 12,
  roles: ROLES_12_FULL,
  phaseOrder: STANDARD_PHASE_ORDER,
  winConditions: STANDARD_WIN_CONDITIONS,
  features: { sheriff: true },
};

/**
 * Registry of all defined boards. New boards (12-player, 屠边, 警长 etc.)
 * register themselves here in later phases.
 */
export const BOARDS: Record<string, BoardConfig> = {
  [BOARD_9_STANDARD.id]: BOARD_9_STANDARD,
  [BOARD_9_GUARD_VARIANT.id]: BOARD_9_GUARD_VARIANT,
  [BOARD_9_IDIOT_VARIANT.id]: BOARD_9_IDIOT_VARIANT,
  [BOARD_9_KNIGHT_VARIANT.id]: BOARD_9_KNIGHT_VARIANT,
  [BOARD_9_CUPID_VARIANT.id]: BOARD_9_CUPID_VARIANT,
  [BOARD_9_SLAUGHTER_SIDE.id]: BOARD_9_SLAUGHTER_SIDE,
  [BOARD_12_FULL_GODS.id]: BOARD_12_FULL_GODS,
  [BOARD_12_SWHI.id]: BOARD_12_SWHI,
  [BOARD_12_SHERIFF.id]: BOARD_12_SHERIFF,
};

export const DEFAULT_BOARD_ID = BOARD_9_STANDARD.id;

export function getBoard(id: string | undefined): BoardConfig {
  if (!id) return BOARD_9_STANDARD;
  const board = BOARDS[id];
  if (!board) {
    throw new Error(`Unknown board id: ${id}`);
  }
  return board;
}
