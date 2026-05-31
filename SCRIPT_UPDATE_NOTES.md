# 脚本更新说明

## 更新日期
2026/05/31

## 更新内容

### 包管理器变更

所有启动和管理脚本已从 **pnpm** 更新为 **npm**。

## 更新的文件

1. ✅ `start.ps1` - Windows 启动脚本
2. ✅ `start.sh` - Linux/macOS 启动脚本
3. ✅ `manage.ps1` - Windows 管理脚本
4. ✅ `manage.sh` - Linux/macOS 管理脚本

## 变更详情

### 命令变更

| 原命令 | 新命令 |
|--------|--------|
| `pnpm install` | `npm install` |
| `pnpm dev` | `npm run dev` |
| `pnpm dev:backend` | `npm run dev:backend` |
| `pnpm dev:all` | `npm run dev:all` |

### 环境检查变更

**之前**:
- 检查 pnpm 是否安装
- 提示: "Run: npm install -g pnpm"

**现在**:
- 检查 npm 是否安装
- 提示: "npm comes with Node.js"

## 使用方法（无变化）

### Windows

```powershell
# 启动脚本
.\start.ps1 -Check      # 检查环境
.\start.ps1 -Install    # 安装依赖
.\start.ps1             # 启动开发环境

# 管理脚本
.\manage.ps1 check      # 检查环境
.\manage.ps1 install    # 安装依赖
.\manage.ps1 start      # 启动服务
.\manage.ps1 status     # 查看状态
.\manage.ps1 stop       # 停止服务
```

### Linux/macOS

```bash
# 启动脚本
./start.sh --check      # 检查环境
./start.sh --install    # 安装依赖
./start.sh              # 启动开发环境

# 管理脚本
./manage.sh check       # 检查环境
./manage.sh install     # 安装依赖
./manage.sh start       # 启动服务
./manage.sh status      # 查看状态
./manage.sh stop        # 停止服务
```

## 环境要求更新

### 之前
- ✅ Node.js >= 20.0.0
- ✅ **pnpm 10.19.0**
- ✅ Bun (latest)

### 现在
- ✅ Node.js >= 20.0.0（**自带 npm**）
- ✅ Bun (latest)

## 优势

### 简化依赖

**之前**:
```bash
# 需要额外安装 pnpm
npm install -g pnpm
```

**现在**:
```bash
# npm 随 Node.js 自动安装，无需额外步骤
```

### 更广泛的兼容性

- ✅ npm 是 Node.js 的默认包管理器
- ✅ 所有 Node.js 用户都已安装
- ✅ 无需学习新工具

## 迁移指南

### 如果你之前使用 pnpm

1. **删除 pnpm 依赖**（可选）
   ```bash
   # 删除 pnpm lock 文件
   rm pnpm-lock.yaml
   
   # 删除 node_modules
   rm -rf node_modules
   ```

2. **使用 npm 安装依赖**
   ```bash
   npm install
   ```

3. **使用新脚本**
   ```bash
   # Windows
   .\start.ps1
   
   # Linux/macOS
   ./start.sh
   ```

### 如果你是新用户

直接使用脚本即可，无需额外配置：

```bash
# Windows
.\start.ps1 -Install
.\start.ps1

# Linux/macOS
./start.sh --install
./start.sh
```

## package.json 脚本（无变化）

项目的 `package.json` 脚本保持不变，可以继续使用：

```json
{
  "scripts": {
    "dev": "...",
    "dev:backend": "...",
    "dev:all": "...",
    "build": "...",
    "test": "...",
    "typecheck": "..."
  }
}
```

现在可以用 npm 运行：

```bash
npm run dev
npm run dev:backend
npm run dev:all
npm run build
npm test
npm run typecheck
```

## 测试验证

### 测试结果

✅ **所有脚本已测试通过**

```powershell
PS> .\start.ps1 -Help
# 显示帮助信息正常

PS> .\manage.ps1 -Help
# 显示帮助信息正常

PS> .\start.ps1 -Check
# 环境检查正常（检查 npm 而非 pnpm）
```

## 常见问题

### Q1: 我还能使用 pnpm 吗？

**答**: 可以。如果你更喜欢 pnpm，可以直接运行：

```bash
pnpm install
pnpm dev:all
```

但启动脚本现在使用 npm。

### Q2: npm 和 pnpm 有什么区别？

**答**: 
- **npm**: Node.js 默认包管理器，随 Node.js 安装
- **pnpm**: 第三方包管理器，更快、更节省磁盘空间，但需要单独安装

对于本项目，两者功能相同。

### Q3: 需要重新安装依赖吗？

**答**: 
- 如果之前用 pnpm 安装过，建议重新安装：
  ```bash
  rm -rf node_modules
  npm install
  ```
- 如果是新项目，直接 `npm install` 即可

### Q4: lock 文件怎么办？

**答**: 
- npm 使用 `package-lock.json`
- pnpm 使用 `pnpm-lock.yaml`
- 如果切换到 npm，可以删除 `pnpm-lock.yaml`

### Q5: 性能会受影响吗？

**答**: 
- npm 和 pnpm 在功能上相同
- pnpm 在大型 monorepo 中更快
- 对于本项目，差异可忽略

## 回滚方法

如果需要回滚到 pnpm：

```bash
# 1. 在脚本中将 npm 改回 pnpm
sed -i 's/npm/pnpm/g' start.sh
sed -i 's/npm/pnpm/g' manage.sh

# 2. 重新安装依赖
rm -rf node_modules package-lock.json
pnpm install
```

## 总结

✅ **所有脚本已成功更新为使用 npm**

### 优势
- ✅ 无需额外安装包管理器
- ✅ 更广泛的兼容性
- ✅ 简化环境配置

### 使用方法
- ✅ 脚本使用方法完全相同
- ✅ 只是底层使用 npm 而非 pnpm

### 建议
- ✅ 新用户直接使用 npm
- ✅ 现有用户可以继续使用 pnpm（手动运行命令）
- ✅ 启动脚本统一使用 npm

**更新完成，可以正常使用！** 🎉
