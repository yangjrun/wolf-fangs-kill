<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
const router = useRouter();
const settings = useSettingsStore();

function startGame() {
  router.push('/play');
}
</script>

<template>
  <div class="home">
    <div class="home__hero">
      <h1 class="home__title">🐺 狼人杀</h1>
      <p class="home__subtitle">Wolf Fangs Kill · AI 驱动的 9 人板</p>
      <p class="home__desc">
        9 个玩家（你 + 8 个 Claude AI），3 狼 + 预言家 + 女巫 + 猎人 + 3 平民。
        每个 AI 有独立的性格设定，会发言、推理、撒谎、找狼。
      </p>

      <div class="home__actions">
        <a-button type="primary" size="large" @click="startGame">
          开始观战
        </a-button>
        <a-button size="large" @click="router.push('/settings')">设置</a-button>
      </div>

      <div class="home__hint">
        <a-alert type="info" :show-icon="true">
Claude AI 模式会优先使用浏览器设置里的 API Key；留空时使用后端环境变量 ANTHROPIC_API_KEY。
        </a-alert>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.home__hero {
  max-width: 640px;
  text-align: center;
}

.home__title {
  font-size: 64px;
  margin: 0 0 12px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.home__subtitle {
  font-size: 16px;
  color: var(--color-text-3);
  margin: 0 0 32px;
}

.home__desc {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-2);
  margin: 0 0 32px;
}

.home__actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.home__hint {
  text-align: left;
  margin-top: 24px;
}
</style>
