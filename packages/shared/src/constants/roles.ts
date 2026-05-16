import type { Faction, Role } from '../types/game.js';

export const ROLES = {
  WEREWOLF: 'werewolf',
  SEER: 'seer',
  WITCH: 'witch',
  HUNTER: 'hunter',
  VILLAGER: 'villager',
} as const satisfies Record<string, Role>;

/** 9-player board: 3 wolves + seer + witch + hunter + 3 villagers, no badge. */
export const ROLE_COUNTS_9P: Record<Role, number> = {
  werewolf: 3,
  seer: 1,
  witch: 1,
  hunter: 1,
  villager: 3,
};

export const TOTAL_PLAYERS = 9;

export const ROLE_NAMES_ZH: Record<Role, string> = {
  werewolf: '狼人',
  seer: '预言家',
  witch: '女巫',
  hunter: '猎人',
  villager: '平民',
};

export const ROLE_FACTIONS: Record<Role, Faction> = {
  werewolf: 'wolves',
  seer: 'villagers',
  witch: 'villagers',
  hunter: 'villagers',
  villager: 'villagers',
};

export const GOD_ROLES: ReadonlySet<Role> = new Set(['seer', 'witch', 'hunter']);
export const VILLAGER_ROLES: ReadonlySet<Role> = new Set(['villager']);
export const WOLF_ROLES: ReadonlySet<Role> = new Set(['werewolf']);
