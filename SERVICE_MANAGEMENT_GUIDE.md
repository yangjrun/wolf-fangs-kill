# 服务管理脚本使用指南

## 概述

项目提供了完整的服务管理脚本，支持启动、停止、重启、状态查看和日志查看：

- **Windows**: `manage.ps1` (PowerShell)
- **Linux/macOS**: `manage.sh` (Bash)

## 快速开始

### Windows

```powershell
# 启动所有服务
.\manage.ps1 start

# 停止所有服务
.\manage.ps1 stop

# 查看状态
.\manage.ps1 status
```

### Linux/macOS

```bash
# 启动所有服务
./manage.sh start

# 停止所有服务
./manage.sh stop

# 查看状态
./manage.sh status
```

## 命令列表

### Windows (PowerShell)

| 命令 | 说明 |
|------|------|
| `.\manage.ps1 start` | 启动服务（默认） |
| `.\manage.ps1 stop` | 停止服务 |
| `.\manage.ps1 restart` | 重启服务 |
| `.\manage.ps1 status` | 查看服务状态 |
| `.\manage.ps1 logs` | 查看日志 |
| `.\manage.ps1 check` | 检查环境 |
| `.\manage.ps1 install` | 安装依赖 |

### Linux/macOS (Bash)

| 命令 | 说明 |
|------|------|
| `./manage.sh start` | 启动服务（默认） |
| `./manage.sh stop` | 停止服务 |
| `./manage.sh restart` | 重启服务 |
| `./manage.sh status` | 查看服务状态 |
| `./manage.sh logs` | 查看日志 |
| `./manage.sh check` | 检查环境 |
| `./manage.sh install` | 安装依赖 |

## 选项

### Windows

| 选项 | 说明 |
|------|------|
| `-Frontend` | 仅操作前端 |
| `-Backend` | 仅操作后端 |
| `-Help` | 显示帮助 |

### Linux/macOS

| 选项 | 说明 |
|------|------|
| `--frontend` | 仅操作前端 |
| `--backend` | 仅操作后端 |
| `--help` | 显示帮助 |

## 详细功能

### 1. 启动服务 (start)

启动前后端服务，服务在后台运行。

**启动所有服务**:
```bash
# Windows
.\manage.ps1 start

# Linux/macOS
./manage.sh start
```

**仅启动前端**:
```bash
# Windows
.\manage.ps1 start -Frontend

# Linux/macOS
./manage.sh start --frontend
```

**仅启动后端**:
```bash
# Windows
.\manage.ps1 start -Backend

# Linux/macOS
./manage.sh start --backend
```

**输出示例**:
```
========================================
 Starting Services
========================================

========================================
 Environment Check
========================================

OK Node.js: v22.17.1
OK pnpm: 10.19.0
OK Bun: 1.2.19
OK Dependencies installed

OK Environment check passed!

i Starting frontend...
OK Frontend started (PID: 12345)
i URL: http://localhost:5173
i Log: .pids/frontend.log

i Starting backend...
OK Backend started (PID: 12346)
i URL: http://localhost:8787
i Log: .pids/backend.log

OK Services started successfully
i Run '.\manage.ps1 status' to check status
i Run '.\manage.ps1 logs' to view logs
i Run '.\manage.ps1 stop' to stop services
```

### 2. 停止服务 (stop)

停止正在运行的服务。

**停止所有服务**:
```bash
# Windows
.\manage.ps1 stop

# Linux/macOS
./manage.sh stop
```

**仅停止前端**:
```bash
# Windows
.\manage.ps1 stop -Frontend

# Linux/macOS
./manage.sh stop --frontend
```

**输出示例**:
```
========================================
 Stopping Services
========================================

i Stopping Frontend...
OK Frontend stopped

i Stopping Backend...
OK Backend stopped

OK Services stopped
```

### 3. 重启服务 (restart)

重启服务（先停止再启动）。

**重启所有服务**:
```bash
# Windows
.\manage.ps1 restart

# Linux/macOS
./manage.sh restart
```

**仅重启后端**:
```bash
# Windows
.\manage.ps1 restart -Backend

# Linux/macOS
./manage.sh restart --backend
```

### 4. 查看状态 (status)

查看服务运行状态。

```bash
# Windows
.\manage.ps1 status

# Linux/macOS
./manage.sh status
```

**输出示例**:
```
========================================
 Service Status
========================================

OK Frontend is running (PID: 12345)
i URL: http://localhost:5173

OK Backend is running (PID: 12346)
i URL: http://localhost:8787

OK At least one service is running
```

### 5. 查看日志 (logs)

查看服务日志（最近 50 行）。

**查看所有日志**:
```bash
# Windows
.\manage.ps1 logs

# Linux/macOS
./manage.sh logs
```

**仅查看前端日志**:
```bash
# Windows
.\manage.ps1 logs -Frontend

# Linux/macOS
./manage.sh logs --frontend
```

**输出示例**:
```
========================================
 Frontend Logs
========================================

VITE v5.4.11  ready in 523 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### 6. 检查环境 (check)

检查开发环境配置。

```bash
# Windows
.\manage.ps1 check

# Linux/macOS
./manage.sh check
```

### 7. 安装依赖 (install)

安装项目依赖。

```bash
# Windows
.\manage.ps1 install

# Linux/macOS
./manage.sh install
```

## 文件位置

### PID 文件

服务的进程 ID 保存在 `.pids/` 目录：

- `.pids/frontend.pid` - 前端进程 ID
- `.pids/backend.pid` - 后端进程 ID

### 日志文件

服务日志保存在 `.pids/` 目录：

- `.pids/frontend.log` - 前端日志
- `.pids/backend.log` - 后端日志

**注意**: `.pids/` 目录已添加到 `.gitignore`，不会提交到版本控制。

## 使用场景

### 场景 1: 日常开发

```bash
# 早上开始工作
.\manage.ps1 start

# 开发中...

# 下班前停止服务
.\manage.ps1 stop
```

### 场景 2: 前端开发

```bash
# 仅启动前端
.\manage.ps1 start -Frontend

# 前端开发...

# 停止前端
.\manage.ps1 stop -Frontend
```

### 场景 3: 后端开发

```bash
# 仅启动后端
.\manage.ps1 start -Backend

# 后端开发...

# 查看后端日志
.\manage.ps1 logs -Backend

# 重启后端（应用更改）
.\manage.ps1 restart -Backend
```

### 场景 4: 问题排查

```bash
# 查看服务状态
.\manage.ps1 status

# 查看日志
.\manage.ps1 logs

# 重启服务
.\manage.ps1 restart
```

### 场景 5: 服务器部署

```bash
# 检查环境
./manage.sh check

# 安装依赖
./manage.sh install

# 启动服务
./manage.sh start

# 查看状态
./manage.sh status
```

## 与 start.ps1 的区别

| 功能 | start.ps1 | manage.ps1 |
|------|-----------|------------|
| 启动服务 | ✅ 前台运行 | ✅ 后台运行 |
| 停止服务 | ❌ 手动 Ctrl+C | ✅ 自动停止 |
| 重启服务 | ❌ 不支持 | ✅ 支持 |
| 查看状态 | ❌ 不支持 | ✅ 支持 |
| 查看日志 | ❌ 不支持 | ✅ 支持 |
| 环境检查 | ✅ 支持 | ✅ 支持 |

**推荐使用**:
- **开发调试**: 使用 `start.ps1`（前台运行，实时查看输出）
- **日常开发**: 使用 `manage.ps1`（后台运行，不占用终端）
- **服务器部署**: 使用 `manage.sh`（后台运行，服务管理）

## 常见问题

### Q1: 服务启动失败

**问题**: 启动后立即停止

**排查步骤**:
```bash
# 1. 查看日志
.\manage.ps1 logs

# 2. 检查端口是否被占用
# Windows
netstat -ano | findstr "5173"
netstat -ano | findstr "8787"

# Linux/macOS
lsof -i :5173
lsof -i :8787

# 3. 检查环境
.\manage.ps1 check
```

### Q2: 无法停止服务

**问题**: stop 命令无效

**解决**:
```bash
# Windows - 手动查找并结束进程
Get-Content .pids\frontend.pid
Stop-Process -Id <PID> -Force

# Linux/macOS - 手动结束进程
cat .pids/frontend.pid
kill -9 <PID>
```

### Q3: 日志文件过大

**问题**: 日志文件占用空间

**解决**:
```bash
# 清空日志文件
# Windows
Clear-Content .pids\frontend.log
Clear-Content .pids\backend.log

# Linux/macOS
> .pids/frontend.log
> .pids/backend.log
```

### Q4: PID 文件不同步

**问题**: 服务已停止但 PID 文件仍存在

**解决**:
```bash
# 删除 PID 文件
# Windows
Remove-Item .pids\*.pid

# Linux/macOS
rm .pids/*.pid
```

### Q5: 权限问题（Linux/macOS）

**问题**: Permission denied

**解决**:
```bash
chmod +x manage.sh
./manage.sh start
```

## 高级用法

### 自动启动（Windows）

创建快捷方式，设置为开机启动：

1. 右键 `manage.ps1` → 创建快捷方式
2. 快捷方式属性 → 目标：
   ```
   powershell.exe -ExecutionPolicy Bypass -File "E:\wolf-fangs-kill\manage.ps1" start
   ```
3. 将快捷方式放到启动文件夹：
   ```
   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
   ```

### 自动启动（Linux/macOS）

使用 systemd 或 launchd 创建系统服务。

**systemd 示例** (`/etc/systemd/system/wfk.service`):
```ini
[Unit]
Description=Wolf Fangs Kill
After=network.target

[Service]
Type=forking
User=your-user
WorkingDirectory=/path/to/wolf-fangs-kill
ExecStart=/path/to/wolf-fangs-kill/manage.sh start
ExecStop=/path/to/wolf-fangs-kill/manage.sh stop
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启用服务:
```bash
sudo systemctl enable wfk
sudo systemctl start wfk
```

### 日志轮转

防止日志文件无限增长：

**Linux/macOS** (`/etc/logrotate.d/wfk`):
```
/path/to/wolf-fangs-kill/.pids/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

### 监控脚本

创建监控脚本，自动重启崩溃的服务：

```bash
#!/bin/bash
# monitor.sh

while true; do
    if ! ./manage.sh status > /dev/null 2>&1; then
        echo "Service down, restarting..."
        ./manage.sh start
    fi
    sleep 60
done
```

## 最佳实践

1. **开发时**: 使用 `start.ps1` 前台运行，方便调试
2. **测试时**: 使用 `manage.ps1` 后台运行，不占用终端
3. **部署时**: 使用 `manage.sh` + systemd，自动重启
4. **定期检查**: 运行 `status` 确认服务正常
5. **查看日志**: 遇到问题先查看 `logs`
6. **清理日志**: 定期清理或轮转日志文件

## 总结

管理脚本提供了完整的服务生命周期管理：

- ✅ 启动服务（后台运行）
- ✅ 停止服务（优雅关闭）
- ✅ 重启服务（快速重启）
- ✅ 状态查看（实时监控）
- ✅ 日志查看（问题排查）
- ✅ 环境检查（配置验证）
- ✅ 依赖安装（一键安装）

推荐在日常开发和生产部署中使用管理脚本，提升开发效率和运维体验。
