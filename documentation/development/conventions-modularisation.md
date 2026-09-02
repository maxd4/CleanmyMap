# Conventions de modularisation

## Objet

Ce document définit les conventions durables de modularisation de CleanMyMap.
Il ne maintient pas de backlog de fichiers à découper et ne fixe pas de taille
cible universelle.

La liste courante des monolithes et leur état mesuré vivent dans
`documentation/architecture/monolith-split-plan.md`.

## Principe directeur

La modularisation est un moyen d'améliorer :

- la cohésion ;
- la compréhension locale ;
- la testabilité ;
- la stabilité des contrats ;
- la réutilisation réellement utile ;
- la maîtrise des dépendances.

La taille d'un fichier est un signal de revue, pas une preuve suffisante qu'il
faut l'extraire.

Un fichier long et linéaire avec une responsabilité claire peut rester
acceptable. Un fichier plus court mais dense, multi-responsabilités ou très
couplé peut justifier une extraction plus tôt.

## Signaux qui justifient une revue structurelle

Évaluer une modularisation lorsqu'un fichier cumule un ou plusieurs signaux :

- plusieurs responsabilités métier ou techniques distinctes ;
- logique difficile à tester sans rendre tout le module ;
- branches ou transformations qui masquent le contrat principal ;
- données, configuration, effets de bord et rendu fortement entremêlés ;
- duplication de logique ou de types ;
- dépendances croisées difficiles à suivre ;
- modification locale qui exige trop de contexte ;
- sous-partie possédant une API ou un cycle de vie compréhensible seule ;
- taille importante confirmée par le radar courant.

Le radar ou un seuil de qualité déclenche une analyse. Il ne dicte pas à lui
seul une arborescence cible.

## Quand ne pas extraire

Ne pas extraire uniquement pour :

- atteindre un nombre de lignes arbitraire ;
- créer un fichier par bloc JSX ;
- imposer un `index.ts` sans besoin d'API publique ;
- déplacer trois lignes dans un hook ou un helper sans responsabilité propre ;
- remplacer un couplage local simple par du prop drilling ou un contexte
  supplémentaire ;
- rendre un diagramme de fichiers plus symétrique ;
- suivre un ancien plan qui ne correspond plus au code courant.

Une extraction est mauvaise si elle fragmente davantage le raisonnement ou
augmente les dépendances sans réduire une complexité réelle.

## Frontières d'extraction préférées

Quand elles existent réellement, privilégier les frontières suivantes.

### Données et configuration

Extraire les constantes ou données statiques volumineuses lorsqu'elles forment
un domaine lisible ou empêchent de comprendre la logique du module.

Ne pas découper une petite configuration uniquement pour réduire le fichier
principal.

### Fonctions pures

Extraire un calcul, une normalisation ou une règle de décision lorsqu'elle peut
être nommée, testée et comprise indépendamment de son appelant.

Les frontières réseau, stockage et données externes doivent être normalisées
avant d'entrer dans la logique métier.

### État et effets de bord

Extraire un hook ou un contrôleur lorsqu'il porte un vrai cycle de vie ou une
responsabilité cohérente.

Ne pas déplacer automatiquement toute logique React dans des hooks. Un état
strictement local à un composant peut y rester s'il améliore la locality.

### Rendu

Extraire une sous-vue lorsqu'elle représente une section ou un état autonome,
ou lorsqu'elle peut être comprise et testée sans lire tout le parent.

Un bloc purement déclaratif et fortement couplé au contexte immédiat peut
rester inline.

### API publique

Créer une façade ou un fichier d'exports seulement lorsqu'il stabilise une API
réellement consommée. Ne pas ajouter de couche de réexport par convention
esthétique.

## Contrats à préserver

Avant toute extraction, identifier explicitement les contrats qui ne doivent
pas changer sans décision fonctionnelle distincte :

- routes ;
- props ;
- exports publics ;
- signatures de hooks et services ;
- contrats API ;
- schémas et types métier ;
- ordre des effets de bord ;
- erreurs observables ;
- permissions ;
- comportement utilisateur.

Pour le réseau, SQL, concurrence, transactions, navigateur, lifecycle et
orchestration, caractériser le comportement avant de déplacer la logique.

## Méthode de travail

Traiter une cible principale à la fois.

1. Vérifier l'état courant de la cible et du radar.
2. Identifier ses responsabilités, consommateurs et tests.
3. Décrire le problème structurel concret.
4. Définir le plus petit découpage cohérent.
5. Ajouter ou renforcer les tests nécessaires avant de supprimer une logique
   existante.
6. Extraire d'abord les responsabilités les plus indépendantes.
7. Garder un point d'entrée lisible qui orchestre sans dupliquer.
8. Relancer les validations après la dernière modification pertinente.
9. Mettre à jour le radar ou le plan seulement si son état factuel a changé.

Il n'existe pas d'ordre obligatoire `types -> config -> hooks -> composants`.
L'ordre dépend des dépendances réelles. Les éléments purs et indépendants sont
simplement les candidats les moins risqués à extraire en premier.

## Anti-patterns

Éviter :

- les micro-fichiers sans responsabilité propre ;
- les wrappers qui ne font que renommer un appel ;
- les façades inutilisées ;
- les imports circulaires ;
- les abstractions anticipées pour un usage hypothétique ;
- les contextes React créés uniquement pour compenser une mauvaise extraction ;
- les objectifs de réduction en pourcentage sans bénéfice structurel ;
- les estimations de durée utilisées comme critère de qualité ;
- les plans qui prédéterminent des noms de fichiers avant analyse du code.

## Critères de succès

Une modularisation réussie doit améliorer au moins un des axes suivants sans
dégrader les autres :

- responsabilité plus claire ;
- compréhension plus locale ;
- réduction du couplage ;
- tests plus ciblés ;
- dépendances plus explicites ;
- suppression d'une duplication ;
- stabilité accrue d'une API ;
- risque de régression réduit.

Le nombre de fichiers créés ou la réduction brute du nombre de lignes ne sont
pas des critères de réussite suffisants.

## Validation

Valider proportionnellement au risque :

- tests ciblés de la logique déplacée ;
- typecheck lorsque types, exports ou signatures changent ;
- lint pertinent pour les fichiers touchés ;
- contrôle des fichiers lourds lorsqu'une cible du radar est traitée ;
- tests de contrat lorsque l'API publique ou une frontière partagée est
  concernée ;
- build uniquement lorsque le périmètre le justifie.

Pour le radar courant et le choix de la prochaine cible, utiliser
`documentation/architecture/monolith-split-plan.md`.
