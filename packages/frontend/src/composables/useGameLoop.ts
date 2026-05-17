import { useGameStore } from "@/stores/game";
import { useSettingsStore } from "@/stores/settings";
import { narrator } from "@/services/narrator";
import {
  RNG,
  applyAction,
  createGame,
  findPlayer,
  getAlive,
  progress,
} from "@wfk/engine";
import { Agent, FlowToken, LLMClient, Orchestrator } from "@wfk/ai-agents";
import { DEFAULT_DIFFICULTY, PERSONAS, narrationForPhase } from "@wfk/shared";
import type { Difficulty, GameEvent, PendingAction, PlayerAction } from "@wfk/shared";

interface StartOptions {
  seed?: string;
  humanPlayerId?: string;
  mode?: "demo" | "ai";
  boardId?: string;
  difficulty?: Difficulty;
  stepDelayMs?: number;
  onAIDecision?: (info: {
    playerId: string;
    action: PlayerAction;
    reasoning: string;
    latencyMs: number;
  }) => void;
}

export function useGameLoop() {
  const gameStore = useGameStore();
  const settings = useSettingsStore();
  let flowToken: FlowToken | null = null;

  async function start(opts: StartOptions = {}): Promise<void> {
    const seed = opts.seed ?? `seed-${Date.now()}`;
    const mode = opts.mode ?? "demo";
    const stepDelayMs = opts.stepDelayMs ?? (mode === "demo" ? 250 : 0);

    if (flowToken) flowToken.invalidate();
    const token = new FlowToken();
    flowToken = token;

    gameStore.reset();
    gameStore.setError(null);

    // Configure narrator with current settings
    narrator.configure({
      enabled: settings.narratorEnabled,
      rate: settings.narratorRate,
      voiceName: settings.narratorVoiceName || undefined,
    });
    narrator.stop();

    let state = createGame({
      seed,
      ...(opts.humanPlayerId ? { humanPlayerId: opts.humanPlayerId } : {}),
      ...(opts.boardId ? { boardId: opts.boardId } : {}),
      difficulty: opts.difficulty ?? DEFAULT_DIFFICULTY,
      model: settings.model,
    });
    gameStore.setState(state);

    const orchestrator =
      mode === "ai"
        ? createOrchestrator({
            state,
            token,
            settings,
            difficulty: opts.difficulty ?? DEFAULT_DIFFICULTY,
            onAIDecision: opts.onAIDecision,
          })
        : null;

    gameStore.isRunning = true;

    try {
      let safety = 0;
      while (state.phase !== "GAME_END" && token.isValid() && safety++ < 500) {
        const { next, events, pending } = progress(state);
        if (!token.isValid()) return;

        state = next;
        gameStore.pushEvents(events);
        gameStore.setState(state);
        narrateEvents(events);

        if (stepDelayMs > 0) await sleep(stepDelayMs);
        if (state.phase === "GAME_END" || pending.length === 0) break;

        if (state.phase === "DAY_DISCUSSION") {
          for (const p of pending) {
            const action = await decideAction({
              state,
              pending: p,
              orchestrator,
              mode,
            });
            if (!token.isValid()) return;
            state = applyResolvedAction(state, action);
            if (stepDelayMs > 0) await sleep(stepDelayMs);
          }
        } else {
          const humanPending = pending.filter((p) => isHumanPending(state, p));
          const aiPending = pending.filter((p) => !isHumanPending(state, p));
          const aiActions = orchestrator
            ? await orchestrator.decideParallel(state, aiPending)
            : aiPending.map((p) => demoAction(state, p));
          if (!token.isValid()) return;

          const humanActions: PlayerAction[] = [];
          for (const p of humanPending) {
            humanActions.push(await gameStore.waitForHumanAction(p));
            if (!token.isValid()) return;
          }

          for (const action of [...aiActions, ...humanActions]) {
            state = applyResolvedAction(state, action);
          }
          if (stepDelayMs > 0) await sleep(stepDelayMs);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      gameStore.setError(msg);
    } finally {
      if (token === flowToken) gameStore.isRunning = false;
      narrator.stop();
    }
  }

  function applyResolvedAction(
    state: ReturnType<typeof createGame>,
    action: PlayerAction,
  ) {
    const { next, events, error } = applyAction(state, action);
    if (error) {
      gameStore.setError(`${action.playerId} 行动非法：${error.message}`);
      return state;
    }
    gameStore.pushEvents(events);
    gameStore.setState(next);
    narrateEvents(events);
    return next;
  }

  function stop(): void {
    if (flowToken) flowToken.invalidate();
    gameStore.isRunning = false;
    narrator.stop();
  }

  function narrateEvents(events: GameEvent[]): void {
    if (!settings.narratorEnabled) return;
    for (const e of events) {
      if (e.type === 'PHASE_TRANSITION') {
        const line = narrationForPhase(e.to as Parameters<typeof narrationForPhase>[0]);
        if (line) narrator.speak(line);
      }
    }
  }

  return { start, stop };
}

async function decideAction(params: {
  state: ReturnType<typeof createGame>;
  pending: PendingAction;
  orchestrator: Orchestrator | null;
  mode: "demo" | "ai";
}): Promise<PlayerAction> {
  if (isHumanPending(params.state, params.pending)) {
    return useGameStore().waitForHumanAction(params.pending);
  }
  if (params.mode === "ai" && params.orchestrator) {
    return params.orchestrator.decideSingle(params.state, params.pending);
  }
  return demoAction(params.state, params.pending);
}

function isHumanPending(
  state: ReturnType<typeof createGame>,
  pending: PendingAction,
): boolean {
  return Boolean(
    state.players.find((p) => p.id === pending.playerId && p.isHuman),
  );
}

function createOrchestrator(params: {
  state: ReturnType<typeof createGame>;
  token: FlowToken;
  settings: ReturnType<typeof useSettingsStore>;
  difficulty: Difficulty;
  onAIDecision?: StartOptions["onAIDecision"];
}): Orchestrator {
  const client = new LLMClient({
    backendUrl: params.settings.backendUrl,
    apiKey: params.settings.apiKey,
    anthropicBaseUrl: params.settings.anthropicBaseUrl,
  });

  const rng = new RNG(`${params.state.config.seed}|personas`);
  const shuffled = rng.shuffle(PERSONAS);
  const agents = new Map<string, Agent>();

  for (let i = 0; i < params.state.players.length; i++) {
    const player = params.state.players[i]!;
    if (player.isHuman) continue;
    const persona = shuffled[i % shuffled.length]!;
    agents.set(
      player.id,
      new Agent({
        player,
        persona,
        client,
        model: params.settings.model,
        difficulty: params.difficulty,
      }),
    );
  }

  return new Orchestrator({
    agents,
    flowToken: params.token,
    maxConcurrency: 5,
    ...(params.onAIDecision
      ? {
          onDecision: ({ playerId, action, reasoning, latencyMs }) =>
            params.onAIDecision!({ playerId, action, reasoning, latencyMs }),
        }
      : {}),
  });
}

function demoAction(
  state: ReturnType<typeof createGame>,
  pending: PendingAction,
): PlayerAction {
  const actor = findPlayer(state, pending.playerId)!;
  const alive = getAlive(state);
  const others = alive.filter((p) => p.id !== actor.id);

  if (pending.allowedActionTypes.includes("WEREWOLF_KILL")) {
    const target = alive.find((p) => p.role !== "werewolf") ?? others[0]!;
    return {
      type: "WEREWOLF_KILL",
      playerId: actor.id,
      targetId: target.id,
      reasoning: "演示模式：狼人优先刀非狼人。",
    };
  }

  if (pending.allowedActionTypes.includes("SEER_CHECK")) {
    const target = others[0]!;
    return {
      type: "SEER_CHECK",
      playerId: actor.id,
      targetId: target.id,
      reasoning: "演示模式：预言家查验第一名可查玩家。",
    };
  }

  if (pending.allowedActionTypes.includes("WITCH_SKIP")) {
    return {
      type: "WITCH_SKIP",
      playerId: actor.id,
      reasoning: "演示模式：女巫默认不使用药水。",
    };
  }

  if (pending.allowedActionTypes.includes("HUNTER_SHOOT")) {
    return {
      type: "HUNTER_SHOOT",
      playerId: actor.id,
      targetId: null,
      reasoning: "演示模式：猎人默认不开枪。",
    };
  }

  if (pending.allowedActionTypes.includes("GUARD_PROTECT")) {
    const last = state.guardState.lastGuarded;
    const candidate = alive.find((p) => p.id !== last) ?? alive[0]!;
    return {
      type: "GUARD_PROTECT",
      playerId: actor.id,
      targetId: candidate.id,
      reasoning: "演示模式：守卫守第一个可守目标。",
    };
  }

  if (pending.allowedActionTypes.includes("CUPID_LINK")) {
    const [t1, t2] = alive.filter((p) => p.id !== actor.id).slice(0, 2);
    return {
      type: "CUPID_LINK",
      playerId: actor.id,
      target1Id: (t1 ?? alive[0]!).id,
      target2Id: (t2 ?? alive[1] ?? alive[0]!).id,
      reasoning: "演示模式：丘比特连接前两个非自己玩家。",
    };
  }

  if (pending.allowedActionTypes.includes("RUN_FOR_SHERIFF")) {
    // Bot默认不上警以缩短演示；若想总有人上警可在这里改为 RUN
    return {
      type: "SKIP_SHERIFF",
      playerId: actor.id,
      reasoning: "演示模式：默认放弃参选警长。",
    };
  }

  if (pending.allowedActionTypes.includes("SHERIFF_VOTE")) {
    const election = state.sheriffElection;
    const runners = election?.runners.filter((id) =>
      state.players.find((p) => p.id === id)?.alive,
    ) ?? [];
    return {
      type: "SHERIFF_VOTE",
      playerId: actor.id,
      targetId: runners[0] ?? "abstain",
      reasoning: "演示模式：投第一位上警玩家。",
    };
  }

  if (pending.allowedActionTypes.includes("TRANSFER_BADGE")) {
    const candidate = alive.find((p) => p.id !== actor.id);
    if (candidate) {
      return {
        type: "TRANSFER_BADGE",
        playerId: actor.id,
        targetId: candidate.id,
        reasoning: "演示模式：警徽传给第一位存活玩家。",
      };
    }
    return {
      type: "DESTROY_BADGE",
      playerId: actor.id,
      reasoning: "演示模式：无人可传，撕毁警徽。",
    };
  }

  if (pending.allowedActionTypes.includes("SPEAK")) {
    return {
      type: "SPEAK",
      playerId: actor.id,
      content: buildDemoSpeech(actor.id),
      internalThought: "演示模式：固定话术，用于验证 UI 流程。",
    };
  }

  if (pending.allowedActionTypes.includes("VOTE")) {
    const target = others[0];
    return target
      ? {
          type: "VOTE",
          playerId: actor.id,
          targetId: target.id,
          reasoning: "演示模式：投第一名可投玩家。",
        }
      : {
          type: "VOTE",
          playerId: actor.id,
          targetId: "abstain",
          reasoning: "演示模式：无人可投，弃票。",
        };
  }

  throw new Error(`No demo action for ${pending.playerId}`);
}

function buildDemoSpeech(_playerId: string): string {
  return "我先听前置位发言，暂时没有强身份信息。";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
