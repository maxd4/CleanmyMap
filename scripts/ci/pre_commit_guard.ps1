param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $RepoRoot

try {
    $GitIndexFile = $env:GIT_INDEX_FILE

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

    $stagedFiles = @(git diff --cached --name-only --diff-filter=ACMRTUXB -- |
        Where-Object { $_ -and $_.Trim() } |
        ForEach-Object { $_.Replace('\', '/') })

    $hasQuickFiles = @($stagedFiles | Where-Object {
            ($_ -like "apps/web/*" -and
            $_ -ne "apps/web/eslint.config.mjs" -and
            $_ -ne "apps/web/next.config.ts" -and
            $_ -match "\.(ts|tsx|js|jsx|mjs|cjs)$" -and
            $_ -notmatch "\.d\.ts$") -or
            $_ -match "\.py$"
        }).Count -gt 0

    $hasTypographyFiles = @($stagedFiles | Where-Object {
            $_ -match "^apps/web/src/.*\.(tsx|jsx|css|scss|html)$"
        }).Count -gt 0

    $hasSupabaseFiles = @($stagedFiles | Where-Object {
            $_ -like "apps/web/supabase/*"
        }).Count -gt 0

    $hasSqlFiles = @($stagedFiles | Where-Object {
            $_ -match "\.sql$" -or $_ -like "apps/web/supabase/*"
        }).Count -gt 0

    Invoke-GuardStep "staged canonical workspace sentinels" { node scripts/checks/check-canonical-workspaces.mjs --staged }

    if ($hasQuickFiles) {
        $powerShellExe = (Get-Process -Id $PID).Path
        if (-not $powerShellExe) {
            $pwshCmd = Get-Command pwsh -ErrorAction SilentlyContinue
            $powerShellExe = if ($pwshCmd) { $pwshCmd.Source } else { "powershell" }
        }
        Invoke-GuardStep "staged-surface quick checks" { & $powerShellExe -NoProfile -ExecutionPolicy Bypass -File scripts/checks/check_changed_quick.ps1 -StagedOnly }
    } else {
        Write-Host "[skip] staged-surface quick checks: no staged web JS/TS or Python files"
    }

    if ($hasTypographyFiles) {
        Invoke-GuardStep "staged readable typography" { node scripts/checks/check-readable-typography.mjs --staged }
    } else {
        Write-Host "[skip] staged readable typography: no staged web UI/style files"
    }

    Invoke-GuardStep "staged secret audit" { node scripts/checks/secret-audit.mjs --staged-only }

    if ($hasSupabaseFiles) {
        Invoke-GuardStep "staged Supabase migration history" { node scripts/audits/audit-supabase-migration-trees.mjs --staged }
    } else {
        Write-Host "[skip] staged Supabase migration history: no staged Supabase files"
    }

    if ($hasSqlFiles) {
        Invoke-GuardStep "staged SQL syntax" { node scripts/ci/validate-sql-syntax.mjs --staged }
    } else {
        Write-Host "[skip] staged SQL syntax: no staged SQL or Supabase files"
    }

    Invoke-GuardStep "staged diff check" { git diff --cached --check }

    Write-Host ""
    Write-Host "Pre-commit guardrail passed."
} finally {
    if ($GitIndexFile) {
        $env:GIT_INDEX_FILE = $GitIndexFile
    }
    Pop-Location
}
