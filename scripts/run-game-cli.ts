#!/usr/bin/env tsx
/**
 * CLI demo: run a full werewolf game.
 *
 * Modes:
 *   pnpm cli                          # dummy bot (no API calls)
 *   pnpm cli --auto                   # real Claude AI for all 8 NPCs
 *   pnpm cli --seed=foo --auto        # specific seed
 *
 * Auto mode requires:
 *   1. Backend running on http://localhost:8787 (run `pnpm dev:backend`)
 *   2. ANTHROPIC_API_KEY env var set
 */

import {
  applyAction,
  createGame,
  findPlayer,
  getAlive,
  progress,
} from '../packages/engine/src/state-machine.js';
import { EventLog } from '../packages/engine/src/event-log.js';
import {
  PERSONAS,
  PHASE_NAMES_ZH,
  ROLE_NAMES_ZH,
} from '../packages/shared/src/index.js';
import type {
  GameEvent,
  GameState,
  PendingAction,
  PlayerAction,
} from '../packages/shared/src/index.js';
import { Agent, LLMClient, Orchestrator } from '../packages/ai-agents/src/index.js';
import { RNG } from '../packages/engine/src/rng.js';

// ─── Args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const seedArg = args.find((a) => a.startsWith('--seed='));
const SEED = seedArg ? seedArg.slice(7) : 'demo-seed-001';
const AUTO = args.includes('--auto');
const QUIET = args.includes('--quiet');
const MODEL = args.find((a) => a.startsWith('--model='))?.slice(8) ?? 'claude-sonnet-4-6';
const BACKEND_URL =
  args.find((a) => a.startsWith('--backend='))?.slice(10) ?? 'http://localhost:8787';
const BOARD_ID = args.find((a) => a.startsWith('--board='))?.slice(8);

const log = (...rest: unknown[]) => {
  if (!QUIET) console.log(...rest);
};

// ─── Event formatting ───────────────────────────────────────────────────────
function formatEvent(state: GameState, e: GameEvent): string {
  const day = `D${e.day}`;
  const phase = PHASE_NAMES_ZH[e.phase as keyof typeof PHASE_NAMES_ZH] || e.phase;
  switch (e.type) {
    case 'GAME_START':
      return `${day} ${phase} → 游戏开始，共 ${e.players.length} 名玩家`;
    case 'PHASE_TRANSITION':
      return `${day} ${PHASE_NAMES_ZH[e.from as keyof typeof PHASE_NAMES_ZH] || e.from} → ${PHASE_NAMES_ZH[e.to as keyof typeof PHASE_NAMES_ZH] || e.to}`;
    case 'WEREWOLF_VOTE':
      return `${day} ${phase} 🐺 ${e.voterId} 提名 ${e.targetId}`;
    case 'WEREWOLF_KILL_DECIDED':
      return `${day} ${phase} 🐺 狼队决定击杀 ${e.targetId}`;
    case 'SEER_CHECK':
      return `${day} ${phase} 🔮 ${e.checkerId} 查 ${e.targetId} → ${e.result === 'wolf' ? '【狼人】' : '【好人】'}`;
    case 'WITCH_HEAL':
      return `${day} ${phase} 🧪 女巫救 ${e.targetId}`;
    case 'WITCH_POISON':
      return `${day} ${phase} ☠ 女巫毒 ${e.targetId}`;
    case 'WITCH_SKIP':
      return `${day} ${phase} 🧪 女巫今晚不行动`;
    case 'HUNTER_SHOOT':
      return e.targetId
        ? `${day} ${phase} 🔫 猎人 ${e.hunterId} 开枪带走 ${e.targetId}`
        : `${day} ${phase} 🔫 猎人 ${e.hunterId} 没开枪`;
    case 'GUARD_PROTECT':
      return `${day} ${phase} 🛡 守卫 ${e.guardId} 守护 ${e.targetId}`;
    case 'IDIOT_REVEAL':
      return `${day} ${phase} 🃏 ${e.playerId} 翻牌为白痴（免死失投票权）`;
    case 'KNIGHT_DUEL': {
      const targetRole = ROLE_NAMES_ZH[e.targetRole];
      const result = e.killedId === e.targetId ? `胜利（${e.targetId} 是狼）` : '失败（自爆）';
      return `${day} ${phase} ⚔ 骑士 ${e.knightId} → ${e.targetId}(${targetRole}) ${result}`;
    }
    case 'DEATH': {
      const p = findPlayer(state, e.playerId);
      const role = p ? `(${ROLE_NAMES_ZH[p.role]})` : '';
      return `${day} ${phase} ☠ ${e.playerId} ${role} 死亡 [${e.cause}]`;
    }
    case 'PEACEFUL_NIGHT':
      return `${day} ${phase} 🌙 平安夜`;
    case 'SPEAK':
      return `${day} ${phase} 💬 ${e.playerId}：${e.content}`;
    case 'VOTE':
      return `${day} ${phase} 🗳 ${e.voterId} → ${e.targetId}`;
    case 'EXECUTION':
      return `${day} ${phase} ⚖ 投票出局 ${e.targetId}`;
    case 'CUPID_LINK':
      return `${day} ${phase} ❤ 丘比特 ${e.cupidId} 连接情侣：${e.target1Id} ↔ ${e.target2Id}`;
    case 'SHERIFF_RUN':
      return `${day} ${phase} 🎖 ${e.runnerId} 上警：${e.content}`;
    case 'SHERIFF_SKIP':
      return `${day} ${phase} 🚫 ${e.playerId} 不上警`;
    case 'SHERIFF_VOTE':
      return `${day} ${phase} 🗳 ${e.voterId} → ${e.targetId}（警长票）`;
    case 'SHERIFF_ELECTED':
      return e.sheriffId
        ? `${day} ${phase} 🎖 警长当选：${e.sheriffId}`
        : `${day} ${phase} 🎖 警长选举无效（无人参选或票数为零）`;
    case 'BADGE_TRANSFERRED':
      return `${day} ${phase} 🎖 ${e.fromId} → ${e.toId} 警徽传递`;
    case 'BADGE_DESTROYED':
      return `${day} ${phase} 🎖 ${e.fromId} 撕毁了警徽`;
    case 'GAME_END':
      return `${day} ${phase} 🏁 ${e.winner === 'wolves' ? '🐺 狼人' : e.winner === 'lovers' ? '❤ 情侣' : '👥 好人'}胜 — ${e.reason}`;
    default: {
      const _: never = e;
      void _;
      return JSON.stringify(e);
    }
  }
}

// ─── Dummy bot ──────────────────────────────────────────────────────────────
function botAction(state: GameState, pending: PendingAction): PlayerAction {
  const actor = findPlayer(state, pending.playerId)!;
  const alive = getAlive(state);
  const others = alive.filter((p) => p.id !== actor.id);

  if (pending.allowedActionTypes.includes('WEREWOLF_KILL')) {
    const targets = alive.filter((p) => p.role !== 'werewolf');
    const target = targets[Math.floor(Math.random() * targets.length)] ?? others[0]!;
    return { type: 'WEREWOLF_KILL', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('SEER_CHECK')) {
    const target = others[Math.floor(Math.random() * others.length)] ?? others[0]!;
    return { type: 'SEER_CHECK', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('WITCH_SKIP')) {
    return { type: 'WITCH_SKIP', playerId: actor.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('HUNTER_SHOOT')) {
    if (others.length === 0) {
      return { type: 'HUNTER_SHOOT', playerId: actor.id, targetId: null, reasoning: 'bot' };
    }
    const target = others[Math.floor(Math.random() * others.length)]!;
    return { type: 'HUNTER_SHOOT', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('GUARD_PROTECT')) {
    const last = state.guardState.lastGuarded;
    const candidates = alive.filter((p) => p.id !== last);
    const target = candidates[Math.floor(Math.random() * candidates.length)] ?? alive[0]!;
    return { type: 'GUARD_PROTECT', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('CUPID_LINK')) {
    // Pick two random alive players (could include self)
    const shuffled = [...alive].sort(() => Math.random() - 0.5);
    const t1 = shuffled[0]!;
    const t2 = shuffled.find((p) => p.id !== t1.id) ?? shuffled[1]!;
    return {
      type: 'CUPID_LINK',
      playerId: actor.id,
      target1Id: t1.id,
      target2Id: t2.id,
      reasoning: 'bot',
    };
  }
  if (pending.allowedActionTypes.includes('RUN_FOR_SHERIFF')) {
    // 50% chance to run with a campaign speech
    if (Math.random() < 0.5) {
      return {
        type: 'RUN_FOR_SHERIFF',
        playerId: actor.id,
        content: '我有警长之才。',
        internalThought: 'bot',
      };
    }
    return { type: 'SKIP_SHERIFF', playerId: actor.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('SHERIFF_VOTE')) {
    const runners = state.sheriffElection?.runners.filter((id) =>
      state.players.find((p) => p.id === id)?.alive,
    ) ?? [];
    if (runners.length === 0) {
      return { type: 'SHERIFF_VOTE', playerId: actor.id, targetId: 'abstain', reasoning: 'bot' };
    }
    return {
      type: 'SHERIFF_VOTE',
      playerId: actor.id,
      targetId: runners[Math.floor(Math.random() * runners.length)]!,
      reasoning: 'bot',
    };
  }
  if (pending.allowedActionTypes.includes('TRANSFER_BADGE')) {
    const candidates = alive.filter((p) => p.id !== actor.id);
    if (candidates.length === 0) {
      return { type: 'DESTROY_BADGE', playerId: actor.id, reasoning: 'bot' };
    }
    const target = candidates[Math.floor(Math.random() * candidates.length)]!;
    return { type: 'TRANSFER_BADGE', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  if (pending.allowedActionTypes.includes('SPEAK')) {
    return {
      type: 'SPEAK',
      playerId: actor.id,
      content: '我没什么发现，听神跳。',
      internalThought: 'bot strategy',
    };
  }
  if (pending.allowedActionTypes.includes('VOTE')) {
    if (others.length === 0) {
      return { type: 'VOTE', playerId: actor.id, targetId: 'abstain', reasoning: 'bot' };
    }
    const target = others[Math.floor(Math.random() * others.length)]!;
    return { type: 'VOTE', playerId: actor.id, targetId: target.id, reasoning: 'bot' };
  }
  throw new Error(`Bot has no strategy for ${pending.allowedActionTypes.join(', ')}`);
}

// ─── Auto mode setup (real AI) ──────────────────────────────────────────────
async function setupAutoMode(state: GameState): Promise<Orchestrator> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY env var is required for --auto mode');
    console.error('   Set it in your shell or in packages/backend/.env');
    process.exit(1);
  }

  // Verify backend is reachable
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    console.error(`❌ Backend not reachable at ${BACKEND_URL}: ${err}`);
    console.error('   Start it with `pnpm dev:backend`');
    process.exit(1);
  }

  const client = new LLMClient({
    backendUrl: BACKEND_URL,
    apiKey,
    anthropicBaseUrl: process.env['ANTHROPIC_BASE_URL']?.trim(),
  });

  // Assign personas to all players (could be human or AI, but in pure-AI mode all are AI).
  // Use a seeded RNG so persona assignment is deterministic with the game seed.
  const rng = new RNG(`${state.config.seed}|personas`);
  const shuffledPersonas = rng.shuffle(PERSONAS);

  const agents = new Map<string, Agent>();
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i]!;
    if (player.isHuman) continue;  // skip human
    const persona = shuffledPersonas[i % shuffledPersonas.length]!;
    agents.set(
      player.id,
      new Agent({ player, persona, client, model: MODEL })
    );
    log(`  ${player.id} (${ROLE_NAMES_ZH[player.role]}): ${persona.name} (${persona.id})`);
  }

  const totalUsage = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };
  const orchestrator = new Orchestrator({
    agents,
    maxConcurrency: 5,
    onDecision: ({ playerId, action, reasoning, latencyMs, usage }) => {
      totalUsage.input += usage.inputTokens;
      totalUsage.output += usage.outputTokens;
      totalUsage.cacheRead += usage.cacheReadTokens;
      totalUsage.cacheCreate += usage.cacheCreateTokens;
      log(
        `  [${latencyMs}ms] ${playerId} → ${action.type} | cache_read=${usage.cacheReadTokens} | thought: ${reasoning.slice(0, 80)}${reasoning.length > 80 ? '...' : ''}`
      );
    },
  });

  // Expose for final summary
  (orchestrator as Orchestrator & { __totalUsage?: typeof totalUsage }).__totalUsage = totalUsage;

  return orchestrator;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  log(`\n=== Wolf Fangs Kill - CLI Demo ===`);
  log(`Mode: ${AUTO ? 'AUTO (real Claude AI)' : 'BOT (dummy strategy)'}`);
  log(`Seed: ${SEED}`);
  if (AUTO) log(`Model: ${MODEL}, Backend: ${BACKEND_URL}`);
  log('');

  let state = createGame({ seed: SEED, ...(BOARD_ID ? { boardId: BOARD_ID } : {}) });
  const eventLog = new EventLog();
  const orchestrator = AUTO ? await setupAutoMode(state) : null;

  log(`Board: ${state.board.name} (${state.board.id})`);
  log('角色分配:');
  for (const p of state.players) {
    log(`  ${p.id} (seat ${p.seat}): ${ROLE_NAMES_ZH[p.role]}`);
  }
  log('');

  let turns = 0;
  const MAX_TURNS = 500;
  while (state.phase !== 'GAME_END' && turns < MAX_TURNS) {
    const { next, events, pending } = progress(state);
    state = next;
    for (const e of events) {
      eventLog.push(e);
      log(formatEvent(state, e));
    }
    if (state.phase === 'GAME_END') break;
    if (pending.length === 0) {
      // No progress this loop iteration — shouldn't happen
      break;
    }

    // Decide actions
    const actions: PlayerAction[] = [];
    if (state.phase === 'DAY_DISCUSSION' && AUTO && orchestrator) {
      // SERIAL: speak one at a time so later speakers see earlier speeches.
      // pending will be 1 entry, but applyAction will mutate state, then
      // the next call to progress will return the next speaker.
      for (const p of pending) {
        const action = await orchestrator.decideSingle(state, p);
        actions.push(action);
      }
    } else if (AUTO && orchestrator) {
      // PARALLEL: each agent decides independently from the current state.
      const results = await orchestrator.decideParallel(state, pending);
      actions.push(...results);
    } else {
      // Bot mode
      for (const p of pending) actions.push(botAction(state, p));
    }

    for (const action of actions) {
      const { next: ns, events: ae, error } = applyAction(state, action);
      if (error) {
        console.error(`❌ Invalid action from ${action.playerId}: ${error.message} (${error.code})`);
        if (AUTO) {
          // In auto mode, continue with a fallback action
          console.error('   Falling back to dummy action');
          const fallback = botAction(state, {
            playerId: action.playerId,
            allowedActionTypes: [action.type],
            instruction: '',
          });
          const r2 = applyAction(state, fallback);
          if (r2.error) {
            console.error(`   Fallback also failed: ${r2.error.message}`);
            process.exit(1);
          }
          state = r2.next;
          for (const e of r2.events) {
            eventLog.push(e);
            log(formatEvent(state, e));
          }
          continue;
        }
        process.exit(1);
      }
      state = ns;
      for (const e of ae) {
        eventLog.push(e);
        log(formatEvent(state, e));
      }
    }
    turns++;
  }

  console.log('\n=== Final ===');
  console.log(`Winner: ${state.winner ?? '?'}`);
  console.log(`Reason: ${state.endReason ?? '?'}`);
  console.log(`Total events: ${eventLog.all().length}`);
  console.log(`Total turns: ${turns}`);
  console.log('\nAlive at end:');
  for (const p of state.players) {
    if (p.alive) console.log(`  ${p.id} (${ROLE_NAMES_ZH[p.role]})`);
  }
  console.log('\nDeaths:');
  for (const d of state.deathLog) {
    const p = findPlayer(state, d.playerId);
    console.log(
      `  D${d.day} ${d.phase}: ${d.playerId} (${p ? ROLE_NAMES_ZH[p.role] : '?'}) — ${d.cause}`
    );
  }

  if (AUTO && orchestrator) {
    const usage = (orchestrator as Orchestrator & { __totalUsage?: { input: number; output: number; cacheRead: number; cacheCreate: number } }).__totalUsage;
    if (usage) {
      console.log('\nToken usage:');
      console.log(`  Input (cache miss):    ${usage.input}`);
      console.log(`  Cache read:            ${usage.cacheRead}`);
      console.log(`  Cache create:          ${usage.cacheCreate}`);
      console.log(`  Output:                ${usage.output}`);
      const total = usage.input + usage.cacheRead + usage.cacheCreate;
      const hitRate = total > 0 ? ((usage.cacheRead / total) * 100).toFixed(1) : '0';
      console.log(`  Cache hit rate:        ${hitRate}%`);
      // Sonnet 4.6 pricing: $3/M input, $15/M output, cache read 10%, cache write 125%
      const costUSD =
        (usage.input * 3) / 1_000_000 +
        (usage.cacheRead * 0.3) / 1_000_000 +
        (usage.cacheCreate * 3.75) / 1_000_000 +
        (usage.output * 15) / 1_000_000;
      console.log(`  Estimated cost (Sonnet 4.6): $${costUSD.toFixed(4)}`);
    }
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:');
  console.error(err);
  process.exit(1);
});
