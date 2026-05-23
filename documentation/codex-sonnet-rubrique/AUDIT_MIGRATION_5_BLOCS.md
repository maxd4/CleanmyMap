# Audit de Migration — Structure 5 Blocs

> Identification des pages à migrer vers la nouvelle structure

---

## Analyse de la structure actuelle

### ✅ Pages correctement placées

#### Bloc 01 — Accueil & Pilotage

**Pages type Accueil (amber/orange)** :
- ✅ `/dashboard` → `(app)/dashboard/page.tsx`
- ✅ `/profil` → `(app)/profil/page.tsx`
- ✅ `/explorer` → `explorer/page.tsx` ⚠️ Hors (app)

**Pages type Pilotage (amber/brun)** :
- ✅ `/pilotage` → `(app)/pilotage/page.tsx`
- ✅ `/admin` → `(app)/admin/page.tsx`
- ✅ `/admin/godmode` → `(app)/admin/godmode/`
- ✅ `/sponsor-portal` → `(app)/sponsor-portal/page.tsx`

#### Bloc 02 — Agir

- ✅ `/actions/new` → `(app)/actions/new/`
- ✅ `/actions/map` → `(app)/actions/map/`
- ✅ `/sections/route` → `(app)/sections/route/`
- ✅ `/sections/weather` → `(app)/sections/[sectionId]/`
- ✅ `/sections/guide` → `(app)/sections/[sectionId]/`
- ✅ `/signalement` → `(app)/signalement/page.tsx`

#### Bloc 03 — Cartographie & Impact

**Pages type Cartographie (sky)** :
- ✅ `/actions/map` → `(app)/actions/map/` (partagé avec Agir)
- ✅ `/sandbox` → `(app)/sandbox/page.tsx` alias canonique vers `/sections/sandbox`

**Pages type Impact (red)** :
- ✅ `/reports` → `(app)/reports/page.tsx`
- ✅ `/gamification` → `(app)/gamification/page.tsx` alias canonique vers `/sections/gamification`

#### Bloc 04 — Réseau & Discussions

- ✅ `/partners/network` → `(app)/partners/network/`
- ✅ `/community` → `(app)/community/page.tsx` alias canonique vers `/sections/community`
- ✅ `/messagerie` → `(app)/messagerie/page.tsx` alias canonique vers `/sections/messagerie`
- ✅ `/open-data` → `(app)/open-data/page.tsx` alias canonique vers `/sections/open-data`

#### Bloc 05 — Apprendre

- ✅ `/learn/hub` → `learn/hub/page.tsx`
- ✅ `/learn/comprendre` → `learn/comprendre/page.tsx`
- ✅ `/learn/sentrainer` → `learn/sentrainer/page.tsx`
- ✅ `/learn/bonnes-pratiques` → `learn/bonnes-pratiques/page.tsx`
- ✅ `/learn/ressources` → `learn/ressources/page.tsx`

---

## ❌ Problèmes identifiés

### 1. Pages hors (app) qui devraient être dedans

| Route | Emplacement actuel | Emplacement attendu | Bloc |
|-------|-------------------|---------------------|------|
| `/explorer` | `explorer/page.tsx` | `(app)/explorer/page.tsx` | Accueil & Pilotage |
| `/reports` | `(app)/reports/page.tsx` | `(app)/reports/page.tsx` | Cartographie & Impact |

### 2. Pages enregistrées mais non trouvées

| Route registry | Fichier attendu | Statut | Bloc |
|----------------|-----------------|--------|------|
| `/sections/sandbox` | `(app)/sections/[sectionId]/` avec id=sandbox | ⚠️ À vérifier | Cartographie & Impact |
| `/sections/gamification` | `(app)/sections/[sectionId]/` avec id=gamification | ⚠️ À vérifier | Cartographie & Impact |
| `/sections/community` | `(app)/sections/[sectionId]/` avec id=community | ⚠️ À vérifier | Réseau & Discussions |
| `/sections/messagerie` | `(app)/sections/[sectionId]/` avec id=messagerie | ⚠️ À vérifier | Réseau & Discussions |
| `/sections/open-data` | `(app)/sections/[sectionId]/` avec id=open-data | ⚠️ À vérifier | Réseau & Discussions |
| `/sections/elus` | `(app)/sections/[sectionId]/` avec id=elus | ⚠️ À vérifier | Accueil & Pilotage |

### 3. Pages obsolètes à supprimer ou migrer

| Route | Emplacement | Statut | Action |
|-------|-------------|--------|--------|
| `/accueil` | `accueil/page.tsx` | Doublon avec `/dashboard` ? | À clarifier |
| `/declaration` | `declaration/page.tsx` | Doublon avec `/actions/new` ? | À clarifier |
| `/declaration-simple` | `declaration-simple/page.tsx` | Doublon avec `/actions/new` ? | À clarifier |
| `/observatoire` | `(app)/observatoire/page.tsx` | Pas dans registry | À clarifier |

### 4. Incohérences registry vs navigation.ts

**Dans `navigation.ts` (PARCOURS_SPACE_PAGE_MAP)** :
- `home` : `["dashboard", "explorer", "profile", "feedback"]`
- `visualize` : `["map", "sandbox", "reports", "gamification"]`
- `network` : `["network", "community", "messagerie", "open-data"]`

**Dans `sections-registry/config.ts` (RUBRIQUE_REGISTRY)** :
- `explorer` : spaceId = `"prepare"` ❌ Devrait être `"home"`
- `reports` : spaceId = `"decide"` ❌ Devrait être `"visualize"` ou `"impact"`
- `feedback` : spaceId = `"prepare"` ❌ Devrait être `"home"`
- `sandbox` : spaceId = `"execute"` ❌ Devrait être `"visualize"`
- `gamification` : spaceId = `"decide"` ❌ Devrait être `"impact"`

---

## 🔧 Actions de correction

### Priorité 1 — Déplacer les pages hors (app)

```bash
# Déplacer explorer
mv apps/web/src/app/explorer apps/web/src/app/(app)/explorer

# Déplacer reports
mv apps/web/src/app/reports apps/web/src/app/(app)/reports
```

### Priorité 2 — Corriger sections-registry/config.ts

Mettre à jour les `spaceId` pour aligner avec `navigation.ts` :

```typescript
// explorer : prepare → home
{ id: "explorer", spaceId: "home", ... }

// reports : decide → impact
{ id: "reports", spaceId: "impact", ... }

// feedback : prepare → home
{ id: "feedback", spaceId: "home", ... }

// sandbox : execute → visualize
{ id: "sandbox", spaceId: "visualize", ... }

// gamification : decide → impact
{ id: "gamification", spaceId: "impact", ... }
```

### Priorité 3 — Vérifier les sections dynamiques

Vérifier que les pages suivantes existent dans `(app)/sections/[sectionId]/` :
- `sandbox`
- `gamification`
- `community`
- `messagerie`
- `open-data`
- `elus`

### Priorité 4 — Clarifier les doublons

**À décider avec l'utilisateur** :
- `/accueil` vs `/dashboard` : Garder un seul ou clarifier les rôles
- `/declaration` et `/declaration-simple` vs `/actions/new` : Fusionner ou documenter les différences
- `/observatoire` : Ajouter au registry ou supprimer

### Priorité 5 — Mettre à jour la documentation

Fichiers à mettre à jour :
- `documentation/liberte-UX-UI/*/UX-DIRECTION*.md` : Corriger les routes
- `documentation/codex-sonnet-rubrique/MAPPING_RUBRIQUE_TEINTE.md` : Vérifier les routes
- `documentation/codex-sonnet-rubrique/TEINTES_BLOCS_RUBRIQUES.md` : Vérifier les routes

---
