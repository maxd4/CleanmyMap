# Design System Standard : CleanMyMap

Ce document définit les standards visuels pour garantir une esthétique "Premium" cohérente sur toute la plateforme.

---

## 1. Philosophie visuelle
*   **Concepts clés** : Sobriété, Clarté, Impact.
*   **Style principal** : "Premium Glassmorphism" (Teal/Emerald accents sur fonds sombres/clairs épurés).
*   **Transitions** : Utilisation de `framer-motion` pour des micro-animations fluides.

## 2. Design Tokens (CSS Variables)
Toutes les couleurs et arrondis critiques doivent utiliser les variables globales de `apps/web/src/app/index.css` (ou équivalent).

| Token | Valeur Cible | Usage |
| :--- | :--- | :--- |
| `--color-primary` | Emerald / Teal | Boutons, liens critiques, succès. |
| `--glass-bg` | `rgba(255, 255, 255, 0.05)` | Cartes, overlays, modales. |
| `--glass-border` | `rgba(255, 255, 255, 0.1)` | Bordures subtiles. |
| `--glass-blur` | `blur(12px)` | Effet de profondeur. |

## 3. Stratégie de Styling
1.  **Tailwind CSS** : Utilisé pour la **mise en page** (flex, grid, spacing, sizing) et les états simples.
2.  **Vanilla CSS / CSS Modules** : Utilisé pour les **effets premium complexes** (gradients animés, flous de profondeur, micro-interactions) que Tailwind rend illisibles ou impossibles.

## 4. Patterns de Composants "Signature"

### Le "Glass Container"
```tsx
// Pattern standard pour une carte premium
<div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
  {content}
</div>
```

### Le Slogan Punchy (Typographie)
Utiliser la police `Outfit` avec un dégradé subtil pour les titres d'impact.
```css
.punchy-title {
  font-family: 'Outfit', sans-serif;
  background: linear-gradient(135deg, #6ee7b7, #3b82f6);
  -webkit-background-clip: text;
  color: transparent;
}
```
