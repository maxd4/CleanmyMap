# Audit de surface produit et accessibilité des routes

<!-- PRODUCT_SURFACE_AUDIT:GENERATED:BEGIN -->
## En-tête

`AUDIT_REF=811e94c889a9e910ef8727eb1469d6b425441bcf`
`AUDIT_GENERATED_AT=2026-09-25T20:44:52.025Z`
`AUDIT_STATUS=CURRENT_AT_GENERATION`

Commande :

`npm run audit:product-surface -- --ref=HEAD`

Le rapport est généré depuis les routes runtime, la navigation, le registre
de rubriques, l’index pages-site, l’indexabilité SEO, le proxy et le sitemap.
Il ne remplace aucune de ces sources et ne transforme pas l’absence de lien en
décision automatique de suppression.

## Résumé

| STATUS | COUNT |
| --- | ---: |
| PRIMARY_NAV | 17 |
| SECONDARY_NAV | 22 |
| DEEP_LINK | 1 |
| PROTECTED_TOOL | 8 |
| QA_TOOL | 1 |
| REDIRECT_COMPAT | 16 |
| ORPHAN_ROUTE | 1 |
| OBSOLETE | 0 |
| UNKNOWN | 6 |
| ROUTES_RUNTIME | 72 |
| LIENS_RUNTIME_NON_RESOLUS | 10 |
| INVARIANTS_CERTAINS_EN_ERREUR | 10 |

## Table principale

| ROUTE | STATUS | IN_RIBBON | INBOUND | ACCESS | CANONICAL | RATIONALE |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | SECONDARY_NAV | NO | 4 — apps/web/src/app/contact/page.tsx, apps/web/src/app/mentions-legales/page.tsx, apps/web/src/components/auth/auth-page-shell.tsx (+1) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/actions/history` | PROTECTED_TOOL | NO | 12 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-impact-summary.tsx, apps/web/src/components/actions/action-declaration/form/action-declaration-form.feedback.tsx (+7) | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/actions/map` | PRIMARY_NAV | YES | 19 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-hero.tsx, apps/web/src/components/accueil/accueil-navigation-schema.tsx (+12) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/actions/new` | SECONDARY_NAV | NO | 27 — apps/web/src/app/(app)/actions/history/page.tsx, apps/web/src/app/(app)/actions/map/page-client.tsx, apps/web/src/app/(app)/dashboard/page.tsx (+21) | clerk-context | CURRENT | consumer runtime hors ruban principal |
| `/admin` | PROTECTED_TOOL | YES | 2 — apps/web/src/components/admin/admin-creator-console.tsx, apps/web/src/components/pilotage/access-screen/views/pilotage-overview-support-sections.tsx | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/admin/forms` | PROTECTED_TOOL | NO | — | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/admin/gamification/xp-audit` | PROTECTED_TOOL | NO | — | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/admin/godmode` | PROTECTED_TOOL | NO | — | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/admin/quiz-bank` | PROTECTED_TOOL | NO | 4 — apps/web/src/app/(app)/admin/page.tsx, apps/web/src/components/admin/quiz-pedagogical-metrics-panel.tsx | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/admin/services` | PROTECTED_TOOL | NO | 2 — apps/web/src/app/(app)/admin/page.tsx, apps/web/src/lib/admin/admin-dashboard-contract.ts | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/community` | REDIRECT_COMPAT | NO | 2 — apps/web/src/lib/governance/governance-monthly-report-high-risk.fixtures.ts, apps/web/src/lib/governance/governance-monthly-report.fixtures.ts | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/compte/evolution` | SECONDARY_NAV | NO | 2 — apps/web/src/components/account/account-setup-form.tsx, apps/web/src/components/sections/rubriques/elus-section.tsx | protected | CURRENT | consumer runtime hors ruban principal |
| `/conditions-generales-utilisation` | SECONDARY_NAV | NO | 5 — apps/web/src/app/mentions-legales/page.tsx, apps/web/src/app/politique-confidentialite/page.tsx, apps/web/src/app/politique-cookies/page.tsx (+2) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/conditions-utilisation` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/contact` | SECONDARY_NAV | NO | 8 — apps/web/src/app/conditions-generales-utilisation/page.tsx, apps/web/src/app/mentions-legales/page.tsx, apps/web/src/app/politique-confidentialite/page.tsx (+2) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/dashboard` | PRIMARY_NAV | YES | 2 — apps/web/src/components/navigation/notification-bell.tsx, apps/web/src/components/pilotage/decision-cluster-section.tsx | protected | CURRENT | entrée visible du registre/navigation |
| `/en` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/error/429` | UNKNOWN | NO | — | public-visible | CURRENT | preuve de reachability insuffisante |
| `/explorer` | PRIMARY_NAV | YES | — | public-visible | CURRENT | entrée visible du registre/navigation |
| `/gamification` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/learn/bonnes-pratiques` | PRIMARY_NAV | YES | 9 — apps/web/src/app/learn/sentrainer/client.tsx, apps/web/src/components/learn/quiz/quiz-school-kit-page.tsx, apps/web/src/components/sections/rubriques/feedback-section.shared.ts (+5) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/learn/comprendre` | PRIMARY_NAV | YES | 12 — apps/web/src/app/learn/ressources/learn-ressources-client.data.ts, apps/web/src/app/learn/ressources/learn-ressources-client.tsx, apps/web/src/components/accueil/accueil-navigation-schema.tsx (+6) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/learn/ecole` | SECONDARY_NAV | NO | 2 — apps/web/src/components/learn/quiz/quiz-access-picker.tsx, apps/web/src/components/learn/quiz/school/quiz-school-picker.tsx | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/learn/sentrainer` | PRIMARY_NAV | YES | 8 — apps/web/src/app/learn/comprendre/page.tsx, apps/web/src/components/learn/quiz/quiz-school-kit-page.tsx, apps/web/src/lib/learning/learn-rubric-data.ts (+1) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/mentions-legales` | SECONDARY_NAV | NO | 4 — apps/web/src/app/politique-confidentialite/page.tsx, apps/web/src/app/signaler-contenu-illicite/page.tsx, apps/web/src/components/accueil/accueil-footer.tsx (+1) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/messagerie` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/methodologie` | PRIMARY_NAV | YES | 24 — apps/web/src/app/(app)/actions/map/_components/map-sidebar-aid.tsx, apps/web/src/app/(app)/actions/map/page-client.tsx, apps/web/src/app/(app)/actions/map/page.tsx (+21) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/missions/[id]` | UNKNOWN | NO | — | protected | CURRENT | pattern dynamique ; les consumers concrets doivent être résolus séparément |
| `/onboarding` | REDIRECT_COMPAT | NO | 1 — apps/web/src/components/account/account-completion-gate.tsx | protected | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/onboarding/localisation` | REDIRECT_COMPAT | NO | 1 — apps/web/src/app/reglages/page.tsx | protected | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/open-data` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/parcours` | UNKNOWN | NO | — | protected | CURRENT | preuve de reachability insuffisante |
| `/parcours/[profile]` | UNKNOWN | NO | — | protected | CURRENT | pattern dynamique ; les consumers concrets doivent être résolus séparément |
| `/partners/dashboard` | SECONDARY_NAV | NO | 2 — apps/web/src/components/admin/partner-onboarding-requests-panel.tsx | protected | CURRENT | consumer runtime hors ruban principal |
| `/partners/network` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/partners/network/pepite` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/partners/onboarding` | SECONDARY_NAV | NO | 6 — apps/web/src/components/sections/rubriques/annuaire/annuaire-filters-card.tsx, apps/web/src/components/sections/rubriques/annuaire/annuaire-governance-panel.tsx, apps/web/src/components/sections/rubriques/annuaire/annuaire-section.tsx (+2) | protected | CURRENT | consumer runtime hors ruban principal |
| `/pilotage` | PRIMARY_NAV | YES | 1 — apps/web/src/components/pilotage/decision-cluster-section.tsx | clerk-context | CURRENT | entrée visible du registre/navigation |
| `/politique-confidentialite` | SECONDARY_NAV | NO | 8 — apps/web/src/app/conditions-generales-utilisation/page.tsx, apps/web/src/app/mentions-legales/page.tsx, apps/web/src/app/politique-cookies/page.tsx (+5) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/politique-cookies` | SECONDARY_NAV | NO | 6 — apps/web/src/app/conditions-generales-utilisation/page.tsx, apps/web/src/app/mentions-legales/page.tsx, apps/web/src/app/politique-confidentialite/page.tsx (+3) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/preview/actions/new` | QA_TOOL | NO | — | public-visible | CURRENT | outil QA/support identifié |
| `/prints/report` | PROTECTED_TOOL | NO | 3 — apps/web/src/lib/profiles-cta.ts | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/profil` | SECONDARY_NAV | NO | 1 — apps/web/src/components/accueil/accueil-community-credibility.tsx | protected | CURRENT | consumer runtime hors ruban principal |
| `/profil/[profile]` | UNKNOWN | NO | — | protected | CURRENT | pattern dynamique ; les consumers concrets doivent être résolus séparément |
| `/profil/impact` | UNKNOWN | NO | — | protected | CURRENT | preuve de reachability insuffisante |
| `/reglages` | REDIRECT_COMPAT | NO | — | protected | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/reports` | PRIMARY_NAV | YES | 12 — apps/web/src/app/(app)/actions/history/page.tsx, apps/web/src/app/(app)/actions/map/page-client.tsx, apps/web/src/components/accueil/accueil-community-credibility.tsx (+7) | clerk-context | CURRENT | entrée visible du registre/navigation |
| `/sections/[sectionId]` | DEEP_LINK | NO | 62 — apps/web/src/app/learn/ressources/learn-ressources-client.data.ts, apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-hero.tsx (+29) | public-visible | CURRENT | consumer de deep-link démontré |
| `/sections/actors` | SECONDARY_NAV | NO | 1 — apps/web/src/components/accueil/accueil-navigation-schema.tsx | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sections/annuaire` | PRIMARY_NAV | YES | 3 — apps/web/src/components/sections/rubriques/community/community-section-components.tsx, apps/web/src/components/sections/rubriques/partners-network-section.tsx | public-visible | CURRENT | entrée visible du registre/navigation |
| `/sections/climate` | SECONDARY_NAV | NO | 1 — apps/web/src/components/dashboard/business-alerts-panel.tsx | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sections/community` | PRIMARY_NAV | YES | 7 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-navigation-schema.tsx, apps/web/src/components/accueil/OriginCredibility.tsx (+2) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/sections/compost` | SECONDARY_NAV | NO | 5 — apps/web/src/app/learn/ressources/learn-ressources-client.data.ts, apps/web/src/components/learn/learn-practice-theme-tabs.data.ts, apps/web/src/components/learn/learn-tri-context-section.tsx (+1) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sections/dm` | REDIRECT_COMPAT | NO | — | public-visible | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/sections/elus` | SECONDARY_NAV | NO | 2 — apps/web/src/components/pilotage/access-screen/views/pilotage-overview-surface-tabs.tsx, apps/web/src/components/pilotage/decision-cluster-section.tsx | auth-disabled-gate | CURRENT | consumer runtime hors ruban principal |
| `/sections/feedback` | PRIMARY_NAV | YES | 7 — apps/web/src/components/accueil/accueil-navigation-schema.tsx, apps/web/src/components/navigation/app-navigation-ribbon-menus.tsx, apps/web/src/components/sections/rubriques/feedback-section-dashboard.tsx (+1) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/sections/funding` | PRIMARY_NAV | YES | 3 — apps/web/src/components/sections/rubriques/feedback-section.shared.ts, apps/web/src/components/sections/rubriques/section-renderer.tsx, apps/web/src/lib/profiles-cta.ts | public-visible | CURRENT | entrée visible du registre/navigation |
| `/sections/gamification` | PRIMARY_NAV | YES | 2 — apps/web/src/components/gamification/profile-gamification-summary.tsx, apps/web/src/lib/gamification/progression-leaderboard.ts | auth-disabled-gate | CURRENT | entrée visible du registre/navigation |
| `/sections/guide` | REDIRECT_COMPAT | NO | — | UNKNOWN | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/sections/messagerie` | PRIMARY_NAV | YES | 6 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-navigation-schema.tsx, apps/web/src/components/admin/creator-inbox/inbox-item-card.tsx (+3) | auth-blur-gate | CURRENT | entrée visible du registre/navigation |
| `/sections/open-data` | PRIMARY_NAV | YES | 2 — apps/web/src/components/accueil/accueil-navigation-schema.tsx, apps/web/src/lib/profiles-cta.ts | public-visible | CURRENT | entrée visible du registre/navigation |
| `/sections/recycling` | SECONDARY_NAV | NO | 12 — apps/web/src/app/learn/ressources/learn-ressources-client.data.ts, apps/web/src/components/learn/learn-practice-theme-tabs.data.ts, apps/web/src/components/learn/learn-tri-context-section.tsx (+4) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sections/rejoindre-un-formulaire` | REDIRECT_COMPAT | NO | — | clerk-context | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/sections/rejoindre-une-action` | SECONDARY_NAV | NO | 5 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-hero.tsx, apps/web/src/components/accueil/accueil-navigation-schema.tsx (+2) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sections/route` | REDIRECT_COMPAT | NO | 3 — apps/web/src/components/accueil/accueil-navigation-schema.tsx, apps/web/src/components/sections/rubriques/guide-section.tsx, apps/web/src/components/sections/rubriques/route-methodology-section.tsx | public-visible | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/sections/trash-spotter` | ORPHAN_ROUTE | NO | — | auth-blur-gate | CURRENT | aucun consumer runtime, redirect ou usage interne démontré |
| `/sections/weather` | REDIRECT_COMPAT | NO | 2 — apps/web/src/components/sections/rubriques/guide-section.tsx, apps/web/src/lib/learning/quiz/quiz-personal-progress.ts | public-visible | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/sign-in` | SECONDARY_NAV | NO | 11 — apps/web/src/app/onboarding/page.tsx, apps/web/src/app/reglages/page.tsx, apps/web/src/app/sign-in/[[...sign-in]]/page.tsx (+7) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sign-up` | SECONDARY_NAV | NO | 2 — apps/web/src/app/sign-up/[[...sign-up]]/page.tsx, apps/web/src/components/navigation/app-navigation-ribbon-account.tsx | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/signalement` | SECONDARY_NAV | NO | 8 — apps/web/src/components/learn/learn-gestes-propres-collective-action-section.tsx, apps/web/src/components/learn/learn-practice-theme-tabs.data.ts, apps/web/src/components/learn/learn-tri-context-section.tsx (+3) | clerk-context | CURRENT | consumer runtime hors ruban principal |
| `/signaler-contenu-illicite` | SECONDARY_NAV | NO | 4 — apps/web/src/app/conditions-generales-utilisation/page.tsx, apps/web/src/app/mentions-legales/page.tsx, apps/web/src/app/politique-confidentialite/page.tsx (+1) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sponsor-portal` | PRIMARY_NAV | YES | 2 — apps/web/src/components/pilotage/access-screen/views/pilotage-overview-surface-tabs.tsx, apps/web/src/components/pilotage/decision-cluster-section.tsx | protected | CURRENT | entrée visible du registre/navigation |

## Routes orphelines candidates

### Candidats

- `/sections/trash-spotter` — ORPHAN_ROUTE — aucun consumer runtime, redirect ou usage interne démontré.

## Legacy et redirects à réexaminer

### Compatibilités

- `/community` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/conditions-utilisation` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/en` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/gamification` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/messagerie` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/onboarding` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/onboarding/localisation` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/open-data` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/partners/network` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/partners/network/pepite` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/reglages` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/dm` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/guide` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/rejoindre-un-formulaire` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/route` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/weather` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.

## Outils internes et QA

### Surfaces internes

- `/actions/history` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin/forms` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin/gamification/xp-audit` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin/godmode` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin/quiz-bank` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin/services` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/preview/actions/new` — QA_TOOL — outil QA/support identifié.
- `/prints/report` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.

## Deep-links légitimes

### Deep-links

- `/sections/[sectionId]` — DEEP_LINK — consumer de deep-link démontré.

## Divergences documentation/runtime

### Références documentation-only

_Aucune route dans cette catégorie._

### Routes runtime absentes de l’index

_Aucune route dans cette catégorie._

### Liens runtime vers une route non résolue

- `/charte`
- `[chemin documentaire interne]`
- `[chemin documentaire interne]`
- `[chemin documentaire interne]`
- `[chemin documentaire interne]`
- `[chemin documentaire interne]`
- `[chemin documentaire interne]`
- `[chemin documentaire interne]`
- `[chemin documentaire interne]`
- `/feedback`

### Invariants certains

- lien runtime non résolu : /charte
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : [chemin documentaire interne]
- lien runtime non résolu : /feedback

## Graphe détaillé

| ROUTE | SOURCE | IN_REGISTRY | IN_SITEMAP | DEEP_LINK_CONSUMERS | INBOUND_REDIRECTS | DYNAMIC_ROUTE | QA_OR_INTERNAL_USAGE | DOCUMENTATION_STATUS | REACHABILITY_STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `apps/web/src/app/page.tsx` | NO | NO | — | /en | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/actions/history` | `apps/web/src/app/(app)/actions/history/page.tsx` | YES | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/actions/map` | `apps/web/src/app/(app)/actions/map/page.tsx` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/actions/new` | `apps/web/src/app/(app)/actions/new/page.tsx` | YES | YES | — | /sections/guide, /sections/route, /sections/weather | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/admin` | `apps/web/src/app/(app)/admin/page.tsx` | YES | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/admin/forms` | `apps/web/src/app/(app)/admin/forms/page.tsx` | NO | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/admin/gamification/xp-audit` | `apps/web/src/app/admin/gamification/xp-audit/page.tsx` | NO | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/admin/godmode` | `apps/web/src/app/(app)/admin/godmode/page.tsx` | YES | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/admin/quiz-bank` | `apps/web/src/app/(app)/admin/quiz-bank/page.tsx` | NO | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/admin/services` | `apps/web/src/app/(app)/admin/services/page.tsx` | NO | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/community` | `apps/web/src/app/(app)/community/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/compte/evolution` | `apps/web/src/app/(app)/compte/evolution/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/conditions-generales-utilisation` | `apps/web/src/app/conditions-generales-utilisation/page.tsx` | NO | YES | — | /conditions-utilisation | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/conditions-utilisation` | `apps/web/src/app/conditions-utilisation/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/contact` | `apps/web/src/app/contact/page.tsx` | NO | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/dashboard` | `apps/web/src/app/(app)/dashboard/page.tsx` | YES | NO | apps/web/src/components/navigation/notification-bell.tsx | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/en` | `apps/web/src/app/en/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/error/429` | `apps/web/src/app/error/429/page.tsx` | NO | NO | — | — | NO | SPECIAL_ROUTE | CURRENT_INDEX | UNKNOWN |
| `/explorer` | `apps/web/src/app/(app)/explorer/page.tsx` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/gamification` | `apps/web/src/app/(app)/gamification/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/learn/bonnes-pratiques` | `apps/web/src/app/learn/bonnes-pratiques/page.tsx` | YES | YES | apps/web/src/components/sections/rubriques/feedback-section.shared.ts | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/learn/comprendre` | `apps/web/src/app/learn/comprendre/page.tsx` | YES | YES | apps/web/src/components/sections/rubriques/feedback-section.shared.ts | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/learn/ecole` | `apps/web/src/app/learn/ecole/page.tsx` | NO | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/learn/sentrainer` | `apps/web/src/app/learn/sentrainer/page.tsx` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/mentions-legales` | `apps/web/src/app/mentions-legales/page.tsx` | NO | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/messagerie` | `apps/web/src/app/(app)/messagerie/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/methodologie` | `apps/web/src/app/(app)/methodologie/page.tsx` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/missions/[id]` | `apps/web/src/app/(app)/missions/[id]/page.tsx` | NO | NO | — | — | YES | NONE_DEMONSTRATED | CURRENT_INDEX | UNKNOWN |
| `/onboarding` | `apps/web/src/app/onboarding/page.tsx` | NO | NO | — | /onboarding/localisation | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REDIRECT_ONLY |
| `/onboarding/localisation` | `apps/web/src/app/onboarding/localisation/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/open-data` | `apps/web/src/app/(app)/open-data/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/parcours` | `apps/web/src/app/(app)/parcours/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | UNKNOWN |
| `/parcours/[profile]` | `apps/web/src/app/(app)/parcours/[profile]/page.tsx` | NO | NO | — | — | YES | NONE_DEMONSTRATED | CURRENT_INDEX | UNKNOWN |
| `/partners/dashboard` | `apps/web/src/app/(app)/partners/dashboard/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/partners/network` | `apps/web/src/app/(app)/partners/network/page.tsx` | YES | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/partners/network/pepite` | `apps/web/src/app/(app)/partners/network/pepite/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/partners/onboarding` | `apps/web/src/app/(app)/partners/onboarding/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/pilotage` | `apps/web/src/app/(app)/pilotage/page.tsx` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/politique-confidentialite` | `apps/web/src/app/politique-confidentialite/page.tsx` | NO | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/politique-cookies` | `apps/web/src/app/politique-cookies/page.tsx` | NO | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/preview/actions/new` | `apps/web/src/app/preview/actions/new/page.tsx` | NO | NO | — | — | NO | QA_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/prints/report` | `apps/web/src/app/(app)/prints/report/page.tsx` | NO | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/profil` | `apps/web/src/app/(app)/profil/page.tsx` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/profil/[profile]` | `apps/web/src/app/(app)/profil/[profile]/page.tsx` | NO | NO | — | — | YES | NONE_DEMONSTRATED | CURRENT_INDEX | UNKNOWN |
| `/profil/impact` | `apps/web/src/app/(app)/profil/impact/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | UNKNOWN |
| `/reglages` | `apps/web/src/app/reglages/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REDIRECT_ONLY |
| `/reports` | `apps/web/src/app/(app)/reports/page.tsx` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/[sectionId]` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` | YES | YES | apps/web/src/components/sections/rubriques/feedback-section.shared.ts | /community, /gamification, /messagerie (+5) | YES | NONE_DEMONSTRATED | INDEX_SANS_FICHE | DEEP_LINK_ONLY |
| `/sections/actors` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/annuaire` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/climate` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REACHABLE |
| `/sections/community` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | /community, /partners/network, /partners/network/pepite | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/compost` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REACHABLE |
| `/sections/dm` | `apps/web/src/lib/sections-registry/config.ts` | YES | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/sections/elus` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/feedback` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/funding` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | apps/web/src/components/sections/rubriques/feedback-section.shared.ts | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/gamification` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | /gamification | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/guide` | `apps/web/src/lib/seo/indexability.ts` | NO | NO | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REDIRECT_ONLY |
| `/sections/messagerie` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | /messagerie, /sections/dm | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/open-data` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | /open-data | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/recycling` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | INDEX_SANS_FICHE | REACHABLE |
| `/sections/rejoindre-un-formulaire` | `apps/web/src/lib/seo/indexability.ts` | NO | NO | — | — | NO | NONE_DEMONSTRATED | NOT_APPLICABLE | REDIRECT_ONLY |
| `/sections/rejoindre-une-action` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | /sections/rejoindre-un-formulaire | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/route` | `apps/web/src/app/(app)/sections/route/page.tsx` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REDIRECT_ONLY |
| `/sections/trash-spotter` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | ORPHAN_CANDIDATE |
| `/sections/weather` | `apps/web/src/lib/sections-registry/config.ts` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REDIRECT_ONLY |
| `/sign-in` | `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` | NO | NO | — | /onboarding, /reglages | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sign-up` | `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/signalement` | `apps/web/src/app/(app)/signalement/page.tsx` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/signaler-contenu-illicite` | `apps/web/src/app/signaler-contenu-illicite/page.tsx` | NO | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sponsor-portal` | `apps/web/src/app/(app)/sponsor-portal/page.tsx` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |

## Taxonomie et limites

- `PRIMARY_NAV` : route visible dans la navigation principale issue du registre.
- `SECONDARY_NAV` : consumer runtime utilisateur démontré hors ruban principal.
- `DEEP_LINK` : consumer de contexte, email, notification ou workflow démontré.
- `PROTECTED_TOOL` : surface interne protégée ; l’absence du ruban n’est pas un finding.
- `QA_TOOL` : preview ou outil de contrôle identifié.
- `REDIRECT_COMPAT` : alias/redirect déclaré, dont l’utilité externe reste une décision humaine.
- `ORPHAN_ROUTE` : aucun consumer runtime, redirect, deep-link ou usage interne démontré ; candidat d’audit, jamais suppression automatique.
- `OBSOLETE` : réservé à une décision humaine confirmée ; le générateur ne l’infère pas.
- `UNKNOWN` : preuve insuffisante, notamment pour les routes dynamiques, auth/callback et erreurs.

Les URLs dynamiques non résolues restent `UNKNOWN`. Les tests, les références
documentaires et les listes de dead-code ne sont pas des consumers runtime.
Les routes d’erreur, auth/callback, exports et pages protégées ne sont pas
classées orphelines uniquement parce qu’elles ne figurent pas dans le ruban.

## Reproductibilité

Régénérer avec `--ref=HEAD`. Le mode `--strict` bloque seulement les liens
runtime inexistants, les fiches CURRENT sans route, les cibles de redirect
inexistantes et les incohérences certaines du registre. Une décision
`ORPHAN_ROUTE`, `OBSOLETE` ou de suppression reste hors du garde automatique.
La génération normale est read-only ; utiliser `--write` explicitement pour
actualiser ce fichier généré.
<!-- PRODUCT_SURFACE_AUDIT:GENERATED:END -->
