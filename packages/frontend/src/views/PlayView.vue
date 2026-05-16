<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { useSettingsStore } from '@/stores/settings';
import { useGameLoop } from '@/composables/useGameLoop';
import SeatRing from '@/components/game/SeatRing.vue';
import PhaseIndicator from '@/components/game/PhaseIndicator.vue';
import PublicLog from '@/components/game/PublicLog.vue';
import ActionPanel from '@/components/game/ActionPanel.vue';
import { PERSONAS } from '@wfk/shared';
import { RNG } from '@wfk/engine';

const router = useRouter();
const gameStore = useGameStore();
const settings = useSettingsStore();
const { start, stop } = useGameLoop();

const seedInput = ref(`seed-${Date.now()}`);
const mode = ref<'demo' | 'ai'>('demo');
const humanPlayerId = ref<string>('');
const godView = ref(false);
const decisions = ref<Array<{ playerId: string; reasoning: string; ts: number }>>([]);

const modeOptions = [
  { label: '演示模式（不调用 API）', value: 'demo' },
  { label: 'Claude AI 模式', value: 'ai' },
];

const humanOptions = [
  { label: '观战模式', value: '' },
  ...Array.from({ length: 9 }, (_, i) => ({ label: `我坐 ${i + 1} 号位`, value: `player_${i + 1}` })),
];

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
  return gameStore.winner === 'wolves' ? '🐺 狼人胜利' : '👥 好人胜利';
});

async function onStart() {
  decisions.value = [];
  await start({
    seed: seedInput.value,
    mode: mode.value,
    ...(humanPlayerId.value ? { humanPlayerId: humanPlayerId.value } : {}),
    stepDelayMs: mode.value === 'demo' ? 180 : 0,
    onAIDecision: ({ playerId, reasoning }) => {
      decisions.value.unshift({ playerId, reasoning, ts: Date.now() });
      if (decisions.value.length > 20) decisions.value.pop();
    },
  });
}

function onStop() {
  stop();
}

function onReset() {
  stop();
  gameStore.reset();
  decisions.value = [];
  seedInput.value = `seed-${Date.now()}`;
}

onUnmounted(() => {
  stop();
});
</script>

<template>
  <div class="play">
    <header class="play__header">
      <a-button @click="router.push('/')">← 返回</a-button>
      <PhaseIndicator
        v-if="gameStore.state"
        :phase="gameStore.phase"
        :day="gameStore.day"
      />
      <div v-else class="play__placeholder">未开始</div>
      <a-space>
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
      </a-space>
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
      <section class="play__ring">
        <SeatRing
          v-if="gameStore.state"
          :players="gameStore.players"
          :current-actor-id="gameStore.currentActor"
          :god-view="godView"
          :persona-names="personaNames"
        />
        <div v-else class="play__hint">
          点击右上角"开始"按钮启动一局新游戏
        </div>
      </section>

      <aside class="play__sidebar">
        <div class="panel panel--log">
          <div class="panel__title">公开日志</div>
          <PublicLog class="panel__body" />
        </div>
        <div class="panel panel--action">
          <div class="panel__title">玩家操作</div>
          <ActionPanel class="panel__body" />
        </div>
        <div class="panel panel--thoughts">
          <div class="panel__title">
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

    <footer v-if="gameStore.isEnded" class="play__end">
      <div class="play__end-text">{{ winnerText }}</div>
      <div class="play__end-reason">{{ gameStore.endReason }}</div>
    </footer>
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
  gap: 24px;
  flex-wrap: wrap;
}

.play__placeholder {
  font-size: 18px;
  color: var(--color-text-3);
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
  background: var(--color-bg-1);
  border-radius: 12px;
  padding: 16px;
}

.play__hint {
  color: var(--color-text-3);
  font-size: 16px;
}

.play__sidebar {
  display: grid;
  grid-template-rows: 1.4fr 0.9fr 0.7fr;
  gap: 16px;
  min-height: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-2);
  border-radius: 12px;
  overflow: hidden;
}

.panel__title {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
  background: var(--color-fill-2);
  border-bottom: 1px solid var(--color-border-2);
}

.panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.thoughts {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thought {
  background: rgba(74, 92, 255, 0.06);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.thought__head {
  font-weight: 600;
  margin-bottom: 4px;
  color: #ffd93d;
  font-size: 12px;
}

.thought__body {
  color: var(--color-text-2);
  line-height: 1.5;
}

.thoughts__empty {
  color: var(--color-text-3);
  text-align: center;
  padding: 16px;
}

.play__end {
  text-align: center;
  padding: 16px;
  background: var(--color-bg-2);
  border-radius: 12px;
}

.play__end-text {
  font-size: 24px;
  font-weight: 700;
  color: #ffd93d;
}

.play__end-reason {
  color: var(--color-text-2);
  margin-top: 4px;
}
</style>
