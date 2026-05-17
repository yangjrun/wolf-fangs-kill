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
    <header class="replay__header card-paper">
      <div class="replay__header-left">
        <a-button @click="router.push('/play')">← 返回游戏</a-button>
        <div class="replay__title">
          <span class="replay__title-text">复盘</span>
          <span v-if="gameStore.winner" class="replay__result">
            {{ gameStore.winner === 'wolves' ? '🐺 狼人胜' : '👥 好人胜' }}
          </span>
        </div>
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
      <aside class="replay__roster card-paper">
        <div class="roster__title brass-plate">玩家列表</div>
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
      <section class="replay__timeline card-paper">
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
  padding: 12px 18px;
}

.replay__header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.replay__title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.replay__title-text {
  font-family: var(--wfk-font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: var(--wfk-gold-2);
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.55),
    0 0 14px rgba(212, 175, 55, 0.4);
}

.replay__result {
  font-family: var(--wfk-font-display);
  font-size: 14px;
  color: var(--wfk-gold-2);
  letter-spacing: 0.1em;
  padding: 4px 12px;
  border-left: 1px solid rgba(212, 175, 55, 0.45);
  border-right: 1px solid rgba(212, 175, 55, 0.45);
}

.replay__empty {
  color: rgba(232, 226, 200, 0.45);
  text-align: center;
  padding: 64px;
  font-family: var(--wfk-font-display);
  font-style: italic;
  letter-spacing: 0.05em;
}

.replay__main {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.replay__roster {
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 8px;
}

.replay__roster > .roster__item:first-of-type {
  margin-top: 8px;
}

.replay__roster > .roster__item {
  margin: 0 8px 4px;
}

.roster__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s, box-shadow 0.15s;
  margin-bottom: 4px;
  border: 1px solid transparent;

  &:hover {
    background: rgba(212, 175, 55, 0.06);
    border-color: rgba(212, 175, 55, 0.2);
  }
  &--selected {
    background: rgba(212, 175, 55, 0.12);
    border-color: var(--wfk-gold-1);
    box-shadow: 0 0 12px rgba(212, 175, 55, 0.25);
  }
  &--dead { opacity: 0.45; }
}

.roster__seat {
  width: 22px;
  text-align: center;
  font-family: var(--wfk-font-display);
  font-weight: 700;
  font-size: 14px;
  color: var(--wfk-gold-1);
}

.roster__name {
  flex: 1;
  font-weight: 600;
  color: #e8e2c8;
}

.roster__role {
  font-family: var(--wfk-font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border-radius: 999px;

  &--wolves {
    background: radial-gradient(circle at 35% 30%, #c2342f 0%, #6e1414 70%, #3a0808 100%);
    color: #ffd9c9;
    box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.55);
  }
  &--villagers {
    background: radial-gradient(circle at 35% 30%, #d5ab4c 0%, #7e5a16 70%, #3a2808 100%);
    color: #fff4d0;
    box-shadow: inset 0 -1px 2px rgba(0, 0, 0, 0.55);
  }
}

.roster__dead {
  font-size: 12px;
}

.replay__timeline {
  overflow-y: auto;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 10px 7px 12px;
  border-radius: 4px;
  font-size: 13px;
  flex-wrap: wrap;
  border-left: 3px solid rgba(212, 175, 55, 0.25);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.15));
  transition: background 0.15s;

  &--expandable {
    cursor: pointer;
    &:hover {
      background: linear-gradient(180deg, rgba(212, 175, 55, 0.08), rgba(0, 0, 0, 0.2));
      border-left-color: var(--wfk-gold-1);
    }
  }

  &--expanded {
    background: linear-gradient(180deg, rgba(212, 175, 55, 0.1), rgba(0, 0, 0, 0.22));
    border-left-color: var(--wfk-gold-1);
  }
}

.timeline-item__tag {
  font-family: var(--wfk-font-display);
  font-size: 12px;
  font-weight: 700;
  min-width: 28px;
  padding-top: 1px;
  letter-spacing: 0.05em;
  /* color comes from inline :style (tagColor) for event-type tinting */
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
}

.timeline-item__label {
  flex: 1;
  line-height: 1.55;
  color: #e8e2c8;
}

.timeline-item__expand {
  font-size: 10px;
  color: var(--wfk-gold-1);
  padding-top: 2px;
  opacity: 0.7;
}

.thought-bubble {
  width: 100%;
  margin-top: 8px;
  position: relative;
  background:
    linear-gradient(160deg, rgba(42, 37, 21, 0.85), rgba(26, 22, 9, 0.85));
  border: 1px solid rgba(212, 175, 55, 0.28);
  border-left: 3px solid var(--wfk-gold-1);
  border-radius: 4px;
  padding: 12px 16px;
  box-shadow:
    inset 0 1px 0 rgba(212, 175, 55, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.45);
}

.thought-bubble::before {
  content: '“';
  position: absolute;
  top: -2px;
  left: 8px;
  font-family: var(--wfk-font-display);
  font-size: 32px;
  color: rgba(212, 175, 55, 0.55);
  line-height: 1;
}

.thought-bubble__actor {
  font-family: var(--wfk-font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--wfk-gold-2);
  margin-bottom: 6px;
  padding-left: 18px;
}

.thought-bubble__text {
  color: #e8e2c8;
  line-height: 1.7;
  font-size: 13px;
  font-style: italic;
}

.replay__empty-timeline {
  color: rgba(232, 226, 200, 0.45);
  text-align: center;
  padding: 32px;
  font-family: var(--wfk-font-display);
  font-style: italic;
}
</style>
