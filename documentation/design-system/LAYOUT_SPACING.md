# Layout & spacing canonique

Ce document définit le shell, la grille et le rythme des pages web classiques
CleanMyMap. Il complète `PAGE_HEADER.md` : la page choisit son contenu métier,
sa famille de couleur et, si nécessaire, son alignement de header, mais pas sa
géométrie globale.

## Primitives runtime

```tsx
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";

<CmmPageLayout>
  <PageHeader title="Titre" subtitle="Sous-titre" />
  <CmmSectionGroup>
    <section>Contenu métier</section>
    <section>Autre section</section>
  </CmmSectionGroup>
</CmmPageLayout>
```

`CmmPageLayout` est l'unique shell de contenu pour les pages classiques. Il
centralise la largeur maximale, les gutters responsive, le padding vertical et
le rythme entre le `PageHeader` et le premier contenu.

`CmmSectionGroup` est l'unique primitive du rythme entre sections. Les deux
primitives n'acceptent pas de variante de largeur, de padding ou d'espacement :
ces valeurs sont des tokens CSS communs à toutes les pages.

## Tokens canoniques

Les tokens vivent dans `apps/web/src/styles/tokens.css`, importé par
`apps/web/src/app/globals.css`, et les classes de layout dans
`apps/web/src/styles/layout.css` :

| Contrat | Token |
| --- | --- |
| largeur maximale | `--cmm-page-max-width` |
| gutter mobile | `--cmm-page-gutter-mobile` |
| gutter tablette | `--cmm-page-gutter-tablet` |
| gutter desktop | `--cmm-page-gutter-desktop` |
| padding vertical de page | `--cmm-page-padding-block` |
| `PageHeader` → premier contenu | `--cmm-page-header-content-gap` |
| espacement entre sections | `--cmm-section-gap` |
| espacement interne d'un groupe | `--cmm-content-group-gap` |

Les tokens de page réutilisent les fondations de grille existantes
(`--cmm-grid-*`) et l'échelle d'espacement (`--space-*`). Les modes
`exhaustif`, `minimaliste` et `sobre`, ainsi que les familles de couleur, ne
redéfinissent aucun de ces tokens : ils ne changent donc pas la géométrie
fondamentale.

Les espacements internes à une carte, un formulaire, une table ou un flux
métier restent locaux lorsqu'ils décrivent la composition de ce composant et
non le shell de la page. `cmm-content-group` peut être utilisé pour un groupe
interne standard sans recréer une échelle locale.

## Grilles internes de composition

Une grille interne peut structurer une surface dense lorsqu'elle améliore
réellement la lecture, notamment pour :

- rapports et synthèses ;
- KPI ;
- tableaux de bord ;
- vues de comparaison ;
- pages éditoriales à forte densité.

Cette grille reste une composition interne au contenu. Elle ne remplace jamais
`CmmPageLayout`, ses gutters ou sa largeur maximale.

Utiliser les tokens et primitives de grille déjà présents dans le runtime.
Ne pas créer dans une page une seconde série de valeurs fixes pour les colonnes,
gouttières, marges ou espacements lorsque les tokens canoniques couvrent le
besoin.

Les blocs doivent conserver une hiérarchie stable entre desktop, tablette et
mobile. Ils se replient avant de réduire artificiellement la typographie ou de
provoquer un scroll horizontal.

Une grille stricte n'est pas une obligation. Pour une carte interactive, un
formulaire complexe, un onboarding ou une séquence transactionnelle, la
lisibilité du flux et les contraintes d'interaction priment sur l'alignement
géométrique.

## Alignement et rythme

- `PageHeader` ouvre la page sur la même ligne de lecture que le contenu
  principal.
- Les titres et sous-titres suivent le contrat `PAGE_HEADER.md`.
- Les KPI et tableaux peuvent s'aligner sur une grille interne lorsqu'elle aide
  la comparaison.
- Les cartes utilisent leurs primitives et espacements canoniques ; une page ne
  redéfinit pas leur padding pour forcer un alignement.
- Les zones d'action restent lisibles et ne cassent pas le rythme de lecture.
- Les valeurs arbitraires de spacing structurel sont interdites lorsqu'un token
  canonique existe.

## Exceptions structurelles

Les surfaces suivantes ne sont pas des pages classiques et conservent leur
composition dédiée :

- cartes et surfaces plein écran (`/explorer`, `/actions/map`, cartes Leaflet) ;
- homepage et compositions de landing autonomes (`/`, `/accueil`) ;
- authentification et onboarding (`/sign-in`, `/sign-up`, `/onboarding`) ;
- états système (`/not-found`, `/error/429`) ;
- écrans d'accès/gate spécialisés avant rendu d'une console (`AdminAccessState`) ;
- print/export (`/prints/report`, couverture de rapport) ;
- modales, drawers, overlays et sous-vues internes ;
- composants métier qui contrôlent volontairement leur propre grille interne.

Toute nouvelle exception doit être ajoutée à
`documentation/design-system/UI_EXCEPTION_PAGES.md` avec sa raison avant de
contourner le shell canonique.

## Vérification

Pour une modification de layout :

- vérifier que la page utilise le shell canonique lorsqu'elle y est éligible ;
- contrôler desktop, tablette et mobile selon les breakpoints existants ;
- vérifier l'absence de débordement horizontal ;
- vérifier l'alignement des blocs denses sans introduire de nouvelle échelle
  locale ;
- confirmer qu'une exception structurelle reste documentée.

## Garde-fou

`npm run check:layout` contrôle la définition des primitives et les shells de
route modifiés. Il empêche d'introduire de nouvelles largeurs, gutters,
paddings ou rythmes structurels arbitraires hors de l'allowlist documentée.
