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
      'IDIOT_REVEAL',
      'KNIGHT_DUEL',
      'SHERIFF_RUN',
      'SHERIFF_SKIP',
      'SHERIFF_VOTE',
      'SHERIFF_ELECTED',
      'BADGE_TRANSFERRED',
      'BADGE_DESTROYED',
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
    case 'IDIOT_REVEAL':
      return `🃏 ${e.playerId} 翻牌为白痴 — 免死但失去投票权`;
    case 'KNIGHT_DUEL': {
      const targetRoleName = ROLE_NAMES_ZH[e.targetRole] ?? e.targetRole;
      const result = e.killedId === e.targetId ? '决斗胜利（对方是狼）' : '决斗失败（自爆）';
      return `⚔ 骑士 ${e.knightId} 对 ${e.targetId}（${targetRoleName}）发起决斗 — ${result}`;
    }
    case 'SHERIFF_RUN':
      return `🎖 ${e.runnerId} 上警：${e.content}`;
    case 'SHERIFF_SKIP':
      return `🚫 ${e.playerId} 不上警`;
    case 'SHERIFF_VOTE':
      return `🗳 ${e.voterId} → ${e.targetId}（警长票）`;
    case 'SHERIFF_ELECTED':
      return e.sheriffId
        ? `🎖 警长当选：${e.sheriffId}`
        : `🎖 警长选举无效（无人参选或票数为零）`;
    case 'BADGE_TRANSFERRED':
      return `🎖 ${e.fromId} 将警徽传给了 ${e.toId}`;
    case 'BADGE_DESTROYED':
      return `🎖 ${e.fromId} 撕毁了警徽`;
    case 'GAME_END':
      return `🏁 ${e.winner === 'wolves' ? '🐺 狼人' : e.winner === 'lovers' ? '❤ 情侣' : '👥 好人'}胜利 — ${e.reason}`;
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
    knight_duel: '骑士决斗',
    broken_heart: '殉情',
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
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evt {
  display: flex;
  gap: 10px;
  padding: 7px 10px 7px 12px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.55;
  border-left: 3px solid rgba(212, 175, 55, 0.25);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.15));
  transition: background 0.15s;
}

.evt:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.2));
}

.evt__day {
  font-family: var(--wfk-font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--wfk-gold-1);
  min-width: 28px;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
}

.evt__text {
  flex: 1;
  color: #e8e2c8;
}

/* Per-event tinting */
.evt-speech {
  border-left-color: rgba(154, 179, 255, 0.65);
  background: linear-gradient(180deg, rgba(74, 92, 255, 0.06), rgba(0, 0, 0, 0.15));
}

.evt-death {
  border-left-color: rgba(255, 80, 80, 0.7);
  background: linear-gradient(180deg, rgba(180, 30, 30, 0.12), rgba(0, 0, 0, 0.2));
}
.evt-death .evt__text {
  color: #ffd4d4;
}

.evt-end {
  border-left-color: var(--wfk-gold-1);
  background:
    linear-gradient(180deg, rgba(212, 175, 55, 0.18), rgba(60, 40, 0, 0.25));
  font-family: var(--wfk-font-display);
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 10px 14px;
  margin: 4px 0;
  box-shadow:
    inset 0 1px 0 rgba(240, 216, 134, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.45);
}
.evt-end .evt__text {
  color: var(--wfk-gold-2);
}

.evt-phase {
  border-left-color: rgba(232, 226, 200, 0.25);
  font-size: 11px;
  color: rgba(232, 226, 200, 0.5);
  font-style: italic;
  padding: 4px 10px 4px 12px;
}
.evt-phase .evt__text {
  color: rgba(232, 226, 200, 0.55);
}

.public-log__empty {
  color: rgba(232, 226, 200, 0.4);
  text-align: center;
  padding: 32px;
  font-family: var(--wfk-font-display);
  font-style: italic;
  letter-spacing: 0.05em;
}
</style>
