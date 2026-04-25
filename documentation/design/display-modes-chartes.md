# Chartes Graphiques par Mode d'Affichage

## Date: 2026-04-25
## Version: 1.0

---

## Vue d'ensemble des 3 modes

| Mode | Objectif | Philosophie | Cible |
|------|----------|-------------|-------|
| **Exhaustif** | Expérience premium complète | Maximiser l'impact visuel, la profondeur, les animations | Utilisateurs standard, vitrine |
| **Minimaliste** | Clarté optimisée | Réduire le bruit visuel tout en gardant l'identité | Utilisateurs pressés, interfaces utilitaires |
| **Sobre** | Accessibilité cognitive maximale | Supprimer toute stimulation, interface statique | Utilisateurs sensibles, TDAH, fatigue cognitive |

---

## 1. Mode EXHAUSTIF

### Identité visuelle
> "Premium pro / moderne / futuriste" - Charte complète

### Éléments actifs
- ✅ Mesh gradients animés (VibrantBackground)
- ✅ Effets glassmorphism (backdrop-blur)
- ✅ Ombres premium en 3 niveaux (soft/elevated/hero)
- ✅ Animations subtiles (pulse, transitions douces)
- ✅ Accents par bloc avec couleurs sémantiques
- ✅ Cartes avec profondeur et hover effects
- ✅ Typographie gradient (punchy-title)
- ✅ Grain texture subtile

### Palette
```
Fond:         Gradient radial émeraude + profondeur
Surfaces:     Glassmorphism (bg-white/90 + blur)
Accents:      Émeraude (action), Bleu (soutien)
Texte:        Slate-900 (clair) / Slate-50 (sombre)
Ombres:       Soft (utilitaire) / Elevated (cards) / Hero (hero)
```

### Tokens CSS actifs
```css
/* Tous les tokens sémantiques */
--bg-canvas, --bg-elevated, --bg-muted
--shadow-soft, --shadow-elevated
--glass-bg, --glass-blur
--accent-primary, --accent-vibrant
```

### Comportement
- Animations: activées (pulse 12-18s, transitions 200-300ms)
- Blur: activé (10-16px)
- Gradients texte: activés
- Effets hover: scale + shadow + translateY

### Classes à utiliser
```css
.premium-card        /* Glassmorphism complet */
.cmm-surface         /* Surface avec blur */
.cmm-panel           /* Border-radius 1.5rem */
.cmm-focus-ring      /* Ring focus visible */
```

---

## 2. Mode MINIMALISTE

### Identité visuelle
> "Essentiel sans austérité" - Identité préservée, bruit réduit

### Éléments actifs
- ✅ Fond uni (pas de gradient animé)
- ✅ Ombres légères uniquement (shadow-soft)
- ✅ Couleurs d'accent conservées mais sobres
- ✅ Typography hiérarchisée (grande taille)
- ✅ Espacement augmenté (respiration)
- ✅ Animations réduites (fade seulement)
- ❌ Mesh gradients supprimés
- ❌ Glassmorphism réduit
- ❌ Effets hover complexes

### Palette
```
Fond:         Couleur unie (bg-canvas sans gradient)
Surfaces:     Blanc/couleur unie légère (pas de blur)
Accents:      Émeraude uniquement sur actions primaires
Texte:        Slate-900 (clair) / Slate-50 (sombre)
Ombres:       Soft uniquement (pas de elevated/hero)
```

### Tokens CSS actifs
```css
/* Tokens essentiels uniquement */
--bg-canvas
--shadow-soft
--text-primary, --text-secondary
--action-primary-*
/* Glassmorphism désactivé */
```

### Comportement
- Animations: fades 150ms uniquement
- Blur: désactivé
- Gradients texte: désactivés
- Effets hover: changement de couleur uniquement (pas de transform)
- Densité: éléments plus espacés

### Classes à utiliser
```css
.cmm-surface-muted   /* Surface sans blur */
.cmm-card            /* Border-radius 1.25rem */
.cmm-minimal         /* Mode minimal spécifique */
```

### Règles de réduction
```
AVANT (exhaustif)                    APRÈS (minimaliste)
────────────────────────────────────────────────────────
Mesh gradient + grain               Fond uni --bg-canvas
5 couleurs d'accent                 1 couleur (éméralde)
Cards avec glassmorphism            Cards flat légères
Shadow-elevated                     Shadow-soft ou none
Typo gradient                       Typo couleur unie
Boutons 3D hover                    Boutons flat hover
Badge + dot + ring                  Badge simple
```

---

## 3. Mode SOBRE

### Identité visuelle
> "Statique et neutre" - Aucune stimulation visuelle

### Éléments actifs
- ✅ Fond uni absolu (aucun effet)
- ✅ Bordures fines uniquement (pas d'ombres)
- ✅ Contraste élevé fixe
- ✅ Typographie standard (pas de gradients)
- ✅ Éléments carrés/angulaires (radius réduit)
- ✅ Aucune animation
- ❌ Tous les effets de profondeur supprimés
- ❌ Tous les effets de couleur sauf essentiels
- ❌ Glassmorphism complètement supprimé
- ❌ Hover effects supprimés

### Palette
```
Fond:         #ffffff (clair) / #0b1220 (sombre) - couleur unie
Surfaces:     Gris très léger (clair) / Gris foncé (sombre)
Accents:      Seulement pour états actifs/focus
Texte:        Noir pur (clair) / Blanc cassé (sombre)
Ombres:       AUCUNE
```

### Tokens CSS actifs
```css
/* Tokens minimaux */
--bg-canvas: #ffffff ou #0b1220
--border-default: rgba avec faible opacité
--text-primary: #000000 ou #f1f5f9
--focus-ring: visible uniquement
/* Tous les autres tokens désactivés ou réduits */
```

### Comportement
- Animations: AUCUNE (transition opacity 100ms uniquement)
- Blur: STRICTEMENT INTERDIT
- Gradients: INTERDITS
- Effets hover: changement de bordure uniquement
- Radius: 0.75rem max (pas de 1.5rem)
- Pas de mesh, pas de grain, pas de glow

### Classes canoniques (déjà créées dans P0)
```css
.cmm-sober {
  border-radius: 0.75rem;
  border-width: 1px;
  box-shadow: none !important;
  backdrop-filter: none !important;
  background: var(--bg-canvas);
}

.cmm-sober-animate {
  animation: none !important;
  transition: opacity 0.1s ease-out !important;
}

.cmm-sober-text {
  background: none !important;
  -webkit-background-clip: initial !important;
  color: inherit !important;
}
```

### Règles strictes
```
INTERDIT (sobre):
- Blur / backdrop-filter
- Box-shadow (même léger)
- Animations CSS
- Gradients (fond ou texte)
- Hover translate/scale
- Opacité < 90% sur texte
- Radius > 0.75rem
- Plusieurs couleurs d'accent

AUTORISÉ (sobre):
- Bordures fines 1px
- Changement de couleur de bordure au focus
- Opacity transition 100ms
- Texte haute lisibilité
```

---

## 4. Mapping technique

### Attribut data-display-mode
```html
<!-- Exhaustif (défaut) -->
<html data-display-mode="exhaustif">

<!-- Minimaliste -->
<html data-display-mode="minimaliste">

<!-- Sobre -->
<html data-display-mode="sobre">
```

### Sélecteurs CSS par mode
```css
/* Exhaustif - défaut, pas de sélecteur spécifique nécessaire */

/* Minimaliste */
[data-display-mode="minimaliste"] {
  /* Désactiver mesh */
  --vibrant-bg: none;
  /* Réduire ombres */
  --shadow-elevated: var(--shadow-soft);
}

/* Sobre - déjà implémenté dans globals.css */
[data-display-mode="sobre"] .cmm-sober { ... }
[data-display-mode="sobre"] .cmm-sober-animate { ... }
```

### Détection React
```tsx
const displayMode = document.documentElement.dataset.displayMode || "exhaustif";
// exhaustif | minimaliste | sobre
```

---

## 5. Checklist par mode

### Mode Exhaustif
- [ ] Mesh gradient présent
- [ ] Glassmorphism sur cards principales
- [ ] Ombres en 3 niveaux
- [ ] Animations subtiles
- [ ] Accents par bloc
- [ ] Punchy titles avec gradient

### Mode Minimaliste
- [ ] Fond uni sans gradient
- [ ] Pas de blur sur surfaces
- [ ] Ombres soft uniquement
- [ ] Émeraude seule couleur d'accent
- [ ] Animations fade uniquement
- [ ] Espacement augmenté

### Mode Sobre
- [ ] Fond uni strict
- [ ] AUCUN blur
- [ ] AUCUNE ombre
- [ ] AUCUNE animation
- [ ] Radius max 0.75rem
- [ ] Contraste élevé fixe
- [ ] Bordures fines visibles

---

## 6. Notes d'implémentation

### Priorité des modes
1. **Sobre**: Accessibilité cognitive = priorité maximale
2. **Minimaliste**: Équilibre = défaut recommandé pour production
3. **Exhaustif**: Vitrine = usage marketing/landing uniquement

### Transition entre modes
- Transition instantanée (pas d'animation)
- Préférence utilisateur persistée (localStorage)
- Détection système possible (prefers-reduced-motion → sobre)

### Tests obligatoires
- Mode sobre: tester avec utilisateurs TDAH
- Mode minimaliste: tester en conditions de fatigue
- Mode exhaustif: tester sur écrans haute densité
