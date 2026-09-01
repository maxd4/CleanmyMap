# Plan de découpage monolithes

**Mis à jour :** 2026-08-31 | **Portée :** `apps/web/src` | **Source :** `npm run analyze:heavy-files` | **Seuil radar informatif :** > 7 KB | **Seuil d'alerte enforcement :** > 1000 lignes ou > 50 KB

## Objectif

Réduire la dette structurelle des fichiers applicatifs repérés par le radar en
modules testables, sans régression fonctionnelle. Le seuil d'enforcement est
un signal de revue, pas une taille cible pour les modules.
Règle : **un lot structurel par cible principale**, **API publique inchangée**,
**tests avant suppression du code legacy**.

---

## 📊 Radar actuel (scan 2026-08-31)

| Priorité | Taille actuelle | Fichier | Statut factuel |
|----------|-----------------|---------|----------------|
| 🔴 CRITIQUE | 861 lignes / 41,5 KB | `components/learn/quiz/quiz-session-panel.tsx` | Toujours dans le radar ; revalider le découpage |
| 🔴 CRITIQUE | 769 lignes / 36,9 KB | `components/sections/rubriques/rejoindre-un-formulaire-section.tsx` | À découper |
| 🔴 CRITIQUE | 839 lignes / 36,4 KB | `components/admin/free-plan-services-panel.tsx` | À découper |
| 🔴 CRITIQUE | 922 lignes / 36,2 KB | `components/sections/rubriques/partners-network-section.tsx` | À découper |
| 🔴 CRITIQUE | 676 lignes / 34,5 KB | `app/learn/ressources/learn-ressources-client.sections.tsx` | Nouveau signal ; qualifier les responsabilités avant extraction |
| 🔴 CRITIQUE | 837 lignes / 33,6 KB | `components/sections/rubriques/gamification/gamification-panels.tsx` | Sous-module dense à revalider |
| 🔴 CRITIQUE | 693 lignes / 33,3 KB | `components/sections/rubriques/free-plan-services-methodology-visual.impact.tsx` | Nouveau signal ; qualifier la frontière avec le shell extrait |
| 🔴 CRITIQUE | 933 lignes / 33,2 KB | `components/actions/map/map-layers.tsx` | Nouveau signal ; découper par responsabilités cartographiques |
| 🔴 CRITIQUE | 861 lignes / 32,6 KB | `components/actions/action-declaration/form/action-declaration-export-picker.tsx` | À découper |
| 🔴 CRITIQUE | 927 lignes / 32,1 KB | `components/admin/free-plan-services-visual.tsx` | À découper |
| 🔴 CRITIQUE | 795 lignes / 31,6 KB | `components/sections/rubriques/weather-section.tsx` | À découper |
| 🔴 CRITIQUE | 466 lignes / 30,9 KB | `lib/pdf-export/generate-pdf-html.ts` | Nouveau signal ; isoler le pipeline de génération HTML |
| 🔴 CRITIQUE | 991 lignes / 30,7 KB | `app/api/actions/group-join/route.test.ts` | À découper par helpers métier |
| 🔴 CRITIQUE | 783 lignes / 30,0 KB | `components/learn/learn-practice-theme-tabs.tsx` | À découper |
| 🔴 CRITIQUE | 929 lignes / 29,6 KB | `app/api/chat/route.test.ts` | À découper par scénarios et helpers de test |
| 🔴 CRITIQUE | 991 lignes / 29,4 KB | `app/api/chat/route.ts` | À découper après caractérisation du contrat API |
| 🔴 CRITIQUE | 793 lignes / 29,2 KB | `lib/governance/governance-monthly-report.ts` | À découper après contrat de données |
| 🔴 CRITIQUE | 928 lignes / 29,1 KB | `components/chat/chat-shell.tsx` | Revalider le découpage du shell et des hooks |
| 🔴 CRITIQUE | 700 lignes / 28,4 KB | `components/navigation/app-navigation-ribbon.tsx` | Nouveau signal ; séparer composition et rendu |
| 🔴 CRITIQUE | 654 lignes / 27,9 KB | `components/sections/rubriques/weather-section.preparation.tsx` | Nouveau signal ; vérifier la frontière avec `weather-section.tsx` |
| 🔴 CRITIQUE | 530 lignes / 27,5 KB | `components/learn/quiz/quiz-school-kit-page.tsx` | Nouveau signal ; qualifier données et rendu |
| 🔴 CRITIQUE | 779 lignes / 27,3 KB | `components/learn/quiz/environmental-quiz.tsx` | À découper |
| 🔴 CRITIQUE | 655 lignes / 27,1 KB | `components/admin/quiz-bank-admin-view.tsx` | Nouveau signal ; séparer orchestration et vues admin |
| 🔴 CRITIQUE | 488 lignes / 26,9 KB | `components/sections/rubriques/elus-section.tsx` | Nouveau signal ; vérifier la densité de données statiques |
| 🔴 CRITIQUE | 838 lignes / 26,6 KB | `components/sections/rubriques/rejoindre-un-formulaire-section.controller.ts` | À découper |

Le scan du 31 août identifie 472 fichiers au-dessus du seuil informatif de 7 KB,
dont 133 au-dessus de 15 KB et 287 au-dessus de 10 KB. Le fichier le plus long
fait 991 lignes et le plus volumineux 41,5 KB. Le seuil enforcement ne signale
donc aucun fichier au-dessus de 1000 lignes ou 50 KB, et le baseline
`scripts/checks/heavy-files-baseline.json` reste vide (`allowed: []`). La liste
ci-dessus reste une dette de maintenance mesurée, pas une autorisation de
lancer une refonte globale. Les statuts historiques des lots détaillés plus
bas doivent être revalidés contre ce radar avant exécution.

> Déjà sortis du radar sur ce cycle :
> - `app/api/actions/[actionId]/group-join/route.test.ts`
> - `components/sections/rubriques/free-plan-services-methodology-visual.tsx`
> - `components/sections/rubriques/feedback-section.tsx`
> - `components/sections/rubriques/gamification/index.tsx`
>
> Ces shells sont désormais minces et orchestrent des sous-modules dédiés.

---

## Contraintes globales

- Conserver les APIs publiques (props, hook signatures, exports nommés).
- Un lot structurel par cible principale ; une modularisation directement liée,
  sûre et utile peut rester dans le lot fonctionnel qui traverse la zone.
- Ne pas fixer de taille cible arbitraire pour les modules : évaluer plutôt la
  cohésion, les responsabilités, le couplage, la duplication, la testabilité et
  le contexte nécessaire à une modification locale.
- Ajouter des tests de logique avant de supprimer le code source.
- `scripts/checks/heavy-files-baseline.json` reste un inventaire temporaire de dette
  historique : toute nouvelle entrée doit être explicitement justifiée et
  mesurée ; retirer les entrées devenues obsolètes ou repassées sous les seuils.
- Commande de vérification recommandée : tests ciblés d'abord, puis `node scripts/checks/check-top-heavy-files.mjs --top=25`.
- Ajouter un `npm run typecheck -w apps/web` ciblé quand la modification touche vraiment le typage ou les contrats exportés.
- Si le typecheck ciblé est trop coûteux pour une étape intermédiaire de refactor, le repousser à la fin du lot, sans supprimer les tests ciblés ni le contrôle des fichiers lourds.

## Règles d'exécution Kaizen

Ces règles s'appliquent à chaque shell ou module monolithique traité dans ce plan, en cohérence avec le plan Kaizen du dépôt.

- Extraire d'abord les constantes, les listes de données et les helpers purs.
- Extraire ensuite la logique d'état dans un hook ou un module de modèle, avant de toucher au rendu.
- Après chaque extraction, conserver un seul point d'entrée lisible qui compose les sous-modules.
- Valider chaque étape avec la séquence suivante, selon le coût du lot :
  - tests ciblés quand il y en a ;
  - `npm run typecheck -w apps/web` ou commande équivalente ciblée sur le périmètre modifié, si le changement touche les types ou les exports ;
  - `node scripts/checks/check-top-heavy-files.mjs --top=25`.
- Pour les très gros fichiers ou les refactors multi-extractions, il est acceptable de faire d'abord les tests ciblés + le contrôle des fichiers lourds, puis de réserver le typecheck ciblé à la fin du lot.
- Objectif de sortie :
  - plus aucun fichier applicatif au-dessus de `1000` lignes par défaut ;
  - idéalement, garder les shells UI entre `500` et `700` lignes.
- Limiter l'utilisation des quotas des services web au strict nécessaire pendant l'audit et la modularisation.
- S'appuyer sur la doctrine Kaizen du dépôt :
  - `documentation/development/kaizen/README.md`
  - `documentation/development/kaizen/templates/TEMPLATE-AUDIT.md`

---

## LOT 1 — `chat-shell.tsx` (41 KB) 🔴

**Nature :** Composant monolithique gérant l'UI, les messages, les connexions temps-réel et le state de saisie.

### Découpage proposé

```
components/chat/
├── index.ts                      ← exports centralisés
├── chat-shell.tsx                ← orchestrateur léger (< 150 lignes)
├── chat-header.tsx               ← barre du haut (titre, actions, statut)
├── chat-message-list.tsx         ← scroll + virtualisation des messages
├── chat-message-item.tsx         ← rendu d'un message individuel
├── chat-input-bar.tsx            ← zone de saisie + send button
├── chat-attachments.tsx          ← gestion des pièces jointes
├── use-chat-connection.ts        ← logique WebSocket / realtime Supabase
├── use-chat-messages.ts          ← fetch, pagination, optimistic updates
└── types.ts                      ← interfaces ChatMessage, ChatSession...
```

### Tests cibles
- `use-chat-connection.test.ts` : reconnexion, erreurs réseau, événements reçus.
- `use-chat-messages.test.ts` : pagination, ordre, état vide.

### Done criteria
- `chat-shell.tsx` ≤ 150 lignes, rôle d'orchestrateur uniquement.
- `npm run test` vert sur les 2 hooks.

---

## LOT 2 — `ActionStepHarvest.tsx` (30 KB) 🔴

**Nature :** Étape de formulaire multi-état gérant photos, localisation, categorisation et validation.

### Découpage proposé

```
components/actions/action-declaration/
├── ActionStepHarvest.tsx         ← orchestrateur (< 150 lignes)
├── harvest-photo-section.tsx     ← upload + aperçu photos
├── harvest-location-section.tsx  ← GPS + carte
├── harvest-category-section.tsx  ← sélection catégories
├── harvest-validation-bar.tsx    ← barre de progression + CTA submit
├── use-harvest-form.ts           ← state du formulaire + validation Zod
└── harvest.types.ts              ← interfaces HarvestData, PhotoItem...
```

### Tests cibles
- `use-harvest-form.test.ts` : validation, état initial, reset.

### Done criteria
- Composant principal ≤ 200 lignes.

---

## LOT 3 — `creator-inbox-panel.tsx` (28 KB) 🔴

**Nature :** Panneau admin gérant la modération, les files d'attente et les actions de traitement.

### Découpage proposé

```
components/admin/creator-inbox/
├── index.ts
├── creator-inbox-panel.tsx       ← shell (< 150 lignes)
├── inbox-filter-bar.tsx          ← filtres statut/type
├── inbox-item-card.tsx           ← carte d'un item à modérer
├── inbox-action-drawer.tsx       ← panneau d'actions (accept/reject/escalate)
├── use-inbox-queue.ts            ← logique de fil d'attente + polling
└── inbox.types.ts
```

### Tests cibles
- `use-inbox-queue.test.ts` : tri, filtre, actions de modération.

### Done criteria
- `creator-inbox-panel.tsx` ≤ 150 lignes.

---

## LOT 4 — `annuaire-directory-seed.ts` (26 KB) 🟠

**Nature :** Fichier de données statiques — pure configuration, pas de logique.

### Découpage proposé

```
components/sections/rubriques/annuaire/
├── seed-organisations.ts         ← associations, ONG
├── seed-collectivites.ts         ← mairies, intercommunalités
├── seed-entreprises.ts           ← partenaires privés
├── seed-index.ts                 ← re-export combiné
└── annuaire.types.ts             ← interface DirectoryEntry
```

### Done criteria
- Aucun fichier > 8 KB.
- Import dans l'annuaire inchangé (via `seed-index.ts`).

---

## LOT 5 — `app/(app)/actions/map/page.tsx` (24 KB) 🟠

**Nature :** Page Next.js gérant la carte interactive avec filtres, popups et flux d'actions.

### Découpage proposé

```
app/(app)/actions/map/
├── page.tsx                      ← Server Component / layout (< 80 lignes)
├── map-client.tsx                ← Client Component principal (< 200 lignes)

components/actions/map/
├── map-filter-bar.tsx            ← filtres géographiques et catégories
├── map-action-popup.tsx          ← popup d'une action (déjà existe : action-popup-content.tsx — à nettoyer)
├── map-sidebar.tsx               ← liste latérale des actions proches
└── use-map-actions.ts            ← logique fetch, clustering, sélection
```

### Done criteria
- `page.tsx` ≤ 80 lignes.
- `map-client.tsx` ≤ 200 lignes.

---

## LOT 6 — `feedback-section.tsx` et `gamification/index.tsx` ✅

Ces deux shells ont été sortis du monolithe principal et servent maintenant de point d'entrée mince.

### État réel

- `feedback-section.tsx` : shell de 37 lignes, contexte URL/prefill déplacé dans le module partagé.
- `gamification/index.tsx` : shell de 105 lignes, composition des panneaux extraite dans `gamification-panels.tsx` et `gamification-shell.tsx`.
- Le sous-module `gamification-panels.tsx` reste dense et peut devenir la prochaine cible si l'objectif est de descendre sous 700 lignes.

### Suite possible

- Découper les sous-panneaux réutilisés dans `gamification-panels.tsx`.
- Réduire les blocs de rendu les plus volumineux en composants plus petits seulement si le gain de locality est réel.

---

## LOT 7 — `analytics.ts` + `use-community-section.ts` (19 + 13 KB) 🟡

Ces fichiers ont déjà été partiellement découpés lors du plan d'avril. Vérifier l'état réel et compléter si nécessaire.

- `analytics.ts` → extraire formateurs (`formatters.ts`) et builders (`builders.ts`).
- `use-community-section.ts` → vérifier si la logique KPI/filtres est sortie dans des hooks séparés.

---

## Séquence d'exécution recommandée

```
LOT 4 (data pure, risque zéro)
→ LOT 1 (chat, fort impact utilisateur)
→ LOT 2 (formulaire critique flux principal)
→ LOT 3 (admin, modération)
→ LOT 5 (carte, complexité Mapbox)
→ LOT 6 (clôture des shells déjà extraits)
→ LOT 7 (complétion du travail d'avril)
→ résiduel prioritaire: `app/api/actions/group-join/route.test.ts` puis les autres monolithes du radar
```

---

## Commandes de référence

```bash
# Scanner les fichiers lourds
Get-ChildItem -Path apps/web/src -Recurse -Filter "*.tsx" | Sort-Object Length -Descending | Select-Object -First 20

# Validation post-découpage
npm -C apps/web run lint
npm -C apps/web run test -- <tests-cibles>
npm run quality:top-heavy
npm run typecheck
```
