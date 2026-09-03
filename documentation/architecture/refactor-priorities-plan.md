# Plan — refactors techniques prioritaires

## Statut

```text
PLAN — à revalider contre `main` avant chaque exécution
```

Ce document ordonne les refactors transverses qui ne sont pas déjà pilotés par
une source plus spécialisée.

Il ne remplace pas :

- [`monolith-split-plan.md`](./monolith-split-plan.md) pour le radar et le
  découpage des fichiers lourds ;
- [`../development/TESTING.md`](../development/TESTING.md) pour les validations
  et regression gates ;
- [`../security/README.md`](../security/README.md) pour les chantiers de
  sécurité ;
- les plans propres à une fonctionnalité ou à une page.

Une entrée de ce plan n'est jamais une preuve que le problème existe encore.
Avant toute exécution, vérifier le code et les contrats actuels sur `main`.

## P0 — cohérence fonctionnelle et données

### Registry, navigation et résolution

But : éviter qu'une rubrique ou une route soit déclarée dans une source sans
être correctement résolue dans les autres contrats actifs.

Avant intervention :

- comparer uniquement les registres réellement canoniques ;
- rechercher une divergence reproductible ;
- corriger la source de vérité plutôt qu'un miroir documentaire ;
- ajouter un test de cohérence si la divergence peut revenir.

Clôture : aucune divergence active n'est démontrée sur le périmètre traité.

### Données géolocalisées partielles

But : rendre explicite le comportement lorsque latitude, longitude, adresse ou
géométrie sont absentes, invalides ou partielles.

Avant intervention :

- identifier les contrats qui acceptent effectivement ces états ;
- distinguer absence, invalidité et donnée partielle ;
- rechercher les filtres silencieux qui feraient disparaître un enregistrement ;
- préserver les contrats métier et les règles de sécurité.

Clôture : chaque état réellement supporté possède un comportement testé.

### Imports administratifs hétérogènes

But : normaliser les entrées externes avant écriture métier.

Avant intervention :

- identifier les chemins d'import encore actifs ;
- vérifier les normalisateurs et validateurs existants ;
- empêcher les écritures qui contournent le contrat canonique ;
- produire des erreurs exploitables par l'administrateur lorsque nécessaire.

Clôture : les formats réellement supportés et refusés sont explicites et testés.

## P1 — dette technique confirmée par les contrôles

Les familles suivantes ne sont des priorités que si les contrôles courants
confirment encore un risque de maintenance, de performance ou de régression :

- estimation d'impact environnemental ;
- export PDF ;
- helpers Supabase ;
- surfaces pilotage, administration et UI.

Pour chaque lot :

1. mesurer le signal actuel ;
2. limiter le périmètre ;
3. préserver le contrat public ;
4. déplacer la logique seulement si la cohésion ou la testabilité s'améliore ;
5. ajouter ou adapter les tests pertinents.

Ne pas conserver ici une liste de warnings ou de compteurs qui peut être
régénérée automatiquement.

## P2 — monolithes

La source de vérité est
[`monolith-split-plan.md`](./monolith-split-plan.md).

Ne pas maintenir ici une seconde liste de fichiers.

Choisir une cible seulement si plusieurs facteurs convergent :

- impact utilisateur ou métier ;
- couplage ;
- difficulté de test ;
- fréquence de modification ;
- risque de régression.

La taille seule ne suffit pas.

## P3 — TypeScript et warnings React

Traiter par lots ciblés lorsque le diagnostic révèle un risque réel.

Pour TypeScript :

- suivre
  [`../development/typescript-precision-policy.md`](../development/typescript-precision-policy.md) ;
- ne pas remplacer mécaniquement `any` par `unknown` ;
- ne pas introduire de cast uniquement pour faire disparaître un diagnostic.

Pour React/runtime, prioriser les signaux pouvant provoquer :

- boucle de rendu ;
- donnée obsolète ;
- effet déclenché à tort ;
- état incohérent ;
- crash ou comportement non déterministe.

Le playbook de diagnostic statique est
[`../development/lint-refactor-playbook.md`](../development/lint-refactor-playbook.md).

## Critères généraux de sortie

Un refactor de ce plan est terminé lorsque :

- le problème a été reproduit avant modification ;
- le risque initial est réduit de manière observable ;
- le contrat public attendu reste stable, sauf décision explicite contraire ;
- les validations pertinentes passent ;
- aucune nouvelle duplication significative n'est créée ;
- le plan ou la source spécialisée est mis à jour seulement si son état a
  réellement changé.

Lorsque toutes les entrées encore pertinentes sont absorbées par des sources
spécialisées ou fermées, supprimer ce plan plutôt que le conserver comme
historique actif.
