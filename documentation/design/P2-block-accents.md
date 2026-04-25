# P2 - Système d'Accents par Bloc

## Date: 2026-04-25
## Statut: Terminé

---

## Vue d'ensemble

Système d'accents réutilisables par bloc pour maintenir la cohérence visuelle tout en permettant la personnalisation par section fonctionnelle.

---

## Charte des blocs

| Bloc | Accent | Usage |
|------|--------|-------|
| **Accueil** | slate | Homepage, navigation générale |
| **Agir** | amber | Actions, signalements, déclarations |
| **Visualiser** | sky | Cartes, données géospatiales |
| **Impact** | emerald | Métriques, rapports, KPIs |
| **Réseau** | violet | Communauté, partenaires, annuaire |
| **Apprendre** | rose | Formation, quiz, contenu éducatif |
| **Piloter** | indigo | Admin, tableaux de bord, workflows |

---

## Fichiers créés

### 1. Tokens d'accents
**`apps/web/src/lib/ui/block-accents.ts`**

```typescript
// Récupérer les tokens pour un bloc
const tokens = getBlockTokens("impact");
// { surface: "bg-emerald-50/80", border: "border-emerald-200/80", ... }

// Récupérer les classes CSS
const classes = getBlockClasses("impact");
// { surface: "bg-emerald-50/80", border: "border-emerald-200/80", ... }
```

### 2. Composant d'accent
**`apps/web/src/components/ui/cmm-block-accent.tsx`**

```tsx
// Dot indicatif
<CmmBlockAccent blockId="impact" element="dot" />

// Barre latérale
<CmmBlockAccent accent="emerald" element="bar" barPosition="left" />

// Anneau de focus
<CmmBlockAccent blockId="learn" element="ring" />

// Gradient subtil (5% max)
<CmmBlockAccent accent="sky" element="gradient" />
```

---

## Règles de la charte

### Accent = 1 des 4 éléments max
- **dot** - petit cercle indicatif (pills, headers)
- **bar** - barre latérale sur cards
- **ring** - anneau léger (focus/hover)
- **gradient** - gradient subtil 5-10% max

### Interdictions
- ❌ Glow permanent
- ❌ Blur sur texte
- ❌ Gradients saturés partout
- ❌ Plusieurs accents sur un même élément

### Autorisé
- ✅ 1 accent par card/page
- ✅ Transition subtile au hover
- ✅ Opacité réduite (60% -> 100% au hover)

---

## Usage dans les composants

### Card avec accent de bloc
```tsx
import { CmmBlockCard } from "@/components/ui/cmm-block-accent";

<CmmBlockCard blockId="impact" accentType="bar" barPosition="left">
  <h3>Mes contributions</h3>
  <p>12 actions réalisées</p>
</CmmBlockCard>
```

### Header de page avec dot
```tsx
import { CmmBlockAccent } from "@/components/ui/cmm-block-accent";

<div className="flex items-center gap-2">
  <CmmBlockAccent blockId={currentBlockId} element="dot" dotSize="md" />
  <h1>Mon Impact</h1>
</div>
```

### Composant générique avec accent
```tsx
function MyComponent({ blockId }: { blockId: BlockId }) {
  const { classes } = useBlockAccent(blockId);

  return (
    <div className={cn(classes.surface, classes.border)}>
      Contenu du bloc
    </div>
  );
}
```

---

## Intégration avec les modes d'affichage

Les accents fonctionnent dans tous les modes:

| Mode | Accent | Comportement |
|------|--------|--------------|
| Exhaustif | dot/bar/ring/gradient | Tous les effets actifs |
| Minimaliste | dot/bar | Gradient désactivé, ring réduit |
| Sobre | dot uniquement | Barre fine uniquement, pas d'animation |

---

## Exemples par bloc

### Impact (emerald)
```tsx
<CmmBlockCard blockId="impact" accentType="bar">
  <Metric value={42} unit="kg" label="CO2 évité" />
</CmmBlockCard>
```

### Visualiser (sky)
```tsx
<CmmBlockCard blockId="visualize" accentType="gradient">
  <MapView data={actions} />
</CmmBlockCard>
```

### Agir (amber)
```tsx
<CmmBlockCard blockId="act" accentType="ring">
  <ActionForm onSubmit={handleSubmit} />
</CmmBlockCard>
```

---

## API Reference

### Fonctions

| Fonction | Usage |
|----------|-------|
| `getBlockAccent(blockId)` | Récupère l'accent d'un bloc |
| `getAccentTokens(accent)` | Récupère tous les tokens pour un accent |
| `getBlockTokens(blockId)` | Récupère les tokens pour un bloc |
| `getAccentClasses(accent)` | Récupère les classes Tailwind pour un accent |
| `getBlockClasses(blockId)` | Récupère les classes pour un bloc |

### Composants

| Composant | Props | Usage |
|-----------|-------|-------|
| `CmmBlockAccent` | `accent` ou `blockId`, `element`, `hoverOnly` | Élément d'accent individuel |
| `CmmBlockCard` | `blockId`, `accentType`, `barPosition` | Card avec accent intégré |
| `useBlockAccent` | `blockId` | Hook pour récupérer les tokens |

---

## Migration guide

### Avant (styles inline)
```tsx
<section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" />
  Content
</section>
```

### Après (système d'accents)
```tsx
<CmmBlockCard blockId="impact" accentType="bar">
  Content
</CmmBlockCard>
```

---

## Tests de vérification

### Checklist
- [ ] Chaque bloc a son accent correct
- [ ] Les cards utilisent `CmmBlockCard` ou les classes de `getBlockClasses`
- [ ] Maximum 1 accent par élément
- [ ] Gradients subtils (< 10% d'opacité)
- [ ] Fonctionnement dans les 3 modes d'affichage

---

## Prochaines étapes
- P3: Polish accessibilité, densité mobile, largeur texte
