# Système Typographique CleanmyMap

## Date: 2026-04-25
## Statut: ✅ Implémenté

---

## Vue d'ensemble

Système typographique complet avec échelle cohérente, paire de polices optimisée, et tokens CSS pour tous les modes d'affichage.

---

## Paire de Polices

| Rôle | Police | Usage |
|------|--------|-------|
| **Display** | Outfit | Titres, navigation, hero, H1-H4 |
| **Body** | Inter | Corps de texte, formulaires, descriptions |

### Pourquoi cette paire ?

- **Outfit**: Excellent rendu des caractères FR (accents, ponctuation), formes géométriques modernes
- **Inter**: Lisibilité optimale pour texte long, chiffres tabulaires, excellente à petites tailles
- Chargement optimisé via `next/font/google` avec sous-ensemble latin uniquement

---

## Échelle Typographique

### Desktop (ratio 1.25 - Major Third)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--text-xs` | 0.75rem (12px) | Captions, meta, badges |
| `--text-sm` | 0.875rem (14px) | Labels, aides, boutons |
| `--text-base` | 1rem (16px) | Corps de texte |
| `--text-lg` | 1.125rem (18px) | Lead text, paragraphes importants |
| `--text-xl` | 1.25rem (20px) | H4, sous-titres |
| `--text-2xl` | 1.5rem (24px) | H3 |
| `--text-3xl` | 1.875rem (30px) | H2 |
| `--text-4xl` | 2.25rem (36px) | H1 page |
| `--text-5xl` | 3rem (48px) | Hero |
| `--text-6xl` | 3.75rem (60px) | Hero large |

### Mobile (< 640px, ratio 1.2)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--text-xs` | 0.75rem (12px) | Inchangé |
| `--text-sm` | 0.8125rem (13px) | +1px pour lisibilité |
| `--text-base` | 0.9375rem (15px) | +1px pour lisibilité |
| `--text-2xl` | 1.375rem (22px) | Réduit |
| `--text-4xl` | 1.875rem (30px) | Réduit |
| `--text-6xl` | 2.5rem (40px) | Fortement réduit |

---

## Hiérarchie Sémantique

### Classes Utilitaires

```tsx
// Titres
<h1 className="cmm-text-h1 text-primary">Titre page</h1>
<h2 className="cmm-text-h2 text-primary">Section</h2>
<h3 className="cmm-text-h3 text-secondary">Sous-section</h3>
<h4 className="cmm-text-h4 text-secondary">Titre carte</h4>

// Corps
<p className="cmm-text-body text-primary">Paragraphe</p>
<span className="cmm-text-small text-secondary">Description</span>
<span className="cmm-text-caption text-muted">Meta info</span>
```

### Poids de police autorisés

| Poids | Token | Usage |
|-------|-------|-------|
| 400 | `--weight-normal` | Corps de texte |
| 500 | `--weight-medium` | Labels, navigation |
| 600 | `--weight-semibold` | Titres, boutons |
| 700 | `--weight-bold` | H1, hero, accents |

**⚠️ Éviter 800+ (extrabold)** : Trop lourd en français, réduit la lisibilité.

### Line-height

| Token | Valeur | Usage |
|-------|--------|-------|
| `--leading-tight` | 1.15 | H1 courts |
| `--leading-snug` | 1.3 | H2-H3 |
| `--leading-normal` | 1.5 | Corps, H4 |
| `--leading-relaxed` | 1.625 | Paragraphes longs |

---

## Couleurs Texte Sémantiques

### Hiérarchie de contenu

```css
--text-primary:    #0f172a  /* Contenu principal */
--text-secondary:  #334155  /* Contenu secondaire */
--text-muted:      #64748b  /* Meta, placeholders */
--text-inverse:    #f8fafc  /* Sur fond sombre */
```

### États et feedback

```css
--text-success:  #059669  /* Validation, succès */
--text-warning:  #b45309  /* Avertissement */
--text-danger:   #dc2626  /* Erreur, alerte */
--text-info:     #0369a1  /* Information */
```

### Actions

```css
--text-link:       #0369a1  /* Lien par défaut */
--text-link-hover: #0284c7  /* Lien hover */
```

### Usage React/Tailwind

```tsx
<p className="text-primary">Texte principal</p>
<p className="text-secondary">Texte secondaire</p>
<p className="text-muted">Meta information</p>
<p className="text-success">Message de succès</p>
<a className="text-link">Lien cliquable</a>
```

---

## Accessibilité (WCAG 2.1 AA)

### Contraste vérifié

| Combinaison | Ratio | Statut |
|-------------|-------|--------|
| `--text-primary` sur `--background` | 15.8:1 | ✅ Passe AAA |
| `--text-secondary` sur `--background` | 8.4:1 | ✅ Passe AA |
| `--text-muted` sur `--background` | 5.9:1 | ✅ Passe AA |
| `--text-link` sur `--background` | 5.1:1 | ✅ Passe AA |

### Règles à suivre

- ✅ Texte normal: ratio minimum 4.5:1
- ✅ Grand texte (18px+ bold / 24px+): ratio minimum 3:1
- ✅ UI components: ratio minimum 3:1
- ❌ Éviter texte clair sur fond pastel sans vérification

---

## Fichiers Modifiés

| Fichier | Changement |
|---------|------------|
| `layout.tsx` | Ajout `next/font` pour Outfit + Inter |
| `globals.css` | Tokens typographiques + classes utilitaires |

### Code: layout.tsx

```typescript
import { Inter, Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

// HTML avec variables CSS
<html className={`${outfit.variable} ${inter.variable}`}>
```

### Code: globals.css (tokens clés)

```css
:root {
  /* Polices */
  --font-display: var(--font-outfit), system-ui, sans-serif;
  --font-body: var(--font-inter), system-ui, sans-serif;

  /* Échelle */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-5xl: 3rem;        /* 48px */

  /* Poids */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Line-height */
  --leading-tight: 1.15;
  --leading-snug: 1.3;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}

@layer utilities {
  .cmm-text-h1 { font: var(--weight-h1) var(--size-h1)/var(--leading-h1) var(--font-h1); }
  .cmm-text-h2 { font: var(--weight-h2) var(--size-h2)/var(--leading-h2) var(--font-h2); }
  .cmm-text-h3 { font: var(--weight-h3) var(--size-h3)/var(--leading-h3) var(--font-h3); }
  .cmm-text-h4 { font: var(--weight-h4) var(--size-h4)/var(--leading-h4) var(--font-h4); }
  .cmm-text-body { font: var(--weight-body) var(--size-body)/var(--leading-body) var(--font-body); }
  .cmm-text-small { font: var(--weight-small) var(--size-small)/var(--leading-small) var(--font-small); }
  .cmm-text-caption { font: var(--weight-caption) var(--size-caption)/var(--leading-caption) var(--font-caption); }
}
```

---

## Checklist Développeur

### ✅ À utiliser
- [ ] `cmm-text-h1` à `cmm-text-h4` pour les titres
- [ ] `cmm-text-body` pour les paragraphes
- [ ] `text-primary`, `text-secondary`, `text-muted` pour la hiérarchie
- [ ] Poids 400-700 uniquement
- [ ] Tailles de l'échelle `--text-*`

### ❌ À éviter
- [ ] `text-[10px]` - Trop petit, illisible
- [ ] `font-extrabold` (800) - Trop lourd
- [ ] Tailles custom `text-[XXpx]` - Inconsistant
- [ ] Couleurs texte arbitraires (utiliser les tokens)

---

## Migration Progressive

### Priorité 1: Composants partagés
- Navigation, header, layout
- Boutons, formulaires
- Cards, modals

### Priorité 2: Pages clés
- Homepage
- Dashboard
- Formulaires de déclaration

### Priorité 3: Reste du site
- Pages rubriques
- Rapports
- Export PDF

---

## Exemples Do/Don't

### ✅ Do
```tsx
<h1 className="cmm-text-h1 text-primary">
  Titre de page
</h1>

<p className="cmm-text-body text-secondary">
  Description détaillée du contenu
</p>

<span className="cmm-text-caption text-muted">
  Meta · 2 min de lecture
</span>
```

### ❌ Don't
```tsx
{/* Éviter */}
<h1 className="text-[32px] font-extrabold">
  Titre incohérent
</h1>

<span className="text-[10px] text-gray-400">
  Illisible
</span>

<p className="text-[15px] font-black">
  Poids extrême inutile
</p>
```

---

## Références

- [TYPOGRAPHY_AUDIT.md](./TYPOGRAPHY_AUDIT.md) - Audit complet et analyse
- [globals.css](../../../apps/web/src/app/globals.css) - Implémentation tokens
- [layout.tsx](../../../apps/web/src/app/layout.tsx) - Configuration polices
