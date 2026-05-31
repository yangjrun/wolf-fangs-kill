# Wolf Fangs Kill - Frontend and Backend Startup Script
# Usage: .\start.ps1 [options]
# Options:
#   -Frontend    Start frontend only
#   -Backend     Start backend only
#   -Check       Check environment and dependencies
#   -Install     Install dependencies
#   -Help        Show help information

param(
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Check,
    [switch]$Install,
    [switch]$Help
)

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

# Show help information
function Show-Help {
    Write-Host @"

Wolf Fangs Kill - Startup Script

Usage:
    .\start.ps1                Start frontend and backend (default)
    .\start.ps1 -Frontend      Start frontend only
    .\start.ps1 -Backend       Start backend only
    .\start.ps1 -Check         Check environment and dependencies
    .\start.ps1 -Install       Install dependencies
    .\start.ps1 -Help          Show this help

Examples:
    # Start full development environment
    .\start.ps1

    # Start frontend only (for frontend development)
    .\start.ps1 -Frontend

    # Start backend only (for backend development)
    .\start.ps1 -Backend

    # Check environment configuration
    .\start.ps1 -Check

    # Install all dependencies
    .\start.ps1 -Install

Ports:
    Frontend: http://localhost:5173
    Backend: http://localhost:8787

Environment Variables:
    Configure in packages/backend/.env:
    - ANTHROPIC_API_KEY: Claude API key
    - PORT: Backend port (default 8787)
    - ANTHROPIC_BASE_URL: API base URL (optional)

"@ -ForegroundColor White
}

# Check if command exists
function Test-Command {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check environment
function Test-Environment {
    Write-Header "Environment Check"

    $allGood = $true

    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-Success "Node.js: $nodeVersion"

        # Check version >= 20
        $version = [version]($nodeVersion -replace 'v', '')
        if ($version.Major -lt 20) {
            Write-Error "Node.js version too old, need >= 20.0.0"
            $allGood = $false
        }
    } else {
        Write-Error "Node.js not installed"
        Write-Info "Visit https://nodejs.org/ to download"
        $allGood = $false
    }

    # Check npm
    if (Test-Command "npm") {
        $npmVersion = npm --version
        Write-Success "npm: $npmVersion"
    } else {
        Write-Error "npm not installed"
        Write-Info "npm comes with Node.js"
        $allGood = $false
    }

    # Check Bun
    if (Test-Command "bun") {
        $bunVersion = bun --version
        Write-Success "Bun: $bunVersion"
    } else {
        Write-Warning "Bun not installed (required for backend)"
        Write-Info "Visit https://bun.sh/ to install"
        if ($Backend -or (-not $Frontend -and -not $Backend)) {
            $allGood = $false
        }
    }

    # Check node_modules
    if (Test-Path "node_modules") {
        Write-Success "Dependencies installed"
    } else {
        Write-Warning "Dependencies not installed"
        Write-Info "Run: .\start.ps1 -Install"
        $allGood = $false
    }

    # Check backend environment variables
    $envFile = "packages\backend\.env"
    if (Test-Path $envFile) {
        Write-Success "Backend .env file exists"

        # Check API key
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match "ANTHROPIC_API_KEY=sk-ant-") {
            Write-Success "API Key configured"
        } else {
            Write-Warning "API Key not configured or invalid format"
            Write-Info "Set ANTHROPIC_API_KEY in $envFile"
        }
    } else {
        Write-Warning "Backend .env file does not exist"
        Write-Info "Create $envFile and set ANTHROPIC_API_KEY"
        if ($Backend -or (-not $Frontend -and -not $Backend)) {
            Write-Info "Example content:"
            Write-Host "ANTHROPIC_API_KEY=sk-ant-your-key-here" -ForegroundColor Gray
            Write-Host "PORT=8787" -ForegroundColor Gray
        }
    }

    Write-Host ""
    if ($allGood) {
        Write-Success "Environment check passed!"
        return $true
    } else {
        Write-Error "Environment check failed, please fix the issues above"
        return $false
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Header "Install Dependencies"

    if (-not (Test-Command "npm")) {
        Write-Error "npm not installed, cannot continue"
        Write-Info "npm comes with Node.js"
        exit 1
    }

    Write-Info "Installing dependencies..."
    npm install

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed successfully"
    } else {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

# Start frontend
function Start-Frontend {
    Write-Header "Start Frontend"
    Write-Info "Frontend URL: http://localhost:5173"
    Write-Info "Press Ctrl+C to stop"
    Write-Host ""

    npm run dev
}

# Start backend
function Start-Backend {
    Write-Header "Start Backend"
    Write-Info "Backend URL: http://localhost:8787"
    Write-Info "Press Ctrl+C to stop"
    Write-Host ""

    npm run dev:backend
}

# Start both frontend and backend
function Start-All {
    Write-Header "Start Frontend and Backend"
    Write-Info "Frontend URL: http://localhost:5173"
    Write-Info "Backend URL: http://localhost:8787"
    Write-Info "Press Ctrl+C to stop"
    Write-Host ""

    npm run dev:all
}

# Main logic
try {
    # Show help
    if ($Help) {
        Show-Help
        exit 0
    }

    # Install dependencies
    if ($Install) {
        Install-Dependencies
        exit 0
    }

    # Check environment
    if ($Check) {
        $result = Test-Environment
        exit $(if ($result) { 0 } else { 1 })
    }

    # Check environment before starting
    Write-Info "Checking environment..."
    $envOk = Test-Environment

    if (-not $envOk) {
        Write-Host ""
        Write-Error "Environment check failed, cannot start"
        Write-Info "Run .\start.ps1 -Check for details"
        Write-Info "Run .\start.ps1 -Install to install dependencies"
        exit 1
    }

    # Start based on parameters
    if ($Frontend) {
        Start-Frontend
    } elseif ($Backend) {
        Start-Backend
    } else {
        Start-All
    }

} catch {
    Write-Host "Error occurred: $_" -ForegroundColor Red
    exit 1
}
