import { describe, expect, it } from 'vitest';
import { buildPrivateInfo } from '../src/prompts/private-info.js';
import { buildSystemPrompt } from '../src/prompts/system.js';
import { buildUserMessage } from '../src/prompts/user-message.js';
import { getAllowedTools, getInstruction } from '../src/tool-router.js';
import { createGame, applyAction, progress } from '@wfk/engine';
import { PERSONAS } from '@wfk/shared';
import type { GameState, Player } from '@wfk/shared';

const SEED = 'iso-test-001';

function getRolePlayer(state: GameState, role: Player['role']): Player {
  const p = state.players.find((pl) => pl.role === role);
  if (!p) throw new Error(`No ${role} in state`);
  return p;
}

describe('Information isolation - buildPrivateInfo', () => {
  it('villager sees no role-specific privileged information', () => {
    const state = createGame({ seed: SEED });
    const villager = getRolePlayer(state, 'villager');
    const info = buildPrivateInfo(state, villager);

    expect(info).not.toContain('狼队友');
    expect(info).not.toContain('查验');
    expect(info).not.toContain('解药');
    expect(info).not.toContain('毒药');
    expect(info).toContain('平民');
  });

  it('werewolf sees teammates but not seer / witch info', () => {
    const state = createGame({ seed: SEED });
    const wolf = getRolePlayer(state, 'werewolf');
    const info = buildPrivateInfo(state, wolf);

    expect(info).toContain('狼队友');
    expect(info).not.toContain('查验记录');
    expect(info).not.toContain('解药');
  });

  it('seer sees check records but not werewolf teammates', () => {
    const state = createGame({ seed: SEED });
    const seer = getRolePlayer(state, 'seer');
    const info = buildPrivateInfo(state, seer);

    expect(info).toMatch(/查验|预言家/);
    expect(info).not.toContain('狼队友');
    expect(info).not.toContain('解药');
  });

  it('witch sees potion status but not seer check records', () => {
    const state = createGame({ seed: SEED });
    const witch = getRolePlayer(state, 'witch');
    const info = buildPrivateInfo(state, witch);

    expect(info).toContain('解药');
    expect(info).toContain('毒药');
    expect(info).not.toContain('狼队友');
    expect(info).not.toContain('查验记录');
  });

  it('hunter does not see seer / wolf / witch info', () => {
    const state = createGame({ seed: SEED });
    const hunter = getRolePlayer(state, 'hunter');
    const info = buildPrivateInfo(state, hunter);

    expect(info).toContain('猎人');
    expect(info).not.toContain('狼队友');
    expect(info).not.toContain('查验记录');
    expect(info).not.toContain('解药');
  });

  it('werewolf private info lists ALL teammates, not just self', () => {
    const state = createGame({ seed: SEED });
    const wolves = state.players.filter((p) => p.role === 'werewolf');
    expect(wolves.length).toBe(3);

    const focusWolf = wolves[0]!;
    const otherWolves = wolves.slice(1);

    const info = buildPrivateInfo(state, focusWolf);
    for (const w of otherWolves) {
      expect(info).toContain(w.id);
    }
    // Should NOT contain self-id in teammates list (we're the focus)
    // (it can appear in the leading "你是..." line, so we just check it doesn't lie about being a teammate)
  });
});

describe('System prompt - stability for cache', () => {
  it('produces identical system prompt for same persona+role+player', () => {
    const state = createGame({ seed: SEED });
    const wolf = getRolePlayer(state, 'werewolf');
    const persona = PERSONAS[0]!;

    const p1 = buildSystemPrompt({
      persona,
      role: wolf.role,
      playerId: wolf.id,
      seat: wolf.seat,
    });
    const p2 = buildSystemPrompt({
      persona,
      role: wolf.role,
      playerId: wolf.id,
      seat: wolf.seat,
    });

    expect(p1).toBe(p2);
  });

  it('does not contain dynamic content (date, time, alive list)', () => {
    const state = createGame({ seed: SEED });
    const wolf = getRolePlayer(state, 'werewolf');
    const persona = PERSONAS[0]!;
    const prompt = buildSystemPrompt({
      persona,
      role: wolf.role,
      playerId: wolf.id,
      seat: wolf.seat,
    });

    // Must not contain current year or "存活" list
    expect(prompt).not.toMatch(/2025|2026|2027/);
    expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2}/);  // date pattern
    expect(prompt).not.toContain('存活玩家:');  // alive list would be dynamic
  });
});

describe('User message - dynamic content placement', () => {
  it('includes all expected XML tags', () => {
    const state = createGame({ seed: SEED });
    const wolf = getRolePlayer(state, 'werewolf');
    const msg = buildUserMessage({
      state,
      agentPlayer: wolf,
      privateInfo: 'test private',
      instruction: 'test instruction',
    });

    expect(msg).toContain('<phase>');
    expect(msg).toContain('<alive>');
    expect(msg).toContain('<dead>');
    expect(msg).toContain('<public_log>');
    expect(msg).toContain('<private_info>');
    expect(msg).toContain('<instruction>');
  });

  it('alive list updates as the game progresses', () => {
    let state = createGame({ seed: SEED });
    const initialAlive = state.players.filter((p) => p.alive).length;
    expect(initialAlive).toBe(9);

    // Kill one off (cheat directly for the test)
    state = {
      ...state,
      players: state.players.map((p, i) => (i === 0 ? { ...p, alive: false } : p)),
    };

    const msg = buildUserMessage({
      state,
      agentPlayer: state.players[1]!,
      privateInfo: '',
      instruction: '',
    });

    expect(msg).not.toContain('player_1, player_2');  // player_1 dead, shouldn't be in alive list
    expect(msg).toContain('player_1');  // but should be in dead list
  });
});

describe('Tool router', () => {
  it('only allows werewolf_kill for wolves in WEREWOLF_KILL phase', () => {
    const initial = createGame({ seed: SEED });
    const { next } = progress(initial);
    expect(next.phase).toBe('WEREWOLF_KILL');

    const wolf = getRolePlayer(next, 'werewolf');
    const villager = getRolePlayer(next, 'villager');

    expect(getAllowedTools(next, wolf)).toEqual(['werewolf_kill']);
    expect(getAllowedTools(next, villager)).toEqual([]);
  });

  it('generates phase-appropriate instructions', () => {
    const initial = createGame({ seed: SEED });
    const { next } = progress(initial);
    const wolf = getRolePlayer(next, 'werewolf');
    const instruction = getInstruction(next, wolf);

    expect(instruction).toContain('werewolf_kill');
    expect(instruction).toContain('狼队友');  // mentions teammate rule
  });
});
