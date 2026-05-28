# Charte UI — Pro / Moderne / Futuriste (CleanMyMap)

Objectif : produire des interfaces **professionnelles**, **modernes** et légèrement **futuristes** (premium), sans nuire à la lisibilité ni à la performance.

Cette charte est conçue pour être appliquée rapidement dans les rubriques Next.js (Tailwind).

---

## Principes non négociables

- **Lisibilité d'abord** : contraste suffisant, texte net (éviter le flou sur les couches contenant du texte).
- **Visual Storytelling (Priorité SVG/D3)** : Si une donnée peut être visualisée (ratio, tendance, impact), utilisez un SVG ou un composant D3 plutôt que du texte brut.
- **Zéro Clavier** : Privilégiez les sélecteurs visuels, sliders et cadrans aux champs de saisie textuelle.
- **Premium sobre** : effets "glass" et dégradés uniquement en accents, jamais au détriment de l'ergonomie.
- **Rythme** : espacement cohérent (mobile dense, desktop respirant).
- **Cohérence de marque** : palette bleu/vert + touches par bloc (amber/emerald/rose/yellow/bronze/indigo/pink).

---

## Palette & Accents

### Logique de couleur par bloc

Chaque bloc a une couleur dominante structurée en trois niveaux :

1. **Fond de page** : teinte claire/lumineuse de la couleur du bloc. C'est le niveau le plus clair.
2. **Cartes et bulles** : fond à contraste élevé, dérivé de la couleur canonique du bloc, pour ressortir sur le fond de page.
3. **Titres, chiffres, sous-titres** : colorés dans la teinte de l'accent (`text-orange-100`, `text-emerald-100`, etc.).
4. **Textes** : blanc à 100% par défaut (`text-white`). Opacité réduite uniquement en exception justifiée (placeholder, état désactivé, hiérarchie secondaire explicite).

**Référence visuelle** : la page sommaire (`/`) et `accueil-pillars.tsx` sont la référence à suivre.

**Règles sur le blanc :**
- Interdit sur les surfaces et cartes neutres — les cartes de bloc doivent rester à contraste élevé et dérivées de la couleur canonique du bloc.
- Autorisé uniquement pour le texte (`text-white`).
- Les fonds de page peuvent être lumineux mais ne doivent pas dépasser ~34% de blanc dans le mix — au-delà la couleur du bloc disparaît. Si une page doit sembler plus claire, baisser la saturation ou changer la teinte, pas augmenter le blanc.

### Accents par bloc

- **Accueil** : `amber` / `orange` — fond soleil chaud, cartes `#431407`
- **Agir** : `emerald` — fond vert clair, cartes `#06261c`
- **Visualiser** : `sky` — fond bleu clair, cartes `#071827`
- **Impact** : `red` / `rose` — fond rouge clair, cartes `#3b0a0f`
- **Réseau** : `indigo` / `violet` — fond indigo clair, cartes `#04020f`
- **Apprendre** : `yellow` — fond jaune clair, cartes/bulles orange clair soleil à fort contraste
- **Piloter** : `amber` / `brun` — fond brun-orangé dense, cartes `#2c1c0f`
- **Discussion** : `pink` — fond rose clair, cartes `#490b38`

Règle : un bloc = une couleur dominante. Pas de mélange d'accents dans une même section.

---

## Typographie & micro-rythme

- **Titres / chiffres / sous-titres** : colorés dans la teinte de l'accent du bloc (`text-orange-100`, `text-emerald-100`, `text-sky-100`, etc.). Toujours `font-black` ou `font-bold`, `tracking-tight`.
- **Surtitres** : `text-[10px]` à `text-xs`, `uppercase`, `tracking-[0.18em]` à `tracking-[0.3em]`.
- **Petits textes / corps** : `text-white` à 100% par défaut. Opacité réduite uniquement en exception justifiée (placeholder, état désactivé, hiérarchie secondaire explicite).
- **Mobile** : préférer `line-clamp-1` pour descriptions utilitaires, `gap` réduit (`gap-1.5` à `gap-2.5`).

---

## Surfaces, coins, bordures, ombres

### Surfaces (cartes et bulles)

- Fond sombre teinté dans la couleur du bloc, avec `backdrop-blur-xl` si superposé sur un fond lumineux.
- Bordure légère dans la teinte de l'accent : `border-orange-200/18`, `border-emerald-200/18`, etc.
- Ombres portées dans la teinte du bloc :
  - `shadow-[0_34px_76px_-34px_rgba(7,44,27,0.72)]` (Panneaux immersifs)
  - `shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]` (Cards standard)

### Coins (arrondis)

- **Hero / grosses cards** : `rounded-[2rem]` à `rounded-[2.5rem]`
- **Cards standard** : `rounded-2xl`
- **Pills** : `rounded-full`

### Bordures

- Toujours **légères** : `border-[accent]-200/18` au repos, `border-[accent]-200/38` au hover.

---

## Flou (backdrop-blur) : règles

- **OK** sur les cartes et bulles posées sur un fond lumineux.
- **Éviter** sur les conteneurs principaux de texte si la lisibilité baisse.

---

## CTA & Boutons

### CTA Primaire

- Gradient ou fond solide dans la couleur de l'accent du bloc.
- Ombre portée dans la teinte du bloc.
- Hover : `hover:-translate-y-0.5` + intensification légère.

```tsx
className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-8 text-base font-bold text-white shadow-[0_12px_24px_-12px_rgba(234,88,12,0.6)] transition-transform hover:-translate-y-0.5"
```

### CTA Secondaire

- Fond semi-transparent sur la carte, bordure légère dans l'accent.

```tsx
className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-white/10 px-6 text-sm font-bold text-white transition-all hover:bg-white/16 hover:-translate-y-0.5"
```

---

## Navigation (ruban)

Rôle : **outil de pilotage** (pas marketing).

- Les **blocs** doivent être visibles et différenciés par couleur.
- Les **pills** actives ont un état clair (fond + bordure + ombre légère).

---

## Pages : patterns recommandés

### Pattern A — "Fond lumineux + cartes sombres" (référence : page sommaire `/`)

- Fond de page : teinte claire/lumineuse de la couleur du bloc (radial-gradient ou gradient directionnel).
- Cartes : fond sombre teinté dans la même couleur, `backdrop-blur-xl`, bordure légère dans l'accent.
- Titres et chiffres colorés dans l'accent. Textes en blanc à 100%.
- Max 1 CTA primaire + 1 secondaire par section.

### Pattern B — "Utilitaire / Plan du site"

- Densité mobile élevée.
- Hiérarchie bloc → rubriques.
- Descriptions clampées (1 ligne mobile, 2 lignes desktop).
- Sticky mini-sommaire (si liste longue).

---

## Checklist de review (rapide)

- **Lisibilité** : le texte reste net (pas de blur agressif sur le texte).
- **Contraste** : CTA primaire évident, titres colorés lisibles sur fond sombre.
- **Opacité texte** : tous les textes à 100% sauf exception documentée.
- **Densité** : mobile compact, desktop respirant.
- **Cohérence** : même langage visuel (coins, shadows, pills).
- **Accessibilité** : focus visible (`focus-visible:ring-2`), hover non indispensable.

---

## Notes d'implémentation

- Stack : Next.js + Tailwind.
- Ne pas ajouter de dépendance pour suivre cette charte.
- Préférer des classes Tailwind explicites plutôt que des abstractions prématurées.
