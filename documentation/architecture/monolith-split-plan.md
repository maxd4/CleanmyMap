# Plan de découpage monolithes

**Mis à jour :** 2026-05-06 | **Portée :** `apps/web/src` | **Seuil d'alerte :** > 10 KB

## Objectif

Réduire les fichiers dépassant 300 lignes en modules testables, sans régression fonctionnelle.  
Règle : **une PR par monolithe**, **API publique inchangée**, **tests avant suppression du code legacy**.

---

## 📊 Radar actuel (scan 06/05/2026)

| Priorité | Taille | Fichier | Statut |
|----------|--------|---------|--------|
| 🔴 CRITIQUE | 41 801 o | `components/chat/chat-shell.tsx` | ⏳ À faire |
| 🔴 CRITIQUE | 30 299 o | `components/actions/action-declaration/ActionStepHarvest.tsx` | ⏳ À faire |
| 🔴 CRITIQUE | 27 902 o | `components/admin/creator-inbox-panel.tsx` | ⏳ À faire |
| 🔴 CRITIQUE | 25 798 o | `components/sections/rubriques/annuaire-directory-seed.ts` | ⏳ À faire |
| 🔴 CRITIQUE | 24 277 o | `app/(app)/actions/map/page.tsx` | ⏳ À faire |
| 🟠 HAUTE | 22 790 o | `components/actions/actions-map-feed.tsx` | ⏳ À faire |
| 🟠 HAUTE | 21 926 o | `components/seo/structured-data.tsx` | ⏳ À faire |
| 🟠 HAUTE | 21 552 o | `components/actions/action-declaration-form.tsx` | ⏳ À faire |
| 🟠 HAUTE | 20 365 o | `components/sections/rubriques/feedback-section.tsx` | ⏳ À faire |
| 🟠 HAUTE | 19 045 o | `components/sections/rubriques/gamification-section.tsx` | ⏳ À faire |
| 🟡 MOYENNE | 18 709 o | `components/reports/web-document/analytics.ts` | ⏳ À faire |
| 🟡 MOYENNE | 17 052 o | `lib/sections-registry/config.ts` | ⏳ À faire |
| 🟡 MOYENNE | 13 032 o | `components/sections/rubriques/community/use-community-section.ts` | ⏳ À faire |

> Les 3 fichiers du plan d'avril 2026 ont été partiellement traités : `use-admin-workflow.ts` et `community-section.tsx` ont été découpés (sous-dossiers `admin-workflow/` et `community/`). `reports-web-document.tsx` a été scindé en `web-document/sections.tsx` (14 KB, encore lourd).

---

## Contraintes globales

- Conserver les APIs publiques (props, hook signatures, exports nommés).
- Une PR par monolithe.
- Taille cible : **< 5 KB / < 200 lignes** pour une page, **< 10 KB / < 300 lignes** pour un composant complexe.
- Ajouter des tests de logique avant de supprimer le code source.
- Commande de vérification : `npm run quality:top-heavy` + `npm -C apps/web run lint`.

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

## LOT 6 — `feedback-section.tsx` + `gamification-section.tsx` (20 + 19 KB) 🟠

**Pattern identique :** sections rubriques de même structure (header, contenu, CTA). Traiter en parallèle.

### Découpage type (à reproduire pour chacune)

```
components/sections/rubriques/[nom]/
├── index.ts
├── [nom]-section.tsx             ← orchestrateur (< 150 lignes)
├── [nom]-header.tsx
├── [nom]-content.tsx
├── [nom]-cta.tsx
└── use-[nom]-data.ts
```

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
→ LOT 6 (2 sections en parallèle)
→ LOT 7 (complétion du travail d'avril)
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
