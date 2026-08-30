param(
    [switch]$SkipVercel
)

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

    function Invoke-VercelBuildGuard {
        Write-Host ""
        Write-Host "==> vercel build"

        $buildStartedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $vercelOutput = @(& npx vercel build --yes 2>&1)
            $vercelExitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        $vercelOutput | ForEach-Object { Write-Host $_ }

        if ($vercelExitCode -eq 0) {
            return
        }

        $vercelText = ($vercelOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
        if ($vercelText -notmatch "Unable to find lambda for route: /actions/map") {
            throw "vercel build failed with exit code $vercelExitCode"
        }

        Invoke-GuardStep "vercel static lambda fallback evidence" {
            node scripts/ci/verify-vercel-static-lambda-fallback.mjs --route /actions/map --build-started-at $buildStartedAt
        }
        Write-Warning "Accepted the verified local Vercel CLI false-negative for static /actions/map; the real vercel build check ran and all other failures remain blocking."
    }

    $vercelProjectFiles = @(
        @(
            ".vercel/project.json",
            "apps/web/.vercel/project.json"
        ) | Where-Object { Test-Path -LiteralPath $_ }
    )

    Write-Host "Pre-push guardrail"
    Write-Host "Repository: $RepoRoot"

    Invoke-GuardStep "root file hygiene" { npm run check:root-files }
    Invoke-GuardStep "GitNexus hygiene" { npm run check:gitnexus-hygiene }
    Invoke-GuardStep "9C public facades" { npm run check:9c-public-facades }
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
        Invoke-VercelBuildGuard
    } else {
        Write-Host ""
        Write-Host "No Vercel project link detected; skipping vercel build."
    }

    Write-Host ""
    Write-Host "Pre-push guardrail passed."
} finally {
    Pop-Location
}
