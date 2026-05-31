import { ref, onUnmounted } from 'vue';
import type { Persona } from '@wfk/shared';

export interface ActiveSpeech {
  playerId: string;
  persona: Persona | null;
  content: string;
  internalThought: string;
  day: number;
  type: 'SPEAK' | 'SHERIFF_RUN';
}

const CHAR_DELAY_MS = 50;
const HOLD_AFTER_MS = 1500;

export function useSpeechSpotlight() {
  // active stays populated between consecutive speeches so the overlay doesn't
  // flash off — caller dismisses explicitly when the speech phase ends.
  const active = ref<ActiveSpeech | null>(null);
  const typedChars = ref(0);

  let typeTimer: number | null = null;
  let holdTimer: number | null = null;
  let resolveFn: (() => void) | null = null;

  function clearTimers(): void {
    if (typeTimer !== null) {
      clearInterval(typeTimer);
      typeTimer = null;
    }
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  // Resolves the current speech promise without hiding the overlay.
  // The previous speech stays on screen until either show() replaces it
  // with the next speaker or dismiss() tears the overlay down.
  function resolveCurrent(): void {
    clearTimers();
    const r = resolveFn;
    resolveFn = null;
    if (r) r();
  }

  function show(speech: ActiveSpeech): Promise<void> {
    resolveCurrent();

    active.value = speech;
    typedChars.value = 0;

    return new Promise<void>((resolve) => {
      resolveFn = resolve;
      const total = speech.content.length;

      typeTimer = setInterval(() => {
        if (typedChars.value >= total) {
          if (typeTimer !== null) {
            clearInterval(typeTimer);
            typeTimer = null;
          }
          holdTimer = setTimeout(() => {
            resolveCurrent();
          }, HOLD_AFTER_MS) as unknown as number;
          return;
        }
        typedChars.value += 1;
      }, CHAR_DELAY_MS) as unknown as number;
    });
  }

  // Skip = end the current speech now (engine advances to the next speaker
  // or to the next phase). Overlay remains visible.
  function skip(): void {
    if (!resolveFn) return;
    resolveCurrent();
  }

  // Tear down: hide the overlay and reset. Called when the speech phase ends.
  function dismiss(): void {
    resolveCurrent();
    active.value = null;
    typedChars.value = 0;
  }

  // Clean up timers when component unmounts to prevent memory leaks
  // Only register cleanup if we're in a component context
  if (typeof window !== 'undefined') {
    try {
      onUnmounted(() => {
        clearTimers();
        resolveFn = null;
      });
    } catch {
      // Not in a component context (e.g., tests), skip cleanup registration
    }
  }

  return {
    active,
    typedChars,
    show,
    skip,
    dismiss,
  };
}

export type SpeechSpotlight = ReturnType<typeof useSpeechSpotlight>;
