# Plan de Migration Typographique

## Date: 2026-04-26
## Statut: 🚧 En cours

---

## Vue d'ensemble

Migration progressive des composants existants vers les classes `cmm-text-*` et les couleurs `text-*` sémantiques.

---

## Principes de migration

### ✅ À faire
1. **Remplacer tailles custom** (`text-[10px]`, `text-[11px]`, `text-[13px]`)
   - → `cmm-text-caption` (12px)
   - → `cmm-text-small` (14px)
   - → `cmm-text-body` (16px)

2. **Remplacer couleurs arbitraires**
   - `text-slate-900` → `text-primary`
   - `text-slate-600` → `text-secondary`
   - `text-slate-500` → `text-muted`
   - `text-slate-400` → `text-muted` (plus clair)

3. **Standardiser les titres**
   - Hero: `cmm-text-h1`
   - Section: `cmm-text-h2`
   - Card title: `cmm-text-h3`
   - Subtitle: `cmm-text-h4`

### ❌ À éviter
- Ne pas changer les `text-xs`, `text-sm` de Tailwind (conservés pour compatibilité)
- Ne pas migrer les pages entières en une fois (risque de régression)
- Ne pas toucher au comportement métier (hover, focus, etc.)

---

## Phase 1: Composants Canoniques (P0)

### CmmCard
**Fichier**: `components/ui/cmm-card.tsx`

| Ligne | Actuel | Migration |
|-------|--------|-----------|
| 105 | `text-[10px] font-semibold` | `cmm-text-caption font-semibold` |
| 105 | `text-slate-500` | `text-muted` |

### CmmButton
**Fichier**: `components/ui/cmm-button.tsx`

Déjà cohérent - utilise `text-xs`, `text-sm` de Tailwind qui correspondent aux tokens.

### layout.tsx (Header global)
**Fichier**: `app/layout.tsx`

| Ligne | Actuel | Migration |
|-------|--------|-----------|
| 90 | `text-[11px]` | `cmm-text-caption` |
| 90 | `font-bold` | `font-semibold` (éviter bold sur petit texte) |
| 97 | `text-xs` | `cmm-text-small` |
| 106 | `text-xs` | `cmm-text-small` |
| 112 | `text-xs` | `cmm-text-small` |
| 90 | `text-slate-900` | `text-primary` |
| 97 | `text-slate-600` | `text-secondary` |
| 106 | `text-slate-600` | `text-secondary` |

---

## Phase 2: Navigation (P1)

### AppNavigation
**Fichier**: `components/navigation/app-navigation.tsx`

Rechercher et remplacer:
- `text-sm` → `cmm-text-small` (pour labels importants)
- `text-xs` → `cmm-text-caption` (pour meta)
- `text-slate-*` → `text-primary/secondary/muted`

### AppNavigationRibbon
**Fichier**: `components/navigation/app-navigation-ribbon.tsx`

Migrer les tons de couleur vers les tokens sémantiques.

---

## Phase 3: Templates de Page (P2)

### PageReadingTemplate
**Fichier**: `components/ui/page-reading-template.tsx`

Migrer:
- Titres de page
- Corps de texte
- Meta informations

### DecisionPageHeader
**Fichier**: `components/ui/decision-page-header.tsx`

Migrer:
- Titre principal
- Description
- Badges/pills

---

## Phase 4: Formulaires (P3)

### ActionDeclarationForm
**Fichier**: `components/actions/action-declaration-form.tsx`

Priorité élevée (formulaire principal):
- Labels
- Aides
- Messages d'erreur/succès

---

## Suivi de migration

| Composant | Statut | Fichier |
|-----------|--------|---------|
| CmmCard | ✅ Migré | `components/ui/cmm-card.tsx` |
| CmmButton | ✅ OK | Déjà standard |
| layout.tsx Header | ✅ Migré | `app/layout.tsx` |
| AppNavigation | ⏳ À faire | `components/navigation/app-navigation.tsx` |
| PageReadingTemplate | ⏳ À faire | `components/ui/page-reading-template.tsx` |
| ActionDeclarationForm | ⏳ À faire | `components/actions/action-declaration-form.tsx` |

### Changements effectués

#### CmmCard
- Ligne 105: `text-[10px]` → `cmm-text-caption`
- Ligne 105: `text-slate-500` → `text-muted`

#### layout.tsx Header
- Ligne 90: `text-[11px] font-bold` → `cmm-text-caption font-semibold`
- Ligne 90: `text-slate-900` → `text-primary`
- Ligne 90: `sm:text-sm` → `sm:cmm-text-small`
- Ligne 97: `text-xs` → `cmm-text-small`
- Ligne 97: `text-slate-600` → `text-secondary`
- Ligne 106: `text-xs font-bold` → `cmm-text-small font-semibold`
- Ligne 106: `text-slate-600` → `text-secondary`
- Ligne 112: `text-xs font-bold` → `cmm-text-small font-semibold`

---

## État actuel de la migration (Audit 2026-04-26)

### Progression globale
- **Prioritaires**: ✅ 3/3 complétés (CmmCard, CmmButton, layout Header)
- **Restants**: ~57 fichiers avec `text-[10px]` ou `font-extrabold`
- **Classes canoniques utilisées**: Faible adoption en dehors des composants prioritaires

### Composants prioritaires restants (P1)

| Composant | Problèmes identifiés | Fichier |
|-----------|---------------------|---------|
| app-navigation-ribbon.tsx | 9 occurrences text-[10px] | `components/navigation/app-navigation-ribbon.tsx` |
| page.tsx (homepage) | 7 occurrences text-[10px] | `app/page.tsx` |
| explorer/page.tsx | 11 occurrences text-[10px] | `app/explorer/page.tsx` |
| actions-map-feed.tsx | 32 occurrences | `components/actions/actions-map-feed.tsx` |
| actions-map-canvas.tsx | 14 occurrences | `components/actions/actions-map-canvas.tsx` |
| actions-map-table.tsx | 8 occurrences | `components/actions/actions-map-table.tsx` |

### Anti-patterns encore présents

```bash
# Tailles custom problématiques (241 matches dans 57 fichiers)
grep -rn "text-\[10px\]\|text-\[11px\]" apps/web/src/ --include="*.tsx"

# Poids excessif
grep -rn "font-extrabold" apps/web/src/ --include="*.tsx"

# Classes typographiques canoniques (très peu utilisées)
grep -rn "cmm-text-h1\|cmm-text-h2\|cmm-text-h3" apps/web/src/ --include="*.tsx"  # 0 résultats
```

### Prochaines étapes recommandées

1. **P1**: Migrer les composants navigation (app-navigation-ribbon.tsx)
2. **P1**: Migrer la homepage (page.tsx) - référence UI importante
3. **P2**: Migrer les composants actions (feed, canvas, table)
4. **P2**: Audit et migration des pages rubriques

---

## Commandes de vérification

```bash
# Rechercher les tailles custom problématiques
grep -rn "text-\[10px\]\|text-\[11px\]\|text-\[13px\]" apps/web/src/components/ui/

# Rechercher les couleurs slate à migrer
grep -rn "text-slate-900\|text-slate-600\|text-slate-500" apps/web/src/components/ui/ --include="*.tsx"

# Compter les occurrences par fichier
grep -rn "text-slate-" apps/web/src/ --include="*.tsx" | cut -d: -f1 | sort | uniq -c | sort -nr

# Vérifier l'adoption des classes canoniques
grep -rn "cmm-text-caption\|cmm-text-small\|cmm-text-body" apps/web/src/ --include="*.tsx" | wc -l
```

---

## Checklist validation

- [ ] Pas de `text-[10px]` ou `text-[11px]` restants
- [ ] Pas de `font-extrabold` (800) restants
- [ ] Couleurs texte utilisent les tokens sémantiques
- [ ] Contraste WCAG AA vérifié sur les nouvelles combinaisons
- [ ] Aucune régression visuelle sur desktop
- [ ] Aucune régression visuelle sur mobile
