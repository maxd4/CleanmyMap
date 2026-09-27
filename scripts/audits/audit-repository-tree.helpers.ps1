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
    "artifacts" = "Sorties locales generees exclues du detail"
}

# Ces noms sont souvent generes mais peuvent legitimement etre versionnes dans
# certains projets. S'ils contiennent des fichiers tracked, on prefere les
# inventorier plutot que masquer une vraie zone source.
$script:TrackedDirectoryProtectedNames = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
foreach ($name in @("artifacts", "dist", "build", "out", ".yarn", "Pods", "vendor")) {
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
        $text = Normalize-GitRelativePath -Path $line.ToString()
        if ($text.Length -gt 0) { [void]$Set.Add($text) }
    }
}

function Normalize-GitRelativePath {
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string]$Path
    )
    $normalized = (($Path -replace "\\", "/").Trim())
    return $normalized.Normalize([System.Text.NormalizationForm]::FormC)
}

function Get-FileGitStatus {
    param(
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$Tracked,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$Untracked,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.HashSet[string]]$Ignored
    )
    $normalizedRelativePath = Normalize-GitRelativePath -Path $RelativePath
    if ($Tracked.Contains($normalizedRelativePath)) { return "tracked" }
    if ($Ignored.Contains($normalizedRelativePath)) { return "ignored" }
    if ($Untracked.Contains($normalizedRelativePath)) { return "untracked" }
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

    # Regression guard: Git may expose NFC while the filesystem-relative path
    # queried by the inventory is NFD (or the reverse). Both must classify the
    # same path identically.
    $unicodeProbe = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::OrdinalIgnoreCase
    )
    $nfcPath = "src/caf$([char]0x00E9).txt"
    $nfdPath = "src/cafe$([char]0x0301).txt"
    Add-GitLinesToSet -Set $unicodeProbe -Lines @("  $nfcPath  ")
    $unicodeStatus = Get-FileGitStatus `
        -RelativePath " $nfdPath " `
        -Tracked $unicodeProbe `
        -Untracked ([System.Collections.Generic.HashSet[string]]::new()) `
        -Ignored ([System.Collections.Generic.HashSet[string]]::new())
    if ($unicodeStatus -ne "tracked") {
        throw "self-test: NFC/NFD Git path normalization regression"
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
    $testOutput = Join-Path $testRepo "artifacts/repository-inventory"

    try {
        [System.IO.Directory]::CreateDirectory($testRepo) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo "src/nested")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo ".venv")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo "node_modules/pkg")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo "src/.next/cache")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo ".artifacts/old-run")) | Out-Null
        [System.IO.Directory]::CreateDirectory((Join-Path $testRepo "artifacts/local-output")) | Out-Null

        [System.IO.File]::WriteAllText((Join-Path $testRepo ".gitignore"), ".venv/`nnode_modules/`n.next/`nartifacts/`nignored.txt`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "tracked.txt"), "tracked`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "ignored.txt"), "ignored`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "untracked.txt"), "untracked`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "src/nested/sample.txt"), "nested`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo ".venv/pyvenv.cfg"), "home = selftest`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo ".venv/dummy.bin"), "excluded`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "node_modules/pkg/index.js"), "generated vendor`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "src/.next/cache/chunk.bin"), "generated next cache`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo ".artifacts/old-run/report.txt"), "old artifact`n")
        [System.IO.File]::WriteAllText((Join-Path $testRepo "artifacts/local-output/generated.txt"), "local output`n")

        & git -C $testRepo init -q
        if ($LASTEXITCODE -ne 0) { throw "self-test: git init failed" }
        & git -C $testRepo config user.email "repository-inventory-selftest@example.invalid"
        & git -C $testRepo config user.name "Repository Inventory Self Test"
        & git -C $testRepo add -- .gitignore tracked.txt .artifacts/old-run/report.txt
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
            ".artifacts/old-run/report.txt" = "tracked"
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
        foreach ($excludedPath in @("node_modules", "src/.next", "artifacts")) {
            if ($inventory | Where-Object { $_.path -eq $excludedPath -or $_.path -like "$excludedPath/*" }) {
                throw "self-test: $excludedPath unexpectedly present in detailed inventory"
            }
        }

        if (-not ($inventory | Where-Object { $_.path -eq ".artifacts" -and $_.type -eq "directory" })) {
            throw "self-test: versioned .artifacts directory missing from detailed inventory"
        }
        if (-not ($inventory | Where-Object { $_.path -eq ".artifacts/old-run/report.txt" -and $_.git_status -eq "tracked" })) {
            throw "self-test: versioned .artifacts evidence missing from detailed inventory"
        }
        if (-not (Test-Path -LiteralPath $testOutput -PathType Container)) {
            throw "self-test: local output directory was not created"
        }

        $readmeText = [System.IO.File]::ReadAllText((Join-Path $runDir.FullName "README.md"))
        foreach ($aggregateName in @(".git", ".venv", "node_modules", "src/.next", "artifacts")) {
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
