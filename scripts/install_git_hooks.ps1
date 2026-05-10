param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
    $hooksPath = ".githooks"
    if (-not (Test-Path -LiteralPath $hooksPath)) {
        throw "Hooks directory not found: $hooksPath"
    }

    git config core.hooksPath $hooksPath
    Write-Host "Configured git core.hooksPath to '$hooksPath'."
    Write-Host "Active hooks:"
    Get-ChildItem -Path $hooksPath -File | ForEach-Object { Write-Host "- $($_.Name)" }
} finally {
    Pop-Location
}
