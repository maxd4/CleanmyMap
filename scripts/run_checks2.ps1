param(
    [ValidateSet("changed", "full")]
    [string]$Scope = "changed",
    [switch]$SkipBuild,
    [switch]$IncludeE2E,
    [switch]$SkipE2E,
    [switch]$SkipEncodingAutofix
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($IncludeE2E -and $SkipE2E) {
    throw "Use either -IncludeE2E or -SkipE2E, not both."
}

function Get-ChangedFiles {
    $changed = @()
    $changed += git diff --name-only --diff-filter=ACMRTUXB HEAD --
    $changed += git diff --cached --name-only --diff-filter=ACMRTUXB --
    $changed += git ls-files --others --exclude-standard
    return $changed | Where-Object { $_ -and $_.Trim() } | Sort-Object -Unique
}

function Invoke-Step([scriptblock]$Action, [string]$Label) {
    Write-Host ""
    Write-Host "==> $Label"
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

function Test-AnyChangedFile([string[]]$Files, [scriptblock]$Predicate) {
    foreach ($file in $Files) {
        if (& $Predicate $file) {
            return $true
        }
    }
    return $false
}

Write-Host "CleanMyMap checks"
Write-Host "Scope: $Scope"

$changedFiles = @(Get-ChangedFiles)

$webRelevant = $Scope -eq "full" -or (Test-AnyChangedFile $changedFiles {
    param($file)
    return (
        $file -like "apps/web/*" -or
        $file -eq "package.json" -or
        $file -eq "package-lock.json" -or
        $file -like "scripts/*" -or
        $file -like ".github/*"
    )
})

$buildRelevant = $Scope -eq "full" -or (Test-AnyChangedFile $changedFiles {
    param($file)
    return (
        $file -eq "package.json" -or
        $file -eq "package-lock.json" -or
        $file -eq "apps/web/package.json" -or
        $file -like "apps/web/next.config.*" -or
        $file -like "apps/web/src/app/*" -or
        $file -eq "apps/web/src/proxy.ts" -or
        $file -like "apps/web/src/lib/env*"
    )
})

$companionRelevant = $Scope -eq "full" -or (Test-AnyChangedFile $changedFiles {
    param($file)
    return $file -like "companion-app/*" -and $file -notlike "companion-app/*.md"
})

$pythonRelevant = $Scope -eq "full" -or (Test-AnyChangedFile $changedFiles {
    param($file)
    return $file -like "maintenance/python/*.py" -or $file -like "maintenance/python/*/*.py"
})

# Always-on repository and security governance.
Invoke-Step { npm run security:secrets } "security:secrets"
Invoke-Step { npm run check:root-files } "check:root-files"
Invoke-Step { npm run check:doc-governance } "check:doc-governance"
Invoke-Step { npm run check:stack-doc-drift } "check:stack-doc-drift"
Invoke-Step { npm run check:agent-skills } "check:agent-skills"
Invoke-Step { npm run check:doc-visuals } "check:doc-visuals"

# UTF-8 normalization remains available when Python is installed.
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($null -ne $pythonCommand) {
    Write-Host ""
    Write-Host "==> UTF-8 normalization check"
    python maintenance/python/scripts/normalize_utf8.py --root . --check --max-report 20
    $encodingCheckExit = $LASTEXITCODE

    if ($encodingCheckExit -ne 0) {
        if ($SkipEncodingAutofix) {
            throw "normalize_utf8 check failed with exit code $encodingCheckExit (auto-fix disabled)."
        }

        Invoke-Step {
            python maintenance/python/scripts/normalize_utf8.py --root . --write --max-report 20
        } "normalize_utf8_write"

        Invoke-Step {
            python maintenance/python/scripts/normalize_utf8.py --root . --check --max-report 20
        } "normalize_utf8_recheck"
    }
} else {
    Write-Warning "Python not found; UTF-8 Python normalization check skipped."
}

if ($webRelevant) {
    Invoke-Step { npm run check:lockfile-policy } "check:lockfile-policy"
    Invoke-Step { npm run typecheck } "typecheck"
    Invoke-Step { npm run lint } "lint"
    Invoke-Step { npm run test } "test"
    Invoke-Step { npm run test:security } "test:security"
    Invoke-Step { npm run test:regression-gates } "test:regression-gates"
    Invoke-Step { npm run audit:vercel:ci } "audit:vercel:ci"

    if ($buildRelevant -and -not $SkipBuild) {
        Invoke-Step { npm run build } "build"
    } elseif ($SkipBuild) {
        Write-Host "Build skipped by -SkipBuild."
    } else {
        Write-Host "Build skipped: changed scope does not require a production build."
    }
} else {
    Write-Host "No web-relevant changes detected; web quality gates skipped."
}

if ($companionRelevant) {
    Invoke-Step { npm --prefix companion-app run typecheck } "companion:typecheck"
}

if ($pythonRelevant) {
    if ($null -eq $pythonCommand) {
        throw "Python changes are in scope but Python is not available."
    }

    $pythonFiles = if ($Scope -eq "full") {
        @(git ls-files 'maintenance/python/src/*.py' 'maintenance/python/scripts/*.py')
    } else {
        @($changedFiles | Where-Object {
            $_ -like 'maintenance/python/src/*.py' -or
            $_ -like 'maintenance/python/scripts/*.py'
        })
    }

    foreach ($file in $pythonFiles) {
        if (Test-Path -LiteralPath $file) {
            Invoke-Step { python -m py_compile $file } "py_compile($file)"
        }
    }

    Invoke-Step {
        python maintenance/python/scripts/ci_cleanup.py --root . --check
    } "ci_cleanup"

    Invoke-Step {
        python maintenance/python/scripts/check_runtime_db_tracking.py --root .
    } "runtime_db_tracking"

    if ($Scope -eq "full") {
        Invoke-Step { pytest -q maintenance/python/tests } "pytest_full"
    }
}

if ($IncludeE2E) {
    Invoke-Step { npm run test:e2e } "test:e2e"
} elseif ($SkipE2E) {
    Write-Host "E2E skipped by -SkipE2E (legacy-compatible flag)."
} else {
    Write-Host "E2E not requested. Use -IncludeE2E to run Playwright."
}

Write-Host ""
Write-Host "CleanMyMap checks passed for scope '$Scope'."
