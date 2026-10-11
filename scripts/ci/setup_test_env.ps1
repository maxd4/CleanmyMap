Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$pythonRoot = Join-Path $repoRoot "maintenance\python"

Write-Host "Installing Python dependencies..."
python -m pip install -r (Join-Path $pythonRoot "requirements-dev.txt") -c (Join-Path $pythonRoot "requirements-lock.txt")

Write-Host "Installing Node dependencies..."
Push-Location $repoRoot
try {
    npm ci
}
finally {
    Pop-Location
}

Write-Host "Test environment ready."
