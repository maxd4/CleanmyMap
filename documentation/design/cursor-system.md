# Système de Curseurs - CleanMyMap

## Date: 2026-04-25
## Statut: Implémenté

---

## Vue d'ensemble

Système de curseurs CSS cohérent sur l'ensemble du site pour améliorer la tactilité et la compréhension immédiate des éléments interactifs.

---

## Règles appliquées

### 1. Éléments avec `cursor: pointer`
Tous les éléments cliquables natifs et déclaratifs:

| Élément | Sélecteur CSS |
|---------|--------------|
| Boutons actifs | `button:not(:disabled)` |
| Rôles bouton | `[role="button"]:not(:disabled)` |
| Liens avec href | `a[href]` |
| Labels de formulaire | `label[for]` |
| Selects | `select` |
| Checkboxes/Radios | `input[type="checkbox"], input[type="radio"]` |
| Fichiers | `input[type="file"]` |
| Boutons submit | `input[type="submit"]` |
| Éléments summary | `summary` |

### 2. Éléments avec `cursor: text`
Tous les champs de saisie texte:

| Élément | Sélecteur CSS |
|---------|--------------|
| Texte | `input[type="text"]` |
| Email | `input[type="email"]` |
| Mot de passe | `input[type="password"]` |
| Nombre | `input[type="number"]` |
| Recherche | `input[type="search"]` |
| Téléphone | `input[type="tel"]` |
| URL | `input[type="url"]` |
| Textarea | `textarea` |

### 3. Éléments avec `cursor: not-allowed`
Éléments désactivés:

| Élément | Sélecteur CSS |
|---------|--------------|
| Désactivés natifs | `:disabled` |
| ARIA désactivés | `[aria-disabled="true"]` |
| Classe disabled | `.disabled` |

### 4. Éléments avec `cursor: grab/grabbing`
Éléments déplaçables:

| Élément | Sélecteur CSS |
|---------|--------------|
| Draggables | `[draggable="true"], .cursor-grab` |
| En cours de drag | `.cursor-grabbing, [draggable="true"]:active` |

---

## Classes utilitaires disponibles

```css
/* Curseurs explicites */
.cursor-pointer      /* pointer */
.cursor-text         /* text */
.cursor-not-allowed  /* not-allowed */
.cursor-default      /* default */
.cursor-help         /* help */
.cursor-wait         /* wait */
.cursor-move         /* move */
.cursor-crosshair    /* crosshair */
.cursor-zoom-in      /* zoom-in */
.cursor-zoom-out     /* zoom-out */

/* Héritage */
.cursor-inherit      /* inherit - pour enfants d'éléments cliquables */
```

---

## Classes canoniques (CMM)

### `.cmm-interactive`
Pour boutons et liens avec indicateur visuel de survol.

**Usage:**
```tsx
<button className="cmm-interactive">Action</button>
```

**Comportement:**
- `cursor: pointer` natif
- Pseudo-élément `::after` pour effet de survol
- Transition douce 150ms

### `.cmm-clickable`
Pour cards et surfaces entièrement cliquables.

**Usage:**
```tsx
<CmmCard clickable onClick={handleClick}>
  Contenu
</CmmCard>
```

**Comportement:**
- `cursor: pointer`
- `transform: translateY(-1px)` au hover
- Enfants héritent du curseur

### `.cmm-input`
Pour champs de formulaire standardisés.

**Usage:**
```tsx
<input className="cmm-input" type="text" />
```

**Comportement:**
- `cursor: text`
- `cursor: default` si `readonly`
- `cursor: not-allowed` si `disabled`

---

## Composants mis à jour

| Composant | Changement | Fichier |
|-----------|------------|---------|
| **CmmButton** | Ajout `cmm-interactive` + `cursor-not-allowed` sur disabled | `components/ui/cmm-button.tsx` |
| **CmmCard** | Ajout props `clickable`, `onClick`, `disabled` avec classes `cmm-clickable` | `components/ui/cmm-card.tsx` |

---

## Exemples d'usage

### Bouton standard
```tsx
// Cursor pointer automatique (natif)
<button>Cliquez-moi</button>

// Avec classe canonique
<CmmButton tone="primary">Action</CmmButton>
```

### Card cliquable
```tsx
// Card non-cliquable (curseur default)
<CmmCard>Contenu statique</CmmCard>

// Card cliquable (curseur pointer + effets)
<CmmCard clickable onClick={handleClick}>Cliquez ici</CmmCard>

// Card désactivée (curseur not-allowed)
<CmmCard clickable disabled>Indisponible</CmmCard>
```

### Input de texte
```tsx
// Cursor text automatique (natif)
<input type="text" />

// Avec classe canonique
<input type="text" className="cmm-input" />
```

### Élément draggable
```tsx
// Avec classe utilitaire
<div className="cursor-grab" draggable>Draguez-moi</div>

// Au moment du drag
<div className="cursor-grabbing">En cours...</div>
```

---

## Points d'attention

### 1. Pas de curseur pointer sur éléments décoratifs
Les éléments non-interactifs ne doivent PAS avoir `cursor: pointer`:
- Cards non-cliquables sans `clickable` prop
- Pills/badges statiques
- Icônes informatives
- Images décoratives

### 2. Héritage correct
Les enfants d'éléments cliquables doivent hériter du curseur:
```css
.cmm-clickable > * {
  cursor: inherit;
}
```

### 3. États cohérents
| État | Curseur | Exemple |
|------|---------|---------|
| Normal | pointer | `<button>` |
| Hover | pointer | `<button:hover>` |
| Active | pointer | `<button:active>` |
| Disabled | not-allowed | `<button:disabled>` |
| Readonly | default | `<input:read-only>` |

---

## Tests de vérification

### Checklist manuelle
- [ ] Boutons: pointer sur tous les boutons actifs
- [ ] Liens: pointer sur tous les liens avec href
- [ ] Inputs texte: curseur text dans les champs
- [ ] Selects: pointer sur les selects
- [ ] Checkboxes/Radios: pointer
- [ ] Cards cliquables: pointer + effet hover
- [ ] Éléments désactivés: not-allowed
- [ ] Éléments draggables: grab/grabbing

### Débogage
Si un élément n'a pas le bon curseur:
1. Vérifier si c'est un élément natif (button, a, input)
2. Vérifier si la classe `cmm-interactive` ou `cmm-clickable` est appliquée
3. Vérifier l'état disabled/readonly
4. Vérifier les conflits CSS avec `cursor: default !important`

---

## Fichier source
**`apps/web/src/app/globals.css`** (lignes 139-259)

Section `@layer utilities` contenant toutes les règles de curseur.
