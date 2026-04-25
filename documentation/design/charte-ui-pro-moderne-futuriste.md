# Charte UI — Pro / Moderne / Futuriste (CleanMyMap)

Objectif : produire des interfaces **professionnelles**, **modernes** et légèrement **futuristes** (premium), sans nuire à la lisibilité ni à la performance.

Cette charte est conçue pour être appliquée rapidement dans les rubriques Next.js (Tailwind).

---

## Principes non négociables

- **Lisibilité d’abord** : contraste suffisant, texte net (éviter le flou sur les couches contenant du texte).
- **Premium sobre** : effets “glass” et dégradés uniquement en accents, jamais au détriment de l’ergonomie.
- **Hiérarchie claire** : 1 action primaire, 1 secondaire, le reste utilitaire.
- **Rythme** : espacement cohérent (mobile dense, desktop respirant).
- **Cohérence de marque** : palette bleu/vert + touches par bloc (amber/sky/emerald/violet/rose/indigo).

---

## Palette & accents

### Palette de base (recommandée)

- **Fond sombre brand** : `#0b1f3a` → `#0d5570` → `#0d6e50` (hero homepage).
- **Accents** : `cyan`, `emerald`, `sky`, `indigo` (glows et bordures).
- **Neutres** : `slate` pour les surfaces et textes.

### Couleurs par bloc (navigation)

- **Accueil** : `slate`
- **Agir** : `amber`
- **Visualiser** : `sky`
- **Impact** : `emerald`
- **Réseau** : `violet`
- **Apprendre** : `rose`
- **Piloter** : `indigo`

Règle : un bloc = une couleur dominante + neutres `slate`.

---

## Typographie & micro-rythme

- **Titres** : `font-black`, `tracking-tight`, `leading-[0.95]` (hero) ou `leading-tight` (rubriques).
- **Surtitres** : `text-[10px]` à `text-xs`, `uppercase`, `tracking-[0.18em]` à `tracking-[0.3em]`.
- **Paragraphes** : `font-light` / `text-white/90` sur fond sombre, `text-slate-600` sur fond clair, `leading-[1.6]` à `leading-[1.7]`.
- **Mobile** : préférer `line-clamp-1` pour descriptions utilitaires, `gap` réduit (`gap-1.5` à `gap-2.5`).

---

## Surfaces, coins, bordures, ombres

### Surfaces “glass” (premium)

Utiliser sur hero / rubans / panneaux importants, pas partout :

- `bg-white/[0.06]` + `backdrop-blur-xl` (ou `2xl` si nécessaire)
- `border border-white/10` (ou `border-slate-200/70` sur clair)
- Ombres profondes mais contrôlées :
  - `shadow-[0_32px_64px_-12px_rgba(0,0,0,0.45)]` (hero)
  - `shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)]` (panneaux)

### Coins (arrondis)

- **Hero / grosses cards** : `rounded-[2.5rem]`
- **Cards standard** : `rounded-2xl`
- **Pills** : `rounded-full`

### Bordures

- Toujours **légères** : `border-slate-200/70` / `border-white/10`.
- Accent au hover : `hover:border-emerald-200` (ou couleur de bloc).

---

## Flou (backdrop-blur) : règles

- **OK** sur les fonds, overlays, backgrounds décoratifs.
- **Éviter** sur les conteneurs principaux de texte (navigation, listes utilitaires) si la lisibilité baisse.
- Si blur nécessaire, préférer :
  - surfaces opaques `bg-white/95` + blur léger (`backdrop-blur`) plutôt qu’un blur fort sur texte.

---

## CTA & boutons

### CTA primaire

- Très lisible, contraste fort.
- Hover : léger lift `hover:-translate-y-1` + ombre plus profonde.

Exemple (primaire clair) :

```tsx
className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-8 text-base font-black text-blue-900 shadow-[0_8px_32px_-6px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-8px_rgba(0,0,0,0.5)] active:translate-y-0"
```

### CTA secondaire “premium”

- Bordure + fond translucide, plus discret.

```tsx
className="inline-flex h-14 items-center justify-center rounded-2xl border border-white/25 bg-white/8 px-7 text-sm font-extrabold uppercase tracking-wider text-white transition hover:bg-white/15"
```

### CTA utilitaire

- Petit, neutre, stable.
- Pas de gros gradients.

---

## Navigation (ruban)

Rôle : **outil de pilotage** (pas marketing).

- Les **blocs** doivent être visibles et différenciés par couleur.
- Les **pills** actives ont un état clair (fond + bordure + ombre légère).
- Les menus (Réglages / Rôle) suivent la charte :
  - fond dégradé subtil (`from-white to-slate-50`)
  - coins `rounded-3xl`
  - ombre `shadow-2xl`

---

## Pages : patterns recommandés

### Pattern A — “Vitrine premium” (Homepage)

- Background multi-couches (gradient directionnel + glow radial + grain léger).
- Card glassmorphism contenant titre + slogan en pastille + 2 CTA primaires + 2 secondaires max.
- Texte narratif court, orienté impact.

### Pattern B — “Utilitaire / Plan du site”

- Densité mobile élevée.
- Hiérarchie bloc → rubriques.
- Descriptions clampées (1 ligne mobile, 2 lignes desktop).
- Sticky mini-sommaire (si liste longue).

---

## Checklist de review (rapide)

- **Lisibilité** : le texte reste net (pas de blur agressif).
- **Contraste** : CTA primaire évident.
- **Densité** : mobile compact, desktop respirant.
- **Cohérence** : même langage visuel (coins, shadows, pills).
- **Accessibilité** : focus visible (`focus-visible:ring-2`), hover non indispensable.

---

## Notes d’implémentation

- Stack : Next.js + Tailwind.
- Ne pas ajouter de dépendance pour suivre cette charte.
- Préférer des classes Tailwind explicites plutôt que des abstractions prématurées.

