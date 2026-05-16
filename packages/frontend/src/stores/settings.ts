import { defineStore } from "pinia";
import { ref, watch } from "vue";

const STORAGE_KEY = "wfk-settings-v1";

interface PersistedSettings {
  apiKey: string;
  model: string;
  backendUrl: string;
  anthropicBaseUrl: string;
}

const DEFAULTS: PersistedSettings = {
  apiKey: "",
  model: "claude-opus-4-7[1m]",
  backendUrl: "", // same-origin; LLMClient appends /api/llm/messages
  anthropicBaseUrl: "",
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

  watch([apiKey, model, backendUrl, anthropicBaseUrl], () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          apiKey: apiKey.value,
          model: model.value,
          backendUrl: backendUrl.value,
          anthropicBaseUrl: anthropicBaseUrl.value,
        }),
      );
    } catch {
      // ignore quota errors
    }
  });

  return { apiKey, model, backendUrl, anthropicBaseUrl };
});
