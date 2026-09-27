#requires -Version 7.0
<#
.SYNOPSIS
    Produit un inventaire exhaustif et read-only du worktree local.

.DESCRIPTION
    - Une seule enumeration detaillee du depot source/documentation.
    - Les arbres generes, vendor et caches connus sont exclus du detail a
      n'importe quelle profondeur, mais restent mesures en agregat.
    - Un document Markdown exhaustif par dossier racine inventorie.
    - Tailles de fichiers, tailles recursives, profondeur et densite.
    - Statut Git des fichiers : tracked / untracked / ignored / other.
    - Detection des fichiers modifies/supprimes pendant le scan.
    - Rapport de candidats structurels : signal d'audit, jamais ordre de refactor.
    - Les fichiers de sortie sont crees seulement APRES le snapshot afin que
      l'audit ne se mesure pas lui-meme.

    Cet outil est un audit manuel read-only. Il n'est pas un gate CI.
    Un worktree dirty ou un chantier parallele n'est jamais une erreur.
    Aucune suppression, migration, restauration, stash, checkout ou clean.

.EXAMPLE
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\audits\audit-repository-tree.ps1
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$RepoRoot = (Get-Location).Path,

    [Parameter()]
    [string]$OutputRoot = "artifacts/repository-inventory",

    [Parameter()]
    [switch]$SkipSelfTest,

    [Parameter()]
    [switch]$SelfTestOnly,

    [Parameter()]
    [string[]]$AdditionalAggregateOnlyDirectoryName = @(),

    [Parameter()]
    [ValidateRange(1, 200)]
    [int]$TopCandidateCount = 30,

    [Parameter()]
    [switch]$FailOnSnapshotRace
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "audit-repository-tree.helpers.ps1")
. (Join-Path $PSScriptRoot "audit-repository-tree.reports.ps1")

if (-not $SkipSelfTest) {
    Write-Host "Execution du self-test end-to-end avant le scan reel..."
    Invoke-EndToEndSelfTest -ScriptPath $PSCommandPath
    if ($SelfTestOnly) {
        Write-Host "Self-test termine; aucun scan reel demande."
        exit 0
    }
}

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
if (-not [System.IO.Directory]::Exists($repo)) { throw "RepoRoot introuvable: $RepoRoot" }

$timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$startedAt = [DateTimeOffset]::Now
$scanErrors = [System.Collections.Generic.List[object]]::new()
$raceFindings = [System.Collections.Generic.List[object]]::new()
$excludedTrees = [System.Collections.Generic.List[object]]::new()
$fileRecords = [System.Collections.Generic.List[object]]::new()
$directoryNodes = @{}

$headStart = ""
$statusStart = @()
try { $headStart = (& git -C $repo rev-parse HEAD 2>$null | Select-Object -First 1).Trim() } catch {}
try { $statusStart = @(& git -C $repo status --porcelain=v1 --untracked-files=all 2>$null) } catch {}

$tracked = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$untracked = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$ignored = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
Add-GitLinesToSet -Set $tracked -Lines @(Invoke-GitLines -Repository $repo -Arguments @("ls-files") -Errors $scanErrors)
Add-GitLinesToSet -Set $untracked -Lines @(Invoke-GitLines -Repository $repo -Arguments @("ls-files", "--others", "--exclude-standard") -Errors $scanErrors)

# Evite de materialiser des dizaines de milliers de chemins ignored venant de
# node_modules/.next/.artifacts uniquement pour les exclure ensuite du detail.
$ignoredArgs = [System.Collections.Generic.List[string]]::new()
foreach ($arg in @("ls-files", "--others", "--ignored", "--exclude-standard", "--", ".")) { $ignoredArgs.Add($arg) }
foreach ($name in $script:AggregateOnlyDirectoryReasons.Keys) {
    if ($name -eq ".git" -or $script:TrackedDirectoryProtectedNames.Contains($name)) { continue }
    $ignoredArgs.Add(":(exclude,glob)$name/**")
    $ignoredArgs.Add(":(exclude,glob)**/$name/**")
}
Add-GitLinesToSet -Set $ignored -Lines @(Invoke-GitLines -Repository $repo -Arguments @($ignoredArgs) -Errors $scanErrors)

$trackedDirectories = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($trackedPath in $tracked) {
    $parent = Get-ParentRelativePath -RelativePath $trackedPath
    while ($null -ne $parent) {
        if (-not [string]::IsNullOrEmpty($parent)) { [void]$trackedDirectories.Add($parent) }
        $parent = Get-ParentRelativePath -RelativePath $parent
    }
}

$directoryNodes[""] = New-DirectoryNode -RelativePath "" -FullPath $repo -Root "<ROOT>" -Depth 0
$stack = [System.Collections.Generic.Stack[string]]::new()
$stack.Push($repo)

Write-Host "Scan du worktree: $repo"
Write-Host "Les sorties seront ecrites seulement apres le snapshot."

while ($stack.Count -gt 0) {
    $currentFull = $stack.Pop()
    $currentRelative = Get-NormalizedRelativePath -BasePath $repo -FullPath $currentFull
    $currentNode = $directoryNodes[$currentRelative]

    try {
        foreach ($entry in [System.IO.Directory]::EnumerateFileSystemEntries($currentFull)) {
            try {
                $attributes = [System.IO.File]::GetAttributes($entry)
                $isDirectory = (($attributes -band [System.IO.FileAttributes]::Directory) -ne 0)
                $isReparse = (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
                $relative = Get-NormalizedRelativePath -BasePath $repo -FullPath $entry

                if ($isDirectory) {
                    $name = [System.IO.Path]::GetFileName($entry)
                    $reason = Get-AggregateOnlyReason `
                        -Directory $entry `
                        -Name $name `
                        -RelativePath $relative `
                        -AdditionalNames $AdditionalAggregateOnlyDirectoryName `
                        -TrackedDirectories $trackedDirectories

                    if ($null -ne $reason) {
                        $excludedTrees.Add((Measure-ExcludedTree -FullPath $entry -RelativePath $relative -Reason $reason -Errors $scanErrors))
                        continue
                    }

                    $rootName = Get-RootName -RelativePath $relative
                    $childNode = New-DirectoryNode -RelativePath $relative -FullPath $entry -Root $rootName -Depth (Get-Depth -RelativePath $relative) -IsReparsePoint $isReparse
                    $directoryNodes[$relative] = $childNode
                    $currentNode.DirectDirs.Add($relative)
                    if (-not $isReparse) { $stack.Push($entry) }
                }
                else {
                    $info = [System.IO.FileInfo]::new($entry)
                    $rootName = Get-RootName -RelativePath $relative
                    $extension = if ($info.Extension) { $info.Extension.ToLowerInvariant() } else { "<none>" }
                    $isSourceLike = Test-IsSourceLikeExtension -Extension $extension
                    $lineCount = if ($isSourceLike) { Get-SourceLineCount -Path $entry } else { $null }
                    $record = [pscustomobject]@{
                        Path = $relative
                        FullPath = $entry
                        Name = $info.Name
                        Parent = $currentRelative
                        Root = $rootName
                        Depth = Get-Depth -RelativePath $relative
                        SizeBytes = [long]$info.Length
                        Extension = $extension
                        IsSourceLike = [bool]$isSourceLike
                        LineCount = $lineCount
                        LastWriteTimeUtcTicks = [long]$info.LastWriteTimeUtc.Ticks
                        GitStatus = ""
                    }
                    $fileRecords.Add($record)
                    $currentNode.DirectFiles.Add($record)
                }
            }
            catch {
                $scanErrors.Add([pscustomobject]@{ path = $entry; operation = "scan-entry"; error = $_.Exception.Message })
            }
        }
    }
    catch {
        $scanErrors.Add([pscustomobject]@{ path = $currentFull; operation = "enumerate-directory"; error = $_.Exception.Message })
    }
}

Write-Host "Classification Git des fichiers..."
foreach ($file in $fileRecords) {
    $file.GitStatus = Get-FileGitStatus -RelativePath $file.Path -Tracked $tracked -Untracked $untracked -Ignored $ignored
    Add-FileStructureMetricsToAncestors `
        -DirectoryNodes $directoryNodes `
        -StartDirectory $file.Parent `
        -GitStatus $file.GitStatus `
        -IsSourceLike $file.IsSourceLike `
        -LineCount $file.LineCount `
        -SizeBytes $file.SizeBytes `
        -FileDepth $file.Depth
}

Write-Host "Calcul des agregats recursifs..."
foreach ($file in $fileRecords) {
    Add-ToDirectoryAncestors -DirectoryNodes $directoryNodes -StartDirectory $file.Parent -SizeBytes $file.SizeBytes -FileIncrement 1 -DirIncrement 0
}
foreach ($key in @($directoryNodes.Keys)) {
    if ($key -eq "") { continue }
    $parent = Get-ParentRelativePath -RelativePath $key
    Add-ToDirectoryAncestors -DirectoryNodes $directoryNodes -StartDirectory $parent -SizeBytes 0 -FileIncrement 0 -DirIncrement 1
}

Write-Host "Verification des races de snapshot..."
foreach ($file in $fileRecords) {
    try {
        $info = [System.IO.FileInfo]::new($file.FullPath)
        if (-not $info.Exists) {
            $raceFindings.Add([pscustomobject]@{ path = $file.Path; reason = "deleted_during_scan"; before_size = $file.SizeBytes; after_size = $null })
            continue
        }
        if ([long]$info.Length -ne [long]$file.SizeBytes -or [long]$info.LastWriteTimeUtc.Ticks -ne [long]$file.LastWriteTimeUtcTicks) {
            $raceFindings.Add([pscustomobject]@{ path = $file.Path; reason = "modified_during_scan"; before_size = $file.SizeBytes; after_size = [long]$info.Length })
        }
    }
    catch {
        $raceFindings.Add([pscustomobject]@{ path = $file.Path; reason = "restat_failed"; before_size = $file.SizeBytes; after_size = $null })
    }
}

$headEnd = ""
try { $headEnd = (& git -C $repo rev-parse HEAD 2>$null | Select-Object -First 1).Trim() } catch {}
if ($headStart -and $headEnd -and $headStart -ne $headEnd) {
    $raceFindings.Add([pscustomobject]@{ path = "<git-head>"; reason = "HEAD_changed_during_scan"; before_size = $null; after_size = $null })
}
$finishedScanAt = [DateTimeOffset]::Now

$outputBase = if ([System.IO.Path]::IsPathRooted($OutputRoot)) { [System.IO.Path]::GetFullPath($OutputRoot) } else { [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($repo, $OutputRoot)) }
$outputDir = [System.IO.Path]::Combine($outputBase, $timestamp)
$rootsDir = [System.IO.Path]::Combine($outputDir, "roots")
[System.IO.Directory]::CreateDirectory($rootsDir) | Out-Null

$reportSummary = Write-AuditReports `
    -OutputDir $outputDir `
    -RootsDir $rootsDir `
    -DirectoryNodes $directoryNodes `
    -FileRecords $fileRecords `
    -ExcludedTrees $excludedTrees `
    -TopCandidateCount $TopCandidateCount `
    -StartedAt $startedAt `
    -FinishedScanAt $finishedScanAt `
    -Repo $repo `
    -HeadStart $headStart `
    -HeadEnd $headEnd `
    -StatusStart $statusStart `
    -RaceFindings $raceFindings `
    -ScanErrors $scanErrors
[long]$includedBytes = $reportSummary.IncludedBytes
[long]$excludedBytes = $reportSummary.ExcludedBytes
[long]$excludedFiles = $reportSummary.ExcludedFiles
[long]$excludedDirs = $reportSummary.ExcludedDirs
$includedRoot = $reportSummary.IncludedRoot
$structuralCandidates = @($reportSummary.StructuralCandidates)
$chatgptReviewFiles = @($reportSummary.ChatgptReviewFiles)
Write-Host ""
Write-Host "Inventaire termine."
Write-Host "Sortie : $outputDir"
Write-Host (("Detail inventorie : {0} | {1} fichiers | {2} dossiers" -f (Format-ByteSize $includedBytes), $includedRoot.RecursiveFileCount, $includedRoot.RecursiveDirCount))
Write-Host (("Arbres exclus du detail : {0} | {1} fichiers | {2} dossiers" -f (Format-ByteSize $excludedBytes), $excludedFiles, $excludedDirs))
Write-Host (("Races detectees (informatives par defaut) : {0}" -f $raceFindings.Count))
Write-Host (("Erreurs de scan : {0}" -f $scanErrors.Count))
Write-Host (("Candidats structurels : {0} (top {1} dans STRUCTURAL_CANDIDATES.md)" -f $structuralCandidates.Count, $TopCandidateCount))
Write-Host (("Duree snapshot : {0:N2} s" -f ($finishedScanAt - $startedAt).TotalSeconds))

if ($scanErrors.Count -gt 0) { exit 2 }
if ($FailOnSnapshotRace -and $raceFindings.Count -gt 0) { exit 3 }

Write-Host "AUDIT_OUTPUT_DIR: $outputDir"
Write-Host "CHATGPT_REVIEW_FILES:"
foreach ($reviewFile in $chatgptReviewFiles) {
    Write-Host $reviewFile
}
exit 0
