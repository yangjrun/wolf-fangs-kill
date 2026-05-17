<script setup lang="ts">
import { computed } from 'vue';
import type { Phase } from '@wfk/shared';
import { PHASE_NAMES_ZH, isNightPhase, isDayPhase } from '@wfk/shared';

const props = defineProps<{
  phase: Phase;
  day: number;
}>();

const phaseLabel = computed(() => PHASE_NAMES_ZH[props.phase]);

const classes = computed(() => ({
  phase: true,
  'phase--night': isNightPhase(props.phase),
  'phase--day': isDayPhase(props.phase),
}));
</script>

<template>
  <div :class="classes">
    <div class="phase__emblem">
      <div class="phase__orb">
        <span class="phase__glyph">{{ isNightPhase(phase) ? '☾' : '☀' }}</span>
      </div>
    </div>
    <div class="phase__meta">
      <div class="phase__day">DAY</div>
      <div class="phase__day-num">{{ day }}</div>
      <hr class="gilt-rule">
      <div class="phase__name">{{ phaseLabel }}</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.phase {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 18px 8px 8px;
  border-radius: 14px;
  background:
    linear-gradient(180deg,
      rgba(34, 38, 55, 0.85) 0%,
      rgba(22, 25, 39, 0.85) 100%);
  border: 1px solid var(--wfk-card-edge);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 4px 10px rgba(0, 0, 0, 0.45);
  transition: background 0.4s ease, border-color 0.4s ease;
  min-width: 200px;
  position: relative;
  overflow: hidden;
}

.phase::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--wfk-noise-url);
  opacity: 0.07;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.phase__emblem {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 30%, #f0d886, #d4af37 45%, #8a6a14 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 1px 1px rgba(255, 240, 200, 0.55),
    inset 0 -2px 4px rgba(60, 40, 0, 0.55),
    0 0 0 1px rgba(212, 175, 55, 0.45),
    0 3px 6px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.phase__orb {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 40% 35%, var(--wfk-moon-glow), var(--wfk-moon-deep) 80%);
  box-shadow:
    inset 0 -2px 4px rgba(0, 0, 0, 0.55),
    0 0 16px rgba(154, 179, 255, 0.5);
  transition: background 0.4s ease, box-shadow 0.4s ease;
}

.phase__glyph {
  font-size: 24px;
  color: #fff;
  text-shadow:
    0 0 8px rgba(154, 179, 255, 0.85),
    0 1px 1px rgba(0, 0, 0, 0.55);
}

.phase--day .phase__orb {
  background: radial-gradient(circle at 40% 35%, #fff1d2, var(--wfk-sun-glow) 55%, var(--wfk-sun-deep) 95%);
  box-shadow:
    inset 0 -2px 4px rgba(80, 30, 0, 0.45),
    0 0 18px rgba(255, 184, 119, 0.7);
}

.phase--day .phase__glyph {
  color: #fff7e6;
  text-shadow:
    0 0 8px rgba(255, 184, 119, 0.9),
    0 1px 1px rgba(80, 30, 0, 0.55);
}

.phase__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  min-width: 100px;
}

.phase__day {
  font-family: var(--wfk-font-display);
  font-size: 10px;
  letter-spacing: 0.3em;
  color: var(--wfk-gold-1);
  opacity: 0.85;
  line-height: 1;
}

.phase__day-num {
  font-family: var(--wfk-font-display);
  font-size: 30px;
  font-weight: 700;
  color: var(--wfk-gold-2);
  line-height: 1;
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.55),
    0 0 12px rgba(212, 175, 55, 0.35);
  margin-top: 2px;
}

.phase__meta .gilt-rule {
  width: 100%;
  margin: 4px 0;
}

.phase__name {
  font-family: var(--wfk-font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: #e8e2c8;
  text-transform: uppercase;
}
</style>
