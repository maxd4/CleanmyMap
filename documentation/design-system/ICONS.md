# Icons (CURRENT)

`lucide-react` est la bibliothèque standard des glyphes UI de CleanMyMap.
`CmmIcon` est la primitive canonique pour les icônes Lucide standards. Elle
standardise la taille et l'accessibilité sans créer une palette ou une
sémantique concurrente.

## Contrat `CmmIcon`

La taille par défaut est `md`. Les tailles disponibles sont fixes :

| Taille | Dimensions |
| --- | --- |
| `xs` | 14 px (`h-3.5 w-3.5`) |
| `sm` | 16 px (`h-4 w-4`) |
| `md` | 20 px (`h-5 w-5`) |
| `lg` | 24 px (`h-6 w-6`) |
| `xl` | 28 px (`h-7 w-7`) |

La couleur est héritée via `currentColor` et le `className` du consommateur.
`CmmIcon` n'expose pas de `tone` ni de `color`. Il n'expose pas non plus de
`strokeWidth`, de taille numérique arbitraire ou d'animation ; le glyph Lucide
conserve son stroke standard.

La primitive reste compatible avec les Server Components et ne doit pas porter
`"use client"`.

## Accessibilité

Sans `label`, l'icône est décorative : elle utilise `aria-hidden` et
`focusable="false"`. Avec `label`, elle devient informative : `label` fournit
`role="img"` et `aria-label`, sans `aria-hidden`.

Une icône seule dans un bouton ou un lien ne remplace jamais le nom accessible
du contrôle interactif. Le bouton ou le lien doit rester nommé par son contenu
ou son propre attribut accessible.

## Frontières spécialisées

Les usages suivants restent hors de la primitive standard lorsqu'ils ont un
contrat propre :

- navigation nécessitant un `strokeWidth` spécifique ;
- filigranes et grandes illustrations de `RubriqueCard` ;
- Maps et markers ;
- graphiques, jauges et SVG de data-viz ;
- logos et assets de marque ;
- Print/Export.

Le legacy Lucide restant n'est pas une seconde convention. Il sera traité dans
le chantier de convergence legacy, avec une migration motivée par les usages.
