param(
    [string]$RemoteName,
    [string]$RemoteUrl,
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

    function Invoke-GitText {
        param(
            [Parameter(Mandatory = $true)]
            [string[]]$Arguments
        )

        $output = @(& git @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "git $($Arguments -join ' ') failed with exit code $exitCode"
        }

        return @($output | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
    }

    function Test-ZeroSha {
        param(
            [Parameter(Mandatory = $true)]
            [string]$Sha
        )

        return $Sha -match "^0{40}$"
    }

    function Get-RemoteHistoryBase {
        param(
            [Parameter(Mandatory = $true)]
            [string]$Remote
        )

        $candidateRefs = @(
            "refs/remotes/$Remote/HEAD",
            "refs/remotes/$Remote/main",
            "$Remote/main"
        )

        foreach ($candidateRef in $candidateRefs) {
            $output = @(& git rev-parse --verify --quiet "$candidateRef^{commit}" 2>$null)
            if ($LASTEXITCODE -eq 0 -and $output.Count -gt 0 -and ([string]$output[0]).Trim()) {
                return ([string]$output[0]).Trim()
            }
        }

        throw "Cannot determine a safe remote history base for new ref on '$Remote'"
    }

    function Get-PrePushRecords {
        $protocolText = [Console]::In.ReadToEnd()
        $records = @()

        foreach ($line in ($protocolText -split "`r?`n")) {
            $trimmed = $line.Trim()
            if (-not $trimmed) {
                continue
            }

            $parts = $trimmed -split "\s+"
            if ($parts.Count -ne 4) {
                throw "Invalid pre-push protocol line; expected '<local-ref> <local-sha> <remote-ref> <remote-sha>'"
            }

            $records += [pscustomobject]@{
                LocalRef = $parts[0]
                LocalSha = $parts[1]
                RemoteRef = $parts[2]
                RemoteSha = $parts[3]
            }
        }

        if ($records.Count -eq 0) {
            throw "Pre-push protocol was provided without any ref update"
        }

        return $records
    }

    function Get-PushCandidates {
        param(
            [Parameter(Mandatory = $true)]
            [object[]]$Records,
            [Parameter(Mandatory = $true)]
            [string]$Remote
        )

        $candidates = @()
        foreach ($record in $Records) {
            if (Test-ZeroSha $record.LocalSha) {
                Write-Host "[skip] ref delete: $($record.RemoteRef)"
                continue
            }

            & git cat-file -e "$($record.LocalSha)^{commit}" 2>$null
            if ($LASTEXITCODE -ne 0) {
                throw "Local push candidate is not a commit: $($record.LocalSha)"
            }

            if (Test-ZeroSha $record.RemoteSha) {
                $remoteBase = Get-RemoteHistoryBase -Remote $Remote
                $mergeBase = @(Invoke-GitText @("merge-base", $remoteBase, $record.LocalSha))
                if ($mergeBase.Count -eq 0) {
                    throw "Cannot determine a safe range for new ref $($record.LocalRef)"
                }

                $range = "$($mergeBase[0])..$($record.LocalSha)"
                $rangeMode = "new-ref-fallback"
            } else {
                & git merge-base --is-ancestor $record.RemoteSha $record.LocalSha 2>$null
                $ancestorExitCode = $LASTEXITCODE
                if ($ancestorExitCode -eq 1) {
                    throw "PUSH_CANDIDATE non-fast-forward: $($record.RemoteRef) ($($record.RemoteSha) -> $($record.LocalSha))"
                }
                if ($ancestorExitCode -ne 0) {
                    throw "Cannot verify fast-forward push candidate for $($record.RemoteRef)"
                }

                $range = "$($record.RemoteSha)..$($record.LocalSha)"
                $rangeMode = "fast-forward"
            }

            $candidates += [pscustomobject]@{
                LocalRef = $record.LocalRef
                LocalSha = $record.LocalSha
                RemoteRef = $record.RemoteRef
                RemoteSha = $record.RemoteSha
                Range = $range
                RangeMode = $rangeMode
            }
        }

        return $candidates
    }

    function Get-ChangedFilesFromRanges {
        param(
            [Parameter(Mandatory = $true)]
            [string[]]$Ranges
        )

        $changed = @()
        foreach ($range in $Ranges) {
            $changed += @(Invoke-GitText @("diff", "--name-only", "--diff-filter=ACDMRTUXB", $range, "--"))
        }

        return @(
            $changed |
                ForEach-Object { ([string]$_).Replace("\", "/").Trim() } |
                Where-Object { $_ } |
                Sort-Object -Unique
        )
    }

    function Get-ManualFallbackScope {
        $upstream = @(Invoke-GitText @("rev-parse", "--verify", "origin/main^{commit}"))
        if ($upstream.Count -eq 0) {
            throw "Manual fallback cannot resolve origin/main"
        }

        $range = "$($upstream[0])...HEAD"
        return [pscustomobject]@{
            Ranges = @($range)
            Candidates = @([pscustomobject]@{
                    LocalRef = "HEAD"
                    LocalSha = "HEAD"
                    RemoteRef = "origin/main"
                    RemoteSha = $upstream[0]
                    Range = $range
                    RangeMode = "manual-fallback"
                })
            ChangedFiles = @(Get-ChangedFilesFromRanges -Ranges @($range))
        }
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

    Write-Host "Pre-push guardrail"
    Write-Host "Repository: $RepoRoot"

    $manualFallback = [string]::IsNullOrWhiteSpace($RemoteName) -and [string]::IsNullOrWhiteSpace($RemoteUrl)
    if ($manualFallback) {
        Write-Host "mode = manual-fallback"
        $scope = Get-ManualFallbackScope
    } elseif ([string]::IsNullOrWhiteSpace($RemoteName) -or [string]::IsNullOrWhiteSpace($RemoteUrl)) {
        throw "Pre-push protocol requires both remote name and remote URL"
    } else {
        Write-Host "mode = push-protocol"
        Write-Host "remote = $RemoteName"
        $records = Get-PrePushRecords
        $candidates = @(Get-PushCandidates -Records $records -Remote $RemoteName)
        $ranges = @($candidates | Select-Object -ExpandProperty Range -Unique)
        $scope = [pscustomobject]@{
            Ranges = $ranges
            Candidates = $candidates
            ChangedFiles = if ($ranges.Count -gt 0) { @(Get-ChangedFilesFromRanges -Ranges $ranges) } else { @() }
        }
    }

    $changedFiles = @($scope.ChangedFiles)
    $candidates = @($scope.Candidates)
    $ranges = @($scope.Ranges)

    if (-not $manualFallback -and $ranges.Count -eq 0) {
        Write-Host "PUSH_CANDIDATE contains ref deletions only; no repository tree validation is required."
        return
    }

    if ($manualFallback -and $changedFiles.Count -eq 0) {
        Write-Host "No changed files detected in manual fallback; running the separate full validation."
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

    foreach ($range in $ranges) {
        Invoke-GuardStep "PUSH_CANDIDATE diff check ($range)" { & git diff --check $range -- }
    }

    $secretArgs = @()
    $secretPairs = @($candidates | ForEach-Object { "$($_.LocalSha)|$($_.Range)" } | Sort-Object -Unique)
    foreach ($pair in $secretPairs) {
        $parts = $pair -split "\|", 2
        $secretArgs += "--candidate-ref=$($parts[0])"
        $secretArgs += "--candidate-range=$($parts[1])"
    }
    $secretCommandArgs = @("run", "security:secrets", "--") + $secretArgs
    Invoke-GuardStep "secret audit" { & npm @secretCommandArgs }
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
