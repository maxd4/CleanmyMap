# Journal de prévalidation synthétique des lots 0 à 08

**Statut : `AUDIT / CANDIDATE`, relevé historique du pack de pré-intégration du 20 novembre 2026.**

Ce journal restitue à l’identique les 47 lignes `PASS` du fichier original `tests-node-isole.log`, non versionnable dans ce dépôt à cause de la règle `*.log` de `.gitignore`.

Il s’agit d’un banc Node isolé utilisant un shim des assertions. **Il ne prouve ni Vitest dans le workspace, ni Next.js, ni les frontières navigateur, Clerk, Supabase ou PostgreSQL.** Voir `TESTS_AUTONOMES.md` dans le même dossier pour le périmètre et les limites.

```text
PASS pins BNR factors to actual incorporated material, not collected mass
PASS offers exactly slider 1..98 when both thresholds and 0.25h budget are explicit
PASS recalculates rounded integer butts without claiming ACV water savings
PASS restores slider 99 if user removes the voluntary effort budget
PASS never grants carbon recycling benefit to unselected butt processing
PASS Tchao provider factor is opt-in AND carbon scope comparability required
PASS NA carbon or unknown waste destination cannot become a zero
PASS non-recycling incineration = 0 recycling benefit but treatment emissions remain unknown
PASS water ACV with unknown factors refuses to invent liters saved
PASS signed ACV water can make a position infeasible
PASS fractions must sum to 1 and yields must be bounded
PASS 15 billion-token US scenario with 70% incorporation reproduces conditional hours
PASS does not apply PUE twice on a FACILITY measurement
PASS IT without a known PUE remains physically partial
PASS computes local wall and idle-adjusted incremental energy independently
PASS refuses local PUE and mixed measurement sources
PASS preserves the 2024 historical factor by making the 2025 factor opt-in
PASS computes 1M proxy tokens in FR 2025 at low, central, high
PASS does not infer carbon from the user's country or missing physical region
PASS keeps indirect and direct water separate: total NA when either component unknown
PASS identical reimport is idempotent candidate, never added twice
PASS late supplier revision retains stable identity but requires confirmation
PASS overlapping buckets cannot be counted together automatically
PASS unidentified invoice cannot get a fabricated deterministic id
PASS stable identity digest has no visible account identifier
PASS zero and null differ; incomplete does not become a complete total
PASS rejects invalid UTC ranges and overflow
PASS exact UTC end-of-month exclusive period belongs to November
PASS bucket spanning month cannot be allocated by guesswork
PASS overlapping same-source rows are conflicts until user chooses one
PASS coverage incomplete displays a known minimum but no exhaustive progress
PASS budget is optional; zero budget with nonzero usage is over budget
PASS monetary amount cannot be converted into tokens or carbon
PASS OpenAI does not count cache twice and preserves null model
PASS OpenAI refuses cache larger than total
PASS OpenAI pagination incomplete remains partial
PASS Anthropic analytics 2026 uses disjoint input categories
PASS Anthropic old schema is not parsed silently as Analytics 2026
PASS Anthropic freshness and has_more determine partial status
PASS Gemini total is prompt+candidates+tools+thoughts, cache already within prompt
PASS Gemini tool tokens add to input and reported total
PASS Gemini rejects inconsistent reasoning total
PASS Codex cumulative counters subtract increases, count reset as new work, never expose transcript
PASS CSV accepts BOM, quotes and user-supplied mapping without inferring a provider
PASS CSV formula-like tokens and malformed quoting cannot sneak in
PASS subscription retains the selected coding platform without inventing a price or entitlement
PASS rejects crossing local-owned, cloud, and subscription metadata boundaries
```
