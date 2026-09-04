# Overlays & Dialogs — contrat canonique

## `CmmDialog`

`CmmDialog` est la primitive canonique des modales génériques de CleanMyMap.
Elle porte le shell comportemental commun et rend uniquement lorsqu’elle est
ouverte. Son panneau expose :

- `role="dialog"` et `aria-modal="true"` ;
- un nom accessible obligatoire via `ariaLabel` ou `ariaLabelledBy` ;
- le verrouillage temporaire du scroll du `body` ;
- le focus initial, avec `initialFocusRef` lorsqu’il est fourni ;
- le confinement de `Tab` et `Shift+Tab` dans le panneau ;
- la restauration du focus précédent à la fermeture ;
- la fermeture par `Escape` et par le backdrop selon les options ;
- les tailles `sm`, `md`, `lg` et `xl` ;
- les adaptations de surface et de mouvement des modes `Exhaustif`,
  `Minimaliste` et `Sobre`, ainsi que `prefers-reduced-motion`.

Le contenu, la surface métier éventuelle et les classes structurelles
spécifiques restent composables via les enfants et les classes prévues par la
primitive. Le consommateur conserve le titre, la description, les actions, la
logique métier, les états asynchrones et la tonalité spécifique de son contenu.

## Dismissible

```text
dismissible=true
→ fermeture utilisateur possible selon Escape/backdrop

dismissible=false
→ modale bloquante
→ fermeture uniquement par action métier explicite
```

`closeOnEscape` et `closeOnBackdrop` affinent le comportement lorsque la
modale est dismissible. Le backdrop ne ferme le dialog qu’après un clic
réellement hors panneau.

Un consommateur ne doit pas recoder :

- le backdrop générique ;
- le scroll-lock ;
- le focus trap ;
- la restauration du focus ;
- le listener Escape générique ;
- `role="dialog"` ou `aria-modal="true"`.

Il ne doit pas dépendre du hover pour ouvrir ou fermer une modale.

## Frontières

```text
CmmDialog
≠ navigation non modale
≠ popover
≠ tooltip
≠ drawer
≠ feedback inline
```

Un lien, un bouton, un menu ou une navigation ressemblant visuellement à une
modale reste gouverné par sa sémantique interactive propre. De même, un
feedback inline ne devient pas une modale parce qu’il possède une surface.

`app-navigation-tree-menu.tsx` utilise `aria-modal="false"` pour une
navigation non modale et reste volontairement hors de `CmmDialog`.

## Tailles, focus et accessibilité

Le nom accessible est obligatoire pour chaque `CmmDialog` ouvert. Préférer
`ariaLabelledBy` lorsque le contenu possède un titre visible et
`ariaDescribedBy` lorsqu’une description visible complète ce titre.

Le premier élément focusable reçoit le focus par défaut. Un consommateur peut
fournir `initialFocusRef` pour placer explicitement le focus sur une action
pertinente, par exemple le bouton de confirmation. À défaut d’élément
focusable, le panneau lui-même reçoit le focus.

La touche `Tab` reste confinée dans le panneau et `Shift+Tab` fonctionne dans
le sens inverse. Le focus antérieur est restauré lorsque le dialog est fermé.

## Modes d’affichage

- **Exhaustif** : backdrop et animation d’entrée existants autorisés ;
- **Minimaliste** : surface simplifiée, sans blur ni animation décorative ;
- **Sobre** : aucun blur, aucune animation et aucun gradient ou ombre
  décorative du shell ;
- **`prefers-reduced-motion`** : aucune animation ni transition de mouvement.

Le contenu et le comportement fonctionnel restent identiques entre les modes.

## Exceptions legacy bornées

Ces fichiers sont des exceptions actuelles explicitement allowlistées par
`check:overlays`. Ils ne constituent pas des patrons recommandés et ne
doivent pas être recopiés pour de nouveaux dialogs :

- `apps/web/src/components/gamification/infinite-badges/BadgeModal.tsx` —
  présentation gamification historique dépendante de Framer Motion et de ses
  ornements propres ;

Toute nouvelle modale générique doit utiliser `CmmDialog`. Lorsqu’une
exception legacy devient canonique, son fichier doit être retiré de
l’allowlist en même temps que sa migration.
