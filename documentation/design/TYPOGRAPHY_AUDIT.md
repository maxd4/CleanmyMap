# Audit Typographique - CleanmyMap

## Date: 2026-04-25
## Statut: 🚧 Audit en cours

---

## 1. Inventaire Actuel

### Polices utilisées

| Police | Usage | Fichiers |
|--------|-------|----------|
| **Outfit** | Titres, hero, navigation section | `globals.css` (`.punchy-title`), `error.tsx`, `page.tsx`, `punchy-slogan.tsx` |
| **font-sans** (system) | Corps de texte, UI | `layout.tsx`, tous les composants |

### Tailles observées (échantillon)

```
# Navigation / Header
- text-sm (14px): labels, badges
- text-base (16px): navigation items
- text-lg (18px): sous-titres

# Titres
- text-2xl (24px): section headers
- text-3xl (30px): page titles
- text-4xl (36px): hero titles
- text-5xl (48px): hero accents

# Corps
- text-xs (12px): captions, meta
- text-sm (14px): descriptions, labels
- text-base (16px): paragraphes
- text-lg (18px): lead text

# Spécifiques trouvés
- text-[10px]: badges, pills (trop petit)
- text-[13px]: labels custom (inconsistant)
- text-[15px]: mobile adjustments
- text-[28px]: titres custom
- text-[32px]: hero custom
```

### Poids observés

```
font-normal   (400): descriptions longues
font-medium   (500): labels, navigation
font-semibold (600): titres, boutons
font-bold     (700): hero, accents
font-extrabold (800): rare, punchy titles
```

### Line-height observé

```
leading-none: titres très serrés
leading-tight (1.25): titres
leading-snug (1.375): sous-titres
leading-normal (1.5): corps de texte
leading-relaxed (1.625): descriptions longues
leading-loose: rare
```

### Contrastes actuels

```
# Dark mode (bon)
- text-primary: #f8fafc (presque blanc)
- text-secondary: #e2e8f0
- text-muted: #94a3b8

# Light mode
- text-primary: #0f172a (presque noir)
- text-secondary: #334155
- text-muted: #64748b

# Problèmes identifiés
- Badges avec fond pastel + texte clair: risque contraste
- Texte sur images/gradients: pas de fallback sémantique
```

---

## 2. Problèmes Identifiés

### 🔴 Critiques (à corriger immédiatement)

| Problème | Impact | Exemple |
|----------|--------|---------|
| `text-[10px]` | Illisible, WCAG fail | Badges, pills |
| Taille custom `text-[13px]` | Inconsistant | Labels divers |
| `font-extrabold` (800) | Trop lourd en FR | Titres punchy |
| Line-height trop serré sur long texte | Lisibilité | Descriptions |

### 🟡 Moyens (à standardiser)

| Problème | Impact |
|----------|--------|
| Pas de système échelonné | Chaos visuel entre pages |
| Police unique pour tout | Manque de hiérarchie |
| `leading-none` abusif | Titres écrasés sur mobile |

### 🟢 Faibles (amélioration UX)

| Problème | Impact |
|----------|--------|
| Pas de tokens sémantiques | Maintenance difficile |
| Couleurs texte non liées à état | Confusion utilisateur |

---

## 3. Proposition: Système Typographique

### 3.1 Paire de Polices

```css
/* Option 1: Duo moderne + lisible (RECOMMANDÉ) */
--font-display: 'Outfit', system-ui, sans-serif;  /* Titres, navigation */
--font-body: 'Inter', system-ui, sans-serif;      /* Corps, formulaires */

/* Option 2: Duo premium (si on veut différenciation forte) */
--font-display: 'Space Grotesk', sans-serif;        /* Titres tech */
--font-body: 'Inter', sans-serif;                  /* Corps */

/* Option 3: Duo conservateur (stabilité maximale) */
--font-display: 'Outfit', sans-serif;               /* Garder actuel */
--font-body: system-ui, -apple-system, sans-serif; /* System font */
```

**Choix recommandé: Option 1**
- Outfit: excellente pour titres FR (accents, ponctuation)
- Inter: lisibilité optimale pour texte long
- Chargement: Outfit (déjà utilisé) + Inter (Google Fonts)

### 3.2 Échelle Typographique

```css
/* Tokens CSS - Échelle majeure tierce (1.25 ratio) */
--text-xs: 0.75rem;      /* 12px - captions, meta */
--text-sm: 0.875rem;     /* 14px - labels, aides */
--text-base: 1rem;       /* 16px - corps */
--text-lg: 1.125rem;     /* 18px - lead */
--text-xl: 1.25rem;      /* 20px - h4 */
--text-2xl: 1.5rem;      /* 24px - h3 */
--text-3xl: 1.875rem;    /* 30px - h2 */
--text-4xl: 2.25rem;     /* 36px - h1 page */
--text-5xl: 3rem;        /* 48px - hero */
--text-6xl: 3.75rem;     /* 60px - hero large */

/* Mobile scale (ratio 1.2) */
@media (max-width: 640px) {
  --text-xs: 0.75rem;    /* 12px - inchangé */
  --text-sm: 0.8125rem;  /* 13px - légèrement plus grand */
  --text-base: 0.9375rem; /* 15px - plus lisible */
  --text-lg: 1.0625rem;  /* 17px */
  --text-xl: 1.125rem;   /* 18px */
  --text-2xl: 1.375rem;  /* 22px */
  --text-3xl: 1.625rem;  /* 26px */
  --text-4xl: 1.875rem;  /* 30px */
  --text-5xl: 2.25rem;   /* 36px */
}
```

### 3.3 Hiérarchie Sémantique

```css
/* Hiérarchie avec tokens */
--font-h1: var(--font-display);
--font-h2: var(--font-display);
--font-h3: var(--font-display);
--font-h4: var(--font-display);
--font-body: var(--font-body);
--font-caption: var(--font-body);

/* Poids */
--weight-h1: 700;
--weight-h2: 600;
--weight-h3: 600;
--weight-h4: 500;
--weight-body: 400;
--weight-strong: 600;
--weight-label: 500;

/* Line-height */
--leading-h1: 1.1;
--leading-h2: 1.15;
--leading-h3: 1.2;
--leading-h4: 1.25;
--leading-body: 1.6;
--leading-caption: 1.4;
```

### 3.4 Couleurs Texte Sémantiques

```css
/* Hiérarchie */
--text-primary: #0f172a;      /* Contenu principal */
--text-secondary: #334155;    /* Contenu secondaire */
--text-muted: #64748b;      /* Meta, placeholders */
--text-inverse: #f8fafc;    /* Sur fond sombre */

/* États / Feedback */
--text-success: #059669;    /* Validation, succès */
--text-warning: #b45309;    /* Avertissement */
--text-danger: #dc2626;     /* Erreur, alerte */
--text-info: #0369a1;       /* Information neutre */

/* Actions */
--text-link: #0369a1;               /* Lien par défaut */
--text-link-hover: #0284c7;         /* Lien hover */
--text-link-visited: #7c3aed;       /* Lien visité (optionnel) */

/* Dark mode overrides */
html.dark {
  --text-primary: #f8fafc;
  --text-secondary: #e2e8f0;
  --text-muted: #94a3b8;
  --text-inverse: #0f172a;
  --text-success: #34d399;
  --text-warning: #fbbf24;
  --text-danger: #f87171;
  --text-info: #38bdf8;
  --text-link: #38bdf8;
  --text-link-hover: #7dd3fc;
}
```

---

## 4. Accessibilité (WCAG 2.1 AA)

### Contraste requis

| Élément | Ratio min | Usage |
|---------|-----------|-------|
| Texte normal | 4.5:1 | Paragraphes, labels |
| Grand texte (18px+ bold / 24px+) | 3:1 | Titres |
| UI components | 3:1 | Boutons, champs |

### Vérifications actuelles

| Combinaison | Ratio | Statut |
|-------------|-------|--------|
| #0f172a sur #fdfdfd | 15.8:1 | ✅ Passe |
| #64748b (muted) sur #fdfdfd | 5.9:1 | ✅ Passe |
| #10b981 (accent) sur #fdfdfd | 3.1:1 | ⚠️ Limite |
| #94a3b8 sur #020617 | 7.5:1 | ✅ Passe |

### Zones à risque identifiées

- Badges pastels avec texte blanc: vérifier chaque combinaison
- Texte sur images avec overlay: ajouter fond semi-transparent
- Placeholders: souvent trop clairs

---

## 5. Plan d'Implémentation

### Phase 1: Tokens CSS (globals.css)

```css
/* Ajouter dans :root et html.dark */
/* 1. Polices */
--font-display: 'Outfit', system-ui, -apple-system, sans-serif;
--font-body: 'Inter', system-ui, -apple-system, sans-serif;

/* 2. Échelle */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
/* ... etc ... */

/* 3. Hiérarchie */
--font-h1: var(--font-display);
--weight-h1: 700;
--leading-h1: 1.1;
/* ... etc ... */

/* 4. Couleurs texte */
--text-primary: #0f172a;
--text-secondary: #334155;
/* ... etc ... */
```

### Phase 2: Classes Utilitaires

```css
@layer utilities {
  .cmm-text-h1 { font: var(--weight-h1) var(--text-4xl)/var(--leading-h1) var(--font-h1); }
  .cmm-text-h2 { font: var(--weight-h2) var(--text-3xl)/var(--leading-h2) var(--font-h2); }
  .cmm-text-h3 { font: var(--weight-h3) var(--text-2xl)/var(--leading-h3) var(--font-h3); }
  .cmm-text-h4 { font: var(--weight-h4) var(--text-xl)/var(--leading-h4) var(--font-h4); }
  .cmm-text-body { font: var(--weight-body) var(--text-base)/var(--leading-body) var(--font-body); }
  .cmm-text-small { font: var(--weight-body) var(--text-sm)/var(--leading-caption) var(--font-body); }
  .cmm-text-caption { font: var(--weight-body) var(--text-xs)/var(--leading-caption) var(--font-body); }
}
```

### Phase 3: Migration Progressive

| Priorité | Composants | Action |
|----------|------------|--------|
| P1 | Navigation, Layout, Titres de page | Appliquer tokens display |
| P2 | Formulaires, labels, aides | Appliquer tokens body |
| P3 | Badges, pills, meta | Standardiser tailles |
| P4 | Pages spécifiques | Migrer au cas par cas |

### Phase 4: Validation

- [ ] Desktop: 1920px, 1440px, 1024px
- [ ] Tablet: 768px
- [ ] Mobile: 390px, 375px, 320px
- [ ] Contraste: vérifier avec outil WCAG
- [ ] Polices: vérifier chargement Inter

---

## 6. Checklist Développeur

### À faire
- [ ] Ajouter Inter au chargement de polices
- [ ] Créer tokens CSS dans globals.css
- [ ] Créer classes utilitaires cmm-text-*
- [ ] Migrer navigation et layout (P1)
- [ ] Migrer formulaires (P2)
- [ ] Standardiser badges et pills (P3)
- [ ] Documenter nouveaux tokens

### À ne PAS faire
- [ ] Ne pas utiliser `text-[10px]`
- [ ] Ne pas utiliser `font-extrabold` (800)
- [ ] Ne pas utiliser tailles custom `text-[XXpx]`
- [ ] Ne pas mélanger Outfit et Inter dans un même bloc

---

## 7. Exemples Do/Don't

### ✅ Do

```tsx
// Utiliser les tokens
<h1 className="cmm-text-h1 text-primary">
  Titre de page
</h1>

<p className="cmm-text-body text-secondary">
  Corps de texte lisible
</p>

<span className="cmm-text-caption text-muted">
  Meta information
</span>
```

### ❌ Don't

```tsx
// Éviter les tailles custom
<h1 className="text-[32px] font-extrabold">
  Titre incohérent
</h1>

// Éviter les tailles trop petites
<span className="text-[10px]">
  Illisible
</span>

// Éviter les poids extrêmes
<p className="font-extrabold">
  Texte trop lourd
</p>
```

---

## Prochaines Étapes

1. Valider choix de la paire de polices
2. Implémenter tokens CSS
3. Créer composants typographiques canoniques
4. Migrer composants partagés
5. Documenter et tester
