import type { Phase } from '../types/game.js';

/**
 * Narration text spoken at each phase entry. Lines marked OPEN are spoken when
 * the phase begins (e.g., "guard, open your eyes"); CLOSE lines (where defined)
 * are spoken when the phase ends. Phases without narration are silent.
 *
 * Used by the frontend Web Speech narrator. Keep lines short and natural-sounding.
 */
export const PHASE_NARRATION_OPEN: Partial<Record<Phase, string>> = {
  NIGHT_START: '天黑了，请所有玩家闭眼。',
  CUPID_LINK: '丘比特，请睁眼，选择两位玩家结为情侣。',
  GUARD_PROTECT: '守卫，请睁眼，选择今晚守护的目标。',
  WEREWOLF_KILL: '狼人，请睁眼，选择今晚击杀的目标。',
  SEER_CHECK: '预言家，请睁眼，选择一位玩家查验。',
  WITCH_ACTION: '女巫，请睁眼。你今晚要使用解药、毒药，还是跳过？',
  NIGHT_RESOLVE: '所有玩家请闭眼，天亮了。',
  DAY_ANNOUNCE: '昨晚的情况公布。',
  HUNTER_SHOOT_NIGHT: '猎人请开枪。',
  DAY_DISCUSSION: '请各位玩家依次发言。',
  DAY_VOTE: '请所有玩家投票。',
  EXECUTION: '处决结算。',
  HUNTER_SHOOT_DAY: '猎人请开枪。',
  SHERIFF_RUNNING_FOR: '现在开始警长上警阶段，有意上警的玩家请举手。',
  SHERIFF_VOTE: '请未上警的玩家为警长候选人投票。',
  SHERIFF_BADGE_TRANSFER: '警长出局，请选择传递警徽或撕毁。',
};

/**
 * Convenience: emit narration for the given phase if defined.
 */
export function narrationForPhase(phase: Phase): string | undefined {
  return PHASE_NARRATION_OPEN[phase];
}
