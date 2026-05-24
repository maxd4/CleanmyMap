# Système de boutons CleanMyMap

## Vue d'ensemble

`CmmButton` est le composant bouton partagé du site.
Il fait partie des exceptions assumées aux règles visuelles de base: contrairement au texte courant et aux petites étiquettes de cartes, un bouton doit signaler l'action et porter sa propre hiérarchie de couleur.

## Contrat visuel

Les boutons exposent trois tons stables:

- `primary`: action principale, fond en dégradé diagonal de deux couleurs complémentaires à la page
- `secondary`: action alternative, fond en dégradé diagonal de deux couleurs de la page
- `tertiary`: action discrète, fond en dégradé subtil, visuellement présent sans dominer

`tertiary` est le nom canonique. `muted` reste un alias de compatibilité interne uniquement.

La couleur du bouton est pilotée par la teinte de page active. Le composant ne doit pas inventer un style isolé: il doit reprendre les variables de thème fournies par le shell de page.

## Règles d'usage

- Utiliser `primary` pour l'action la plus importante d'une zone.
- Utiliser `secondary` pour l'alternative principale.
- Utiliser `tertiary` pour les actions moins prioritaires, les liens de soutien et les CTA discrets.
- Garder un contraste lisible dans les trois tons, avec un vrai fond visible et une diagonale colorée dans le gradient.
- Ne pas réappliquer les règles générales de texte sur les labels de bouton: la couleur du texte est pilotée par le ton du bouton.
- Éviter les styles inline de bouton quand `CmmButton` peut couvrir le besoin.
- Conserver l'exception bouton même sur les cartes et bulles sombres: le contraste doit rester lisible avant tout.
- Le primaire doit rester le bouton le plus saillant du bloc.
- Le secondaire doit rester plus sobre que le primaire mais plus affirmé qu'un simple lien.
- Le tertiaire doit être discret, mais conserver un léger intérêt visuel via la teinte de page et le gradient.

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
