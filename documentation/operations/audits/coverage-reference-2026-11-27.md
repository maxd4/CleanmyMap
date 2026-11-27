# Audit global de couverture — référence 2026-11-27

**Nature :** `AUDIT / SNAPSHOT` — photographie descriptive, sans modification de politique.
**SHA mesuré :** `58d611bffbaa3c8692f6ffee331c20774779175a`
**SHA de publication :** le commit Git qui contient cette photographie est vérifié par le compte rendu final ; il est distinct du SHA mesuré lorsque le document est ajouté après la mesure.

## Résumé exécutif

États de provenance vérifiés par le générateur : web=EVIDENCE_UNVERIFIED, node=EVIDENCE_UNVERIFIED, mobile=EVIDENCE_UNVERIFIED, python=EVIDENCE_UNVERIFIED. Un scope n'est marqué 'CI_EXACT_SHA' qu'après validation de la preuve de publication CI, de l'identité du candidat, des empreintes des rapports consommés et des validateurs canoniques. Les observations instrumentées locales non attestées restent conservées séparément sous `observed` (`OBSERVED_NOT_ATTESTED`) sans promouvoir le statut d'attestation. Les preuves PostgreSQL, RLS, RPC, concurrence, Clerk réel et device natif ne sont pas exécutées par cette photographie.

Aucun seuil n'est activé : toutes les familles restent `OBSERVE`. Les domaines sans cible canonique restent `NO_TARGET_DEFINED` ou `RISK_CLASSIFICATION_REQUIRED`.

## Tableau global

| Scope | Provenance | Statut observation | Origine campagne | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| web | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED | UNATTESTED_WORKTREE | 98/98 — 100.00 % | 121/132 — 91.67 % | 41/41 — 100.00 % | 93/93 — 100.00 % |
| node | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED | REUSED_PRIOR_SHA | 56988/80272 — 70.99 % | 16113/20567 — 78.34 % | 2673/3357 — 79.62 % | 56988/80272 — 70.99 % |
| mobile | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED | REUSED_PRIOR_SHA | 2498/2779 — 89.89 % | 1799/2122 — 84.78 % | 684/798 — 85.71 % | 2153/2259 — 95.31 % |
| python | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED | REUSED_PRIOR_SHA | NOT_MEASURED | 562/766 — 73.37 % | NOT_MEASURED | 2451/2883 — 85.02 % |

## Seuils et politique

- Empreinte politique : `e6d14163f019bf06adf963041f33fec80cd6a576009acf786eb1f13139826e29` ; empreinte risques : `3c341077b40b736da099a047d87ba85dc6f668c0444f6021a5d1307410574bcd`.
- Empreintes de scope : Web `f39357edc99c09ae1903eac2ca0cf8aacb64d390d82656b3f3f18135f37412b1`, Mobile `e50eeed2bae7b1dc71b65b93e00a5a710c451d2427cc65938c640fbd1dd9c3bd`.
- Web security : 90/85/90/90 ; business : 85/80/85/85 ; api-persistence : 85/80/85/85 (S/B/F/L).
- Web ui-presentational : `NO_TARGET_DEFINED` ; Web unclassified : `RISK_CLASSIFICATION_REQUIRED` ; Web new-code-non-critical : non mesuré car aucun préfixe n'est qualifié.
- Mobile, Node et Python : `NO_TARGET_DEFINED` dans la politique actuelle.
- Toutes les entrées de `COVERAGE_ENFORCEMENT_POLICY` sont `OBSERVE`; aucune activation `ENFORCE` n'est proposée comme effective.

## Familles Web

| Famille | Fichiers | Statements | Branches | Functions | Lines | Écart S/B/F/L (pp) | Unités S/B/F/L | Objectif | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| security | 0 | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | — / — / — / — | — / — / — / — | statements 90% (min 90%), lines 90% (min 90%), branches 85% (min 85%), functions 90% (min 90%) | NOT_MEASURED |
| business | 0 | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | — / — / — / — | — / — / — / — | statements 85% (min 85%), lines 85% (min 85%), branches 80% (min 80%), functions 85% (min 85%) | NOT_MEASURED |
| api-persistence | 2 | 98/98 — 100.00 % | 121/132 — 91.67 % | 41/41 — 100.00 % | 93/93 — 100.00 % | 0.00 / 0.00 / 0.00 / 0.00 | 0 / 0 / 0 / 0 | statements 85% (min 85%), lines 85% (min 85%), branches 80% (min 80%), functions 85% (min 85%) | OBSERVE |
| ui-presentational | 0 | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | — / — / — / — | — / — / — / — | NO_TARGET_DEFINED | NO_TARGET_DEFINED |
| new-code-non-critical | 0 | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | — / — / — / — | — / — / — / — | lines 90% (min 80%) | NOT_MEASURED |
| unclassified | 0 | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | — / — / — / — | — / — / — / — | NO_TARGET_DEFINED | RISK_CLASSIFICATION_REQUIRED |

## Top 50 — plus grands deltas

Le détail exhaustif est dans le JSON lié. Les deltas sont calculés sur les compteurs exacts, jamais sur les pourcentages arrondis.

| Rang | Scope | Famille | Fichier | Delta max pp | Unités additionnelles max |
| ---: | --- | --- | --- | ---: | ---: |

## Top 50 — plus grand volume manquant

Lignes et branches sont affichées séparément ; elles ne sont pas additionnées entre métriques.

| Rang | Scope | Famille | Fichier | Lignes à couvrir | Branches à couvrir |
| ---: | --- | --- | --- | ---: | ---: |

## Branches critiques non couvertes

Les lignes ci-dessous sont des points de branchement instrumentés non couverts dans les familles Web classées security, api-persistence ou business. Elles sont des priorités de test, pas une interprétation automatique de l'intention métier.

- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-response.ts:16`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-response.ts:48`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-response.ts:84`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-response.ts:85`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-response.ts:86`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-response.ts:150`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-aggregation.ts:55`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-aggregation.ts:57`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-aggregation.ts:61`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-aggregation.ts:63`
- `api-persistence` — `apps/web/src/app/api/reports/elus-dossier/route-aggregation.ts:206`

## Provenance et divergences d'empreintes

| Scope | Origine campagne | SHA preuve | Divergences d'empreintes |
| --- | --- | --- | --- |
| web | UNATTESTED_WORKTREE | `N/A` | Aucune divergence |
| node | REUSED_PRIOR_SHA | `755c12210d4c9840e443cb75ca074d8e4598d9e7` | Aucune divergence |
| mobile | REUSED_PRIOR_SHA | `f33e7b3c6a84d4ea42e269f1b824c0c52c276acb` | summary: MISMATCH |
| python | REUSED_PRIOR_SHA | `f33e7b3c6a84d4ea42e269f1b824c0c52c276acb` | Aucune divergence |

## Instrumentation et artefacts

- Web : Vitest `4.1.12` avec `@vitest/coverage-v8` `4.1.12` (V8), résumé JSON et LCOV.
- Mobile : Vitest `4.1.12` avec `@vitest/coverage-v8` `4.1.12` (V8), résumé JSON et LCOV.
- Node/scripts : `c8` `12.0.0`, résumé JSON et LCOV.
- Python : `coverage.py` `7.16.2` et `pytest` `9.1.1`, rapport Cobertura ; statements/functions ne sont pas exposés par ce producteur.
- Les empreintes des rapports source et des preuves sont conservées dans l'artefact JSON ; elles ne valent pas à elles seules une preuve d'intégration externe.

## Producteurs et preuves

| Producteur | Commande | Résultat | Niveau de preuve | Limite |
| --- | --- | --- | --- | --- |
| Web | `npm run test:coverage` puis `npm run quality:coverage` | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED / EVIDENCE_UNVERIFIED | publication et rapports consommés vérifiés lorsque l'état est CI_EXACT_SHA |
| Mobile | `npm run quality:mobile-coverage` | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED / EVIDENCE_UNVERIFIED | preuve d'intégration absente si le scope reste non attesté |
| Node/scripts | `npm run test:coverage:node` | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED / EVIDENCE_UNVERIFIED | pas de cible canonique ; le rapport couvre le périmètre réel du producteur |
| Python | `npm run test:coverage:python` | EVIDENCE_UNVERIFIED | OBSERVED_NOT_ATTESTED / EVIDENCE_UNVERIFIED | aucune preuve CI exacte si le scope reste non attesté |
| PostgreSQL/Supabase | workflow `e2e-supabase-ephemeral` | NOT_EXECUTED | DB_SEMANTICS_NOT_EXECUTED | exécution PostgreSQL non effectuée dans cette photographie |
| E2E/natif/Clerk réel | workflows et appareils | NOT_MEASURED | NOT_MEASURED | non requis pour produire les rapports de couverture code |

## Méthode, limites et verdict

Les compteurs par fichier sont conservés dans `coverage-reference-2026-11-27.json`, avec empreintes des rapports sources, classification primaire, déficits calculés et séparation stricte entre mesures attestées (`metrics` / `CI_EXACT_SHA`) et observations locales non attestées (`observed` / `OBSERVED_NOT_ATTESTED`).

**STOP CONDITION : PARTIELLE (attestation CI absente).** Les données JSON et les tableaux Markdown sont générés à partir de la même structure `reference`. Aucun faux PASS ni changement de baseline, seuil, exclusion ou politique n'a été introduit.

Artefact structuré : [`coverage-reference-2026-11-27.json`](coverage-reference-2026-11-27.json).
