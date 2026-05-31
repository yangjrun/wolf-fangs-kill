<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Player } from '@wfk/shared';
import { PHASE_NAMES_ZH, ROLE_NAMES_ZH } from '@wfk/shared';
import type { Phase } from '@wfk/shared';
import type { ActiveSpeech } from '@/composables/useSpeechSpotlight';
import MiniSeat from './MiniSeat.vue';
import PersonaPortrait from './PersonaPortrait.vue';

const props = defineProps<{
  active: ActiveSpeech;
  typedChars: number;
  players: Player[];
  personaNames: Record<string, string>;
  lovers?: readonly [string, string] | null;
  sheriffId?: string | null;
  godView?: boolean;
  day: number;
  phase: string;
}>();

const emit = defineEmits<{ skip: [] }>();

const spotlightRef = ref<HTMLElement | null>(null);

// Focus management for accessibility
onMounted(() => {
  spotlightRef.value?.focus();
});

// Handle ESC key to skip
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('skip');
  }
}

const visibleContent = computed(() => props.active.content.slice(0, props.typedChars));
const typing = computed(() => props.typedChars < props.active.content.length);
const speakingPlayer = computed(
  () => props.players.find((p) => p.id === props.active.playerId) ?? null,
);
const roleLabel = computed(() => {
  const p = speakingPlayer.value;
  if (!p) return '';
  if (p.isHuman || props.godView || !p.alive || p.revealed) {
    return ROLE_NAMES_ZH[p.role];
  }
  return '';
});
const fallbackName = computed(() => {
  if (speakingPlayer.value?.isHuman) return '你';
  return props.personaNames[props.active.playerId] ?? props.active.playerId;
});
const fallbackInitial = computed(() => {
  if (speakingPlayer.value?.isHuman) return '你';
  return String(speakingPlayer.value?.seat ?? '?');
});
const phaseLabel = computed(() => PHASE_NAMES_ZH[props.phase as Phase] ?? props.phase);
const typeBadge = computed(() => (props.active.type === 'SHERIFF_RUN' ? '上警发言' : '白天发言'));
</script>

<template>
  <div
    ref="spotlightRef"
    class="spotlight"
    role="dialog"
    aria-modal="true"
    aria-labelledby="spotlight-title"
    tabindex="0"
    @click.self="$emit('skip')"
    @keydown="handleKeydown"
  >
    <span id="spotlight-title" class="sr-only">玩家发言</span>
    <div class="spotlight__stage">
      <aside class="spotlight__rail">
        <div class="spotlight__rail-title brass-plate">在场玩家</div>
        <div class="spotlight__rail-list">
          <MiniSeat
            v-for="p in players"
            :key="p.id"
            :player="p"
            :active="p.id === active.playerId"
            :persona-name="personaNames[p.id]"
            :is-lover="lovers ? lovers.includes(p.id) : false"
            :is-sheriff="sheriffId === p.id"
          />
        </div>
      </aside>

      <section class="spotlight__center">
        <div class="spotlight__phase">
          <span class="spotlight__phase-day">第 {{ day }} 天</span>
          <span class="spotlight__phase-sep">·</span>
          <span class="spotlight__phase-name">{{ phaseLabel }}</span>
        </div>
        <PersonaPortrait
          :persona="active.persona"
          :fallback-name="fallbackName"
          :fallback-initial="fallbackInitial"
        />
        <div v-if="roleLabel" class="spotlight__role wax-seal">{{ roleLabel }}</div>
        <div class="spotlight__type-badge">{{ typeBadge }}</div>
      </section>

      <section class="spotlight__caption card-paper gilt-corners">
        <div class="spotlight__caption-head brass-plate">实时发言</div>
        <div class="spotlight__caption-body">
          <p class="spotlight__caption-text">
            <span>{{ visibleContent }}</span><span v-if="typing" class="spotlight__caret">▎</span>
          </p>
          <template v-if="godView && active.internalThought">
            <hr class="gilt-rule spotlight__caption-rule">
            <div class="spotlight__thought-label">内心独白（上帝视角）</div>
            <p class="spotlight__thought-text">{{ active.internalThought }}</p>
          </template>
        </div>
        <div class="spotlight__caption-foot">
          <a-button size="small" type="primary" @click="$emit('skip')">
            跳过 →
          </a-button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.spotlight {
  position: fixed;
  inset: 0;
  z-index: 50;
  background:
    radial-gradient(circle at 50% 40%,
      rgba(20, 14, 4, 0.78) 0%,
      rgba(8, 6, 2, 0.92) 70%,
      rgba(0, 0, 0, 0.96) 100%);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: spotlightFadeIn 0.22s ease-out;
}

@keyframes spotlightFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.spotlight__stage {
  display: grid;
  grid-template-columns: 260px 1fr 380px;
  gap: 20px;
  width: 100%;
  max-width: 1280px;
  height: 100%;
  max-height: 760px;
  animation: spotlightRise 0.32s ease-out;
}

@keyframes spotlightRise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Left rail */
.spotlight__rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.spotlight__rail-title {
  flex-shrink: 0;
  text-align: center;
}

.spotlight__rail-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.spotlight__rail-list::-webkit-scrollbar {
  width: 4px;
}
.spotlight__rail-list::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.3);
  border-radius: 2px;
}

/* Center stage */
.spotlight__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.spotlight__phase {
  font-family: var(--wfk-font-display);
  font-size: 14px;
  letter-spacing: 0.2em;
  color: var(--wfk-gold-2);
  display: flex;
  align-items: center;
  gap: 10px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
}

.spotlight__phase-day {
  font-weight: 700;
}

.spotlight__phase-sep {
  opacity: 0.45;
}

.spotlight__phase-name {
  font-style: italic;
}

.spotlight__role {
  margin-top: 4px;
}

.spotlight__type-badge {
  font-family: var(--wfk-font-display);
  font-size: 12px;
  letter-spacing: 0.15em;
  color: rgba(232, 226, 200, 0.55);
  font-style: italic;
}

/* Right caption */
.spotlight__caption {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}

.spotlight__caption-head {
  flex-shrink: 0;
  text-align: center;
}

.spotlight__caption-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 22px;
}

.spotlight__caption-text {
  font-size: 16px;
  line-height: 1.85;
  color: #e8e2c8;
  margin: 0;
  letter-spacing: 0.02em;
}

.spotlight__caret {
  display: inline-block;
  margin-left: 2px;
  color: var(--wfk-gold-1);
  animation: spotlightBlink 0.8s steps(1) infinite;
}

@keyframes spotlightBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.spotlight__caption-rule {
  max-width: 200px;
  margin: 16px auto;
}

.spotlight__thought-label {
  font-family: var(--wfk-font-display);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--wfk-gold-1);
  text-align: center;
  margin-bottom: 8px;
  font-style: italic;
}

.spotlight__thought-text {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(232, 226, 200, 0.7);
  font-style: italic;
  margin: 0;
}

.spotlight__caption-foot {
  flex-shrink: 0;
  padding: 10px 16px 14px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid rgba(212, 175, 55, 0.18);
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
