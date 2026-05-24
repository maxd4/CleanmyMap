# Design System - Guide IA

Système de design pour agents IA. **TOUJOURS consulter avant toute modification UI.**

---

## 🎨 Fichiers Essentiels pour IA

### Charte Visuelle (PRIORITÉ ABSOLUE)
- **charte-ui-pro-moderne-futuriste.md** - Charte UI complète
- **BLOC_COLOR_SYSTEM_PREMIUM.md** - Système de couleurs par bloc (5 blocs, multi-teintes)
- **UI_EXCEPTION_PAGES.md** - Exceptions UI, familles autonomes et matrice exhaustive des routes
- **VISUAL_STORYTELLING.md** - Priorité aux visuels sur le texte
- **principes-visuels.md** - Principes de base
- **design-system.md** - Contient la palette officielle par bloc (Accents)

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

### Patterns
- **patterns-cartes-filtres-etats.md** - Patterns cartes/filtres/états
- **cleanmymap-ui-ux-pro-max.md** - Synthèse CleanMyMap des règles UI/UX Pro Max

---

## 🤖 Règles Strictes pour IA

### Priorité opérationnelle CleanMyMap

Avant toute modification UI sur une page métier, lire aussi :
`cleanmymap-ui-ux-pro-max.md`

Objectif :
- garder une UI dense mais lisible
- sécuriser les formulaires et états asynchrones
- éviter les décalages de layout
- maintenir une navigation clavier correcte
- conserver une ergonomie robuste sur mobile et desktop

### ✅ TOUJOURS FAIRE

1. **Lire la charte avant toute UI**
   ```
   Fichiers: charte-ui-pro-moderne-futuriste.md
            BLOC_COLOR_SYSTEM_PREMIUM.md (couleurs par bloc)
   ```

2. **Utiliser les composants canoniques**
   ```tsx
   // ✅ BON
   import { CmmCard } from '@/components/ui/cmm-card';
   import { CmmButton } from '@/components/ui/cmm-button';
   
   // ❌ MAUVAIS
   import { Card } from 'shadcn';
   ```

3. **Utiliser les classes typographiques ET les teintes appropriées**
   ```tsx
   // ✅ BON - Vérifier la teinte selon le type de page
   // Page accueil → amber/orange
   <h1 className="cmm-text-h1 text-orange-100">
   
   // Page pilotage → amber/brun
   <h1 className="cmm-text-h1 text-orange-100"> {/* fond brun */}
   
   // ❌ MAUVAIS
   <h1 className="text-[24px] font-extrabold">
   ```

4. **Respecter les modes d'affichage**
   ```tsx
   const { displayMode } = useSitePreferences();
   // exhaustif | minimaliste | sobre
   ```

5. **Traiter les écrans de pilotage et les familles autonomes comme des surfaces opérationnelles**
   ```text
   Utiliser grilles, tableaux, KPI, filtres, états vides et confirmations claires.
   Eviter les compositions marketing ou les cartes décoratives inutiles.
   ```

6. **Respecter la logique multi-teintes par bloc**
   ```text
   Bloc "Accueil & Pilotage" :
   - Pages accueil (/dashboard, /profil) → amber/orange
   - Pages pilotage (/pilotage, /sponsor-portal, /elus) → amber/brun
   - Sommaire (/explorer) → exception validée, palette dédiée conservée
   - Méthodologie (/methodologie) → exception verte, palette homepage conservée
   - Admin & Super-admin (/admin, /admin/forms, /admin/services, /admin/godmode) → famille autonome
   - Auth & Onboarding (/sign-in, /sign-up, /onboarding, /onboarding/localisation) → famille autonome
   - Institutionnel & Légal (/contact, /conditions-*, /mentions-legales, /politique-*, /en) → famille autonome
   - Système & Utilitaires (/reglages, /form-comparison, /declaration-simple, /preview/actions/new, /error/429) → famille autonome
   - Print & Export (/prints/report) → famille autonome
   
   Bloc "Cartographie & Impact" :
   - Pages carto (/actions/map, /sandbox) → sky
   - Pages impact (/reports, /gamification) → red
   
   Voir BLOC_COLOR_SYSTEM_PREMIUM.md pour le mapping complet.
   ```

7. **Stabiliser les interactions**
   ```text
   Réserver l'espace des contenus asynchrones.
   Afficher un état de chargement explicite.
   Désactiver les actions pendant les soumissions async.
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

4. **Ne pas traiter une page métier comme une landing page**
   ```text
   Pas de hero décoratif sur les surfaces admin, validation, analytics, formulaires complexes.
   ```

5. **Ne pas mélanger les teintes d'un même bloc**
   ```text
   Une page = une teinte dominante.
   Ne pas utiliser orange ET brun sur la même page.
   Ne pas utiliser sky ET red sur la même page.
   ```

6. **Ne pas laisser un formulaire sans feedback accessible**
   ```text
   Les erreurs doivent être lisibles, proches du champ, et annoncées pour les lecteurs d'écran.
   ```

---

## 🎨 Système de Couleurs (5 Blocs)

### Structure Homepage

```
01. Accueil & Pilotage → amber/orange (accueil) + amber/brun (pilotage)
02. Agir → emerald
03. Cartographie & Impact → sky (carto) + red (impact)
04. Réseau & Discussions → indigo (réseau) + pink (discussion)
05. Apprendre → yellow
```

### Mapping Rubrique → Teinte

**Bloc "Accueil & Pilotage"**
- `/dashboard`, `/profil` → `amber`/`orange`
- `/pilotage`, `/sponsor-portal`, `/elus` → `amber`/`brun`
- `/explorer` → exception validée, palette Sommaire conservée
- `/methodologie` → exception validée, palette verte homepage conservée

**Familles autonomes**
- Auth & Onboarding → `/sign-in`, `/sign-up`, `/onboarding`, `/onboarding/localisation`
- Institutionnel & Légal → `/contact`, `/conditions-*`, `/mentions-legales`, `/politique-*`, `/en`
- Système & Utilitaires → `/reglages`, `/form-comparison`, `/declaration-simple`, `/preview/actions/new`, `/error/429`
- Admin & Super-admin → `/admin`, `/admin/forms`, `/admin/services`, `/admin/godmode`
- Print & Export → `/prints/report`

**Bloc "Cartographie & Impact"**
- `/actions/map`, `/sandbox` → `sky`
- `/reports`, `/gamification` → `red`/`rose`

**Autres blocs (teinte unique)**
- Agir → `emerald`
- Réseau & Discussions → `indigo` / `pink`
- Apprendre → `yellow`

**Référence complète** : `BLOC_COLOR_SYSTEM_PREMIUM.md`

---

## 📊 Workflow IA pour UI

```
1. Lire charte-ui-pro-moderne-futuriste.md
   ↓
2. Consulter BLOC_COLOR_SYSTEM_PREMIUM.md (couleurs par bloc)
   ↓
3. Consulter VISUAL_STORYTELLING.md (priorité visuels)
   ↓
4. Utiliser composants de design-system.md
   ↓
5. Appliquer typographie de TYPOGRAPHY_SYSTEM.md
   ↓
6. Respecter display-modes-chartes.md
   ↓
7. Valider avec USAGE_GUIDE.md
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
□ BLOC_COLOR_SYSTEM_PREMIUM.md consulté
□ Teinte appropriée selon type de page (mapping rubrique → teinte)
□ Composants canoniques utilisés
□ Classes cmm-* utilisées (pas text-[Xpx])
□ Pas de font-extrabold
□ Pas de text-primary (Tailwind)
□ Display modes respectés
□ Visuels prioritaires sur texte
□ Etats async visibles et stables
□ Navigation clavier vérifiée
□ Pas de scroll horizontal mobile
□ Pas de mélange de teintes sur une même page
``` 

---

**Optimisé pour** : Agents IA  
**Priorité** : CRITIQUE - Lire avant toute modification UI  
**Dernière mise à jour** : 2025-01-XX
