# Design System — Guide IA

Référence d'entrée avant toute modification UI de CleanMyMap.

## Ordre de lecture

1. `BLOC_COLOR_SYSTEM_PREMIUM.md`
2. `PAGE_HEADER.md`
3. `LAYOUT_SPACING.md`
4. `SURFACES_CARDS.md`
5. `charte-ui-pro-moderne-futuriste.md`
6. `cleanmymap-ui-ux-pro-max.md` pour les écrans métier denses
7. `UI_EXCEPTION_PAGES.md`
8. fiche canonique de la page dans `documentation/pages_site/`

## Composants canoniques

Réutiliser les composants existants avant d'en créer de nouveaux.

Exemples :

```tsx
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
```

Pour tout titre principal de page visible, `PageHeader` est la référence canonique.

`PageHeader` est l'unique composant runtime pour les titres principaux de page ; aucun alias de hero ne doit être utilisé.

Pour le shell de contenu et le rythme vertical des pages classiques, utiliser
`CmmPageLayout` et `CmmSectionGroup` selon
[`LAYOUT_SPACING.md`](./LAYOUT_SPACING.md). Les pages ne choisissent pas de
largeur, de gutters ou de rythme structurel local ; les exceptions sont
documentées dans `UI_EXCEPTION_PAGES.md`.

Pour les cartes et panels standards, utiliser `CmmCard` ; `CmmBlockCard` ne
fait qu'y composer l'accent de famille. Le contrat des surfaces, états,
effets et exceptions est documenté dans
[`SURFACES_CARDS.md`](./SURFACES_CARDS.md). Les couleurs de famille restent
documentées dans [`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md).
Le contrat est contrôlé par `npm run check:surfaces`.

## Couleurs par famille

La source canonique est :

```txt
BLOC_COLOR_SYSTEM_PREMIUM.md
```

### Accueil & Pilotage

Exception importante :

- les pages de cette famille peuvent combiner orange et brun conformément au document canonique ;
- ne pas appliquer à cette famille la règle simpliste « une seule teinte stricte ».

### Agir

```txt
emerald
```

### Cartographie & Impact

La teinte dépend de la page :

- cartographie : `sky` ;
- impact : `red` / `rose` ;
- méthodologie : impact.

### Réseau & Discussions

- discussion/réseau : `pink` ;
- partenaires : `indigo`.

### Apprendre

```txt
yellow / amber
```

### Familles autonomes

Ne pas leur appliquer automatiquement une palette de bloc :

- Auth & Onboarding ;
- Institutionnel & Légal ;
- Système & Utilitaires ;
- Admin & Super-admin ;
- Print & Export.

## Règles UI obligatoires

### Composants

- utiliser les composants canoniques ;
- éviter un style isolé si une primitive existe ;
- ne pas importer un composant externe redondant sans besoin.

### Typographie générale

Éviter les tailles arbitraires quand une classe canonique existe.

Préférer :

```txt
cmm-text-h1
cmm-text-h2
cmm-text-h3
cmm-text-body
cmm-text-small
cmm-text-caption
```

Éviter :

```txt
text-[10px]
text-[11px]
font-extrabold
text-primary
```

quand les tokens CleanMyMap couvrent le besoin.

### Titre et sous-titre de page

`PAGE_HEADER.md` est l'unique source de vérité pour la géométrie et la typographie du titre principal et de son sous-titre.

Règle de cohérence :

```txt
même taille
même graisse
même line-height
même tracking
même largeur typographique
même comportement responsive
même rythme titre / sous-titre
```

Les seules variations visuelles autorisées entre pages sont :

```txt
couleur   -> family / tone / contrast
position  -> align="left" ou align="center"
```

En conséquence :

- ne pas créer de H1 de page à la main lorsqu'un `PageHeader` convient ;
- ne pas ajouter de `text-*`, `font-*`, `leading-*`, `tracking-*` ou `max-w-*` local au titre ou au sous-titre ;
- ne pas utiliser de `<br>` manuel pour composer un titre ;
- ne pas corriger une page isolée en réduisant sa taille ou son tracking ;
- si un titre est trop long, raccourcir d'abord le libellé ;
- si plusieurs pages rencontrent le même problème, corriger `PageHeader` globalement ;
- un alignement centré doit être documenté dans la fiche canonique de page ou dans `UI_EXCEPTION_PAGES.md` ;
- les anciennes props `eyebrow`, `badge` et `badges` ont été supprimées du contrat runtime après migration des consommateurs internes.

La couleur est gouvernée par la famille visuelle ; elle ne justifie jamais une variante de taille ou de graisse.

### Pages métier

Ne pas transformer les surfaces suivantes en landing pages décoratives :

- admin ;
- analytics ;
- formulaires ;
- modération ;
- validation ;
- pilotage.

Préférer :

- KPI lisibles ;
- tableaux ;
- grilles ;
- filtres ;
- hiérarchie claire ;
- feedback explicite.

### Interactions asynchrones

Prévoir :

- chargement ;
- désactivation pendant la soumission ;
- erreur proche du champ ;
- confirmation ;
- espace réservé pour éviter les sauts de layout ;
- annonce accessible quand nécessaire.

## Modes d'affichage

Quand une page utilise les préférences d'affichage existantes :

```tsx
const { displayMode } = useSitePreferences();
```

Modes :

```txt
exhaustif
minimaliste
sobre
```

Ne pas recréer une préférence parallèle.

## Accessibilité

Vérifier selon le périmètre :

- navigation clavier ;
- focus visible ;
- labels ;
- erreurs annoncées ;
- contraste ;
- boutons non ambiguës ;
- absence de scroll horizontal involontaire ;
- textes alternatifs utiles.

## Visual first

Visual first ne signifie pas « plus d'animations ».

Un visuel doit :

- condenser une information ;
- montrer une relation ;
- aider à comparer ;
- guider une décision.

Éviter les animations décoratives lourdes et respecter `prefers-reduced-motion`.

## Checklist avant validation

```txt
□ Fiche canonique de page lue
□ Palette canonique vérifiée
□ Composants existants réutilisés
□ PageHeader utilisé pour tout H1 de page concerné
□ Typographie PageHeader non surchargée localement
□ Seules couleur et position varient pour le couple titre / sous-titre
□ Pas de <br> décoratif dans title / subtitle
□ Pas de règle couleur contradictoire
□ États async traités
□ Mobile pris en compte
□ Accessibilité de base vérifiée
□ Pas de changement header/footer sans demande
□ Pas de changement homepage sans demande
```

## Validation

Pour du code UI :

```bash
npm run typecheck
npm run lint
npm run test
```

Pour une route ou une modification structurante :

```bash
npm run build
```

La vérification visuelle navigateur est effectuée seulement lorsqu'elle est demandée.
