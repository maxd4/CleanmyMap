# Disclosures et accordions

## Primitive canonique

Utiliser `CmmDisclosure` lorsqu'un contenu complémentaire peut être masqué ou
affiché à la demande, tout en restant dans le même contexte de lecture. La
primitive conserve la sémantique native `<details>/<summary>` et expose un
indicateur `ChevronDown` unique, géré par le CSS canonique de
`apps/web/src/styles/disclosure.css`.

```tsx
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";

<CmmDisclosure summary="Détails" tone="sky" size="md">
  Contenu complémentaire
</CmmDisclosure>;
```

Le contenu métier reste dans `children`. Le `summary` accepte du contenu riche
(titre, badges, métriques ou autre composition utile) sans ajouter de texte
annoncé artificiellement pour l'indicateur visuel.

## Disclosure et accordion de contenu

Un disclosure est une unité indépendante : plusieurs `CmmDisclosure` voisins
peuvent rester ouverts simultanément. La primitive ne porte donc pas de groupe,
d'identifiant de panneau partagé ou de fermeture exclusive.

Un accordion de contenu est un comportement de groupe dans lequel l'ouverture
d'un item ferme les autres. Ce comportement n'est pas fourni par
`CmmDisclosure` dans le lot actuel ; il devra être ajouté séparément, avec une
exigence métier explicite, sans réimplémenter la sémantique native dans chaque
consommateur.

## Disclosure et contrôles contextuels

`CmmDisclosure` convient au contenu de lecture ou aux précisions d'un formulaire.
Il ne remplace pas :

- un dropdown de compte ou de sélection, qui expose un choix ou une action
  contextuelle ;
- un menu, qui porte une liste de commandes ou de navigation ;
- un tooltip, qui fournit une information brève liée à un élément ;
- un popover ou un overlay, qui possède un ancrage, une couche et un cycle de
  fermeture spécifiques.

Les `<details>` spécialisés de ces contrôles restent donc autorisés hors des
consommateurs gouvernés par ce document.

## Sémantique native, clavier et focus

- conserver le couple `<details>/<summary>` fourni par la primitive ;
- ne pas remplacer le déclencheur par un bouton simulé ou un handler qui annule
  le comportement natif ;
- le clic et l'activation clavier native du `summary` ouvrent et ferment le
  contenu ;
- la zone de déclenchement est au moins de 44 px via la taille canonique du
  summary ;
- le focus visible est fourni par `disclosure.css` avec le token de focus du
  design system ;
- l'indicateur `ChevronDown` est décoratif (`aria-hidden`) : son état est déjà
  porté par l'ouverture native et il ne doit pas être accompagné d'un texte
  « ouvert/fermé » redondant ;
- ne jamais faire dépendre l'ouverture du hover, du survol d'une icône ou d'un
  état React parallèle au `<details>`.

## Tones et sizes

Les tones expriment l'accent de la surface sans recréer une recette locale :

| Tone | Usage indicatif |
| --- | --- |
| `slate` | légal, documentaire ou neutre |
| `emerald` | précision métier, action ou succès contextuel |
| `sky` | cartographie, information ou aide contextuelle |
| `amber` | avertissement ou relecture |
| `rose` | risque, absence ou problème à examiner |
| `indigo` | réseau ou surface partenaire |

Les tailles sont `sm`, `md` et `lg`. Elles gouvernent la zone de déclenchement,
le rythme interne et la hiérarchie typographique ; elles ne doivent pas être
reproduites par des classes locales sur `<details>` ou `<summary>`.

Les migrations représentatives actuelles utilisent :

- légal : `tone="slate"`, `size="lg"` ;
- carte : `tone="sky"` ;
- précisions IA : `tone="emerald"` ;
- `QuestionCard` : tone dérivé de son état de source existant et `id` conservé.

## Modes d'affichage et mouvement

Le contenu et le comportement restent identiques dans les trois modes :

- **Exhaustif** : surface enrichie et rotation fluide du chevron autorisées ;
- **Minimaliste** : surface plate et transition discrète ;
- **Sobre** : aucune animation ni effet décoratif.

`prefers-reduced-motion: reduce` supprime toutes les transitions de mouvement.
Une nouvelle animation, rotation ou transition locale dans un consommateur est
interdite ; les décisions visuelles appartiennent à `disclosure.css`.

## Gouvernance

Le check dédié est `npm run check:disclosure`. Il protège la primitive et les
quatre migrations représentatives sans interdire globalement `<details>` dans
le dépôt. Il détecte notamment le retour de recettes locales de bordure,
surface, radius, padding, ombre, focus, chevron, rotation ou ouverture au
hover.

Le lot 2 ne migre pas les 22 autres usages `<details>` du dépôt et ne modifie
aucun dropdown, menu, tooltip, popover ou overlay.
