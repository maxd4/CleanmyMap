param(
    [switch]$SkipVercel
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
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

    $vercelProjectFiles = @(
        ".vercel/project.json",
        "apps/web/.vercel/project.json"
    ) | Where-Object { Test-Path -LiteralPath $_ }

    Write-Host "Pre-push guardrail"
    Write-Host "Repository: $RepoRoot"

    Invoke-GuardStep "root file hygiene" { npm run check:root-files }
    Invoke-GuardStep "documentation governance" { npm run check:doc-governance }
    Invoke-GuardStep "vercel quota audit" { npm run audit:vercel-quota }
    Invoke-GuardStep "vercel regression gates" { npm run test:regression-gates }
    Invoke-GuardStep "lint" { npm run lint }
    Invoke-GuardStep "typecheck" { npm run typecheck }
    Invoke-GuardStep "build" { npm run build }

    if ($SkipVercel) {
        Write-Host ""
        Write-Host "Vercel check skipped by flag."
        return
    }

    if ($vercelProjectFiles.Count -gt 0) {
        Write-Host ""
        Write-Host "Vercel project link detected:"
        $vercelProjectFiles | ForEach-Object { Write-Host "- $_" }
        Invoke-GuardStep "vercel build" { npx vercel build --yes }
    } else {
        Write-Host ""
        Write-Host "No Vercel project link detected; skipping vercel build."
    }

    Write-Host ""
    Write-Host "Pre-push guardrail passed."
} finally {
    Pop-Location
}
