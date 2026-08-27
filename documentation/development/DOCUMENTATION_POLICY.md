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

## Vérification avant clôture

Avant de clôturer un changement documenté :

- vérifier que le document spécialisé correspond au code et aux contrats
  actuels lorsqu'il décrit le présent ;
- conserver explicitement les limites ou l'état historique lorsqu'ils sont
  nécessaires à l'interprétation ;
- exécuter les checks documentaires pertinents pour le périmètre ;
- contrôler les liens et le diff du lot.
