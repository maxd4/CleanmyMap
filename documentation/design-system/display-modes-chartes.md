# Chartes Graphiques par Mode d'Affichage

## Date: 2026-04-25
## Version: 1.1

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
> "Fond lumineux + cartes sombres" — Charte complète, référence : page sommaire `/`

### Éléments actifs
- ✅ Fond de page lumineux teinté dans la couleur du bloc
- ✅ Cartes et bulles sombres teintées avec backdrop-blur
- ✅ Titres / chiffres colorés dans l'accent du bloc
- ✅ Animations subtiles (pulse, transitions douces)
- ✅ Accents par bloc avec couleurs sémantiques
- ✅ Cartes avec profondeur et hover effects
- ✅ Barre de couleur top sur les cartes principales
- ✅ Glows internes sur les cartes

### Palette
```
Fond page :    Teinte claire/lumineuse de la couleur du bloc (radial-gradient)
Cartes :       Fond sombre teinté dans la couleur du bloc + backdrop-blur-xl
Titres :       text-[accent]-100 (coloré dans l'accent)
Petits textes: text-white / text-white/80
Bordures :     border-[accent]-200/18, hover /38
Ombres :       Portées dans la teinte du bloc
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
- Blur: activé sur les cartes (10-16px)
- Effets hover: `-translate-y-0.5` + shadow + bordure renforcée

### Classes à utiliser
```css
.premium-card        /* Carte sombre teintée + blur */
.cmm-surface         /* Surface avec blur */
.cmm-panel           /* Border-radius 2rem */
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
- ❌ Gradients de fond supprimés
- ❌ Glassmorphism réduit
- ❌ Effets hover complexes

### Palette
```
Fond:         Couleur unie dans la teinte du bloc (sans gradient)
Cartes:       Fond sombre teinté, sans blur
Titres:       text-[accent]-100
Petits textes: text-white
Ombres:       Soft uniquement
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
Radial-gradient fond lumineux       Fond uni teinté
Cartes avec blur + glow             Cartes flat légères
Shadow-elevated                     Shadow-soft ou none
Barre top colorée                   Bordure top fine
Boutons 3D hover                    Boutons flat hover
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
Fond:         Couleur unie neutre
Cartes:       Gris foncé uni, sans blur
Titres:       Blanc cassé ou noir selon le fond
Petits textes: Blanc cassé ou noir
Ombres:       AUCUNE
```

### Tokens CSS actifs
```css
/* Tokens minimaux */
--bg-canvas
--border-default: rgba avec faible opacité
--text-primary
--focus-ring: visible uniquement
/* Tous les autres tokens désactivés ou réduits */
```

### Comportement
- Animations: AUCUNE (transition opacity 100ms uniquement)
- Blur: STRICTEMENT INTERDIT
- Gradients: INTERDITS
- Effets hover: changement de bordure uniquement
- Radius: 0.75rem max
- Pas de glow, pas de barre top colorée

### Classes canoniques
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
  --vibrant-bg: none;
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
- [ ] Fond de page lumineux teinté dans la couleur du bloc
- [ ] Cartes sombres teintées avec backdrop-blur
- [ ] Titres colorés dans l'accent
- [ ] Animations subtiles actives
- [ ] Barre top colorée sur cartes principales

### Mode Minimaliste
- [ ] Fond uni sans gradient
- [ ] Pas de blur sur surfaces
- [ ] Ombres soft uniquement
- [ ] Accents par bloc présents mais sobres
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
