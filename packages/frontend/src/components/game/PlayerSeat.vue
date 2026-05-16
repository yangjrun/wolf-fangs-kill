<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@wfk/shared';
import { ROLE_NAMES_ZH } from '@wfk/shared';

const props = defineProps<{
  player: Player;
  speaking?: boolean;
  godView?: boolean;  // show role to viewer
  personaName?: string;
}>();

const classes = computed(() => ({
  seat: true,
  'seat--dead': !props.player.alive,
  'seat--speaking': props.speaking,
  'seat--human': props.player.isHuman,
}));

const initial = computed(() => {
  if (props.personaName) return props.personaName.slice(0, 1);
  return String(props.player.seat);
});
</script>

<template>
  <div :class="classes">
    <div class="seat__seat-num">{{ player.seat }}</div>
    <div class="seat__avatar">
      <span v-if="!player.alive" class="seat__dead-mark">☠</span>
      <span v-else class="seat__initial">{{ initial }}</span>
    </div>
    <div class="seat__id">{{ player.id }}</div>
    <div v-if="personaName" class="seat__persona">{{ personaName }}</div>
    <div v-if="!player.alive || godView" class="seat__role">
      {{ ROLE_NAMES_ZH[player.role] }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: linear-gradient(180deg, #1c2030 0%, #161927 100%);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  min-width: 88px;
  position: relative;
}

.seat--dead {
  opacity: 0.4;
  filter: grayscale(1);
}

.seat--speaking {
  border-color: #ffd93d;
  box-shadow: 0 0 24px rgba(255, 217, 61, 0.4);
  transform: translateY(-4px);
}

.seat--human {
  border-color: #4a5cff;
}

.seat__seat-num {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 10px;
  color: var(--color-text-3);
  font-weight: 700;
}

.seat__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2b3148 0%, #1f2335 100%);
  border: 2px solid #3a4060;
  margin: 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #c9cfe6;
}

.seat__dead-mark {
  font-size: 28px;
  color: #888;
}

.seat__id {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-1);
}

.seat__persona {
  font-size: 11px;
  color: var(--color-text-2);
  margin-top: 2px;
}

.seat__role {
  font-size: 11px;
  color: #ffd93d;
  margin-top: 4px;
  font-weight: 600;
}
</style>
