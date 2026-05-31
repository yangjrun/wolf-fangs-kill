# CLAUDE.md

This file guides Claude Code when working in this repository.

## 项目概述

Wolf Fangs Kill 是一个 AI 驱动的狼人杀游戏：1 名人类玩家 + 8 个由 Claude API 驱动的 AI 玩家。核心设计是一个**纯函数式游戏引擎** + **无状态 AI 代理层** + **Vue 前端**，通过种子（seed）保证对局可复现。

界面、注释、提示词均为中文。游戏逻辑和代码标识符为英文。

## 技术栈

- **Monorepo**：pnpm workspace，5 个包（`@wfk/*`）
- **前端**：Vue 3 (Composition API) + TypeScript + Vite + Arco Design Vue + Pinia + vue-router
- **后端**：Bun + Hono（Claude API 轻量代理）
- **AI**：`@anthropic-ai/sdk`，模型默认 `claude-sonnet-4-6`，启用 prompt caching
- **测试**：Vitest
- **样式**：SCSS（复古铜质 / 油画风格）

## 包结构与依赖方向

```
shared  ←  engine  ←  ai-agents  ←  frontend
   ↑__________________________________|
                backend ← shared
```

- **`@wfk/shared`** — 所有类型与常量的单一来源。无运行时依赖。
  - `types/`：game、events、ai、api
  - `constants/`：roles、phases、tools、personas、boards、narration、difficulty
- **`@wfk/engine`** — 纯游戏引擎，**无 AI、无 UI、无 I/O**。
  - `state-machine.ts`：核心状态机（`createGame`、`progress`、`applyAction`、`getPendingActions`）
  - `resolver.ts`：夜晚结算、投票计票、情侣连环死亡
  - `validators.ts`：动作合法性校验（引擎是唯一真相来源）
  - `win-condition.ts`：可配置胜负判定
  - `rng.ts`：基于种子的确定性随机数（seedrandom）
- **`@wfk/ai-agents`** — AI 调度层。
  - `agent.ts`：单个 AI 玩家，持有静态系统提示词（可缓存）
  - `orchestrator.ts`：协调多 Agent，区分并行/串行阶段
  - `tool-router.ts`：按阶段+角色决定允许的工具与指令文本
  - `prompts/`：system、user-message、private-info、role-rules
  - `llm-client.ts`：调用后端代理
  - `flow-token.ts`：用于中断进行中的对局
- **`@wfk/backend`** — Claude API 代理（`/api/llm/messages`），处理鉴权、base URL、1M 上下文。
- **`@wfk/frontend`** — Vue 应用。
  - `composables/useGameLoop.ts`：驱动整个对局的主循环
  - `stores/`：game（对局状态）、settings（用户配置）
  - `views/`：Home、Play、Replay、Settings
  - `components/game/`：座位环、发言聚光灯、行动面板等

## 核心架构原则

### 1. 不可变状态（CRITICAL）
引擎中所有状态转换都返回**新对象**，绝不原地修改。使用展开运算符做不可变更新。`GameState` 在整个调用链中被当作只读数据传递。

### 2. 纯引擎，无副作用
`@wfk/engine` 不调用 API、不读写文件、不依赖时间以外的全局状态。游戏推进模式：
```typescript
const state = createGame({ seed, boardId, difficulty });
// progress() 推进到下一个需要外部输入的点
const { next, events, pending } = progress(state);
// 收集 pending 玩家的动作后应用
const { next, events, error } = applyAction(state, action);
```
`progress()` 自动快进所有不需要外部输入的阶段（如空的守卫/丘比特阶段）。`pending` 列表告诉调用方哪些玩家需要行动以及可用的动作类型。

### 3. AI 信息隔离（CRITICAL）
每个 `Agent` **没有持久消息历史**。每次 `decide()` 都从当前 `GameState` 重新构建 user message。这保证了：
- 信息隔离自动成立（不会泄漏其他 Agent 的私密信息）
- Prompt 缓存命中 system + tools（最大的静态前缀）
- 复盘确定性：相同状态 → 相同提示词

修改 prompt 相关代码时，**系统提示词必须保持静态**（无时间戳、无存活列表等动态内容），否则破坏缓存。动态内容只能放进 user message 的 XML 标签里（`<phase>`、`<alive>`、`<private_info>` 等）。

### 4. 确定性 RNG
所有随机性（角色分配、人格分配、平票决胜、发言顺序）都由 `config.seed` 派生。相同 seed + 相同板子 → 相同对局。人格分配用 `${seed}|personas` 派生，与角色分配解耦。

### 5. 引擎是真相来源
AI 只是决策者。即使 prompt 约束了 AI，`validators.ts` 仍会校验每个动作的合法性并拒绝非法动作（投死人、刀队友、投自己等）。

## 关键机制

- **板子（Board）**：`BoardConfig` 自包含角色组成、阶段顺序、胜负条件、特性开关（警长、情侣跨阵营）。新板子在 `boards.ts` 的 `BOARDS` 注册表中注册，引擎无需全局查表。
- **阶段（Phase）**：状态机按 `board.phaseOrder` 推进。`advancePhase()` 处理引擎控制的转换，`getPendingActions()` 决定何时需要外部输入。
- **难度**：`easy`/`normal`/`hard` 影响 LLM 温度、系统提示词后缀、是否模糊狼队友信息（hard 模式只给座位号之和提示）。
- **警长系统**：仅 `features.sheriff` 板子启用，含竞选、投票（1.5 票权重）、警徽传递/撕毁。
- **特殊角色**：女巫（救/毒，同守同救机制）、猎人（死亡开枪，被毒则不能开枪）、守卫（不能连守）、白痴（首次被投出局翻牌不死但失去投票权）、骑士（决斗翻牌）、丘比特（首夜连情侣，跨阵营可独立获胜）。

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm dev:all          # 并行启动前后端
pnpm dev              # 仅前端 (Vite, http://localhost:5173)
pnpm dev:backend      # 仅后端 (Bun + Hono, http://localhost:8787)
pnpm cli              # 命令行跑一局（dummy bot，不调 API）
pnpm cli --auto       # 命令行跑一局（真实 Claude AI，需后端 + API key）
pnpm cli --seed=foo --auto  # 指定种子
pnpm test             # 运行所有包的测试
pnpm typecheck        # 全部包类型检查
pnpm build            # 构建所有包
```

单个包测试：`pnpm --filter @wfk/engine test`

## 环境配置

后端读取 `packages/backend/.env`：
```env
ANTHROPIC_API_KEY=sk-ant-xxx
PORT=8787
ANTHROPIC_BASE_URL=    # 可选，用于第三方中转
```

前端可在 Settings 页面覆盖 API key / base URL（通过请求头 `X-Anthropic-Api-Key` / `X-Anthropic-Base-Url` 传给后端）。

**1M 上下文约定**：模型名后缀 `[1m]` 开启 1M 上下文。官方 API 会去掉后缀并加 beta 头；第三方中转保留后缀且不加 beta 头（见 `backend/src/routes/llm.ts`）。

## 编码规范

遵循 `~/.claude/rules/` 下的全局规范，要点：

- **不可变性**：永远创建新对象，绝不原地修改。这是本项目的核心约束。
- **TypeScript**：导出函数加显式类型；避免 `any`，用 `unknown` + 收窄；对象用 `interface`，联合/工具类型用 `type`；优先字符串字面量联合而非 `enum`。
- **Vue 组件**：props 用具名 `interface`/`type`；不用 `React.FC`（这是 Vue 项目）。
- **文件组织**：小文件优先（200-400 行，最多 800），按功能/领域而非类型组织。
- **错误处理**：在系统边界校验输入；不静默吞掉错误；UI 层给友好错误信息。
- **无 `console.log`**：生产代码不留 `console.log`（后端启动日志、LLM usage 日志除外）。

## 修改时的注意事项

- 改 `@wfk/shared` 的类型/常量会影响所有下游包，改完跑 `pnpm typecheck`。
- 改引擎逻辑后跑 `pnpm --filter @wfk/engine test`；引擎有状态机测试覆盖。
- 改 prompt 构建逻辑后跑 `pnpm --filter @wfk/ai-agents test`；有信息隔离与缓存稳定性测试。
- 新增工具（tool）必须同步更新：`shared/constants/tools.ts`（定义 + `ToolName`）、`shared/types/game.ts`（`PlayerAction`）、`tool-router.ts`（阶段映射）、`state-machine.ts`（`applyAction`）、`validators.ts`（校验）。
- 工具数组 `ALL_TOOLS` 的顺序影响 prompt 缓存，**不要随意改动顺序**。
- 新增板子在 `boards.ts` 定义并注册到 `BOARDS`。

## Git 约定

- 提交信息格式：`<type>: <description>`（type: feat/fix/refactor/docs/test/chore/perf/ci）
- 全局已禁用 attribution（见 `~/.claude/settings.json`）
- 仅在用户明确要求时提交；优先新建提交而非 amend；推送新分支用 `-u`。
