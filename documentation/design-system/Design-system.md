# Design system — CleanMyMap

> **Type :** spécification transversale `CURRENT`.
> Cette vue relie les contrats spécialisés sans remplacer leurs tokens,
> composants ou validations propriétaires.

## 1. Objectif de l'interface

Une expérience cohérente entre pages et familles de contenus, lisible sur mobile comme desktop, riche sans surcharge décorative, et accessible dans les trois modes réellement disponibles. La couleur communique la famille et la hiérarchie ; l'espace, les composants et le mouvement restent cohérents entre rubriques.

**Sources runtime prioritaires :** primitives `Cmm*`, composants partagés, CSS dans `apps/web/src/styles/`, registre de marque et registre des familles. Les dimensions exactes, couleurs hexadécimales, bordures et animations ne sont pas réinventées ici.

## 2. Sources canoniques à réutiliser

| Responsabilité | Contrat actuel | Application attendue |
|---|---|---|
| Couleur par bloc | `BLOC_COLOR_SYSTEM_PREMIUM.md` | Fond clair de famille, cartes contrastées, hiérarchie des CTA |
| En-tête de page | `PAGE_HEADER.md` | `PageHeader` et un seul système titre/sous-titre |
| Grille globale | `LAYOUT_SPACING.md` | `CmmPageLayout`, chrome global et niveaux de largeur |
| Actions | `ACTIONS_BUTTONS.md` | `CmmButton` et `CmmButtonGroup` |
| Formulaires | `FORMS_CONTROLS.md` | Champs, labels, erreurs, états et contrôles accessibles |
| Surfaces | `SURFACES_CARDS.md` | Card/surface selon leur rôle sémantique |
| États | `STATES_FEEDBACK.md` | Chargement, vide, succès, erreur et feedback |
| Motion | `MOTION_TRANSITIONS.md` | Transitions et respect reduced motion |
| Icônes | `ICONS.md` | `CmmIcon`, sans glyphes indépendants arbitraires |
| Marque | `BRAND.md` | `BrandLogo` et registre `brand-assets.ts` |
| Modes | `DISPLAY_MODES_CANONICAL.md` | `exhaustif`, `minimaliste`, `sobre` |
| Thème/contraste | `theme-visibility-rules.md` | Lisibilité selon mode/surface |
| Indicateurs | `DATA_DISPLAY_TABLES_KPI.md` | Valeurs, unités, couverture et provenance |

## 3. Composition d'une page web

```text
Chrome global (navigation supérieure)
  └── Contenu dans le shell / largeur canonique
      ├── PageHeader (h1, sous-titre, couleur par famille)
      ├── Action principale + actions secondaires
      ├── Contenu : surface, liste, carte, formulaire ou indicateurs
      └── États et feedback contextuels
Chrome global (ruban inférieur)
```

Le chrome global subsiste y compris sur les pages d'authentification et d'onboarding. Une page ne doit pas placer une surface plein viewport au-dessus du header/footer pour imiter une maquette.

**Composants :** préférer les primitives `Cmm*` plutôt que des classes Tailwind locales réinventant couleurs, espacements, boutons ou états. Les pages gardent la responsabilité du contenu, pas d'un design system parallèle.

## 4. Couleurs et hiérarchie

La documentation actuelle définit notamment :

- **Accueil et Pilotage :** orange et brun combinés.
- **Agir :** famille verte/émeraude.
- **Cartographie :** famille ciel.
- **Impact :** famille rouge.
- **Réseau et Discussions :** rose/indigo selon sous-famille.
- **Apprendre :** jaune/ambre.
- **Partenaires et données :** indigo/violet selon la rubrique.

La hiérarchie canonique des actions est décrite comme **doré/brun > violet > vert > blanc**, indépendamment du `tone` sémantique choisi sur `CmmButton`. Ne jamais traduire cela en palette arbitraire page par page.

Pour le texte conçu comme blanc ou noir, les surfaces du design system imposent le contraste exact prescrit ; éviter d'utiliser une opacité décorative qui dégrade la lecture. Les états disabled/placeholder restent des exceptions sémantiques contrôlées.

## 5. Boutons et actions

Utiliser `CmmButton` :

```tsx
<CmmButton tone="primary" size="md" variant="default" loading={isPending}>
  Enregistrer
</CmmButton>
```

API publiée : `tone=primary|secondary|tertiary|important|critical|destructive`, `size=sm|md|lg`, `variant=default|pill|ghost`, `width=auto|wide`. Hauteurs documentées : 40 / 44 / 48 px. Le composant gère l'état de chargement, l'accessibilité et l'impossibilité d'activer un lien disabled. Les CTA destructifs restent explicitement destructifs, non décoratifs.

Une page montre un choix prioritaire identifiable, puis les alternatives utiles. Les actions de navigation et les mutations doivent rester distinguables.

## 6. Modes d'affichage réels

| Mode | Comportement | Ce qu'il ne fait pas |
|---|---|---|
| `exhaustif` | Présentation complète par défaut | N'ajoute pas de permissions |
| `minimaliste` | Simplification des fonds et effets décoratifs | Ne supprime pas de contenu métier |
| `sobre` | Police système, surfaces unies, absence d'ombres décoratives, motion neutralisée | Ne change pas les fonctionnalités |

Le parsing canonique est dans `apps/web/src/lib/ui/preferences.ts` ; les adaptations dans `apps/web/src/styles/display-modes.css`. Toute autre valeur revient à `exhaustif` selon le contrat CURRENT.

La préférence `prefers-reduced-motion` a priorité sur la présentation animée. Ne pas faire de ce réglage un quatrième mode, ni supposer qu'il change automatiquement le mode global.

## 7. Feedback, formulaires et données

- **Chargement :** le composant maintient sa place et prévient de l'opération sans double soumission.
- **Erreur :** message actionnable, à proximité de la cause, sans information interne sensible.
- **Vide :** distinguer véritable absence de ressource, absence d'autorisation et erreur réseau.
- **Succès :** ne s'affiche pas avant confirmation de la mutation utile.
- **Formulaire :** label, aide, exigences et erreur accessibles, reprise sans perte de saisie ; données non renseignées non converties en zéro silencieux.
- **KPI :** unité, période, source, couverture et statut scientifique lorsque nécessaire ; `PROXY` ≠ observation.
- **Carte :** distinguer action historique, signalement courant, lieu propre et projection ; utiliser les codes visuels décrits par la méthodologie carte.

### PDF Reports : thèmes de rendu

Le code et la documentation spécialisés Reports définissent deux présentations du **même** rapport, `impact` et `scientific`. Le thème ne change ni les calculs, ni les modules, ni les permissions. À configuration égale, conserver les intitulés, chiffres, légendes, sources et périmètres ; seuls les éléments de présentation peuvent varier. Les contrôles de partage PDF doivent rendre visible le thème sélectionné, l'expiration et la possibilité de révocation, sans déguiser un lien bearer en partage de données brutes.

Source : `documentation/features/reports/report-pdf-themes-and-reuse.md`.

## 8. Mobile V1

La navigation native visible comprend trois entrées principales : `Agir`, `Carte`, `Compte`. Elle n'est pas une copie pixel-perfect de la navigation web. Le shell protège la Safe Area, la lisibilité et la sélection pour technologies d'assistance. Les états GPS hors ligne, permission refusée, session expirée et reprise doivent être des états fonctionnels, pas de simples illustrations.

Les éléments de design mobile relèvent du runtime `apps/mobile/` et de sa documentation, sans imposer aux équipes une bibliothèque web dans React Native.

## 9. Checklist de qualité visuelle

Avant de valider une page ou un composant :

1. Famille de couleur et hiérarchie conforme aux contrats existants.
2. `PageHeader`, layout et chrome cohérents, y compris après redimensionnement.
3. Boutons, champs, surfaces, icônes et états issus des primitives propriétaires.
4. Lisibilité desktop et mobile, zoom navigateur, navigation clavier et lecteur d'écran.
5. Les trois modes d'affichage ne changent ni le contenu ni la sécurité.
6. Reduced motion testé ; aucun mouvement nécessaire à la compréhension.
7. Les nombres, catégories et couleurs de carte ne suggèrent pas des faits non observés.
8. Tests visuels et checks spécialisés applicables exécutés, sans modifier les baselines pour cacher une dérive.

**Commandes de contrôle documentées :** `check:surfaces`, `check:states`, `check:page-header`, `check:motion`, `check:icons`, ainsi que `audit:pages-site-drift` pour l'inventaire des routes. Les utiliser suivant l'outillage du checkout courant.

## 10. Règles d'évolution

Chaque nouvelle primitive doit d'abord justifier l'absence d'équivalent. Une expérimentation `PLAN` ou `REFERENCE` ne devient pas un contrat `CURRENT` par simple reproduction. Une dérogation UI doit rester locale, explicite et documentée dans la source appropriée ; aucune seconde charte générique ne doit être créée.

## 11. Principes d'adaptation UX/UI inspirés des HIG

Cette section transpose des principes généraux des Human Interface Guidelines
au Web CleanMyMap. Elle ne constitue ni une charte Apple, ni un contrat de
composants Apple pour le Web. Les conventions propres à iOS, iPadOS ou macOS
(barre d'onglets native, SF Symbols, SF Pro, Liquid Glass, dimensions en points
ou gestes exclusifs) ne sont pas des exigences CleanMyMap.

La source communautaire `apple-design` est une référence de revue externe ;
la source normative consultée pour ces principes reste la [documentation Apple
Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/).
Les critères Web mesurables restent ceux de WCAG et des contrats spécialisés
ci-dessus. Les règles déjà portées par ces contrats ne sont pas recopiées ici.

| Principe adapté | Objectif utilisateur et application Web | Exception nécessaire | Primitive/token canonique | Critère concret de vérification |
| --- | --- | --- | --- | --- |
| **Intention et hiérarchie** | Comprendre le rôle de la page, l'information principale et la prochaine action sans décoder la décoration. | Une surface scientifique, cartographique ou pédagogique peut présenter davantage de contexte si son ordre de lecture reste explicite. | `PageHeader`, `CmmPageLayout`, `CmmSectionGroup`, `LAYOUT_SPACING.md` | Le premier viewport identifie le sujet, l'état courant et l'action utile ; le contenu essentiel reste compréhensible en `minimaliste` et `sobre`. |
| **Autonomie et récupération** | Explorer, revenir, corriger une erreur et reprendre sans perte de contexte ni succès simulé. | Une mutation irréversible peut exiger une confirmation ou une protection d'identité selon son contrat métier. | `CmmButton`, `CmmFeedback`, `SystemState`, `CmmDialog`, `STATES_FEEDBACK.md` | Les erreurs indiquent la correction ou la reprise possibles ; les actions de sortie et de retour ont un effet réel ; le succès n'est annoncé qu'après confirmation. |
| **Familiarité et cohérence** | Réduire l'apprentissage en conservant les mêmes rôles, libellés, états et interactions d'une page à l'autre. | Une exception de famille ou de parcours est autorisée lorsqu'elle est documentée et nécessaire à la tâche. | Primitives `Cmm*`, tokens de famille, `PAGE_HEADER.md`, `ACTIONS_BUTTONS.md` | Une même responsabilité n'est pas rendue par une recette locale concurrente ; les libellés et états restent stables dans un même parcours. |
| **Flexibilité et inclusion** | Supporter largeur, zoom, clavier, technologies d'assistance, préférences de mouvement et les trois modes sans perte de fonction. | Les cartes, tables et cartes géographiques peuvent conserver une contrainte d'interaction documentée, sans élargir la page entière. | Tokens de layout, `CmmField`, `CmmDialog`, `theme-visibility-rules.md`, `DISPLAY_MODES_CANONICAL.md` | Vérifier reflow, focus, nom accessible, contraste et états aux largeurs pertinentes ; ne jamais compenser le zoom par une réduction globale du texte. |
| **Responsabilité et transparence** | Faire comprendre ce qui est demandé, ce qui est confirmé, ce qui est privé et ce qui est indisponible. | L'interface peut révéler moins de données lorsqu'une règle d'accès, de confidentialité ou de minimisation l'impose. | `SystemState`, feedback contextualisé, contrats AuthN/AuthZ et données | Une limite d'accès, une absence de données, une erreur réseau et un état vide sont distinguables ; aucune permission ni donnée n'est suggérée par une décoration. |
| **Sobriété et caractère** | Donner à la marque CleanMyMap une identité reconnaissable sans que les effets, gradients ou animations concurrencent le contenu. | La palette et les variantes par bloc restent les marqueurs de marque documentés ; elles ne sont pas remplacées par un habillage Apple. | `BLOC_COLOR_SYSTEM_PREMIUM.md`, `BRAND.md`, modes d'affichage, `MOTION_TRANSITIONS.md` | La hiérarchie, le contraste et l'action restent identifiables sans glow, blur, motion ou transparence décorative ; `prefers-reduced-motion` est respecté. |

Ces principes orientent les futurs changements ; ils ne prouvent pas que les
surfaces existantes les satisfont déjà. Une correction de code doit rester dans
un lot distinct, avec une preuve d'exécution adaptée à la surface concernée.
