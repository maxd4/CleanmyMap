param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $RepoRoot

try {
    $GitIndexFile = $env:GIT_INDEX_FILE
    Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue

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

    Invoke-GuardStep "staged canonical workspace sentinels" { node scripts/checks/check-canonical-workspaces.mjs --staged }
    Invoke-GuardStep "staged complexity and function-length targets" { node scripts/checks/check-complexity-policy.mjs --staged }
    $StagedTree = (& git write-tree).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $StagedTree) { throw "Unable to resolve the staged Git tree." }
    Invoke-GuardStep "staged top-heavy ratchets" { node scripts/checks/check-top-heavy-files.mjs --enforce "--ref=$StagedTree" }
    Invoke-GuardStep "staged-surface quick checks" { npm run checks:staged:quick }
    Invoke-GuardStep "staged readable typography" { npm run check:readable-typography -- --staged }
    Invoke-GuardStep "staged secret audit" { npm run security:secrets -- --staged-only }
    Invoke-GuardStep "staged diff check" { git diff --cached --check }

    Write-Host ""
    Write-Host "Pre-commit guardrail passed."
} finally {
    if ($GitIndexFile) {
        $env:GIT_INDEX_FILE = $GitIndexFile
    }
    Pop-Location
}
