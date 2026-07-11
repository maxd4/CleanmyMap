# Design System — Guide IA

Référence d'entrée avant toute modification UI de CleanMyMap.

## Ordre de lecture

1. `BLOC_COLOR_SYSTEM_PREMIUM.md`
2. `PAGE_HEADER.md`
3. `charte-ui-pro-moderne-futuriste.md`
4. `cleanmymap-ui-ux-pro-max.md` pour les écrans métier denses
5. `UI_EXCEPTION_PAGES.md`
6. fiche canonique de la page dans `documentation/pages_site/`

## Composants canoniques

Réutiliser les composants existants avant d'en créer de nouveaux.

Exemples :

```tsx
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
```

Pour un titre de page visible, `PageHeader` est la référence par défaut.

`PageHero` reste un alias de compatibilité pour les pages héritées.

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

### Typographie

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

### Titres

Éviter les retours à la ligne décoratifs.

Ordre de correction :

1. taille ;
2. tracking ;
3. largeur ;
4. adaptation mobile.

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
□ PageHeader utilisé si pertinent
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
