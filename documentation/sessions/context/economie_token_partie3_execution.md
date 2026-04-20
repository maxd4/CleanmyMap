# Execution PARTIE 3 — Audit + Corrections

Date: 2026-04-17
Updated: 2026-04-17 (final backlog resolved)

## Bloc 1 — Audit global rapide (10 max)

| # | Severite | Preuve (fichier:ligne) | Impact user/produit | Action |
|---|---|---|---|---|
| 1 | Critique | `apps/web/src/lib/navigation.ts:106-137` + `apps/web/src/app/(app)/sections/[sectionId]/page.tsx:31-33` | `annuaire` etait definie mais jamais autorisee par profil, donc 404 pour tous via guard | Corrige: ajout `annuaire` dans `PARCOURS_SPACE_PAGE_MAP` + modes `sobre/simplifie` |
| 2 | Critique | `apps/web/src/components/partners/partner-onboarding-form.tsx:37-43` | Prefill contact non fiable si `user` charge apres premier rendu | Corrige: hydratation defensive via `useEffect` (`:55-73`) |
| 3 | Critique | `apps/web/src/components/partners/partner-onboarding-form.tsx:99-123` + `apps/web/src/app/api/partners/onboarding-requests/route.ts:20-31` | Le formulaire pouvait arriver a 0 contribution puis rejet API | Corrige: verrou ">=1 contribution" + message inline |
| 4 | Important | `apps/web/src/lib/partners/onboarding-requests-store.ts:83-111` | Pas de garde de persistance runtime sur le store onboarding | Corrige: `assertPersistenceAvailable("partner_onboarding_requests")` |
| 5 | Important | `apps/web/src/components/sections/rubriques/trash-spotter-section.tsx:55-81` | Coordonnees invalides/partielles envoyables, erreurs tardives cote API | Corrige: validation locale nombres, paires lat/lng, bornes geo |
| 6 | Important | `apps/web/src/components/sections/section-renderer.tsx:125-130` | CTA annuaire non aligne (renvoyait vers declaration action) | Corrige: CTA vers `/partners/onboarding` |
| 7 | Important | `apps/web/src/app/(app)/partners/dashboard/page.tsx:39-45` | Risque de crash page dashboard si persistance indisponible | Corrige: fallback `n/a` + message explicite |
| 8 | Modere | `apps/web/src/components/sections/rubriques/annuaire-section.tsx:365` | Liste fiche limitee a 8 sans pagination, decrochage entre "resultats" et cartes visibles | Corrige: pagination 8/page + prev/suivant + compteur page |
| 9 | Modere | `apps/web/src/components/sections/rubriques/annuaire-governance-panel.tsx:82` | Transparence partielle: seuls 4 contacts non qualifies visibles | Corrige: vue complete (suppression de la troncature) |
| 10 | Modere | `apps/web/src/lib/partners/onboarding-requests-store.ts:113` + `apps/web/src/app/(app)/partners/dashboard/page.tsx:40` | KPI onboarding potentiellement tronque (>500) | Corrige: compteur dedie non tronque + exposition API `totalCount` |

## Bloc 2 — Audit rubriques (batch de 3)

### Rubrique `annuaire`
- UX: filtres bien au-dessus de la ligne de flottaison, badges/scannabilite OK.
- Bugs: acces bloque par mapping profil (corrige), CTA principal non aligne (corrige).
- Coherence: champs minimaux/verification/fraicheur presentes.
- Perf: pagination active des cartes (8/page), charge visuelle controlee.
- Actions:
  - fait: debloquer route via navigation profil.
  - fait: CTA vers onboarding partenaire.
  - fait: pagination cartes + compteur de pages.

### Rubrique `community`
- UX: structure claire en cartes, messages succes/erreur explicites.
- Bugs: aucun bloquant detecte.
- Coherence: bon chainage vers creation/suivi d'evenements.
- Perf: charge potentielle selon volume `ActionsHistoryList` (surveillance).
- Actions:
  - conserver l'architecture actuelle.
  - ajouter monitoring temps de rendu si volume historique augmente.

### Rubrique `trash-spotter`
- UX: creation signalement lisible, feedback visuel present.
- Bugs: validation coordonnees insuffisante (corrige).
- Coherence: lien avec carte/actions coherent.
- Perf: SWR + limite 250 conforme au besoin courant.
- Actions:
  - fait: validation stricte latitude/longitude.
  - a faire: eventuel auto-parse formats avec virgule FR.

## Bloc 3 — Audit transversal inter-rubriques

Collisions/regressions detectees:
1. Registry section vs permissions profil non synchronise (`annuaire`) -> corrige.
2. CTA annuaire dans shell section non aligne sur l'objectif "commercant engage" -> corrige.
3. Robustesse persistance heterogene entre stores -> onboarding aligne sur garde runtime.

## Bloc 4 — Corrections appliquees (critiques puis importantes)

Fichiers modifies:
- `apps/web/src/lib/navigation.ts`
- `apps/web/src/components/partners/partner-onboarding-form.tsx`
- `apps/web/src/lib/partners/onboarding-requests-store.ts`
- `apps/web/src/components/sections/rubriques/trash-spotter-section.tsx`
- `apps/web/src/components/sections/section-renderer.tsx`
- `apps/web/src/app/(app)/partners/dashboard/page.tsx`

Validations:
- `npm -C apps/web run typecheck` ✅
- `npm -C apps/web run lint` ✅

## Bloc 5 — Passe expert minimal (restant critique/angle mort)

Restant critique: aucun bloqueur fonctionnel detecte apres correctifs.

Restants importants/moderes:
1. Aucun de la liste initiale (pagination, vue complete non qualifies, KPI >500 corriges).

Angle mort principal:
- Pas de test e2e de parcours complet (`sign-up -> onboarding localisation -> annuaire -> onboarding partenaire`).

## Bloc 6 — Cloture operationnelle

PARTIE 3 executee avec corrections appliquees et validees.
Prochaine action conseillee: ajouter test e2e parcours et pagination annuaire.
