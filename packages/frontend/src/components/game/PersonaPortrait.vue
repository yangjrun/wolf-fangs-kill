<script setup lang="ts">
import { computed } from 'vue';
import type { Persona } from '@wfk/shared';

const props = defineProps<{
  persona: Persona | null;
  fallbackName?: string;
  fallbackInitial?: string;
}>();

const displayName = computed(() => props.persona?.name ?? props.fallbackName ?? '玩家');
const displayInitial = computed(() => {
  if (props.persona?.name) return props.persona.name.slice(0, 1);
  if (props.fallbackInitial) return props.fallbackInitial;
  return '?';
});
const subtitle = computed(() => {
  if (props.persona?.id) return props.persona.id;
  return 'human';
});
</script>

<template>
  <div class="portrait gilt-corners">
    <div class="portrait__frame">
      <div class="portrait__inner">
        <div class="portrait__glyph">{{ displayInitial }}</div>
      </div>
    </div>
    <div class="portrait__ribbon">
      <span class="portrait__ribbon-text">{{ displayName }}</span>
    </div>
    <div class="portrait__subtitle">{{ subtitle }}</div>
  </div>
</template>

<style scoped lang="scss">
.portrait {
  position: relative;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 3 / 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 18px 18px 50px;
  background:
    linear-gradient(160deg, var(--wfk-card-paper-1) 0%, var(--wfk-card-paper-2) 100%);
  border: 1px solid var(--wfk-card-edge);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 10px 24px rgba(0, 0, 0, 0.55),
    0 1px 3px rgba(0, 0, 0, 0.4);
}

.portrait::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--wfk-noise-url);
  opacity: 0.1;
  mix-blend-mode: overlay;
  pointer-events: none;
  border-radius: inherit;
}

.portrait__frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  padding: 8px;
  background:
    linear-gradient(180deg, #4a3a14 0%, #1a1208 100%);
  box-shadow:
    inset 0 1px 0 rgba(240, 216, 134, 0.35),
    inset 0 -1px 0 rgba(0, 0, 0, 0.6),
    0 2px 6px rgba(0, 0, 0, 0.5);
}

.portrait__inner {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 36% 30%,
      #6a7290 0%,
      #353d58 45%,
      #1a1f33 80%,
      #0a0e1a 100%);
  border: 1px solid rgba(212, 175, 55, 0.45);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.55),
    inset 0 0 28px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.portrait__inner::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 20%,
      rgba(255, 230, 180, 0.18) 0%,
      transparent 55%);
  pointer-events: none;
}

.portrait__glyph {
  font-family: var(--wfk-font-display);
  font-weight: 700;
  font-size: 92px;
  color: var(--wfk-gold-2);
  text-shadow:
    0 2px 6px rgba(0, 0, 0, 0.8),
    0 0 24px rgba(212, 175, 55, 0.35);
  letter-spacing: 0;
  line-height: 1;
}

.portrait__ribbon {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  padding: 5px 22px;
  background:
    linear-gradient(180deg, #5a4318 0%, #2a1e08 100%);
  border: 1px solid rgba(212, 175, 55, 0.55);
  border-radius: 2px;
  box-shadow:
    inset 0 1px 0 rgba(240, 216, 134, 0.35),
    inset 0 -1px 0 rgba(0, 0, 0, 0.6),
    0 2px 6px rgba(0, 0, 0, 0.55);
}

.portrait__ribbon::before,
.portrait__ribbon::after {
  content: '';
  position: absolute;
  top: 0;
  width: 10px;
  height: 100%;
  background:
    linear-gradient(180deg, #2a1e08 0%, #1a1208 100%);
}

.portrait__ribbon::before {
  left: -10px;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 50% 50%);
}

.portrait__ribbon::after {
  right: -10px;
  clip-path: polygon(0 0, 100% 0, 50% 50%, 100% 100%, 0 100%);
}

.portrait__ribbon-text {
  font-family: var(--wfk-font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--wfk-gold-2);
  letter-spacing: 0.12em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
}

.portrait__subtitle {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: rgba(232, 226, 200, 0.5);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-style: italic;
}
</style>
