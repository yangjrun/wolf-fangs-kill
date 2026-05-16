<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useGameStore } from '@/stores/game';
import { ROLE_NAMES_ZH } from '@wfk/shared';
import type { Player, PlayerAction } from '@wfk/shared';

const gameStore = useGameStore();

const speech = ref('');
const targetId = ref<string>('');
const reasoning = ref('');

const pending = computed(() => gameStore.humanPending);
const state = computed(() => gameStore.state);
const human = computed(() => gameStore.humanPlayer);
const allowed = computed(() => pending.value?.allowedActionTypes ?? []);

const aliveTargets = computed<Player[]>(() => {
  if (!state.value || !human.value) return [];
  return state.value.players.filter((p) => p.alive && p.id !== human.value?.id);
});

const targetOptions = computed(() => [
  ...aliveTargets.value.map((p) => ({
    label: `${p.id}${gameStore.isEnded ? ` (${ROLE_NAMES_ZH[p.role]})` : ''}`,
    value: p.id,
  })),
]);

const voteOptions = computed(() => [
  ...targetOptions.value,
  { label: '弃票', value: 'abstain' },
]);

const wolfTargets = computed(() => {
  if (!state.value || !human.value) return [];
  return state.value.players
    .filter((p) => p.alive && p.role !== 'werewolf')
    .map((p) => ({ label: p.id, value: p.id }));
});

const title = computed(() => {
  if (!pending.value || !human.value) return '等待行动';
  return `${human.value.id}（${ROLE_NAMES_ZH[human.value.role]}）行动`;
});

watch(pending, () => {
  speech.value = '';
  targetId.value = '';
  reasoning.value = '';
});

function submit(action: PlayerAction): void {
  gameStore.submitHumanAction(action);
  Message.success('行动已提交');
}

function submitSpeech(): void {
  if (!human.value || !speech.value.trim()) return;
  submit({
    type: 'SPEAK',
    playerId: human.value.id,
    content: speech.value.trim(),
    internalThought: reasoning.value.trim() || '玩家手动发言。',
  });
}

function submitVote(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'VOTE',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value.trim() || '玩家手动投票。',
  });
}

function submitWolfKill(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'WEREWOLF_KILL',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value.trim() || '玩家手动选择狼刀目标。',
  });
}

function submitSeerCheck(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'SEER_CHECK',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value.trim() || '玩家手动查验。',
  });
}

function submitWitchHeal(): void {
  if (!human.value) return;
  submit({ type: 'WITCH_HEAL', playerId: human.value.id, reasoning: reasoning.value || '玩家使用解药。' });
}

function submitWitchPoison(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'WITCH_POISON',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value || '玩家使用毒药。',
  });
}

function submitWitchSkip(): void {
  if (!human.value) return;
  submit({ type: 'WITCH_SKIP', playerId: human.value.id, reasoning: reasoning.value || '玩家跳过女巫行动。' });
}

function submitHunterShoot(shoot: boolean): void {
  if (!human.value) return;
  submit({
    type: 'HUNTER_SHOOT',
    playerId: human.value.id,
    targetId: shoot ? targetId.value || null : null,
    reasoning: reasoning.value || (shoot ? '玩家开枪。' : '玩家不开枪。'),
  });
}
</script>

<template>
  <div class="action-panel">
    <template v-if="pending && human">
      <div class="action-panel__title">{{ title }}</div>
      <div class="action-panel__instruction">{{ pending.instruction }}</div>

      <a-textarea
        v-model="reasoning"
        placeholder="你的内心想法 / 行动理由（可选）"
        :auto-size="{ minRows: 2, maxRows: 4 }"
      />

      <template v-if="allowed.includes('SPEAK')">
        <a-textarea
          v-model="speech"
          placeholder="输入你的公开发言"
          :auto-size="{ minRows: 3, maxRows: 6 }"
        />
        <a-button type="primary" :disabled="!speech.trim()" @click="submitSpeech">
          提交发言
        </a-button>
      </template>

      <template v-else-if="allowed.includes('VOTE')">
        <a-select v-model="targetId" :options="voteOptions" placeholder="选择投票目标" />
        <a-button type="primary" :disabled="!targetId" @click="submitVote">
          提交投票
        </a-button>
      </template>

      <template v-else-if="allowed.includes('WEREWOLF_KILL')">
        <a-select v-model="targetId" :options="wolfTargets" placeholder="选择狼刀目标" />
        <a-button type="primary" :disabled="!targetId" @click="submitWolfKill">
          确认击杀
        </a-button>
      </template>

      <template v-else-if="allowed.includes('SEER_CHECK')">
        <a-select v-model="targetId" :options="targetOptions" placeholder="选择查验目标" />
        <a-button type="primary" :disabled="!targetId" @click="submitSeerCheck">
          查验
        </a-button>
      </template>

      <template v-else-if="allowed.some((a) => a.startsWith('WITCH_'))">
        <a-alert v-if="state?.currentNight.werewolfTarget" type="warning" :show-icon="true">
          今晚被狼刀：{{ state.currentNight.werewolfTarget }}
        </a-alert>
        <a-select v-model="targetId" :options="targetOptions" placeholder="毒药目标（使用毒药时必选）" />
        <a-space wrap>
          <a-button v-if="allowed.includes('WITCH_HEAL')" type="primary" @click="submitWitchHeal">
            使用解药
          </a-button>
          <a-button v-if="allowed.includes('WITCH_POISON')" status="danger" :disabled="!targetId" @click="submitWitchPoison">
            使用毒药
          </a-button>
          <a-button @click="submitWitchSkip">跳过</a-button>
        </a-space>
      </template>

      <template v-else-if="allowed.includes('HUNTER_SHOOT')">
        <a-select v-model="targetId" :options="targetOptions" placeholder="选择开枪目标（可不选）" />
        <a-space>
          <a-button type="primary" :disabled="!targetId" @click="submitHunterShoot(true)">
            开枪
          </a-button>
          <a-button @click="submitHunterShoot(false)">不开枪</a-button>
        </a-space>
      </template>
    </template>

    <div v-else class="action-panel__empty">
      {{ human ? '等待其他玩家行动...' : '未选择人类玩家，当前为观战模式。' }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.action-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  height: 100%;
}

.action-panel__title {
  font-weight: 700;
  color: #ffd93d;
}

.action-panel__instruction {
  font-size: 13px;
  color: var(--color-text-2);
  line-height: 1.5;
  padding: 8px;
  background: var(--color-fill-2);
  border-radius: 6px;
}

.action-panel__empty {
  color: var(--color-text-3);
  text-align: center;
  padding: 24px 8px;
}
</style>
