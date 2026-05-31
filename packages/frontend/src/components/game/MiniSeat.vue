<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@wfk/shared';

const props = defineProps<{
  player: Player;
  active?: boolean;
  personaName?: string;
  isLover?: boolean;
  isSheriff?: boolean;
}>();

const initial = computed(() => {
  if (props.personaName) return props.personaName.slice(0, 1);
  return String(props.player.seat);
});

const classes = computed(() => ({
  'mini-seat': true,
  'mini-seat--dead': !props.player.alive,
  'mini-seat--active': props.active,
  'mini-seat--human': props.player.isHuman,
  'mini-seat--revealed': props.player.revealed,
}));
</script>

<template>
  <div :class="classes">
    <div v-if="active" class="mini-seat__arrow"></div>
    <div class="mini-seat__avatar">
      <span v-if="!player.alive" class="mini-seat__dead-mark">☠</span>
      <span v-else>{{ initial }}</span>
    </div>
    <div class="mini-seat__body">
      <div class="mini-seat__name">
        <span class="mini-seat__seat-num">{{ player.seat }}</span>
        <span class="mini-seat__persona">{{ personaName ?? player.id }}</span>
      </div>
      <div v-if="!player.alive" class="mini-seat__status mini-seat__status--out">出局</div>
      <div v-else-if="player.revealed" class="mini-seat__status mini-seat__status--revealed">翻牌</div>
    </div>
    <div class="mini-seat__badges">
      <span v-if="isSheriff" class="mini-seat__badge mini-seat__badge--sheriff" title="警长">★</span>
      <span v-if="isLover" class="mini-seat__badge mini-seat__badge--lover" title="情侣">❤</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mini-seat {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 6px 12px;
  background:
    linear-gradient(160deg, var(--wfk-card-paper-1) 0%, var(--wfk-card-paper-2) 100%);
  border: 1px solid var(--wfk-card-edge);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.45);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
  min-height: 52px;
}

.mini-seat--human {
  border-color: rgba(90, 139, 255, 0.7);
}

.mini-seat--dead {
  filter: grayscale(0.85) brightness(0.55);
  opacity: 0.7;
}

.mini-seat--revealed {
  border-color: rgba(180, 80, 200, 0.6);
}

.mini-seat--active {
  border-color: var(--wfk-gold-1);
  transform: translateX(6px);
  box-shadow:
    inset 0 1px 0 rgba(240, 216, 134, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(212, 175, 55, 0.45),
    0 0 20px rgba(212, 175, 55, 0.5),
    0 4px 10px rgba(0, 0, 0, 0.55);
}

.mini-seat__arrow {
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-left: 10px solid var(--wfk-gold-1);
  filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.6));
}

.mini-seat__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  background:
    radial-gradient(circle at 32% 28%, #4a5470 0%, #2b3148 55%, #1a1e30 100%);
  border: 1.5px solid var(--wfk-gold-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e8e2c8;
  font-family: var(--wfk-font-display);
  font-weight: 700;
  font-size: 16px;
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.15),
    inset 0 -2px 4px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(212, 175, 55, 0.35);
}

.mini-seat__dead-mark {
  font-size: 18px;
  color: #888;
}

.mini-seat__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-seat__name {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.mini-seat__seat-num {
  font-family: var(--wfk-font-display);
  font-size: 11px;
  color: var(--wfk-gold-1);
  font-weight: 700;
  font-style: italic;
  flex-shrink: 0;
}

.mini-seat__persona {
  font-family: var(--wfk-font-display);
  font-size: 13px;
  color: var(--wfk-gold-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.03em;
}

.mini-seat__status {
  font-size: 10px;
  letter-spacing: 0.1em;
  font-style: italic;
}

.mini-seat__status--out {
  color: rgba(220, 80, 80, 0.85);
}

.mini-seat__status--revealed {
  color: rgba(200, 130, 220, 0.85);
}

.mini-seat__badges {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}

.mini-seat__badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  border: 1px solid rgba(0, 0, 0, 0.45);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}

.mini-seat__badge--sheriff {
  background: radial-gradient(circle at 35% 30%, #fff3a3 0%, #d4af37 60%, #7a5a16 100%);
  color: #4b2f06;
}

.mini-seat__badge--lover {
  background: radial-gradient(circle at 35% 30%, #ff8a9b 0%, #d92e4d 70%, #8a0e2a 100%);
  color: #fff;
}
</style>
