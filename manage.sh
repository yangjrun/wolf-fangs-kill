#!/usr/bin/env bash
# Wolf Fangs Kill - Frontend and Backend Management Script
# Usage: ./manage.sh [command] [options]

set -e

# PID file locations
PID_DIR=".pids"
FRONTEND_PID="$PID_DIR/frontend.pid"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_LOG="$PID_DIR/frontend.log"
BACKEND_LOG="$PID_DIR/backend.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Output functions
success() {
    echo -e "${GREEN}OK $1${NC}"
}

error() {
    echo -e "${RED}X $1${NC}"
}

info() {
    echo -e "${CYAN}i $1${NC}"
}

warning() {
    echo -e "${YELLOW}! $1${NC}"
}

header() {
    echo -e "\n${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA} $1${NC}"
    echo -e "${MAGENTA}========================================${NC}\n"
}

# Show help
show_help() {
    cat << EOF

Wolf Fangs Kill - Service Management Script

Usage:
    ./manage.sh [command] [options]

Commands:
    start        Start services (default)
    stop         Stop services
    restart      Restart services
    status       Check service status
    logs         View logs
    check        Check environment
    install      Install dependencies

Options:
    --frontend   Target frontend only
    --backend    Target backend only
    --help       Show this help

Examples:
    # Start all services
    ./manage.sh start

    # Start frontend only
    ./manage.sh start --frontend

    # Stop all services
    ./manage.sh stop

    # Restart backend
    ./manage.sh restart --backend

    # Check service status
    ./manage.sh status

    # View logs
    ./manage.sh logs

    # Check environment
    ./manage.sh check

Ports:
    Frontend: http://localhost:5173
    Backend: http://localhost:8787

EOF
}

# Ensure PID directory exists
init_pid_dir() {
    mkdir -p "$PID_DIR"
}

# Check if process is running
is_running() {
    local pid_file=$1

    if [ ! -f "$pid_file" ]; then
        return 1
    fi

    local pid=$(cat "$pid_file" 2>/dev/null)
    if [ -z "$pid" ]; then
        return 1
    fi

    if ps -p "$pid" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start frontend
start_frontend() {
    info "Starting frontend..."

    if is_running "$FRONTEND_PID"; then
        warning "Frontend is already running"
        return
    fi

    # Start frontend in background
    nohup npm dev > "$FRONTEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID"

    sleep 2

    if is_running "$FRONTEND_PID"; then
        success "Frontend started (PID: $pid)"
        info "URL: http://localhost:5173"
        info "Log: $FRONTEND_LOG"
    else
        error "Failed to start frontend"
        if [ -f "$FRONTEND_LOG" ]; then
            info "Check log file: $FRONTEND_LOG"
        fi
    fi
}

# Start backend
start_backend() {
    info "Starting backend..."

    if is_running "$BACKEND_PID"; then
        warning "Backend is already running"
        return
    fi

    # Start backend in background
    nohup npm dev:backend > "$BACKEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID"

    sleep 2

    if is_running "$BACKEND_PID"; then
        success "Backend started (PID: $pid)"
        info "URL: http://localhost:8787"
        info "Log: $BACKEND_LOG"
    else
        error "Failed to start backend"
        if [ -f "$BACKEND_LOG" ]; then
            info "Check log file: $BACKEND_LOG"
        fi
    fi
}

# Stop service
stop_service() {
    local name=$1
    local pid_file=$2

    info "Stopping $name..."

    if ! is_running "$pid_file"; then
        warning "$name is not running"
        return
    fi

    local pid=$(cat "$pid_file")

    # Try graceful shutdown
    if kill "$pid" 2>/dev/null; then
        sleep 1

        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -9 "$pid" 2>/dev/null || true
        fi

        rm -f "$pid_file"
        success "$name stopped"
    else
        error "Failed to stop $name"
    fi
}

# Get service status
get_status() {
    local name=$1
    local pid_file=$2
    local url=$3

    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        success "$name is running (PID: $pid)"
        info "URL: $url"
        return 0
    else
        warning "$name is not running"
        return 1
    fi
}

# View logs
show_logs() {
    local name=$1
    local log_file=$2

    if [ ! -f "$log_file" ]; then
        warning "No log file found for $name"
        return
    fi

    header "$name Logs"
    tail -n 50 "$log_file"
}

# Check environment
check_environment() {
    header "Environment Check"

    local all_good=true

    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        success "Node.js: $node_version"

        local major_version=$(echo "$node_version" | sed 's/v\([0-9]*\).*/\1/')
        if [ "$major_version" -lt 20 ]; then
            error "Node.js version too old, need >= 20.0.0"
            all_good=false
        fi
    else
        error "Node.js not installed"
        all_good=false
    fi

    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        success "npm: $npm_version"
    else
        error "npm not installed"
        all_good=false
    fi

    # Check Bun
    if command -v bun >/dev/null 2>&1; then
        local bun_version=$(bun --version)
        success "Bun: $bun_version"
    else
        warning "Bun not installed (required for backend)"
        if [ "$TARGET_BACKEND" = true ]; then
            all_good=false
        fi
    fi

    # Check dependencies
    if [ -d "node_modules" ]; then
        success "Dependencies installed"
    else
        warning "Dependencies not installed"
        info "Run: ./manage.sh install"
        all_good=false
    fi

    echo ""
    if [ "$all_good" = true ]; then
        success "Environment check passed!"
        return 0
    else
        error "Environment check failed"
        return 1
    fi
}

# Install dependencies
install_dependencies() {
    header "Install Dependencies"

    if ! command -v npm >/dev/null 2>&1; then
        error "npm not installed"
        exit 1
    fi

    info "Installing dependencies..."
    npm install

    if [ $? -eq 0 ]; then
        success "Dependencies installed"
    else
        error "Failed to install dependencies"
        exit 1
    fi
}

# Parse arguments
COMMAND="start"
TARGET_FRONTEND=false
TARGET_BACKEND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|logs|check|install)
            COMMAND=$1
            shift
            ;;
        --frontend)
            TARGET_FRONTEND=true
            shift
            ;;
        --backend)
            TARGET_BACKEND=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default to both if neither specified
if [ "$TARGET_FRONTEND" = false ] && [ "$TARGET_BACKEND" = false ]; then
    TARGET_FRONTEND=true
    TARGET_BACKEND=true
fi

# Main logic
main() {
    init_pid_dir

    case $COMMAND in
        check)
            check_environment
            exit $?
            ;;

        install)
            install_dependencies
            exit 0
            ;;

        start)
            header "Starting Services"

            if ! check_environment; then
                echo ""
                error "Environment check failed, cannot start"
                info "Run: ./manage.sh check"
                exit 1
            fi

            if [ "$TARGET_FRONTEND" = true ]; then
                start_frontend
            fi

            if [ "$TARGET_BACKEND" = true ]; then
                start_backend
            fi

            echo ""
            success "Services started successfully"
            info "Run './manage.sh status' to check status"
            info "Run './manage.sh logs' to view logs"
            info "Run './manage.sh stop' to stop services"
            ;;

        stop)
            header "Stopping Services"

            if [ "$TARGET_FRONTEND" = true ]; then
                stop_service "Frontend" "$FRONTEND_PID"
            fi

            if [ "$TARGET_BACKEND" = true ]; then
                stop_service "Backend" "$BACKEND_PID"
            fi

            echo ""
            success "Services stopped"
            ;;

        restart)
            header "Restarting Services"

            if [ "$TARGET_FRONTEND" = true ]; then
                stop_service "Frontend" "$FRONTEND_PID"
                sleep 1
                start_frontend
            fi

            if [ "$TARGET_BACKEND" = true ]; then
                stop_service "Backend" "$BACKEND_PID"
                sleep 1
                start_backend
            fi

            echo ""
            success "Services restarted"
            ;;

        status)
            header "Service Status"

            local frontend_running=false
            local backend_running=false

            if [ "$TARGET_FRONTEND" = true ]; then
                get_status "Frontend" "$FRONTEND_PID" "http://localhost:5173" && frontend_running=true
            fi

            if [ "$TARGET_BACKEND" = true ]; then
                get_status "Backend" "$BACKEND_PID" "http://localhost:8787" && backend_running=true
            fi

            echo ""
            if [ "$frontend_running" = true ] || [ "$backend_running" = true ]; then
                success "At least one service is running"
            else
                warning "No services are running"
                info "Run: ./manage.sh start"
            fi
            ;;

        logs)
            if [ "$TARGET_FRONTEND" = true ]; then
                show_logs "Frontend" "$FRONTEND_LOG"
            fi

            if [ "$TARGET_BACKEND" = true ]; then
                show_logs "Backend" "$BACKEND_LOG"
            fi
            ;;
    esac
}

main
