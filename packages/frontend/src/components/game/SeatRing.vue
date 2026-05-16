<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@wfk/shared';
import PlayerSeat from './PlayerSeat.vue';

const props = defineProps<{
  players: Player[];
  currentActorId?: string | null;
  godView?: boolean;
  personaNames?: Record<string, string>;  // playerId -> persona name
}>();

// Arrange 9 seats in a circular layout
const seatPositions = computed(() => {
  const n = props.players.length;
  return props.players.map((player, i) => {
    // Distribute around a circle. Start at top (270°) going clockwise.
    const angle = (270 + (360 / n) * i) * (Math.PI / 180);
    const radius = 42;  // % of container
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { player, x, y };
  });
});
</script>

<template>
  <div class="ring">
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
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.ring {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-width: 640px;
  margin: 0 auto;
  background: radial-gradient(circle, #1a1d28 0%, #0f1115 70%);
  border-radius: 50%;
  border: 1px solid #2a2e3a;
}

.ring__slot {
  position: absolute;
  transform: translate(-50%, -50%);
}
</style>
