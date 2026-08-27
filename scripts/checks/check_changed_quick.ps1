<#
.SYNOPSIS
Run fast, targeted checks on changed files only.

.DESCRIPTION
Designed for local iteration:
- lints only changed web JS/TS files
- runs tests only for changed web test files
- compiles changed Python files
- optional web build via -IncludeBuild

This script is additive and does not replace CI checks.
#>
param(
    [switch]$IncludeBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ChangedFiles {
    $changed = @()
    $changed += git diff --name-only --diff-filter=ACMRTUXB HEAD --
    $changed += git diff --cached --name-only --diff-filter=ACMRTUXB --
    $changed += git ls-files --others --exclude-standard
    return $changed | Where-Object { $_ -and $_.Trim() } | Sort-Object -Unique
}

function Invoke-Step([string]$Label, [scriptblock]$Action) {
    Write-Host "[quick] $Label"
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

$changedFiles = @(Get-ChangedFiles)
if ($changedFiles.Count -eq 0) {
    Write-Host "[quick] No changed files detected."
    exit 0
}

$webSourceFiles = @($changedFiles | Where-Object {
        $_ -like "apps/web/*" -and $_ -match "\.(ts|tsx|js|jsx|mjs|cjs)$" -and $_ -notmatch "\.d\.ts$"
    })

$webTestFiles = @($webSourceFiles | Where-Object { $_ -match "(\.test|\.spec)\.(ts|tsx|js|jsx)$" })
$webSourceFilesRelative = @($webSourceFiles | ForEach-Object { $_ -replace '^apps/web/', '' })
$webTestFilesRelative = @($webTestFiles | ForEach-Object { $_ -replace '^apps/web/', '' })

$pythonFiles = @($changedFiles | Where-Object { $_ -match "\.py$" })

Write-Host "[quick] changed total: $($changedFiles.Count)"
Write-Host "[quick] changed web source files: $($webSourceFiles.Count)"
Write-Host "[quick] changed web test files: $($webTestFiles.Count)"
Write-Host "[quick] changed python files: $($pythonFiles.Count)"

if ($webSourceFiles.Count -gt 0) {
    Invoke-Step "eslint (changed web files)" {
        & npm.cmd --prefix apps/web run lint -- @webSourceFilesRelative
    }
} else {
    Write-Host "[quick] Skip eslint (no changed web source files)."
}

if ($webTestFiles.Count -gt 0) {
    Invoke-Step "vitest (changed web test files)" {
        & npm.cmd --prefix apps/web run test -- @webTestFilesRelative
    }
} else {
    Write-Host "[quick] Skip vitest (no changed web test files)."
}

foreach ($file in $pythonFiles) {
    if (Test-Path -LiteralPath $file) {
        Invoke-Step "py_compile($file)" {
            & python -m py_compile $file
        }
    }
}

if ($IncludeBuild) {
    Invoke-Step "next build (apps/web)" {
        & npm.cmd --prefix apps/web run build
    }
} else {
    Write-Host "[quick] Skip build (use -IncludeBuild to enable)."
}

Write-Host "[quick] Done."
