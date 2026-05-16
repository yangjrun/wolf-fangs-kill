import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GameState, GameEvent, Player, Phase, PendingAction, PlayerAction } from '@wfk/shared';

export const useGameStore = defineStore('game', () => {
  const state = ref<GameState | null>(null);
  const events = ref<GameEvent[]>([]);
  const isRunning = ref(false);
  const isPaused = ref(false);
  const error = ref<string | null>(null);
  const humanPending = ref<PendingAction | null>(null);
  let humanResolver: ((action: PlayerAction) => void) | null = null;

  const players = computed<Player[]>(() => state.value?.players ?? []);
  const alive = computed(() => players.value.filter((p) => p.alive));
  const dead = computed(() => players.value.filter((p) => !p.alive));
  const phase = computed<Phase>(() => state.value?.phase ?? 'GAME_START');
  const day = computed(() => state.value?.day ?? 0);
  const publicLog = computed(() => state.value?.publicLog ?? []);
  const deathLog = computed(() => state.value?.deathLog ?? []);
  const winner = computed(() => state.value?.winner);
  const endReason = computed(() => state.value?.endReason);
  const isEnded = computed(() => state.value?.phase === 'GAME_END');

  const humanPlayer = computed(() => players.value.find((p) => p.isHuman) ?? null);

  const currentActor = computed<string | null>(() => {
    if (!state.value) return null;
    if (humanPending.value) return humanPending.value.playerId;
    if (phase.value === 'DAY_DISCUSSION') {
      const idx = state.value.currentDay.speeches.length;
      return state.value.currentDay.speechOrder[idx] ?? null;
    }
    if (phase.value === 'HUNTER_SHOOT_NIGHT' || phase.value === 'HUNTER_SHOOT_DAY') {
      return state.value.pendingHunterShoot ?? null;
    }
    return null;
  });

  function setState(s: GameState): void {
    state.value = s;
  }

  function pushEvent(e: GameEvent): void {
    events.value.push(e);
  }

  function pushEvents(es: GameEvent[]): void {
    for (const e of es) events.value.push(e);
  }

  function reset(): void {
    state.value = null;
    events.value = [];
    isRunning.value = false;
    isPaused.value = false;
    error.value = null;
    humanPending.value = null;
    humanResolver = null;
  }

  function setError(msg: string | null): void {
    error.value = msg;
  }

  function waitForHumanAction(pending: PendingAction): Promise<PlayerAction> {
    isPaused.value = true;
    humanPending.value = pending;
    return new Promise((resolve) => {
      humanResolver = resolve;
    });
  }

  function submitHumanAction(action: PlayerAction): void {
    if (!humanResolver) return;
    const resolve = humanResolver;
    humanResolver = null;
    humanPending.value = null;
    isPaused.value = false;
    resolve(action);
  }

  return {
    state,
    events,
    isRunning,
    isPaused,
    error,
    humanPending,
    players,
    alive,
    dead,
    phase,
    day,
    publicLog,
    deathLog,
    winner,
    endReason,
    isEnded,
    humanPlayer,
    currentActor,
    setState,
    pushEvent,
    pushEvents,
    reset,
    setError,
    waitForHumanAction,
    submitHumanAction,
  };
});
