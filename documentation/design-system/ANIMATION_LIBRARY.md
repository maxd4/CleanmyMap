# Bibliothèque d'Animations & Patterns Premium

Pour garantir une expérience "Premium" et fluide, CleanMyMap utilise des standards d'animation stricts basés sur **Framer Motion**. Ce document définit les constantes et les patterns à réutiliser.

## 1. Physiques (Spring Configurations)

Nous privilégions les animations "Spring" (ressort) aux courbes "Ease" pour un ressenti plus organique et réactif.

### Constantes recommandées
```ts
export const CMM_SPRING = {
  soft: { type: "spring", stiffness: 100, damping: 20 },
  standard: { type: "spring", stiffness: 260, damping: 20 },
  bouncy: { type: "spring", stiffness: 400, damping: 10 },
  stiff: { type: "spring", stiffness: 600, damping: 30 }
};
```

## 2. Patterns de Rendu

### Entrées en Scène (Staggered Children)
Utilisez toujours un délai progressif pour les listes de cartes ou les éléments de dashboard.
```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
```

### Effets de "Glow" (Lueur)
Pour souligner l'importance (Action réussie, IA détection), utilisez des animations de lueur pulsée.
```tsx
<motion.div
  animate={{ boxShadow: ["0px 0px 0px rgba(16, 185, 129, 0)", "0px 0px 20px rgba(16, 185, 129, 0.4)", "0px 0px 0px rgba(16, 185, 129, 0)"] }}
  transition={{ duration: 2, repeat: Infinity }}
/>
```

### Transitions de Pages
Toutes les transitions de pages dans `(app)` utilisent un fondu avec un léger glissement vertical.
- `initial`: `{ opacity: 0, y: 20 }`
- `animate`: `{ opacity: 1, y: 0 }`
- `exit`: `{ opacity: 0, y: -20 }`

---

## 3. Feedback Interactif (Zéro Latence Visuelle)

- **Hover** : Échelle à `1.02` et légère ombre.
- **Tap (Clic)** : Échelle à `0.98` pour simuler une pression physique.
- **Loading** : Utilisez le composant `Skeleton` avec un gradient `shimmer` animé.

---

## 4. Performance
- Utilisez `layoutId` pour les transitions d'éléments partagés (ex: passage du mode Liste au mode Graphe).
- Activez `will-change: transform` sur les éléments animés complexes.
