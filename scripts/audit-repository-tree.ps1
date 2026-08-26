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
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-repository-tree.ps1
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$RepoRoot = (Get-Location).Path,

    [Parameter()]
    [string]$OutputRoot = ".artifacts/validation/repository-inventory",

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

function Get-NormalizedRelativePath {
    param(
        [Parameter(Mandatory)][string]$BasePath,
        [Parameter(Mandatory)][string]$FullPath
    )
    $relative = [System.IO.Path]::GetRelativePath($BasePath, $FullPath)
    if ($relative -eq ".") { return "" }
    return ($relative -replace "\\", "/")
}

function Get-ParentRelativePath {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$RelativePath)
    if ([string]::IsNullOrEmpty($RelativePath)) { return $null }
    $idx = $RelativePath.LastIndexOf("/")
    if ($idx -lt 0) { return "" }
    return $RelativePath.Substring(0, $idx)
}

function Get-RootName {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$RelativePath)
    if ([string]::IsNullOrEmpty($RelativePath)) { return "<ROOT>" }
    $idx = $RelativePath.IndexOf("/")
    if ($idx -lt 0) { return $RelativePath }
    return $RelativePath.Substring(0, $idx)
}

function Get-Depth {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$RelativePath)
    if ([string]::IsNullOrEmpty($RelativePath)) { return 0 }
    return ($RelativePath.Split("/").Count)
}

function Format-ByteSize {
    param([Parameter(Mandatory)][long]$Bytes)
    if ($Bytes -ge 1TB) { return ("{0:N2} TiB" -f ($Bytes / 1TB)) }
    if ($Bytes -ge 1GB) { return ("{0:N2} GiB" -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ("{0:N2} MiB" -f ($Bytes / 1MB)) }
    if ($Bytes -ge 1KB) { return ("{0:N2} KiB" -f ($Bytes / 1KB)) }
    return ("{0} B" -f $Bytes)
}

function Escape-MarkdownCell {
    param([AllowNull()][object]$Value)
    if ($null -eq $Value) { return "" }
    return (($Value.ToString() -replace "\|", "\|") -replace "`r?`n", " ")
}

function Get-SafeFileName {
    param([Parameter(Mandatory)][string]$Name)
    $safe = $Name
    foreach ($char in [System.IO.Path]::GetInvalidFileNameChars()) {
        $safe = $safe.Replace([string]$char, "_")
    }
    if ([string]::IsNullOrWhiteSpace($safe)) { return "_root" }
    return $safe
}

function Test-IsVirtualEnvDirectory {
    param([Parameter(Mandatory)][string]$Directory)
    try { return [System.IO.File]::Exists([System.IO.Path]::Combine($Directory, "pyvenv.cfg")) }
    catch { return $false }
}

# CleanMyMap: arbres qui consomment du disque mais ne doivent pas polluer
# l'analyse structurelle. Le matching se fait sur le nom du dossier a n'importe
# quelle profondeur du monorepo. Leur taille reste mesuree en agregat.
$script:AggregateOnlyDirectoryReasons = @{
    ".git" = "Git object database exclue du detail"
    "node_modules" = "Dependances Node exclues du detail"
    ".next" = "Build/cache Next.js exclu du detail"
    "dist" = "Sortie de build exclue du detail"
    "build" = "Sortie de build exclue du detail"
    "out" = "Sortie statique generee exclue du detail"
    "coverage" = "Couverture de tests generee exclue du detail"
    "playwright-report" = "Rapport Playwright genere exclu du detail"
    "test-results" = "Resultats de tests generes exclus du detail"
    ".turbo" = "Cache Turborepo exclu du detail"
    ".vercel" = "Etat local Vercel exclu du detail"
    ".expo" = "Cache/etat Expo exclu du detail"
    ".cache" = "Cache d'outillage exclu du detail"
    ".parcel-cache" = "Cache Parcel exclu du detail"
    ".vite" = "Cache Vite exclu du detail"
    ".swc" = "Cache SWC exclu du detail"
    ".pytest_cache" = "Cache pytest exclu du detail"
    ".mypy_cache" = "Cache mypy exclu du detail"
    ".ruff_cache" = "Cache Ruff exclu du detail"
    "__pycache__" = "Bytecode Python genere exclu du detail"
    ".pnpm-store" = "Store pnpm local exclu du detail"
    ".yarn" = "Cache/install Yarn exclu du detail"
    ".gradle" = "Cache Gradle exclu du detail"
    "Pods" = "Dependances CocoaPods exclues du detail"
    "vendor" = "Dependances vendor exclues du detail"
    ".npm" = "Cache npm exclu du detail"
    ".artifacts" = "Artefacts locaux CleanMyMap exclus du detail"
}

# Ces noms sont souvent generes mais peuvent legitimement etre versionnes dans
# certains projets. S'ils contiennent des fichiers tracked, on prefere les
# inventorier plutot que masquer une vraie zone source.
$script:TrackedDirectoryProtectedNames = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
foreach ($name in @("dist", "build", "out", ".yarn", "Pods", "vendor")) {
    [void]$script:TrackedDirectoryProtectedNames.Add($name)
}

$script:SourceLikeExtensions = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
foreach ($extension in @(
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".ps1", ".py", ".sql", ".sh"
)) {
    [void]$script:SourceLikeExtensions.Add($extension)
}

function Get-AggregateOnlyReason {
    param(
        [Parameter(Mandatory)][string]$Directory,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter()][AllowEmptyCollection()][string[]]$AdditionalNames = @(),
        [Parameter()][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$TrackedDirectories
    )

    if (Test-IsVirtualEnvDirectory -Directory $Directory) {
        return "Virtualenv Python exclu du detail (pyvenv.cfg detecte)"
    }

    if ($script:AggregateOnlyDirectoryReasons.ContainsKey($Name)) {
        $protectTracked = $script:TrackedDirectoryProtectedNames.Contains($Name)
        $containsTrackedContent = $null -ne $TrackedDirectories -and $TrackedDirectories.Contains($RelativePath)
        if (-not ($protectTracked -and $containsTrackedContent)) {
            return [string]$script:AggregateOnlyDirectoryReasons[$Name]
        }
    }

    foreach ($additionalName in $AdditionalNames) {
        if (-not [string]::IsNullOrWhiteSpace($additionalName) -and
            [string]::Equals($Name, $additionalName.Trim(), [System.StringComparison]::OrdinalIgnoreCase)) {
            return "Exclusion agregat-only demandee par -AdditionalAggregateOnlyDirectoryName"
        }
    }

    return $null
}

function Test-IsSourceLikeExtension {
    param([Parameter(Mandatory)][string]$Extension)
    return $script:SourceLikeExtensions.Contains($Extension)
}

function Get-SourceLineCount {
    param([Parameter(Mandatory)][string]$Path)

    $reader = $null
    try {
        $reader = [System.IO.StreamReader]::new($Path, $true)
        [long]$count = 0
        while ($null -ne $reader.ReadLine()) { $count++ }
        return $count
    }
    catch {
        # La taille/mtime restent la mesure canonique du snapshot. Un line count
        # indisponible ne doit pas rendre l'audit structurel inutilisable.
        return $null
    }
    finally {
        if ($null -ne $reader) { $reader.Dispose() }
    }
}

function Measure-ExcludedTree {
    param(
        [Parameter(Mandatory)][string]$FullPath,
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][string]$Reason,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$Errors
    )

    [long]$bytes = 0
    [long]$fileCount = 0
    [long]$dirCount = 1
    [int]$maxDepth = 0
    $stack = [System.Collections.Generic.Stack[object]]::new()
    $stack.Push([pscustomobject]@{ FullPath = $FullPath; Depth = 0 })

    while ($stack.Count -gt 0) {
        $current = $stack.Pop()
        if ($current.Depth -gt $maxDepth) { $maxDepth = $current.Depth }
        try {
            foreach ($entry in [System.IO.Directory]::EnumerateFileSystemEntries($current.FullPath)) {
                try {
                    $attributes = [System.IO.File]::GetAttributes($entry)
                    $isDirectory = (($attributes -band [System.IO.FileAttributes]::Directory) -ne 0)
                    $isReparse = (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
                    if ($isDirectory) {
                        $dirCount++
                        if (-not $isReparse) {
                            $stack.Push([pscustomobject]@{ FullPath = $entry; Depth = [int]$current.Depth + 1 })
                        }
                    }
                    else {
                        $info = [System.IO.FileInfo]::new($entry)
                        $bytes += $info.Length
                        $fileCount++
                    }
                }
                catch {
                    $Errors.Add([pscustomobject]@{ path = $entry; operation = "measure-excluded-entry"; error = $_.Exception.Message })
                }
            }
        }
        catch {
            $Errors.Add([pscustomobject]@{ path = $current.FullPath; operation = "measure-excluded-directory"; error = $_.Exception.Message })
        }
    }

    return [pscustomobject]@{
        path = $RelativePath
        reason = $Reason
        size_bytes = $bytes
        file_count = $fileCount
        dir_count = $dirCount
        max_depth = $maxDepth
    }
}

function New-DirectoryNode {
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string]$RelativePath,
        [Parameter(Mandatory)][string]$FullPath,
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][int]$Depth,
        [Parameter()][bool]$IsReparsePoint = $false
    )

    return [ordered]@{
        RelativePath = $RelativePath
        FullPath = $FullPath
        Root = $Root
        Depth = $Depth
        IsReparsePoint = $IsReparsePoint
        DirectFiles = [System.Collections.Generic.List[object]]::new()
        DirectDirs = [System.Collections.Generic.List[string]]::new()
        RecursiveSizeBytes = [long]0
        RecursiveFileCount = [long]0
        RecursiveDirCount = [long]0
        RecursiveTrackedFileCount = [long]0
        RecursiveUntrackedFileCount = [long]0
        RecursiveIgnoredFileCount = [long]0
        RecursiveOtherFileCount = [long]0
        RecursiveSourceFileCount = [long]0
        RecursiveTrackedSourceFileCount = [long]0
        RecursiveTopHeavySourceFileCount = [long]0
        RecursiveTrackedTopHeavySourceFileCount = [long]0
        MaxSourceLineCount = [long]0
        MaxTrackedSourceLineCount = [long]0
        MaxDescendantDepth = $Depth
    }
}

function Add-ToDirectoryAncestors {
    param(
        [Parameter(Mandatory)][hashtable]$DirectoryNodes,
        [Parameter(Mandatory)][AllowEmptyString()][string]$StartDirectory,
        [Parameter(Mandatory)][long]$SizeBytes,
        [Parameter(Mandatory)][long]$FileIncrement,
        [Parameter(Mandatory)][long]$DirIncrement
    )

    $current = $StartDirectory
    while ($null -ne $current) {
        if ($DirectoryNodes.ContainsKey($current)) {
            $node = $DirectoryNodes[$current]
            $node.RecursiveSizeBytes = [long]$node.RecursiveSizeBytes + $SizeBytes
            $node.RecursiveFileCount = [long]$node.RecursiveFileCount + $FileIncrement
            $node.RecursiveDirCount = [long]$node.RecursiveDirCount + $DirIncrement
        }
        $current = Get-ParentRelativePath -RelativePath $current
    }
}

function Add-FileStructureMetricsToAncestors {
    param(
        [Parameter(Mandatory)][hashtable]$DirectoryNodes,
        [Parameter(Mandatory)][AllowEmptyString()][string]$StartDirectory,
        [Parameter(Mandatory)][string]$GitStatus,
        [Parameter(Mandatory)][bool]$IsSourceLike,
        [Parameter()][AllowNull()][object]$LineCount,
        [Parameter(Mandatory)][long]$SizeBytes,
        [Parameter(Mandatory)][int]$FileDepth
    )

    $current = $StartDirectory
    while ($null -ne $current) {
        if ($DirectoryNodes.ContainsKey($current)) {
            $node = $DirectoryNodes[$current]
            switch ($GitStatus) {
                "tracked" { $node.RecursiveTrackedFileCount++ }
                "untracked" { $node.RecursiveUntrackedFileCount++ }
                "ignored" { $node.RecursiveIgnoredFileCount++ }
                default { $node.RecursiveOtherFileCount++ }
            }

            if ($IsSourceLike) {
                $node.RecursiveSourceFileCount++
                $isTopHeavy = ($SizeBytes -gt (50KB)) -or ($null -ne $LineCount -and [long]$LineCount -gt 1000)
                if ($isTopHeavy) { $node.RecursiveTopHeavySourceFileCount++ }
                if ($null -ne $LineCount -and [long]$LineCount -gt [long]$node.MaxSourceLineCount) {
                    $node.MaxSourceLineCount = [long]$LineCount
                }

                if ($GitStatus -eq "tracked") {
                    $node.RecursiveTrackedSourceFileCount++
                    if ($isTopHeavy) { $node.RecursiveTrackedTopHeavySourceFileCount++ }
                    if ($null -ne $LineCount -and [long]$LineCount -gt [long]$node.MaxTrackedSourceLineCount) {
                        $node.MaxTrackedSourceLineCount = [long]$LineCount
                    }
                }
            }

            if ($FileDepth -gt [int]$node.MaxDescendantDepth) {
                $node.MaxDescendantDepth = $FileDepth
            }
        }
        $current = Get-ParentRelativePath -RelativePath $current
    }
}

function Get-StructuralCandidateRows {
    param(
        [Parameter(Mandatory)][hashtable]$DirectoryNodes
    )

    $rows = [System.Collections.Generic.List[object]]::new()
    foreach ($node in $DirectoryNodes.Values) {
        if ([string]::IsNullOrEmpty([string]$node.RelativePath)) { continue }
        if ([bool]$node.IsReparsePoint) { continue }

        [int]$score = 0
        $reasons = [System.Collections.Generic.List[string]]::new()
        $directTracked = @($node.DirectFiles | Where-Object GitStatus -eq "tracked").Count
        $directSource = @($node.DirectFiles | Where-Object { $_.GitStatus -eq "tracked" -and (Test-IsSourceLikeExtension -Extension $_.Extension) }).Count
        [long]$tracked = $node.RecursiveTrackedFileCount
        [long]$sourceFiles = $node.RecursiveTrackedSourceFileCount
        [long]$topHeavy = $node.RecursiveTrackedTopHeavySourceFileCount
        [int]$directDirs = $node.DirectDirs.Count
        [int]$depthSpan = [Math]::Max(0, [int]$node.MaxDescendantDepth - [int]$node.Depth)
        [long]$bytes = $node.RecursiveSizeBytes

        if ($topHeavy -gt 0) {
            $score += [Math]::Min(6, 2 + [int]$topHeavy)
            $reasons.Add("$topHeavy fichier(s) source au-dessus du seuil quality:top-heavy")
        }

        if ($tracked -ge 200) { $score += 4; $reasons.Add("$tracked fichiers tracked dans le sous-arbre") }
        elseif ($tracked -ge 100) { $score += 3; $reasons.Add("$tracked fichiers tracked dans le sous-arbre") }
        elseif ($tracked -ge 50) { $score += 2; $reasons.Add("$tracked fichiers tracked dans le sous-arbre") }
        elseif ($tracked -ge 25) { $score += 1; $reasons.Add("$tracked fichiers tracked dans le sous-arbre") }

        if ($directTracked -ge 20) { $score += 3; $reasons.Add("$directTracked fichiers tracked directement dans le dossier") }
        elseif ($directTracked -ge 10) { $score += 2; $reasons.Add("$directTracked fichiers tracked directement dans le dossier") }
        elseif ($directTracked -ge 6) { $score += 1; $reasons.Add("$directTracked fichiers tracked directement dans le dossier") }

        if ($sourceFiles -ge 100) { $score += 3; $reasons.Add("$sourceFiles fichiers source dans le sous-arbre") }
        elseif ($sourceFiles -ge 50) { $score += 2; $reasons.Add("$sourceFiles fichiers source dans le sous-arbre") }
        elseif ($sourceFiles -ge 20) { $score += 1; $reasons.Add("$sourceFiles fichiers source dans le sous-arbre") }

        if ($directDirs -ge 15) { $score += 2; $reasons.Add("$directDirs sous-dossiers directs") }
        elseif ($directDirs -ge 8) { $score += 1; $reasons.Add("$directDirs sous-dossiers directs") }

        if ($depthSpan -ge 5) { $score += 2; $reasons.Add("profondeur interne $depthSpan") }
        elseif ($depthSpan -ge 3) { $score += 1; $reasons.Add("profondeur interne $depthSpan") }

        if ($bytes -ge 5MB) { $score += 2; $reasons.Add("empreinte detaillee $(Format-ByteSize $bytes)") }
        elseif ($bytes -ge 1MB) { $score += 1; $reasons.Add("empreinte detaillee $(Format-ByteSize $bytes)") }

        # Evite de transformer chaque petit dossier en faux hotspot. Le score
        # est un signal de tri, jamais une decision de refactorisation.
        if ($score -lt 2) { continue }

        $rows.Add([pscustomobject]@{
            path = $node.RelativePath
            score = $score
            size_bytes = [long]$bytes
            tracked_files = [long]$tracked
            source_files = [long]$sourceFiles
            direct_tracked_files = [int]$directTracked
            direct_source_files = [int]$directSource
            direct_dirs = [int]$directDirs
            depth_span = [int]$depthSpan
            top_heavy_source_files = [long]$topHeavy
            max_source_lines = [long]$node.MaxTrackedSourceLineCount
            reasons = ($reasons -join "; ")
        })
    }

    return @(
        $rows | Sort-Object -Property `
            @{ Expression = { [int]$_.score }; Descending = $true }, `
            @{ Expression = { [long]$_.top_heavy_source_files }; Descending = $true }, `
            @{ Expression = { [long]$_.tracked_files }; Descending = $true }, `
            @{ Expression = { [long]$_.size_bytes }; Descending = $true }, `
            path
    )
}

function Invoke-GitLines {
    param(
        [Parameter(Mandatory)][string]$Repository,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$Errors
    )
    try {
        $output = & git -c core.quotepath=false -C $Repository @Arguments 2>$null
        if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') exited with code $LASTEXITCODE" }
        return @($output)
    }
    catch {
        $Errors.Add([pscustomobject]@{ path = $Repository; operation = "git $($Arguments -join ' ')"; error = $_.Exception.Message })
        return @()
    }
}

function Add-GitLinesToSet {
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$Set,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Lines
    )
    foreach ($line in $Lines) {
        if ($null -eq $line) { continue }
        $text = ($line.ToString() -replace "\\", "/").Trim()
        if ($text.Length -gt 0) { [void]$Set.Add($text) }
    }
}

function Get-FileGitStatus {
    param(
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$Tracked,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$Untracked,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$Ignored
    )
    if ($Tracked.Contains($RelativePath)) { return "tracked" }
    if ($Ignored.Contains($RelativePath)) { return "ignored" }
    if ($Untracked.Contains($RelativePath)) { return "untracked" }
    return "other"
}

function Write-TreeDirectory {
    param(
        [Parameter(Mandatory)][System.IO.StreamWriter]$Writer,
        [Parameter(Mandatory)][hashtable]$DirectoryNodes,
        [Parameter(Mandatory)][string]$DirectoryPath,
        [Parameter(Mandatory)][AllowEmptyString()][string]$Prefix
    )

    $node = $DirectoryNodes[$DirectoryPath]
    $dirChildren = @($node.DirectDirs | Sort-Object { ($_ -split "/")[-1] })
    $fileChildren = @($node.DirectFiles | Sort-Object Name)
    $children = [System.Collections.Generic.List[object]]::new()
    foreach ($dirPath in $dirChildren) { $children.Add([pscustomobject]@{ Kind = "dir"; Value = $dirPath }) }
    foreach ($file in $fileChildren) { $children.Add([pscustomobject]@{ Kind = "file"; Value = $file }) }

    for ($i = 0; $i -lt $children.Count; $i++) {
        $last = ($i -eq $children.Count - 1)
        $connector = if ($last) { "└── " } else { "├── " }
        $nextPrefix = $Prefix + $(if ($last) { "    " } else { "│   " })
        $child = $children[$i]

        if ($child.Kind -eq "dir") {
            $childNode = $DirectoryNodes[$child.Value]
            $name = (($child.Value -split "/")[-1]) + "/"
            $suffix = "[{0} | {1} files | {2} dirs]" -f (Format-ByteSize ([long]$childNode.RecursiveSizeBytes)), $childNode.RecursiveFileCount, $childNode.RecursiveDirCount
            if ($childNode.IsReparsePoint) { $suffix += " [reparse-point, non traverse]" }
            $Writer.WriteLine("$Prefix$connector$name $suffix")
            if (-not $childNode.IsReparsePoint) {
                Write-TreeDirectory -Writer $Writer -DirectoryNodes $DirectoryNodes -DirectoryPath $child.Value -Prefix $nextPrefix
            }
        }
        else {
            $file = $child.Value
            $Writer.WriteLine(("$Prefix$connector$($file.Name) [{0} | {1}]" -f (Format-ByteSize ([long]$file.SizeBytes)), $file.GitStatus))
        }
    }
}

function Invoke-EndToEndSelfTest {
    param([Parameter(Mandatory)][string]$ScriptPath)

    # Regression guard: mandatory HashSet parameters must accept empty sets.
    $bindingProbe = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::OrdinalIgnoreCase
    )
    Add-GitLinesToSet -Set $bindingProbe -Lines @()
    $probeStatus = Get-FileGitStatus `
        -RelativePath "__binding_probe__" `
        -Tracked $bindingProbe `
        -Untracked $bindingProbe `
        -Ignored $bindingProbe
    if ($probeStatus -ne "other") {
        throw "self-test: empty HashSet parameter binding regression"
    }

    # Regression guard: the root tree renderer intentionally starts with Prefix="".
    $probeDir = [ordered]@{
        RelativePath = "probe"
        FullPath = ""
        Root = "probe"
        Depth = 1
        IsReparsePoint = $false
        DirectFiles = [System.Collections.Generic.List[object]]::new()
        DirectDirs = [System.Collections.Generic.List[string]]::new()
        RecursiveSizeBytes = [long]0
        RecursiveFileCount = [long]0
        RecursiveDirCount = [long]0
    }
    $probeNodes = @{ "probe" = $probeDir }
    $probeMarkdown = Join-Path ([System.IO.Path]::GetTempPath()) ("repo-tree-prefix-probe-{0}.txt" -f [guid]::NewGuid().ToString("N"))
    $probeWriter = [System.IO.StreamWriter]::new(
        $probeMarkdown,
        $false,
        [System.Text.UTF8Encoding]::new($false)
    )
    try {
        Write-TreeDirectory `
            -Writer $probeWriter `
            -DirectoryNodes $probeNodes `
            -DirectoryPath "probe" `
            -Prefix ""
    }
    finally {
        $probeWriter.Dispose()
        Remove-Item -LiteralPath $probeMarkdown -Force -ErrorAction SilentlyContinue
    }

    $sandbox = Join-Path ([System.IO.Path]::GetTempPath()) ("repository-inventory-selftest-" + [guid]::NewGuid().ToString("N"))
    $testRepo = Join-Path $sandbox "repo"
    $testOutput = Join-Path $sandbox "output"

    try {
        [System.IO.Directory]::CreateDirectory($testRepo) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo "src/nested")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo ".venv")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo "node_modules/pkg")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo "src/.next/cache")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo ".artifacts/old-run")) | Out-Null

        [System.IO.File]::WriteAllText((Join-Path $testRepo ".gitignore"), ".venv/`nnode_modules/`n.next/`n.artifacts/`nignored.txt`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "tracked.txt"), "tracked`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "ignored.txt"), "ignored`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "untracked.txt"), "untracked`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "src/nested/sample.txt"), "nested`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo ".venv/pyvenv.cfg"), "home = selftest`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo ".venv/dummy.bin"), "excluded`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "node_modules/pkg/index.js"), "generated vendor`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "src/.next/cache/chunk.bin"), "generated next cache`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo ".artifacts/old-run/report.txt"), "old artifact`n")

        & git -C $testRepo init -q
        if ($LASTEXITCODE -ne 0) { throw "self-test: git init failed" }
        & git -C $testRepo config user.email "repository-inventory-selftest@example.invalid"
        & git -C $testRepo config user.name "Repository Inventory Self Test"
        & git -C $testRepo add -- .gitignore tracked.txt
        if ($LASTEXITCODE -ne 0) { throw "self-test: git add failed" }
        & git -C $testRepo commit -q -m "self-test baseline"
        if ($LASTEXITCODE -ne 0) { throw "self-test: git commit failed" }

        $hostPath = (Get-Process -Id $PID).Path
        if (-not $hostPath) { throw "self-test: PowerShell host path unavailable" }

        & $hostPath -NoLogo -NoProfile -ExecutionPolicy Bypass -File $ScriptPath `
            -RepoRoot $testRepo `
            -OutputRoot $testOutput `
            -SkipSelfTest
        $childExitCode = $LASTEXITCODE
        if ($childExitCode -ne 0) {
            throw "self-test: child inventory exited with code $childExitCode"
        }

        $runDir = Get-ChildItem -LiteralPath $testOutput -Directory |
            Sort-Object LastWriteTimeUtc -Descending |
            Select-Object -First 1
        if ($null -eq $runDir) { throw "self-test: no output directory produced" }

        foreach ($required in @(
            "README.md",
            "ROOT_FILES.md",
            "STRUCTURAL_CANDIDATES.md",
            "inventory.csv",
            "inventory.json",
            "root-summary.csv",
            "structural-candidates.csv",
            "excluded-trees.csv"
        )) {
            if (-not (Test-Path -LiteralPath (Join-Path $runDir.FullName $required) -PathType Leaf)) {
                throw "self-test: missing output $required"
            }
        }
        if (-not (Test-Path -LiteralPath (Join-Path $runDir.FullName "roots/src.md") -PathType Leaf)) {
            throw "self-test: missing roots/src.md"
        }

        $inventory = @(Import-Csv -LiteralPath (Join-Path $runDir.FullName "inventory.csv"))
        $expectedStatuses = @{
            "tracked.txt" = "tracked"
            "ignored.txt" = "ignored"
            "untracked.txt" = "untracked"
        }
        foreach ($item in $expectedStatuses.GetEnumerator()) {
            $row = $inventory | Where-Object { $_.path -eq $item.Key -and $_.type -eq "file" } | Select-Object -First 1
            if ($null -eq $row) { throw "self-test: missing inventory row $($item.Key)" }
            if ($row.git_status -ne $item.Value) {
                throw "self-test: $($item.Key) expected $($item.Value), got $($row.git_status)"
            }
        }

        if ($inventory | Where-Object { $_.path -eq ".git" -or $_.path -like ".git/*" }) {
            throw "self-test: .git unexpectedly present in detailed inventory"
        }
        if ($inventory | Where-Object { $_.path -eq ".venv" -or $_.path -like ".venv/*" }) {
            throw "self-test: virtualenv unexpectedly present in detailed inventory"
        }
        foreach ($excludedPath in @("node_modules", "src/.next", ".artifacts")) {
            if ($inventory | Where-Object { $_.path -eq $excludedPath -or $_.path -like "$excludedPath/*" }) {
                throw "self-test: $excludedPath unexpectedly present in detailed inventory"
            }
        }

        $readmeText = [System.IO.File]::ReadAllText((Join-Path $runDir.FullName "README.md"))
        foreach ($aggregateName in @(".git", ".venv", "node_modules", "src/.next", ".artifacts")) {
            if (-not $readmeText.Contains($aggregateName)) {
                throw "self-test: aggregate $aggregateName missing from README"
            }
        }

        Write-Host "Self-test PowerShell/filesystem/Git : OK" -ForegroundColor Green
    }
    finally {
        if (Test-Path -LiteralPath $sandbox) {
            Remove-Item -LiteralPath $sandbox -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

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

$inventoryRows = [System.Collections.Generic.List[object]]::new()
foreach ($key in @($directoryNodes.Keys | Sort-Object)) {
    $node = $directoryNodes[$key]
    $inventoryRows.Add([pscustomobject]@{
        path = if ($key -eq "") { "." } else { $key }
        root = $node.Root
        depth = $node.Depth
        type = "directory"
        size_bytes = 0
        recursive_size_bytes = [long]$node.RecursiveSizeBytes
        direct_file_count = $node.DirectFiles.Count
        recursive_file_count = [long]$node.RecursiveFileCount
        direct_dir_count = $node.DirectDirs.Count
        recursive_dir_count = [long]$node.RecursiveDirCount
        tracked_recursive_file_count = [long]$node.RecursiveTrackedFileCount
        source_recursive_file_count = [long]$node.RecursiveSourceFileCount
        tracked_source_recursive_file_count = [long]$node.RecursiveTrackedSourceFileCount
        top_heavy_source_file_count = [long]$node.RecursiveTopHeavySourceFileCount
        tracked_top_heavy_source_file_count = [long]$node.RecursiveTrackedTopHeavySourceFileCount
        max_source_lines = [long]$node.MaxSourceLineCount
        max_tracked_source_lines = [long]$node.MaxTrackedSourceLineCount
        git_status = ""
        extension = ""
        line_count = ""
        source_like = ""
        reparse_point = [bool]$node.IsReparsePoint
    })
}
foreach ($file in $fileRecords) {
    $inventoryRows.Add([pscustomobject]@{
        path = $file.Path
        root = $file.Root
        depth = $file.Depth
        type = "file"
        size_bytes = [long]$file.SizeBytes
        recursive_size_bytes = [long]$file.SizeBytes
        direct_file_count = 0
        recursive_file_count = 0
        direct_dir_count = 0
        recursive_dir_count = 0
        tracked_recursive_file_count = 0
        source_recursive_file_count = 0
        tracked_source_recursive_file_count = 0
        top_heavy_source_file_count = 0
        tracked_top_heavy_source_file_count = 0
        max_source_lines = 0
        max_tracked_source_lines = 0
        git_status = $file.GitStatus
        extension = $file.Extension
        line_count = if ($null -eq $file.LineCount) { "" } else { [long]$file.LineCount }
        source_like = [bool]$file.IsSourceLike
        reparse_point = $false
    })
}

$inventoryCsv = Join-Path $outputDir "inventory.csv"
$inventoryJson = Join-Path $outputDir "inventory.json"
$rootSummaryCsv = Join-Path $outputDir "root-summary.csv"
$readmePath = Join-Path $outputDir "README.md"
$rootFilesPath = Join-Path $outputDir "ROOT_FILES.md"
$structuralCandidatesPath = Join-Path $outputDir "STRUCTURAL_CANDIDATES.md"
$structuralCandidatesCsv = Join-Path $outputDir "structural-candidates.csv"
$excludedTreesCsv = Join-Path $outputDir "excluded-trees.csv"
$racePath = Join-Path $outputDir "snapshot-races.csv"
$errorPath = Join-Path $outputDir "scan-errors.csv"

$inventoryRows | Sort-Object path, type | Export-Csv -LiteralPath $inventoryCsv -NoTypeInformation -Encoding utf8

$jsonWriter = [System.IO.StreamWriter]::new($inventoryJson, $false, [System.Text.UTF8Encoding]::new($false))
try {
    $jsonWriter.WriteLine("[")
    $sortedInventory = @($inventoryRows | Sort-Object path, type)
    for ($i = 0; $i -lt $sortedInventory.Count; $i++) {
        $json = $sortedInventory[$i] | ConvertTo-Json -Depth 4 -Compress
        if ($i -lt $sortedInventory.Count - 1) { $jsonWriter.WriteLine("  $json,") } else { $jsonWriter.WriteLine("  $json") }
    }
    $jsonWriter.WriteLine("]")
}
finally { $jsonWriter.Dispose() }

if ($raceFindings.Count -gt 0) { $raceFindings | Export-Csv -LiteralPath $racePath -NoTypeInformation -Encoding utf8 }
if ($scanErrors.Count -gt 0) { $scanErrors | Export-Csv -LiteralPath $errorPath -NoTypeInformation -Encoding utf8 }

$excludedTrees | Sort-Object path | Export-Csv -LiteralPath $excludedTreesCsv -NoTypeInformation -Encoding utf8
$structuralCandidates = @(Get-StructuralCandidateRows -DirectoryNodes $directoryNodes)
$structuralCandidates | Export-Csv -LiteralPath $structuralCandidatesCsv -NoTypeInformation -Encoding utf8
if (-not (Test-Path -LiteralPath $structuralCandidatesCsv)) {
    [System.IO.File]::WriteAllText($structuralCandidatesCsv, "", [System.Text.UTF8Encoding]::new($false))
}

$structuralWriter = [System.IO.StreamWriter]::new($structuralCandidatesPath, $false, [System.Text.UTF8Encoding]::new($false))
try {
    $structuralWriter.WriteLine("# Candidats structurels")
    $structuralWriter.WriteLine("")
    $structuralWriter.WriteLine("Ce classement sert a choisir les zones a **analyser**. Il ne constitue jamais une instruction automatique de scinder, de deplacer ou de supprimer des fichiers.")
    $structuralWriter.WriteLine("")
    $structuralWriter.WriteLine("Le score combine densite de fichiers tracked/source, nombre de sous-dossiers, profondeur, empreinte detaillee et presence de fichiers source depassant les seuils informatifs de ``quality:top-heavy`` (>1000 lignes ou >50 KB).")
    $structuralWriter.WriteLine("")
    $structuralWriter.WriteLine("| # | Dossier | Score | Tracked | Source | Direct tracked | Sous-dossiers | Profondeur interne | Top-heavy source | Max lignes source | Signaux |")
    $structuralWriter.WriteLine("| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    $rank = 0
    foreach ($candidate in ($structuralCandidates | Select-Object -First $TopCandidateCount)) {
        $rank++
        $structuralWriter.WriteLine(("| {0} | ``{1}/`` | {2} | {3} | {4} | {5} | {6} | {7} | {8} | {9} | {10} |" -f `
            $rank,
            (Escape-MarkdownCell $candidate.path),
            $candidate.score,
            $candidate.tracked_files,
            $candidate.source_files,
            $candidate.direct_tracked_files,
            $candidate.direct_dirs,
            $candidate.depth_span,
            $candidate.top_heavy_source_files,
            $candidate.max_source_lines,
            (Escape-MarkdownCell $candidate.reasons)))
    }
    if ($rank -eq 0) {
        $structuralWriter.WriteLine("| - | Aucun candidat au-dessus du seuil heuristique | - | - | - | - | - | - | - | - | - |")
    }
}
finally { $structuralWriter.Dispose() }

$rootDirectories = @($directoryNodes[""].DirectDirs | ForEach-Object { $directoryNodes[$_] } | Sort-Object -Property @{ Expression = { [long]$_.RecursiveSizeBytes }; Descending = $true })
$rootSummaries = [System.Collections.Generic.List[object]]::new()

foreach ($rootNode in $rootDirectories) {
    $rootName = $rootNode.RelativePath
    $rootFiles = @($fileRecords | Where-Object Root -eq $rootName)
    $rootDirs = @($directoryNodes.Values | Where-Object { $_.Root -eq $rootName -and $_.RelativePath -ne $rootName })
    $trackedCount = @($rootFiles | Where-Object GitStatus -eq "tracked").Count
    $untrackedCount = @($rootFiles | Where-Object GitStatus -eq "untracked").Count
    $ignoredCount = @($rootFiles | Where-Object GitStatus -eq "ignored").Count
    $otherCount = @($rootFiles | Where-Object GitStatus -eq "other").Count
    $depths = @($rootFiles | ForEach-Object Depth; $rootDirs | ForEach-Object Depth)
    $maxDepth = if ($depths.Count -gt 0) { ($depths | Measure-Object -Maximum).Maximum } else { 0 }
    $rootExcludedTrees = @($excludedTrees | Where-Object { (Get-RootName -RelativePath $_.path) -eq $rootName })
    [long]$rootExcludedBytes = 0
    foreach ($excludedTree in $rootExcludedTrees) { $rootExcludedBytes += [long]$excludedTree.size_bytes }
    [long]$rootMeasuredBytes = [long]$rootNode.RecursiveSizeBytes + $rootExcludedBytes

    $rootSummaries.Add([pscustomobject]@{
        root = $rootName
        size_bytes = [long]$rootNode.RecursiveSizeBytes
        size_human = Format-ByteSize ([long]$rootNode.RecursiveSizeBytes)
        detail_size_bytes = [long]$rootNode.RecursiveSizeBytes
        aggregate_only_size_bytes = $rootExcludedBytes
        measured_size_bytes = $rootMeasuredBytes
        measured_size_human = Format-ByteSize $rootMeasuredBytes
        file_count = [long]$rootNode.RecursiveFileCount
        dir_count = [long]$rootNode.RecursiveDirCount
        max_depth = $maxDepth
        tracked_files = $trackedCount
        untracked_files = $untrackedCount
        ignored_files = $ignoredCount
        other_files = $otherCount
        tracked_source_files = [long]$rootNode.RecursiveTrackedSourceFileCount
        tracked_top_heavy_source_files = [long]$rootNode.RecursiveTrackedTopHeavySourceFileCount
        detail_excluded = $false
        exclusion_reason = ""
    })
}


foreach ($tree in $excludedTrees) {
    if ($tree.path -notmatch "/") {
        $rootSummaries.Add([pscustomobject]@{
            root = $tree.path
            size_bytes = [long]$tree.size_bytes
            size_human = Format-ByteSize ([long]$tree.size_bytes)
            detail_size_bytes = 0
            aggregate_only_size_bytes = [long]$tree.size_bytes
            measured_size_bytes = [long]$tree.size_bytes
            measured_size_human = Format-ByteSize ([long]$tree.size_bytes)
            file_count = [long]$tree.file_count
            dir_count = [long]([Math]::Max(0, [long]$tree.dir_count - 1))
            max_depth = [int]$tree.max_depth
            tracked_files = $null
            untracked_files = $null
            ignored_files = $null
            other_files = $null
            tracked_source_files = $null
            tracked_top_heavy_source_files = $null
            detail_excluded = $true
            exclusion_reason = $tree.reason
        })

        $safeName = Get-SafeFileName -Name $tree.path
        $excludedDoc = Join-Path $rootsDir "$safeName.md"
        $excludedWriter = [System.IO.StreamWriter]::new($excludedDoc, $false, [System.Text.UTF8Encoding]::new($false))
        try {
            $excludedWriter.WriteLine("# ``$($tree.path)/``")
            $excludedWriter.WriteLine("")
            $excludedWriter.WriteLine("Ce dossier racine est mesure en agregat mais volontairement exclu de l'inventaire fichier par fichier.")
            $excludedWriter.WriteLine("")
            $excludedWriter.WriteLine("- Raison : $($tree.reason)")
            $excludedWriter.WriteLine("- Taille recursive : $(Format-ByteSize ([long]$tree.size_bytes)) ($($tree.size_bytes) octets)")
            $excludedWriter.WriteLine("- Fichiers : $($tree.file_count)")
            $excludedWriter.WriteLine("- Dossiers, racine incluse : $($tree.dir_count)")
            $excludedWriter.WriteLine("- Profondeur maximale : $($tree.max_depth)")
        }
        finally { $excludedWriter.Dispose() }
    }
}

$rootSummaries | Sort-Object -Property @{ Expression = { [long]$_.size_bytes }; Descending = $true } | Export-Csv -LiteralPath $rootSummaryCsv -NoTypeInformation -Encoding utf8

$rootDirectFiles = @($fileRecords | Where-Object Parent -eq "" | Sort-Object Name)
$rootFilesWriter = [System.IO.StreamWriter]::new($rootFilesPath, $false, [System.Text.UTF8Encoding]::new($false))
try {
    $rootFilesWriter.WriteLine("# Fichiers directement a la racine")
    $rootFilesWriter.WriteLine("")
    $rootFilesWriter.WriteLine("| Fichier | Taille | Octets | Git |")
    $rootFilesWriter.WriteLine("| --- | ---: | ---: | --- |")
    foreach ($file in $rootDirectFiles) {
        $rootFilesWriter.WriteLine(("| ``{0}`` | {1} | {2} | {3} |" -f (Escape-MarkdownCell $file.Name), (Format-ByteSize ([long]$file.SizeBytes)), $file.SizeBytes, $file.GitStatus))
    }
}
finally { $rootFilesWriter.Dispose() }

foreach ($rootNode in $rootDirectories) {
    $rootName = $rootNode.RelativePath
    $safeName = Get-SafeFileName -Name $rootName
    $path = Join-Path $rootsDir "$safeName.md"
    $rootFiles = @($fileRecords | Where-Object Root -eq $rootName)
    $rootDirs = @($directoryNodes.Values | Where-Object { $_.Root -eq $rootName -and $_.RelativePath -ne $rootName })
    $trackedCount = @($rootFiles | Where-Object GitStatus -eq "tracked").Count
    $untrackedCount = @($rootFiles | Where-Object GitStatus -eq "untracked").Count
    $ignoredCount = @($rootFiles | Where-Object GitStatus -eq "ignored").Count
    $otherCount = @($rootFiles | Where-Object GitStatus -eq "other").Count
    $depths = @($rootFiles | ForEach-Object Depth; $rootDirs | ForEach-Object Depth)
    $maxDepth = if ($depths.Count -gt 0) { ($depths | Measure-Object -Maximum).Maximum } else { 0 }
    $extensions = @($rootFiles | Group-Object Extension | Sort-Object Count -Descending)
    $largestFiles = @($rootFiles | Sort-Object -Property @{ Expression = { [long]$_.SizeBytes }; Descending = $true } | Select-Object -First 20)
    $largestDirs = @($rootDirs | Sort-Object -Property @{ Expression = { [long]$_.RecursiveSizeBytes }; Descending = $true } | Select-Object -First 20)

    $writer = [System.IO.StreamWriter]::new($path, $false, [System.Text.UTF8Encoding]::new($false))
    try {
        $writer.WriteLine("# ``$rootName/``")
        $writer.WriteLine("")
        $writer.WriteLine("| Metrique | Valeur |")
        $writer.WriteLine("| --- | ---: |")
        $writer.WriteLine(("| Taille recursive | {0} ({1} octets) |" -f (Format-ByteSize ([long]$rootNode.RecursiveSizeBytes)), $rootNode.RecursiveSizeBytes))
        $writer.WriteLine("| Fichiers | $($rootNode.RecursiveFileCount) |")
        $writer.WriteLine("| Sous-dossiers | $($rootNode.RecursiveDirCount) |")
        $writer.WriteLine("| Profondeur maximale | $maxDepth |")
        $writer.WriteLine("| Tracked | $trackedCount |")
        $writer.WriteLine("| Untracked | $untrackedCount |")
        $writer.WriteLine("| Ignored | $ignoredCount |")
        $writer.WriteLine("| Other | $otherCount |")
        $writer.WriteLine("| Fichiers source inventories | $($rootNode.RecursiveSourceFileCount) |")
        $writer.WriteLine("| Fichiers source tracked | $($rootNode.RecursiveTrackedSourceFileCount) |")
        $writer.WriteLine("| Fichiers source tracked top-heavy | $($rootNode.RecursiveTrackedTopHeavySourceFileCount) |")
        $writer.WriteLine("| Max lignes source tracked | $($rootNode.MaxTrackedSourceLineCount) |")
        $writer.WriteLine("")

        $writer.WriteLine("## Extensions")
        $writer.WriteLine("")
        $writer.WriteLine("| Extension | Fichiers | Taille |")
        $writer.WriteLine("| --- | ---: | ---: |")
        foreach ($group in ($extensions | Select-Object -First 30)) {
            [long]$extSize = 0
            foreach ($item in $group.Group) { $extSize += [long]$item.SizeBytes }
            $writer.WriteLine(("| ``{0}`` | {1} | {2} |" -f (Escape-MarkdownCell $group.Name), $group.Count, (Format-ByteSize $extSize)))
        }
        $writer.WriteLine("")

        $writer.WriteLine("## 20 plus gros fichiers")
        $writer.WriteLine("")
        $writer.WriteLine("| Fichier | Taille | Git |")
        $writer.WriteLine("| --- | ---: | --- |")
        foreach ($file in $largestFiles) {
            $writer.WriteLine(("| ``{0}`` | {1} | {2} |" -f (Escape-MarkdownCell $file.Path), (Format-ByteSize ([long]$file.SizeBytes)), $file.GitStatus))
        }
        $writer.WriteLine("")

        $writer.WriteLine("## 20 plus gros sous-arbres")
        $writer.WriteLine("")
        $writer.WriteLine("| Dossier | Taille recursive | Fichiers | Dossiers |")
        $writer.WriteLine("| --- | ---: | ---: | ---: |")
        foreach ($dir in $largestDirs) {
            $writer.WriteLine(("| ``{0}/`` | {1} | {2} | {3} |" -f (Escape-MarkdownCell $dir.RelativePath), (Format-ByteSize ([long]$dir.RecursiveSizeBytes)), $dir.RecursiveFileCount, $dir.RecursiveDirCount))
        }
        $writer.WriteLine("")

        $writer.WriteLine("## Arborescence exhaustive")
        $writer.WriteLine("")
        $writer.WriteLine('```text')
        $writer.WriteLine(("{0}/ [{1} | {2} files | {3} dirs]" -f $rootName, (Format-ByteSize ([long]$rootNode.RecursiveSizeBytes)), $rootNode.RecursiveFileCount, $rootNode.RecursiveDirCount))
        Write-TreeDirectory -Writer $writer -DirectoryNodes $directoryNodes -DirectoryPath $rootName -Prefix ""
        $writer.WriteLine('```')
    }
    finally { $writer.Dispose() }
}

$includedRoot = $directoryNodes[""]
[long]$includedBytes = $includedRoot.RecursiveSizeBytes
[long]$excludedBytes = 0
[long]$excludedFiles = 0
[long]$excludedDirs = 0
foreach ($tree in $excludedTrees) {
    $excludedBytes += [long]$tree.size_bytes
    $excludedFiles += [long]$tree.file_count
    $excludedDirs += [long]$tree.dir_count
}
[long]$measuredDiskBytes = $includedBytes + $excludedBytes
$totalTracked = @($fileRecords | Where-Object GitStatus -eq "tracked").Count
$totalUntracked = @($fileRecords | Where-Object GitStatus -eq "untracked").Count
$totalIgnored = @($fileRecords | Where-Object GitStatus -eq "ignored").Count
$totalOther = @($fileRecords | Where-Object GitStatus -eq "other").Count
$largestFilesAll = @($fileRecords | Sort-Object -Property @{ Expression = { [long]$_.SizeBytes }; Descending = $true } | Select-Object -First 50)
$largestDirsAll = @($directoryNodes.Values | Where-Object RelativePath -ne "" | Sort-Object -Property @{ Expression = { [long]$_.RecursiveSizeBytes }; Descending = $true } | Select-Object -First 50)

$readme = [System.IO.StreamWriter]::new($readmePath, $false, [System.Text.UTF8Encoding]::new($false))
try {
    $readme.WriteLine("# Inventaire complet du depot")
    $readme.WriteLine("")
    $readme.WriteLine("- Snapshot commence : ``$($startedAt.ToString("o"))``")
    $readme.WriteLine("- Scan termine : ``$($finishedScanAt.ToString("o"))``")
    $readme.WriteLine("- Repository : ``$repo``")
    $readme.WriteLine("- HEAD debut : ``$headStart``")
    $readme.WriteLine("- HEAD fin : ``$headEnd``")
    $readme.WriteLine("- Worktree avec changements locaux au debut (informatif, non bloquant) : ``$($statusStart.Count -gt 0)``")
    $readme.WriteLine("- Duree du snapshot : ``$([Math]::Round(($finishedScanAt - $startedAt).TotalSeconds, 2)) s``")
    $readme.WriteLine("- snapshot_race_detected (informatif par defaut) : ``$($raceFindings.Count -gt 0)``")
    $readme.WriteLine("- Erreurs de scan : ``$($scanErrors.Count)``")
    $readme.WriteLine("")
    $readme.WriteLine("Les sorties de cet audit ont ete creees apres le snapshot et ne sont donc pas incluses dans leurs propres mesures.")
    $readme.WriteLine("")

    $readme.WriteLine("## Totaux")
    $readme.WriteLine("")
    $readme.WriteLine("| Perimetre | Taille | Fichiers | Dossiers |")
    $readme.WriteLine("| --- | ---: | ---: | ---: |")
    $readme.WriteLine(("| Detail inventorie | {0} ({1} octets) | {2} | {3} |" -f (Format-ByteSize $includedBytes), $includedBytes, $includedRoot.RecursiveFileCount, $includedRoot.RecursiveDirCount))
    $readme.WriteLine(("| Arbres exclus du detail | {0} ({1} octets) | {2} | {3} |" -f (Format-ByteSize $excludedBytes), $excludedBytes, $excludedFiles, $excludedDirs))
    $readme.WriteLine(("| Empreinte disque mesuree | {0} ({1} octets) | {2} | {3} |" -f (Format-ByteSize $measuredDiskBytes), $measuredDiskBytes, ([long]$includedRoot.RecursiveFileCount + $excludedFiles), ([long]$includedRoot.RecursiveDirCount + $excludedDirs)))
    $readme.WriteLine("")

    $readme.WriteLine("## Statuts Git des fichiers inventories")
    $readme.WriteLine("")
    $readme.WriteLine("| Statut | Fichiers |")
    $readme.WriteLine("| --- | ---: |")
    $readme.WriteLine("| tracked | $totalTracked |")
    $readme.WriteLine("| untracked | $totalUntracked |")
    $readme.WriteLine("| ignored | $totalIgnored |")
    $readme.WriteLine("| other | $totalOther |")
    $readme.WriteLine("")

    $readme.WriteLine("## Dossiers racine")
    $readme.WriteLine("")
    $readme.WriteLine("| Racine | Detail inventorie | Agregat exclu | Mesure totale | Fichiers detail | Dossiers detail | Tracked | Detail |")
    $readme.WriteLine("| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    foreach ($summary in ($rootSummaries | Sort-Object -Property @{ Expression = { [long]$_.measured_size_bytes }; Descending = $true })) {
        $safe = Get-SafeFileName -Name $summary.root
        $detailLabel = if ($summary.detail_excluded) { "agregat seulement" } else { "exhaustif" }
        $readme.WriteLine(("| [`{0}/`](roots/{1}.md) | {2} | {3} | {4} | {5} | {6} | {7} | {8} |" -f `
            (Escape-MarkdownCell $summary.root),
            $safe,
            (Format-ByteSize ([long]$summary.detail_size_bytes)),
            (Format-ByteSize ([long]$summary.aggregate_only_size_bytes)),
            $summary.measured_size_human,
            $summary.file_count,
            $summary.dir_count,
            $summary.tracked_files,
            $detailLabel))
    }
    $readme.WriteLine("")

    $readme.WriteLine("## Arbres exclus du detail")
    $readme.WriteLine("")
    if ($excludedTrees.Count -eq 0) { $readme.WriteLine("Aucun.") }
    else {
        $readme.WriteLine("| Chemin | Raison | Taille | Fichiers | Dossiers |")
        $readme.WriteLine("| --- | --- | ---: | ---: | ---: |")
        foreach ($tree in ($excludedTrees | Sort-Object size_bytes -Descending)) {
            $readme.WriteLine(("| ``{0}`` | {1} | {2} | {3} | {4} |" -f (Escape-MarkdownCell $tree.path), (Escape-MarkdownCell $tree.reason), (Format-ByteSize ([long]$tree.size_bytes)), $tree.file_count, $tree.dir_count))
        }
    }
    $readme.WriteLine("")
    $readme.WriteLine("Les donnees persistantes situees hors du worktree ne font pas partie de cet audit et ne sont pas scannees.")
    $readme.WriteLine("")

    $readme.WriteLine("## 50 plus gros fichiers inventories")
    $readme.WriteLine("")
    $readme.WriteLine("| Fichier | Taille | Git |")
    $readme.WriteLine("| --- | ---: | --- |")
    foreach ($file in $largestFilesAll) {
        $readme.WriteLine(("| ``{0}`` | {1} | {2} |" -f (Escape-MarkdownCell $file.Path), (Format-ByteSize ([long]$file.SizeBytes)), $file.GitStatus))
    }
    $readme.WriteLine("")

    $readme.WriteLine("## 50 plus gros sous-arbres inventories")
    $readme.WriteLine("")
    $readme.WriteLine("| Dossier | Taille recursive | Fichiers | Dossiers |")
    $readme.WriteLine("| --- | ---: | ---: | ---: |")
    foreach ($dir in $largestDirsAll) {
        $readme.WriteLine(("| ``{0}/`` | {1} | {2} | {3} |" -f (Escape-MarkdownCell $dir.RelativePath), (Format-ByteSize ([long]$dir.RecursiveSizeBytes)), $dir.RecursiveFileCount, $dir.RecursiveDirCount))
    }
    $readme.WriteLine("")

    $readme.WriteLine("## Candidats structurels")
    $readme.WriteLine("")
    $readme.WriteLine("Voir [`STRUCTURAL_CANDIDATES.md`](STRUCTURAL_CANDIDATES.md) et ``structural-candidates.csv``. Un score eleve demande une analyse de responsabilites/couplage avant toute restructuration.")
    $readme.WriteLine("")

    $readme.WriteLine("## Fichiers racine")
    $readme.WriteLine("")
    $readme.WriteLine("Voir [`ROOT_FILES.md`](ROOT_FILES.md).")
    $readme.WriteLine("")

    if ($raceFindings.Count -gt 0) {
        $readme.WriteLine("## Races detectees")
        $readme.WriteLine("")
        $readme.WriteLine("Le snapshot a observe des changements concurrents. Ils sont informatifs et compatibles avec les chantiers paralleles. Voir ``snapshot-races.csv``.")
        $readme.WriteLine("")
    }
    if ($scanErrors.Count -gt 0) {
        $readme.WriteLine("## Erreurs de scan")
        $readme.WriteLine("")
        $readme.WriteLine("Certaines entrees n'ont pas pu etre mesurees. Voir ``scan-errors.csv``.")
        $readme.WriteLine("")
    }

    $readme.WriteLine("## Reproduction")
    $readme.WriteLine("")
    $readme.WriteLine('```powershell')
    $readme.WriteLine('pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-repository-tree.ps1')
    $readme.WriteLine('```')
}
finally { $readme.Dispose() }

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
exit 0
