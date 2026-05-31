# Wolf Fangs Kill 🐺

AI 狼人杀 —— 1 人 + 8 AI 的 9 人板狼人杀游戏，由 Claude API 驱动。

## 特性

- **多种板子配置**：9 人标准局、守卫/白痴/骑士/丘比特变体、12 人完整神局、警长局等
- **16 种 AI 人格**：老周（逻辑派）、小辣椒（激进派）、影帝（戏精）、教头（老玩家）等，每局随机分配
- **三档难度**：简单/普通/困难，影响 AI 温度和推理深度
- **完整游戏机制**：
  - 夜间：狼人刀人、预言家查验、女巫救毒、守卫守护、丘比特连线
  - 白天：发言、投票、警长竞选/传警徽、猎人开枪、骑士决斗
  - 胜负判定：屠城/屠边/情侣胜利
- **演示模式**：不调用 API，使用固定策略快速验证 UI 流程
- **实时 AI 内心独白**：展示 AI 的推理过程
- **复盘功能**：游戏结束后可回顾完整对局

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Arco Design Vue |
| 后端 | Bun + Hono（Claude API 代理） |
| AI | Claude API（claude-sonnet-4-6），支持 prompt caching |
| 游戏引擎 | 纯 TypeScript 状态机，无副作用 |
| 包管理 | pnpm workspace monorepo |

## 项目结构

```
packages/
├── shared/      # 共享类型、常量（角色、阶段、板子、人格、工具定义）
├── engine/      # 纯游戏引擎（状态机、校验器、胜负判定）
├── ai-agents/   # AI 调度层（Agent、Orchestrator、Prompt 构建）
├── backend/     # Claude API 代理服务
└── frontend/    # Vue 3 前端应用
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 10.19.0
- Bun（用于后端）

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/wolf-fangs-kill.git
cd wolf-fangs-kill

# 安装依赖
pnpm install
```

### 配置

在 `packages/backend/.env` 中配置 Claude API 密钥：

```env
ANTHROPIC_API_KEY=sk-ant-xxx
PORT=8787
```

### 运行

```bash
# 启动前后端（并行）
pnpm dev:all

# 或单独启动
pnpm dev          # 仅前端
pnpm dev:backend  # 仅后端
```

访问 http://localhost:5173 开始游戏。

## 开发命令

```bash
pnpm dev:all      # 并行启动前后端
pnpm dev          # 启动前端 (Vite)
pnpm dev:backend  # 启动后端 (Bun + Hono)
pnpm cli          # 命令行跑一局（测试游戏引擎）
pnpm test         # 运行测试
pnpm typecheck    # 类型检查
pnpm build        # 构建所有包
```

## 游戏板子

| ID | 名称 | 配置 |
|----|------|------|
| `9-standard` | 9 人标准局 | 3 狼 + 预言家 + 女巫 + 猎人 + 3 平民 |
| `9-guard` | 9 人守卫变体 | 3 狼 + 预言家 + 女巫 + 猎人 + 守卫 + 2 平民 |
| `9-idiot` | 9 人白痴变体 | 3 狼 + 预言家 + 女巫 + 猎人 + 白痴 + 2 平民 |
| `9-knight` | 9 人骑士变体 | 3 狼 + 预言家 + 女巫 + 猎人 + 骑士 + 2 平民 |
| `9-cupid` | 9 人丘比特变体 | 3 狼 + 预言家 + 女巫 + 猎人 + 丘比特 + 2 平民 |
| `9-slaughter` | 9 人屠边局 | 同标准局，但狼人只需屠神或屠民即可获胜 |
| `12-full` | 12 人完整神局 | 4 狼 + 预言家 + 女巫 + 猎人 + 守卫 + 白痴 + 3 平民 |
| `12-swhi` | 12 人预女猎白 | 4 狼 + 预言家 + 女巫 + 猎人 + 白痴 + 4 平民 |
| `12-sheriff` | 12 人警长局 | 同 12 人完整神局，启用警长系统 |

## AI 人格

每局游戏会从 16 种人格中随机分配给 8 个 AI 玩家：

- **老周** - 理性程序员，爱推理画逻辑链
- **小辣椒** - 火爆女生，凭直觉冲锋
- **阿玲** - 文艺青年，通过语气判断真假
- **老好人** - 圆滑中年人，不爱得罪人
- **佛系** - 摸鱼大学生，发言简短
- **影帝** - 戏精，喜欢跳神演戏
- **学院派** - 严谨研究员，爱用术语
- **直男** - 直来直去的工程师
- **阴叔** - 疑心病重的博主
- **教头** - 经验丰富的老玩家
- **段总** - 脱口秀演员，用段子掩饰
- **浪姐** - 网络主播，带节奏能力强
- **蘑菇** - 社恐设计师，默默观察
- **小萌新** - 第一次玩的新手
- **油哥** - 说话滴水不漏的管理者
- **八姐** - 记忆力惊人的大姐

## 架构设计

### 游戏引擎 (`@wfk/engine`)

纯函数式状态机，核心 API：

```typescript
// 创建游戏
const state = createGame({ seed: 'xxx', boardId: '9-standard' });

// 推进游戏直到需要玩家输入
const { next, events, pending } = progress(state);

// 应用玩家动作
const { next, events, error } = applyAction(state, action);
```

### AI 代理 (`@wfk/ai-agents`)

- **Agent**：单个 AI 玩家，持有系统提示词（可缓存），每次决策构建新的用户消息
- **Orchestrator**：协调多个 Agent，支持并行（狼人投票、白天投票）和串行（发言）模式
- **信息隔离**：每个 Agent 只能看到自己角色应该知道的信息

### Prompt Caching

利用 Claude 的 prompt caching 优化成本：
- 系统提示词 + 工具定义（~4-5K tokens）标记为 `cache_control: ephemeral`
- 用户消息动态生成，不缓存

## License

MIT
