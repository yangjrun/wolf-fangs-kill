<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@wfk/shared';
import { ROLE_NAMES_ZH, ROLE_FACTIONS } from '@wfk/shared';

const props = defineProps<{
  player: Player;
  speaking?: boolean;
  godView?: boolean;  // show role to viewer
  personaName?: string;
  isLover?: boolean;
  isSheriff?: boolean;
  hideIdentity?: boolean;  // night-vision: hide persona name + faction markers + lover/sheriff badges
}>();

const classes = computed(() => ({
  seat: true,
  'seat--dead': !props.player.alive,
  'seat--speaking': props.speaking,
  'seat--human': props.player.isHuman,
  'seat--revealed': props.player.revealed,
  'seat--hidden': props.hideIdentity,
}));

const initial = computed(() => {
  if (props.hideIdentity) return '?';
  if (props.personaName) return props.personaName.slice(0, 1);
  return String(props.player.seat);
});

// Show role when: human viewer is looking at their own seat (always),
// or it's a public reveal (death / god view / revealed idiot) and not night-hidden.
const showRole = computed(
  () => props.player.isHuman || (!props.hideIdentity && (!props.player.alive || props.godView || props.player.revealed)),
);
const factionClass = computed(() =>
  ROLE_FACTIONS[props.player.role] === 'wolves' ? 'wax-seal' : 'wax-seal wax-seal--village'
);
const showPersona = computed(() => !props.hideIdentity && !!props.personaName);
const showLover = computed(() => !props.hideIdentity && props.isLover);
const showSheriff = computed(() => !props.hideIdentity && props.isSheriff);
</script>

<template>
  <div :class="classes">
    <div class="seat__card gilt-corners">
      <div class="seat__seat-num">{{ player.seat }}</div>
      <div class="seat__avatar">
        <span v-if="!player.alive" class="seat__dead-mark">☠</span>
        <span v-else class="seat__initial">{{ initial }}</span>
      </div>
      <div class="seat__id">{{ player.id }}</div>
      <div v-if="showPersona" class="seat__persona">{{ personaName }}</div>
      <div v-if="showRole" :class="factionClass">
        {{ ROLE_NAMES_ZH[player.role] }}
      </div>
      <div v-if="player.revealed && player.alive && !hideIdentity" class="seat__revealed-mark" title="已翻牌（失去投票权）">翻</div>
      <div v-if="showLover" class="seat__lover-mark" title="情侣">❤</div>
      <div v-if="showSheriff" class="seat__sheriff-mark" title="警长（1.5 票权重）">★</div>
      <div v-if="!player.alive" class="seat__stamp">OUT</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.seat {
  position: relative;
  transition: transform 0.3s ease;
}

.seat__card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 10px 12px;
  min-width: 94px;
  background:
    linear-gradient(160deg, var(--wfk-card-paper-1) 0%, var(--wfk-card-paper-2) 100%);
  border: 1px solid var(--wfk-card-edge);
  border-radius: 10px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 6px 14px rgba(0, 0, 0, 0.55),
    0 1px 3px rgba(0, 0, 0, 0.4);
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
  overflow: hidden;
}

.seat__card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--wfk-noise-url);
  opacity: 0.08;
  pointer-events: none;
  mix-blend-mode: overlay;
}

/* ---- Night-vision: hide persona/role/marks, dim avatar ---- */
.seat--hidden .seat__card {
  background: linear-gradient(160deg, #1a1f33 0%, #0a0e1a 100%);
  border-color: rgba(120, 130, 160, 0.25);
}
.seat--hidden .seat__avatar {
  background:
    radial-gradient(circle at 32% 28%,
      #2a2f48 0%,
      #1b2038 50%,
      #0b0f1a 100%);
  color: rgba(232, 226, 200, 0.35);
}
.seat--hidden .seat__id {
  color: rgba(180, 200, 240, 0.35);
}

/* ---- Speaking: gilt halo + lift + pulse ---- */
.seat--speaking .seat__card {
  border-color: var(--wfk-gold-1);
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 200, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(212, 175, 55, 0.35),
    0 0 24px rgba(212, 175, 55, 0.45),
    0 10px 22px rgba(0, 0, 0, 0.55);
  transform: translateY(-4px);
  animation: seatPulse 2s ease-in-out infinite;
}

@keyframes seatPulse {
  0%, 100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 240, 200, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(212, 175, 55, 0.35),
      0 0 18px rgba(212, 175, 55, 0.35),
      0 10px 22px rgba(0, 0, 0, 0.55);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 240, 200, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(212, 175, 55, 0.55),
      0 0 32px rgba(212, 175, 55, 0.6),
      0 10px 22px rgba(0, 0, 0, 0.55);
  }
}

/* ---- Human: sapphire border ---- */
.seat--human .seat__card {
  border-color: #5a8bff;
  box-shadow:
    inset 0 1px 0 rgba(180, 200, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(90, 139, 255, 0.35),
    0 0 18px rgba(90, 139, 255, 0.35),
    0 6px 14px rgba(0, 0, 0, 0.55);
}

.seat--human.seat--speaking .seat__card {
  /* speaking gold overrides */
  border-color: var(--wfk-gold-1);
}

/* ---- Dead: flipped card with overlay stamp ---- */
.seat--dead .seat__card {
  filter: grayscale(0.85) brightness(0.6);
  transform: rotate(-3deg);
  opacity: 0.85;
}

.seat__stamp {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-14deg);
  font-family: var(--wfk-font-display);
  font-weight: 900;
  font-size: 22px;
  letter-spacing: 0.25em;
  color: rgba(180, 30, 30, 0.85);
  border: 3px solid rgba(180, 30, 30, 0.85);
  padding: 2px 10px;
  border-radius: 4px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 3;
}

/* ---- Seat number: calligraphic corner ---- */
.seat__seat-num {
  position: absolute;
  top: 4px;
  right: 8px;
  font-family: var(--wfk-font-display);
  font-size: 13px;
  color: var(--wfk-gold-1);
  font-weight: 700;
  font-style: italic;
  z-index: 1;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
}

/* ---- Brass-rimmed avatar ---- */
.seat__avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%,
      #4a5470 0%,
      #2b3148 50%,
      #1a1e30 100%);
  border: 2px solid var(--wfk-gold-deep);
  margin: 10px 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #e8e2c8;
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.15),
    inset 0 -2px 4px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(212, 175, 55, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.5);
  font-family: var(--wfk-font-display);
  font-weight: 700;
  z-index: 1;
}

.seat--dead .seat__avatar {
  border-color: #555;
}

.seat__dead-mark {
  font-size: 26px;
  color: #888;
}

.seat__id {
  font-size: 11px;
  font-weight: 500;
  color: rgba(232, 226, 200, 0.85);
  letter-spacing: 0.05em;
  z-index: 1;
}

.seat__persona {
  font-family: var(--wfk-font-display);
  font-size: 12px;
  color: var(--wfk-gold-2);
  margin-top: 2px;
  letter-spacing: 0.05em;
  z-index: 1;
}

.seat__card .wax-seal {
  margin-top: 6px;
  z-index: 1;
}

/* ---- Revealed idiot: keep alive but mark visually ---- */
.seat--revealed .seat__card {
  border-color: rgba(180, 80, 200, 0.65);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(180, 80, 200, 0.3),
    0 0 14px rgba(180, 80, 200, 0.3),
    0 6px 14px rgba(0, 0, 0, 0.55);
}

.seat__revealed-mark {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(180deg, #a35bc4, #6c2a87);
  border: 1px solid rgba(255, 240, 200, 0.4);
  color: #ffe8ff;
  font-family: var(--wfk-font-display);
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

.seat__lover-mark {
  position: absolute;
  top: 6px;
  right: -2px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff8a9b 0%, #d92e4d 70%, #8a0e2a 100%);
  border: 1px solid rgba(255, 220, 220, 0.6);
  color: #fff;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(217, 46, 77, 0.55), 0 1px 3px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

.seat__sheriff-mark {
  position: absolute;
  bottom: 6px;
  right: -2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff3a3 0%, #d4af37 60%, #7a5a16 100%);
  border: 1px solid rgba(255, 240, 200, 0.7);
  color: #4b2f06;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.7), 0 1px 3px rgba(0, 0, 0, 0.6);
  z-index: 2;
}
</style>
