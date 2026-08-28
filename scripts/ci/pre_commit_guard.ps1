param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $RepoRoot

try {
    function Invoke-GuardStep {
        param(
            [Parameter(Mandatory = $true)]
            [string]$Label,
            [Parameter(Mandatory = $true)]
            [scriptblock]$Command
        )

        Write-Host ""
        Write-Host "==> $Label"
        & $Command

        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE"
        }
    }

    Write-Host "Pre-commit guardrail"
    Write-Host "Repository: $RepoRoot"

    Invoke-GuardStep "changed-surface quick checks" { npm run checks:changed:quick }
    Invoke-GuardStep "secret audit" { npm run security:secrets }
    Invoke-GuardStep "git diff check" { git diff --check }

    Write-Host ""
    Write-Host "Pre-commit guardrail passed."
} finally {
    Pop-Location
}
