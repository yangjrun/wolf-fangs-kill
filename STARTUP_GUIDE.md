# 项目启动脚本说明

## 可用的启动脚本

### 根目录脚本 (package.json)

```bash
# 开发模式
pnpm dev              # 仅启动前端 (Vite, http://localhost:5173)
pnpm dev:backend      # 仅启动后端 (Bun + Hono, http://localhost:8787)
pnpm dev:all          # 并行启动前后端

# 构建
pnpm build            # 构建所有包

# 测试
pnpm test             # 运行所有包的测试
pnpm typecheck        # 类型检查所有包

# 命令行游戏
pnpm cli              # 命令行跑一局（dummy bot，不调 API）
pnpm cli --auto       # 命令行跑一局（真实 Claude AI，需后端 + API key）
pnpm cli --seed=foo --auto  # 指定种子
```

### 前端脚本 (packages/frontend/package.json)

```bash
cd packages/frontend

pnpm dev              # 启动 Vite 开发服务器
pnpm build            # 构建生产版本
pnpm preview          # 预览生产构建
pnpm test             # 运行测试
pnpm typecheck        # 类型检查
```

### 后端脚本 (packages/backend/package.json)

```bash
cd packages/backend

pnpm dev              # 启动 Bun 开发服务器（热重载）
pnpm start            # 启动生产服务器
pnpm typecheck        # 类型检查
```

## 启动流程

### 完整开发环境

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **配置环境变量**
   
   创建 `packages/backend/.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxx
   PORT=8787
   ANTHROPIC_BASE_URL=    # 可选，用于第三方中转
   ```

3. **启动开发服务器**
   ```bash
   pnpm dev:all
   ```
   
   这会并行启动：
   - 前端: http://localhost:5173
   - 后端: http://localhost:8787

### 仅前端开发

如果只需要开发前端 UI（不需要真实 AI）：

```bash
pnpm dev
```

前端会在 Settings 页面提供 API key 配置，可以覆盖后端的配置。

### 仅后端开发

如果只需要测试后端 API：

```bash
pnpm dev:backend
```

### 命令行测试

快速测试游戏逻辑（不需要 UI）：

```bash
# Dummy bot 模式（不调用 API，快速测试）
pnpm cli

# 真实 AI 模式（需要配置 API key）
pnpm cli --auto

# 指定种子和板子
pnpm cli --seed=test123 --board=9-guard --auto
```

## 端口配置

| 服务 | 默认端口 | 配置位置 |
|------|---------|----------|
| 前端 | 5173 | `packages/frontend/vite.config.ts` |
| 后端 | 8787 | `packages/backend/.env` (PORT) |

## 依赖关系

```
前端 (5173) → 后端 (8787) → Claude API
```

- 前端通过 `/api/llm/messages` 调用后端
- 后端代理请求到 Claude API
- 支持自定义 base URL（第三方中转）

## 常见问题

### Q: 前端启动后无法连接后端？
A: 确保后端也在运行 (`pnpm dev:backend`) 或使用 `pnpm dev:all` 同时启动。

### Q: 后端报错 "ANTHROPIC_API_KEY not found"？
A: 在 `packages/backend/.env` 中配置 API key。

### Q: 想要快速测试游戏逻辑？
A: 使用 `pnpm cli` 命令行模式，无需启动前后端。

### Q: 如何使用第三方 API 中转？
A: 在 `packages/backend/.env` 中设置 `ANTHROPIC_BASE_URL`，或在前端 Settings 页面配置。

## 开发工作流

### 日常开发
```bash
# 1. 启动开发环境
pnpm dev:all

# 2. 修改代码（热重载自动生效）

# 3. 运行测试
pnpm test

# 4. 类型检查
pnpm typecheck
```

### 添加新功能
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发 + 测试
pnpm dev:all
pnpm test

# 3. 构建验证
pnpm build

# 4. 提交
git add .
git commit -m "feat: add new feature"
```

### 快速验证
```bash
# 命令行快速跑一局
pnpm cli --auto

# 或指定参数
pnpm cli --seed=test --board=12-sheriff --difficulty=hard --auto
```

## 性能优化

### 开发模式
- 前端: Vite HMR（热模块替换）
- 后端: Bun --watch（文件监听热重载）
- 并行启动: `pnpm -r --parallel`

### 生产模式
```bash
# 构建所有包
pnpm build

# 启动生产服务器
cd packages/backend && pnpm start
cd packages/frontend && pnpm preview
```

## 脚本依赖

| 脚本 | 依赖工具 | 说明 |
|------|---------|------|
| `pnpm dev` | Vite | 前端开发服务器 |
| `pnpm dev:backend` | Bun | 后端开发服务器 |
| `pnpm cli` | tsx | TypeScript 执行器 |
| `pnpm test` | Vitest | 测试运行器 |
| `pnpm build` | vite, tsc | 构建工具 |

## 总结

✅ 项目有完整的启动脚本
✅ 支持前后端独立开发
✅ 支持命令行快速测试
✅ 支持并行启动开发环境
✅ 支持热重载（前后端）
✅ 支持类型检查和测试
