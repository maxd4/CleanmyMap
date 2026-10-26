# Audit global de couverture — référence 2026-10-26

**Nature :** `AUDIT / SNAPSHOT` — photographie descriptive, sans modification de politique.
**SHA mesuré :** `6d838f8da241797fa842b2212b357c4410fac0ce`
**SHA de publication :** le commit Git qui contient cette photographie est vérifié par le compte rendu final ; il est distinct du SHA mesuré lorsque le document est ajouté après la mesure.

## Résumé exécutif

Web et Node disposent de rapports CI au SHA exact. Mobile dispose d'une exécution au même SHA mais l'artefact conservé est `WORKTREE_LIVE/PRESENT_NOT_ATTESTED`. Python a été exécuté localement dans l'environnement déclaré, mais aucune preuve CI du SHA courant n'a été publiée. Les preuves PostgreSQL, RLS, RPC, concurrence, Clerk réel et device natif ne sont pas exécutées par cette photographie.

Aucun seuil n'est activé : toutes les familles restent `OBSERVE`. Les domaines sans cible canonique restent `NO_TARGET_DEFINED` ou `RISK_CLASSIFICATION_REQUIRED`.

## Tableau global

| Scope | Provenance | Statements | Branches | Functions | Lines | Verdict de mesure |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| web | CI_EXACT_SHA | 50660/68789 — 73.65 % | 44762/71247 — 62.83 % | 13616/18728 — 72.70 % | 46916/61601 — 76.16 % | MEASURED |
| node | CI_EXACT_SHA | 37175/59263 — 62.73 % | 9521/12207 — 78.00 % | 1748/2264 — 77.21 % | 37175/59263 — 62.73 % | MEASURED |
| mobile | WORKTREE_LIVE/PRESENT_NOT_ATTESTED | 1767/1940 — 91.08 % | 1146/1336 — 85.78 % | 555/656 — 84.60 % | 1498/1555 — 96.33 % | MEASURED |
| python | WORKTREE_LIVE/PRESENT_NOT_ATTESTED | NOT_MEASURED | 562/766 — 73.37 % | NOT_MEASURED | 2451/2883 — 85.02 % | MEASURED |

## Seuils et politique

- Empreinte politique : `24a377af1f3f720002681b788ebef62610d5830f2fc8d4e6e51146f256ad8d3a` ; empreinte risques : `6f65e3b69dec155ae880b40db75685ada7241eb8a4981c700e3857eb6b40e9a5`.
- Empreintes de scope : Web `f39357edc99c09ae1903eac2ca0cf8aacb64d390d82656b3f3f18135f37412b1`, Mobile `e50eeed2bae7b1dc71b65b93e00a5a710c451d2427cc65938c640fbd1dd9c3bd`.
- Web security : 90/85/90/90 ; business : 85/80/85/85 ; api-persistence : 85/80/85/85 (S/B/F/L).
- Web ui-presentational : `NO_TARGET_DEFINED` ; Web unclassified : `RISK_CLASSIFICATION_REQUIRED` ; Web new-code-non-critical : non mesuré car aucun préfixe n'est qualifié.
- Mobile, Node et Python : `NO_TARGET_DEFINED` dans la politique actuelle.
- Toutes les entrées de `COVERAGE_ENFORCEMENT_POLICY` sont `OBSERVE`; aucune activation `ENFORCE` n'est proposée comme effective.

## Familles Web

| Famille | Fichiers | Statements | Branches | Functions | Lines | Écart S/B/F/L (pp) | Unités S/B/F/L | Objectif | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| security | 72 | 1291/1529 — 84.43 % | 986/1265 — 77.94 % | 287/328 — 87.50 % | 1250/1458 — 85.73 % | 5.57 / 7.06 / 2.50 / 4.27 | 86 / 90 / 9 / 63 | statements 90% (min 90%), lines 90% (min 90%), branches 85% (min 85%), functions 90% (min 90%) | OBSERVE |
| business | 461 | 13848/16552 — 83.66 % | 13570/17861 — 75.98 % | 4121/4587 — 89.84 % | 12655/14673 — 86.25 % | 1.34 / 4.02 / 0.00 / 0.00 | 222 / 719 / 0 / 0 | statements 85% (min 85%), lines 85% (min 85%), branches 80% (min 80%), functions 85% (min 85%) | OBSERVE |
| api-persistence | 288 | 9044/10736 — 84.24 % | 5623/7803 — 72.06 % | 1648/1813 — 90.90 % | 8401/9597 — 87.54 % | 0.76 / 7.94 / 0.00 / 0.00 | 82 / 620 / 0 / 0 | statements 85% (min 85%), lines 85% (min 85%), branches 80% (min 80%), functions 85% (min 85%) | OBSERVE |
| ui-presentational | 60 | 682/1220 — 55.90 % | 652/1087 — 59.98 % | 150/318 — 47.17 % | 671/1167 — 57.50 % | — / — / — / — | — / — / — / — | NO_TARGET_DEFINED | NO_TARGET_DEFINED |
| new-code-non-critical | 0 | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | — / — / — / — | — / — / — / — | lines 90% (min 80%) | NOT_MEASURED |
| unclassified | 1445 | 25795/38752 — 66.56 % | 23931/43231 — 55.36 % | 7410/11682 — 63.43 % | 23939/34706 — 68.98 % | — / — / — / — | — / — / — / — | NO_TARGET_DEFINED | RISK_CLASSIFICATION_REQUIRED |

## Top 50 — plus grands deltas

Le détail exhaustif est dans le JSON lié. Les deltas sont calculés sur les compteurs exacts, jamais sur les pourcentages arrondis.

| Rang | Scope | Famille | Fichier | Delta max pp | Unités additionnelles max |
| ---: | --- | --- | --- | ---: | ---: |
| 1 | web | security | `apps/web/src/lib/account/current-account-identity.ts` | 90.00 | 27 |
| 2 | web | security | `apps/web/src/lib/auth/account-completion-gate.ts` | 90.00 | 19 |
| 3 | web | security | `apps/web/src/lib/auth/user-location.ts` | 90.00 | 14 |
| 4 | web | security | `apps/web/src/lib/auth/user-territory.ts` | 90.00 | 9 |
| 5 | web | security | `apps/web/src/lib/account/display-name-mode-store.ts` | 90.00 | 5 |
| 6 | web | security | `apps/web/src/lib/admin/role-management.ts` | 55.21 | 27 |
| 7 | web | security | `apps/web/src/lib/auth/active-role-projection.ts` | 42.00 | 11 |
| 8 | web | security | `apps/web/src/app/api/account/locations/route.ts` | 40.00 | 4 |
| 9 | web | security | `apps/web/src/app/api/account/identity/route.ts` | 40.00 | 3 |
| 10 | web | security | `apps/web/src/app/api/account/activity-status/route.ts` | 40.00 | 1 |
| 11 | web | security | `apps/web/src/lib/auth/sync-persistence.ts` | 25.00 | 3 |
| 12 | web | security | `apps/web/src/lib/rate-limit/store.ts` | 22.50 | 3 |
| 13 | web | security | `apps/web/src/lib/rate-limit/server.ts` | 20.00 | 4 |
| 14 | web | security | `apps/web/src/lib/auth/account-setup.ts` | 15.00 | 9 |
| 15 | web | security | `apps/web/src/app/api/account/active-profile/route.ts` | 15.00 | 3 |
| 16 | web | security | `apps/web/src/lib/auth/clerk-metadata-patch.ts` | 15.00 | 3 |
| 17 | web | security | `apps/web/src/app/api/account/age-band/route.ts` | 15.00 | 2 |
| 18 | web | security | `apps/web/src/lib/rate-limit/middleware.ts` | 15.00 | 1 |
| 19 | web | security | `apps/web/src/lib/validation/action-preparation.ts` | 13.57 | 2 |
| 20 | web | security | `apps/web/src/lib/clerk-supabase-token.ts` | 12.22 | 2 |
| 21 | web | security | `apps/web/src/lib/security/html-escape.ts` | 11.43 | 2 |
| 22 | web | security | `apps/web/src/lib/authz-badges.ts` | 10.00 | 2 |
| 23 | web | security | `apps/web/src/lib/rate-limit/api-wrapper.ts` | 10.00 | 2 |
| 24 | web | security | `apps/web/src/app/api/account/promotion-requests/route.ts` | 10.00 | 1 |
| 25 | web | security | `apps/web/src/lib/auth/clerk-publishable-key.ts` | 10.00 | 1 |
| 26 | web | security | `apps/web/src/lib/validation/action-geometry.ts` | 9.32 | 4 |
| 27 | web | security | `apps/web/src/lib/authz-identity.ts` | 7.97 | 6 |
| 28 | web | security | `apps/web/src/lib/auth/sync-handle.ts` | 7.24 | 3 |
| 29 | web | security | `apps/web/src/lib/auth/sync.ts` | 7.22 | 2 |
| 30 | web | security | `apps/web/src/lib/security/csp.ts` | 5.00 | 3 |
| 31 | web | security | `apps/web/src/lib/rate-limit/utils.ts` | 4.81 | 4 |
| 32 | web | security | `apps/web/src/lib/auth/redirect-url.ts` | 4.29 | 1 |
| 33 | web | security | `apps/web/src/lib/auth/safe-session.ts` | 3.75 | 1 |
| 34 | web | business | `apps/web/src/lib/route/route-event-pressure-loader.ts` | 85.00 | 35 |
| 35 | web | business | `apps/web/src/lib/actions/operation-audit.ts` | 85.00 | 32 |
| 36 | web | business | `apps/web/src/lib/actions/http-action-editor.ts` | 85.00 | 30 |
| 37 | web | business | `apps/web/src/components/map/ActionStoriesCarousel.tsx` | 85.00 | 27 |
| 38 | web | api-persistence | `apps/web/src/app/api/actions/map/initial-nearest/route.ts` | 85.00 | 26 |
| 39 | web | api-persistence | `apps/web/src/app/api/admin/referrals.csv/route.ts` | 85.00 | 26 |
| 40 | web | business | `apps/web/src/lib/actions/exports/export-form-media-png.ts` | 85.00 | 25 |
| 41 | web | business | `apps/web/src/lib/actions/http-action-formalities.ts` | 85.00 | 24 |
| 42 | web | api-persistence | `apps/web/src/app/api/signalements/[signalementId]/media/intents/route.ts` | 85.00 | 23 |
| 43 | web | api-persistence | `apps/web/src/app/api/community/bug-reports/[reportId]/screenshot/intent/route.ts` | 85.00 | 22 |
| 44 | web | api-persistence | `apps/web/src/app/api/users/profile/handle/route.ts` | 85.00 | 21 |
| 45 | web | business | `apps/web/src/lib/actions/geometry/record-action-geometry-contribution.ts` | 85.00 | 20 |
| 46 | web | business | `apps/web/src/components/maps/territory-map-comparison-cards.tsx` | 85.00 | 17 |
| 47 | web | api-persistence | `apps/web/src/app/api/signalements/[signalementId]/media/[mediaId]/finalize/route.ts` | 85.00 | 16 |
| 48 | web | business | `apps/web/src/lib/actions/route-version-http.ts` | 85.00 | 16 |
| 49 | web | business | `apps/web/src/lib/actions/store-post-processing.ts` | 85.00 | 16 |
| 50 | web | api-persistence | `apps/web/src/app/api/signalements/[signalementId]/media/route.ts` | 85.00 | 14 |

## Top 50 — plus grand volume manquant

Lignes et branches sont affichées séparément ; elles ne sont pas additionnées entre métriques.

| Rang | Scope | Famille | Fichier | Lignes à couvrir | Branches à couvrir |
| ---: | --- | --- | --- | ---: | ---: |
| 1 | web | business | `apps/web/src/lib/actions/vision.ts` | 48 | 35 |
| 2 | web | business | `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts` | 45 | 76 |
| 3 | web | business | `apps/web/src/lib/route/recommendation-assistant.ts` | 37 | 38 |
| 4 | web | business | `apps/web/src/lib/actions/action-media/action-media-client.ts` | 36 | 36 |
| 5 | web | business | `apps/web/src/lib/environmental-impact-estimator/snapshot-store.ts` | 35 | 32 |
| 6 | web | api-persistence | `apps/web/src/lib/persistence/runtime-store.ts` | 35 | 25 |
| 7 | web | business | `apps/web/src/lib/actions/store-queries.ts` | 34 | 10 |
| 8 | web | business | `apps/web/src/lib/actions/http-action-editor.ts` | 30 | 28 |
| 9 | web | business | `apps/web/src/lib/route/route-multi-route-group.ts` | 29 | 25 |
| 10 | web | business | `apps/web/src/lib/route/route-event-pressure-loader.ts` | 28 | 16 |
| 11 | web | api-persistence | `apps/web/src/app/api/actions/map/initial-nearest/route.ts` | 26 | 21 |
| 12 | web | api-persistence | `apps/web/src/app/api/admin/referrals.csv/route.ts` | 25 | 8 |
| 13 | web | business | `apps/web/src/lib/actions/http-action-formalities.ts` | 24 | 24 |
| 14 | web | business | `apps/web/src/lib/environmental-impact-estimator/service-email-events-store.ts` | 23 | 35 |
| 15 | web | security | `apps/web/src/lib/admin/role-management.ts` | 23 | 26 |
| 16 | web | api-persistence | `apps/web/src/app/api/signalements/[signalementId]/media/intents/route.ts` | 23 | 12 |
| 17 | web | business | `apps/web/src/lib/actions/exports/export-form-media-png.ts` | 23 | 4 |
| 18 | web | api-persistence | `apps/web/src/app/api/actions/[actionId]/invite-link/route.ts` | 22 | 24 |
| 19 | web | business | `apps/web/src/lib/actions/signalement/signalement-media.ts` | 20 | 20 |
| 20 | web | api-persistence | `apps/web/src/app/api/community/bug-reports/[reportId]/screenshot/intent/route.ts` | 20 | 10 |
| 21 | web | business | `apps/web/src/lib/actions/store-create.ts` | 19 | 30 |
| 22 | web | business | `apps/web/src/lib/spogomi/closure-service.ts` | 19 | 15 |
| 23 | web | security | `apps/web/src/lib/account/current-account-identity.ts` | 18 | 27 |
| 24 | web | business | `apps/web/src/components/map/ActionStoriesCarousel.tsx` | 17 | 27 |
| 25 | web | business | `apps/web/src/lib/actions/exports/export-form-history.ts` | 17 | 21 |
| 26 | web | api-persistence | `apps/web/src/app/api/users/profile/handle/route.ts` | 17 | 12 |
| 27 | web | business | `apps/web/src/components/maps/territory-map-comparison-cards.tsx` | 17 | 8 |
| 28 | web | business | `apps/web/src/lib/actions/operation-audit.ts` | 16 | 32 |
| 29 | web | business | `apps/web/src/components/environmental-impact-estimator/environmental-impact-estimator-panel.helpers.ts` | 16 | 25 |
| 30 | web | business | `apps/web/src/lib/actions/training.ts` | 16 | 24 |
| 31 | web | api-persistence | `apps/web/src/app/api/signalements/[signalementId]/media/[mediaId]/finalize/route.ts` | 16 | 8 |
| 32 | web | business | `apps/web/src/lib/actions/participation/registration-records.ts` | 15 | 21 |
| 33 | web | security | `apps/web/src/lib/auth/account-completion-gate.ts` | 15 | 19 |
| 34 | web | business | `apps/web/src/lib/actions/store-post-processing.ts` | 15 | 16 |
| 35 | web | security | `apps/web/src/lib/auth/user-location.ts` | 14 | 13 |
| 36 | web | api-persistence | `apps/web/src/lib/supabase/storage-quota.ts` | 14 | 13 |
| 37 | web | api-persistence | `apps/web/src/app/api/users/map-viewport-fallback/route.ts` | 14 | 7 |
| 38 | web | business | `apps/web/src/lib/spogomi/results-projection.ts` | 13 | 98 |
| 39 | web | business | `apps/web/src/lib/spogomi/recognition-service.ts` | 13 | 36 |
| 40 | web | business | `apps/web/src/lib/geo/action-department-resolver.ts` | 13 | 15 |
| 41 | web | business | `apps/web/src/lib/actions/action-creation-sections.ts` | 13 | 13 |
| 42 | web | api-persistence | `apps/web/src/app/api/signalements/[signalementId]/media/route.ts` | 13 | 8 |
| 43 | web | business | `apps/web/src/lib/actions/exports/export-form-media-download.ts` | 13 | 2 |
| 44 | web | api-persistence | `apps/web/src/lib/supabase/profile-avatar-storage.ts` | 12 | 28 |
| 45 | web | business | `apps/web/src/lib/actions/geometry/record-action-geometry-contribution.ts` | 12 | 20 |
| 46 | web | business | `apps/web/src/lib/actions/route-version-http.ts` | 12 | 16 |
| 47 | web | api-persistence | `apps/web/src/app/api/admin/operations/route.ts` | 12 | 5 |
| 48 | web | business | `apps/web/src/lib/actions/http-action-collection.ts` | 11 | 13 |
| 49 | web | business | `apps/web/src/lib/spogomi/preparation-event-access.ts` | 11 | 13 |
| 50 | web | api-persistence | `apps/web/src/lib/supabase/storage-usage-pagination.ts` | 11 | 8 |

## Branches critiques non couvertes

Les lignes ci-dessous sont des points de branchement instrumentés non couverts dans les familles Web classées security, api-persistence ou business. Elles sont des priorités de test, pas une interprétation automatique de l'intention métier.

- `business` — `apps/web/src/lib/spogomi/results-projection.ts:118`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:122`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:126`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:130`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:131`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:132`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:134`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:135`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:142`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:143`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:144`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:145`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:146`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:148`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:153`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:155`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:159`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:162`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:163`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:164`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:167`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:168`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:170`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:172`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:228`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:246`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:258`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:264`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:266`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:270`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:278`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:279`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:290`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:291`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:297`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:298`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:305`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:325`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:345`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:363`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:378`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:387`
- `business` — `apps/web/src/lib/spogomi/results-projection.ts:391`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:41`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:45`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:48`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:71`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:79`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:80`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:82`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:84`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:96`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:104`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:157`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:185`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:188`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:192`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:202`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:225`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:226`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:227`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:228`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:229`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:230`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:231`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:232`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:233`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:235`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:239`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:240`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:241`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:244`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:252`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:257`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:262`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:267`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:271`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:281`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:291`
- `business` — `apps/web/src/lib/environmental-impact-estimator/codex-usage-store.ts:292`

## Instrumentation et artefacts

- Web : Vitest `4.1.12` avec `@vitest/coverage-v8` `4.1.12` (V8), résumé JSON et LCOV.
- Mobile : Vitest `4.1.12` avec `@vitest/coverage-v8` `4.1.12` (V8), résumé JSON et LCOV.
- Node/scripts : `c8` `12.0.0`, résumé JSON et LCOV.
- Python : `coverage.py` `7.16.2` et `pytest` `9.1.1`, rapport Cobertura ; statements/functions ne sont pas exposés par ce producteur.
- Les empreintes des rapports source et des preuves sont conservées dans l'artefact JSON ; elles ne valent pas à elles seules une preuve d'intégration externe.

## Producteurs et preuves

| Producteur | Commande | Résultat | Niveau de preuve | Limite |
| --- | --- | --- | --- | --- |
| Web | `npm run test:coverage` puis `npm run quality:coverage` | PASS CI | EXECUTED_BEHAVIOR + rapport CI SHA exact | preuve candidate marquée WORKTREE par le producteur ; pas une preuve DB/E2E |
| Mobile | `npm run quality:mobile-coverage` | PASS CI | EXECUTED_BEHAVIOR / PRESENT_NOT_ATTESTED | pas d'artefact CI téléchargeable par fichier ; checkout local dirty |
| Node/scripts | `npm run test:coverage:node` | PASS CI | EXECUTED_BEHAVIOR + rapport CI SHA exact | pas de cible canonique ; le rapport couvre le périmètre réel du producteur, y compris ses chemins instrumentés |
| Python | `npm run test:coverage:python` | PASS local, 137 tests | WORKTREE_LIVE / PRESENT_NOT_ATTESTED | job CI Python SKIPPED au SHA courant ; pas de preuve publiée exacte |
| PostgreSQL/Supabase | workflow `e2e-supabase-ephemeral` | NOT_EXECUTED | DB_SEMANTICS_NOT_EXECUTED | démarrage éphémère en échec (`SUPABASE_START_START_TIMEOUT`) |
| E2E/natif/Clerk réel | workflows et appareils | NOT_MEASURED | NOT_MEASURED | non requis pour produire les rapports de couverture code |

## Prochains macro-lots

| Priorité | Owner / périmètre | Motif | Preuve attendue |
| --- | --- | --- | --- |
| P0 | PostgreSQL notifications/gamification, RLS, CAS, concurrence | invariants persistants non exécutés | runner Supabase éphémère opérationnel + assertions pgTAP exécutées |
| P0 | `apps/web/src/lib/auth`, `src/proxy`, routes account | security sous les objectifs et branches critiques manquantes | tests négatifs AuthN/AuthZ + couverture Web comparable |
| P1 | `apps/web/src/app/api`, persistence et producteurs métier | branches sous 80 % dans API/business | HTTP/integration tests avec effets persistés et erreurs |
| P1 | `unclassified`, notamment Gamification | volume important sans qualification canonique | classification owner/risk ratifiée ou campagne dédiée sans seuil inventé |
| P2 | Node/scripts | mesure utile mais cible absente | seuil ratifié séparément et preuve CI stable |
| P2 | Python | preuve locale non publiée | job CI sélectionné au SHA exact et rapport Cobertura attesté |
| P3 | UI presentational | pas de seuil uniforme | tests comportementaux/accessibilité ciblés, pas de ratchet visuel uniforme |

## Méthode, limites et verdict

Les rapports CI Web/Node ont été téléchargés depuis le run `40360964042` au SHA exact. Les compteurs par fichier sont conservés dans `coverage-reference-2026-10-26.json`, avec empreintes des rapports sources, classification primaire et déficits calculés. Les comparaisons M0 ne sont pas présentées comme un gain avant/après : SHA, configuration et périmètres diffèrent. La seule comparaison comparable conservée est la comparaison historique `route-calculs` du checker CI, `PASS_WITH_GRACE`.

**STOP CONDITION : PARTIELLE.** Les périmètres Web et Node mesurés sont inventoriés ; Mobile et Python ont une preuve limitée ; les preuves PostgreSQL et les intégrations externes restent manquantes. Aucun faux PASS ni changement de baseline, seuil, exclusion ou politique n'a été introduit.

Artefact structuré : [`coverage-reference-2026-10-26.json`](coverage-reference-2026-10-26.json).
