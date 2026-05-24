# Release Safety

Read these files before changing CI, deployments, or release gates:

- `../../../scripts/pre_push_guard.ps1`
- `../../../scripts/cicd-metrics-report.mjs`
- `../../../documentation/maintenance/ci-cd-metrics-report.md`
- `../../../documentation/maintenance/quality-audit-snapshot.md`
- `../../../documentation/security/README.md`
- `../../../documentation/security/PRE_MERGE_CHECKLIST.md`

Favor small release surfaces and explicit checks over hidden assumptions.
