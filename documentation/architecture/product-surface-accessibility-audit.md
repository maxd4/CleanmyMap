# Audit de surface produit et accessibilité des routes

<!-- PRODUCT_SURFACE_AUDIT:GENERATED:BEGIN -->
## En-tête

`AUDIT_REF=4f9369ef3becae0ed98ef836bf86907fd29eed60`
`AUDIT_GENERATED_AT=2026-09-25T21:25:36.605Z`
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
| PRIMARY_NAV | 20 |
| SECONDARY_NAV | 23 |
| DEEP_LINK | 1 |
| PROTECTED_TOOL | 5 |
| QA_TOOL | 1 |
| REDIRECT_COMPAT | 14 |
| ORPHAN_ROUTE | 0 |
| OBSOLETE | 0 |
| UNKNOWN | 8 |
| ROUTES_RUNTIME | 72 |
| REVIEW_FINDING | 0 |
| INVARIANT_ERROR | 4 |

## Table principale

| ROUTE | STATUS | IN_RIBBON | INBOUND | ACCESS | CANONICAL | RATIONALE |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | SECONDARY_NAV | NO | 4 — apps/web/src/app/contact/page.tsx, apps/web/src/app/mentions-legales/page.tsx, apps/web/src/components/auth/auth-page-shell.tsx (+1) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/actions/history` | PROTECTED_TOOL | NO | 12 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-impact-summary.tsx, apps/web/src/components/actions/action-declaration/form/action-declaration-form.feedback.tsx (+7) | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/actions/map` | PRIMARY_NAV | YES | 19 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-hero.tsx, apps/web/src/components/accueil/accueil-navigation-schema.tsx (+12) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/actions/new` | PRIMARY_NAV | YES | 27 — apps/web/src/app/(app)/actions/history/page.tsx, apps/web/src/app/(app)/actions/map/page-client.tsx, apps/web/src/app/(app)/dashboard/page.tsx (+21) | clerk-context | CURRENT | entrée visible du registre/navigation |
| `/admin` | PROTECTED_TOOL | YES | 2 — apps/web/src/components/admin/admin-creator-console.tsx, apps/web/src/components/pilotage/access-screen/views/pilotage-overview-support-sections.tsx | protected | CURRENT | surface interne protégée ; absence du ruban non probante |
| `/admin/forms` | UNKNOWN | NO | — | protected | CURRENT | route protégée sans consumer, navigation ou usage interne démontré |
| `/admin/gamification/xp-audit` | UNKNOWN | NO | — | protected | CURRENT | route protégée sans consumer, navigation ou usage interne démontré |
| `/admin/godmode` | UNKNOWN | NO | — | protected | CURRENT | route protégée sans consumer, navigation ou usage interne démontré |
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
| `/onboarding` | SECONDARY_NAV | NO | 1 — apps/web/src/components/account/account-completion-gate.tsx | protected | CURRENT | consumer runtime hors ruban principal |
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
| `/profil/[profile]` | SECONDARY_NAV | NO | 1 — apps/web/src/components/gamification/profile-gamification-summary.tsx | protected | CURRENT | consumer runtime hors ruban principal |
| `/profil/impact` | SECONDARY_NAV | NO | 1 — apps/web/src/components/gamification/profile-gamification-summary.tsx | protected | CURRENT | consumer runtime hors ruban principal |
| `/reglages` | UNKNOWN | NO | — | protected | CURRENT | preuve de reachability insuffisante |
| `/reports` | PRIMARY_NAV | YES | 12 — apps/web/src/app/(app)/actions/history/page.tsx, apps/web/src/app/(app)/actions/map/page-client.tsx, apps/web/src/components/accueil/accueil-community-credibility.tsx (+7) | clerk-context | CURRENT | entrée visible du registre/navigation |
| `/sections/[sectionId]` | DEEP_LINK | NO | 63 — apps/web/src/app/(app)/signalement/page.tsx, apps/web/src/app/learn/ressources/learn-ressources-client.data.ts, apps/web/src/components/accueil/accueil-community-credibility.tsx (+30) | public-visible | CURRENT | consumer de deep-link démontré |
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
| `/sections/rejoindre-une-action` | PRIMARY_NAV | YES | 5 — apps/web/src/components/accueil/accueil-community-credibility.tsx, apps/web/src/components/accueil/accueil-hero.tsx, apps/web/src/components/accueil/accueil-navigation-schema.tsx (+2) | public-visible | CURRENT | entrée visible du registre/navigation |
| `/sections/route` | REDIRECT_COMPAT | NO | 3 — apps/web/src/components/accueil/accueil-navigation-schema.tsx, apps/web/src/components/sections/rubriques/guide-section.tsx, apps/web/src/components/sections/rubriques/route-methodology-section.tsx | public-visible | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/sections/trash-spotter` | SECONDARY_NAV | NO | 1 — apps/web/src/app/(app)/signalement/page.tsx | auth-blur-gate | CURRENT | consumer runtime hors ruban principal |
| `/sections/weather` | REDIRECT_COMPAT | NO | 2 — apps/web/src/components/sections/rubriques/guide-section.tsx, apps/web/src/lib/learning/quiz/quiz-personal-progress.ts | public-visible | REDIRECT_COMPAT | alias ou redirect déclaré ; utilité externe à réexaminer |
| `/sign-in` | SECONDARY_NAV | NO | 11 — apps/web/src/app/onboarding/page.tsx, apps/web/src/app/reglages/page.tsx, apps/web/src/app/sign-in/[[...sign-in]]/page.tsx (+7) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sign-up` | SECONDARY_NAV | NO | 2 — apps/web/src/app/sign-up/[[...sign-up]]/page.tsx, apps/web/src/components/navigation/app-navigation-ribbon-account.tsx | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/signalement` | PRIMARY_NAV | YES | 8 — apps/web/src/components/learn/learn-gestes-propres-collective-action-section.tsx, apps/web/src/components/learn/learn-practice-theme-tabs.data.ts, apps/web/src/components/learn/learn-tri-context-section.tsx (+3) | clerk-context | CURRENT | entrée visible du registre/navigation |
| `/signaler-contenu-illicite` | SECONDARY_NAV | NO | 4 — apps/web/src/app/conditions-generales-utilisation/page.tsx, apps/web/src/app/mentions-legales/page.tsx, apps/web/src/app/politique-confidentialite/page.tsx (+1) | public-visible | CURRENT | consumer runtime hors ruban principal |
| `/sponsor-portal` | PRIMARY_NAV | YES | 2 — apps/web/src/components/pilotage/access-screen/views/pilotage-overview-surface-tabs.tsx, apps/web/src/components/pilotage/decision-cluster-section.tsx | protected | CURRENT | entrée visible du registre/navigation |

## Routes orphelines candidates

### Candidats

_Aucune route dans cette catégorie._

## Legacy et redirects à réexaminer

### Compatibilités

- `/community` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/conditions-utilisation` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/en` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/gamification` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/messagerie` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/onboarding/localisation` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/open-data` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/partners/network` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/partners/network/pepite` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/dm` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/guide` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/rejoindre-un-formulaire` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/route` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.
- `/sections/weather` — REDIRECT_COMPAT — alias ou redirect déclaré ; utilité externe à réexaminer.

## Outils internes et QA

### Surfaces internes

- `/actions/history` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin/quiz-bank` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/admin/services` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.
- `/preview/actions/new` — QA_TOOL — outil QA/support identifié.
- `/prints/report` — PROTECTED_TOOL — surface interne protégée ; absence du ruban non probante.

## Routes protégées à revoir

### Protection sans entrée démontrée

- `/admin/forms` — UNKNOWN — route protégée sans consumer, navigation ou usage interne démontré.
- `/admin/gamification/xp-audit` — UNKNOWN — route protégée sans consumer, navigation ou usage interne démontré.
- `/admin/godmode` — UNKNOWN — route protégée sans consumer, navigation ou usage interne démontré.

## Deep-links légitimes

### Deep-links

- `/sections/[sectionId]` — DEEP_LINK — consumer de deep-link démontré.

## Divergences documentation/runtime

### Références documentation-only

_Aucune route dans cette catégorie._

### Routes runtime absentes de l’index

_Aucune route dans cette catégorie._

### Findings à revoir

Aucun.

### Invariants certains

- `/charte` — INVARIANT_ERROR — apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section.explorer.tsx.
- `/documentation/features/quiz-authoring-guide.md` — INVARIANT_ERROR — apps/web/src/components/admin/quiz-pedagogical-metrics-panel.tsx, apps/web/src/lib/learning/quiz/school/quiz-school-workshop-activities.ts, apps/web/src/lib/learning/quiz/school/quiz-school-workshop-assessment.ts.
- `/documentation/features/quiz-quality-control.md` — INVARIANT_ERROR — apps/web/src/components/admin/quiz-pedagogical-metrics-panel.tsx.
- `/feedback` — INVARIANT_ERROR — apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section.cards.tsx.

## Graphe détaillé

| ROUTE | SOURCE | IN_REGISTRY | IN_SITEMAP | DEEP_LINK_CONSUMERS | INBOUND_REDIRECTS | DYNAMIC_ROUTE | QA_OR_INTERNAL_USAGE | DOCUMENTATION_STATUS | REACHABILITY_STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `apps/web/src/app/page.tsx` | NO | NO | — | /en | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/actions/history` | `apps/web/src/app/(app)/actions/history/page.tsx` | YES | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/actions/map` | `apps/web/src/app/(app)/actions/map/page.tsx` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/actions/new` | `apps/web/src/app/(app)/actions/new/page.tsx` | YES | YES | — | /sections/guide, /sections/route, /sections/weather | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/admin` | `apps/web/src/app/(app)/admin/page.tsx` | YES | NO | — | — | NO | PROTECTED_TOOL | CURRENT_INDEX | INTERNAL_OR_QA |
| `/admin/forms` | `apps/web/src/app/(app)/admin/forms/page.tsx` | NO | NO | — | — | NO | PROTECTED_REVIEW | CURRENT_INDEX | UNKNOWN |
| `/admin/gamification/xp-audit` | `apps/web/src/app/admin/gamification/xp-audit/page.tsx` | NO | NO | — | — | NO | PROTECTED_REVIEW | CURRENT_INDEX | UNKNOWN |
| `/admin/godmode` | `apps/web/src/app/(app)/admin/godmode/page.tsx` | YES | NO | — | — | NO | PROTECTED_REVIEW | CURRENT_INDEX | UNKNOWN |
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
| `/onboarding` | `apps/web/src/app/onboarding/page.tsx` | NO | NO | — | /onboarding/localisation | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
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
| `/profil/[profile]` | `apps/web/src/app/(app)/profil/[profile]/page.tsx` | NO | NO | — | — | YES | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/profil/impact` | `apps/web/src/app/(app)/profil/impact/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/reglages` | `apps/web/src/app/reglages/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | UNKNOWN |
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
| `/sections/trash-spotter` | `apps/web/src/lib/sections-registry/config.ts` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sections/weather` | `apps/web/src/lib/sections-registry/config.ts` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REDIRECT_ONLY |
| `/sign-in` | `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sign-up` | `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx` | NO | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/signalement` | `apps/web/src/app/(app)/signalement/page.tsx` | YES | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/signaler-contenu-illicite` | `apps/web/src/app/signaler-contenu-illicite/page.tsx` | NO | YES | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |
| `/sponsor-portal` | `apps/web/src/app/(app)/sponsor-portal/page.tsx` | YES | NO | — | — | NO | NONE_DEMONSTRATED | CURRENT_INDEX | REACHABLE |

## Taxonomie et limites

- `PRIMARY_NAV` : route visible dans la navigation principale issue du registre.
- `SECONDARY_NAV` : consumer runtime utilisateur démontré hors ruban principal.
- `DEEP_LINK` : consumer de contexte, email, notification ou workflow démontré.
- `PROTECTED_TOOL` : surface interne protégée ; l’absence du ruban n’est pas un finding.
- `PROTECTED_REVIEW` : route protégée sans consumer, navigation ou usage interne démontré ; elle reste à revoir humainement.
- `QA_TOOL` : preview ou outil de contrôle identifié.
- `REDIRECT_COMPAT` : alias/redirect déclaré, dont l’utilité externe reste une décision humaine.
- `ORPHAN_ROUTE` : aucun consumer runtime, redirect, deep-link ou usage interne démontré ; candidat d’audit, jamais suppression automatique.
- `OBSOLETE` : réservé à une décision humaine confirmée ; le générateur ne l’infère pas.
- `UNKNOWN` : preuve insuffisante, notamment pour les routes dynamiques, auth/callback et erreurs.
- `REVIEW_FINDING` : cible non résolue statiquement ou attribution insuffisante ; nécessite un audit, sans preuve de casse.
- `INVARIANT_ERROR` : lien utilisateur statique vers une route inexistante, registry/runtime incohérent, redirect cassé ou fiche CURRENT réellement absente.

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


<!-- PRODUCT_SURFACE_AUDIT:HUMAN_DECISIONS:BEGIN -->
## Décisions humaines

Ces décisions complètent le snapshot machine ci-dessus. Elles ne modifient ni
les sources SEO, ni les redirects, ni les baselines des contrôles qualité.

### Candidats audités

| ROUTE | REACHABILITY_STATUS | DECISION | RATIONALE | MAIN_ENTRY_POINT | NEXT_ACTION |
| --- | --- | --- | --- | --- | --- |
| /sections/trash-spotter | REACHABLE | ADD_ENTRY_POINT | Surface réelle de consultation : registre, renderer, hook de données, tests et fiche canonique concordent. Elle ne crée pas d’observation et ne doit pas rejoindre le ruban principal ; son absence de consumer était un défaut de découverte, corrigé par le CTA contextuel de /signalement. | /signalement → « Consulter les signalements » | Mesurer l’usage du CTA ; conserver la surface en monitoring secondaire. |
| /error/429 | INTERNAL_OR_QA | KEEP | Page d’état système destinée à être appelée par la gestion d’erreur, pas à être découverte par navigation. NOINDEX/INTERNAL_ONLY est cohérent avec son rôle. | Gestion d’erreur / limite de débit | Aucun. |
| /missions/[id] | DEEP_LINK_ONLY | DOCUMENT_AS_DEEP_LINK | Route dynamique protégée de workflow ; les invitations et partages d’événements construisent des URLs /missions/<id>. L’absence d’entrée primaire est intentionnelle. | Partage ou invitation d’une mission | Conserver la fiche et vérifier périodiquement les callers de génération d’URL. |
| /parcours | UNKNOWN | KEEP | Entrée de workflow authentifié qui affiche un aperçu puis redirige vers le profil actif ; l’absence de href littéral vient de la construction de route et ne prouve pas un abandon. | Parcours d’accueil / accès direct authentifié | Ajouter une preuve de consumer dynamique au prochain enrichissement de l’audit. |
| /parcours/[profile] | UNKNOWN | KEEP | Variante paramétrée du même workflow ; elle valide le profil actif et redirige vers la surface de profil canonique. | /parcours | Aucun changement de navigation. |
| /profil/[profile] | UNKNOWN | KEEP | Surface de profil réelle, consommée par les builders de routes et le dashboard ; le pattern dynamique ne doit pas être traité comme orphelin. | Dashboard / sélection de profil | Ajouter une preuve de consumer dynamique au générateur si elle reste nécessaire. |
| /profil/impact | SECONDARY_NAV | KEEP | Carte d’impact personnelle protégée, distincte des rapports collectifs ; le bloc « Progression & badges » du profil actif expose désormais un CTA contextuel dédié. | /profil/[profile] → « Progression & badges » → « Voir ma carte d’impact » | Conserver le CTA unique et vérifier périodiquement son usage. |
| /reglages | UNKNOWN | DEFER | Page protégée réelle, documentée et distincte des réglages inline du dashboard/profil ; le seul redirect vers sign-in est un garde d’authentification, pas un alias. L’utilité d’une URL autonome reste à confirmer par usage. | Accès direct / réglages inline | Mesurer les accès puis choisir MOVE_TO_SECONDARY_NAV ou consolidation. |

### Compatibilités conservées sous réserve de preuve externe

| ROUTE | REACHABILITY_STATUS | DECISION | RATIONALE | MAIN_ENTRY_POINT | NEXT_ACTION |
| --- | --- | --- | --- | --- | --- |
| /community | REDIRECT_ONLY | DEFER | Redirect explicite vers /sections/community ; aucun consumer runtime utilisateur actuel n’est démontré, mais l’audit local ne mesure ni backlinks ni trafic externe. | /sections/community | Vérifier analytics/backlinks avant retrait. |
| /conditions-utilisation | REDIRECT_ONLY | DEFER | Ancien chemin vers les conditions générales ; aucun consumer courant local, mais une suppression pourrait casser des liens externes ou historiques encore actifs. | /conditions-generales-utilisation | Vérifier analytics/backlinks avant retrait. |
| /en | REDIRECT_ONLY | DEFER | Alias documenté vers la racine, sans page anglaise canonique ; l’absence de consumer local ne prouve pas l’absence d’entrées externes. | / | Vérifier analytics/backlinks avant retrait. |
| /gamification | REDIRECT_ONLY | DEFER | Ancien chemin vers /sections/gamification, surface actuelle encore dans le registre et le ruban. | /sections/gamification | Vérifier analytics/backlinks avant retrait. |
| /messagerie | REDIRECT_ONLY | DEFER | Ancien chemin vers /sections/messagerie, encore actif comme surface canonique. | /sections/messagerie | Vérifier analytics/backlinks avant retrait. |
| /open-data | REDIRECT_ONLY | DEFER | Ancien chemin vers /sections/open-data, encore public et navigable. | /sections/open-data | Vérifier analytics/backlinks avant retrait. |
| /partners/network | REDIRECT_ONLY | DEFER | Ancien chemin vers l’espace partenaires de la communauté ; la cible existe et des références historiques sont documentées. | /sections/community?tab=partners | Vérifier analytics/backlinks avant retrait. |
| /partners/network/pepite | REDIRECT_ONLY | DEFER | Variante historique vers le même espace partenaires ; aucune preuve locale suffisante pour borner le risque externe. | /sections/community?tab=partners | Vérifier analytics/backlinks avant retrait. |
| /sections/dm | REDIRECT_ONLY | DOCUMENT_AS_DEEP_LINK | Deep-link historique vers l’onglet DM de /sections/messagerie ; la cible porte encore la fonction et le paramètre est sémantiquement utile. | /sections/messagerie?tab=dm | Conserver tant qu’aucune preuve externe ne justifie le retrait. |
| /sections/guide | REDIRECT_ONLY | DOCUMENT_AS_DEEP_LINK | Compatibilité vers le panneau météo de /actions/new, encore référencée par la documentation et les parcours de guide. | /actions/new?panel=meteo | Conserver et ne pas présenter comme une page concurrente. |
| /sections/rejoindre-un-formulaire | REDIRECT_ONLY | DEFER | Ancien libellé vers /sections/rejoindre-une-action ; la cible est canonique, mais l’usage externe n’est pas observable dans le dépôt. | /sections/rejoindre-une-action | Vérifier analytics/backlinks avant retrait. |
| /sections/route | REDIRECT_ONLY | DOCUMENT_AS_DEEP_LINK | Compatibilité encore appelée par le guide, la navigation d’accueil et la méthodologie ; elle ouvre le panneau itinéraire canonique. | /actions/new?panel=itineraire | Conserver tant que ces callers existent. |
| /sections/weather | REDIRECT_ONLY | DOCUMENT_AS_DEEP_LINK | Compatibilité appelée par le guide et le parcours de quiz ; elle ouvre le panneau météo canonique. | /actions/new?panel=meteo | Conserver tant que ces callers existent. |
| /onboarding/localisation | REDIRECT_ONLY | KEEP | Compatibilité active : fallback Clerk, inscription et réglages la construisent encore ; elle conserve next et les paramètres utiles avant /onboarding. | Inscription, layout Clerk, réglages | Aucun retrait tant que ces callers existent. |

### Outils internes et QA légitimes

| ROUTE | REACHABILITY_STATUS | DECISION | RATIONALE | MAIN_ENTRY_POINT | NEXT_ACTION |
| --- | --- | --- | --- | --- | --- |
| /preview/actions/new | INTERNAL_OR_QA | DOCUMENT_AS_INTERNAL_TOOL | Charge le vrai ActionDeclarationForm pour le contrôle QA ; ce n’est pas un second parcours métier et NOINDEX/INTERNAL_ONLY est approprié. | Lien/outillage QA explicite | Garder la page et son contrat de preview. |
| /actions/history | INTERNAL_OR_QA | DOCUMENT_AS_INTERNAL_TOOL | Historique protégé, appelé par plusieurs surfaces utilisateur et nécessaire au suivi des actions. | Dashboard, carte, formulaires | Aucun. |
| /prints/report | INTERNAL_OR_QA | DOCUMENT_AS_INTERNAL_TOOL | Export imprimable protégé, appelé par profiles-cta ; son absence du ruban est cohérente avec une action secondaire. | CTA de profil selon rôle | Aucun. |
| /admin, /admin/* | INTERNAL_OR_QA | DOCUMENT_AS_INTERNAL_TOOL | Surfaces d’administration protégées, documentées et gouvernées par les contrôles de rôle. | Cockpit admin / liens opérateur | Aucun. |

### Résumé des décisions

- **À supprimer** : aucune route ; aucune suppression n’est démontrée par le
  dépôt seul.
- **Compatibilités à retirer** : aucune à ce stade ; les 9 cas différés
  nécessitent une preuve de trafic/backlinks externe, et les quatre deep-links
  ont encore des callers ou une fonction documentée.
- **Entrées utilisateur améliorées** : /sections/trash-spotter, depuis
  /signalement, et /profil/impact, depuis le bloc « Progression & badges » du
  profil actif, par des CTA secondaires contextuels.
- **Routes secondaires/deep-links légitimes** : /missions/[id],
  /sections/dm, /sections/guide, /sections/route et /sections/weather.
- **Outils internes légitimes** : /preview/actions/new, /actions/history,
  /prints/report et les routes /admin.
- **Indécis** : /reglages et les compatibilités marquées DEFER ci-dessus.

<!-- PRODUCT_SURFACE_AUDIT:HUMAN_DECISIONS:END -->
