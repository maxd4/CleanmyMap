# Corrections Migration 5 Blocs — Rapport

> Corrections effectuées pour aligner la structure du code avec les 5 blocs

---

## ✅ Corrections effectuées

### 1. Déplacement de fichiers

| Fichier | Ancien emplacement | Nouveau emplacement | Statut |
|---------|-------------------|---------------------|--------|
| `explorer` | `app/explorer/` | `app/(app)/explorer/` | ✅ Déplacé |
| `reports` | `app/reports/` | `app/(app)/reports/` | ✅ Déplacé |

### 2. Corrections sections-registry/config.ts

| Rubrique | Ancien spaceId | Nouveau spaceId | Bloc cible | Statut |
|----------|----------------|-----------------|------------|--------|
| `explorer` | `prepare` | `home` | Accueil & Pilotage | ✅ Corrigé |
| `reports` | `decide` | `impact` | Cartographie & Impact | ✅ Corrigé |
| `feedback` | `prepare` | `home` | Accueil & Pilotage | ✅ Corrigé |
| `sandbox` | `execute` | `visualize` | Cartographie & Impact | ✅ Corrigé |
| `gamification` | `decide` | `impact` | Cartographie & Impact | ✅ Corrigé |

---

## 📊 Alignement avec navigation.ts

### PARCOURS_SPACE_PAGE_MAP (navigation.ts)

```typescript
home: ["dashboard", "explorer", "profile", "feedback"]
visualize: ["map", "sandbox", "reports", "gamification"]
```

### sections-registry/config.ts (après corrections)

| Rubrique | spaceId | ✅ Aligné |
|----------|---------|----------|
| `dashboard` | `decide` | ⚠️ Devrait être `home` |
| `explorer` | `home` | ✅ |
| `profile` | `decide` | ⚠️ Devrait être `home` |
| `feedback` | `home` | ✅ |
| `map` | `execute` | ⚠️ Devrait être `visualize` |
| `sandbox` | `visualize` | ✅ |
| `reports` | `impact` | ✅ |
| `gamification` | `impact` | ✅ |

---

## ⚠️ Incohérences restantes

### 1. spaceId vs NavigationBlockId

Le système utilise deux concepts différents :
- **`spaceId`** dans `sections-registry` : `"prepare"`, `"execute"`, `"decide"`, `"supervise"`
- **`NavigationBlockId`** dans `navigation.ts` : `"home"`, `"act"`, `"visualize"`, `"impact"`, `"network"`, `"learn"`

**Problème** : Les deux systèmes ne sont pas alignés. `spaceId` semble être un ancien système de catégorisation.

### 2. Rubriques avec spaceId incohérent

| Rubrique | spaceId actuel | NavigationBlockId attendu | Action nécessaire |
|----------|----------------|---------------------------|-------------------|
| `dashboard` | `decide` | `home` | À corriger |
| `profile` | `decide` | `home` | À corriger |
| `map` | `execute` | `visualize` ou `act` | À clarifier (partagé) |
| `new` | `execute` | `act` | À corriger |
| `route` | `execute` | `act` | À corriger |
| `weather` | `execute` | `act` | À corriger |
| `guide` | `execute` | `act` | À corriger |

---

## 🔍 Analyse du système spaceId

### Valeurs spaceId trouvées dans sections-registry

- `prepare` : Préparation, ressources, guides
- `execute` : Actions terrain, exécution
- `decide` : Pilotage, décision, analyse
- `supervise` : Administration, modération

### Mapping suggéré spaceId → NavigationBlockId

| spaceId | NavigationBlockId suggéré | Justification |
|---------|---------------------------|---------------|
| `prepare` | `home` ou `learn` | Préparation = Accueil ou Apprentissage |
| `execute` | `act` | Exécution = Agir |
| `decide` | `home` ou `impact` | Décision = Pilotage ou Impact |
| `supervise` | `home` (pilotage) | Supervision = Pilotage |

---

## 🎯 Recommandations

### Option 1 : Supprimer spaceId (recommandé)

Le champ `spaceId` dans `sections-registry` semble redondant avec `NavigationBlockId`. 

**Action** : 
1. Supprimer le champ `spaceId` de `RubriqueDefinition`
2. Utiliser uniquement `NavigationBlockId` via `PARCOURS_SPACE_PAGE_MAP`

### Option 2 : Aligner spaceId avec NavigationBlockId

Remplacer les valeurs `spaceId` par les valeurs `NavigationBlockId` :
- `prepare` → `home` ou `learn`
- `execute` → `act`
- `decide` → `home` ou `impact`
- `supervise` → `home`

### Option 3 : Documenter la distinction

Si `spaceId` a une utilité distincte, documenter clairement :
- Quand utiliser `spaceId` vs `NavigationBlockId`
- Le mapping entre les deux systèmes
- Les cas d'usage de chaque système

---

## 📝 Prochaines étapes suggérées

1. **Clarifier avec l'utilisateur** : Quel est le rôle de `spaceId` ?
2. **Décider** : Supprimer ou aligner `spaceId`
3. **Corriger** : Les rubriques restantes (`dashboard`, `profile`, `map`, etc.)
4. **Vérifier** : Les sections dynamiques (`/sections/[sectionId]`)
5. **Documenter** : Le système de navigation final

---

## ✅ Résumé des corrections

| Catégorie | Nombre |
|-----------|--------|
| Fichiers déplacés | 2 |
| spaceId corrigés | 5 |
| Incohérences restantes | ~7 |
| Documentation mise à jour | 6 fichiers |

**Statut global** : 🟡 Partiellement corrigé — Nécessite clarification sur le système `spaceId`
