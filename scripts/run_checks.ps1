param(
    [ValidateSet("changed", "full")]
    [string]$Scope = "changed",
    [switch]$SkipE2E,
    [switch]$SkipEncodingAutofix
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

function Invoke-Step([scriptblock]$Action, [string]$Label) {
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Write-Host "Scope: $Scope"
$changedFiles = @(Get-ChangedFiles)

Write-Host "Running UTF-8 normalization check..."
python scripts/normalize_utf8.py --root . --check --max-report 20
$encodingCheckExit = $LASTEXITCODE
if ($encodingCheckExit -ne 0) {
    if ($SkipEncodingAutofix) {
        throw "normalize_utf8 check failed with exit code $encodingCheckExit (auto-fix disabled)."
    }
    Write-Host "Encoding issues detected; applying automatic UTF-8 normalization..."
    Invoke-Step { python scripts/normalize_utf8.py --root . --write --max-report 20 } "normalize_utf8_write"
    Invoke-Step { python scripts/normalize_utf8.py --root . --check --max-report 20 } "normalize_utf8_recheck"
}

if ($Scope -eq "full") {
    Write-Host "Running Python static compilation (full tracked set)..."
    $pythonFiles = @(git ls-files '*.py')
} else {
    $pythonFiles = @($changedFiles | Where-Object { $_ -like '*.py' })
    Write-Host "Running Python static compilation (changed files only)..."
}

foreach ($f in $pythonFiles) {
    if (Test-Path -LiteralPath $f) {
        Invoke-Step { python -m py_compile $f } "py_compile($f)"
    }
}

Write-Host "Running cleanup diagnostic check (non-destructive)..."
Invoke-Step { python scripts/ci_cleanup.py --root . --check } "ci_cleanup"

Write-Host "Running runtime SQLite tracking guardrail..."
Invoke-Step { python scripts/check_runtime_db_tracking.py --root . } "runtime_db_tracking"

if ($Scope -eq "full") {
    Write-Host "Running unit tests (full suite)..."
    Invoke-Step { pytest -q } "pytest_full"
} else {
    $changedTestFiles = @($changedFiles | Where-Object { $_ -like 'tests/*.py' })
    if ($changedTestFiles.Count -gt 0) {
        Write-Host "Running unit tests (changed test files only)..."
        Invoke-Step { pytest -q $changedTestFiles } "pytest_changed"
    } else {
        Write-Host "No changed test files detected; running targeted maintenance smoke tests."
        Invoke-Step { pytest -q tests/test_cleanup_audit.py tests/test_ui_inventory_cli.py tests/test_normalize_utf8.py } "pytest_smoke"
    }
}

if (-not $SkipE2E) {
    if ($Scope -eq "full") {
        Write-Host "Running E2E tests (full)..."
        Invoke-Step { npx.cmd playwright test --config tests/e2e/playwright.config.cjs } "playwright"
    } else {
        Write-Host "Skipping full E2E in changed scope. Use -Scope full to force."
    }
} else {
    Write-Host "E2E skipped by flag."
}
