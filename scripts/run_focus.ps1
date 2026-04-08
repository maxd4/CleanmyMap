<#
.SYNOPSIS
Run a command and print only high-signal lines (errors, warnings, status, pass/fail).

.DESCRIPTION
This helper keeps local logs short while preserving failures:
- command exit code is preserved
- filtered lines are printed during success
- on failure, a raw tail is printed to avoid hiding real errors

.EXAMPLE
powershell -ExecutionPolicy Bypass -File scripts/run_focus.ps1 -Command "npm.cmd --prefix apps/web run build"
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string]$IncludeRegex = "(?i)(error|failed|fail|warning|warn|exception|traceback|degraded|status|summary|pass|passed|ready|ok)",
    [int]$MaxLines = 200,
    [int]$FailureTailLines = 80
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rawLines = @()

& {
    Invoke-Expression $Command
} 2>&1 | ForEach-Object {
    $line = "$_"
    $rawLines += $line
}

$exitCode = if ($LASTEXITCODE -is [int]) { $LASTEXITCODE } else { 0 }
$filtered = @($rawLines | Where-Object { $_ -match $IncludeRegex })

if ($filtered.Count -eq 0) {
    Write-Host "[run_focus] No line matched IncludeRegex. Showing first 20 lines."
    $filtered = @($rawLines | Select-Object -First 20)
}

if ($filtered.Count -gt $MaxLines) {
    $headCount = [Math]::Max($MaxLines - 1, 1)
    $filtered | Select-Object -First $headCount | ForEach-Object { Write-Host $_ }
    Write-Host "[run_focus] ... output truncated ($($filtered.Count) matching lines)."
} else {
    $filtered | ForEach-Object { Write-Host $_ }
}

if ($exitCode -ne 0) {
    Write-Host "[run_focus] Command failed (exit=$exitCode). Showing raw tail ($FailureTailLines lines):"
    $rawLines | Select-Object -Last $FailureTailLines | ForEach-Object { Write-Host $_ }
}

exit $exitCode
