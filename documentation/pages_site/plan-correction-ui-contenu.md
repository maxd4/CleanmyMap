# Plan de correction UI / contenu

Ce plan découpe les corrections en lots sûrs, à exécuter progressivement à partir de l'index maître et de la charte des pages hors blocs.

Références de départ:

- [`INDEX.md`](./INDEX.md)
- [`charte-pages-hors-blocs.md`](./charte-pages-hors-blocs.md)

## État d'avancement

- Lot 1: exécuté sur les pages rendues du lot, avec `/actions/map` déjà corrigée et les autres surfaces visibles du lot réalignées sur leurs palettes attendues.
- Lot 2: exécuté sur les 4 routes auth, avec `/sign-in` comme page de référence, `/onboarding` comme page unique de configuration initiale et `/onboarding/localisation` réduit à une redirection historique.
- Lot 3: exécuté.
- Lot 4: non exécuté à ce stade.
- Lot 5: non exécuté à ce stade.
- Lot 6: non exécuté à ce stade.
- Lot 7: non exécuté à ce stade.
- Lot 8: très avancé, avec plusieurs pages de blocs déjà réalignées sur leurs palettes attendues. Il reste surtout des réajustements de fond, de surcharge textuelle et quelques sous-composants à terminer au fil des audits visuels.

## Principes d'exécution

- Corriger par petits lots, jamais par refonte globale.
- Garder `/explorer` hors scope tant que la page Sommaire reste la référence aboutie.
- Pour les pages auth, conserver les boutons existants et ne corriger que les surfaces, les bulles et les textes.
- Pour les pages auth, documenter un fallback local si Clerk n'est pas joignable afin d'éviter les chargements infinis sur localhost.
- La configuration initiale doit tenir sur une seule page après authentification; les anciennes sous-routes d'onboarding doivent devenir des redirections si elles n'apportent pas d'UI propre.
- Traiter les pages hors blocs avec leur palette attendue propre avant toute homogénéisation.
- Ne pas mélanger correction UI et correction de contenu dans un même lot si une séparation est possible.
- Ne jamais toucher aux pages déjà déclarées terminées ou explicitement hors scope.

## Lot 1 — Pages critiques visibles

Objectif:

- corriger d'abord les pages les plus visibles et les plus exposées aux incohérences de couleur ou à la surcharge textuelle.

Routes concernées:

- `/actions/map`
- `/methodologie`
- `/gamification`
- `/sandbox`
- `/community`
- `/messagerie`
- `/open-data`
- `/parcours`
- `/parcours/[profile]`

Note:

- les routes alias `/community`, `/messagerie`, `/open-data`, `/sandbox` et `/gamification` redirigent vers les sections rendues par `/sections/[sectionId]`; la correction du lot 1 s'applique donc aux vues réellement affichées.

Fichiers à modifier:

- `apps/web/src/app/(app)/actions/map/page.tsx`
- `apps/web/src/app/(app)/gamification/page.tsx`
- `apps/web/src/app/(app)/sandbox/page.tsx`
- `apps/web/src/app/(app)/community/page.tsx`
- `apps/web/src/app/(app)/messagerie/page.tsx`
- `apps/web/src/app/(app)/open-data/page.tsx`
- `apps/web/src/app/(app)/parcours/page.tsx`
- `apps/web/src/app/(app)/parcours/[profile]/page.tsx`

Palette attendue:

- `/actions/map` -> `sky`
- `/methodologie` -> `red`
- `/gamification` -> `red`
- `/sandbox` -> `sky`
- `/community` -> `pink`
- `/messagerie` -> `pink`
- `/open-data` -> `pink`
- `/parcours` -> `amber / orange`
- `/parcours/[profile]` -> `amber / orange`

Textes à réduire:

- contextes répétés
- labels de navigation redondants
- bulles de contexte trop explicites
- introductions longues qui doublonnent l'action principale

Composants à simplifier:

- hero secondaire
- cartes répétitives
- callouts multiples
- badges décoratifs sans valeur d'état
- panneaux d'aide répétés

Pages hors scope à éviter:

- `/explorer`
- `/`

Risques de régression:

- casser la lisibilité des KPI ou de la carte
- réduire trop fortement le contexte utile
- créer un décalage de palette entre les sous-états dynamiques et la page parente

Ordre recommandé d'exécution:

1. `/actions/map`
2. `/sandbox`
3. `/gamification`
4. `/methodologie`
5. `/community`
6. `/messagerie`
7. `/open-data`
8. `/parcours`
9. `/parcours/[profile]`

## Lot 2 — Pages auth

Objectif:

- stabiliser les écrans d'entrée de compte et de configuration initiale.

Routes concernées:

- `/sign-in`
- `/sign-up`
- `/onboarding`
- `/onboarding/localisation`

Note:

- `/sign-in` est la page de référence déjà alignée sur la charte auth.
- `/sign-up` et `/onboarding` ont été réalignés sur la même ambiance auth.
- `/onboarding/localisation` ne porte plus d'UI propre: c'est une redirection historique vers `/onboarding`.
- Les boutons Clerk / liens d'action font partie du lot UI et suivent la même ambiance auth.

Fichiers à modifier:

- `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`
- `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`
- `apps/web/src/app/onboarding/page.tsx`
- `apps/web/src/app/onboarding/localisation/page.tsx`

Palette attendue:

- `auth`
- tonalité attendue: fond lavande clair vers vert menthe clair
- carte Clerk: violet nuit / indigo foncé
- bulles decoratives: indigo, violet, vert profond
- texte carte: blanc
- texte secondaire: lavande claire
- accents: vert uniquement pour validation, badge, icône ou halo léger
- boutons: ne pas modifier, respecter les règles existantes
- fallback local: afficher un état stable si Clerk ne répond pas en localhost

Textes à réduire:

- promesses marketing
- explications répétées sur le parcours
- phrases d'accompagnement trop bavardes
- labels de contexte qui doublonnent l'évidence de la page

Composants à simplifier:

- cartes de centrage multiples
- bandeaux auxiliaires
- blocs d'aide trop longs
- messages de bascule entre connexion et inscription

Pages hors scope à éviter:

- pages de bloc principales
- pages légales
- pages admin
- `/explorer`

Risques de régression:

- rendre le flux moins clair que l'état actuel
- perdre la hiérarchie entre formulaire principal et aide secondaire
- casser les états de validation ou les routes Clerk

Ordre recommandé d'exécution:

1. `/sign-in`
2. `/sign-up`
3. `/onboarding`
4. `/onboarding/localisation` (redirection historique)

## Lot 3 — Compte / profil / paramètres

Objectif:

- corriger la page personnelle centralisée sans casser le confort de navigation.

Statut:

- exécuté sur `/dashboard` (canon), `/profil` (alias) et `/profil/[profile]`.

Routes concernées:

- `/dashboard`
- `/profil` (alias)
- `/profil/[profile]`

Fichiers à modifier:

- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/profil/page.tsx`
- `apps/web/src/app/(app)/profil/[profile]/page.tsx`

Palette attendue:

- `/dashboard` -> `amber / orange`
- `/profil` -> redirection vers `/dashboard`
- `/profil/[profile]` -> `amber / orange`

Textes à réduire:

- rappels de contexte répétés
- titres doublonnés
- messages d'orientation trop explicites
- blocs d'aide qui remplacent l'interface elle-même

Composants à simplifier:

- cartes de synthèse trop nombreuses
- listes d'actions secondaires
- panneaux de préférences redondants
- badges de rôle répétés

Pages hors scope à éviter:

- `/pilotage`
- `/sponsor-portal`
- `/admin`
- `/explorer`

Risques de régression:

- rendre la synthèse moins lisible
- mélanger la logique de compte et la logique de gouvernance
- trop neutraliser une page qui doit rester de lecture rapide

Ordre recommandé d'exécution:

1. `/dashboard`
2. `/profil`
3. `/profil/[profile]`

## Lot 4 — Pages standalone

Objectif:

- harmoniser les outils isolés sans leur imposer une palette de bloc.

Routes concernées:

- `/form-comparison`
- `/preview/actions/new`
- `/declaration-simple`
- `/reglages`
- `/prints/report`

Fichiers à modifier:

- `apps/web/src/app/form-comparison/page.tsx`
- `apps/web/src/app/preview/actions/new/page.tsx`
- `apps/web/src/app/declaration-simple/page.tsx`
- `apps/web/src/app/reglages/page.tsx`
- `apps/web/src/app/(app)/prints/report/page.tsx`

Palette attendue:

- palette autonome avec mood layer légère selon l'usage
- `/form-comparison` -> `indigo + cyan doux`
- `/preview/actions/new` -> `vert + teal`
- `/declaration-simple` -> `vert clair + neutres`
- `/reglages` -> `slate + gris doux`
- `/prints/report` -> `ardoise + bleu nuit + vert discret`
- priorité à la lisibilité fonctionnelle et à l'impression

Textes à réduire:

- explications de fonctionnement trop détaillées
- doublons d'aides
- rappels de contexte non nécessaires

Composants à simplifier:

- panneaux de comparaison
- tables et previews
- encarts de résumé
- blocs export / print trop décorés

Pages hors scope à éviter:

- pages de bloc
- pages auth
- pages légales

Risques de régression:

- perdre l'utilité opérationnelle de l'outil
- rendre le rendu imprimable plus fragile
- mélanger la palette avec un bloc principal

Ordre recommandé d'exécution:

1. `/form-comparison`
2. `/preview/actions/new`
3. `/declaration-simple`
4. `/reglages`
5. `/prints/report`

## Lot 5 — Pages légales / institutionnelles

Objectif:

- rendre les pages juridiques et institutionnelles sobres, lisibles et stables.
- supprimer l esthétique "marketing blocks"
- imposer une cohérence commune entre toutes les pages légales

Routes concernées:

- `/contact`
- `/conditions-generales-utilisation`
- `/conditions-utilisation`
- `/mentions-legales`
- `/politique-confidentialite`
- `/politique-cookies`
- `/en`

Fichiers à modifier:

- `apps/web/src/app/contact/page.tsx`
- `apps/web/src/app/conditions-generales-utilisation/page.tsx`
- `apps/web/src/app/conditions-utilisation/page.tsx`
- `apps/web/src/app/mentions-legales/page.tsx`
- `apps/web/src/app/politique-confidentialite/page.tsx`
- `apps/web/src/app/politique-cookies/page.tsx`
- `apps/web/src/app/en/page.tsx`

Palette attendue:

- `legal`
- tonalité neutre: `slate / gris clair / blanc`
- saturation très faible
- contraste typographique propre

Contraintes visuelles:

- éviter gradients visibles, glow, textures, halos ou couleurs flashy
- privilégier espace blanc, lisibilité et hiérarchie typographique
- limiter la largeur de lecture
- uniformiser titres, sous-titres, espacements et sections
- conserver une cohérence design system CMM, mais sans logique marketing

Composants à privilégier:

- `LegalSection` comme brique de section commune
- `LegalLayout` comme pattern partagé si nécessaire
- sections textuelles
- ancres
- accordions sobres
- blocs de contact compacts

Textes à réduire:

- répétitions juridiques non nécessaires à la lecture
- phrases d'introduction trop longues
- callouts d'ambiance
- accroches trop promotionnelles

Composants à simplifier:

- sections textuelles
- ancres
- accordions
- blocs de contact
- blocs de référence
- blocs d'engagement

Pages hors scope à éviter:

- pages d'action
- pages admin
- pages de bloc
- pages de réseau

Risques de régression:

- casser la hiérarchie des sections légales
- trop styliser des pages qui doivent rester institutionnelles
- rendre les contenus moins imprimables ou moins structurés
- uniformiser trop fort au point de perdre la hiérarchie entre documents juridiques distincts

Ordre recommandé d'exécution:

1. `/contact`
2. `/mentions-legales`
3. `/conditions-generales-utilisation`
4. `/conditions-utilisation`
5. `/politique-confidentialite`
6. `/politique-cookies`
7. `/en`

## Lot 6 — Erreurs, états vides, loading, accès refusé

Objectif:

- standardiser les états de système et les erreurs visibles.

Routes concernées:

- `/error/429`

États associés à documenter dans les fiches:

- loading
- empty state
- access refused

Règle commune de fiche:

- les pages protégées et dynamiques doivent documenter les mêmes états avec la même architecture (`SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`)
- les variantes attendues sont `loading`, `empty` et `forbidden`
- aucun état vide ne doit être livré sans CTA utile

Fichiers à modifier:

- `apps/web/src/app/error/429/page.tsx`
- fiches des pages concernées par des états vides ou d'accès refusé

Palette attendue:

- `red` pour erreur critique
- `amber` pour quota / limite / attention
- `slate` pour loading
- `slate` doux pour empty state
- `slate` + léger `red` / `orange` pour access refused

Architecture commune recommandée:

- `SystemStateLayout`
- `SystemStateIcon`
- `SystemStateTitle`
- `SystemStateDescription`
- `SystemStateAction`
- `SystemStateMeta`

Variantes attendues:

- `variant="error"`
- `variant="warning"`
- `variant="empty"`
- `variant="loading"`
- `variant="forbidden"`
- `variant="offline"`

Contraintes visuelles:

- mêmes espacements
- mêmes tailles d icônes
- mêmes largeurs
- mêmes boutons
- même logique de texte
- animations très minimales
- skeletons sobres
- loaders lents et doux
- pas de spinner énorme
- pas de grosses illustrations cartoon
- pas d emojis énormes
- pas d écrans vides dramatiques
- pas de gradients agressifs
- aucun écran vide sans CTA utile

Textes à réduire:

- explications d'erreur trop longues
- remises en contexte inutiles
- doublons entre message, badge et callout

Composants à simplifier:

- un seul bloc de message principal
- un seul CTA principal
- icône ou badge utile seulement si nécessaire
- CTA types: `Créer une action`, `Explorer la carte`, `Retour accueil`, `Réessayer`, `Contacter le support`

Pages hors scope à éviter:

- pages de contenu métier
- pages de bloc
- pages institutionnelles

Risques de régression:

- rendre l'erreur trop neutre
- perdre l'information d'action
- mélanger les états système avec les palettes de famille
- créer des variantes d état incohérentes d une page à l autre

Ordre recommandé d'exécution:

1. `/error/429`
2. modèles d'états vides
3. modèles d'accès refusé
4. modèles de loading

## Règle de documentation

- documenter systématiquement les états système dans les fiches UI des pages concernées
- aucune route ne doit avoir un état vide sans CTA utile
- éviter de décliner ces états comme de mini landing pages

## Lot 7 — Routes dynamiques

Objectif:

- stabiliser les variantes dynamiques à partir de leur route parente.

Routes concernées:

- `/missions/[id]`
- `/parcours/[profile]`
- `/profil/[profile]`
- `/sections/[sectionId]`

Fichiers à modifier:

- `apps/web/src/app/(app)/missions/[id]/page.tsx`
- `apps/web/src/app/(app)/parcours/[profile]/page.tsx`
- `apps/web/src/app/(app)/profil/[profile]/page.tsx`
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`

Palette attendue:

- héritée de la famille parente
- pas de palette inventée pour une variante isolée

Textes à réduire:

- métadonnées répétées
- contexte explicatif déjà présent dans la route parente
- répétition des identifiants de page

États à documenter dans les fiches:

- loading
- empty state
- access refused

Architecture commune:

- `SystemStateLayout`
- `SystemStateIcon`
- `SystemStateTitle`
- `SystemStateDescription`
- `SystemStateAction`
- `SystemStateMeta`

Règles:

- mêmes espacements, mêmes tailles d'icônes, mêmes largeurs et mêmes boutons que pour les autres fiches protégées
- ton professionnel et homogène
- aucun écran vide sans CTA utile

Composants à simplifier:

- breadcrumb
- résumés de contexte
- panneaux conditionnels
- badges d'état liés au paramètre

Pages hors scope à éviter:

- toutes les pages hors famille parente
- `/explorer`

Risques de régression:

- casser la logique de paramètre
- dupliquer la palette au lieu de l'hériter
- rendre la variante plus verbeuse que la page parente

Ordre recommandé d'exécution:

1. `/missions/[id]`
2. `/profil/[profile]`
3. `/parcours/[profile]`
4. `/sections/[sectionId]`

## Lot 8 — Pages de blocs avec incohérences de couleur ou surcharge textuelle

Objectif:

- corriger les pages de bloc qui ont encore des écarts de palette ou un trop plein de texte.
- tenir compte des pages déjà harmonisées pour éviter de les retraiter inutilement.

Routes concernées:

- `/dashboard`
- `/parcours`
- `/parcours/[profile]`
- `/actions/map`
- `/gamification`
- `/reports`
- `/sandbox`
- `/community`
- `/messagerie`
- `/open-data`
- `/learn/bonnes-pratiques`
- `/learn/comprendre`
- `/learn/ressources`
- `/learn/sentrainer`

Fichiers à modifier:

- les pages correspondantes dans `apps/web/src/app`
- les composants de section associés si un lot UI doit être simplifié

Déjà exécuté dans le lot 8:

- hub communautaire: accent rose/pink recentré sur les sous-sections communautaires
- pages `/reports` et composants d'impact: palette red/rose réalignée
- composants pilotage méthodologique: palette warm amber rééquilibrée
- sous-sections gamification: accents red/rose harmonisés
- sous-sections partenaires et learn déjà normalisées selon la charte
- hub `/learn/hub` réduit à un index léger avec progression et accès directs

Reste prioritaire dans le lot 8:

- `/dashboard` si un résidu de warm/orange doit encore être lissé
- `/parcours` et `/parcours/[profile]` si des écarts de palette ou de surcharge textuelle subsistent
- `/sandbox`, `/open-data`, `/messagerie`, `/community` si des sous-composants secondaires gardent encore des accents mixtes
- `/learn/*` si des cartes ou illustrations internes restent au-dessus du niveau de densité attendu

Palette attendue:

- `amber / orange` pour accueil
- `amber / brun` pour pilotage
- `emerald` pour agir
- `sky` pour cartographie
- `red` pour impact
- `pink` pour réseau
- `yellow` pour apprendre

Textes à réduire:

- intros trop longues
- aides répétées
- bulles de contexte qui doublonnent la navigation
- paragraphes d'accompagnement qui n'aident pas à l'action

Composants à simplifier:

- cartes
- bulles
- badges
- titres secondaires
- panneaux de contexte

Pages hors scope à éviter:

- `/explorer`
- pages hors blocs déjà stabilisées

Risques de régression:

- dégrader une page déjà lisible
- perdre le style propre à une famille
- uniformiser excessivement des contenus qui doivent rester différenciés

Ordre recommandé d'exécution:

1. pages avec incohérence couleur marquée
2. pages avec surcharge textuelle forte
3. pages avec sous-variantes dynamiques
4. pages de lecture plus linéaires

## Arbitrage global recommandé

Avant chaque lot:

- vérifier la fiche canonique correspondante dans `documentation/pages_site/routes/`
- vérifier le scope dans `INDEX.md`
- vérifier les exceptions validées dans `charte-pages-hors-blocs.md`
- éviter toute modification sur les pages terminées ou hors scope

Ordre global conseillé:

1. pages critiques visibles
2. auth
3. compte / profil / paramètres
4. standalone
5. légales / institutionnelles
6. erreurs / états vides / loading / accès refusé
7. routes dynamiques
8. pages de blocs avec incohérences ou surcharge

Ce plan est volontairement conservateur: il privilégie la stabilité documentaire avant la correction progressive du code.
