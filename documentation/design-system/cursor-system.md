# Système de curseurs — contrat runtime présent

**Statut : `CURRENT`**

Les règles sont actuellement fournies par
`apps/web/src/styles/actions.css` et complétées par `forms.css`. Ce document
ne promet pas un curseur pour un composant qui ne l’emploie pas.

## Règles effectivement présentes

- les boutons actifs, liens avec `href`, `summary`, labels associés, selects,
  contrôles de fichier, cases à cocher, boutons submit et rôles bouton actifs
  utilisent `pointer` ;
- les champs texte et `textarea` utilisent `text` ;
- `:disabled`, `[aria-disabled="true"]` et `.disabled` utilisent
  `not-allowed` ;
- `[draggable="true"]` et `.cursor-grab` utilisent `grab`, puis `grabbing`
  pendant l’action ;
- `.cmm-clickable` et `.cmm-interactive` sont des classes explicites pour les
  surfaces ou actions qui portent déjà une interaction ;
- `.cmm-input` utilise `text`, revient à `default` en lecture seule et à
  `not-allowed` lorsqu’il est désactivé.

Les classes utilitaires présentes incluent `cursor-pointer`, `cursor-text`,
`cursor-not-allowed`, `cursor-default`, `cursor-help`, `cursor-wait`,
`cursor-move`, `cursor-crosshair`, `cursor-zoom-in`, `cursor-zoom-out` et
`cursor-inherit`.

## Limites

Un élément décoratif ou une carte non cliquable ne doit pas recevoir
`pointer`. Le curseur ne remplace ni un libellé, ni un focus visible, ni la
sémantique clavier. Les composants et leurs états restent les sources pour la
structure ; ce document ne crée pas de nouveau composant.
