<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { narrator } from '@/services/narrator';
import { Message } from '@arco-design/web-vue';

const router = useRouter();
const settings = useSettingsStore();

const localKey = ref(settings.apiKey);
const localModel = ref(settings.model);
const localBackend = ref(settings.backendUrl);
const localAnthropicBaseUrl = ref(settings.anthropicBaseUrl);
const localNarratorEnabled = ref(settings.narratorEnabled);
const localNarratorRate = ref(settings.narratorRate);
const localNarratorVoiceName = ref(settings.narratorVoiceName);
const localNightVisionMode = ref(settings.nightVisionMode);
const localSpeechSpotlightEnabled = ref(settings.speechSpotlightEnabled);

const voices = ref<SpeechSynthesisVoice[]>([]);

function refreshVoices() {
  try {
    voices.value = narrator.availableVoices();
  } catch (err) {
    console.error('[SettingsView] Failed to load voices:', err);
    voices.value = [];
  }
}

onMounted(() => {
  refreshVoices();
  // Voices often arrive asynchronously
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
});

const voiceOptions = computed(() => [
  { label: '自动（优先中文）', value: '' },
  ...voices.value.map((v) => ({
    label: `${v.name} — ${v.lang}${v.default ? '（默认）' : ''}`,
    value: v.name,
  })),
]);

const modelOptions = [
  { label: 'Claude Sonnet 4.6 (推荐)', value: 'claude-sonnet-4-6' },
  {
    label: 'Claude Sonnet 4.6 · 1M 上下文 (需填下方 Base URL)',
    value: 'claude-sonnet-4-6[1m]',
  },
  { label: 'Claude Opus 4.7 (最强，更贵)', value: 'claude-opus-4-7' },
  {
    label: 'Claude Opus 4.7 · 1M 上下文 (需填下方 Base URL)',
    value: 'claude-opus-4-7[1m]',
  },
  { label: 'Claude Haiku 4.5 (最便宜)', value: 'claude-haiku-4-5-20251001' },
  { label: 'GPT-5.5 (需填下方 Base URL)', value: 'gpt-5.5' },
];

function save() {
  settings.apiKey = localKey.value.trim();
  settings.model = localModel.value;
  settings.backendUrl = localBackend.value.trim();
  settings.anthropicBaseUrl = localAnthropicBaseUrl.value.trim();
  settings.narratorEnabled = localNarratorEnabled.value;
  settings.narratorRate = localNarratorRate.value;
  settings.narratorVoiceName = localNarratorVoiceName.value;
  settings.nightVisionMode = localNightVisionMode.value;
  settings.speechSpotlightEnabled = localSpeechSpotlightEnabled.value;
  Message.success('设置已保存到本地');
}

function testNarration() {
  narrator.configure({
    enabled: true,
    rate: localNarratorRate.value,
    voiceName: localNarratorVoiceName.value || undefined,
  });
  narrator.stop();
  narrator.speak('天黑了，请所有玩家闭眼。');
}

function back() {
  router.push('/');
}
</script>

<template>
  <div class="settings">
    <div class="settings__panel card-paper gilt-corners">
      <h2 class="settings__title">设置</h2>
      <hr class="gilt-rule">
      <a-form :model="{ key: localKey }" layout="vertical">
        <a-form-item label="Anthropic API Key">
          <a-input-password
            v-model="localKey"
            placeholder="sk-ant-..."
            allow-clear
          />
          <template #help>
            可留空以使用后端环境变量。填写后会存储在浏览器 localStorage，请确保只在自己的设备上使用。
          </template>
        </a-form-item>

        <a-form-item label="模型">
          <a-select v-model="localModel" :options="modelOptions" />
        </a-form-item>

        <a-form-item label="后端代理 URL">
          <a-input
            v-model="localBackend"
            placeholder="留空（同源）或 http://localhost:8787"
          />
          <template #help>
            留空时使用同源 <code>/api/llm/messages</code>；自部署时填 backend 根 URL。
          </template>
        </a-form-item>

        <a-form-item label="Anthropic Base URL">
          <a-input
            v-model="localAnthropicBaseUrl"
            placeholder="留空使用官方 API，或填兼容服务地址"
          />
          <template #help>
            可选。会随 API Key 一起发送给后端代理，用于配置 SDK 的 <code>baseURL</code>。
          </template>
        </a-form-item>

        <hr class="gilt-rule">

        <a-form-item label="语音旁白">
          <a-switch v-model="localNarratorEnabled" />
          <template #help>
            启用后，每个阶段切换时会用浏览器内置 TTS 播报（如"天黑请闭眼"）。
          </template>
        </a-form-item>

        <a-form-item label="旁白语速" v-if="localNarratorEnabled">
          <a-slider
            v-model="localNarratorRate"
            :min="0.5"
            :max="2"
            :step="0.1"
            show-input
          />
        </a-form-item>

        <a-form-item label="旁白声音" v-if="localNarratorEnabled">
          <a-select
            v-model="localNarratorVoiceName"
            :options="voiceOptions"
            placeholder="自动（优先中文）"
          />
          <template #help>
            <a-button size="mini" @click="testNarration">试听</a-button>
            可用声音取决于浏览器/系统（Windows 中文：Huihui / Kangkang）。
          </template>
        </a-form-item>

        <a-form-item label="天黑请闭眼模式">
          <a-switch v-model="localNightVisionMode" />
          <template #help>
            夜间阶段隐藏其他玩家的头像/人格信息，营造"闭眼"沉浸感。上帝视角下不生效。
          </template>
        </a-form-item>

        <a-form-item label="发言聚光模式">
          <a-switch v-model="localSpeechSpotlightEnabled" />
          <template #help>
            AI 模式下，当玩家进行长发言（≥20 字）时切换到舞台版式：左侧迷你座位、中央立绘、右侧实时字幕。可点击"跳过"立即推进。仅 AI 模式生效。
          </template>
        </a-form-item>

        <a-space>
          <a-button type="primary" @click="save">保存</a-button>
          <a-button @click="back">返回</a-button>
        </a-space>
      </a-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.settings__panel {
  width: 100%;
  max-width: 580px;
  padding: 36px 42px;
  /* warmer parchment tone */
  background:
    linear-gradient(160deg, #2a2515 0%, #1a1609 100%) !important;
}

.settings__title {
  margin: 0;
  font-family: var(--wfk-font-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-align: center;
  color: var(--wfk-gold-2);
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.55),
    0 0 16px rgba(212, 175, 55, 0.35);
}

.settings__panel .gilt-rule {
  max-width: 240px;
  margin: 10px auto 22px;
}

code {
  background: linear-gradient(180deg, #11141c, #0a0c12);
  border: 1px solid rgba(212, 175, 55, 0.28);
  color: var(--wfk-gold-2);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: 'SF Mono', 'Consolas', 'Courier New', monospace;
  box-shadow:
    inset 0 1px 1px rgba(0, 0, 0, 0.45),
    inset 0 -1px 0 rgba(212, 175, 55, 0.1);
}
</style>
