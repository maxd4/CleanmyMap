Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Installing Python dependencies..."
python -m pip install -r requirements-dev.txt

Write-Host "Installing Node dependencies..."
npm ci

Write-Host "Test environment ready."
