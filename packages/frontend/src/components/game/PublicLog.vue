<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { GameEvent } from '@wfk/shared';
import { findPlayer as findPlayerEngine } from '@wfk/engine';
import { useGameStore } from '@/stores/game';
import { ROLE_NAMES_ZH } from '@wfk/shared';

const gameStore = useGameStore();
const logRef = ref<HTMLDivElement | null>(null);

// Only show events that are publicly visible to a spectator
const visibleEvents = computed<GameEvent[]>(() =>
  gameStore.events.filter((e) =>
    [
      'PHASE_TRANSITION',
      'SPEAK',
      'VOTE',
      'EXECUTION',
      'DEATH',
      'PEACEFUL_NIGHT',
      'WEREWOLF_KILL_DECIDED',
      'GAME_START',
      'GAME_END',
      'HUNTER_SHOOT',
    ].includes(e.type)
  )
);

watch(
  () => visibleEvents.value.length,
  async () => {
    await nextTick();
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight;
  }
);

function formatEvent(e: GameEvent): string {
  const state = gameStore.state;
  switch (e.type) {
    case 'GAME_START':
      return `游戏开始，共 ${e.players.length} 名玩家`;
    case 'PHASE_TRANSITION':
      return `阶段切换：${e.from} → ${e.to}`;
    case 'SPEAK':
      return `💬 ${e.playerId}：${e.content}`;
    case 'VOTE':
      return `🗳 ${e.voterId} → ${e.targetId}`;
    case 'WEREWOLF_KILL_DECIDED':
      return `（夜里）狼队选择目标：${e.targetId}`;
    case 'EXECUTION':
      return `⚖ 投票出局：${e.targetId}`;
    case 'DEATH': {
      const p = state ? findPlayerEngine(state, e.playerId) : null;
      const roleName = p ? ROLE_NAMES_ZH[p.role] : '';
      return `☠ ${e.playerId} 出局 (${roleName}) - ${causeText(e.cause)}`;
    }
    case 'PEACEFUL_NIGHT':
      return `🌙 昨夜平安`;
    case 'HUNTER_SHOOT':
      return e.targetId
        ? `🔫 猎人 ${e.hunterId} 开枪带走 ${e.targetId}`
        : `🔫 猎人 ${e.hunterId} 选择不开枪`;
    case 'GAME_END':
      return `🏁 ${e.winner === 'wolves' ? '🐺 狼人' : '👥 好人'}胜利 — ${e.reason}`;
    default:
      return '';
  }
}

function causeText(c: string): string {
  return {
    wolf_kill: '狼刀',
    witch_poison: '女巫毒',
    vote: '投票出局',
    hunter_shot: '猎人开枪',
  }[c] ?? c;
}

function eventClass(e: GameEvent): string {
  switch (e.type) {
    case 'SPEAK':
      return 'evt-speech';
    case 'DEATH':
    case 'EXECUTION':
      return 'evt-death';
    case 'GAME_END':
      return 'evt-end';
    case 'PHASE_TRANSITION':
      return 'evt-phase';
    default:
      return 'evt-default';
  }
}
</script>

<template>
  <div class="public-log" ref="logRef">
    <div
      v-for="(e, idx) in visibleEvents"
      :key="idx"
      :class="['evt', eventClass(e)]"
    >
      <span class="evt__day">D{{ e.day }}</span>
      <span class="evt__text">{{ formatEvent(e) }}</span>
    </div>
    <div v-if="visibleEvents.length === 0" class="public-log__empty">
      （游戏尚未开始）
    </div>
  </div>
</template>

<style scoped lang="scss">
.public-log {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  background: var(--color-bg-1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.evt {
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
}

.evt__day {
  font-size: 12px;
  color: var(--color-text-3);
  font-weight: 600;
  min-width: 30px;
}

.evt__text {
  flex: 1;
}

.evt-speech {
  background: rgba(74, 92, 255, 0.08);
}

.evt-death {
  background: rgba(255, 100, 100, 0.1);
  color: #ffb3b3;
}

.evt-end {
  background: rgba(255, 217, 61, 0.15);
  font-weight: 700;
  padding: 12px;
  border-radius: 8px;
}

.evt-phase {
  font-size: 12px;
  color: var(--color-text-3);
  font-style: italic;
}

.public-log__empty {
  color: var(--color-text-3);
  text-align: center;
  padding: 32px;
}
</style>
