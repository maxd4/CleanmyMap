function Write-AuditReports {
    param(
        [Parameter(Mandatory)][string]$OutputDir,
        [Parameter(Mandatory)][string]$RootsDir,
        [Parameter(Mandatory)][hashtable]$DirectoryNodes,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$FileRecords,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ExcludedTrees,
        [Parameter(Mandatory)][int]$TopCandidateCount,
        [Parameter(Mandatory)][DateTimeOffset]$StartedAt,
        [Parameter(Mandatory)][DateTimeOffset]$FinishedScanAt,
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$HeadStart,
        [Parameter(Mandatory)][string]$HeadEnd,
        [Parameter(Mandatory)][System.Collections.ICollection]$StatusStart,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$RaceFindings,
        [Parameter(Mandatory)][AllowEmptyCollection()][System.Collections.Generic.List[object]]$ScanErrors
    )
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
    $structuralWriter.WriteLine("Le score combine densite de fichiers tracked/source, nombre de sous-dossiers, profondeur, empreinte detaillee et presence de fichiers source depassant le seuil HARD de ``quality:top-heavy`` (>1000 lignes ou >50 KiB). Ce signal ne declenche jamais un split automatique.")
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
    $readme.WriteLine('npm run audit:repository-tree')
    $readme.WriteLine('```')
}
finally { $readme.Dispose() }

$chatgptReviewFiles = @(
    $readmePath,
    $rootFilesPath,
    $rootSummaryCsv,
    $structuralCandidatesPath,
    $structuralCandidatesCsv
)
$missingChatgptReviewFiles = @(
    $chatgptReviewFiles |
        Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) } |
        ForEach-Object { [System.IO.Path]::GetFileName($_) }
)
if ($missingChatgptReviewFiles.Count -gt 0) {
    throw "Audit output contract violated; missing required review file(s): $($missingChatgptReviewFiles -join ', ')"
}
    return [pscustomobject]@{
        IncludedBytes = [long]$includedBytes
        ExcludedBytes = [long]$excludedBytes
        ExcludedFiles = [long]$excludedFiles
        ExcludedDirs = [long]$excludedDirs
        IncludedRoot = $includedRoot
        StructuralCandidates = $structuralCandidates
        ChatgptReviewFiles = $chatgptReviewFiles
    }
}
