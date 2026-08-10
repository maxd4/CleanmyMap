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

function Invoke-ParallelSteps {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Steps,
        [ValidateRange(1, 8)]
        [int]$ThrottleLimit = 3
    )

    if ($Steps.Count -eq 0) {
        return
    }

    $repoRoot = (Get-Location).Path
    $pending = [System.Collections.Queue]::new()
    foreach ($step in $Steps) {
        $pending.Enqueue($step)
    }

    $running = @{}
    $failures = @()
    $jobScript = {
        param(
            [string]$RepoRoot,
            [string]$Label,
            [string]$Command
        )

        Set-StrictMode -Version Latest
        $ErrorActionPreference = "Stop"
        Set-Location -LiteralPath $RepoRoot
        $output = [System.Collections.Generic.List[string]]::new()

        try {
            Invoke-Expression $Command 2>&1 | ForEach-Object {
                [void]$output.Add([string]$_)
            }
            $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
        } catch {
            [void]$output.Add($_.Exception.Message)
            $exitCode = 1
        }

        [pscustomobject]@{
            Label = $Label
            ExitCode = $exitCode
            Output = $output.ToArray()
        }
    }

    while ($pending.Count -gt 0 -or $running.Count -gt 0) {
        while ($pending.Count -gt 0 -and $running.Count -lt $ThrottleLimit) {
            $step = $pending.Dequeue()
            $job = Start-Job -ScriptBlock $jobScript -ArgumentList @(
                $repoRoot,
                $step.Label,
                $step.Command
            )
            $running[$job.Id] = $job
        }

        $completed = @($running.Values | Where-Object {
            $_.State -in @("Completed", "Failed", "Stopped")
        })
        if ($completed.Count -eq 0) {
            Start-Sleep -Milliseconds 100
            continue
        }

        foreach ($job in $completed) {
            $received = @(Receive-Job -Job $job -ErrorAction SilentlyContinue)
            $result = @($received | Where-Object {
                $_.PSObject.Properties.Name -contains "ExitCode"
            } | Select-Object -Last 1)

            if ($result.Count -eq 0) {
                $failures += "parallel job $($job.Id) did not return a result"
            } else {
                $stepResult = $result[0]
                Write-Host ""
                Write-Host "==> $($stepResult.Label) [parallel]"
                foreach ($line in @($stepResult.Output)) {
                    Write-Host $line
                }
                if ($stepResult.ExitCode -ne 0) {
                    $failures += "$($stepResult.Label) failed with exit code $($stepResult.ExitCode)"
                }
            }

            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
            [void]$running.Remove($job.Id)
        }
    }

    if ($failures.Count -gt 0) {
        throw ("Parallel checks failed:`n- " + ($failures -join "`n- "))
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

# Always-on repository and security governance are read-only and independent.
Invoke-ParallelSteps @(
    [pscustomobject]@{ Label = "security:secrets"; Command = "npm run security:secrets" },
    [pscustomobject]@{ Label = "check:root-files"; Command = "npm run check:root-files" },
    [pscustomobject]@{ Label = "check:doc-governance"; Command = "npm run check:doc-governance" },
    [pscustomobject]@{ Label = "check:stack-doc-drift"; Command = "npm run check:stack-doc-drift" },
    [pscustomobject]@{ Label = "check:agent-skills"; Command = "npm run check:agent-skills" },
    [pscustomobject]@{ Label = "check:doc-visuals"; Command = "npm run check:doc-visuals" }
) 3

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
    # These read-only static gates are independent and safe to run concurrently.
    $staticWebSteps = @(
        [pscustomobject]@{ Label = "check:lockfile-policy"; Command = "npm run check:lockfile-policy" },
        [pscustomobject]@{ Label = "typecheck"; Command = "npm run typecheck" },
        [pscustomobject]@{ Label = "lint"; Command = "npm run lint" },
        [pscustomobject]@{ Label = "audit:vercel:ci"; Command = "npm run audit:vercel:ci" }
    )

    if ($companionRelevant) {
        $staticWebSteps += [pscustomobject]@{
            Label = "companion:typecheck"
            Command = "npm --prefix companion-app run typecheck"
        }
    }

    Invoke-ParallelSteps $staticWebSteps 4

    # The full Vitest command includes every src/**/*.test.ts file. This guard
    # prevents silently dropping the targeted suites if that scope ever narrows.
    $vitestConfig = Get-Content -Raw "apps/web/vitest.config.ts"
    if (-not $vitestConfig.Contains("src/**/*.test.ts")) {
        throw "The full Vitest suite no longer covers src/**/*.test.ts; targeted gates must be restored here."
    }

    Invoke-Step { npm run test } "test"
    Write-Host "Targeted security and regression test files are covered by the full Vitest suite; their standalone commands remain available for focused CI gates."

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

if ($companionRelevant -and -not $webRelevant) {
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
