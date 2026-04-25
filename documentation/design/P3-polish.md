# P3 - Polish: Accessibilité, Densité Mobile, Typographie

## Date: 2026-04-25
## Statut: Terminé

---

## Vue d'ensemble

Polish final pour garantir l'accessibilité, la lisibilité et l'expérience optimale sur tous les appareils.

---

## 1. Accessibilité focus

### Règles globales (appliquées à tous les modes)

```css
/* Focus visible cohérent */
*:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

### Mode sobre - focus renforcé
```css
[data-display-mode="sobre"] *:focus-visible {
  outline: 3px solid var(--text-primary);
  outline-offset: 3px;
}
```

### Suppression du focus non-visible
```css
*:focus:not(:focus-visible) {
  outline: none;
}
```

### Cards cliquables
```css
.cmm-clickable:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 4px;
  border-radius: inherit;
}
```

---

## 2. Typographie optimale

### Équilibrage du texte

```css
/* Balance automatique pour éviter orphans/widows */
.cmm-text-balance {
  text-wrap: balance;
}

/* Titres avec balance automatique */
h1, h2, h3, h4 {
  text-wrap: balance;
}
```

### Largeur de texte optimale

```css
.cmm-prose {         /* 65ch - optimal lecture */
  max-width: 65ch;
}

.cmm-prose-wide {    /* 75ch - descriptions longues */
  max-width: 75ch;
}

.cmm-prose-narrow {  /* 55ch - labels, légendes */
  max-width: 55ch;
}
```

### Clamping de lignes

```css
.cmm-line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cmm-line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Usage dans les composants

```tsx
<CmmCard prose lineClamp={2}>
  <h3 className="cmm-heading">Titre équilibré</h3>
  <p className="cmm-line-clamp-2">Description longue...</p>
</CmmCard>
```

---

## 3. Densité mobile

### Espacement adaptatif

```css
/* Unité d'espacement variable */
.cmm-density-comfortable {
  --space-unit: 1rem;
}

.cmm-density-compact {
  --space-unit: 0.75rem;
}
```

### Responsive automatique

```css
@media (max-width: 640px) {
  .cmm-responsive-density {
    --space-unit: 0.75rem;
  }

  /* Paddings réduits */
  .cmm-mobile-compact {
    padding: 0.75rem;
  }

  /* Typographie ajustée */
  .cmm-mobile-text {
    font-size: 0.9375rem; /* 15px */
  }

  /* Largeur pleine sur mobile */
  .cmm-prose {
    max-width: 100%;
  }
}
```

### Classes utilitaires

| Classe | Usage |
|--------|-------|
| `.cmm-responsive-density` | Densité adaptative selon écran |
| `.cmm-mobile-compact` | Padding réduit sur mobile |
| `.cmm-mobile-text` | Font-size 15px sur mobile |
| `.cmm-nowrap` | Empêcher retour à la ligne |

---

## 4. États visuels cohérents

### Hover lift

```css
.cmm-hover-lift {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cmm-hover-lift:hover {
  transform: translateY(-2px);
}
```

### Active press

```css
.cmm-active-press:active {
  transform: translateY(1px);
}
```

### Disabled

```css
.cmm-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## 5. Réduction de mouvement (accessibilité)

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .cmm-clickable:hover,
  .cmm-hover-lift:hover {
    transform: none !important;
  }
}
```

---

## API des classes P3

| Classe | Description |
|--------|-------------|
| `.cmm-text-balance` | Équilibrage du texte |
| `.cmm-prose` | Largeur 65ch optimale |
| `.cmm-prose-wide` | Largeur 75ch |
| `.cmm-prose-narrow` | Largeur 55ch |
| `.cmm-heading` | Titre avec balance + césure |
| `.cmm-line-clamp-2` | Limite à 2 lignes |
| `.cmm-line-clamp-3` | Limite à 3 lignes |
| `.cmm-nowrap` | Pas de retour à la ligne |
| `.cmm-hover-lift` | Effet hover subtil |
| `.cmm-active-press` | Effet pression |
| `.cmm-disabled` | État désactivé |
| `.cmm-responsive-density` | Densité adaptative |

---

## Checklist de vérification

### Accessibilité
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Focus renforcé en mode sobre
- [ ] Suppression du focus pour éléments non-interactifs
- [ ] Support `prefers-reduced-motion`

### Typographie
- [ ] Titres avec `text-wrap: balance`
- [ ] Largeur de texte 65ch maximum
- [ ] Descriptions clampées (2-3 lignes max)
- [ ] Pas d'orphans sur les titres

### Mobile
- [ ] Densité compacte sur < 640px
- [ ] Paddings réduits sur mobile
- [ ] Typographie légèrement réduite (15px)
- [ ] Largeur 100% sur petits écrans

### États
- [ ] Hover lift cohérent
- [ ] Active press sur les boutons
- [ ] Disabled avec opacité 0.5

---

## Fichier source
**`apps/web/src/app/globals.css`** (lignes 566-729)

Section "P3 POLISH - Accessibilité, densité mobile, typographie"
