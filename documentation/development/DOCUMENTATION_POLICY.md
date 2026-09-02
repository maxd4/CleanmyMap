# Documentation Policy

## Scope

Documenter un changement uniquement lorsqu'il modifie une connaissance durable
pertinente, notamment :

- un contrat ;
- un comportement ;
- l'architecture ou une frontière de responsabilité ;
- l'exploitation ou une procédure de validation ;
- la sécurité ;
- une limite ou une décision qui doit être conservée.

Une modification interne sans effet durable sur ces éléments ne crée pas, à
elle seule, une obligation documentaire.

## Règle de sélection

Modifier uniquement la documentation spécialisée réellement concernée par le
changement. Maintenir une source canonique par règle, relier les documents
complémentaires lorsque nécessaire et ne pas dupliquer le même contenu dans
plusieurs index, guides ou rapports.

Les documents historiques restent historiques. Ils peuvent être annotés pour
éviter une confusion avec l'état courant, mais ne doivent pas être réécrits
uniquement pour refléter le présent.

## Contenu attendu

Lorsqu'une documentation est requise, elle doit permettre de comprendre, selon
le cas :

- ce qui change et pourquoi ;
- le contrat, le comportement ou la décision concernés ;
- les fichiers ou surfaces impactés ;
- les limites et hypothèses utiles ;
- les validations effectuées lorsqu'elles apportent une preuve pertinente.

Ne pas présenter une intention, une roadmap ou une proposition comme un
comportement implémenté. Ne pas créer de placeholder durable ni de référence
vers une source documentaire non canonique.

## Schémas et documentation visuelle

Ajouter un schéma lorsqu'il réduit réellement l'ambiguïté d'un flux, d'une
architecture, d'une séquence ou d'une décision, ou lorsqu'un garde-fou du dépôt
l'exige.

Préférer une source éditable et versionnable, notamment Mermaid dans le
document concerné, plutôt qu'une image qui devient une seconde source de
vérité.

Un schéma doit :

- avoir un rôle et un titre explicites ;
- utiliser des noms de nœuds compréhensibles ;
- rester cohérent avec le texte et le code courant lorsqu'il décrit le présent ;
- éviter les détails décoratifs qui n'aident ni la compréhension ni la
  décision.

Une image statique de fallback n'est pas obligatoire par principe. Elle n'est
conservée que lorsqu'un usage réel l'exige, par exemple un export, une archive
visuelle ou un rendu qui ne sait pas afficher la source éditable.

Ne jamais créer un lien vers un fallback ou un asset qui n'existe pas. Les
sorties générées restent des artefacts ou des preuves ; elles ne remplacent pas
la source documentaire éditable.

## Vérification avant clôture

Avant de clôturer un changement documenté :

- vérifier que le document spécialisé correspond au code et aux contrats
  actuels lorsqu'il décrit le présent ;
- conserver explicitement les limites ou l'état historique lorsqu'ils sont
  nécessaires à l'interprétation ;
- exécuter les checks documentaires pertinents pour le périmètre ;
- contrôler les liens et le diff du lot.

## Publication et visibilité

Les documents publics peuvent être indexés dans `documentation/README.md`. Les
documents internes, sensibles ou liés aux sessions ne doivent pas être listés
dans les index publics. Les sorties générées doivent être identifiées comme
telles et ne doivent pas devenir une source concurrente du code ou de la
documentation source.

Un même contenu ne doit pas être dupliqué dans un chemin public et un chemin
interne sans décision explicite. Toute documentation publique doit rester
compréhensible sans dépendre d'un contexte de session interne.

## Inventaire strictement non public

Les chemins suivants ne doivent pas être exposés comme documentation publique :

- les fichiers de gouvernance d'agent à la racine ou dans les sous-arbres ;
- `documentation/sessions/` ;
- `documentation/plans/` ;
- `documentation/operations/agent-memory-governance.md` ;
- `documentation/operations/session-standard-runbook.md` ;
- `documentation/rapport_IA/` ;
- `.codex-remote-attachments/` ;
- `backups/` et `scratch/` ;
- les archives Python historiques et leurs dumps.

Les familles `architecture/`, `database/`, `design-system/`, `development/`,
`features/`, `legal/`, `operations/`, `product/`, `security/` et `seo/` peuvent
rester visibles dans la documentation publique, à condition de ne pas
référencer les éléments strictement non publics.

## Sorties générées et archives visuelles

Les sorties suivantes peuvent être conservées dans le dépôt lorsqu'elles sont
identifiées comme générées ou archivées :

- `documentation/design-system/generated/board/design-system-board.dynamic.html` ;
- `documentation/design-system/generated/board/design-system-board.html` ;
- `documentation/design-system/generated/board/design-system-board.data.json` ;
- `actions-map-current.png` ;
- `photo/` ;
- `liberte-UX-UI/`.

Un index public ne doit jamais créer de lien direct vers un élément strictement
non public. Tout nouveau fichier de mémoire, de session, de backup ou de dump
doit être évalué par cet inventaire avant publication.
