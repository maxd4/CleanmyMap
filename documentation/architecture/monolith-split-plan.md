# Plan de découpage monolithes

**Mis à jour :** 2026-07-06 | **Portée :** `apps/web/src` | **Seuil d'alerte :** > 1000 lignes ou > 50 KB

## Objectif

Réduire les fichiers applicatifs dépassant 1000 lignes en modules testables, sans régression fonctionnelle.
Règle : **une PR par monolithe**, **API publique inchangée**, **tests avant suppression du code legacy**.

---

## 📊 Radar actuel (scan 2026-07-06)

| Priorité | Taille | Fichier | Statut |
|----------|--------|---------|--------|
| 🔴 CRITIQUE | 1 410 lignes | `lib/environmental-impact-estimator/project-signals.impl.ts` | ✅ Découpé en shell + modules |
| 🔴 CRITIQUE | 1 125 lignes | `app/api/actions/[actionId]/group-join/route.test.ts` | ✅ Découpé en helpers + fichiers par verbes HTTP |
| 🟠 HAUTE | 996 lignes | `components/sections/rubriques/free-plan-services-methodology-visual.tsx` | ⏳ À faire |
| 🟠 HAUTE | 927 lignes | `components/admin/free-plan-services-visual.tsx` | ⏳ À faire |
| 🟠 HAUTE | 923 lignes | `components/sections/rubriques/partners-network-section.tsx` | ⏳ À faire |
| 🟠 HAUTE | 922 lignes | `app/api/actions/group-join/route.test.ts` | ⏳ À faire |
| 🟡 MOYENNE | 883 lignes | `components/actions/action-before-declaration-form.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 875 lignes | `components/learn/quiz-session-panel.tsx` | ✅ Découpé en shell + sous-modules |
| 🟡 MOYENNE | 861 lignes | `components/actions/action-declaration-form/action-declaration-export-picker.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 838 lignes | `components/admin/free-plan-services-panel.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 838 lignes | `components/sections/rubriques/rejoindre-un-formulaire-section.controller.ts` | ⏳ À faire |
| 🟡 MOYENNE | 827 lignes | `components/sections/rubriques/gamification/gamification-panels.tsx` | ✅ Shell extrait, sous-module encore dense |
| 🟡 MOYENNE | 799 lignes | `components/learn/environmental-quiz.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 796 lignes | `components/sections/rubriques/weather-section.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 775 lignes | `components/reports/reports-web-document.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 770 lignes | `components/sections/rubriques/rejoindre-un-formulaire-section.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 756 lignes | `lib/actions/group-participation.ts` | ⏳ À faire |
| 🟡 MOYENNE | 749 lignes | `lib/learning/quiz-personal-progress.ts` | ⏳ À faire |
| 🟡 MOYENNE | 738 lignes | `components/sections/rubriques/recycling-question-assistant/assistant-utils.ts` | ⏳ À faire |
| 🟡 MOYENNE | 718 lignes | `lib/supabase/storage-business-contribution.ts` | ⏳ À faire |

> Déjà sortis du radar sur ce cycle :
> - `app/api/actions/[actionId]/group-join/route.test.ts`
> - `components/learn/quiz-session-panel.tsx`
> - `components/sections/rubriques/feedback-section.tsx`
> - `components/sections/rubriques/gamification/index.tsx`
>
> Ces shells sont désormais minces et orchestrent des sous-modules dédiés.

---

## Contraintes globales

- Conserver les APIs publiques (props, hook signatures, exports nommés).
- Une PR par monolithe.
- Taille cible : **< 1000 lignes** par défaut pour tout fichier applicatif.
- Viser **500 à 700 lignes** pour les shells UI quand c'est encore lisible.
- Ajouter des tests de logique avant de supprimer le code source.
- Toute exception au seuil courant doit rester dans `scripts/heavy-files-baseline.json` avec justification.
- Commande de vérification recommandée : tests ciblés d'abord, puis `node scripts/check-top-heavy-files.mjs --top=25`.
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
  - `node scripts/check-top-heavy-files.mjs --top=25`.
- Pour les très gros fichiers ou les refactors multi-extractions, il est acceptable de faire d'abord les tests ciblés + le contrôle des fichiers lourds, puis de réserver le typecheck ciblé à la fin du lot.
- Objectif de sortie :
  - plus aucun fichier applicatif au-dessus de `1000` lignes par défaut ;
  - idéalement, garder les shells UI entre `500` et `700` lignes.
- Limiter l'utilisation des quotas des services web au strict nécessaire pendant l'audit et la modularisation.
- S'appuyer sur le plan Kaizen existant du dépôt :
  - `documentation/kaizen-implementation-plan/README.md`
  - `documentation/kaizen-implementation-plan/TEMPLATE-AUDIT.md`

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
