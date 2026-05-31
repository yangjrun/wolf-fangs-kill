#!/usr/bin/env bash
# Wolf Fangs Kill - 前后端启动脚本
# 用法: ./start.sh [选项]
# 选项:
#   --frontend    仅启动前端
#   --backend     仅启动后端
#   --check       检查环境和依赖
#   --install     安装依赖
#   --help        显示帮助信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 输出函数
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

header() {
    echo -e "\n${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA} $1${NC}"
    echo -e "${MAGENTA}========================================${NC}\n"
}

# 显示帮助信息
show_help() {
    cat << EOF

Wolf Fangs Kill - 启动脚本

用法:
    ./start.sh                启动前后端（默认）
    ./start.sh --frontend     仅启动前端
    ./start.sh --backend      仅启动后端
    ./start.sh --check        检查环境和依赖
    ./start.sh --install      安装依赖
    ./start.sh --help         显示此帮助信息

示例:
    # 启动完整开发环境
    ./start.sh

    # 仅启动前端（用于前端开发）
    ./start.sh --frontend

    # 仅启动后端（用于后端开发）
    ./start.sh --backend

    # 检查环境配置
    ./start.sh --check

    # 安装所有依赖
    ./start.sh --install

端口:
    前端: http://localhost:5173
    后端: http://localhost:8787

环境变量:
    在 packages/backend/.env 中配置:
    - ANTHROPIC_API_KEY: Claude API 密钥
    - PORT: 后端端口（默认 8787）
    - ANTHROPIC_BASE_URL: API 基础 URL（可选）

EOF
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查环境
check_environment() {
    header "环境检查"

    local all_good=true

    # 检查 Node.js
    if command_exists node; then
        local node_version=$(node --version)
        success "Node.js: $node_version"

        # 检查版本是否 >= 20
        local major_version=$(echo "$node_version" | sed 's/v\([0-9]*\).*/\1/')
        if [ "$major_version" -lt 20 ]; then
            error "Node.js 版本过低，需要 >= 20.0.0"
            all_good=false
        fi
    else
        error "Node.js 未安装"
        info "请访问 https://nodejs.org/ 下载安装"
        all_good=false
    fi

    # 检查 npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        success "npm: $npm_version"
    else
        error "npm 未安装"
        info "运行: npm install -g npm"
        all_good=false
    fi

    # 检查 Bun
    if command_exists bun; then
        local bun_version=$(bun --version)
        success "Bun: $bun_version"
    else
        warning "Bun 未安装（后端需要）"
        info "访问 https://bun.sh/ 安装"
        if [ "$MODE" = "backend" ] || [ "$MODE" = "all" ]; then
            all_good=false
        fi
    fi

    # 检查 node_modules
    if [ -d "node_modules" ]; then
        success "依赖已安装"
    else
        warning "依赖未安装"
        info "运行: ./start.sh --install"
        all_good=false
    fi

    # 检查后端环境变量
    local env_file="packages/backend/.env"
    if [ -f "$env_file" ]; then
        success "后端环境变量文件存在"

        # 检查 API key
        if grep -q "ANTHROPIC_API_KEY=sk-ant-" "$env_file"; then
            success "API Key 已配置"
        else
            warning "API Key 未配置或格式不正确"
            info "在 $env_file 中设置 ANTHROPIC_API_KEY"
        fi
    else
        warning "后端环境变量文件不存在"
        info "创建 $env_file 并设置 ANTHROPIC_API_KEY"
        if [ "$MODE" = "backend" ] || [ "$MODE" = "all" ]; then
            info "示例内容:"
            echo -e "${NC}ANTHROPIC_API_KEY=sk-ant-your-key-here"
            echo -e "PORT=8787${NC}"
        fi
    fi

    echo ""
    if [ "$all_good" = true ]; then
        success "环境检查通过！"
        return 0
    else
        error "环境检查失败，请修复上述问题"
        return 1
    fi
}

# 安装依赖
install_dependencies() {
    header "安装依赖"

    if ! command_exists npm; then
        error "npm 未安装，无法继续"
        info "运行: npm install -g npm"
        exit 1
    fi

    info "正在安装依赖..."
    npm install

    if [ $? -eq 0 ]; then
        success "依赖安装完成"
    else
        error "依赖安装失败"
        exit 1
    fi
}

# 启动前端
start_frontend() {
    header "启动前端"
    info "前端地址: http://localhost:5173"
    info "按 Ctrl+C 停止"
    echo ""

    npm dev
}

# 启动后端
start_backend() {
    header "启动后端"
    info "后端地址: http://localhost:8787"
    info "按 Ctrl+C 停止"
    echo ""

    npm dev:backend
}

# 启动前后端
start_all() {
    header "启动前后端"
    info "前端地址: http://localhost:5173"
    info "后端地址: http://localhost:8787"
    info "按 Ctrl+C 停止"
    echo ""

    npm dev:all
}

# 解析参数
MODE="all"
ACTION="start"

while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend)
            MODE="frontend"
            shift
            ;;
        --backend)
            MODE="backend"
            shift
            ;;
        --check)
            ACTION="check"
            shift
            ;;
        --install)
            ACTION="install"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主逻辑
main() {
    # 安装依赖
    if [ "$ACTION" = "install" ]; then
        install_dependencies
        exit 0
    fi

    # 检查环境
    if [ "$ACTION" = "check" ]; then
        check_environment
        exit $?
    fi

    # 启动前检查环境
    info "正在检查环境..."
    if ! check_environment; then
        echo ""
        error "环境检查失败，无法启动"
        info "运行 ./start.sh --check 查看详细信息"
        info "运行 ./start.sh --install 安装依赖"
        exit 1
    fi

    # 根据模式启动
    case $MODE in
        frontend)
            start_frontend
            ;;
        backend)
            start_backend
            ;;
        all)
            start_all
            ;;
    esac
}

# 执行主函数
main
