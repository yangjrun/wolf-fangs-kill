# Wolf Fangs Kill - Frontend and Backend Management Script
# Usage: .\manage.ps1 [command] [options]
# Commands:
#   start        Start services (default)
#   stop         Stop services
#   restart      Restart services
#   status       Check service status
#   logs         View logs
# Options:
#   -Frontend    Target frontend only
#   -Backend     Target backend only
#   -Check       Check environment
#   -Install     Install dependencies
#   -Help        Show help

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'check', 'install')]
    [string]$Command = 'start',

    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Check,
    [switch]$Install,
    [switch]$Help
)

# PID file locations
$PID_DIR = ".\.pids"
$FRONTEND_PID = "$PID_DIR\frontend.pid"
$BACKEND_PID = "$PID_DIR\backend.pid"
$FRONTEND_LOG = "$PID_DIR\frontend.log"
$BACKEND_LOG = "$PID_DIR\backend.log"

# Color output functions
function Write-Success {
    param([string]$Message)
    Write-Host "OK $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "X $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "i $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "! $Message" -ForegroundColor Yellow
}

function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host " $Message" -ForegroundColor Magenta
    Write-Host "========================================`n" -ForegroundColor Magenta
}

# Show help
function Show-Help {
    Write-Host @"

Wolf Fangs Kill - Service Management Script

Usage:
    .\manage.ps1 [command] [options]

Commands:
    start        Start services (default)
    stop         Stop services
    restart      Restart services
    status       Check service status
    logs         View logs
    check        Check environment
    install      Install dependencies

Options:
    -Frontend    Target frontend only
    -Backend     Target backend only
    -Help        Show this help

Examples:
    # Start all services
    .\manage.ps1 start

    # Start frontend only
    .\manage.ps1 start -Frontend

    # Stop all services
    .\manage.ps1 stop

    # Restart backend
    .\manage.ps1 restart -Backend

    # Check service status
    .\manage.ps1 status

    # View logs
    .\manage.ps1 logs

    # Check environment
    .\manage.ps1 check

Ports:
    Frontend: http://localhost:5173
    Backend: http://localhost:8787

"@ -ForegroundColor White
}

# Ensure PID directory exists
function Initialize-PidDirectory {
    if (-not (Test-Path $PID_DIR)) {
        New-Item -ItemType Directory -Path $PID_DIR -Force | Out-Null
    }
}

# Check if process is running
function Test-ProcessRunning {
    param([string]$PidFile)

    if (-not (Test-Path $PidFile)) {
        return $false
    }

    $pid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if (-not $pid) {
        return $false
    }

    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    return $null -ne $process
}

# Start frontend
function Start-Frontend {
    Write-Info "Starting frontend..."

    if (Test-ProcessRunning $FRONTEND_PID) {
        Write-Warning "Frontend is already running"
        return
    }

    # Start frontend in background
    $process = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd '$PWD'; npm dev > '$FRONTEND_LOG' 2>&1" -PassThru -WindowStyle Hidden
    $process.Id | Out-File $FRONTEND_PID

    Start-Sleep -Seconds 2

    if (Test-ProcessRunning $FRONTEND_PID) {
        Write-Success "Frontend started (PID: $($process.Id))"
        Write-Info "URL: http://localhost:5173"
        Write-Info "Log: $FRONTEND_LOG"
    } else {
        Write-Error "Failed to start frontend"
        if (Test-Path $FRONTEND_LOG) {
            Write-Info "Check log file: $FRONTEND_LOG"
        }
    }
}

# Start backend
function Start-Backend {
    Write-Info "Starting backend..."

    if (Test-ProcessRunning $BACKEND_PID) {
        Write-Warning "Backend is already running"
        return
    }

    # Start backend in background
    $process = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd '$PWD'; npm dev:backend > '$BACKEND_LOG' 2>&1" -PassThru -WindowStyle Hidden
    $process.Id | Out-File $BACKEND_PID

    Start-Sleep -Seconds 2

    if (Test-ProcessRunning $BACKEND_PID) {
        Write-Success "Backend started (PID: $($process.Id))"
        Write-Info "URL: http://localhost:8787"
        Write-Info "Log: $BACKEND_LOG"
    } else {
        Write-Error "Failed to start backend"
        if (Test-Path $BACKEND_LOG) {
            Write-Info "Check log file: $BACKEND_LOG"
        }
    }
}

# Stop service
function Stop-Service {
    param(
        [string]$Name,
        [string]$PidFile
    )

    Write-Info "Stopping $Name..."

    if (-not (Test-ProcessRunning $PidFile)) {
        Write-Warning "$Name is not running"
        return
    }

    $pid = Get-Content $PidFile

    try {
        # Try graceful shutdown first
        Stop-Process -Id $pid -ErrorAction Stop
        Start-Sleep -Seconds 1

        # Force kill if still running
        if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
            Stop-Process -Id $pid -Force -ErrorAction Stop
        }

        Remove-Item $PidFile -ErrorAction SilentlyContinue
        Write-Success "$Name stopped"
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "X Failed to stop $Name : $errorMsg" -ForegroundColor Red
    }
}

# Get service status
function Get-ServiceStatus {
    param(
        [string]$Name,
        [string]$PidFile,
        [string]$Url
    )

    if (Test-ProcessRunning $PidFile) {
        $pid = Get-Content $PidFile
        Write-Success "$Name is running (PID: $pid)"
        Write-Info "URL: $Url"
        return $true
    } else {
        Write-Warning "$Name is not running"
        return $false
    }
}

# View logs
function Show-Logs {
    param(
        [string]$Name,
        [string]$LogFile
    )

    if (-not (Test-Path $LogFile)) {
        Write-Warning "No log file found for $Name"
        return
    }

    Write-Header "$Name Logs"
    Get-Content $LogFile -Tail 50
}

# Check environment
function Test-Environment {
    Write-Header "Environment Check"

    $allGood = $true

    # Check Node.js
    if (Get-Command "node" -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        Write-Success "Node.js: $nodeVersion"

        $version = [version]($nodeVersion -replace 'v', '')
        if ($version.Major -lt 20) {
            Write-Error "Node.js version too old, need >= 20.0.0"
            $allGood = $false
        }
    } else {
        Write-Error "Node.js not installed"
        $allGood = $false
    }

    # Check npm
    if (Get-Command "npm" -ErrorAction SilentlyContinue) {
        $npmVersion = npm --version
        Write-Success "npm: $npmVersion"
    } else {
        Write-Error "npm not installed"
        $allGood = $false
    }

    # Check Bun
    if (Get-Command "bun" -ErrorAction SilentlyContinue) {
        $bunVersion = bun --version
        Write-Success "Bun: $bunVersion"
    } else {
        Write-Warning "Bun not installed (required for backend)"
        if ($Backend -or (-not $Frontend -and -not $Backend)) {
            $allGood = $false
        }
    }

    # Check dependencies
    if (Test-Path "node_modules") {
        Write-Success "Dependencies installed"
    } else {
        Write-Warning "Dependencies not installed"
        Write-Info "Run: .\manage.ps1 install"
        $allGood = $false
    }

    Write-Host ""
    if ($allGood) {
        Write-Success "Environment check passed!"
        return $true
    } else {
        Write-Error "Environment check failed"
        return $false
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Header "Install Dependencies"

    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
        Write-Error "npm not installed"
        exit 1
    }

    Write-Info "Installing dependencies..."
    npm install

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed"
    } else {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

# Main logic
try {
    Initialize-PidDirectory

    # Handle help
    if ($Help) {
        Show-Help
        exit 0
    }

    # Handle check command
    if ($Command -eq 'check' -or $Check) {
        $result = Test-Environment
        exit $(if ($result) { 0 } else { 1 })
    }

    # Handle install command
    if ($Command -eq 'install' -or $Install) {
        Install-Dependencies
        exit 0
    }

    # Determine target services
    $targetFrontend = $Frontend -or (-not $Backend)
    $targetBackend = $Backend -or (-not $Frontend)

    # Handle commands
    switch ($Command) {
        'start' {
            Write-Header "Starting Services"

            # Check environment first
            if (-not (Test-Environment)) {
                Write-Host ""
                Write-Error "Environment check failed, cannot start"
                Write-Info "Run: .\manage.ps1 check"
                exit 1
            }

            if ($targetFrontend) { Start-Frontend }
            if ($targetBackend) { Start-Backend }

            Write-Host ""
            Write-Success "Services started successfully"
            Write-Info "Run '.\manage.ps1 status' to check status"
            Write-Info "Run '.\manage.ps1 logs' to view logs"
            Write-Info "Run '.\manage.ps1 stop' to stop services"
        }

        'stop' {
            Write-Header "Stopping Services"

            if ($targetFrontend) { Stop-Service "Frontend" $FRONTEND_PID }
            if ($targetBackend) { Stop-Service "Backend" $BACKEND_PID }

            Write-Host ""
            Write-Success "Services stopped"
        }

        'restart' {
            Write-Header "Restarting Services"

            if ($targetFrontend) {
                Stop-Service "Frontend" $FRONTEND_PID
                Start-Sleep -Seconds 1
                Start-Frontend
            }

            if ($targetBackend) {
                Stop-Service "Backend" $BACKEND_PID
                Start-Sleep -Seconds 1
                Start-Backend
            }

            Write-Host ""
            Write-Success "Services restarted"
        }

        'status' {
            Write-Header "Service Status"

            $frontendRunning = Get-ServiceStatus "Frontend" $FRONTEND_PID "http://localhost:5173"
            $backendRunning = Get-ServiceStatus "Backend" $BACKEND_PID "http://localhost:8787"

            Write-Host ""
            if ($frontendRunning -or $backendRunning) {
                Write-Success "At least one service is running"
            } else {
                Write-Warning "No services are running"
                Write-Info "Run: .\manage.ps1 start"
            }
        }

        'logs' {
            if ($targetFrontend) { Show-Logs "Frontend" $FRONTEND_LOG }
            if ($targetBackend) { Show-Logs "Backend" $BACKEND_LOG }
        }
    }

} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "Error occurred: $errorMsg" -ForegroundColor Red
    exit 1
}
