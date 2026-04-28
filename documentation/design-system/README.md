# Design System - Guide IA

Système de design pour agents IA. **TOUJOURS consulter avant toute modification UI.**

---

## 🎨 Fichiers Essentiels pour IA

### Charte Visuelle (PRIORITÉ ABSOLUE)
- **charte-ui-pro-moderne-futuriste.md** - Charte UI complète
- **VISUAL_STORYTELLING.md** - Priorité aux visuels sur le texte
- **principes-visuels.md** - Principes de base

### Composants Canoniques (OBLIGATOIRE)
- **design-system.md** - Composants à utiliser
- **USAGE_GUIDE.md** - Guide d'utilisation

### Modes d'Affichage
- **display-modes-chartes.md** - 3 modes : exhaustif, minimaliste, sobre
- **display-modes-implementation.md** - Implémentation technique
- **theme-visibility-rules.md** - Règles de visibilité

### Typographie
- **TYPOGRAPHY_SYSTEM.md** - Système typographique complet
- **standards-visuels.md** - Standards visuels

### Animations & Interactions
- **ANIMATION_LIBRARY.md** - Bibliothèque d'animations
- **cursor-system.md** - Système de curseurs
- **THEME_SOMBRE_DOUCE.md** - Thème sombre

### Patterns
- **patterns-cartes-filtres-etats.md** - Patterns cartes/filtres/états

---

## 🤖 Règles Strictes pour IA

### ✅ TOUJOURS FAIRE

1. **Lire la charte avant toute UI**
   ```
   Fichier: charte-ui-pro-moderne-futuriste.md
   ```

2. **Utiliser les composants canoniques**
   ```tsx
   // ✅ BON
   import { CmmCard } from '@/components/ui/cmm-card';
   import { CmmButton } from '@/components/ui/cmm-button';
   
   // ❌ MAUVAIS
   import { Card } from 'shadcn';
   ```

3. **Utiliser les classes typographiques**
   ```tsx
   // ✅ BON
   <h1 className="cmm-text-h1 cmm-text-primary">
   
   // ❌ MAUVAIS
   <h1 className="text-[24px] font-extrabold">
   ```

4. **Respecter les modes d'affichage**
   ```tsx
   const { displayMode } = useSitePreferences();
   // exhaustif | minimaliste | sobre
   ```

### ❌ NE JAMAIS FAIRE

1. **Ne pas utiliser de tailles arbitraires**
   ```tsx
   // ❌ INTERDIT
   className="text-[10px] text-[11px]"
   
   // ✅ UTILISER
   className="cmm-text-small cmm-text-caption"
   ```

2. **Ne pas utiliser font-extrabold**
   ```tsx
   // ❌ INTERDIT
   className="font-extrabold"
   
   // ✅ UTILISER
   className="cmm-text-h1" // déjà bold
   ```

3. **Ne pas utiliser text-primary de Tailwind**
   ```tsx
   // ❌ INTERDIT (conflit Tailwind v4)
   className="text-primary"
   
   // ✅ UTILISER
   className="cmm-text-primary"
   ```

---

## 📊 Workflow IA pour UI

```
1. Lire charte-ui-pro-moderne-futuriste.md
   ↓
2. Consulter VISUAL_STORYTELLING.md (priorité visuels)
   ↓
3. Utiliser composants de design-system.md
   ↓
4. Appliquer typographie de TYPOGRAPHY_SYSTEM.md
   ↓
5. Respecter display-modes-chartes.md
   ↓
6. Valider avec USAGE_GUIDE.md
```

---

## 🎯 Composants Canoniques

```tsx
// Cards
import { CmmCard } from '@/components/ui/cmm-card';

// Buttons
import { CmmButton } from '@/components/ui/cmm-button';

// Typography - Classes CSS
cmm-text-h1, cmm-text-h2, cmm-text-h3, cmm-text-h4
cmm-text-body, cmm-text-small, cmm-text-caption

// Colors - Classes CSS
cmm-text-primary, cmm-text-secondary, cmm-text-muted, cmm-text-inverse

// Surfaces - Classes CSS
cmm-surface, cmm-surface-muted, cmm-panel, cmm-card
```

---

## 🚨 Checklist Avant Commit UI

```
□ Charte consultée
□ Composants canoniques utilisés
□ Classes cmm-* utilisées (pas text-[Xpx])
□ Pas de font-extrabold
□ Pas de text-primary (Tailwind)
□ Display modes respectés
□ Visuels prioritaires sur texte
```

---

**Optimisé pour** : Agents IA  
**Priorité** : CRITIQUE - Lire avant toute modification UI  
**Dernière mise à jour** : 2025-01-XX
