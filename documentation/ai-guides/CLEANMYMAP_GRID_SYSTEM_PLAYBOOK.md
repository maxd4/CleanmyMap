# CleanMyMap - Playbook de grille

Objectif: appliquer une grille stricte quand elle améliore la lecture, sans importer l'identité graphique Müller-Brockmann ni modifier le design system CleanMyMap.

## Références canoniques

- [AGENTS.md](../../AGENTS.md)
- [Design system](../design-system/README.md)
- [PageHeader](../design-system/PAGE_HEADER.md)
- [Usage guide](../design-system/USAGE_GUIDE.md)
- [CleanMyMap UI/UX Pro Max](../design-system/cleanmymap-ui-ux-pro-max.md)
- [Système de couleurs par bloc](../design-system/BLOC_COLOR_SYSTEM_PREMIUM.md)
- [Pages site](../pages_site/README.md)
- [Index des pages](../pages_site/INDEX.md)

## Quand réutiliser ce guide

Réutiliser ce guide quand la demande touche surtout la composition d'une page, pas sa logique métier.

Cas typiques:

- cadrer une page de rapport, de synthèse ou d'export
- structurer un dashboard dense avec KPI, tableaux et sections de lecture
- harmoniser une page éditoriale ou pédagogique riche en blocs
- préparer une vue de comparaison ou de supervision qui doit rester stable sur plusieurs largeurs
- vérifier si une page doit adopter une grille stricte ou rester en composition libre

Signaux d'usage:

- le contenu doit être lu vite, pas exploré comme une interface de saisie
- la hiérarchie visuelle manque de stabilité entre desktop, tablette et mobile
- les blocs se désalignent malgré les composants canoniques déjà en place
- la page supporte mieux une lecture séquentielle qu'une interaction lourde

Ne pas le réutiliser si la demande porte d'abord sur:

- un formulaire complexe
- une carte interactive
- un onboarding
- une séquence transactionnelle
- une refonte de palette ou de style

## Grille cible

| Contexte | Colonnes | Marges externes | Gouttières | Largeur max |
|---|---:|---:|---:|---:|
| Desktop | 12 | 32 px | 24 px | 1440 px |
| Tablette | 6 | 24 px | 24 px | 1024 px |
| Mobile | 4 | 16 px | 16 px | 100% |

## Rythme vertical

- Base de 8 px obligatoire
- Espacements autorisés: 8, 16, 24, 32, 40, 48, 64 px
- Pas de valeur arbitraire pour le spacing de section, de carte ou d'alignement interne

## Règles d'alignement

- `PageHeader` ouvre la page sur la même ligne de départ que le contenu principal
- Les titres et sous-titres s'alignent sur la colonne de lecture, pas sur le bord visuel de la carte
- Les KPI se calent sur des blocs entiers de colonnes, avec chiffres et libellés alignés sur la même grille
- Les cartes `CmmCard` occupent des spans stables; les espacements internes restent en multiples de 8 px
- Les tableaux prennent toute la largeur utile et gardent leurs en-têtes alignés à la grille
- `CmmButton` reste dans les zones d'action, sans casser le rythme de lecture

## Cas d'usage adaptés

- `reports` et `prints/report`
- dashboards de pilotage
- pages éditoriales ou pédagogiques à forte densité
- synthèses KPI
- vues de comparaison ou de lecture structurée

## Cas où la grille ne doit pas être imposée

- cartes interactives et cartes géographiques
- formulaires complexes et flux de saisie
- onboarding et authentification
- modales, wizards et séquences transactionnelles
- surfaces où le comportement interactif prime sur l'alignement strict

## Intégration canonique

- Ne pas recréer `PageHeader`, `CmmCard` ou `CmmButton`
- Brancher la grille autour des composants existants, pas à l'intérieur de leurs styles
- Conserver les palettes par bloc et les familles autonomes décrites dans [BLOC_COLOR_SYSTEM_PREMIUM.md](../design-system/BLOC_COLOR_SYSTEM_PREMIUM.md)
- Suivre les règles de lisibilité et d'états décrites dans [CleanMyMap UI/UX Pro Max](../design-system/cleanmymap-ui-ux-pro-max.md)

## Responsive

- Desktop: composition complète en 12 colonnes
- Tablette: réduction à 6 colonnes, empilement des zones secondaires
- Mobile: 4 colonnes, blocs principaux en pleine largeur, colonnes multiples seulement si la lisibilité reste immédiate
- Si un bloc déborde, il se replie avant de réduire la taille du texte
- Aucun scroll horizontal ne doit apparaître

## Vérification légère

- Tester 375 px, 768 px et 1440 px
- Vérifier l'alignement du header, des KPI, des cartes et des tableaux
- Vérifier qu'aucun composant ne force un débordement horizontal
- Vérifier que les actions gardent des zones cliquables lisibles
- Vérifier que la grille ne modifie ni la palette ni la hiérarchie de composants

## Décision de généralisation

- Conserver le système.
- L'étendre seulement aux pages éditoriales, rapports, KPI et tableaux de bord.
- Ne pas l'imposer aux cartes interactives ni aux formulaires complexes.

Pages candidates, par bénéfice attendu:

1. `/methodologie`
2. `/gamification`
3. `/dashboard`
4. `/profil`
5. `/learn/comprendre`

## Ce que ce guide n'est pas

- pas une refonte visuelle globale
- pas un remplacement du design system
- pas une règle universelle pour toutes les pages
- pas une autorisation pour homogénéiser les cartes interactives et les formulaires
