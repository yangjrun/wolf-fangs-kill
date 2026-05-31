<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { useGameLoop } from '@/composables/useGameLoop';
import { useSpeechSpotlight } from '@/composables/useSpeechSpotlight';
import SeatRing from '@/components/game/SeatRing.vue';
import PhaseIndicator from '@/components/game/PhaseIndicator.vue';
import PublicLog from '@/components/game/PublicLog.vue';
import ActionPanel from '@/components/game/ActionPanel.vue';
import SpeechSpotlight from '@/components/game/SpeechSpotlight.vue';
import {
  BOARDS,
  DEFAULT_BOARD_ID,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_NAMES_ZH,
  PERSONAS,
  isNightPhase,
} from '@wfk/shared';
import type { Difficulty, Phase } from '@wfk/shared';
import { RNG } from '@wfk/engine';

const SPEECH_PHASES: ReadonlySet<Phase> = new Set<Phase>([
  'DAY_DISCUSSION',
  'SHERIFF_RUNNING_FOR',
]);

const router = useRouter();
const gameStore = useGameStore();
const settings = useSettingsStore();
const { start, stop } = useGameLoop();
const {
  active: spotlightActive,
  typedChars: spotlightTyped,
  show: spotlightShow,
  skip: spotlightSkip,
  dismiss: spotlightDismiss,
} = useSpeechSpotlight();

const seedInput = ref(`seed-${Date.now()}`);
const mode = ref<'demo' | 'ai'>('demo');
const humanPlayerId = ref<string>('');
const boardId = ref<string>(DEFAULT_BOARD_ID);
const difficulty = ref<Difficulty>(DEFAULT_DIFFICULTY);
const godView = ref(false);
const decisions = ref<Array<{ playerId: string; reasoning: string; ts: number }>>([]);

const modeOptions = [
  { label: '演示模式（不调用 API）', value: 'demo' },
  { label: 'Claude AI 模式', value: 'ai' },
];

const difficultyOptions = (Object.keys(DIFFICULTY_NAMES_ZH) as Difficulty[]).map((d) => ({
  label: `难度：${DIFFICULTY_NAMES_ZH[d]}`,
  value: d,
}));

const boardOptions = computed(() =>
  Object.values(BOARDS).map((b) => ({ label: b.name, value: b.id })),
);

const selectedBoard = computed(() => BOARDS[boardId.value] ?? BOARDS[DEFAULT_BOARD_ID]!);

const humanOptions = computed(() => [
  { label: '观战模式', value: '' },
  ...Array.from({ length: selectedBoard.value.totalPlayers }, (_, i) => ({
    label: `我坐 ${i + 1} 号位`,
    value: `player_${i + 1}`,
  })),
]);

// Pre-compute persona name for each player based on seed (matches useGameLoop)
const personaNames = computed<Record<string, string>>(() => {
  if (!gameStore.state) return {};
  const rng = new RNG(`${gameStore.state.config.seed}|personas`);
  const shuffled = rng.shuffle(PERSONAS);
  const map: Record<string, string> = {};
  gameStore.state.players.forEach((p, i) => {
    map[p.id] = shuffled[i % shuffled.length]!.name;
  });
  return map;
});

const winnerText = computed(() => {
  if (!gameStore.winner) return '';
  if (gameStore.winner === 'wolves') return '🐺 狼人胜利';
  if (gameStore.winner === 'lovers') return '❤ 情侣胜利';
  return '👥 好人胜利';
});

const ringPhaseClass = computed(() => {
  if (!gameStore.state) return '';
  return isNightPhase(gameStore.phase) ? 'play__ring--night' : 'play__ring--day';
});

const nightVisionActive = computed(() => {
  if (!settings.nightVisionMode) return false;
  if (!gameStore.state) return false;
  if (godView.value) return false;
  return isNightPhase(gameStore.phase);
});

async function onStart() {
  decisions.value = [];
  await start({
    seed: seedInput.value,
    mode: mode.value,
    boardId: boardId.value,
    difficulty: difficulty.value,
    ...(humanPlayerId.value ? { humanPlayerId: humanPlayerId.value } : {}),
    stepDelayMs: mode.value === 'demo' ? 180 : 0,
    onAIDecision: ({ playerId, reasoning }) => {
      decisions.value.unshift({ playerId, reasoning, ts: Date.now() });
      if (decisions.value.length > 20) decisions.value.pop();
    },
    ...(settings.speechSpotlightEnabled ? { onSpeech: spotlightShow } : {}),
  });
}

function onStop() {
  stop();
  spotlightDismiss();
}

function onReset() {
  stop();
  spotlightDismiss();
  gameStore.reset();
  decisions.value = [];
  seedInput.value = `seed-${Date.now()}`;
}

watch(
  () => gameStore.phase,
  (next) => {
    if (!SPEECH_PHASES.has(next)) spotlightDismiss();
  },
);

onUnmounted(() => {
  stop();
  spotlightDismiss();
});
</script>

<template>
  <div class="play">
    <header class="play__header">
      <div class="play__header-left">
        <a-button @click="router.push('/')">← 返回</a-button>
        <PhaseIndicator
          v-if="gameStore.state"
          :phase="gameStore.phase"
          :day="gameStore.day"
        />
        <div v-else class="play__placeholder">未开始</div>
      </div>

      <div class="play__console">
        <div class="play__console-inner">
          <a-select
            v-model="boardId"
            :options="boardOptions"
            style="width: 180px"
            :disabled="gameStore.isRunning"
          />
          <a-select
            v-model="difficulty"
            :options="difficultyOptions"
            style="width: 120px"
            :disabled="gameStore.isRunning"
          />
          <a-select
            v-model="mode"
            :options="modeOptions"
            style="width: 190px"
            :disabled="gameStore.isRunning"
          />
          <a-select
            v-model="humanPlayerId"
            :options="humanOptions"
            style="width: 130px"
            :disabled="gameStore.isRunning"
          />
          <a-input
            v-model="seedInput"
            placeholder="seed"
            style="width: 180px"
            :disabled="gameStore.isRunning"
          />
          <a-checkbox v-model="godView">上帝视角</a-checkbox>
          <a-button
            v-if="!gameStore.isRunning && !gameStore.isEnded"
            type="primary"
            @click="onStart"
          >
            开始
          </a-button>
          <a-button v-if="gameStore.isRunning" status="danger" @click="onStop">
            停止
          </a-button>
          <a-button v-if="gameStore.isEnded" type="primary" @click="router.push('/replay')">复盘</a-button>
          <a-button v-if="gameStore.isEnded" @click="onReset">重置</a-button>
        </div>
      </div>
    </header>

    <a-alert
      v-if="gameStore.error"
      type="error"
      :show-icon="true"
      style="margin: 0 16px"
    >
      {{ gameStore.error }}
    </a-alert>

    <main class="play__main">
      <section :class="['play__ring', ringPhaseClass]">
        <SeatRing
          v-if="gameStore.state"
          :players="gameStore.players"
          :current-actor-id="gameStore.currentActor"
          :god-view="godView"
          :persona-names="personaNames"
          :lovers="gameStore.state.lovers"
          :sheriff-id="gameStore.state.sheriff.playerId"
          :night-vision="nightVisionActive"
          :human-player-id="humanPlayerId"
        />
        <div v-else class="play__hint">
          <div class="play__hint-icon">🕯</div>
          <div class="play__hint-text">点击右上角"开始"按钮，召集 9 位玩家入席</div>
        </div>
      </section>

      <aside class="play__sidebar">
        <div class="panel card-paper">
          <div class="panel__title brass-plate">公开日志</div>
          <PublicLog class="panel__body" />
        </div>
        <div class="panel card-paper">
          <div class="panel__title brass-plate">玩家操作</div>
          <ActionPanel class="panel__body" />
        </div>
        <div class="panel card-paper">
          <div class="panel__title brass-plate">
            {{ mode === 'demo' ? '演示策略说明' : 'AI 内心独白（实时）' }}
          </div>
          <div class="thoughts panel__body">
            <div
              v-for="(d, idx) in decisions"
              :key="idx"
              class="thought"
            >
              <div class="thought__head">
                {{ personaNames[d.playerId] ?? d.playerId }} ({{ d.playerId }})
              </div>
              <div class="thought__body">{{ d.reasoning }}</div>
            </div>
            <div v-if="decisions.length === 0" class="thoughts__empty">
              {{ mode === 'demo' ? '演示模式使用固定策略，主要用于验证 UI 流程。' : '（游戏开始后会显示）' }}
            </div>
          </div>
        </div>
      </aside>
    </main>

    <footer v-if="gameStore.isEnded" class="play__end card-paper gilt-corners">
      <div class="play__end-emblem">{{ gameStore.winner === 'wolves' ? '🐺' : '👥' }}</div>
      <div class="play__end-text">{{ winnerText }}</div>
      <hr class="gilt-rule">
      <div class="play__end-reason">{{ gameStore.endReason }}</div>
    </footer>

    <SpeechSpotlight
      v-if="spotlightActive"
      :active="spotlightActive"
      :typed-chars="spotlightTyped"
      :players="gameStore.players"
      :persona-names="personaNames"
      :lovers="gameStore.state?.lovers ?? null"
      :sheriff-id="gameStore.state?.sheriff.playerId ?? null"
      :god-view="godView"
      :day="gameStore.day"
      :phase="gameStore.phase"
      @skip="spotlightSkip"
    />
  </div>
</template>

<style scoped lang="scss">
.play {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
  gap: 16px;
}

.play__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.play__header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.play__placeholder {
  font-family: var(--wfk-font-display);
  font-size: 16px;
  color: rgba(212, 175, 55, 0.45);
  font-style: italic;
  letter-spacing: 0.1em;
  padding: 12px 18px;
  border: 1px dashed rgba(212, 175, 55, 0.25);
  border-radius: 10px;
}

/* Brass control console */
.play__console {
  position: relative;
  padding: 4px;
  border-radius: 10px;
  background:
    linear-gradient(180deg, #3a2f15 0%, #1a1208 100%);
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow:
    inset 0 1px 0 rgba(240, 216, 134, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.6),
    0 4px 12px rgba(0, 0, 0, 0.55);
}

.play__console-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.25));
  border-radius: 7px;
  border: 1px solid rgba(0, 0, 0, 0.55);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.45);
}

.play__main {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.play__ring {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.play__hint {
  text-align: center;
  font-family: var(--wfk-font-display);
  color: rgba(212, 175, 55, 0.55);
}

.play__hint-icon {
  font-size: 56px;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 16px rgba(255, 184, 119, 0.45));
}

.play__hint-text {
  font-size: 16px;
  font-style: italic;
  letter-spacing: 0.05em;
}

.play__sidebar {
  display: grid;
  grid-template-rows: 1.4fr 0.9fr 0.7fr;
  gap: 14px;
  min-height: 0;
}

.panel {
  display: flex;
  flex-direction: column;
}

.panel__title {
  flex-shrink: 0;
}

.panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.thoughts {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thought {
  position: relative;
  background:
    linear-gradient(160deg, rgba(42, 37, 21, 0.7), rgba(26, 22, 9, 0.7));
  border: 1px solid rgba(212, 175, 55, 0.18);
  border-left: 3px solid rgba(212, 175, 55, 0.55);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  box-shadow:
    inset 0 1px 0 rgba(212, 175, 55, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.35);
}

.thought__head {
  font-family: var(--wfk-font-display);
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--wfk-gold-2);
  font-size: 12px;
  letter-spacing: 0.05em;
}

.thought__body {
  color: #e8e2c8;
  line-height: 1.55;
  font-style: italic;
}

.thoughts__empty {
  color: rgba(232, 226, 200, 0.45);
  text-align: center;
  padding: 20px;
  font-family: var(--wfk-font-display);
  font-style: italic;
  font-size: 13px;
  letter-spacing: 0.05em;
}

/* Victory plaque */
.play__end {
  position: relative;
  text-align: center;
  padding: 20px 24px 22px;
}

.play__end-emblem {
  font-size: 42px;
  line-height: 1;
  margin-bottom: 6px;
  filter: drop-shadow(0 0 16px rgba(212, 175, 55, 0.55));
}

.play__end-text {
  font-family: var(--wfk-font-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--wfk-gold-2);
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.55),
    0 0 16px rgba(212, 175, 55, 0.45);
}

.play__end-reason {
  color: #e8e2c8;
  margin-top: 4px;
  font-style: italic;
}

.play__end .gilt-rule {
  max-width: 280px;
  margin: 10px auto;
}
</style>
