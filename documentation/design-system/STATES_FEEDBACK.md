# States & Feedback — contrat canonique

Ce document définit l’usage des primitives d’états et de retour utilisateur
du web CleanMyMap. Les consommateurs migrés doivent réutiliser ces primitives
et conserver leur logique métier, leurs textes et leurs actions.

## Choisir la primitive

| Primitive | Usage | Contrat |
| --- | --- | --- |
| `SystemState` | État bloquant, plein écran ou plein bloc ; état vide important | Utiliser `SystemStateLayout` avec un `variant` parmi `error`, `warning`, `empty`, `loading`, `forbidden` ou `offline`. |
| `CmmFeedback` | Succès, erreur, avertissement ou information inline | Utiliser `tone="info"`, `"success"`, `"warning"` ou `"error"`. Les tones `warning` et `error` exposent `role="alert"`; les autres exposent `role="status"`. |
| `CmmSkeleton` | Chargement structurel dont la géométrie doit rester visible | Conserver les variants existants et choisir l’animation selon le mode d’affichage. |
| `CmmField` `error` | Erreur attachée à un champ de formulaire | Utiliser `CmmField` pour l’association `aria-describedby` et `aria-invalid`; ne pas remplacer cette erreur par `CmmFeedback`. |

En résumé :

```txt
SystemState  ≠  CmmFeedback  ≠  CmmSkeleton  ≠  erreur CmmField
```

## Règles de migration

- un état bloquant, plein écran ou plein bloc utilise `SystemState` ;
- un chargement structurel utilise `CmmSkeleton` ;
- un retour inline utilise `CmmFeedback` ;
- un état vide important utilise `SystemState variant="empty"` ;
- les textes, données, conditions, handlers et actions existants restent
  inchangés ;
- les styles de surface, palettes, focus et motion restent dans les
  primitives et les modules CSS canoniques (`states-feedback.css`,
  `surfaces.css`, `motion.css`), pas dans les branches migrées ;
- les champs de formulaire gardent l’erreur dans `CmmField`.

## Modes d’affichage

Les primitives suivent le contrat global de `DISPLAY_MODES_CANONICAL.md` :

- `exhaustif` autorise les enrichissements visuels et le shimmer des skeletons ;
- `minimaliste` conserve une animation discrète et supprime les effets
  excessifs ;
- `sobre` rend les skeletons statiques et renforce le contraste ;
- `prefers-reduced-motion` neutralise les animations.

Les modes ne changent ni les données, ni les fonctionnalités, ni la structure
des composants métier.
