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
            [AllowEmptyCollection()]
            [string[]]$ChangedFiles,
            [Parameter(Mandatory = $false)]
            [ValidateSet("changed", "full")]
            [string]$Scope = "changed"
        )

        $policyArgs = @("scripts/checks/validation-policy.mjs", "--scope", $Scope)
        if ($Scope -eq "changed") {
            foreach ($file in $ChangedFiles) {
                $policyArgs += @("--changed-file", $file)
            }
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
            [AllowEmptyCollection()]
            [string[]]$ChangedFiles,
            [Parameter(Mandatory = $true)]
            [string]$Prefix
        )

        return @($ChangedFiles | Where-Object { $_.StartsWith($Prefix, [System.StringComparison]::OrdinalIgnoreCase) }).Count -gt 0
    }

    function Test-DocumentationChange {
        param(
            [Parameter(Mandatory = $true)]
            [AllowEmptyCollection()]
            [string[]]$ChangedFiles
        )

        return @($ChangedFiles | Where-Object {
            $_.StartsWith("documentation/", [System.StringComparison]::OrdinalIgnoreCase) -or
            $_.EndsWith(".md", [System.StringComparison]::OrdinalIgnoreCase) -or
            $_.EndsWith(".mdx", [System.StringComparison]::OrdinalIgnoreCase)
        }).Count -gt 0
    }

    function Invoke-VercelBuildGuard {
        param(
            [Parameter(Mandatory = $true)]
            [string]$CandidateRef
        )

        Write-Host ""
        Write-Host "==> vercel build ($CandidateRef) [DYNAMIC_CANDIDATE]"

        $buildStartedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $dynamicArguments = @(
                "scripts/ci/run-dynamic-candidate-check.mjs",
                "--ref=$CandidateRef",
                "--command=npx",
                "--",
                "vercel",
                "build",
                "--yes"
            )
            $vercelOutput = @(& node @dynamicArguments 2>&1)
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

    function Invoke-StaticCandidateChecks {
        # STATIC_CANDIDATE: the runner materializes the exact Git tree named by --ref
        # before loading checker code or its relative imports. These
        # checks must not be repeated against the worktree.
        param(
            [Parameter(Mandatory = $true)]
            [string[]]$CandidateRefs,
            [Parameter(Mandatory = $true)]
            [bool]$DocumentationRelevant,
            [Parameter(Mandatory = $true)]
            [bool]$SupabaseRelevant,
            [Parameter(Mandatory = $true)]
            [bool]$WebRelevant
        )

        foreach ($candidateRef in @($CandidateRefs | Sort-Object -Unique)) {
            Write-Host ""
            Write-Host "==> static candidate checks ($candidateRef)"
            Invoke-GuardStep "environment contract ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-env-contract.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "root file hygiene ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-root-file-hygiene.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "GitNexus hygiene ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-gitnexus-hygiene.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "documentation governance ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-documentation-governance.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "AGENTS governance ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-agent-governance.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "agent skills ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-agent-skill-mirrors.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "stack documentation drift ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-stack-doc-drift.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "GitHub Actions security ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-github-actions-security.mjs -- "--ref=$candidateRef" }
            Invoke-GuardStep "9C public facades ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-9c-public-facades.mjs -- "--ref=$candidateRef" }

            if ($DocumentationRelevant) {
                Invoke-GuardStep "documentation visuals ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-doc-visuals.mjs -- "--ref=$candidateRef" }
            }
            if ($SupabaseRelevant) {
                Invoke-GuardStep "Supabase migration tree audit ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/audits/audit-supabase-migration-trees.mjs -- "--ref=$candidateRef" }
            }
            if ($WebRelevant) {
                Invoke-GuardStep "lockfile policy ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-lockfile-policy.mjs -- "--ref=$candidateRef" }
                Invoke-GuardStep "Vercel CI audit ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/audits/audit-vercel-ci.mjs -- "--ref=$candidateRef" }
                Invoke-GuardStep "top-heavy files policy ($candidateRef)" { node scripts/ci/run-static-candidate-check.mjs "--ref=$candidateRef" --script=scripts/checks/check-top-heavy-files.mjs -- --enforce "--ref=$candidateRef" }
            }
        }
    }

    function Invoke-DynamicCandidateCommand {
        param(
            [Parameter(Mandatory = $true)]
            [string]$CandidateRef,
            [Parameter(Mandatory = $true)]
            [string]$Label,
            [Parameter(Mandatory = $true)]
            [string]$Command,
            [Parameter(Mandatory = $false)]
            [AllowEmptyCollection()]
            [string[]]$CommandArguments = @()
        )

        Write-Host ""
        Write-Host "==> $Label ($CandidateRef) [DYNAMIC_CANDIDATE]"
        $runnerArguments = @(
            "scripts/ci/run-dynamic-candidate-check.mjs",
            "--ref=$CandidateRef",
            "--command=$Command",
            "--"
        ) + $CommandArguments
        Invoke-GuardStep "$Label ($CandidateRef)" { & node @runnerArguments }
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
        Write-Host "No changed files detected in manual fallback; validating the HEAD candidate tree only."
    }

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
    $candidatePlans = @()
    $candidateRefs = @($candidates | Select-Object -ExpandProperty LocalSha -Unique)
    foreach ($candidateRef in $candidateRefs) {
        $candidateRanges = @(
            $candidates |
                Where-Object { $_.LocalSha -eq $candidateRef } |
                Select-Object -ExpandProperty Range -Unique
        )
        $candidateFiles = @(Get-ChangedFilesFromRanges -Ranges $candidateRanges)
        $candidatePolicy = Get-ValidationPolicy -ChangedFiles $candidateFiles
        $candidateVercelConfigRelevant = $candidateFiles -contains "apps/web/vercel.json"
        $candidatePlans += [pscustomobject]@{
            CandidateRef = $candidateRef
            Ranges = $candidateRanges
            ChangedFiles = $candidateFiles
            Policy = $candidatePolicy
            DocumentationRelevant = Test-DocumentationChange -ChangedFiles $candidateFiles
            SupabaseRelevant = Test-ChangedPathPrefix -ChangedFiles $candidateFiles -Prefix "apps/web/supabase/"
            WebRelevant = [bool]$candidatePolicy.webRelevant -or $candidateVercelConfigRelevant
            BuildRelevant = [bool]$candidatePolicy.buildRelevant -or $candidateVercelConfigRelevant
        }
    }

    if ($manualFallback -and $changedFiles.Count -eq 0) {
        $fullPolicy = Get-ValidationPolicy -ChangedFiles @() -Scope full
        $candidatePlans = @([pscustomobject]@{
                CandidateRef = "HEAD"
                Ranges = @($ranges[0])
                ChangedFiles = @()
                Policy = $fullPolicy
                DocumentationRelevant = $true
                SupabaseRelevant = $true
                WebRelevant = $true
                BuildRelevant = $true
            })
    }

    foreach ($plan in $candidatePlans) {
        Invoke-StaticCandidateChecks -CandidateRefs @($plan.CandidateRef) -DocumentationRelevant ([bool]$plan.DocumentationRelevant) -SupabaseRelevant ([bool]$plan.SupabaseRelevant) -WebRelevant ([bool]$plan.WebRelevant)

        if ([bool]$plan.Policy.scriptsRelevant) {
            Invoke-DynamicCandidateCommand -CandidateRef $plan.CandidateRef -Label "script tests" -Command "npm" -CommandArguments @("run", "test:scripts")
        } else {
            Write-SkippedGuardStep "script tests ($($plan.CandidateRef))" "no scripts changes in this candidate"
        }

        if ([bool]$plan.WebRelevant) {
            # DYNAMIC_CANDIDATE: these gates execute in a materialized candidate
            # tree and remain distinct from STATIC_CANDIDATE checks above.
            Invoke-DynamicCandidateCommand -CandidateRef $plan.CandidateRef -Label "lint" -Command "npm" -CommandArguments @("run", "lint")
            Invoke-DynamicCandidateCommand -CandidateRef $plan.CandidateRef -Label "typecheck" -Command "npm" -CommandArguments @("run", "typecheck")

            $targetedArgs = @(
                "scripts/checks/validation-policy.mjs",
                "--run-vitest",
                "--groups",
                "security,regression"
            )
            foreach ($file in @($plan.Policy.targetedVitestFiles)) {
                $targetedArgs += @("--test-file", [string]$file)
            }
            Invoke-DynamicCandidateCommand -CandidateRef $plan.CandidateRef -Label "Vitest targeted security/regression" -Command "node" -CommandArguments $targetedArgs

            if ([bool]$plan.BuildRelevant) {
                Invoke-DynamicCandidateCommand -CandidateRef $plan.CandidateRef -Label "build" -Command "npm" -CommandArguments @("run", "build")
            } else {
                Write-SkippedGuardStep "build ($($plan.CandidateRef))" "changed web scope does not require a production build"
            }
        } else {
            Write-SkippedGuardStep "web quality gates ($($plan.CandidateRef))" "no web-relevant changes in this candidate"
        }
    }

    if ($SkipVercel) {
        Write-Host ""
        Write-Host "Vercel check skipped by flag."
        return
    }

    if ($vercelProjectFiles.Count -eq 0) {
        Write-Host ""
        Write-Host "No Vercel project link detected; skipping vercel build."
    } else {
        Write-Host ""
        Write-Host "Vercel project link detected:"
        $vercelProjectFiles | ForEach-Object { Write-Host "- $_" }
        foreach ($plan in $candidatePlans | Where-Object { [bool]$_.BuildRelevant }) {
            # HOST_ENVIRONMENT + DYNAMIC_CANDIDATE: this optional build depends on
            # the local Vercel project link and executes the candidate tree.
            Invoke-VercelBuildGuard -CandidateRef $plan.CandidateRef
        }
    }

    Write-Host ""
    Write-Host "Pre-push guardrail passed."
} finally {
    Pop-Location
}
