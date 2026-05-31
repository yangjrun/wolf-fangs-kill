import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { Difficulty } from "@wfk/shared";

const STORAGE_KEY = "wfk-settings-v1";

interface PersistedSettings {
  apiKey: string;
  model: string;
  backendUrl: string;
  anthropicBaseUrl: string;
  narratorEnabled: boolean;
  narratorRate: number;
  narratorVoiceName: string;
  nightVisionMode: boolean;
  speechSpotlightEnabled: boolean;
  difficulty: Difficulty;
}

const DEFAULTS: PersistedSettings = {
  apiKey: "",
  model: "claude-opus-4-7[1m]",
  backendUrl: "", // same-origin; LLMClient appends /api/llm/messages
  anthropicBaseUrl: "",
  narratorEnabled: false,
  narratorRate: 1.0,
  narratorVoiceName: "",
  nightVisionMode: true,
  speechSpotlightEnabled: true,
  difficulty: "normal",
};

function load(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export const useSettingsStore = defineStore("settings", () => {
  const loaded = load();
  const apiKey = ref(loaded.apiKey);
  const model = ref(loaded.model);
  const backendUrl = ref(loaded.backendUrl);
  const anthropicBaseUrl = ref(loaded.anthropicBaseUrl);
  const narratorEnabled = ref(loaded.narratorEnabled);
  const narratorRate = ref(loaded.narratorRate);
  const narratorVoiceName = ref(loaded.narratorVoiceName);
  const nightVisionMode = ref(loaded.nightVisionMode);
  const speechSpotlightEnabled = ref(loaded.speechSpotlightEnabled);
  const difficulty = ref<Difficulty>(loaded.difficulty);

  watch(
    [
      apiKey,
      model,
      backendUrl,
      anthropicBaseUrl,
      narratorEnabled,
      narratorRate,
      narratorVoiceName,
      nightVisionMode,
      speechSpotlightEnabled,
      difficulty,
    ],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            apiKey: apiKey.value,
            model: model.value,
            backendUrl: backendUrl.value,
            anthropicBaseUrl: anthropicBaseUrl.value,
            narratorEnabled: narratorEnabled.value,
            narratorRate: narratorRate.value,
            narratorVoiceName: narratorVoiceName.value,
            nightVisionMode: nightVisionMode.value,
            speechSpotlightEnabled: speechSpotlightEnabled.value,
            difficulty: difficulty.value,
          }),
        );
      } catch {
        // ignore quota errors
      }
    },
  );

  return {
    apiKey,
    model,
    backendUrl,
    anthropicBaseUrl,
    narratorEnabled,
    narratorRate,
    narratorVoiceName,
    nightVisionMode,
    speechSpotlightEnabled,
    difficulty,
  };
});
