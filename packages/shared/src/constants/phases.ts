import type { Phase } from '../types/game.js';

/** Phase progression within a single day (Night -> Day cycle). */
export const PHASE_ORDER: readonly Phase[] = [
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

export const PHASE_NAMES_ZH: Record<Phase, string> = {
  GAME_START: '游戏开始',
  SHERIFF_RUNNING_FOR: '上警阶段',
  SHERIFF_VOTE: '警长投票',
  SHERIFF_BADGE_TRANSFER: '警徽传递',
  NIGHT_START: '天黑请闭眼',
  CUPID_LINK: '丘比特请睁眼',
  GUARD_PROTECT: '守卫请睁眼',
  WEREWOLF_KILL: '狼人请睁眼',
  SEER_CHECK: '预言家请睁眼',
  WITCH_ACTION: '女巫请睁眼',
  NIGHT_RESOLVE: '天亮结算',
  DAY_ANNOUNCE: '公布昨晚情况',
  HUNTER_SHOOT_NIGHT: '猎人开枪',
  DAY_DISCUSSION: '白天发言',
  DAY_VOTE: '投票',
  EXECUTION: '处决',
  HUNTER_SHOOT_DAY: '猎人开枪',
  GAME_END: '游戏结束',
};

export function isNightPhase(phase: Phase): boolean {
  return (
    phase === 'NIGHT_START' ||
    phase === 'CUPID_LINK' ||
    phase === 'GUARD_PROTECT' ||
    phase === 'WEREWOLF_KILL' ||
    phase === 'SEER_CHECK' ||
    phase === 'WITCH_ACTION' ||
    phase === 'NIGHT_RESOLVE' ||
    phase === 'HUNTER_SHOOT_NIGHT'
  );
}

export function isDayPhase(phase: Phase): boolean {
  return (
    phase === 'DAY_ANNOUNCE' ||
    phase === 'DAY_DISCUSSION' ||
    phase === 'DAY_VOTE' ||
    phase === 'EXECUTION' ||
    phase === 'HUNTER_SHOOT_DAY' ||
    phase === 'SHERIFF_RUNNING_FOR' ||
    phase === 'SHERIFF_VOTE' ||
    phase === 'SHERIFF_BADGE_TRANSFER'
  );
}
