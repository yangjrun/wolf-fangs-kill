import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_TEMPERATURES,
  DIFFICULTY_PROMPT_SUFFIX,
  DIFFICULTY_OBSCURE_TEAMMATES,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_NAMES_ZH,
} from '@wfk/shared';
import type { Difficulty } from '@wfk/shared';
import { buildSystemPrompt } from '../src/prompts/system.js';
import { buildPrivateInfo } from '../src/prompts/private-info.js';
import { createGame } from '@wfk/engine';

const TEST_SEED = 'difficulty-test';

describe('Difficulty Configuration', () => {
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert'];

  it('has temperature settings for all difficulties', () => {
    difficulties.forEach((diff) => {
      expect(DIFFICULTY_TEMPERATURES[diff]).toBeDefined();
      expect(typeof DIFFICULTY_TEMPERATURES[diff]).toBe('number');
    });
  });

  it('has decreasing temperatures from easy to expert', () => {
    expect(DIFFICULTY_TEMPERATURES.easy).toBeGreaterThan(DIFFICULTY_TEMPERATURES.normal);
    expect(DIFFICULTY_TEMPERATURES.normal).toBeGreaterThan(DIFFICULTY_TEMPERATURES.hard);
    expect(DIFFICULTY_TEMPERATURES.hard).toBeGreaterThanOrEqual(DIFFICULTY_TEMPERATURES.expert);
  });

  it('has prompt suffix for all difficulties', () => {
    difficulties.forEach((diff) => {
      expect(DIFFICULTY_PROMPT_SUFFIX[diff]).toBeDefined();
      expect(typeof DIFFICULTY_PROMPT_SUFFIX[diff]).toBe('string');
      expect(DIFFICULTY_PROMPT_SUFFIX[diff].length).toBeGreaterThan(0);
    });
  });

  it('has teammate obscuring settings for all difficulties', () => {
    difficulties.forEach((diff) => {
      expect(DIFFICULTY_OBSCURE_TEAMMATES[diff]).toBeDefined();
      expect(typeof DIFFICULTY_OBSCURE_TEAMMATES[diff]).toBe('boolean');
    });
  });

  it('obscures teammates only in hard and expert modes', () => {
    expect(DIFFICULTY_OBSCURE_TEAMMATES.easy).toBe(false);
    expect(DIFFICULTY_OBSCURE_TEAMMATES.normal).toBe(false);
    expect(DIFFICULTY_OBSCURE_TEAMMATES.hard).toBe(true);
    expect(DIFFICULTY_OBSCURE_TEAMMATES.expert).toBe(true);
  });

  it('has Chinese names for all difficulties', () => {
    difficulties.forEach((diff) => {
      expect(DIFFICULTY_NAMES_ZH[diff]).toBeDefined();
      expect(typeof DIFFICULTY_NAMES_ZH[diff]).toBe('string');
    });
  });

  it('default difficulty is normal', () => {
    expect(DEFAULT_DIFFICULTY).toBe('normal');
  });
});

describe('Temperature Settings', () => {
  it('easy mode has high temperature (1.0) for randomness', () => {
    expect(DIFFICULTY_TEMPERATURES.easy).toBe(1.0);
  });

  it('normal mode has moderate temperature (0.7)', () => {
    expect(DIFFICULTY_TEMPERATURES.normal).toBe(0.7);
  });

  it('hard mode has low temperature (0.3) for focused play', () => {
    expect(DIFFICULTY_TEMPERATURES.hard).toBe(0.3);
  });

  it('expert mode has very low temperature (0.2) for deterministic play', () => {
    expect(DIFFICULTY_TEMPERATURES.expert).toBe(0.2);
  });

  it('all temperatures are within valid range [0, 1]', () => {
    Object.values(DIFFICULTY_TEMPERATURES).forEach((temp) => {
      expect(temp).toBeGreaterThanOrEqual(0);
      expect(temp).toBeLessThanOrEqual(1);
    });
  });
});

describe('Prompt Suffix Content', () => {
  it('easy mode mentions beginner playstyle', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.easy;
    expect(suffix).toContain('新手');
    expect(suffix).toContain('直白');
  });

  it('normal mode mentions standard tactics', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.normal;
    expect(suffix).toContain('标准');
    expect(suffix).toContain('基础战术');
  });

  it('hard mode mentions advanced tactics', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.hard;
    expect(suffix).toContain('高手');
    expect(suffix).toContain('深度博弈');
    expect(suffix).toContain('悍跳');
  });

  it('expert mode mentions master-level tactics', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.expert;
    expect(suffix).toContain('职业');
    expect(suffix).toContain('大师级');
    expect(suffix).toContain('5步');
  });

  it('speech length requirements decrease with difficulty', () => {
    const easy = DIFFICULTY_PROMPT_SUFFIX.easy;
    const normal = DIFFICULTY_PROMPT_SUFFIX.normal;
    const hard = DIFFICULTY_PROMPT_SUFFIX.hard;
    const expert = DIFFICULTY_PROMPT_SUFFIX.expert;

    // Easy: 80-150字
    expect(easy).toContain('80-150');
    // Normal: 60-120字
    expect(normal).toContain('60-120');
    // Hard: 40-80字
    expect(hard).toContain('40-80');
    // Expert: 30-60字
    expect(expert).toContain('30-60');
  });

  it('internal_thought requirements increase with difficulty', () => {
    const normal = DIFFICULTY_PROMPT_SUFFIX.normal;
    const hard = DIFFICULTY_PROMPT_SUFFIX.hard;
    const expert = DIFFICULTY_PROMPT_SUFFIX.expert;

    // Normal: 至少 50 字
    expect(normal).toContain('50 字');
    // Hard: 必须 100+ 字
    expect(hard).toContain('100+');
    // Expert: 必须 150+ 字
    expect(expert).toContain('150+');
  });
});

describe('System Prompt Integration', () => {
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert'];

  difficulties.forEach((difficulty) => {
    it(`${difficulty} mode includes difficulty suffix in system prompt`, () => {
      const systemPrompt = buildSystemPrompt({
        persona: {
          id: 'test',
          name: '测试',
          avatar: 'test.png',
          description: '测试背景',
          speechStyle: '测试风格',
        },
        role: 'villager',
        playerId: 'player_1',
        seat: 1,
        difficulty,
      });

      const suffix = DIFFICULTY_PROMPT_SUFFIX[difficulty];
      expect(systemPrompt).toContain(suffix);
    });
  });

  it('system prompt is static (no dynamic content)', () => {
    const prompt1 = buildSystemPrompt({
      persona: {
        id: 'test',
        name: '测试',
        avatar: 'test.png',
        description: '测试背景',
        speechStyle: '测试风格',
      },
      role: 'villager',
      playerId: 'player_1',
      seat: 1,
      difficulty: 'normal',
    });

    const prompt2 = buildSystemPrompt({
      persona: {
        id: 'test',
        name: '测试',
        avatar: 'test.png',
        description: '测试背景',
        speechStyle: '测试风格',
      },
      role: 'villager',
      playerId: 'player_1',
      seat: 1,
      difficulty: 'normal',
    });

    expect(prompt1).toBe(prompt2);
  });
});

describe('Private Info Obscuring', () => {
  it('easy mode shows clear teammate info for werewolves', () => {
    const state = createGame({ seed: TEST_SEED, boardId: '9-standard' });
    const werewolf = state.players.find((p) => p.role === 'werewolf')!;

    const privateInfo = buildPrivateInfo(state, werewolf, 'easy');

    // Should contain teammate player IDs
    expect(privateInfo).toContain('队友');
    expect(privateInfo).toMatch(/player_\d+/);
  });

  it('normal mode shows clear teammate info for werewolves', () => {
    const state = createGame({ seed: TEST_SEED, boardId: '9-standard' });
    const werewolf = state.players.find((p) => p.role === 'werewolf')!;

    const privateInfo = buildPrivateInfo(state, werewolf, 'normal');

    expect(privateInfo).toContain('队友');
    expect(privateInfo).toMatch(/player_\d+/);
  });

  it('hard mode obscures teammate info (seat sum only)', () => {
    const state = createGame({ seed: TEST_SEED, boardId: '9-standard' });
    const werewolf = state.players.find((p) => p.role === 'werewolf')!;

    const privateInfo = buildPrivateInfo(state, werewolf, 'hard');

    // Should contain seat sum hint, not player IDs
    expect(privateInfo).toContain('座位');
    expect(privateInfo).toContain('之和');
    // Should NOT contain explicit player IDs (except self)
    const otherWolves = state.players.filter(
      (p) => p.role === 'werewolf' && p.id !== werewolf.id
    );
    otherWolves.forEach((w) => {
      expect(privateInfo).not.toContain(w.id);
    });
  });

  it('expert mode obscures teammate info (seat sum only)', () => {
    const state = createGame({ seed: TEST_SEED, boardId: '9-standard' });
    const werewolf = state.players.find((p) => p.role === 'werewolf')!;

    const privateInfo = buildPrivateInfo(state, werewolf, 'expert');

    expect(privateInfo).toContain('座位');
    expect(privateInfo).toContain('之和');
  });

  it('non-werewolf roles have same private info across difficulties', () => {
    const state = createGame({ seed: TEST_SEED, boardId: '9-standard' });
    const seer = state.players.find((p) => p.role === 'seer');

    if (!seer) {
      throw new Error('Seer not found in game state');
    }

    const easyInfo = buildPrivateInfo(state, seer, 'easy');
    const hardInfo = buildPrivateInfo(state, seer, 'hard');

    // Seer has no teammates, so info should be identical
    expect(easyInfo).toBe(hardInfo);
  });
});

describe('Difficulty Progression', () => {
  it('has clear progression from easy to expert', () => {
    const progression = [
      { diff: 'easy', temp: DIFFICULTY_TEMPERATURES.easy, obscure: false },
      { diff: 'normal', temp: DIFFICULTY_TEMPERATURES.normal, obscure: false },
      { diff: 'hard', temp: DIFFICULTY_TEMPERATURES.hard, obscure: true },
      { diff: 'expert', temp: DIFFICULTY_TEMPERATURES.expert, obscure: true },
    ];

    // Temperature decreases
    for (let i = 0; i < progression.length - 1; i++) {
      const current = progression[i];
      const next = progression[i + 1];
      if (current && next) {
        expect(current.temp).toBeGreaterThanOrEqual(next.temp);
      }
    }

    // Obscuring increases
    expect(progression[0]?.obscure).toBe(false);
    expect(progression[1]?.obscure).toBe(false);
    expect(progression[2]?.obscure).toBe(true);
    expect(progression[3]?.obscure).toBe(true);
  });
});

describe('Tactical Complexity', () => {
  it('easy mode has simple tactics', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.easy;
    expect(suffix).toContain('直接');
    expect(suffix).toContain('显眼');
    expect(suffix).not.toContain('悍跳');
    expect(suffix).not.toContain('深水');
  });

  it('normal mode introduces basic tactics', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.normal;
    expect(suffix).toContain('基础战术');
    expect(suffix).toContain('悍跳预言家');
    expect(suffix).toContain('刀神职');
  });

  it('hard mode includes advanced tactics', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.hard;
    expect(suffix).toContain('悍跳预言家');
    expect(suffix).toContain('刀边战术');
    expect(suffix).toContain('污身份');
    expect(suffix).toContain('深水狼');
    expect(suffix).toContain('逼身份');
    expect(suffix).toContain('抓矛盾');
  });

  it('expert mode includes master-level tactics', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.expert;
    expect(suffix).toContain('深度悍跳');
    expect(suffix).toContain('信息战');
    expect(suffix).toContain('心理操控');
    expect(suffix).toContain('博弈树');
    expect(suffix).toContain('概率计算');
  });
});

describe('Reasoning Depth Requirements', () => {
  it('easy mode has no explicit reasoning requirements', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.easy;
    expect(suffix).not.toContain('internal_thought');
  });

  it('normal mode requires basic reasoning (50+ chars)', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.normal;
    expect(suffix).toContain('internal_thought');
    expect(suffix).toContain('50 字');
  });

  it('hard mode requires deep reasoning (100+ chars)', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.hard;
    expect(suffix).toContain('internal_thought 必须 100+');
    expect(suffix).toContain('多步推演');
    expect(suffix).toContain('风险评估');
  });

  it('expert mode requires extreme reasoning (150+ chars)', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.expert;
    expect(suffix).toContain('internal_thought 必须 150+');
    expect(suffix).toContain('5步推演');
    expect(suffix).toContain('概率分布');
    expect(suffix).toContain('期望收益');
  });
});

describe('Speech Style Requirements', () => {
  it('easy mode allows longer, simpler speech', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.easy;
    expect(suffix).toContain('80-150');
    expect(suffix).toContain('直白');
  });

  it('normal mode requires clear, moderate-length speech', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.normal;
    expect(suffix).toContain('60-120');
    expect(suffix).toContain('清晰表达');
  });

  it('hard mode requires concise, aggressive speech', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.hard;
    expect(suffix).toContain('40-80');
    expect(suffix).toContain('简洁有力');
    expect(suffix).toContain('有攻击性');
  });

  it('expert mode requires ultra-concise, multi-layered speech', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.expert;
    expect(suffix).toContain('30-60');
    expect(suffix).toContain('精心选择');
    expect(suffix).toContain('多层含义');
  });
});

describe('Win Rate Expectations', () => {
  it('expert mode has explicit win rate targets', () => {
    const suffix = DIFFICULTY_PROMPT_SUFFIX.expert;
    expect(suffix).toContain('胜率目标');
    expect(suffix).toContain('≥ 60%');
    expect(suffix).toContain('≥ 70%');
  });

  it('lower difficulties do not mention win rates', () => {
    expect(DIFFICULTY_PROMPT_SUFFIX.easy).not.toContain('胜率');
    expect(DIFFICULTY_PROMPT_SUFFIX.normal).not.toContain('胜率');
    expect(DIFFICULTY_PROMPT_SUFFIX.hard).not.toContain('胜率');
  });
});
