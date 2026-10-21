# Layout & spacing canonique

Ce document définit le shell, la grille et le rythme des pages web classiques
CleanMyMap. Il complète `PAGE_HEADER.md` : la page choisit son contenu métier,
sa famille de couleur et, si nécessaire, son alignement de header, mais pas sa
géométrie globale. La lisibilité effective des textes et contrôles est gouvernée
par [`theme-visibility-rules.md`](./theme-visibility-rules.md).

## Chrome global obligatoire

Le ruban supérieur de navigation et le ruban inférieur global font partie du
chrome permanent du site. Ils sont rendus au niveau du layout racine et doivent
rester présents sur toutes les pages du site, y compris les routes
d'authentification et d'onboarding.

Une exception au shell de contenu (`CmmPageLayout`) n'est jamais une exception
au chrome global. En particulier :

- `/sign-in`, `/sign-up` et `/onboarding` conservent le ruban supérieur et le
  ruban inférieur ;
- une page à composition dédiée doit rendre son contenu entre ces deux rubans ;
- une page métier ou un onboarding ne doit pas utiliser un `fixed inset-0`
  plein viewport avec un `z-index` couvrant le chrome global ;
- le header/footer ne doivent pas être recréés localement dans la page :
  `RootLayoutChrome` et `HomeFooter` restent les points d'entrée actuellement
  rendus par `apps/web/src/app/layout.tsx` ;
- les overlays réellement transitoires (dialog, drawer, modal) peuvent passer
  au-dessus du contenu selon leur contrat propre, mais une page d'onboarding
  n'est pas un overlay.

Toute modification d'une surface pleine hauteur doit être vérifiée à 100 % de
zoom sur desktop et mobile afin de confirmer que les deux rubans restent
visibles, non recouverts et sans débordement horizontal.

Les rubans supérieur et inférieur ont une surface de viewport pleine largeur via
`.cmm-ribbon-frame` (`width: 100%`). Cette surface est distincte du shell de
contenu : elle ne réutilise ni `--cmm-page-max-width`, ni
`--cmm-grid-max-width`. Les composants de ruban gardent leurs gutters internes
responsifs ; le footer utilise toujours sa composition exhaustive, sans variante
compacte rendue par route. Les textes visibles des deux rubans utilisent
`--cmm-ribbon-text-size` (`12px`) et le logo de marque reste rendu par
`BrandLogo`.

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
le rythme entre le `PageHeader` et le premier contenu. Sa largeur maximale
canonique est `112rem` (`1792px`) : elle permet aux pages classiques d'exploiter
les grands écrans tout en conservant les gutters du shell.

Les composants racines qui portent une composition dédiée sans pouvoir rendre
`CmmPageLayout` (par exemple l'explorateur, la carte, l'onboarding et les flux
d'action) utilisent la classe partagée `.cmm-page-width`. Elle ne porte aucune
largeur locale : elle applique le même `--cmm-page-max-width` et le même
centrage que le shell canonique. **Contrairement à `CmmPageLayout`, elle ne
fournit pas à elle seule les gutters ni le rythme de page.** Ces responsabilités
restent à la composition spécialisée, sans recréer un système de largeur.
Les mesures de lecture et les formulaires courts conservent leurs contraintes
sémantiques.

Le site n'applique aucun zoom CSS global et aucun fallback `font-size: 80%` sur
`html`. Le layout répond directement à la largeur CSS disponible ; le zoom du
navigateur reste entièrement géré par le navigateur et n'est ni détecté ni
recalculé en JavaScript.

`CmmSectionGroup` est l'unique primitive du rythme entre sections. Les deux
primitives n'acceptent pas de variante de largeur, de padding ou d'espacement :
ces valeurs sont des tokens CSS communs à toutes les pages.

### Composition des rubriques via `SectionShell`

`apps/web/src/components/sections/rubriques/shared.tsx` expose `SectionShell`,
qui porte aujourd'hui l'identité et la composition de nombreuses rubriques.
Ce composant **n'est pas un shell géométrique alternatif** à `CmmPageLayout`.
Son contrat cible de convergence est le suivant :

1. Le `SectionShell` d'une rubrique classique réutilise **un seul** shell de
   contenu canonique, directement ou depuis son ancêtre ; il ne recrée pas un
   second plafond de largeur ou des gutters indépendants.
2. Le `PageHeader` de la rubrique et le premier bloc métier partagent le même
   axe de lecture. Si `hideHeader` est utilisé parce qu'un enfant porte
   l'en-tête, cet enfant reprend le même axe et le même espacement canonique.
3. Le rythme entre grandes sections dépend de `CmmSectionGroup` ou des tokens
   partagés. Les `space-y-*`, `mt-*`, `mb-*`, `py-*` propres aux composants
   peuvent organiser **leur contenu**, pas créer une nouvelle échelle de
   rythme entre sections de page.
4. Un fond de famille, un décor immersif ou un panneau pleine largeur peut
   déborder visuellement du shell **sans déplacer les contenus de lecture et
   leurs CTA** hors de l'axe canonique.
5. `summary`, `traceNote`, `links`, `headingLevel`, `hideHeader` et les états
   métier existants restent fonctionnels lors d'une convergence du shell.

**État observé avant harmonisation :** `SectionShell` ne compose pas
systématiquement `CmmPageLayout`/`CmmSectionGroup` ; des consommateurs
conservent des paddings et espacements locaux. La règle ci-dessus est une
**exigence de migration**, pas la preuve que toutes les rubriques y satisfont
déjà. La migration doit adapter les consommateurs et leurs tests ensemble,
sans double wrapper ni régression d'alignement.

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
| titre de page desktop | `--cmm-page-header-title-size` |
| titre hero desktop | `--cmm-home-hero-title-size` |
| titre impact desktop | `--cmm-home-impact-title-size` |
| hauteur d'aperçu carte homepage | `--cmm-home-map-preview-height*` |
| padding carte rubrique desktop | `--cmm-rubrique-card-padding` |
| padding icône carte rubrique desktop | `--cmm-rubrique-card-icon-padding` |

`--cmm-page-max-width` et `--cmm-grid-max-width` sont découplés. Le premier
contrôle le shell des pages classiques (`112rem`), tandis que le second reste
la limite historique des grilles internes (`90rem`). Les tokens de page
réutilisent les gutters et l'échelle d'espacement existants
(`--cmm-grid-margin-*`, `--space-*`), sans hériter de la largeur maximale de la
grille. Les modes `exhaustif`, `minimaliste` et `sobre`, ainsi que les familles
de couleur, ne redéfinissent aucun de ces tokens : ils ne changent donc pas la
géométrie fondamentale.

Les trois niveaux de largeur sont explicites :

- `viewport ribbon surface` : surface globale pleine largeur, sans plafond de
  page ou de grille ;
- `page content shell` : `CmmPageLayout` ou `.cmm-page-width`, plafonné à
  `--cmm-page-max-width` (`112rem`) ; le premier gère aussi ses gutters et
  son rythme, le second nécessite une composition dédiée ;
- `reading measure` : `cmm-prose`, `cmm-prose-wide`, `cmm-prose-narrow` ou une
  primitive sémantique équivalente pour conserver une mesure de lecture
  raisonnable.

Les espacements internes à une carte, un formulaire, une table ou un flux
métier restent locaux lorsqu'ils décrivent la composition de ce composant et
non le shell de la page. `cmm-content-group` peut être utilisé pour un groupe
interne standard sans recréer une échelle locale.

## Densité UI

La densité visuelle est indépendante de la largeur structurelle. Le site active
la densité globale `compact` à `80 %` via `data-cmm-density` sur l'élément
racine. Cette densité est portée par les tokens partagés et réduit le rythme,
les surfaces, les rayons et les grands titres sur toutes les routes. Le corps
de texte reste à `16px`, le petit texte à `14px` minimum et les captions à
`12px`. Les boutons et champs conservent leurs hauteurs tactiles canoniques.

Une caption ne remplace **jamais** une instruction, un libellé de champ, une
unité indispensable, un résultat ou un élément de navigation. Les microtextes
locaux de 9–11 px utilisés comme information fonctionnelle sont des écarts à
corriger ; leur contraste se vérifie selon `theme-visibility-rules.md`.

À partir de `1024px`, la densité resserre également les grands espacements
(`--cmm-page-padding-block`, `--cmm-page-header-content-gap`,
`--cmm-section-gap`, `--cmm-content-group-gap`,
`--cmm-rubrique-card-padding` et `--cmm-rubrique-card-icon-padding`). Le titre
de page utilise `--cmm-page-header-title-size` avec un plafond à `3.6rem`,
afin que les très grands écrans ajoutent des colonnes et de l'espace horizontal
sans agrandir proportionnellement la typographie.

La composition autonome de la homepage conserve une hauteur de carte propre à
son usage, mais celle-ci reste tokenisée (`--cmm-home-map-preview-height*`) et
est resserrée par la densité `compact`. Les cartes KPI de cette composition
peuvent donc apparaître plus tôt sans réduire le corps de texte ni modifier
les données affichées.

Cette densité ne doit jamais être reproduite avec `zoom`, `transform: scale`,
un wrapper global réduit ou une détection du zoom navigateur.

### Règle de choix du niveau de largeur

Avant d'ajouter une classe `max-w-*`, identifier le niveau auquel elle
appartient :

| Besoin | Niveau attendu | Règle |
| --- | --- | --- |
| page, dashboard, panneau principal | `page content shell` | utiliser `CmmPageLayout` ou `.cmm-page-width` |
| grille de cartes, KPI, tableau | composition interne | utiliser une grille fluide avec `minmax(0, 1fr)` et `min-w-0` sur les items |
| paragraphe, aide, contenu légal | `reading measure` | conserver `cmm-prose*` ou une mesure sémantique équivalente |
| formulaire court, modal, widget, impression | `functional component width` | conserver la limite si elle est justifiée par l'interaction ou le support |

Un composant racine ne doit pas recréer un shell avec `mx-auto` et un plafond
structurel indépendant (`max-w-6xl`, `max-w-7xl`, `container`, `w-[...]`).
Une contrainte locale est acceptable uniquement si elle relève de la lecture
ou d'une fonction précise ; elle doit alors rester imbriquée dans le shell
canonique et non le remplacer.

Le garde-fou de layout applique cette distinction à la structure TSX : un
`max-w-*` de lecture ou de grille interne reste possible, tandis qu'un
`main`/`section` qui recrée un plafond de page (`max-w-6xl`, `max-w-7xl`,
`max-w-screen-*`, `container` ou une largeur arbitraire équivalente) doit
réutiliser `cmm-page-width` ou relever d'une composition spéciale documentée.
Il ne s'agit pas d'interdire toutes les classes `max-w-*`.

La QA responsive des pages comparables vérifie les rectangles DOM et les
valeurs CSS calculées à 390, 768 et 1440 px : axe du `PageHeader`, bords du
shell, gutters, écart vers le premier bloc, rythme de groupe, cartes standard
et absence de débordement horizontal. Les tolérances correspondent aux tokens
du contrat et à l'arrondi de rendu (pas à une comparaison pixel par pixel).
Les modes `exhaustif`, `minimaliste` et `sobre` sont contrôlés sur un panel
représentatif sans créer un inventaire de routes concurrent.

Les grilles internes doivent également neutraliser la largeur minimale
intrinsèque des enfants. `minmax(0, ...)` borne les tracks et `min-w-0` permet
au contenu long de se replier ou de défiler dans sa propre surface, sans
augmenter la largeur du document.

### Zoom navigateur et densité

Le navigateur est libre d'appliquer un zoom de page à `100 %`, `110 %`,
`125 %` ou `150 %`. Le code ne doit ni le détecter ni le compenser : les
unités CSS, les media queries et les `clamp()` répondent à la largeur CSS
réellement disponible. À fort zoom, le reflow naturel et la lisibilité priment
sur le maintien d'une grille desktop.

Pour préserver la lisibilité et la densité appréciée sur grand écran :

- réduire d'abord les grands espacements via les tokens desktop partagés ;
- plafonner les titres avec `clamp()` plutôt que réduire le body ;
- conserver les hauteurs tactiles des boutons et champs ;
- ne jamais appliquer une réduction uniforme de `20 %` aux textes de lecture ou
  aux contrôles tactiles ; la densité `compact` ne réduit que les dimensions
  visuelles non critiques définies par les tokens partagés.

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

Le shell peut donc être large sans élargir artificiellement les textes longs.
Les contenus éditoriaux utilisent `cmm-prose`, `cmm-prose-wide`,
`cmm-prose-narrow` ou une autre contrainte sémantique existante lorsque leur
mesure de lecture le nécessite. Les grilles de cartes, tableaux, KPI et
dashboards peuvent en revanche exploiter la largeur disponible.

## Archétypes de composition et règles de rythme

Un même design system ne signifie pas un même nombre de colonnes sur toutes les pages. Il signifie que les **mêmes rôles fonctionnels** partagent les mêmes règles de composition. Ne pas créer un second registre de familles : les routes et palettes restent gouvernées par `documentation/pages_site/PAGE_FAMILIES.md` et `BLOC_COLOR_SYSTEM_PREMIUM.md`.

| Archétype | Composition attendue | Exceptions fonctionnelles |
| --- | --- | --- |
| Sommaire et découverte (`/explorer`, annuaire) | repère d'orientation, regroupements compréhensibles, liens scannables, navigation consistante | l'exception visuelle `/explorer` garde ses couleurs et sa grille autonome |
| Parcours d'action (`/actions/new`, `/signalement`, rejoindre) | tâche courante et prochaine action visibles, séquencement, retour arrière, état de saisie préservé | carte GPS, uploads, validation et identité suivent leur contrat propre |
| Tableau de bord (`/dashboard`, pilotage, impact) | titre, actions pertinentes, KPI principaux puis détails ; regroupement par décision et non par effet visuel | graphiques, tableaux et vues de pilotage peuvent exploiter une largeur interne dédiée |
| Lecture scientifique (`/methodologie`, `/reports`, données) | résumé puis détails, unités, sources, limites et lecture longue avec mesure typographique | figures scientifiques et tableaux peuvent dépasser la mesure de lecture |
| Apprentissage (`/learn/*`) | instruction, exemple, exercice, résultat et suite facilement distingués | quiz, pédagogie collective et progression conservent leurs interactions métier |

### Contrat d'alignement d'une page comparable

- Un seul axe de lecture pour `PageHeader`, première section et premiers CTA sur une page classique ; le décor peut déborder, pas le texte essentiel.
- L'écart `PageHeader → premier contenu`, le rythme entre sections et les gutters proviennent des tokens canonisés, pas d'une combinaison locale de `mb-*`, `pt-*` et `space-y-*` visant à retrouver visuellement le résultat.
- Dans une carte standard, son padding est du ressort de la primitive (`SURFACES_CARDS.md`) ; dans une grille, le `gap` concerne la relation entre cartes ; dans un long texte, la mesure de lecture concerne `cmm-prose*`.
- Les groupes d'une même rubrique ont des distances internes plus courtes que les distances qui séparent deux sections indépendantes. Ce principe de proximité évite d'utiliser du vide arbitraire comme décoration.
- Les actions restent associées visuellement à l'information ou à l'étape qu'elles contrôlent ; ne pas les éloigner artificiellement par `justify-between`, des cartes surdimensionnées ou une hauteur minimale arbitraire.
- Pour des cartes de même rôle, vérifier mêmes lignes d'alignement du titre, des métadonnées et du CTA. Ne pas imposer la même hauteur si le contenu diffère réellement ou si cela crée du vide.

### Lecture longue et grilles très larges

Le plafond `--cmm-page-max-width` ne doit **jamais** devenir la largeur d'un paragraphe de lecture continue. En l'absence d'une autre contrainte de contenu, cibler environ 45–90 caractères par ligne, avec ~66 caractères comme point de départ de conception ; vérifier le français réel, la taille effective et le viewport. Cette recommandation de l'USWDS est **heuristique**, non une condition WCAG.

Les compositions denses privilégient `minmax(0, 1fr)`, `min-w-0` et un reflow naturel ; une table ou carte interactive peut défiler dans sa propre zone lorsque sa compréhension exige deux dimensions, sans provoquer le débordement de la page entière. Le reflow à 320 CSS px et les situations de zoom jusqu'à 400 % sont à évaluer selon WCAG 1.4.10, avec ses exceptions normatives pour cartes et tableaux.

### Vérification des proportions

Comparer sur deux pages du **même archétype** : rectangles DOM du shell, axe de lecture, H1, premier bloc, grilles et CTA ; styles calculés et captures, en mobile et desktop. Une différence de dimensions n'est un finding que lorsque le rôle est comparable et qu'aucune fonction ou exception documentée ne la justifie. Une photographie ou une capture seule ne prouve pas les dimensions calculées.

**Références externes — repères ou exigences selon le lien, jamais preuves du
runtime :**
- USWDS, typographie et mesure : https://designsystem.digital.gov/components/typography/
- USWDS, échelle d'espacements : https://designsystem.digital.gov/design-tokens/spacing-units/
- W3C, reflow 1.4.10 : https://www.w3.org/WAI/WCAG22/Understanding/reflow.html

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

**Comparabilité entre pages :** deux pages classiques de même rôle suivent les
mêmes axes de titre et de premier contenu, les mêmes gutters et le même système
de rythme entre sections. Deux cartes ou boutons de même variante partagent
leur géométrie interne. En revanche, une carte immersive, un formulaire court,
un tableau ou un document scientifique peuvent avoir une largeur **interne**
fonctionnellement distincte. Une couleur de bloc différente ne permet pas de
changer librement ces invariants.

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

Ces exceptions concernent uniquement le shell et le rythme du contenu. Elles ne
suppriment jamais l'obligation de conserver le chrome global du site, une
lecture accessible et l'absence de débordement non intentionnel.

Toute nouvelle exception doit être ajoutée à
`documentation/design-system/UI_EXCEPTION_PAGES.md` avec sa raison avant de
contourner le shell canonique. Une exception de palette, de forme ou de contenu
ne crée pas automatiquement une exception de largeur ou de typographie.

## Vérification

Pour une modification de layout :

- vérifier que la page utilise le shell canonique lorsqu'elle y est éligible ;
- confirmer que le ruban supérieur et le ruban inférieur globaux restent
  présents et non recouverts ;
- contrôler desktop, tablette et mobile selon les breakpoints existants ;
- vérifier l'absence de débordement horizontal ;
- vérifier l'alignement des blocs denses sans introduire de nouvelle échelle
  locale ;
- confirmer qu'une exception structurelle reste documentée.

La matrice minimale historique de layout est `1366×768`, `1536×864`,
`1920×1080`, `2560×1440`, tablette et mobile. Pour toute recette de cohérence
inter-pages, inclure également les largeurs CSS **390 px**, **768 px** et
**1440 px**, sans les confondre avec les tailles d'écrans physiques. Contrôler :

1. la largeur de `.cmm-ribbon-frame` et de `.cmm-ribbon-surface` ;
2. la largeur, les gutters et le centrage de `CmmPageLayout` ou de la composition
   autorisée autour de `.cmm-page-width` ;
3. l'absence de `scrollWidth > clientWidth` non justifiée ;
4. la présence du chrome global ;
5. la mesure raisonnable des textes longs ;
6. pour des pages classiques comparables, les rectangles DOM et styles calculés
   de `PageHeader`, du premier bloc, des sections et des CTA ;
7. l'absence de double shell, de paddings cumulés et de dimensions
   fonctionnelles imposées à une surface voisine.

Une vérification de zoom navigateur doit confirmer que le body reste lisible,
que les contrôles se réorganisent sans chevauchement et qu'aucun code du site
ne lit ou ne recalcule une valeur de zoom. Une simple inspection à `100 %` ne
prouve pas le comportement aux autres niveaux de zoom.

La comparaison se fait par **rôle** et géométrie utile, pas par identité
pixel-perfect de contenus différents. Classer les défauts mesurés, les
exceptions justifiées et les surfaces non évaluables. Une capture visuelle
et une assertion DOM sont des preuves complémentaires, pas interchangeables.

## Garde-fou

`npm run check:layout` contrôle des primitives et des règles de shell dans son
périmètre d'implémentation actuel. Ce contrôle statique ne garantit pas à lui
seul une homogénéité visuelle entre toutes les routes ni le reflow navigateur.
Lors d'une évolution du garde, lui ajouter des cas valides et invalides
représentatifs sans interdire les mesures de lecture ou les dimensions
fonctionnelles justifiées et sans étendre une allowlist pour masquer une dérive.
