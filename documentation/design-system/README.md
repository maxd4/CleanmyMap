# Design System - Gouvernance IA

Système de référence pour tout travail UI. À lire avant toute modification visuelle ou navigation.

---

## Règle de priorité

1. Le **code live** prime toujours sur la documentation.
2. Les **tokens et couleurs** vivent dans `apps/web/src/app/globals.css` et `apps/web/src/lib/ui/block-accents.ts`.
3. La **navigation et les rubriques** vivent dans `apps/web/src/lib/navigation.ts` et `apps/web/src/lib/sections-registry/config.ts`.
4. Les **composants réutilisables** vivent dans `apps/web/src/components/ui/*` et `apps/web/src/components/navigation/*`.
5. La **documentation visuelle** complète la lecture, mais ne remplace jamais le code.

Si un document contredit le code live, la source d’exécution gagne.

---

## Où chercher quoi

| Besoin | Fichier canonique |
|---|---|
| Charte UI premium | `charte-ui-pro-moderne-futuriste.md` |
| Mode d’affichage | `display-modes-chartes.md` |
| Implémentation des modes | `display-modes-implementation.md` |
| Palette par bloc / rubrique | `BLOC_COLOR_SYSTEM_PREMIUM.md` |
| Typographie | `TYPOGRAPHY_SYSTEM.md` |
| Règles de visibilité | `theme-visibility-rules.md` |
| Storytelling visuel | `VISUAL_STORYTELLING.md` |
| Animations et transitions | `ANIMATION_LIBRARY.md` |
| Curseurs | `cursor-system.md` |
| Patterns cartes / filtres / états | `patterns-cartes-filtres-etats.md` |
| Règles UI opérationnelles CleanMyMap | `cleanmymap-ui-ux-pro-max.md` |
| Guide d’usage canonique | `USAGE_GUIDE.md` |
| Planche visuelle exhaustive | `../design-system-board.dynamic.html` |
| Snapshot figé de contrôle | `../design-system-board.html` |
| Régénération | `npm run design-system:board` |

---

## Sources de vérité côté code

- `apps/web/src/app/globals.css` : tokens globaux, surfaces, blur, glow, ombres, glassmorphism.
- `apps/web/src/lib/ui/block-accents.ts` : couleurs de bloc, accents de rubrique, correspondances visuelles.
- `apps/web/src/lib/navigation.ts` : blocs visibles, libellés, ordre de navigation, accessibilité.
- `apps/web/src/lib/sections-registry/config.ts` : routes et rubriques enregistrées.
- `apps/web/src/components/ui/*` : boutons, cards, pills, inputs, panels et primitives réutilisables.
- `apps/web/src/components/navigation/*` : ruban, menus, recherche, notifications, contexte utilisateur.
- `../design-system-board.dynamic.html` : planche de référence à privilégier, générée à partir des sources canoniques.
- `../design-system-board.html` : snapshot figé, utile pour contrôle visuel et comparaison.
- `npm run design-system:board` : régénère la copie dynamique et le JSON intermédiaire.

---

## Règles d’usage

### Toujours faire

- Lire `charte-ui-pro-moderne-futuriste.md` avant toute UI.
- Utiliser les composants canoniques au lieu de recréer des primitives.
- Utiliser les classes `cmm-*` pour la typographie et les surfaces.
- Respecter les trois modes d’affichage.
- Garder les états async lisibles, stables et accessibles.
- Préserver la lisibilité mobile sans casser la densité desktop.

### Ne jamais faire

- Réintroduire des tailles arbitraires comme `text-[10px]`.
- Utiliser `font-extrabold` quand les classes canoniques suffisent.
- Utiliser `text-primary` Tailwind au lieu des tokens `cmm-text-*`.
- Traiter une page métier comme une landing page décorative.
- Laisser un formulaire sans feedback accessible.

---

## Priorité par zone

### UI opérationnelle
Pour les écrans pilotage, admin, analytics et formulaires complexes :
- privilégier les grilles, tableaux, KPI, filtres et états vides clairs;
- limiter le décor non fonctionnel;
- garder les interactions clavier et les confirmations visibles.

### UI d’exploration
Pour la home, l’explorer et les blocs :
- prioriser les cartes, les accents de bloc et les états hover / actif;
- garder la hiérarchie visuelle simple;
- aligner les couleurs sur les tokens du projet.

---

## Documents historiques

- Les anciennes notes de transition du design system ont été retirées au profit du canon actuel.
- L’historique détaillé reste accessible dans le journal de session si un besoin de traçabilité apparaît.

---

## Hors du dossier design-system

- `../ai-guides/standards-visuels.md` : standards de visuels de documentation.
- Les plans de travail ponctuels sont traités comme des artefacts temporaires, pas comme une source de vérité UI.

---

## Checklist avant livraison UI

- Charte consultée.
- Composants canoniques utilisés.
- Tokens CSS cohérents.
- Modes d’affichage respectés.
- États hover / actif / focus vérifiés.
- Pas de débordement mobile.
- Pas de doublon de source de vérité.
