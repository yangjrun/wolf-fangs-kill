import type { GameState, Player } from '@wfk/shared';
import { PHASE_NAMES_ZH } from '@wfk/shared';

export interface UserMessageParams {
  state: GameState;
  agentPlayer: Player;
  privateInfo: string;
  instruction: string;
}

/**
 * Compose the dynamic user message sent to the AI for a single decision.
 * This is built fresh each call - NOT accumulated. The AI's history lives
 * in the publicLog and is reconstructed every turn.
 *
 * Information is wrapped in XML tags so the model can parse it reliably
 * and so we can grep prompts during debugging.
 */
export function buildUserMessage(params: UserMessageParams): string {
  const { state, agentPlayer, privateInfo, instruction } = params;
  const alive = state.players.filter((p) => p.alive);
  const dead = state.players.filter((p) => !p.alive);
  const phaseName = PHASE_NAMES_ZH[state.phase];

  // Public log: all speeches across all days
  const publicLogText =
    state.publicLog.length > 0
      ? state.publicLog
          .map((s) => `[D${s.day}] ${s.playerId}：${s.content}`)
          .join('\n')
      : '(暂无公开发言)';

  // Death log: chronological, public information
  const deathLogText =
    state.deathLog.length > 0
      ? state.deathLog
          .map((d) => `[D${d.day} ${d.phase}] ${d.playerId} 出局 (${d.cause})`)
          .join('\n')
      : '(尚无人出局)';

  // Today's speeches so far (relevant during DAY_DISCUSSION)
  const todaySpeechesText =
    state.currentDay.speeches.length > 0
      ? state.currentDay.speeches
          .map((s) => `${s.playerId}：${s.content}`)
          .join('\n')
      : '(本轮尚无发言)';

  return `<phase>第 ${state.day} 天 — ${phaseName}（${state.phase}）</phase>

<alive>${alive.map((p) => p.id).join(', ')}</alive>

<dead>${dead.length > 0 ? dead.map((p) => p.id).join(', ') : '无'}</dead>

<death_log>
${deathLogText}
</death_log>

<public_log>
${publicLogText}
</public_log>

<today_speeches>
${todaySpeechesText}
</today_speeches>

<private_info>
${privateInfo}
</private_info>

<instruction>
${instruction}
</instruction>`;
}
