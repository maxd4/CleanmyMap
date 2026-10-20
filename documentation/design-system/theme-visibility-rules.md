# Contrat de visibilité des thèmes

**Statut : `CURRENT`**

Ce document gouverne **le contraste, la lisibilité effective et la visibilité** des textes, contrôles, états et surfaces dans les thèmes et modes d'affichage du Web CleanMyMap. Les couleurs et les tokens runtime sont définis dans `apps/web/src/styles/tokens.css` et les feuilles importées par `apps/web/src/app/globals.css`. Les tailles et densités relèvent de [`LAYOUT_SPACING.md`](./LAYOUT_SPACING.md), les titres de [`PAGE_HEADER.md`](./PAGE_HEADER.md).

## Invariants de lecture

- Une information ou action essentielle est lisible sans survol, animation, effet de verre, glow ni changement de mode.
- La couleur seule ne transmet ni état, ni résultat, ni permission, ni catégorie scientifique. Utiliser un libellé, une icône compréhensible ou un autre repère lorsque nécessaire.
- Le texte courant, les indications de formulaire, les valeurs KPI, les liens, légendes indispensables et messages d'erreur ne sont pas traités comme des ornements. Le texte secondaire peut être moins saillant, **pas illisible**.
- Une surface claire appelle du texte de contraste adapté au fond réellement rendu ; une surface sombre appelle la combinaison inverse. Une couleur de famille ne justifie pas une opacité insuffisante.
- Respecter la hiérarchie des actions et les teintes documentées sans créer une palette alternative par page.
- Les modes `exhaustif`, `minimaliste` et `sobre` conservent le même contenu utile et les mêmes contrats d'accessibilité. Ils peuvent modifier les effets selon [`DISPLAY_MODES_CANONICAL.md`](./DISPLAY_MODES_CANONICAL.md), pas neutraliser la lisibilité. `prefers-reduced-motion` prime pour la motion.

## Contraste mesurable

Utiliser les critères WCAG 2.2 AA applicables au **rendu calculé** :

| Élément | Critère minimal pertinent |
| --- | --- |
| Texte courant, lien, aide, légende indispensable et message d'état | **4,5:1** pour le contraste texte/fond |
| Grand texte au sens WCAG (au moins 24 px normal ou environ 18,7 px gras) | **3:1** pour le contraste texte/fond |
| Bordure ou indicateur visuel nécessaire à l'identification d'un composant ou de son état | **3:1** contre la ou les couleurs adjacentes pertinentes |

Les seuils s'appliquent aux éléments effectivement concernés par les critères WCAG 1.4.3 et 1.4.11 ; ne pas exiger un contraste textuel d'une décoration purement informative ou désactivée quand l'exception normative est applicable. La conformité ne se déduit pas du nom d'une classe CSS.

Pour les gradients, images et transparences, mesurer la combinaison de couleurs **au point le moins favorable sous le texte**, dans chaque thème et mode supporté. Si le fond est variable ou imprévisible, utiliser une surface de protection opaque ou suffisamment contrastée ; ne pas se contenter d'un contraste calculé contre une couleur théorique.

## Typographie et densité

La grille typographique et la densité sont définies dans `LAYOUT_SPACING.md` : corps de texte de **16 px**, petit texte de **14 px minimum**, captions de **12 px** pour métadonnées réellement accessoires. Les textes fonctionnels, instructions, valeurs et légendes nécessaires à la compréhension ne deviennent pas des captions pour gagner de la place.

Les tailles locales de **9 à 11 px** présentes dans certaines rubriques sont des écarts à corriger lorsqu'elles servent à lire une information ou guider une action, et non des variantes à consacrer. Évaluer le besoin d'une vraie caption, puis privilégier les classes typographiques et les tokens déjà disponibles.

Ne pas résoudre une surcharge par un zoom CSS global, `transform: scale`, une baisse générale des tailles ou des espacements artificiellement condensés. Réduire d'abord le bruit décoratif et regrouper les informations par responsabilité.

## États, thèmes et interactions

- Vérifier normal, hover, active, focus-visible, loading, disabled, erreur et succès lorsque ces états existent.
- Le focus clavier doit rester repérable indépendamment du hover et des effets premium.
- Le contenu texte ne peut pas être masqué en permanence par une superposition décorative, une opacité insuffisante, un clipping ou une transition.
- Les ombres et glows sont facultatifs ; une bordure, une séparation ou un état indispensable doit subsister en `minimaliste` et `sobre`.
- À 125 % et 150 % de zoom navigateur, le contenu doit se redisposer naturellement sans réduction compensatoire des polices. Les prescriptions de reflow restent celles du contrat de layout.

## Accessibilité interactive : exigences et préférence de produit

Les vérifications doivent couvrir les critères WCAG 2.2 AA applicables à la surface, **pas seulement les ratios de contraste**.

| Sujet | Exigence externe ou règle projet | Vérification pratique |
| --- | --- | --- |
| Cible pointeur | WCAG 2.5.8 AA : au moins 24 × 24 CSS px, sauf exceptions prévues (espacement, inline, équivalent, etc.) ; **préférence CleanMyMap :** viser 44 px ou plus pour les actions tactiles ordinaires, sans inventer de nouvelle taille `CmmButton` | mesurer la boîte interactive réelle et ses voisins ; `CmmButton size="sm"` est à 40 px de hauteur dans le contrat actuel, et ne devient pas automatiquement une erreur WCAG |
| Focus | ordre logique, visibilité, non-masquage par overlay ou navigation persistante | Tab, Shift+Tab, focus après ouverture et fermeture de dialogue ; inspecter également WCAG 2.4.11 |
| Reflow | WCAG 1.4.10 : aucun défilement bidimensionnel pour les contenus ordinaires à 320 CSS px, sous réserve des exceptions pour cartes/tableaux | zoom jusqu'à une largeur CSS équivalente de 320 px ; pas de perte de données, d'action ni de label |
| Espacements du texte | WCAG 1.4.12 : **supporter sans perte** les espacements imposés par l'utilisateur ; cela n'oblige pas à adopter ces espacements comme style normal | tester line-height 1,5 ; espacement entre paragraphes 2 ; lettres 0,12em ; mots 0,16em |
| Identification des états | textes et indicateurs perceptibles sans la seule couleur | vérifier selected, success, error, loading, disabled, focus sur chaque mode |

Ne pas remplacer le navigateur et les tests d'assistance par une simple comparaison de classes CSS. Un test automatique de contraste ne valide pas seul la navigation au clavier, la lisibilité d'une carte ou la compréhension des textes.

## Qualité rédactionnelle et hiérarchie des textes

- Préférer une phrase claire à un slogan en capitales, un label extrêmement espacé ou un jargon interne.
- Le titre dit ce que l'utilisateur peut faire ou comprendre ; le texte secondaire apporte du contexte, sans répéter le titre.
- Une information capitale (statut d'action, date, lieu, montant, source, limite scientifique) ne doit jamais être une caption décorative ou dépendre d'un `hover`.
- Pour les longs paragraphes, privilégier des blocs courts, alignés à gauche et une mesure de lecture raisonnable ; les chiffres et unités gardent leur association visuelle.
- Lorsqu'un axe visuel est entièrement construit par le CSS, mesurer le texte **sur son arrière-plan effectif** : un contraste satisfaisant en mode clair peut être insuffisant sous gradient, dans un panel translucide, ou en mode `sobre`.

**Références :** https://www.w3.org/TR/WCAG22/ ; https://designsystem.digital.gov/components/typography/ ; https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/

## Vérification et preuve

Pour toute correction de lisibilité, relever la surface, le texte ou contrôle, le thème, le mode, l'état, la taille CSS calculée, les couleurs effectives et le contraste mesuré. Pour un gradient, tester la région défavorable. Documenter les exceptions normatives justifiées sans utiliser leur existence pour masquer une information importante.

Sur une page représentative, vérifier au minimum mobile, tablette, desktop, navigation clavier et les trois modes d'affichage. Un audit statique des classes n'est pas une preuve d'un contraste rendu ni du comportement au zoom. Distinguer `STATIC_CONTRACT`, `EXECUTED_BEHAVIOR` et observation navigateur conformément à `documentation/development/TESTING.md`.

## Contrats connexes

Les couleurs par famille et la hiérarchie des actions sont dans [`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md). Les cartes, états, exceptions et visualisations relèvent respectivement de [`SURFACES_CARDS.md`](./SURFACES_CARDS.md), [`STATES_FEEDBACK.md`](./STATES_FEEDBACK.md), [`UI_EXCEPTION_PAGES.md`](./UI_EXCEPTION_PAGES.md) et [`VISUAL_STORYTELLING.md`](./VISUAL_STORYTELLING.md). Ne pas déplacer dans ce document leurs règles de composition, de métier ou de palette.
