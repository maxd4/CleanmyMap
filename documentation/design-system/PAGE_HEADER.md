# PageHeader — composant canonique des titres de page

`PageHeader` est le composant de référence pour tous les titres de page visibles du repo.

## Règle générale

- toute nouvelle page avec un titre visible doit utiliser `PageHeader`
- le titre principal doit être rendu en `h1` par le composant
- `PageHero` reste un alias de compatibilité pour les pages héritées
- aucun nouveau système de titre décoratif ne doit être créé hors cas documenté
- les sous-titres doivent rester courts, lisibles et non exhaustifs
- les majuscules décoratives ne sont admises que pour un eyebrow très court

## Props autorisées

| Prop | Type | Rôle |
|---|---|---|
| `title` | `ReactNode` | titre principal obligatoire |
| `eyebrow` | `ReactNode` | repère court au-dessus du titre |
| `subtitle` | `ReactNode` | sous-titre bref |
| `badge` | `ReactNode` | badge unique, si besoin |
| `badges` | `ReactNode` | rangée de badges |
| `action` | `ReactNode` | action contextuelle associée au header |
| `align` | `"left" \| "center"` | alignement du bloc, `left` par défaut |
| `family` | `ResolvedPageFamily` | source de vérité prioritaire pour une page appartenant à un bloc |
| `tone` | `PageHeaderTone` | fallback pour les surfaces autonomes sans famille résolue |
| `contrast` | `"default" \| "inverse"` | lecture normale ou surface sombre canonique |
| `className` | `string` | ajustement local du wrapper |
| `badgesClassName` | `string` | ajustement local des badges |
| `actionClassName` | `string` | ajustement local de l'action |

## Priorité de résolution

1. `family` gagne toujours si elle est fournie.
2. Si `family` est absente, `tone` sert de fallback.
3. Sans `family` ni `tone`, le composant retombe sur le neutre (`stone`).
4. `contrast="inverse"` conserve la structure canonique et inverse seulement la lecture.

## Tons disponibles

`PageHeaderTone` accepte les valeurs suivantes :

- `emerald`
- `sky`
- `red`
- `pink`
- `indigo`
- `yellow`
- `slate`
- `stone`

### Contraste

- `default` est le comportement standard
- `inverse` est réservé aux surfaces sombres
- le contraste ne change pas le layout, seulement les couleurs de lecture

### Lecture canonique des tons

| Tone | Usage recommandé |
|---|---|
| `emerald` | pages du bloc Agir |
| `sky` | pages de cartographie |
| `red` | pages d'impact |
| `pink` | pages réseau / discussion |
| `indigo` | pages partenaires / surfaces relationnelles |
| `yellow` | pages Apprendre |
| `slate` | surfaces système, légales ou neutres |
| `stone` | fallback neutre générique |

## Couleurs par bloc

| Bloc / famille | Couleur canonique | Remarque |
|---|---|---|
| Accueil & Pilotage | `amber` / `orange` pour l'accueil, `amber` / `brun` pour le pilotage | passer par `family` |
| Agir | `emerald` | teinte unique |
| Cartographie & Impact | `sky` pour la cartographie, `red` / `rose` pour l'impact | `PageHeader` hérite de la famille |
| Réseau & Discussions | `pink` / `indigo` | `pink` pour discussion, `indigo` pour partenaires |
| Apprendre | `yellow` / `amber` | fond jaune, accents ambre |
| Familles autonomes | `slate`, `stone` ou palette dédiée | auth, legal, system, admin, print |

## Alignement

- `left` est l'alignement standard
- `center` ne doit être utilisé que pour les landings ou dashboards explicitement documentés
- un changement d'alignement doit rester documenté dans la fiche de page ou la charte concernée

## Règle d'évolution

- ne pas créer de nouveau header à la main
- ne pas recréer `PageHeader` sous une autre forme
- pour une nouvelle route, utiliser `PageHeader` dès la première itération
- si la surface est sombre, utiliser `contrast="inverse"` avec le ton canonique du bloc
- si la page relève d'une exception documentée, la mentionner dans `UI_EXCEPTION_PAGES.md`
- certaines routes restent `account-complete gated` tout en utilisant `PageHeader`; le gate d'accès est documenté dans `UI_EXCEPTION_PAGES.md` et ne change pas la règle du header canonique

## Références

- [`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md)
- [`UI_EXCEPTION_PAGES.md`](./UI_EXCEPTION_PAGES.md)
- [`README.md`](./README.md)
