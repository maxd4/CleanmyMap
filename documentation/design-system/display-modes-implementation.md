# Implémentation des 3 Modes d'Affichage

## Date: 2026-04-25
## Statut: Terminé

---

## Vue d'ensemble

Les 3 modes d'affichage distincts sont maintenant implémentés avec des chartes graphiques clairement définies:

| Mode | Icône | Usage | Philosophie |
|------|-------|-------|-------------|
| **◆ Exhaustif** | Diamant plein | Vitrine, landing | Premium complet avec effets |
| **◇ Minimaliste** | Diamant vide | Utilitaire quotidien | Essentiel stylé sans excès |
| **□ Sobre** | Carré | Accessibilité cognitive | Statique, sans stimulation |

---

## Fichiers modifiés/créés

### 1. Types et constantes
**Fichier**: `apps/web/src/lib/ui/preferences.ts`

```typescript
export const DISPLAY_MODES = ["exhaustif", "minimaliste", "sobre"] as const;
```

### 2. Styles CSS
**Fichier**: `apps/web/src/app/globals.css`

Sections ajoutées:
- `[data-display-mode="exhaustif"]` - défaut (aucune règle spécifique)
- `[data-display-mode="minimaliste"]` - fond uni, ombres soft, pas de blur
- `[data-display-mode="sobre"]` - aucun effet, statique, contrastes élevés

### 3. Composant background
**Fichier**: `apps/web/src/components/ui/vibrant-background.tsx`

- Mesh gradients: classe `exhaustive-only`
- Grain: classe `minimal-only`
- Grid pattern: visible tous modes

### 4. Contrôles utilisateur
**Fichier**: `apps/web/src/components/ui/site-preferences-controls.tsx`

Sélecteur mis à jour avec:
- ◆ Exhaustif / ◆ Exhaustive
- ◇ Minimaliste / ◇ Minimalist
- □ Sobre / □ Calm

---

## Classes CSS par mode

### Mode Exhaustif (défaut)
```css
/* Toutes les classes fonctionnent normalement */
.premium-card        /* Glassmorphism complet */
.cmm-surface         /* Avec blur */
.cmm-card            /* Radius 1.25rem */
```

### Mode Minimaliste
```css
/* Classes spécifiques */
.cmm-minimal         /* Surface sans blur, ombre soft */
.cmm-minimal-animate /* Transitions douces uniquement */
.cmm-minimal-text    /* Texte sans gradient */
.cmm-minimal-hover   /* Hover sans transform */

/* Masquage conditionnel */
.exhaustive-only { display: none; }  /* Masqué en minimaliste */
.minimal-only    /* Visible en minimaliste uniquement */
```

### Mode Sobre
```css
/* Classes spécifiques */
.cmm-sober           /* Radius réduit, no shadow, no blur */
.cmm-sober-animate   /* Aucune animation */
.cmm-sober-text      /* Texte plat */
.cmm-sober-hover     /* Hover bordure uniquement */
.cmm-sober-focus     /* Focus visible simple */

/* Masquage conditionnel */
.exhaustive-only,
.minimal-only { display: none !important; }
.sober-only          /* Visible en sobre uniquement */
```

---

## Usage dans les composants

### Masquer un élément décoratif
```tsx
// Élément visible uniquement en mode exhaustif
<div className="exhaustive-only">
  <FancyAnimation />
</div>

// Élément visible en exhaustif + minimaliste
<div className="minimal-only">
  <SubtleTexture />
</div>
```

### Appliquer un style conditionnel
```tsx
// Card adaptative
<CmmCard 
  className={cn(
    "cmm-card",
    displayMode === "minimaliste" && "cmm-minimal",
    displayMode === "sobre" && "cmm-sober"
  )}
>
```

### Hook React
```tsx
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

function MyComponent() {
  const { displayMode } = useSitePreferences();
  // displayMode: "exhaustif" | "minimaliste" | "sobre"
  
  return (
    <div className={displayMode === "sobre" ? "cmm-sober" : ""}>
      Content
    </div>
  );
}
```

---

## Tokens CSS impactés par mode

| Token | Exhaustif | Minimaliste | Sobre |
|-------|-----------|-------------|-------|
| `--shadow-soft` | ✓ | ✓ | ✗ (none) |
| `--shadow-elevated` | ✓ | soft | ✗ (none) |
| `--shadow-vibrant` | ✓ | soft | ✗ (none) |
| `--glass-blur` | blur(16px) | none | none |
| `--glass-bg` | 0.7 opacity | 0.95 opacity | =background |
| `--bg-elevated` | rgba | rgba | =background |
| `--bg-muted` | rgba | rgba | =background |

---

## Migration depuis l'ancien système

Ancien système:
- `exhaustif`
- `sobre`
- `simplifie` (radical accessible)

Nouveau système:
- `exhaustif` (inchangé)
- `minimaliste` (nouveau - entre les deux)
- `sobre` (remplace `simplifie`)

**Note**: Le mode `simplifie` a été renommé en `sobre`. Les utilisateurs avec `simplifie` enregistré seront automatiquement migrés vers `sobre` au prochain changement.

---

## Tests recommandés

### Mode Exhaustif
- [ ] Mesh gradients visibles et animés
- [ ] Glassmorphism sur cards
- [ ] Ombres en 3 niveaux
- [ ] Animations fluides

### Mode Minimaliste
- [ ] Fond uni (pas de mesh)
- [ ] Cards sans blur mais stylées
- [ ] Ombres soft uniquement
- [ ] Pas d'animations complexes

### Mode Sobre
- [ ] Fond strictement uni
- [ ] AUCUN blur
- [ ] AUCUNE ombre
- [ ] AUCUNE animation
- [ ] Radius réduit à 0.75rem max
- [ ] Contrastes élevés

---

## Documentation liée
- `documentation/design/display-modes-chartes.md` - Chartes détaillées
- `documentation/design/P0-changes-log.md` - Log P0
- `documentation/design/P1-changes-log.md` - Log P1
