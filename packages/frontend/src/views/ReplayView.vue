<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { ROLE_NAMES_ZH, ROLE_FACTIONS, PERSONAS } from '@wfk/shared';
import { RNG } from '@wfk/engine';
import type { GameEvent } from '@wfk/shared';

const router = useRouter();
const gameStore = useGameStore();

type Perspective = 'god' | 'wolves' | string; // string = playerId
const perspective = ref<Perspective>('god');
const expandedIdx = ref<number | null>(null);

const players = computed(() => gameStore.state?.players ?? []);
const events = computed(() => gameStore.events);

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

const perspectiveOptions = computed(() => [
  { label: '上帝视角', value: 'god' },
  { label: '狼队视角', value: 'wolves' },
  ...players.value.map((p) => ({
    label: `${p.id}（${ROLE_NAMES_ZH[p.role]}）`,
    value: p.id,
  })),
]);

function isVisible(event: GameEvent): boolean {
  if (event.type === 'PHASE_TRANSITION') return false;
  if (perspective.value === 'god') return true;

  const viewerId = perspective.value === 'wolves' ? null : perspective.value;
  const viewer = viewerId ? players.value.find((p) => p.id === viewerId) : null;

  switch (event.type) {
    case 'WEREWOLF_VOTE':
    case 'WEREWOLF_KILL_DECIDED':
      return perspective.value === 'wolves' || viewer?.role === 'werewolf';
    case 'SEER_CHECK':
      return perspective.value !== 'wolves' && (viewer?.role === 'seer' || viewer?.id === event.checkerId);
    case 'WITCH_HEAL':
    case 'WITCH_POISON':
    case 'WITCH_SKIP':
      return perspective.value !== 'wolves' && viewer?.role === 'witch';
    default:
      return true;
  }
}

function hasThought(event: GameEvent): boolean {
  return event.type === 'SPEAK' || event.type === 'SEER_CHECK' ||
    event.type === 'WEREWOLF_VOTE' || event.type === 'WITCH_HEAL' ||
    event.type === 'WITCH_POISON' || event.type === 'WITCH_SKIP' ||
    event.type === 'HUNTER_SHOOT' || event.type === 'VOTE';
}

function getThought(event: GameEvent): string {
  switch (event.type) {
    case 'SPEAK': return event.internalThought;
    case 'SEER_CHECK': return event.reasoning;
    case 'WEREWOLF_VOTE': return event.reasoning;
    case 'WITCH_HEAL': return event.reasoning;
    case 'WITCH_POISON': return event.reasoning;
    case 'WITCH_SKIP': return event.reasoning;
    case 'HUNTER_SHOOT': return event.reasoning;
    case 'VOTE': return event.reasoning;
    default: return '';
  }
}

function getActor(event: GameEvent): string {
  switch (event.type) {
    case 'SPEAK': return event.playerId;
    case 'SEER_CHECK': return event.checkerId;
    case 'WEREWOLF_VOTE': return event.voterId;
    case 'WITCH_HEAL': return event.witchId;
    case 'WITCH_POISON': return event.witchId;
    case 'WITCH_SKIP': return event.witchId;
    case 'HUNTER_SHOOT': return event.hunterId;
    case 'VOTE': return event.voterId;
    default: return '';
  }
}

function getPlayerRole(playerId: string): string {
  const p = players.value.find((x) => x.id === playerId);
  return p ? ROLE_NAMES_ZH[p.role] : '';
}

function eventLabel(event: GameEvent): string {
  switch (event.type) {
    case 'GAME_START': return `游戏开始，共 ${event.players.length} 名玩家`;
    case 'GAME_END': return `🏁 ${event.winner === 'wolves' ? '🐺 狼人胜利' : '👥 好人胜利'} — ${event.reason}`;
    case 'DEATH': return `☠ ${event.playerId} 出局（${event.cause}）`;
    case 'SPEAK': return `💬 ${event.playerId}：${event.content}`;
    case 'VOTE': return `🗳 ${event.voterId} → ${event.targetId}`;
    case 'EXECUTION': return `⚖ 投票出局：${event.targetId}`;
    case 'WEREWOLF_VOTE': return `🐺 ${event.voterId} 提名 ${event.targetId}`;
    case 'WEREWOLF_KILL_DECIDED': return `🐺 狼队决定击杀 ${event.targetId}`;
    case 'SEER_CHECK': return `🔮 ${event.checkerId} 查验 ${event.targetId} → ${event.result === 'wolf' ? '狼人' : '好人'}`;
    case 'WITCH_HEAL': return `💊 女巫救了 ${event.targetId}`;
    case 'WITCH_POISON': return `☠ 女巫毒了 ${event.targetId}`;
    case 'WITCH_SKIP': return `⏭ 女巫跳过`;
    case 'HUNTER_SHOOT': return event.targetId ? `🔫 猎人射杀 ${event.targetId}` : `🔫 猎人不开枪`;
    case 'PEACEFUL_NIGHT': return `🌙 平安夜`;
    default: return event.type;
  }
}

function eventTag(event: GameEvent): string {
  return `D${event.day}`;
}

function tagColor(event: GameEvent): string {
  if (event.type === 'GAME_END') return 'gold';
  if (event.type === 'DEATH' || event.type === 'EXECUTION') return 'red';
  if (event.type === 'SPEAK') return 'blue';
  if (event.type === 'VOTE') return 'purple';
  if (event.type.startsWith('WEREWOLF')) return 'orangered';
  if (event.type.startsWith('WITCH')) return 'green';
  if (event.type === 'SEER_CHECK') return 'cyan';
  if (event.type === 'HUNTER_SHOOT') return 'orange';
  return 'gray';
}

const visibleEvents = computed(() =>
  events.value
    .map((e, i) => ({ event: e, idx: i }))
    .filter(({ event }) => isVisible(event))
);

function toggleExpand(idx: number): void {
  expandedIdx.value = expandedIdx.value === idx ? null : idx;
}

function exportJson(): void {
  const data = {
    seed: gameStore.state?.config.seed,
    winner: gameStore.winner,
    endReason: gameStore.endReason,
    players: players.value,
    events: events.value,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wfk-replay-${gameStore.state?.config.seed ?? 'unknown'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="replay">
    <header class="replay__header">
      <a-button @click="router.push('/play')">← 返回游戏</a-button>
      <div class="replay__title">
        复盘
        <span v-if="gameStore.winner" class="replay__result">
          {{ gameStore.winner === 'wolves' ? '🐺 狼人胜' : '👥 好人胜' }}
        </span>
      </div>
      <a-space>
        <a-select
          v-model="perspective"
          :options="perspectiveOptions"
          style="width: 200px"
          placeholder="选择视角"
        />
        <a-button @click="exportJson">导出 JSON</a-button>
      </a-space>
    </header>

    <div v-if="!gameStore.state" class="replay__empty">
      游戏尚未开始，无复盘数据。
    </div>

    <main v-else class="replay__main">
      <!-- Player roster -->
      <aside class="replay__roster">
        <div class="roster__title">玩家列表</div>
        <div
          v-for="p in players"
          :key="p.id"
          class="roster__item"
          :class="{ 'roster__item--dead': !p.alive, 'roster__item--selected': perspective === p.id }"
          @click="perspective = p.id"
        >
          <span class="roster__seat">{{ p.seat }}</span>
          <span class="roster__name">{{ personaNames[p.id] ?? p.displayName }}</span>
          <span class="roster__role" :class="`roster__role--${ROLE_FACTIONS[p.role]}`">
            {{ ROLE_NAMES_ZH[p.role] }}
          </span>
          <span v-if="!p.alive" class="roster__dead">☠</span>
        </div>
      </aside>

      <!-- Timeline -->
      <section class="replay__timeline">
        <div
          v-for="{ event, idx } in visibleEvents"
          :key="idx"
          class="timeline-item"
          :class="{ 'timeline-item--expandable': hasThought(event), 'timeline-item--expanded': expandedIdx === idx }"
          @click="hasThought(event) ? toggleExpand(idx) : undefined"
        >
          <span class="timeline-item__tag" :style="{ color: tagColor(event) }">
            {{ eventTag(event) }}
          </span>
          <span class="timeline-item__label">{{ eventLabel(event) }}</span>
          <span v-if="hasThought(event)" class="timeline-item__expand">
            {{ expandedIdx === idx ? '▲' : '▼' }}
          </span>

          <div v-if="expandedIdx === idx && hasThought(event)" class="thought-bubble">
            <div class="thought-bubble__actor">
              {{ getActor(event) }}（{{ getPlayerRole(getActor(event)) }}）内心独白
            </div>
            <div class="thought-bubble__text">{{ getThought(event) }}</div>
          </div>
        </div>

        <div v-if="visibleEvents.length === 0" class="replay__empty-timeline">
          当前视角无可见事件。
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
.replay {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
  gap: 16px;
}

.replay__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.replay__title {
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
}

.replay__result {
  font-size: 16px;
  color: #ffd93d;
}

.replay__empty {
  color: var(--color-text-3);
  text-align: center;
  padding: 48px;
}

.replay__main {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.replay__roster {
  background: var(--color-bg-2);
  border-radius: 12px;
  overflow-y: auto;
  padding: 8px;
}

.roster__title {
  font-weight: 600;
  padding: 8px 8px 12px;
  font-size: 13px;
  color: var(--color-text-2);
}

.roster__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;

  &:hover { background: var(--color-fill-2); }
  &--selected { background: rgba(74, 92, 255, 0.15); }
  &--dead { opacity: 0.45; }
}

.roster__seat {
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: var(--color-text-3);
}

.roster__name {
  flex: 1;
  font-weight: 600;
}

.roster__role {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;

  &--wolves { background: rgba(255, 80, 80, 0.2); color: #ff5050; }
  &--villagers { background: rgba(80, 200, 120, 0.2); color: #50c878; }
}

.roster__dead {
  font-size: 12px;
}

.replay__timeline {
  background: var(--color-bg-2);
  border-radius: 12px;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  flex-wrap: wrap;

  &--expandable {
    cursor: pointer;
    &:hover { background: var(--color-fill-2); }
  }

  &--expanded { background: var(--color-fill-2); }
}

.timeline-item__tag {
  font-size: 11px;
  font-weight: 700;
  min-width: 28px;
  padding-top: 1px;
}

.timeline-item__label {
  flex: 1;
  line-height: 1.5;
  color: var(--color-text-1);
}

.timeline-item__expand {
  font-size: 10px;
  color: var(--color-text-3);
  padding-top: 2px;
}

.thought-bubble {
  width: 100%;
  margin-top: 8px;
  background: rgba(74, 92, 255, 0.08);
  border-left: 3px solid rgba(74, 92, 255, 0.5);
  border-radius: 0 8px 8px 0;
  padding: 10px 14px;
}

.thought-bubble__actor {
  font-size: 11px;
  font-weight: 700;
  color: #ffd93d;
  margin-bottom: 6px;
}

.thought-bubble__text {
  color: var(--color-text-2);
  line-height: 1.6;
  font-size: 13px;
}

.replay__empty-timeline {
  color: var(--color-text-3);
  text-align: center;
  padding: 32px;
}
</style>
