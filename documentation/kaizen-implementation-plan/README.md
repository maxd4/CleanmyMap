# Plans d'implémentation Kaizen

## Rôle

Ce dossier contient des audits d'amélioration ciblés à utiliser après stabilisation fonctionnelle d'un périmètre.

Un audit Kaizen n'est ni une roadmap globale, ni une obligation de créer un audit pour chaque gros fichier, ni une liste d'innovations à exécuter automatiquement.

## Priorité

Avant un audit Kaizen, traiter d'abord :

1. sécurité ;
2. erreurs de données ou runtime ;
3. tests manquants sur les parcours critiques ;
4. backlog produit actif ;
5. refactors nécessaires.

Le Kaizen vient ensuite pour améliorer un périmètre déjà suffisamment stable.

## État du dossier

- `01-accueil-audit.md` : document historique d'avril 2026 ; à revalider avant toute exécution.
- `TEMPLATE-AUDIT.md` : modèle de structure, à simplifier lors de son usage.
- `GUIDE-UTILISATION-TEMPLATE.md` : aide de référence, non obligatoire à charger pour un lot simple.

Il n'existe plus d'objectif automatique de produire 14 audits supplémentaires. Un nouvel audit est créé uniquement quand une cible concrète le justifie.

## Règles GPT-5.4 mini

Chaque audit doit rester court et contenir au maximum trois actions réellement prioritaires.

Pour chaque action, fournir uniquement :

- objectif ;
- preuve du problème actuel ;
- périmètre ;
- modification attendue ;
- contraintes critiques ;
- validations nécessaires ;
- critère de fin.

Éviter :

- estimations horaires ;
- longues listes d'idées optionnelles ;
- innovations spéculatives ;
- nouvelles dépendances proposées sans analyse ;
- composants inventés avant lecture du code ;
- chiffres ou sources scientifiques non vérifiés ;
- injonction à ajouter de l'animation pour rendre une page « premium ».

## Quand créer un audit

Créer ou mettre à jour un audit seulement si au moins une condition est vraie :

- un fichier ou module vient d'être fortement refactoré ;
- une page reste difficile à comprendre malgré sa stabilité ;
- des cas limites ou preuves manquent dans une logique métier ;
- le même problème revient plusieurs fois ;
- l'utilisateur demande explicitement une amélioration approfondie du périmètre.

## Méthode

### 1. Vérifier l'état réel

Lire le code, les tests et la documentation canonique.

Ne jamais reprendre aveuglément un constat ancien.

### 2. Choisir au plus trois actions

Classer par :

1. exactitude et robustesse ;
2. compréhension utilisateur ;
3. performance ou maintenance.

Une innovation n'entre dans l'audit que si elle répond à un problème démontré.

### 3. Exécuter une action à la fois

Chaque action doit pouvoir être donnée directement à GPT-5.4 mini sans explication supplémentaire.

### 4. Valider

Utiliser les contrôles ciblés pertinents :

- tests ;
- typecheck ;
- lint ;
- build ;
- vérification UI seulement si demandée ou nécessaire au lot.

Ne pas exécuter une suite lourde complète si un contrôle ciblé suffit.

## Format canonique d'un audit

```md
# Audit Kaizen — <périmètre>

## Contexte actuel
- fichiers concernés
- comportement actuel
- preuves observées

## P1 — <action prioritaire>
Objectif :
Preuve :
Périmètre :
Modification attendue :
Contraintes :
Validations :
Fini quand :

## P2 — <action suivante>
...

## P3 — <action optionnelle>
...
```

## Critères de fin

Un audit est clos quand :

- chaque action terminée possède une preuve ;
- les validations exécutées sont indiquées ;
- les actions abandonnées sont supprimées ou justifiées ;
- aucun vieux prompt ne reste marqué comme actif après absorption ;
- le document reflète l'état réel du repo.

## Prompt exécutable

```text
Réalise un audit Kaizen ciblé sur un seul périmètre CleanMyMap.

Avant de proposer des actions, vérifie l'état réel du code, des tests et de la documentation canonique. Ignore les anciens constats devenus faux.

Sélectionne au maximum trois actions, classées par valeur réelle : exactitude/robustesse, compréhension utilisateur, puis performance/maintenance.

Pour chaque action, indique uniquement : objectif, preuve, périmètre, modification attendue, contraintes, validations et critère de fin.

N'invente ni source, ni métrique, ni composant, ni dépendance avant analyse du code. Ne propose pas d'innovation décorative sans problème démontré.
```
