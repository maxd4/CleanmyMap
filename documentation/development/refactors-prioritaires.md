# Refactors prioritaires

## Rôle

Ce document ordonne les refactors transverses qui ne sont pas déjà pilotés par un backlog plus spécialisé.

Il ne doit pas dupliquer :

- `documentation/architecture/monolith-split-plan.md` pour les gros fichiers ;
- le backlog de validation globale du dépôt pour les erreurs révélées par lint, typecheck, tests ou build ;
- `documentation/security/github-audit-backlog.md` pour les alertes de sécurité et GitHub ;
- `documentation/pages_site/plan-correction-ui-contenu.md` pour les corrections UI globales.

## Principe

Un refactor n'est prioritaire que s'il réduit un risque réel de données, de runtime, de maintenance ou de régression.

Ne pas refactorer uniquement pour réduire un nombre de lignes ou supprimer tous les `any`.

## P0 — Cohérence fonctionnelle et données

### R0.1 — Registry, navigation et renderer

Objectif : vérifier qu'une rubrique ou route ne peut pas exister dans une source sans être correctement résolue dans les autres.

À faire :

- comparer registry, navigation, renderer et index documentaire ;
- identifier les divergences réelles ;
- corriger la source de vérité, pas seulement les symptômes ;
- ajouter un test de cohérence si la divergence peut revenir.

Fini quand : aucune divergence active n'est détectée sur les routes canoniques.

### R0.2 — Données géolocalisées partielles

Objectif : garantir un comportement explicite quand latitude, longitude, adresse ou géométrie sont incomplètes.

À faire :

- inventorier les contrats concernés ;
- distinguer donnée absente, invalide et partielle ;
- éviter les filtres silencieux qui font disparaître des enregistrements ;
- ajouter des tests sur les cas limites réellement supportés.

Fini quand : chaque état partiel possède une règle métier claire et testée.

### R0.3 — Imports admin hétérogènes

Objectif : normaliser les entrées externes avant écriture métier.

À faire :

- vérifier que les imports passent par les contrats de normalisation existants ;
- refuser les écritures directes incohérentes ;
- documenter les erreurs d'import exploitables par un admin.

Fini quand : les formats supportés et refusés sont explicites et testés.

## P1 — Dette technique directement liée à la qualité

Traiter dans l'ordre seulement si le problème est toujours confirmé par les contrôles courants :

1. `environmental-impact-estimator`
2. `pdf-export`
3. helpers `supabase`
4. `pilotage`, `admin` et `ui`

Pour chaque famille :

- localiser les warnings ou complexités réellement actifs ;
- choisir un lot cohérent ;
- éviter la campagne globale ;
- préserver les contrats publics ;
- ajouter un test lorsqu'une logique métier est déplacée.

## P2 — Monolithes

Ne pas maintenir ici une seconde liste détaillée.

Utiliser `documentation/architecture/monolith-split-plan.md` comme source de vérité et traiter une seule cible à la fois.

Priorité à une cible qui cumule :

- fort impact utilisateur ou métier ;
- couplage important ;
- difficulté de test ;
- modification fréquente ;
- risque de régression.

La taille seule ne suffit pas.

## P3 — TypeScript et warnings résiduels

### `no-explicit-any`

Corriger par lots ciblés uniquement quand :

- le type est stable et compréhensible ;
- la correction améliore réellement l'autocomplétion ou la sécurité ;
- aucun contournement artificiel n'est nécessaire.

Ne pas remplacer `any` par `unknown` sans logique de narrowing.

### Warnings React et runtime

Traiter en priorité ceux qui peuvent provoquer :

- boucle de rendu ;
- données obsolètes ;
- effet déclenché à tort ;
- état incohérent ;
- crash ou comportement non déterministe.

Les warnings purement cosmétiques passent après.

## Ordre d'exécution recommandé

1. P0 cohérence et données.
2. P1 dette confirmée par les contrôles actuels.
3. P2 une cible du plan monolithes.
4. P3 warnings TypeScript/React par lots opportunistes.

## Procédure GPT-5.4 mini

Pour chaque lot :

1. prouver que le problème existe encore ;
2. limiter le périmètre ;
3. identifier le contrat à préserver ;
4. corriger la cause racine ;
5. lancer les validations ciblées ;
6. documenter le risque résiduel.

## Critères de fin

Un refactor est terminé quand :

- le risque initial est réduit de manière observable ;
- le comportement public reste stable ;
- les tests pertinents passent ;
- aucune duplication significative n'est créée ;
- les docs spécialisées sont mises à jour si la priorité ou le statut a changé.

## Prompt exécutable

```text
Traite un seul refactor prioritaire de CleanMyMap.

Avant toute modification, prouve que le problème existe encore dans l'état courant du dépôt et identifie le contrat public à préserver.

Objectif : corriger la cause racine avec le plus petit périmètre cohérent.

Contraintes : ne pas lancer de refonte globale ; ne pas dupliquer un backlog spécialisé ; ne pas modifier le comportement visible sauf nécessité explicitement documentée ; préserver données, routes, exports et contrats API.

Livrable : modification ciblée, validations exécutées, résultat obtenu, risque résiduel et éventuelle mise à jour du backlog.
```
