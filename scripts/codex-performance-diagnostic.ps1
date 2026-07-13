<#
.SYNOPSIS
Read-only Codex performance diagnostic for CleanMyMap.

.DESCRIPTION
Reports the machine and repository signals that most often explain Codex slowness:
- CPU, RAM, disk and network snapshots
- Git root, git status timing, tracked file count and object summary
- top processes and Codex-related processes
- folder sizes for the main generated directories

Use -CleanupOrphans to terminate only clearly orphaned Codex-related background
processes that match the conservative cleanup rules below.
#>
param(
    [switch]$CleanupOrphans
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

function Format-Size {
    param(
        [Nullable[double]]$Bytes
    )

    if ($null -eq $Bytes) {
        return "n/a"
    }

    $value = [double]$Bytes
    $units = @("B", "KB", "MB", "GB", "TB")
    $index = 0

    while ($value -ge 1024 -and $index -lt ($units.Count - 1)) {
        $value /= 1024
        $index++
    }

    return ("{0:N2} {1}" -f $value, $units[$index])
}

function Get-ToolVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [string]$Argument = "--version"
    )

    try {
        $output = & $Command $Argument 2>&1
        if ($LASTEXITCODE -ne 0 -and -not $output) {
            return "unavailable"
        }

        return ($output | Select-Object -First 1).Trim()
    } catch {
        return "unavailable"
    }
}

function Get-DirectorySize {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    try {
        $sum = (Get-ChildItem -LiteralPath $Path -File -Recurse -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum

        if ($null -eq $sum) {
            return $null
        }

        return [double]$sum
    } catch {
        return $null
    }
}

function Convert-CimDate {
    param(
        [object]$Value
    )

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return $null
    }

    try {
        return [System.Management.ManagementDateTimeConverter]::ToDateTime([string]$Value)
    } catch {
        return $null
    }
}

function Get-ProcessInventory {
    $cimProcesses = Get-CimInstance Win32_Process
    $psProcesses = Get-Process | Group-Object -Property Id -AsHashTable -AsString

    foreach ($process in $cimProcesses) {
        $psProcess = $psProcesses["$($process.ProcessId)"]
        [pscustomobject]@{
            Name          = $process.Name
            ProcessId     = $process.ProcessId
            ParentProcessId = $process.ParentProcessId
            CreationDate  = Convert-CimDate $process.CreationDate
            CommandLine   = $process.CommandLine
            WorkingSetMB  = if ($psProcess) { [math]::Round($psProcess.WorkingSet64 / 1MB, 2) } else { $null }
            CpuSeconds    = if ($psProcess) { [math]::Round([double]$psProcess.CPU, 2) } else { $null }
        }
    }
}

function Test-ParentExists {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$ProcessMap,
        [int]$ParentProcessId
    )

    return $ProcessMap.ContainsKey($ParentProcessId)
}

function Get-OrphanCleanupCandidate {
    param(
        [Parameter(Mandatory = $true)]
        [object]$ProcessRow,
        [Parameter(Mandatory = $true)]
        [hashtable]$ProcessMap
    )

    if (Test-ParentExists -ProcessMap $ProcessMap -ParentProcessId $ProcessRow.ParentProcessId) {
        return $null
    }

    $ageMinutes = $null
    if ($ProcessRow.CreationDate) {
        $ageMinutes = (New-TimeSpan -Start $ProcessRow.CreationDate -End (Get-Date)).TotalMinutes
    }

    if ($ProcessRow.Name -ieq "node_repl.exe") {
        if ($ageMinutes -ne $null -and $ageMinutes -lt 10) {
            return $null
        }

        return [pscustomobject]@{
            ProcessId = $ProcessRow.ProcessId
            Name      = $ProcessRow.Name
            Reason    = "orphaned node_repl background session"
        }
    }

    if ($ProcessRow.Name -ieq "node.exe" -and $ProcessRow.CommandLine -match '(?i)mcp[\\/](?:server(?:\.bundle)?\.mjs|server\.cjs|server\.mjs)\b') {
        if ($ageMinutes -ne $null -and $ageMinutes -lt 15) {
            return $null
        }

        return [pscustomobject]@{
            ProcessId = $ProcessRow.ProcessId
            Name      = $ProcessRow.Name
            Reason    = "orphaned MCP server process"
        }
    }

    if ($ProcessRow.Name -ieq "git.exe" -and $ProcessRow.CommandLine -notmatch "fsmonitor--daemon") {
        if ($ageMinutes -ne $null -and $ageMinutes -lt 10) {
            return $null
        }

        return [pscustomobject]@{
            ProcessId = $ProcessRow.ProcessId
            Name      = $ProcessRow.Name
            Reason    = "orphaned git helper without fsmonitor daemon marker"
        }
    }

    return $null
}

function Get-CodexOrphanSummary {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$ProcessInventory
    )

    $processMap = @{}
    foreach ($row in $ProcessInventory) {
        $processMap[$row.ProcessId] = $row
    }

    $cleanupTargets = foreach ($row in $ProcessInventory) {
        $candidate = Get-OrphanCleanupCandidate -ProcessRow $row -ProcessMap $processMap
        if ($candidate) {
            $candidate
        }
    }

    return @($cleanupTargets)
}

Push-Location $RepoRoot

try {
    $timestamp = Get-Date
    Write-Host "Codex performance diagnostic"
    Write-Host ("Time: {0}" -f $timestamp.ToString("yyyy-MM-dd HH:mm:ss"))
    Write-Host ("Repository: {0}" -f $RepoRoot)
    Write-Host ""

    $os = Get-CimInstance Win32_OperatingSystem
    $totalMemoryBytes = [double]$os.TotalVisibleMemorySize * 1KB
    $freeMemoryBytes = [double]$os.FreePhysicalMemory * 1KB
    $usedMemoryBytes = $totalMemoryBytes - $freeMemoryBytes
    $usedMemoryPct = if ($totalMemoryBytes -gt 0) { [math]::Round(($usedMemoryBytes / $totalMemoryBytes) * 100, 2) } else { 0 }

    $cpu = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq "_Total" }
    $diskRoot = [System.IO.Path]::GetPathRoot($RepoRoot.Path).TrimEnd("\")
    $disk = Get-CimInstance Win32_LogicalDisk -Filter ("DeviceID='{0}'" -f $diskRoot)
    $network = Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface |
        Sort-Object -Property BytesTotalPerSec -Descending |
        Select-Object -First 1

    Write-Host "== System =="
    Write-Host ("CPU total: {0}%" -f $cpu.PercentProcessorTime)
    Write-Host ("Memory total: {0}" -f (Format-Size $totalMemoryBytes))
    Write-Host ("Memory free:  {0}" -f (Format-Size $freeMemoryBytes))
    Write-Host ("Memory used:  {0} ({1}%)" -f (Format-Size $usedMemoryBytes), $usedMemoryPct)
    if ($disk) {
        Write-Host ("Disk {0}: free {1} / total {2}" -f $disk.DeviceID, (Format-Size ([double]$disk.FreeSpace)), (Format-Size ([double]$disk.Size)))
    }
    if ($network) {
        Write-Host ("Network top adapter: {0} ({1}/s)" -f $network.Name, (Format-Size ([double]$network.BytesTotalPerSec)))
    }
    Write-Host ""

    $processInventory = @(Get-ProcessInventory)
    $processMap = @{}
    foreach ($row in $processInventory) {
        $processMap[$row.ProcessId] = $row
    }

    $familyPatterns = [ordered]@{
        Codex     = '(?i)\bcodex(\.exe)?\b'
        ChatGPT   = '(?i)\bChatGPT(\.exe)?\b'
        pwsh      = '(?i)\bpwsh(\.exe)?\b'
        powershell = '(?i)\bpowershell(\.exe)?\b'
        node      = '(?i)\bnode(\.exe)?\b'
        npm       = '(?i)\bnpm(\.cmd|\.exe)?\b'
        python    = '(?i)\bpython(w)?(\.exe)?\b'
        git       = '(?i)\bgit(\.exe)?\b'
    }

    Write-Host "== Process Counts =="
    foreach ($entry in $familyPatterns.GetEnumerator()) {
        $count = @($processInventory | Where-Object { $_.Name -match $entry.Value -or ($_.CommandLine -and $_.CommandLine -match $entry.Value) }).Count
        Write-Host ("{0}: {1}" -f $entry.Key, $count)
    }
    Write-Host ""

    Write-Host "== Top RAM Processes =="
    $processInventory |
        Sort-Object -Property WorkingSetMB -Descending |
        Select-Object -First 10 |
        Format-Table Name, ProcessId, ParentProcessId, WorkingSetMB, CpuSeconds, CreationDate -AutoSize
    Write-Host ""

    Write-Host "== Top CPU Processes =="
    $processInventory |
        Sort-Object -Property CpuSeconds -Descending |
        Select-Object -First 10 |
        Format-Table Name, ProcessId, ParentProcessId, CpuSeconds, WorkingSetMB, CreationDate -AutoSize
    Write-Host ""

    Write-Host "== Codex-Related Processes =="
    $processInventory |
        Where-Object { $_.Name -match '(?i)codex|ChatGPT|pwsh|powershell|node|npm|python|git' } |
        Sort-Object -Property WorkingSetMB -Descending |
        Format-Table Name, ProcessId, ParentProcessId, WorkingSetMB, CpuSeconds, CreationDate, CommandLine -Wrap -AutoSize
    Write-Host ""

    $gitRoot = $null
    $gitStatusDuration = $null
    $gitTrackedFiles = $null
    $gitCountObjects = $null
    $gitStatusCount = $null

    try {
        $gitRoot = (git rev-parse --show-toplevel).Trim()
    } catch {
        $gitRoot = "unavailable"
    }

    if ($gitRoot -ne "unavailable") {
        Write-Host "== Git =="
        Write-Host ("Git root: {0}" -f $gitRoot)

        $statusWatch = [System.Diagnostics.Stopwatch]::StartNew()
        $statusOutput = @(git status --porcelain)
        $statusWatch.Stop()
        $gitStatusDuration = $statusWatch.Elapsed.TotalMilliseconds
        $gitStatusCount = $statusOutput.Count
        Write-Host ("git status --porcelain: {0:N2} ms ({1} lines)" -f $gitStatusDuration, $gitStatusCount)

        $gitTrackedFiles = @(git ls-files).Count
        Write-Host ("git ls-files count: {0}" -f $gitTrackedFiles)

        Write-Host "git count-objects -vH:"
        $gitCountObjects = @(git count-objects -vH)
        $gitCountObjects | ForEach-Object { Write-Host "  $_" }
        Write-Host ""
    } else {
        Write-Host "== Git =="
        Write-Host "Git root: unavailable"
        Write-Host ""
    }

    Write-Host "== Tool Versions =="
    Write-Host ("PowerShell: {0}" -f $PSVersionTable.PSVersion)
    Write-Host ("Node:       {0}" -f (Get-ToolVersion -Command "node"))
    Write-Host ("npm:        {0}" -f (Get-ToolVersion -Command "npm"))
    Write-Host ("Python:     {0}" -f (Get-ToolVersion -Command "python" -Argument "--version"))
    Write-Host ("Git:        {0}" -f (Get-ToolVersion -Command "git"))
    Write-Host ""

    Write-Host "== Folder Sizes =="
    $folderCandidates = @(
        "node_modules",
        "apps/web/.next",
        "companion-app/node_modules",
        "dist",
        "out",
        "coverage",
        ".cache",
        "tmp",
        "temp",
        "logs",
        "build",
        "artifacts"
    )

    foreach ($candidate in $folderCandidates) {
        $path = Join-Path $RepoRoot $candidate
        $sizeBytes = Get-DirectorySize -Path $path
        if ($null -ne $sizeBytes) {
            $fileCount = @(Get-ChildItem -LiteralPath $path -File -Recurse -Force -ErrorAction SilentlyContinue).Count
            Write-Host ("{0}: {1} ({2} files)" -f $candidate, (Format-Size $sizeBytes), $fileCount)
        }
    }
    Write-Host ""

    if ($CleanupOrphans) {
        Write-Host "== Orphan Cleanup =="
        $cleanupTargets = @(Get-CodexOrphanSummary -ProcessInventory $processInventory)

        if ($cleanupTargets.Count -eq 0) {
            Write-Host "No clearly orphaned cleanup candidates found."
        } else {
            $stoppedCount = 0
            $missingCount = 0
            $failedCount = 0
            foreach ($target in $cleanupTargets) {
                try {
                    Write-Host ("Stopping {0} PID {1}: {2}" -f $target.Name, $target.ProcessId, $target.Reason)
                    Stop-Process -Id $target.ProcessId -Force -ErrorAction Stop
                    $stoppedCount++
                } catch {
                    if ($_.Exception.Message -match 'Cannot find a process with the process identifier') {
                        $missingCount++
                        continue
                    }

                    $failedCount++
                    Write-Warning ("Unable to stop PID {0}: {1}" -f $target.ProcessId, $_.Exception.Message)
                }
            }
            Write-Host ("Stopped: {0}, already gone: {1}, failed: {2}" -f $stoppedCount, $missingCount, $failedCount)
        }
        Write-Host ""
    } else {
        Write-Host "Cleanup: disabled by default. Re-run with -CleanupOrphans to stop only clearly orphaned background processes."
        Write-Host ""
    }

    Write-Host "Diagnostic complete."
} finally {
    Pop-Location
}
