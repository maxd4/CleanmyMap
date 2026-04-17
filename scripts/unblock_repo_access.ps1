param(
    [string]$Root = ".",
    [switch]$StopRepoProcesses = $true
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path $Root).Path
$user = "$env:USERDOMAIN\$env:USERNAME"

Write-Host "[unblock] root: $rootPath"
Write-Host "[unblock] user: $user"

if ($StopRepoProcesses) {
    $procNames = @("python.exe", "node.exe", "streamlit.exe", "npx.cmd")
    $killed = 0
    $procs = Get-CimInstance Win32_Process | Where-Object {
        $procNames -contains $_.Name -and $_.CommandLine -like "*$rootPath*"
    }
    foreach ($proc in $procs) {
        try {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
            $killed++
        }
        catch {
            Write-Warning "[unblock] impossible d'arreter PID=$($proc.ProcessId): $($_.Exception.Message)"
        }
    }
    Write-Host "[unblock] repo processes stopped: $killed"
}

# Remove read-only flag outside .git only.
$readonlyFiles = Get-ChildItem -Path $rootPath -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "*\.git\*" -and $_.IsReadOnly }
foreach ($file in $readonlyFiles) {
    $file.IsReadOnly = $false
}
Write-Host "[unblock] readonly cleared: $($readonlyFiles.Count)"

# Ensure Full Control ACL on the repo tree for current user.
icacls $rootPath /grant "${user}:(OI)(CI)F" /T /C | Out-Null
Write-Host "[unblock] ACL granted: FullControl for $user"

# Git access hardening.
git -C $rootPath config core.longpaths true
git config --global --add safe.directory $rootPath
Write-Host "[unblock] git core.longpaths=true and safe.directory added"

# Lightweight write-access probes.
$targets = @(
    "src/report_generator.py",
    "README.md",
    "docs/wiki/CHANGELOG.md"
)
$ok = 0
foreach ($target in $targets) {
    $full = Join-Path $rootPath $target
    if (Test-Path $full) {
        try {
            $fs = [System.IO.File]::Open($full, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::ReadWrite)
            $fs.Close()
            Write-Host "[unblock] rw_ok: $target"
            $ok++
        }
        catch {
            Write-Warning "[unblock] rw_fail: $target -> $($_.Exception.Message)"
        }
    }
}

Write-Host "[unblock] probes passed: $ok/$($targets.Count)"
Write-Host "[unblock] done"
