# Testing Guide

## Reproducible Setup

1. Install Python and Node dependencies:
   - `powershell -ExecutionPolicy Bypass -File scripts/setup_test_env.ps1`

## Run Checks

1. Full validation:
   - `powershell -ExecutionPolicy Bypass -File scripts/run_checks.ps1`

2. Python only:
   - `pytest -q`

3. E2E only:
   - `npx.cmd playwright test`

## Scope Covered

- Python syntax/compile checks
- Unit tests for:
  - admin auth hardening
  - input validation
  - CSV export service
  - PDF generation
  - security sanitization helpers
- Critical E2E flows with Playwright
