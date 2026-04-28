# Charte UI — Pro / Moderne / Futuriste (CleanMyMap)

Objectif : produire des interfaces **professionnelles**, **modernes** et légèrement **futuristes** (premium), sans nuire à la lisibilité ni à la performance.

Cette charte est conçue pour être appliquée rapidement dans les rubriques Next.js (Tailwind).

---

## Principes non négociables

- **Lisibilité d’abord** : contraste suffisant, texte net (éviter le flou sur les couches contenant du texte).
- **Visual Storytelling (Priorité SVG/D3)** : Si une donnée peut être visualisée (ratio, tendance, impact), utilisez un SVG ou un composant D3 plutôt que du texte brut.
- **Zéro Clavier** : Privilégiez les sélecteurs visuels, sliders et cadrans aux champs de saisie textuelle.
- **Premium sobre** : effets “glass” et dégradés uniquement en accents, jamais au détriment de l’ergonomie.
- **Hiérarchie claire** : 1 action primaire, 1 secondaire, le reste utilitaire.
- **Rythme** : espacement cohérent (mobile dense, desktop respirant).
- **Cohérence de marque** : palette bleu/vert + touches par bloc (amber/sky/emerald/violet/rose/indigo).

---

## Palette & Accents (Sombre Douce)

### Palette de base (Direction Unique)

- **Fond principal** : `slate-950` (#020617).
- **Surfaces immersives** : `slate-900/60` à `slate-900/80` avec `backdrop-blur-xl`.
- **Accents dominants** : `emerald-500` (vitalité/nature) et `cyan-400` (technologie/pureté).
- **Bannir le blanc** : Ne jamais utiliser de fonds blancs ou gris très clairs pour les surfaces. Le blanc est réservé uniquement au texte (`slate-50`).

### Accents par bloc (Identité visuelle)
Chaque bloc conserve une touche subtile en accents (bordures, glows) pour son identité propre dans l'écrin sombre :
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
- **Paragraphes** : `font-medium` / `cmm-text-secondary` (text-slate-300/400) sur fond sombre. Jamais de texte noir sur fond blanc. `leading-[1.6]` à `leading-[1.7]`.
- **Mobile** : préférer `line-clamp-1` pour descriptions utilitaires, `gap` réduit (`gap-1.5` à `gap-2.5`).

---

## Surfaces, coins, bordures, ombres

### Surfaces “glass” (Dark Premium)

- `bg-slate-900/40` à `bg-slate-900/80` + `backdrop-blur-xl`.
- `border border-white/5` ou `border-slate-800`.
- Ombres profondes et sombres :
  - `shadow-[0_48px_96px_-24px_rgba(0,0,0,0.8)]` (Panneaux immersifs)
  - `shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]` (Cards standard)

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

## CTA & Boutons

### CTA Primaire (Vibrant)
- Fond solide (`emerald-600` ou `amber-600`).
- Ombre portée forte (`shadow-lg shadow-emerald-900/20`).
- Hover : `scale-[1.02]` + intensification du glow.

```tsx
className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 text-base font-black text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-500 active:scale-95"
```

### CTA Secondaire (Glass)
- Bordure fine + fond translucide.

```tsx
className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/40 px-7 text-sm font-extrabold uppercase tracking-wider text-slate-300 backdrop-blur-md transition hover:bg-slate-800 hover:text-white"
```

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
