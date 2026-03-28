Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Running Python static compilation..."
$files = git ls-files '*.py'
foreach ($f in $files) {
    python -m py_compile $f
}

Write-Host "Running cleanup diagnostic check (non-destructive)..."
python scripts/ci_cleanup.py --root . --check

Write-Host "Running runtime SQLite tracking guardrail..."
python scripts/check_runtime_db_tracking.py --root .

Write-Host "Running unit tests..."
pytest -q

Write-Host "Running E2E tests..."
npx.cmd playwright test
