# Charte UI pour les pages hors blocs

Ce document propose une charte documentaire pour les pages qui ne rentrent pas dans les 5 blocs principaux deja documentes et pour les familles autonomes de la taxonomie 11 types.

Il ne modifie ni l UI, ni les tokens, ni les composants. Il sert de base d audit et de decision avant toute correction page par page.
L'index maître `INDEX.md`, le plan `PAGE_FAMILIES_PLAN.md` et les fiches `README.md` canonique reprennent maintenant ces categories d audit pour servir de source de verite exploitable par les agents.

## Sources de reference deja en place

- [`documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md`](../design-system/BLOC_COLOR_SYSTEM_PREMIUM.md)
- [`documentation/design-system/UI_EXCEPTION_PAGES.md`](../design-system/UI_EXCEPTION_PAGES.md)
- [`documentation/design-system/theme-visibility-rules.md`](../design-system/theme-visibility-rules.md)
- [`documentation/design-system/README.md`](../design-system/README.md)
- [`documentation/pages_site/INDEX.md`](./INDEX.md)
- [`documentation/pages_site/PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md)

## Taxonomie de reference

Le dossier `documentation/pages_site` est maintenant lu selon 11 types de routes.

| # | Type | Statut | Lecture pour cette charte |
|---|---|---|---|
| 00 | Homepage (hors bloc) | autonome | famille autonome, hors bloc |
| 01 | Accueil & Pilotage (bloc) | bloc | hors perimetre de cette charte, deja defini par la charte de bloc |
| 02 | Agir (bloc) | bloc | hors perimetre de cette charte, deja defini par la charte de bloc |
| 03 | Cartographie & Impact (bloc) | bloc | hors perimetre de cette charte, deja defini par la charte de bloc |
| 04 | Reseau & Discussions (bloc) | bloc | hors perimetre de cette charte, deja defini par la charte de bloc |
| 05 | Apprendre (bloc) | bloc | hors perimetre de cette charte, deja defini par la charte de bloc |
| 06 | Auth & Onboarding (hors bloc) | autonome | pleinement couvert par cette charte |
| 07 | Institutionnel & Legal (hors bloc) | autonome | pleinement couvert par cette charte |
| 08 | Systeme & Utilitaires (hors bloc) | autonome | pleinement couvert par cette charte |
| 09 | Admin & Super-admin (hors bloc) | autonome | pleinement couvert par cette charte |
| 10 | Print & Export (hors bloc) | autonome | pleinement couvert par cette charte |

Les types 00 et 06 à 10 sont les familles autonomes les plus directement concernées ici. Les types 01 à 05 restent traites par leur charte de bloc, sauf exception UI documentee.

## Limites connues et solutions proposees

Le plan `PAGE_FAMILIES_PLAN.md` documente deja les limites du modele `page-families`. Cette charte reprend ici les points utiles pour les pages hors blocs.

| Limite | Impact sur les pages hors blocs | Solution retenue |
|---|---|---|
| Coexistence de plusieurs systemes couleur | risque de melanger une palette autonome avec une teinte de bloc | garder les familles hors blocs neutres ou autonomes, et eviter d injecter une couleur de bloc sans arbitrage |
| Boutons et liens d action | risque de recoloration incoherente dans auth, legal, utilitaires ou print | conserver les boutons existants quand la charte le demande, sans les recolorer a la main |
| Sections dynamiques | risque de dupliquer une palette selon un parametre de route | faire heriter la page dynamique de sa famille parente, avec exception documentee si necessaire |
| Derive des exceptions | risque de multiplier les cas speciaux hors bloc | rattacher chaque exception a `INDEX.md` et au plan avant toute nouvelle derogation |
| Cartes metier et layouts specifiques | risque de creer des variantes visuelles hors cadre | favoriser les composants communs et documenter les variantes au lieu de les disséminer |
| Homepage et marketing | risque de confondre homepage et bloc 01 | garder la homepage comme famille autonome distincte |

## Regles UI deja verrouillees

### 5 blocs principaux

- `Accueil & Pilotage`:
  - accueil -> `amber` / `orange`
  - pilotage -> `amber` / `brun`
- `Agir` -> `emerald`
- `Cartographie & Impact`:
  - carto -> `sky`
  - impact -> `red`
- `Reseau & Discussions` -> `pink` / `indigo` (`réseau` / `discussion` vs `partenaires`)
- `Apprendre` -> `yellow`

### Exceptions UI deja stabilisees

- `/explorer` reste la page Sommaire de reference.
- Les pages d'impact rouges (`/reports`, `/gamification`) sont documentees comme exceptions UI rouges du bloc Cartographie & Impact.
- La homepage (`/`) est une famille autonome, pas une exception de bloc.

### Familles autonomes deja reconnues

- Auth & Onboarding
- Institutionnel & Legal
- Systeme & Utilitaires
- Admin & Super-admin
- Print & Export

## Pages et familles a ne pas toucher

Ces elements sont hors perimetre de la charte parce qu ils sont deja figes, terminés, ou hors logique de recoloration de bloc.

| Route ou famille | Statut | Pourquoi |
|---|---|---|
| `/` | Famille autonome | Identite visuelle propre de la homepage |
| `/explorer` | Exception UI validee | Sommaire considere comme abouti |
| `/reports` et `/gamification` | Exceptions UI rouges | Impact conserve comme exception visuelle rouge |
| `/sign-in`, `/sign-up`, `/onboarding`, `/onboarding/localisation` | Famille autonome | Fond lavande clair vers vert menthe clair, Clerk violet nuit / indigo fonce |
| `/declaration` | Alias / redirection | Pas de UI propre |
| `/community`, `/messagerie`, `/open-data`, `/sandbox`, `/gamification` | Alias / redirections | Pas de UI propre |
| Pages deja couvertes par les 5 blocs principaux | Hors scope | Suivent leur charte de bloc existante |

La route `/methodologie` est maintenant documentee dans le bloc `Cartographie & Impact` et ne releve plus de cette charte hors blocs.

## Proposition de classification des pages hors blocs

### Auth et onboarding

Routes detectees:

- `/sign-in`
- `/sign-up`
- `/onboarding`
- `/onboarding/localisation`

Role fonctionnel:

- creer, connecter, configurer, ou reprendre un compte

Palette proposee:

- fond: lavande claire vers vert menthe clair
- carte Clerk: violet nuit / indigo fonce
- bulles decoratives: indigo, violet, vert profond
- texte carte: blanc
- texte secondaire: lavande claire
- accents: vert uniquement pour validation, badge, icone ou halo leger
- boutons: ne pas modifier, respecter les regles existantes

Ressenti attendu:

- rassurant
- lisible
- peu spectaculaire

Composants recommandes:

- cartes uniques de centrage
- champs de formulaire
- stepper simple
- aides contextuelles courtes
- un seul CTA principal lisible

Niveau de sobriete attendu:

- eleve

Niveau de densite textuelle:

- faible a moyen

Regles cartes / bulles / badges / callouts:

- une seule carte dominante par etape
- bulles decoratives limitees et en indigo, violet ou vert profond
- badges uniquement pour validation, etat ou progression
- callouts courts, orientes action
- le vert ne sert qu a la validation, au badge, a l icone ou au halo leger
- les boutons suivent la charte existante et ne sont pas recolores ici

### Compte, profil et parametres

Routes detectees:

- `/dashboard`
- `/profil`
- `/profil/[profile]`
- `/reglages`

Observation:

- la plupart de ces routes sont deja absorbees par le bloc `Accueil & Pilotage`
- seul `/reglages` se comporte comme une page de reglage plus neutre

Palette proposee si une famille autonome est un jour isolee:

- couleur principale: `slate`
- couleur secondaire eventuelle: `teal`

Ressenti attendu:

- operatif
- personnel
- peu marketing

Composants recommandes:

- cartes de synthese
- listes de preferences
- panneaux de configuration
- interrupteurs et champs simples

Niveau de sobriete attendu:

- eleve

Niveau de densite textuelle:

- moyen

Regles cartes / bulles / badges / callouts:

- prioriser les sections fonctionnelles
- pas de bulles contextuelles inutiles
- badges reserves aux roles, statuts et variantes de profil

### Pages legales et institutionnelles

Routes detectees:

- `/contact`
- `/conditions-generales-utilisation`
- `/conditions-utilisation`
- `/mentions-legales`
- `/politique-confidentialite`
- `/politique-cookies`
- `/en`

Role fonctionnel:

- informer, encadrer, documenter, rassurer

Palette proposee:

- couleur principale: `slate`
- couleur secondaire eventuelle: `gris clair` / `white`
- saturation tres faible
- contraste typographique propre

Principes visuels:

- pas de gradients visibles
- pas de glow, halos, textures ou couleurs flashy
- pas d esthetique marketing blocks
- espace blanc prioritaire
- largeur de lecture limitee
- titres, sous-titres, espacements et sections uniformises
- mobile et desktop doivent rester strictement lisibles et homogènes

Composants recommandes:

- `LegalSection` comme brique de section partagee
- `LegalLayout` comme pattern ou composant partage a valider si plusieurs routes le justifient
- sections textuelles structurees
- ancres
- accordions sobres
- blocs de contact compacts
- blocs de reference ou d engagement

Regles de contenu:

- texte bref et institutionnel
- pas de storytelling marketing
- pas de bulles decoratives
- pas d explications trop longues dans l UI
- conserver seulement ce qui aide la comprehension juridique ou la prise de contact

Ressenti attendu:

- institutionnel
- stable
- sobre

Niveau de sobriete attendu:

- tres eleve

Niveau de densite textuelle:

- eleve, mais structuree

Regles cartes / bulles / badges / callouts:

- peu de cartes
- pas de bulles decoratives
- badges tres rares
- callouts reserves aux points juridiques ou aux actions utiles
- les cartes ne doivent pas resembler a des blocs marketing
- les sections doivent partager la meme charte d espacement et de titre d une page a l autre

### Aide, support, FAQ

Routes detectees actuellement:

- aucune page autonome clairement identifiee dans l inventaire actuel

Cas couvert par la documentation existante:

- une partie de l aide vit dans `/learn/*`
- une partie du support vit dans `/contact`

Palette proposee pour une future page dedicatee:

- couleur principale: `slate`
- couleur secondaire eventuelle: `cyan` tres modere

Ressenti attendu:

- utile
- explicatif
- non intrusif

Composants recommandes:

- recherche
- FAQ en accordions
- cards de parcours
- liens d assistance

Niveau de sobriete attendu:

- eleve

Niveau de densite textuelle:

- moyen

Regles cartes / bulles / badges / callouts:

- limiter les encarts
- favoriser les blocs FAQ
- bulles seulement si elles servent une action ou une reponse courte

### Pages d erreur, de refus et d etat vide

Routes detectees:

- `/error/429`

Etats associes sans route dediee identifiee:

- loading
- empty state
- access refused

Palette proposee:

- erreur critique: `red`
- quota / limite / attention: `amber`
- loading: `slate`
- empty state: `slate` doux
- access refused: `slate` avec leger accent `red` / `orange`

Architecture commune recommandee:

- `SystemStateLayout`
- `SystemStateIcon`
- `SystemStateTitle`
- `SystemStateDescription`
- `SystemStateAction`
- `SystemStateMeta`

Variantes documentaires:

- `variant="error"`
- `variant="warning"`
- `variant="empty"`
- `variant="loading"`
- `variant="forbidden"`
- `variant="offline"`

Exigences visuelles:

- espaces, tailles d icones et largeurs identiques d un etat a l autre
- memes boutons et meme logique de texte
- animations tres minimales
- skeletons sobres
- loaders doux et discrets
- pas de spinner enorme
- pas de grosses illustrations cartoon
- pas d emojis enormes
- pas d ecrans vides dramatiques
- pas de gradients agressifs
- aucun ecran vide sans CTA utile

Ressenti attendu:

- clair
- immediat
- rassurant
- professionnel
- l etat 429 doit rester technique mais calme

Composants recommandes:

- une icone
- un message court
- une action primaire
- une action secondaire si utile
- CTA utiles possibles: `Créer une action`, `Explorer la carte`, `Retour accueil`, `Réessayer`, `Contacter le support`

Niveau de sobriete attendu:

- tres eleve

Niveau de densite textuelle:

- faible

Regles cartes / bulles / badges / callouts:

- une seule carte de message dans la plupart des cas
- pas de surcharge decorative
- badges uniquement pour la nature de l erreur ou du refus
- pas d esthetique dramatique
- pas de variantes visuelles dispersées page par page
- les etats doivent etre documentes dans les fiches UI de chaque route

### Pages standalone et outils utilitaires

Routes detectees:

- `/form-comparison`
- `/preview/actions/new`
- `/declaration-simple`
- `/reglages`

Observation:

- ces pages sont des outils ou des surfaces de travail autonomes
- elles ne doivent pas reprendre les palettes fortes des blocs principaux
- elles partagent le meme systeme de surfaces, radius, ombres, typographie, spacing, boutons, halos, textures et transitions
- elles utilisent une micro-identite contextuelle legere via une mood layer, pas une palette de bloc

Palette proposee par usage:

- `/form-comparison` -> `indigo + cyan doux`
- `/preview/actions/new` -> `vert + teal`
- `/declaration-simple` -> `vert clair + neutres`
- `/reglages` -> `slate + gris doux`
- couleur secondaire eventuelle: accent tres discret, jamais un gros aplat decoratif

Ressenti attendu:

- analytique ou fonctionnel selon la page
- lisible
- efficace
- plus de respiration visuelle que les blocs homepage

Composants recommandes:

- panneaux splits
- tableaux
- previews
- blocs de comparaison
- cartes fonctionnelles
- cartes de configuration
- aides ultra courtes

Niveau de sobriete attendu:

- moyen a eleve

Niveau de densite textuelle:

- moyen

Regles cartes / bulles / badges / callouts:

- privilégier les panneaux utilitaires plutot que les bulles decoratives
- les badges servent au statut, au mode ou a la version
- callouts limites aux differences essentielles
- les bulles decoratives doivent rester rares, diffuses et contextuelles
- les surfaces doivent rester plus sobres que les blocs principaux

### Routes dynamiques

Routes detectees:

- `/missions/[id]`
- `/parcours/[profile]`
- `/profil/[profile]`
- `/sections/[sectionId]`

Regle:

- une route dynamique n invente pas une nouvelle palette par defaut
- elle herite la famille de sa route parente
- si la route dynamique n a pas de famille clairement identifiee, elle doit rester en palette neutre jusqu a arbitrage

Palette proposee:

- heritee de la famille parente
- a defaut: `slate` / `neutral` avec accent contextuel tres discret

Ressenti attendu:

- contextualise
- structure
- non decoratif

Composants recommandes:

- breadcrumb
- titre de contexte
- resume
- panneaux d etat
- skeletons de chargement

Niveau de sobriete attendu:

- depend de la famille parente

Niveau de densite textuelle:

- moyen

Regles cartes / bulles / badges / callouts:

- limiter les bulles contextuelles redondantes
- les badges doivent expliquer un statut, pas decorer

### États des pages protégées et dynamiques

Routes concernées:

- toutes les pages au statut `protégé`
- toutes les routes au statut `dynamique`

États à documenter dans les fiches:

- `loading`
- `empty state`
- `access refused`

Palette et ton:

- `loading` -> `slate`
- `empty state` -> `slate` doux
- `access refused` -> `slate` avec léger `red` / `orange`

Architecture commune:

- `SystemStateLayout`
- `SystemStateIcon`
- `SystemStateTitle`
- `SystemStateDescription`
- `SystemStateAction`
- `SystemStateMeta`

Variantes:

- `variant="loading"`
- `variant="empty"`
- `variant="forbidden"`

Règles:

- mêmes espacements
- mêmes tailles d icones
- mêmes largeurs
- mêmes boutons
- même logique de texte
- pas de grosses illustrations cartoon
- pas d emojis énormes
- pas d écrans vides dramatiques
- pas de gradients agressifs
- aucun écran vide sans CTA utile
- garder un ton professionnel et homogène d une fiche à l autre

### Pages techniques et administratives

Routes detectees:

- `/admin`
- `/admin/forms`
- `/admin/services`
- `/admin/godmode`

Palette proposee:

- couleur principale: `slate`
- couleur secondaire eventuelle: `violet` ou `indigo` tres modere

Ressenti attendu:

- console
- operationnel
- dense mais lisible

Composants recommandes:

- tableaux
- filtres
- cards KPI
- logs
- panneaux de configuration

Niveau de sobriete attendu:

- eleve

Niveau de densite textuelle:

- moyen a eleve

Regles cartes / bulles / badges / callouts:

- pas de hero decoratif
- pas de bulles d ambiance
- un seul niveau d information par card
- les badges servent aux roles, etats, ou risques

### Rapports, export et synthese

Routes detectees:

- `/prints/report`

Palette proposee:

- couleur principale: `ardoise`
- couleur secondaire eventuelle: `bleu nuit`
- accent discret: `vert` seulement pour la validation ou un statut utile

Ressenti attendu:

- document
- lisible
- imprimeable
- institutionnel

Composants recommandes:

- sections structurees
- tableaux
- cartes de synthese
- blocs de KPI sobres
- en-tetes de rapport
- boutons export

Niveau de sobriete attendu:

- eleve

Niveau de densite textuelle:

- moyen a eleve

Regles cartes / bulles / badges / callouts:

- favoriser la lisibilite print
- ne pas saturer la page de bulles
- badges rares et uniquement utiles
- pas de cartes multicolores
- les textures et halos doivent rester discrets et n aider que la lecture ecran ou l impression

## Regles editoriales associees

- textes courts
- peu de bulles
- pas d explication exhaustive dans l UI
- chaque page doit dire ce qu elle permet de faire, pas tout ce qu elle contient
- si une information est secondaire, elle doit etre compacte ou repliee
- si une page est longue, preferer une hierarchie en sections plutot qu une accumulation de cartes
- si une page porte beaucoup de texte, les couleurs doivent devenir plus sobres, pas plus nombreuses

## Risques de conflit avec les palettes existantes

| Risque | Cause | Prevention |
|---|---|---|
| Conflit avec `amber` / `orange` | la famille Accueil & Pilotage est deja fortement associee a cette teinte | reserver `amber` aux pages du bloc ou aux exceptions explicitement validees |
| Conflit avec `emerald` | risque de confusion avec le bloc Agir | limiter `emerald` aux parcours terrain et aux pages qui l utilisent deja |
| Conflit avec `sky` | risque de confusion avec la cartographie | n utiliser `sky` que pour les pages carto ou les chemins explicitement lies |
| Conflit avec `red` | risque de confusion avec le bloc Impact et les erreurs critiques | distinguer le rouge d accent analytique du rouge d alerte |
| Conflit avec `indigo` / `pink` | risque de confusion avec le reseau et la discussion | garder ces teintes pour les surfaces sociales ou conversationnelles |
| Conflit avec `yellow` | risque de confondre la famille Apprendre | limiter le jaune aux pages educatives |
| Conflit avec des palettes neutres trop ternes | risque de pages trop froides ou monotones | maintenir une seconde couleur d accent tres controlee |

## Questions et arbitrages a valider avant application

- Faut il garder `/admin` comme famille autonome neutre, ou lui donner une teinte plus marquee ?
- Les pages legales doivent elles rester presque monochromes, ou recevoir un accent plus visible ?
- Les pages de support et d aide doivent elles etre une vraie famille autonome ou rester absorbees par `contact` et `learn` ?
- Les pages d erreur doivent elles partager une charte unique ou conserver des variantes par code d erreur ?
- Les outils standalone doivent ils partager une meme palette neutre, ou une palette contextuelle par outil ? La recommandation courante est une palette autonome par usage avec mood layer legere, pas une couleur de bloc.
- Les routes dynamiques doivent elles heriter strictement de leur route parente, ou peuvent elles gagner un accent lie au contenu ?
- Faut il documenter une charte specifique pour les etats vides et les etats de chargement, ou les traiter comme un sous-cas du systeme ?

## Conclusion operationnelle

Cette charte propose une base simple:

- blocs principaux: couleurs deja verrouillees
- pages hors blocs: palettes plus neutres, plus sobres, plus fonctionnelles
- exceptions: conservees et documentees
- routes dynamiques: heritees, pas reinventees

Elle doit servir de reference avant toute correction UI sur les pages hors blocs.
