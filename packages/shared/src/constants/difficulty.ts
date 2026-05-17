import type { Difficulty } from '../types/game.js';

/**
 * Per-difficulty LLM temperature. Higher = more random/creative; lower = more
 * focused/deterministic.
 */
export const DIFFICULTY_TEMPERATURES: Record<Difficulty, number> = {
  easy: 1.0,
  normal: 0.7,
  hard: 0.5,
};

/**
 * Suffix appended to the agent's system prompt to shape playstyle.
 */
export const DIFFICULTY_PROMPT_SUFFIX: Record<Difficulty, string> = {
  easy: `
# 难度调整 — Easy
你是新手玩家，思路直白，倾向于：
- 直接表达感受、不善于伪装
- 优先做最显眼的"政治正确"决策
- 容易相信第一个跳预言家的玩家
- 发言较短，少做心理博弈`,
  normal: '',
  hard: `
# 难度调整 — Hard
你是高水平玩家，擅长长线博弈，倾向于：
- 多步思考：考虑这条信息会如何影响后续局势
- 留口子：不要把所有牌都打出来，给狼人/好人留误判空间
- 注意发言节奏与统一性，避免前后矛盾
- 重视情绪/反向心理，识破对手的悍跳与对跳
- 你的 internal_thought 应包含至少 50 字的多步推理`,
};

/**
 * Whether to obscure private info (e.g. werewolf teammates) for the given
 * difficulty. In hard mode, werewolves only see teammate seat numbers as a
 * cryptic hint (e.g. "队友座位 sum=N") rather than the exact ids.
 */
export const DIFFICULTY_OBSCURE_TEAMMATES: Record<Difficulty, boolean> = {
  easy: false,
  normal: false,
  hard: true,
};

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export const DIFFICULTY_NAMES_ZH: Record<Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};
