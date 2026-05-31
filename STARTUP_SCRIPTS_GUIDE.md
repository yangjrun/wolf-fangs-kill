# 启动脚本使用指南

## 概述

项目提供了两个启动脚本，用于快速启动前后端开发环境：

- **Windows**: `start.ps1` (PowerShell)
- **Linux/macOS**: `start.sh` (Bash)

## 快速开始

### Windows

```powershell
# 检查环境
.\start.ps1 -Check

# 安装依赖
.\start.ps1 -Install

# 启动前后端
.\start.ps1
```

### Linux/macOS

```bash
# 添加执行权限
chmod +x start.sh

# 检查环境
./start.sh --check

# 安装依赖
./start.sh --install

# 启动前后端
./start.sh
```

## 命令选项

### Windows (PowerShell)

| 选项 | 说明 |
|------|------|
| `.\start.ps1` | 启动前后端（默认） |
| `.\start.ps1 -Frontend` | 仅启动前端 |
| `.\start.ps1 -Backend` | 仅启动后端 |
| `.\start.ps1 -Check` | 检查环境和依赖 |
| `.\start.ps1 -Install` | 安装依赖 |
| `.\start.ps1 -Help` | 显示帮助信息 |

### Linux/macOS (Bash)

| 选项 | 说明 |
|------|------|
| `./start.sh` | 启动前后端（默认） |
| `./start.sh --frontend` | 仅启动前端 |
| `./start.sh --backend` | 仅启动后端 |
| `./start.sh --check` | 检查环境和依赖 |
| `./start.sh --install` | 安装依赖 |
| `./start.sh --help` | 显示帮助信息 |

## 功能说明

### 1. 环境检查 (`-Check` / `--check`)

自动检查以下环境要求：

- ✅ Node.js (>= 20.0.0)
- ✅ pnpm
- ✅ Bun (后端需要)
- ✅ node_modules (依赖是否已安装)
- ✅ .env 文件 (后端环境变量)
- ✅ API Key 配置

**示例输出**:

```
========================================
 Environment Check
========================================

OK Node.js: v22.17.1
OK pnpm: 10.19.0
OK Bun: 1.2.19
OK Dependencies installed
OK Backend .env file exists
! API Key not configured or invalid format
i Set ANTHROPIC_API_KEY in packages\backend\.env

OK Environment check passed!
```

### 2. 安装依赖 (`-Install` / `--install`)

自动运行 `pnpm install` 安装所有依赖。

### 3. 启动前端 (`-Frontend` / `--frontend`)

仅启动前端开发服务器：

- 地址: http://localhost:5173
- 工具: Vite
- 热重载: 支持

**适用场景**:
- 前端 UI 开发
- 不需要真实 AI 对话
- 可以在前端 Settings 页面配置 API key

### 4. 启动后端 (`-Backend` / `--backend`)

仅启动后端开发服务器：

- 地址: http://localhost:8787
- 工具: Bun + Hono
- 热重载: 支持

**适用场景**:
- 后端 API 开发
- 测试 Claude API 代理
- 使用 curl 或 Postman 测试

### 5. 启动前后端（默认）

并行启动前后端开发服务器：

- 前端: http://localhost:5173
- 后端: http://localhost:8787
- 并行运行: 使用 `pnpm dev:all`

**适用场景**:
- 完整开发环境
- 测试前后端交互
- 真实 AI 对话测试

## 环境配置

### 必需环境

1. **Node.js** (>= 20.0.0)
   - 下载: https://nodejs.org/

2. **pnpm**
   ```bash
   npm install -g pnpm
   ```

3. **Bun** (后端需要)
   - 下载: https://bun.sh/

### 后端环境变量

创建 `packages/backend/.env` 文件：

```env
# Claude API Key (必需)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 后端端口 (可选，默认 8787)
PORT=8787

# API 基础 URL (可选，用于第三方中转)
ANTHROPIC_BASE_URL=
```

## 使用场景

### 场景 1: 首次启动

```bash
# 1. 检查环境
.\start.ps1 -Check

# 2. 安装依赖
.\start.ps1 -Install

# 3. 配置 API key
# 编辑 packages/backend/.env

# 4. 启动开发环境
.\start.ps1
```

### 场景 2: 日常开发

```bash
# 直接启动（会自动检查环境）
.\start.ps1
```

### 场景 3: 前端开发

```bash
# 仅启动前端
.\start.ps1 -Frontend

# 在浏览器中访问 http://localhost:5173
# 在 Settings 页面配置 API key（可选）
```

### 场景 4: 后端开发

```bash
# 仅启动后端
.\start.ps1 -Backend

# 使用 curl 测试 API
curl -X POST http://localhost:8787/api/llm/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

### 场景 5: 环境问题排查

```bash
# 检查环境
.\start.ps1 -Check

# 根据提示修复问题
# 例如：安装缺失的工具、配置环境变量等

# 重新检查
.\start.ps1 -Check
```

## 常见问题

### Q1: 脚本无法执行（Windows）

**问题**: PowerShell 提示"无法加载，因为在此系统上禁止运行脚本"

**解决**:
```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# 或者临时绕过
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

### Q2: 脚本无法执行（Linux/macOS）

**问题**: 提示"Permission denied"

**解决**:
```bash
chmod +x start.sh
./start.sh
```

### Q3: Node.js 版本过低

**问题**: 环境检查提示"Node.js version too old"

**解决**:
- 访问 https://nodejs.org/ 下载最新 LTS 版本
- 或使用 nvm 切换版本：
  ```bash
  nvm install 20
  nvm use 20
  ```

### Q4: pnpm 未安装

**问题**: 环境检查提示"pnpm not installed"

**解决**:
```bash
npm install -g pnpm
```

### Q5: Bun 未安装

**问题**: 环境检查提示"Bun not installed"

**解决**:
- Windows: 访问 https://bun.sh/ 下载安装
- Linux/macOS:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

### Q6: API Key 未配置

**问题**: 环境检查提示"API Key not configured"

**解决**:
1. 创建 `packages/backend/.env` 文件
2. 添加内容：
   ```env
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. 重新检查：`.\start.ps1 -Check`

### Q7: 端口被占用

**问题**: 启动时提示端口 5173 或 8787 被占用

**解决**:
- 方法 1: 关闭占用端口的程序
- 方法 2: 修改端口配置
  - 前端: 编辑 `packages/frontend/vite.config.ts`
  - 后端: 编辑 `packages/backend/.env` 中的 `PORT`

### Q8: 依赖安装失败

**问题**: `pnpm install` 失败

**解决**:
```bash
# 清理缓存
pnpm store prune

# 删除 node_modules 和 lock 文件
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

## 脚本特性

### 自动环境检查

启动前自动检查环境，避免启动失败：

```
i Checking environment...

========================================
 Environment Check
========================================

OK Node.js: v22.17.1
OK pnpm: 10.19.0
OK Bun: 1.2.19
OK Dependencies installed
OK Backend .env file exists
OK API Key configured

OK Environment check passed!
```

### 彩色输出

- 🟢 绿色: 成功信息
- 🔴 红色: 错误信息
- 🟡 黄色: 警告信息
- 🔵 蓝色: 提示信息
- 🟣 紫色: 标题

### 友好的错误提示

当环境检查失败时，提供明确的修复建议：

```
X pnpm not installed
i Run: npm install -g pnpm

X Environment check failed, cannot start
i Run .\start.ps1 -Check for details
i Run .\start.ps1 -Install to install dependencies
```

## 与 package.json 脚本的关系

启动脚本是对 `package.json` 脚本的封装，提供了：

- ✅ 环境检查
- ✅ 友好的错误提示
- ✅ 彩色输出
- ✅ 统一的使用体验

**等价关系**:

| 启动脚本 | package.json 脚本 |
|---------|------------------|
| `.\start.ps1` | `pnpm dev:all` |
| `.\start.ps1 -Frontend` | `pnpm dev` |
| `.\start.ps1 -Backend` | `pnpm dev:backend` |
| `.\start.ps1 -Install` | `pnpm install` |

## 高级用法

### 自定义端口

编辑 `packages/backend/.env`:

```env
PORT=3000
```

编辑 `packages/frontend/vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 8080,
  },
});
```

### 使用第三方 API 中转

编辑 `packages/backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_BASE_URL=https://your-proxy.com/v1
```

### 在 CI/CD 中使用

```yaml
# GitHub Actions 示例
- name: Check environment
  run: ./start.sh --check

- name: Install dependencies
  run: ./start.sh --install

- name: Run tests
  run: pnpm test
```

## 总结

启动脚本提供了：

- ✅ 一键启动开发环境
- ✅ 自动环境检查
- ✅ 友好的错误提示
- ✅ 跨平台支持（Windows/Linux/macOS）
- ✅ 灵活的启动选项

推荐使用启动脚本而不是直接运行 `pnpm` 命令，以获得更好的开发体验。
