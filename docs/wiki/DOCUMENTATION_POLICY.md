# Documentation Policy (Mandatory)

## Scope

The following changes must always be documented:
- new features,
- bug fixes,
- behavior changes,
- significant implementation or architecture updates,
- security-relevant updates.

## Required Artifacts Per Change

For each eligible change, update both:
1. `README.md`
2. `docs/wiki/CHANGELOG.md` (and optionally a dedicated wiki page when needed)

## Minimum Required Content

Each documentation entry must include:
- **What changed** (functional summary),
- **Why** (problem or objective),
- **Where** (main files/modules impacted),
- **Validation** (tests/checks run),
- **Compatibility notes** (breaking/risky impacts, if any).

## Audience Requirements

Documentation must stay usable by:
- end users: clear behavior and usage impact,
- developers: technical impact and maintenance guidance.

## Quality Rules

- clear and concise language,
- accurate and current state only,
- no stale TODO-style placeholders,
- explicit assumptions and limitations,
- dates in ISO format (`YYYY-MM-DD`) for traceability.

## Delivery Checklist

Before closing any task:
- [ ] README updated,
- [ ] Wiki changelog updated,
- [ ] Validation notes added,
- [ ] Compatibility/regression risk noted (or explicitly none),
- [ ] Links between README and wiki kept valid.
