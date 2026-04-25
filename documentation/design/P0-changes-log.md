# Log des Changements P0 - Audit UI/UX

## Date: 2026-04-25
## Statut: Terminé

---

## Résumé des actions P0

### 1. Overrides globaux !important supprimés (P0.1)

**Problème**: Les overrides globaux avec `!important` dans `globals.css` cassaient la cohérence visuelle et empêchaient les styles locaux de fonctionner.

**Fichier modifié**: `apps/web/src/app/globals.css`

#### Changements:

| Zone | Avant | Après |
|------|-------|-------|
| Dark mode | `html.dark .bg-white { bg: #111827 !important }` etc. | Supprimé → utiliser `.cmm-surface`, `.cmm-legacy-*` |
| Display mode sobre | `[data-display-mode="sobre"] .rounded-2xl { radius: 0.75rem !important }` etc. | Classes canoniques: `.cmm-sober`, `.cmm-sober-animate`, `.cmm-sober-text` |
| Profil emerald | `[data-user-profile] .bg-emerald-500 { bg: rgb(var(--profile-primary)) !important }` | Classes canoniques: `.cmm-profile-bg`, `.cmm-profile-text`, `.cmm-profile-border` |

#### Nouvelles classes canoniques disponibles:

```css
/* Surfaces legacy (compatibilité) */
.cmm-legacy-surface     /* Dark: #111827 */
.cmm-legacy-muted       /* Dark: #0b1220 */
.cmm-legacy-elevated    /* Dark: #1e293b */

/* Mode sobre */
.cmm-sober              /* Radius réduit, no shadow, bg canvas */
.cmm-sober-animate      /* Animation désactivée */
.cmm-sober-text         /* Texte sans gradient */

/* Profil */
.cmm-profile-bg         /* Background couleur profil */
.cmm-profile-text       /* Texte couleur profil */
.cmm-profile-border     /* Bordure couleur profil */
.cmm-profile-accent     /* Transition douce */
```

#### Classes canoniques existantes (à privilégier):

```css
.cmm-surface            /* Surface élevée avec blur */
.cmm-surface-muted      /* Surface discrète */
.cmm-panel              /* Border-radius 1.5rem */
.cmm-card               /* Border-radius 1.25rem */
.cmm-focus-ring         /* Ring de focus accessible */
.premium-card           /* Carte glassmorphism */
```

### 2. VibrantBackground - Vérifié (P0.2)

**Fichier**: `apps/web/src/components/ui/vibrant-background.tsx`

**Statut**: ✅ Déjà conforme

Le grain est internalisé via data URI SVG inline:
```tsx
backgroundImage: "url(\"data:image/svg+xml,%3Csvg...\")"
```

Aucune dépendance externe - pas de modification nécessaire.

### 3. NavigationGrid - Vérifié (P0.3)

**Fichier**: `apps/web/src/components/ui/navigation-grid.tsx`

**Statut**: ✅ Déjà conforme

Les classes `grid-cols-*` sont générées via mapping statique:
```typescript
const map = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  // ...
} as const;
```

Aucune classe dynamique type `grid-cols-${value}` - pas de modification nécessaire.

---

## Migration guide

### Remplacer les classes legacy:

```tsx
// AVANT (ne fonctionnera plus correctement en dark mode)
<div className="bg-white rounded-2xl shadow-lg">

// APRÈS
<div className="cmm-surface cmm-panel">
// ou
<div className="premium-card">
```

### Migrer les éléments profile:

```tsx
// AVANT (override global supprimé)
<button className="bg-emerald-500 text-white">

// APRÈS (classe canonique)
<button className="cmm-profile-bg text-white">
```

### Mode sobre:

```tsx
// AVANT (ciblage destructif supprimé)
<div className="rounded-2xl shadow-lg animate-pulse">

// APRÈS (classes canoniques)
<div className="cmm-sober cmm-sober-animate">
```

---

## Tokens sémantiques disponibles

```css
/* Surfaces */
--bg-canvas
--bg-elevated
--bg-muted

/* Texte */
--text-primary
--text-secondary
--text-muted
--text-inverse

/* Bordures */
--border-default
--border-strong

/* Actions */
--action-primary-bg
--action-primary-text
--action-primary-hover
--action-secondary-bg
--action-secondary-text
--action-secondary-hover

/* Focus */
--focus-ring
```

---

## Notes

- Les `!important` restants dans `mode simplifié` et `@media print` sont intentionnels
- Ces modes nécessitent des overrides radicaux pour l'accessibilité et l'impression
- Aucune régression attendue si les classes canoniques sont utilisées
