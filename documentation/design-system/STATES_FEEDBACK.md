# States & Feedback — contrat canonique

Ce document définit l’usage des primitives d’états et de retour utilisateur
du web CleanMyMap. Les consommateurs migrés doivent réutiliser ces primitives
et conserver leur logique métier, leurs textes et leurs actions.

## Choisir la primitive

| Primitive | Usage | Contrat |
| --- | --- | --- |
| `SystemState` | État bloquant, plein écran ou plein bloc ; état vide important | Utiliser `SystemStateLayout` avec un `variant` parmi `error`, `warning`, `empty`, `loading`, `forbidden` ou `offline`. |
| `CmmFeedback` | Succès, erreur, avertissement ou information inline | Utiliser `tone="info"`, `"success"`, `"warning"` ou `"error"`. Les tones `warning` et `error` exposent `role="alert"`; les autres exposent `role="status"`. |
| `CmmToast` | Notification flottante temporaire | Utiliser le shell présentational pour un message court, ses actions et sa fermeture ; le host conserve le lifecycle et le placement. |
| `CmmSkeleton` | Chargement structurel dont la géométrie doit rester visible | Conserver les variants existants et choisir l’animation selon le mode d’affichage. |
| `CmmField` `error` | Erreur attachée à un champ de formulaire | Utiliser `CmmField` pour l’association `aria-describedby` et `aria-invalid`; ne pas remplacer cette erreur par `CmmFeedback`. |

En résumé :

```txt
SystemState  ≠  CmmFeedback  ≠  CmmToast  ≠  CmmSkeleton  ≠  erreur CmmField
```

`CmmToast` est uniquement présentational : il porte la surface, la
typographie, l’icône, le contenu, les actions, la fermeture et la sémantique
ARIA. Les hosts métier conservent le lifecycle, les timers, les événements,
les retries, la déduplication, les sons, les confettis et toute autre side
effect. Le placement reste également la responsabilité du host. Il ne faut
pas créer un bus ou une queue globale pour cette primitive.

`announcement="polite"` convient à une information ou une célébration qui
peut attendre le prochain silence de la technologie d’assistance ;
`announcement="assertive"` est réservé à une erreur ou une interruption
importante. `announcement="none"` ne crée pas de live region implicite. Un
toast temporaire ne remplace pas un feedback persistant nécessaire, un état
de page, une erreur de champ ou une action que l’utilisateur doit pouvoir
retrouver.

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

### États système de page

Les surfaces système suivent la même composition, sans confondre leur tonalité :

| Surface | Primitive | Variante | Contrat conservé |
| --- | --- | --- | --- |
| `/not-found` | `SystemState` | `empty` | destination fiable vers l’accueil |
| `error.tsx` | `ServerErrorCard` composé de `SystemState` | `error` | retry, support, Sentry et référence d’erreur |
| `global-error.tsx` | `ServerErrorCard` composé de `SystemState` | `error` | reset global, support, Sentry et référence d’erreur |
| `/error/429` | `SystemState` | `warning` | retry, accueil, aide et tonalité amber |

`ServerErrorCard` reste une façade de compatibilité pour ses consommateurs ; il
ne maintient pas une seconde composition visuelle. Son ordre canonique est
icône, titre, description, contexte facultatif, actions puis aide facultative.

## Modes d’affichage

Les primitives suivent le contrat global de `DISPLAY_MODES_CANONICAL.md` :

- `exhaustif` autorise les enrichissements visuels et le shimmer des skeletons ;
- `minimaliste` conserve une animation discrète et supprime les effets
  excessifs ;
- `sobre` rend les skeletons statiques et renforce le contraste ;
- `prefers-reduced-motion` neutralise les animations.

Les modes ne changent ni les données, ni les fonctionnalités, ni la structure
des composants métier.

## Règles UX conservées

- ne pas afficher un message machine vague comme `An error occurred` ;
- ne pas utiliser une modal bloquante pour une simple erreur de champ ;
- distinguer validation, réseau, serveur, permission et état vide ;
- toute action de reprise doit avoir un effet réel : corriger, réessayer,
  rafraîchir, se reconnecter ou contacter le support ;
- ne pas présenter une erreur réseau comme une erreur serveur définitive.
