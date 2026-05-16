<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { Message } from '@arco-design/web-vue';

const router = useRouter();
const settings = useSettingsStore();

const localKey = ref(settings.apiKey);
const localModel = ref(settings.model);
const localBackend = ref(settings.backendUrl);
const localAnthropicBaseUrl = ref(settings.anthropicBaseUrl);

const modelOptions = [
  { label: 'Claude Sonnet 4.6 (推荐)', value: 'claude-sonnet-4-6' },
  { label: 'Claude Opus 4.7 (最强，更贵)', value: 'claude-opus-4-7' },
  { label: 'Claude Haiku 4.5 (最便宜)', value: 'claude-haiku-4-5-20251001' },
];

function save() {
  settings.apiKey = localKey.value.trim();
  settings.model = localModel.value;
  settings.backendUrl = localBackend.value.trim();
  settings.anthropicBaseUrl = localAnthropicBaseUrl.value.trim();
  Message.success('设置已保存到本地');
}

function back() {
  router.push('/');
}
</script>

<template>
  <div class="settings">
    <div class="settings__panel">
      <h2>设置</h2>
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
  max-width: 560px;
  background: var(--color-bg-2);
  border-radius: 12px;
  padding: 32px;
}

h2 {
  margin: 0 0 24px;
}

code {
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
