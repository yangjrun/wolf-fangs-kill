<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { DIFFICULTY_NAMES_ZH } from '@wfk/shared';
import type { Difficulty } from '@wfk/shared';

const router = useRouter();
const settings = useSettingsStore();

const selectedDifficulty = ref<Difficulty>(settings.difficulty);

const difficultyOptions = [
  {
    value: 'easy' as Difficulty,
    label: DIFFICULTY_NAMES_ZH.easy,
    desc: '新手友好，AI 思路直白，发言较长'
  },
  {
    value: 'normal' as Difficulty,
    label: DIFFICULTY_NAMES_ZH.normal,
    desc: '标准难度，AI 有基础战术意识'
  },
  {
    value: 'hard' as Difficulty,
    label: DIFFICULTY_NAMES_ZH.hard,
    desc: '高手对决，AI 擅长深度博弈和信息管理'
  },
  {
    value: 'expert' as Difficulty,
    label: DIFFICULTY_NAMES_ZH.expert,
    desc: '职业选手级别，AI 精通心理博弈和高级战术'
  },
];

function startGame() {
  settings.difficulty = selectedDifficulty.value;
  router.push('/play');
}
</script>

<template>
  <div class="home">
    <div class="home__sky">
      <div class="home__moon"></div>
      <div class="home__stars"></div>
    </div>

    <div class="home__hero card-paper gilt-corners">
      <div class="home__emblem">🐺</div>
      <h1 class="home__title">狼人杀</h1>
      <hr class="gilt-rule">
      <p class="home__subtitle">Wolf Fangs Kill · AI 驱动的 9 人板</p>
      <p class="home__desc">
        9 个玩家（你 + 8 个 Claude AI），3 狼 + 预言家 + 女巫 + 猎人 + 3 平民。
        每个 AI 有独立的性格设定，会发言、推理、撒谎、找狼。
      </p>

      <div class="home__difficulty">
        <div class="home__difficulty-label">AI 难度</div>
        <a-radio-group v-model="selectedDifficulty" type="button" size="large">
          <a-radio
            v-for="option in difficultyOptions"
            :key="option.value"
            :value="option.value"
          >
            <a-tooltip :content="option.desc" position="top">
              {{ option.label }}
            </a-tooltip>
          </a-radio>
        </a-radio-group>
      </div>

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
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

/* Night sky backdrop */
.home__sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.home__moon {
  position: absolute;
  top: 12%;
  right: 14%;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%,
    #f4f1e2 0%,
    #cfd7e8 35%,
    rgba(154, 179, 255, 0.55) 70%,
    transparent 100%);
  box-shadow:
    0 0 60px rgba(207, 215, 232, 0.45),
    0 0 120px rgba(154, 179, 255, 0.35);
  opacity: 0.85;
}

.home__stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 12% 22%, rgba(255, 255, 255, 0.9), transparent),
    radial-gradient(1px 1px at 24% 65%, rgba(255, 255, 255, 0.65), transparent),
    radial-gradient(1px 1px at 35% 18%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 48% 78%, rgba(255, 255, 255, 0.55), transparent),
    radial-gradient(1px 1px at 62% 30%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(2px 2px at 18% 48%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 78% 56%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 88% 22%, rgba(255, 255, 255, 0.55), transparent),
    radial-gradient(1px 1px at 6% 78%, rgba(255, 255, 255, 0.65), transparent),
    radial-gradient(2px 2px at 55% 14%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1px 1px at 70% 88%, rgba(255, 255, 255, 0.6), transparent);
  opacity: 0.55;
}

.home__hero {
  position: relative;
  z-index: 1;
  max-width: 640px;
  width: 100%;
  text-align: center;
  padding: 36px 44px 32px;
}

.home__emblem {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 6px;
  filter: drop-shadow(0 0 18px rgba(212, 175, 55, 0.5));
}

.home__title {
  font-family: var(--wfk-font-display);
  font-size: 64px;
  font-weight: 700;
  letter-spacing: 0.25em;
  margin: 0 0 6px;
  color: var(--wfk-gold-2);
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.55),
    0 2px 0 rgba(0, 0, 0, 0.4),
    0 0 18px rgba(212, 175, 55, 0.45),
    0 0 30px rgba(212, 175, 55, 0.25);
  /* engraved feel */
  background: linear-gradient(180deg, #fde6a8 0%, var(--wfk-gold-1) 55%, var(--wfk-gold-deep) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.home__hero .gilt-rule {
  max-width: 280px;
  margin: 12px auto 18px;
}

.home__subtitle {
  font-family: var(--wfk-font-display);
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--wfk-gold-1);
  margin: 0 0 24px;
  opacity: 0.85;
}

.home__desc {
  font-size: 14px;
  line-height: 1.8;
  color: #e8e2c8;
  margin: 0 auto 24px;
  max-width: 480px;
  padding: 16px 20px;
  border-top: 1px solid rgba(212, 175, 55, 0.22);
  border-bottom: 1px solid rgba(212, 175, 55, 0.22);
  font-style: italic;
}

.home__difficulty {
  margin-bottom: 24px;
}

.home__difficulty-label {
  font-family: var(--wfk-font-display);
  font-size: 13px;
  letter-spacing: 0.15em;
  color: var(--wfk-gold-1);
  margin-bottom: 12px;
  text-align: center;
}

.home__actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.home__hint {
  text-align: left;
  margin-top: 18px;
}
</style>
