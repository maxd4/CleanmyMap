# PageHeader — contrat canonique des titres de page

`PageHeader` est le composant de référence pour tous les titres de page visibles du repo.

Ce document est la **source canonique unique pour la géométrie et la typographie du titre et du sous-titre de page**. Les autres documents peuvent définir la couleur, la famille visuelle ou une exception de positionnement, mais ne doivent pas redéfinir les tailles, graisses, interlignages, tracking, largeurs ou comportements responsive du couple titre / sous-titre.

## Principe d'uniformité

À contenu différent, toutes les pages doivent présenter le même système de titre.

Les seules variations visuelles autorisées entre pages sont :

1. **la couleur**, déterminée par `family`, ou par `tone` / `contrast` lorsqu'aucune famille ne s'applique ;
2. **la position**, via `align="left"` ou `align="center"`, lorsque ce choix est documenté.

Ne doivent pas varier localement :

- famille typographique ;
- taille ;
- graisse ;
- line-height ;
- tracking ;
- largeur typographique ;
- espacement entre titre et sous-titre ;
- comportement responsive ;
- règle de troncature ou de retour à la ligne.

Une page ne doit jamais corriger un problème de titre en inventant sa propre variante typographique.

## Portée et sources de vérité

- `PAGE_HEADER.md` gouverne la **structure, la typographie et la géométrie** du titre / sous-titre ;
- `BLOC_COLOR_SYSTEM_PREMIUM.md` gouverne la **couleur par famille** ;
- `UI_EXCEPTION_PAGES.md` peut documenter une exception de **palette, shell ou alignement**, mais ne crée pas de variante typographique de `PageHeader` ;
- la fiche canonique de chaque page dans `documentation/pages_site/` définit le **contenu** du titre, du sous-titre et, si nécessaire, l'alignement ;
- `apps/web/src/components/ui/page-header.tsx` et les classes `cmm-page-header-*` portent l'implémentation runtime.

En cas de contradiction, ne pas créer une correction locale : aligner la documentation et le composant canonique.

## Règle générale

- toute page avec un titre principal visible doit utiliser `PageHeader`, sauf surface explicitement gouvernée par un composant système différent, par exemple un état `SystemState` documenté ;
- le titre principal est rendu en `h1` par `PageHeader` ;
- `PageHeader` est l'unique composant runtime pour les titres principaux de page ;
- aucun nouveau système de titre décoratif ne doit être créé ;
- le header canonique est centré sur le couple **titre + sous-titre**, avec une éventuelle `action` latérale ;
- les repères de contexte, pills, badges et eyebrow ne font pas partie du contrat canonique du titre de page ;
- les sous-titres restent courts, lisibles et non exhaustifs ;
- les majuscules décoratives ne doivent pas remplacer la hiérarchie typographique.

## Invariants typographiques

### Titre principal

Le titre doit utiliser exclusivement `cmm-page-header-title`.

Valeurs canoniques actuellement portées par le runtime :

```css
font-size: clamp(2.5rem, 4vw, 4.5rem);
font-weight: 900;
line-height: 0.96;
letter-spacing: -0.05em;
```

Règles :

- aucune page ne doit ajouter une classe locale `text-*`, `font-*`, `leading-*` ou `tracking-*` au titre ;
- aucune page ne doit définir sa propre largeur, son propre `white-space` ou sa propre troncature pour le titre ;
- aucun `<br>` manuel ne doit être injecté dans le titre pour obtenir une composition visuelle ;
- le comportement responsive appartient au composant global et doit rester identique pour toutes les pages ;
- si un titre ne tient pas correctement, raccourcir d'abord le libellé ; si le problème est systémique, corriger `PageHeader` globalement plutôt qu'une page isolée.

### Sous-titre

Le sous-titre doit utiliser exclusivement `cmm-page-header-subtitle`.

Valeurs canoniques actuellement portées par le runtime :

```css
max-width: 42rem;
font-size: 1rem;
font-weight: 500;
line-height: 1.55;
```

Règles :

- maximum deux lignes selon le comportement global du composant ;
- aucune page ne doit ajouter une classe locale `text-*`, `font-*`, `leading-*`, `tracking-*`, `max-w-*` ou `line-clamp-*` au sous-titre ;
- pas de `<br>` manuel ;
- le sous-titre décrit la page, il ne remplace ni une introduction longue ni une liste d'informations ;
- les détails lourds doivent être déplacés dans le corps de page.

### Conteneur

La géométrie du couple titre / sous-titre est portée par `cmm-page-header` et doit rester commune au site.

Valeur structurante actuelle :

```css
max-width: 42rem;
gap: 1rem;
```

Une page peut ajuster le placement du bloc dans son layout, mais pas recréer une largeur ou un rythme typographique parallèle.

## Variations autorisées

### Couleur

La couleur est la principale variation visuelle autorisée.

Priorité :

1. `family` gagne si elle est fournie ou résolue ;
2. sans `family`, `tone` sert de fallback ;
3. sans `family` ni `tone`, fallback `stone` ;
4. `contrast="inverse"` modifie uniquement les couleurs de lecture sur surface sombre.

`contrast` ne doit jamais modifier la taille, la graisse, le tracking, la largeur ou l'alignement.

### Position

`align` accepte uniquement :

- `left` — valeur standard ;
- `center` — uniquement lorsqu'un hero ou une fiche canonique de page le justifie.

Règles :

- pas d'alignement `right` ;
- titre et sous-titre restent alignés ensemble ;
- un changement `left` ↔ `center` doit être documenté dans la fiche de page ou dans une exception UI ;
- l'alignement ne change jamais la typographie.

### Action latérale

`action` peut porter une métadonnée ou une action contextuelle, par exemple une date de mise à jour.

Elle doit :

- rester secondaire par rapport au H1 ;
- ne pas réduire artificiellement le titre au point d'imposer une variante locale ;
- être déplacée sous ou à côté du header par le layout responsive global si nécessaire.

## Props autorisées

| Prop | Type | Statut canonique | Rôle |
|---|---|---|---|
| `title` | `ReactNode` | obligatoire | titre principal |
| `subtitle` | `ReactNode` | recommandé si utile | sous-titre bref |
| `action` | `ReactNode` | optionnel | métadonnée ou action contextuelle |
| `align` | `"left" \| "center"` | optionnel | position du bloc, `left` par défaut |
| `family` | `ResolvedPageFamily` | prioritaire | couleur issue de la famille |
| `tone` | `PageHeaderTone` | fallback | couleur des surfaces autonomes |
| `contrast` | `"default" \| "inverse"` | optionnel | contraste de lecture uniquement |
| `className` | `string` | exceptionnel | ajustement du wrapper uniquement, jamais de la typographie |
| `actionClassName` | `string` | local | placement de l'action uniquement |

Les anciennes props `eyebrow`, `badge`, `badges` et `badgesClassName` ont été supprimées après migration de leurs consommateurs internes. Elles ne font pas partie du contrat runtime.

## Tons disponibles

`PageHeaderTone` accepte :

- `emerald`
- `sky`
- `red`
- `pink`
- `indigo`
- `yellow`
- `slate`
- `stone`

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
| Accueil & Pilotage | `amber` / `orange` / brun selon les tokens de famille | passer par `family` |
| Agir | `emerald` | teinte terrain |
| Cartographie & Impact | `sky` pour la cartographie, `red` / `rose` pour l'impact | hérité de la famille |
| Réseau & Discussions | `pink` / `indigo` | réseau vs partenaires |
| Apprendre | `yellow` / `amber` | famille éducative |
| Institutionnel & Légal | `slate` | surfaces juridiques et institutionnelles |
| Autres familles autonomes | `stone`, `slate` ou palette dédiée | auth, system, admin, print |

Les couleurs précises restent gouvernées par `BLOC_COLOR_SYSTEM_PREMIUM.md` et `resolvePageFamily`.

## Responsive et lisibilité

- ne jamais corriger localement un overflow par une taille de police spécifique à une route ;
- ne jamais réduire le tracking ou la graisse sur une seule page ;
- ne jamais utiliser un retour à la ligne décoratif ;
- le comportement de wrapping / ellipsis doit être décidé une seule fois dans les classes `cmm-page-header-*` ;
- si plusieurs pages rencontrent le même problème, modifier le composant canonique et ses tests plutôt que multiplier les exceptions ;
- le sous-titre reste au maximum sur deux lignes et conserve le même rythme sur toutes les pages.

## Exceptions

Une exception UI ne peut pas être utilisée pour inventer une taille de H1 différente.

Une exception peut uniquement justifier :

- une palette différente ;
- `align="center"` au lieu de `left` ;
- l'usage d'un autre shell canonique pour une surface système qui n'est pas un header de page classique.

Toute exception doit être documentée dans `UI_EXCEPTION_PAGES.md`.

## Validation

Pour toute modification de page avec un titre visible, vérifier :

```txt
□ PageHeader est utilisé pour le H1
□ aucun H1 concurrent n'est rendu dans le même header
□ aucune taille locale n'est appliquée au titre
□ aucune graisse locale n'est appliquée au titre
□ aucun tracking / line-height local n'est appliqué
□ aucun <br> manuel n'est utilisé dans title ou subtitle
□ aucune largeur typographique locale n'est ajoutée
□ subtitle reste court et au maximum sur deux lignes
□ la couleur vient de family / tone / contrast
□ l'alignement est left ou center et est documenté si center
□ les props legacy eyebrow / badge / badges ne sont pas introduites
```

Si une règle doit changer pour des raisons UX ou responsive, modifier le contrat global, le composant, les styles et les tests ensemble. Ne jamais créer une variante par page.

## Règle d'évolution

- ne pas créer de nouveau header à la main ;
- ne pas recréer `PageHeader` sous une autre forme ;
- utiliser `PageHeader` dès la première itération d'une nouvelle route ;
- ne pas ajouter de prop de taille, graisse, tracking ou largeur destinée à une seule page ;
- si une nouvelle variation devient réellement nécessaire, elle doit être justifiée comme règle globale et non comme exception locale ;
- les changements de couleur passent par les familles / tons ;
- les changements de position passent par `align` ;
- aucun alias de hero ne doit être recréé autour de `PageHeader`.

## Références

- [`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md)
- [`UI_EXCEPTION_PAGES.md`](./UI_EXCEPTION_PAGES.md)
- [`README.md`](./README.md)
- `apps/web/src/components/ui/page-header.tsx`
- `apps/web/src/app/globals.css` (point d’entrée)
- `apps/web/src/styles/typography.css`
- `apps/web/src/lib/ui/page-families/`
