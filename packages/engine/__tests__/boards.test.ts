import { describe, expect, it } from 'vitest';
import { createGame, getAlive, progress } from '../src/state-machine.js';
import { BOARDS, getBoard } from '@wfk/shared';
import type { BoardConfig, GameConfig, Role } from '@wfk/shared';

const TEST_SEED = 'board-test-seed';

describe('Board Registry', () => {
  it('contains all 9 boards', () => {
    const boardIds = Object.keys(BOARDS);
    expect(boardIds).toHaveLength(9);
    expect(boardIds).toContain('9-standard');
    expect(boardIds).toContain('9-guard');
    expect(boardIds).toContain('9-idiot');
    expect(boardIds).toContain('9-knight');
    expect(boardIds).toContain('9-cupid');
    expect(boardIds).toContain('9-slaughter');
    expect(boardIds).toContain('12-full');
    expect(boardIds).toContain('12-swhi');
    expect(boardIds).toContain('12-sheriff');
  });

  it('getBoard returns default board when id is undefined', () => {
    const board = getBoard(undefined);
    expect(board.id).toBe('9-standard');
  });

  it('getBoard throws error for unknown board id', () => {
    expect(() => getBoard('unknown-board')).toThrow('Unknown board id: unknown-board');
  });
});

describe('Board Configuration Validation', () => {
  Object.values(BOARDS).forEach((board) => {
    describe(`${board.name} (${board.id})`, () => {
      it('has correct totalPlayers matching roles length', () => {
        expect(board.roles.length).toBe(board.totalPlayers);
      });

      it('has valid phase order', () => {
        expect(board.phaseOrder.length).toBeGreaterThan(0);
        expect(board.phaseOrder).toContain('WEREWOLF_KILL');
        expect(board.phaseOrder).toContain('DAY_VOTE');
      });

      it('has at least one win condition', () => {
        expect(board.winConditions.length).toBeGreaterThan(0);
      });

      it('has at least one werewolf', () => {
        const werewolfCount = board.roles.filter((r) => r === 'werewolf').length;
        expect(werewolfCount).toBeGreaterThanOrEqual(1);
      });

      it('has valid role composition', () => {
        const validRoles: Role[] = [
          'werewolf',
          'seer',
          'witch',
          'hunter',
          'guard',
          'idiot',
          'knight',
          'cupid',
          'villager',
        ];
        board.roles.forEach((role) => {
          expect(validRoles).toContain(role);
        });
      });
    });
  });
});

describe('9-player Standard Board', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '9-standard' };

  it('creates game with correct role distribution', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(3);
    expect(roleCounts.seer).toBe(1);
    expect(roleCounts.witch).toBe(1);
    expect(roleCounts.hunter).toBe(1);
    expect(roleCounts.villager).toBe(3);
    expect(roleCounts.guard).toBeUndefined();
  });

  it('has no special features enabled', () => {
    const board = getBoard('9-standard');
    expect(board.features.sheriff).toBeUndefined();
    expect(board.features.loversCrossWin).toBeUndefined();
  });

  it('can progress to first night phase', () => {
    const state = createGame(config);
    const { next, pending } = progress(state);
    expect(next.phase).toBe('WEREWOLF_KILL');
    expect(pending.length).toBe(3); // 3 wolves
  });
});

describe('9-player Guard Variant', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '9-guard' };

  it('creates game with guard instead of one villager', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(3);
    expect(roleCounts.guard).toBe(1);
    expect(roleCounts.villager).toBe(2);
  });

  it('includes GUARD_PROTECT phase', () => {
    const board = getBoard('9-guard');
    expect(board.phaseOrder).toContain('GUARD_PROTECT');
  });
});

describe('9-player Idiot Variant', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '9-idiot' };

  it('creates game with idiot instead of one villager', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(3);
    expect(roleCounts.idiot).toBe(1);
    expect(roleCounts.villager).toBe(2);
  });
});

describe('9-player Knight Variant', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '9-knight' };

  it('creates game with knight instead of one villager', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(3);
    expect(roleCounts.knight).toBe(1);
    expect(roleCounts.villager).toBe(2);
  });
});

describe('9-player Cupid Variant', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '9-cupid' };

  it('creates game with cupid instead of one villager', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(3);
    expect(roleCounts.cupid).toBe(1);
    expect(roleCounts.villager).toBe(2);
  });

  it('has loversCrossWin feature enabled', () => {
    const board = getBoard('9-cupid');
    expect(board.features.loversCrossWin).toBe(true);
  });

  it('includes CUPID_LINK phase', () => {
    const board = getBoard('9-cupid');
    expect(board.phaseOrder).toContain('CUPID_LINK');
  });

  it('has only-lovers-alive win condition', () => {
    const board = getBoard('9-cupid');
    const hasLoversWin = board.winConditions.some((wc) => wc.type === 'only-lovers-alive');
    expect(hasLoversWin).toBe(true);
  });
});

describe('9-player Slaughter Side Board', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '9-slaughter' };

  it('has same roles as standard board', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(3);
    expect(roleCounts.seer).toBe(1);
    expect(roleCounts.witch).toBe(1);
    expect(roleCounts.hunter).toBe(1);
    expect(roleCounts.villager).toBe(3);
  });

  it('has either-gods-or-villagers-dead win condition', () => {
    const board = getBoard('9-slaughter');
    const hasSlaughterWin = board.winConditions.some(
      (wc) => wc.type === 'either-gods-or-villagers-dead'
    );
    expect(hasSlaughterWin).toBe(true);
  });

  it('does not have separate all-gods-dead and all-villagers-dead conditions', () => {
    const board = getBoard('9-slaughter');
    const hasAllGodsDead = board.winConditions.some((wc) => wc.type === 'all-gods-dead');
    const hasAllVillagersDead = board.winConditions.some(
      (wc) => wc.type === 'all-villagers-dead'
    );
    expect(hasAllGodsDead).toBe(false);
    expect(hasAllVillagersDead).toBe(false);
  });
});

describe('12-player Full Gods Board', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '12-full' };

  it('creates game with 12 players', () => {
    const state = createGame(config);
    expect(state.players.length).toBe(12);
  });

  it('has correct role distribution', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(4);
    expect(roleCounts.seer).toBe(1);
    expect(roleCounts.witch).toBe(1);
    expect(roleCounts.hunter).toBe(1);
    expect(roleCounts.guard).toBe(1);
    expect(roleCounts.idiot).toBe(1);
    expect(roleCounts.villager).toBe(3);
  });
});

describe('12-player SWHI Board (预女猎白)', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '12-swhi' };

  it('creates game with 12 players', () => {
    const state = createGame(config);
    expect(state.players.length).toBe(12);
  });

  it('has seer, witch, hunter, idiot but no guard', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(4);
    expect(roleCounts.seer).toBe(1);
    expect(roleCounts.witch).toBe(1);
    expect(roleCounts.hunter).toBe(1);
    expect(roleCounts.idiot).toBe(1);
    expect(roleCounts.guard).toBeUndefined();
    expect(roleCounts.villager).toBe(4);
  });
});

describe('12-player Sheriff Board', () => {
  const config: GameConfig = { seed: TEST_SEED, boardId: '12-sheriff' };

  it('creates game with 12 players', () => {
    const state = createGame(config);
    expect(state.players.length).toBe(12);
  });

  it('has sheriff feature enabled', () => {
    const board = getBoard('12-sheriff');
    expect(board.features.sheriff).toBe(true);
  });

  it('has same role composition as 12-full', () => {
    const state = createGame(config);
    const roleCounts = countRoles(state.players.map((p) => p.role));

    expect(roleCounts.werewolf).toBe(4);
    expect(roleCounts.seer).toBe(1);
    expect(roleCounts.witch).toBe(1);
    expect(roleCounts.hunter).toBe(1);
    expect(roleCounts.guard).toBe(1);
    expect(roleCounts.idiot).toBe(1);
    expect(roleCounts.villager).toBe(3);
  });

  it('initializes sheriff state', () => {
    const state = createGame(config);
    expect(state.sheriff).toBeDefined();
    expect(state.sheriff.playerId).toBeNull();
    expect(state.sheriff.badgeDestroyed).toBe(false);
  });
});

describe('Determinism Across All Boards', () => {
  Object.keys(BOARDS).forEach((boardId) => {
    it(`${boardId} produces identical role assignments with same seed`, () => {
      const config: GameConfig = { seed: 'determinism-test', boardId };
      const state1 = createGame(config);
      const state2 = createGame(config);

      const roles1 = state1.players.map((p) => p.role);
      const roles2 = state2.players.map((p) => p.role);

      expect(roles1).toEqual(roles2);
    });
  });
});

describe('Game Progression for All Boards', () => {
  Object.keys(BOARDS).forEach((boardId) => {
    it(`${boardId} can progress from GAME_START to first action phase`, () => {
      const config: GameConfig = { seed: TEST_SEED, boardId };
      const state = createGame(config);
      const { next, pending } = progress(state);

      // Should advance to a phase requiring player action
      expect(next.phase).not.toBe('GAME_START');
      expect(pending.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function countRoles(roles: Role[]): Record<string, number> {
  return roles.reduce<Record<string, number>>((acc, role) => {
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
}
