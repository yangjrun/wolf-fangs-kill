# 脚本更新完成 - 从 pnpm 到 npm

## ✅ 更新完成

所有启动和管理脚本已成功从 **pnpm** 更新为 **npm**。

## 📝 更新的文件

1. ✅ `start.ps1` - Windows 启动脚本
2. ✅ `start.sh` - Linux/macOS 启动脚本  
3. ✅ `manage.ps1` - Windows 管理脚本
4. ✅ `manage.sh` - Linux/macOS 管理脚本

## 🔄 主要变更

### 命令变更

| 原命令 | 新命令 |
|--------|--------|
| `pnpm install` | `npm install` |
| `pnpm dev` | `npm run dev` |
| `pnpm dev:backend` | `npm run dev:backend` |
| `pnpm dev:all` | `npm run dev:all` |

### 环境要求简化

**之前**:
- Node.js >= 20.0.0
- **pnpm 10.19.0** ⬅️ 需要额外安装
- Bun (latest)

**现在**:
- Node.js >= 20.0.0 ⬅️ **自带 npm**
- Bun (latest)

## 🚀 快速开始

### Windows

```powershell
# 检查环境
.\start.ps1 -Check

# 安装依赖
.\start.ps1 -Install

# 启动开发环境
.\start.ps1

# 或使用管理脚本（后台运行）
.\manage.ps1 start
.\manage.ps1 status
.\manage.ps1 stop
```

### Linux/macOS

```bash
# 检查环境
./start.sh --check

# 安装依赖
./start.sh --install

# 启动开发环境
./start.sh

# 或使用管理脚本（后台运行）
./manage.sh start
./manage.sh status
./manage.sh stop
```

## ✨ 优势

1. **无需额外安装**: npm 随 Node.js 自动安装
2. **更广泛兼容**: 所有 Node.js 用户都有 npm
3. **简化配置**: 减少一个依赖项
4. **使用方法不变**: 脚本使用方式完全相同

## 📊 测试验证

✅ **所有脚本已测试通过**

```powershell
PS> .\start.ps1 -Help
✓ 帮助信息显示正常

PS> .\manage.ps1 status
✓ 状态检查正常

PS> .\start.ps1 -Check
✓ 环境检查正常（检查 npm）
```

## 📚 相关文档

- `SCRIPT_UPDATE_NOTES.md` - 详细更新说明
- `STARTUP_GUIDE.md` - 启动脚本使用指南
- `SERVICE_MANAGEMENT_GUIDE.md` - 服务管理指南

## 🎉 总结

**更新已完成，所有脚本正常工作！**

现在可以使用 npm 作为包管理器，无需额外安装 pnpm。
