# Wolf Fangs Kill

AI 狼人杀 —— 1 人 + 8 AI 的 9 人板狼人杀游戏，由 Claude API 驱动。

## 配置

- 板子：3 狼 + 预言家 + 女巫 + 猎人 + 3 平民（无警长）
- AI：Claude API（每个 AI 独立人格 + 对话历史）
- 前端：Vue 3 + Vite + Arco Design Vue
- 后端：Bun + Hono（Claude API 轻量代理）

## 项目结构

```
packages/
  shared/      共享类型与常量
  engine/      纯游戏引擎（无 AI、无 UI）
  ai-agents/   AI 调度层
  backend/     Claude API 代理
  frontend/    Vue 3 前端
```

## 开发

```bash
# 安装依赖
pnpm install

# 启动前后端（并行）
pnpm dev:all

# 单独启动后端
pnpm dev:backend

# 命令行跑一局（用于测试游戏引擎）
pnpm cli

# 运行测试
pnpm test

# 类型检查
pnpm typecheck
```

## 环境变量

在 `packages/backend/.env` 中配置：

```
ANTHROPIC_API_KEY=sk-ant-xxx
PORT=8787
```

## 实施进度

详见 `C:\Users\6816\.claude\plans\fuzzy-crafting-candle.md`。
