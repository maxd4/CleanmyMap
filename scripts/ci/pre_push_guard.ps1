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

    function Write-SkippedGuardStep {
        param(
            [Parameter(Mandatory = $true)]
            [string]$Label,
            [Parameter(Mandatory = $true)]
            [string]$Reason
        )

        Write-Host "[skip] ${Label}: $Reason"
    }

    function Get-ChangedFiles {
        $changed = @()
        $changed += @(git diff --name-only --diff-filter=ACMRTUXB HEAD --)
        $changed += @(git diff --cached --name-only --diff-filter=ACMRTUXB --)
        $changed += @(git ls-files --others --exclude-standard)

        $upstream = @(git rev-parse --verify --quiet origin/main 2>$null)
        if ($LASTEXITCODE -eq 0 -and $upstream.Count -gt 0) {
            $changed += @(git diff --name-only --diff-filter=ACMRTUXB "$($upstream[0])...HEAD" --)
        }

        return @(
            $changed |
                ForEach-Object { ([string]$_).Replace("\", "/").Trim() } |
                Where-Object { $_ } |
                Sort-Object -Unique
        )
    }

    function Get-ValidationPolicy {
        param(
            [Parameter(Mandatory = $true)]
            [string[]]$ChangedFiles
        )

        $policyArgs = @("scripts/checks/validation-policy.mjs", "--scope", "changed")
        foreach ($file in $ChangedFiles) {
            $policyArgs += @("--changed-file", $file)
        }
        $policyArgs += "--json"

        $policyOutput = @(& node @policyArgs)
        if ($LASTEXITCODE -ne 0) {
            throw "validation-policy failed with exit code $LASTEXITCODE"
        }

        $policyText = ($policyOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
        if (-not $policyText.Trim()) {
            throw "validation-policy returned no plan"
        }

        return $policyText | ConvertFrom-Json
    }

    function Test-ChangedPathPrefix {
        param(
            [Parameter(Mandatory = $true)]
            [string[]]$ChangedFiles,
            [Parameter(Mandatory = $true)]
            [string]$Prefix
        )

        return @($ChangedFiles | Where-Object { $_.StartsWith($Prefix, [System.StringComparison]::OrdinalIgnoreCase) }).Count -gt 0
    }

    function Test-DocumentationChange {
        param(
            [Parameter(Mandatory = $true)]
            [string[]]$ChangedFiles
        )

        return @($ChangedFiles | Where-Object {
            $_.StartsWith("documentation/", [System.StringComparison]::OrdinalIgnoreCase) -or
            $_.EndsWith(".md", [System.StringComparison]::OrdinalIgnoreCase) -or
            $_.EndsWith(".mdx", [System.StringComparison]::OrdinalIgnoreCase)
        }).Count -gt 0
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

    $changedFiles = @(Get-ChangedFiles)

    Write-Host "Pre-push guardrail"
    Write-Host "Repository: $RepoRoot"

    if ($changedFiles.Count -eq 0) {
        Write-Host "No changed files detected; running the separate full validation."
        Invoke-GuardStep "full validation" { npm run checks:full }
        Write-Host ""
        Write-Host "Pre-push guardrail passed."
        return
    }

    $policy = Get-ValidationPolicy -ChangedFiles $changedFiles
    $documentationRelevant = Test-DocumentationChange -ChangedFiles $changedFiles
    $supabaseRelevant = Test-ChangedPathPrefix -ChangedFiles $changedFiles -Prefix "apps/web/supabase/"
    $vercelConfigRelevant = $changedFiles -contains "apps/web/vercel.json"
    $webRelevant = [bool]$policy.webRelevant -or $vercelConfigRelevant
    $buildRelevant = [bool]$policy.buildRelevant -or $vercelConfigRelevant

    Invoke-GuardStep "secret audit" { npm run security:secrets }
    Invoke-GuardStep "root file hygiene" { npm run check:root-files }
    Invoke-GuardStep "GitNexus hygiene" { npm run check:gitnexus-hygiene }
    Invoke-GuardStep "documentation governance" { npm run check:doc-governance }
    Invoke-GuardStep "stack documentation drift" { npm run check:stack-doc-drift }
    Invoke-GuardStep "agent skills" { npm run check:agent-skills }
    Invoke-GuardStep "GitHub Actions security" { npm run check:github-actions }
    Invoke-GuardStep "9C public facades" { npm run check:9c-public-facades }

    if ($documentationRelevant) {
        Invoke-GuardStep "documentation visuals" { npm run check:doc-visuals }
    } else {
        Write-SkippedGuardStep "documentation visuals" "no documentation changes"
    }

    if ($supabaseRelevant) {
        Invoke-GuardStep "Supabase migration tree audit" { npm run audit:supabase-migration-trees }
    } else {
        Write-SkippedGuardStep "Supabase migration tree audit" "no apps/web/supabase changes"
    }

    if ($policy.scriptsRelevant) {
        Invoke-GuardStep "script tests" { npm run test:scripts }
    } else {
        Write-SkippedGuardStep "script tests" "no scripts changes"
    }

    if ($webRelevant) {
        Invoke-GuardStep "lockfile policy" { npm run check:lockfile-policy }
        Invoke-GuardStep "lint" { npm run lint }
        Invoke-GuardStep "typecheck" { npm run typecheck }
        Invoke-GuardStep "Vercel CI audit" { npm run audit:vercel:ci }
        Invoke-GuardStep "top-heavy files policy" { npm run quality:top-heavy }

        $targetedArgs = @(
            "scripts/checks/validation-policy.mjs",
            "--run-vitest",
            "--groups",
            "security,regression"
        )
        foreach ($file in @($policy.targetedVitestFiles)) {
            $targetedArgs += @("--test-file", [string]$file)
        }
        Invoke-GuardStep "Vitest targeted security/regression" { & node @targetedArgs }

        if ($buildRelevant) {
            Invoke-GuardStep "build" { npm run build }
        } else {
            Write-SkippedGuardStep "build" "changed web scope does not require a production build"
        }
    } else {
        Write-SkippedGuardStep "web quality gates" "no web-relevant changes"
    }

    if ($SkipVercel) {
        Write-Host ""
        Write-Host "Vercel check skipped by flag."
        return
    }

    if ($vercelProjectFiles.Count -eq 0) {
        Write-Host ""
        Write-Host "No Vercel project link detected; skipping vercel build."
    } elseif (-not $buildRelevant) {
        Write-SkippedGuardStep "vercel build" "changed scope does not require a production build"
    } else {
        Write-Host ""
        Write-Host "Vercel project link detected:"
        $vercelProjectFiles | ForEach-Object { Write-Host "- $_" }
        Invoke-VercelBuildGuard
    }

    Write-Host ""
    Write-Host "Pre-push guardrail passed."
} finally {
    Pop-Location
}
