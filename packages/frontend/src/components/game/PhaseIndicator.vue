<script setup lang="ts">
import { computed } from 'vue';
import type { Phase } from '@wfk/shared';
import { PHASE_NAMES_ZH, isNightPhase, isDayPhase } from '@wfk/shared';

const props = defineProps<{
  phase: Phase;
  day: number;
}>();

const periodLabel = computed(() => {
  if (isNightPhase(props.phase)) return '🌙 夜';
  if (isDayPhase(props.phase)) return '☀ 昼';
  return '';
});

const phaseLabel = computed(() => PHASE_NAMES_ZH[props.phase]);

const classes = computed(() => ({
  phase: true,
  'phase--night': isNightPhase(props.phase),
  'phase--day': isDayPhase(props.phase),
}));
</script>

<template>
  <div :class="classes">
    <div class="phase__day">第 {{ day }} 天</div>
    <div class="phase__period">{{ periodLabel }}</div>
    <div class="phase__name">{{ phaseLabel }}</div>
  </div>
</template>

<style scoped lang="scss">
.phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 24px;
  border-radius: 12px;
  min-width: 180px;
  transition: all 0.4s ease;
}

.phase--night {
  background: linear-gradient(135deg, #1a1d3a 0%, #0d1024 100%);
  color: #c0c8ff;
  border: 1px solid #3a4060;
}

.phase--day {
  background: linear-gradient(135deg, #3a2f1a 0%, #241c0d 100%);
  color: #ffd9a3;
  border: 1px solid #6a5a3a;
}

.phase__day {
  font-size: 12px;
  opacity: 0.7;
}

.phase__period {
  font-size: 24px;
  font-weight: 700;
}

.phase__name {
  font-size: 14px;
  font-weight: 600;
}
</style>
