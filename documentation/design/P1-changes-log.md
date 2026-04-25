# Log des Changements P1 - Audit UI/UX

## Date: 2026-04-25
## Statut: Terminé

---

## Résumé des actions P1

### Objectif: Homogénéisation des composants UI

Création d'une bibliothèque de composants canoniques et refactorisation des templates existants pour utiliser ces composants.

---

## 1. Composants canoniques créés

### CmmCard (`apps/web/src/components/ui/cmm-card.tsx`)

Card standardisée avec support des tons, variantes et tailles.

```tsx
<CmmCard
  tone="slate" | "emerald" | "sky" | "amber" | "violet" | "rose"
  variant="default" | "elevated" | "muted" | "outlined"
  size="sm" | "md" | "lg"
  header="string" | ReactNode
/>
```

**Usage:**
```tsx
<CmmCard tone="emerald" variant="elevated" size="lg" header="Titre">
  Contenu
</CmmCard>
```

### CmmButton (`apps/web/src/components/ui/cmm-button.tsx`)

Bouton standardisé avec support Link et button natif.

```tsx
<CmmButton
  href="/path" | onClick={() => {}}
  tone="primary" | "secondary" | "muted"
  size="sm" | "md" | "lg"
  variant="default" | "pill" | "ghost"
/>
```

**Usage:**
```tsx
<CmmButton href="/action" tone="primary">Label</CmmButton>
<CmmButton onClick={handle} tone="secondary" variant="pill">Label</CmmButton>
```

**CmmButtonGroup:**
```tsx
<CmmButtonGroup>
  <CmmButton ... />
  <CmmButton ... />
</CmmButtonGroup>
```

### CmmPill (`apps/web/src/components/ui/cmm-pill.tsx`)

Pill/Tag standardisé.

```tsx
<CmmPill
  tone="slate" | "emerald" | "sky" | "amber" | "violet" | "muted"
  size="sm" | "md"
  uppercase={true}
/>
```

**Usage:**
```tsx
<CmmPill tone="slate" size="sm">Tag</CmmPill>
```

**CmmPillGroup:**
```tsx
<CmmPillGroup>
  <CmmPill ... />
  <CmmPill ... />
</CmmPillGroup>
```

---

## 2. Templates refactorisés

### PageReadingTemplate
**Fichier**: `apps/web/src/components/ui/page-reading-template.tsx`

**Changements:**
- Remplacement des `<section className="rounded-2xl border...">` par `<CmmCard>`
- Remplacement des `<Link>` boutons par `<CmmButton>`
- Harmonisation des tons: slate (header/summary), emerald (actions), sky (analysis), amber (trace)
- Conservation des classes `core-feature` pour mode simplifié

**Avant:**
```tsx
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <Link className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50...">
```

**Après:**
```tsx
<CmmCard tone="slate" variant="elevated" size="lg">
  <CmmButton href={...} tone="primary">
```

### DecisionPageHeader
**Fichier**: `apps/web/src/components/ui/decision-page-header.tsx`

**Changements:**
- Remplacement du `<section>` par `<CmmCard tone="slate" variant="elevated" size="lg">`
- Remplacement des spans pills par `<CmmPill>`
- Remplacement des `<Link>` boutons par `<CmmButton>` dans `<CmmButtonGroup>`

### SectionShell & RubriqueBlock
**Fichier**: `apps/web/src/components/sections/rubriques/shared.tsx`

**Changements:**
- `RubriqueBlock`: Refactor en wrapper de `<CmmCard>` avec header
- `SectionShell`: Remplacement du shell par `<CmmCard>`
- `NotFoundSection`: Remplacement par `<CmmCard tone="rose">`
- `PendingSection`: Remplacement par `<CmmCard tone="amber">` avec `<CmmButtonGroup>`

---

## 3. Avantages obtenus

1. **Cohérence visuelle**: Tous les composants utilisent les mêmes tokens et spacing
2. **Maintenance simplifiée**: Changements design = modification d'un seul composant
3. **Tokens sémantiques**: Les composants utilisent les CSS variables (--bg-elevated, etc.)
4. **Accessibilité**: Focus rings et contrastes cohérents
5. **TypeScript**: Typage complet avec autocomplétion

---

## 4. Migration guide

Pour migrer un composant existant:

```tsx
// AVANT
<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <h3>Titre</h3>
  <Link href="/" className="inline-flex rounded-lg border border-emerald-300...">
    Action
  </Link>
</section>

// APRÈS
<CmmCard tone="slate" header="Titre">
  <CmmButton href="/" tone="primary">Action</CmmButton>
</CmmCard>
```

---

## 5. Prochaines étapes recommandées

- P2: Personnalisation par bloc avec accents réutilisables
- P3: Polish accessibilité, densité mobile, largeur texte
