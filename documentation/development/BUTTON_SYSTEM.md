# Système de Boutons Accueil - CleanMyMap

## Vue d'ensemble

Système de boutons premium hiérarchisé pour l'accueil, inspiré du design moderne avec dégradés riches, relief subtil et transitions fluides.

## Hiérarchie des boutons

### 1. Boutons Primaires (Primary)
**Usage** : Actions principales et CTA les plus importants
**Style** : Dégradé cyan → teal → emerald
**Caractéristiques** :
- Hauteur : 56px (h-14)
- Padding : 32px horizontal (px-8)
- Border radius : 20px (rounded-[1.25rem])
- Dégradé : `from-[#06b6d4] via-[#14b8a6] to-[#10b981]`
- Ombre : Double shadow avec cyan et emerald
- Hover : Lift -4px + shadow amplifiée + dégradé plus clair
- Texte : Blanc, font-bold, 16px

**Règle** : Maximum 1-2 boutons primaires par zone

**Exemples d'usage** :
- "Voir la carte"
- "Déclarer une action"

### 2. Boutons Secondaires (Secondary)
**Usage** : Actions alternatives importantes
**Style** : Dégradé indigo → violet → purple
**Caractéristiques** :
- Hauteur : 56px (h-14)
- Padding : 32px horizontal (px-8)
- Border radius : 20px (rounded-[1.25rem])
- Dégradé : `from-[#6366f1] via-[#8b5cf6] to-[#a855f7]`
- Ombre : Double shadow avec indigo et purple
- Hover : Lift -4px + shadow amplifiée + dégradé plus clair
- Texte : Blanc, font-bold, 16px

**Règle** : Maximum 1 bouton secondaire par zone (si primaire présent)

**Exemples d'usage** :
- "Explorer le site"
- "Annuaire partenaires"

### 3. Boutons Tertiaires (Tertiary)
**Usage** : Actions utilitaires et liens discrets
**Style** : Texte simple sur fond transparent
**Caractéristiques** :
- Hauteur : 48px (h-12)
- Padding : 24px horizontal (px-6)
- Pas de background
- Pas de border
- Hover : Couleur cyan + gap augmenté
- Texte : Blanc/90, font-semibold, 14px

**Règle** : Utiliser pour toutes les actions secondaires

**Exemples d'usage** :
- "Se connecter"
- "Voir l'impact"
- Liens de navigation

## Composant HomeButton

```tsx
import { HomeButton } from '@/components/accueil';

// Primaire
<HomeButton href="/actions/map" variant="primary">
  Voir la carte
</HomeButton>

// Secondaire
<HomeButton href="/explorer" variant="secondary">
  Explorer le site
</HomeButton>

// Tertiaire
<HomeButton href="/sign-in" variant="tertiary">
  Se connecter
</HomeButton>

// Avec icône personnalisée
<HomeButton href="/actions/map" variant="primary" icon={Map}>
  Voir la carte
</HomeButton>
```

## Règles de composition

### Dans une même zone :
- ✅ 1 primaire + 1 secondaire + N tertiaires
- ✅ 2 primaires + N tertiaires (si actions équivalentes)
- ✅ 1 secondaire + N tertiaires
- ❌ 2 primaires + 1 secondaire (trop chargé)
- ❌ 3+ boutons primaires/secondaires

### Espacement :
- Gap entre boutons : 12-16px (gap-3 sm:gap-4)
- Alignement : flex-start pour desktop, center pour mobile

### États :
- **Hover** : Lift + shadow + couleur plus claire
- **Active** : Retour position + shadow réduite
- **Focus** : Ring visible (accessibilité)
- **Disabled** : Opacity 50% + cursor not-allowed

## Palette de couleurs

### Primaire (Cyan → Emerald)
- Base : `#06b6d4` → `#14b8a6` → `#10b981`
- Hover : `#22d3ee` → `#2dd4bf` → `#34d399`
- Shadow : `rgba(6,182,212,0.4)` + `rgba(16,185,129,0.3)`

### Secondaire (Indigo → Purple)
- Base : `#6366f1` → `#8b5cf6` → `#a855f7`
- Hover : `#818cf8` → `#a78bfa` → `#c084fc`
- Shadow : `rgba(99,102,241,0.35)` + `rgba(168,85,247,0.3)`

### Tertiaire
- Base : `white/90`
- Hover : `#22d3ee` (cyan-300)

## Sections de l'accueil

### HomeHero
- 2 primaires : "Voir la carte" + "Déclarer une action"
- 1 secondaire : "Explorer le site"
- 2 tertiaires : "Se connecter" + "Voir l'impact"

### OriginCredibility
- 1 primaire : "Voir la carte"
- 1 secondaire : "Annuaire partenaires"

### Autres sections
- Utiliser tertiaire par défaut
- Primaire uniquement si CTA critique

## Accessibilité

- Focus ring visible (ring-2)
- Contraste texte/fond > 4.5:1
- Touch target ≥ 44px
- Keyboard navigation complète
- Screen reader friendly

## Performance

- Transitions CSS natives (pas de JS)
- GPU acceleration (transform, opacity)
- Pas de layout shift
- Hover states optimisés

## Maintenance

Fichier source : `apps/web/src/components/accueil/accueil-button.tsx`

Pour modifier les styles :
1. Éditer `VARIANT_STYLES` dans accueil-button.tsx
2. Tester sur toutes les sections
3. Vérifier accessibilité et responsive
4. Mettre à jour cette documentation


