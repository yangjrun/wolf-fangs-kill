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
  cupidTarget2.value = '';
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

const guardOptions = computed(() => {
  if (!state.value || !human.value) return [];
  const last = state.value.guardState.lastGuarded;
  return state.value.players
    .filter((p) => p.alive && p.id !== last)
    .map((p) => ({ label: p.id === human.value?.id ? `${p.id}（守自己）` : p.id, value: p.id }));
});

function submitGuardProtect(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'GUARD_PROTECT',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value.trim() || '玩家手动选择守护目标。',
  });
}

function submitKnightDuel(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'KNIGHT_DUEL',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value.trim() || '骑士手动决斗。',
  });
}

const cupidTarget2 = ref<string>('');

function submitCupidLink(): void {
  if (!human.value || !targetId.value || !cupidTarget2.value) return;
  submit({
    type: 'CUPID_LINK',
    playerId: human.value.id,
    target1Id: targetId.value,
    target2Id: cupidTarget2.value,
    reasoning: reasoning.value.trim() || '丘比特手动连情侣。',
  });
}

const sheriffRunners = computed(() => {
  if (!state.value?.sheriffElection) return [];
  return state.value.sheriffElection.runners
    .filter((id) => state.value!.players.find((p) => p.id === id)?.alive)
    .map((id) => ({ label: id, value: id }));
});

const sheriffVoteOptions = computed(() => [
  ...sheriffRunners.value,
  { label: '弃票', value: 'abstain' },
]);

function submitRunForSheriff(): void {
  if (!human.value || !speech.value.trim()) return;
  submit({
    type: 'RUN_FOR_SHERIFF',
    playerId: human.value.id,
    content: speech.value.trim(),
    internalThought: reasoning.value.trim() || '玩家手动上警。',
  });
}

function submitSkipSheriff(): void {
  if (!human.value) return;
  submit({
    type: 'SKIP_SHERIFF',
    playerId: human.value.id,
    reasoning: reasoning.value.trim() || '玩家放弃上警。',
  });
}

function submitSheriffVote(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'SHERIFF_VOTE',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value.trim() || '玩家警长投票。',
  });
}

function submitTransferBadge(): void {
  if (!human.value || !targetId.value) return;
  submit({
    type: 'TRANSFER_BADGE',
    playerId: human.value.id,
    targetId: targetId.value,
    reasoning: reasoning.value.trim() || '玩家警徽传递。',
  });
}

function submitDestroyBadge(): void {
  if (!human.value) return;
  submit({
    type: 'DESTROY_BADGE',
    playerId: human.value.id,
    reasoning: reasoning.value.trim() || '玩家撕毁警徽。',
  });
}

const cupidOptions = computed(() => {
  if (!state.value) return [];
  return state.value.players
    .filter((p) => p.alive)
    .map((p) => ({ label: p.id, value: p.id }));
});
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
        <a-space wrap>
          <a-button type="primary" :disabled="!speech.trim()" @click="submitSpeech">
            提交发言
          </a-button>
          <template v-if="allowed.includes('KNIGHT_DUEL')">
            <a-select v-model="targetId" :options="targetOptions" placeholder="选择决斗目标" style="min-width: 160px" />
            <a-button status="danger" :disabled="!targetId" @click="submitKnightDuel">
              发动决斗
            </a-button>
          </template>
        </a-space>
        <a-alert v-if="allowed.includes('KNIGHT_DUEL')" type="warning" :show-icon="true">
          骑士技能：决斗会替代发言。是狼则对方死、你免疫；不是狼则你自爆。每局仅一次。
        </a-alert>
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

      <template v-else-if="allowed.includes('GUARD_PROTECT')">
        <a-alert v-if="state?.guardState.lastGuarded" type="warning" :show-icon="true">
          上一晚守过：{{ state.guardState.lastGuarded }}（不能再守同一人）
        </a-alert>
        <a-select v-model="targetId" :options="guardOptions" placeholder="选择今晚守护的目标" />
        <a-button type="primary" :disabled="!targetId" @click="submitGuardProtect">
          确认守护
        </a-button>
      </template>

      <template v-else-if="allowed.includes('CUPID_LINK')">
        <a-alert type="info" :show-icon="true">
          首夜专属：选择两名玩家结为情侣。一方死另一方殉情；跨阵营情侣只剩两人活时共同获胜。
        </a-alert>
        <a-select v-model="targetId" :options="cupidOptions" placeholder="第一位情侣" />
        <a-select v-model="cupidTarget2" :options="cupidOptions" placeholder="第二位情侣（不能相同）" />
        <a-button type="primary" :disabled="!targetId || !cupidTarget2 || targetId === cupidTarget2" @click="submitCupidLink">
          确认配对
        </a-button>
      </template>

      <template v-else-if="allowed.includes('RUN_FOR_SHERIFF')">
        <a-alert type="info" :show-icon="true">
          上警阶段：参选需附上竞选发言。警长拥有 1.5 票权重。
        </a-alert>
        <a-textarea v-model="speech" placeholder="竞选发言（公开）" :auto-size="{ minRows: 3, maxRows: 6 }" />
        <a-space wrap>
          <a-button type="primary" :disabled="!speech.trim()" @click="submitRunForSheriff">
            上警
          </a-button>
          <a-button @click="submitSkipSheriff">不上警</a-button>
        </a-space>
      </template>

      <template v-else-if="allowed.includes('SHERIFF_VOTE')">
        <a-alert type="info" :show-icon="true">
          为一位上警玩家投票（或弃票）。
        </a-alert>
        <a-select v-model="targetId" :options="sheriffVoteOptions" placeholder="选择支持的候选人" />
        <a-button type="primary" :disabled="!targetId" @click="submitSheriffVote">
          提交警长投票
        </a-button>
      </template>

      <template v-else-if="allowed.includes('TRANSFER_BADGE')">
        <a-alert type="warning" :show-icon="true">
          你作为警长已出局，请选择：将警徽传给一位存活玩家，或撕毁。
        </a-alert>
        <a-select v-model="targetId" :options="targetOptions" placeholder="选择接任警长的玩家" />
        <a-space>
          <a-button type="primary" :disabled="!targetId" @click="submitTransferBadge">
            传递警徽
          </a-button>
          <a-button status="danger" @click="submitDestroyBadge">撕毁警徽</a-button>
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
  padding: 14px;
  height: 100%;
}

.action-panel__title {
  font-family: var(--wfk-font-display);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: var(--wfk-gold-2);
  padding: 6px 12px;
  background: radial-gradient(ellipse at center, rgba(212, 175, 55, 0.18), transparent 70%);
  border-top: 1px solid rgba(212, 175, 55, 0.35);
  border-bottom: 1px solid rgba(212, 175, 55, 0.35);
  text-align: center;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
}

.action-panel__instruction {
  font-size: 13px;
  color: #e8e2c8;
  line-height: 1.55;
  padding: 10px 12px;
  background:
    linear-gradient(160deg,
      rgba(42, 37, 21, 0.85),
      rgba(26, 22, 9, 0.85));
  border: 1px solid rgba(212, 175, 55, 0.28);
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(212, 175, 55, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
  font-style: italic;
  position: relative;
}

.action-panel__instruction::before {
  content: '“';
  position: absolute;
  top: -4px;
  left: 4px;
  font-family: var(--wfk-font-display);
  font-size: 28px;
  color: rgba(212, 175, 55, 0.45);
  line-height: 1;
}

.action-panel__empty {
  color: rgba(232, 226, 200, 0.45);
  text-align: center;
  padding: 28px 12px;
  font-family: var(--wfk-font-display);
  font-style: italic;
  letter-spacing: 0.05em;
  font-size: 13px;
}
</style>
