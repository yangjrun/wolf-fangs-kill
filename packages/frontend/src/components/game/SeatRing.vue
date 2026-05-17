<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@wfk/shared';
import PlayerSeat from './PlayerSeat.vue';

const props = defineProps<{
  players: Player[];
  currentActorId?: string | null;
  godView?: boolean;
  personaNames?: Record<string, string>;  // playerId -> persona name
  lovers?: readonly [string, string];
  sheriffId?: string | null;
  nightVision?: boolean;  // true → hide identity of alive non-self/non-godView seats
  humanPlayerId?: string;
}>();

// Arrange 9 seats in a circular layout
const seatPositions = computed(() => {
  const n = props.players.length;
  return props.players.map((player, i) => {
    // Distribute around a circle. Start at top (270°) going clockwise.
    const angle = (270 + (360 / n) * i) * (Math.PI / 180);
    const radius = 40;  // % of container
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { player, x, y };
  });
});
</script>

<template>
  <div class="ring-wrap">
    <div class="ring">
      <div class="ring__altar"></div>
      <div
        v-for="({ player, x, y }) in seatPositions"
        :key="player.id"
        class="ring__slot"
        :style="{ left: `${x}%`, top: `${y}%` }"
      >
        <PlayerSeat
          :player="player"
          :speaking="player.id === currentActorId"
          :god-view="godView"
          :persona-name="personaNames?.[player.id]"
          :is-lover="lovers?.includes(player.id) ?? false"
          :is-sheriff="sheriffId === player.id"
          :hide-identity="nightVision && player.alive && !godView && player.id !== humanPlayerId"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ring-wrap {
  position: relative;
  width: 100%;
  max-width: 680px;
  aspect-ratio: 1;
  margin: 0 auto;

  /* Outer wood rim */
  background:
    radial-gradient(circle,
      transparent 0%,
      transparent 78%,
      rgba(58, 40, 24, 0.45) 79%,
      rgba(90, 60, 30, 0.85) 88%,
      rgba(38, 22, 8, 0.95) 96%,
      rgba(20, 10, 2, 1) 100%);
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(212, 175, 55, 0.25),
    inset 0 0 0 1px rgba(0, 0, 0, 0.6),
    0 20px 50px rgba(0, 0, 0, 0.65);
}

.ring-wrap::before {
  /* wood grain noise on rim */
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-image: var(--wfk-noise-url);
  opacity: 0.25;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.ring {
  position: absolute;
  inset: 5%;
  border-radius: 50%;

  /* Felt green table surface */
  background:
    radial-gradient(circle at 50% 45%,
      #2a5a42 0%,
      var(--wfk-tabletop-felt-1) 35%,
      var(--wfk-tabletop-felt-2) 90%,
      #06140d 100%);
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.55),
    inset 0 0 60px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(212, 175, 55, 0.35),
    inset 0 0 0 4px rgba(0, 0, 0, 0.45);
}

.ring::after {
  /* felt grain */
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-image: var(--wfk-noise-url);
  opacity: 0.22;
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* Central altar — soft moonlit halo at the table center */
.ring__altar {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30%;
  height: 30%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(154, 179, 255, 0.12) 0%,
    rgba(154, 179, 255, 0.04) 45%,
    transparent 75%);
  pointer-events: none;
}

/* Day variant — parent passes class via PlayView wrapper */
:global(.play__ring--day) .ring__altar {
  background: radial-gradient(circle,
    rgba(255, 184, 119, 0.16) 0%,
    rgba(255, 184, 119, 0.05) 45%,
    transparent 75%);
}

:global(.play__ring--day) .ring {
  background:
    radial-gradient(circle at 50% 45%,
      #3d6e52 0%,
      #234b39 40%,
      #112b1e 95%,
      #06140d 100%);
}

.ring__slot {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}
</style>
