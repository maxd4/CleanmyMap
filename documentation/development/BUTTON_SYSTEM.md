# Système de boutons CleanMyMap

## Vue d'ensemble

`CmmButton` est le composant bouton partagé du site.
Il fait partie des exceptions assumées aux règles visuelles de base: contrairement au texte courant et aux petites étiquettes de cartes, un bouton doit signaler l'action et porter sa propre hiérarchie de couleur.

## Contrat visuel

Les boutons exposent trois tons stables:

- `primary`: action principale, fond vert émeraude, texte blanc
- `secondary`: action alternative, fond blanc, texte slate
- `tertiary`: action discrète, fond transparent, texte slate

`tertiary` est le nom canonique. `muted` reste un alias de compatibilité interne uniquement.

## Règles d'usage

- Utiliser `primary` pour l'action la plus importante d'une zone.
- Utiliser `secondary` pour l'alternative principale.
- Utiliser `tertiary` pour les actions moins prioritaires, les liens de soutien et les CTA discrets.
- Ne pas réappliquer les règles générales de texte sur les labels de bouton: la couleur du texte est pilotée par le ton du bouton.
- Éviter les styles inline de bouton quand `CmmButton` peut couvrir le besoin.
- Conserver l'exception bouton même sur les cartes et bulles sombres: le contraste doit rester lisible avant tout.

## Variantes techniques

Le composant gère aussi:

- `default`: forme standard
- `pill`: forme arrondie complète
- `ghost`: forme allégée sans bordure visible

## Dimensions

- `sm`: compact
- `md`: taille par défaut
- `lg`: bouton d'appel à l'action plus visible

## Référence d'implémentation

Source de vérité:

- [apps/web/src/components/ui/cmm-button.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/ui/cmm-button.tsx)

## Exemples

```tsx
<CmmButton href="/actions/new" tone="primary">
  Déclarer une action
</CmmButton>

<CmmButton href="/explorer" tone="secondary">
  Explorer
</CmmButton>

<CmmButton href="/sign-in" tone="tertiary">
  Se connecter
</CmmButton>
```

## Rappels

- Les boutons sont une exception de lisibilité, pas un changement de règle global.
- Le style de base du site reste sobre et lisible; le bouton est le seul élément qui peut porter une couleur plus expressive pour signaler l'action.
- Si un nouveau cas visuel ne rentre pas dans ces trois tons, il faut documenter l'exception avant de l'introduire.
