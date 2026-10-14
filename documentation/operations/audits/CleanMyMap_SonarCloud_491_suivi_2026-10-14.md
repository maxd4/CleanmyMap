# Suivi des 491 anomalies SonarCloud — 14 octobre 2026

> **Statut : AUDIT READ-ONLY / RECONCILIATION**. Ce document ne clôt aucune
> anomalie SonarCloud et ne remplace pas une analyse SonarCloud ultérieure.

## Périmètre et provenance

- Inventaire source fourni :
  [`CleanMyMap_SonarCloud_491_issues_2026-10-14.json`](./CleanMyMap_SonarCloud_491_issues_2026-10-14.json)
- Projet SonarCloud : `maxd4_CleanmyMap`
- Révision analysée par SonarCloud : `ed0e2659760e3bdd8d26fba0389c6a52701a8c18`
- Export : `2026-10-14T17:30:48.550Z`
- Analyse SonarCloud : `2026-10-14T17:01:01+0000`
- `main` confronté : `2f92406b7e973ffec7f67e0bfd409dfcf713bf66`
- `origin/main` au moment du rapprochement :
  `2f92406b7e973ffec7f67e0bfd409dfcf713bf66`
- Inventaire détaillé généré :
  `artifacts/sonarcloud-audit/2f92406b7e973ffec7f67e0bfd409dfcf713bf66/sonarcloud-491-tracking.json`

L’inventaire source est conservé comme transport historique. Le suivi généré
est la projection de rapprochement : chaque entrée conserve l’identifiant
SonarCloud, la règle, le chemin, le message et le statut courant.

## Méthode de rapprochement

Pour chaque anomalie :

1. l’identifiant SonarCloud est contrôlé pour l’unicité dans les 491 entrées ;
2. le préfixe de projet SonarCloud est retiré du composant afin d’obtenir le
   chemin dépôt ;
3. le chemin est recherché dans l’arbre Git de `HEAD` avec `git ls-tree`, et
   son blob courant est conservé dans l’inventaire généré ;
4. la règle et le type SonarCloud sont conservés sans requalification
   silencieuse ;
5. aucune disparition du code, modification locale ou résultat SonarCloud
   postérieur n’est transformé en preuve de correction.

Le rapprochement utilise l’arbre de `HEAD`, et non les fichiers staged ou dirty
des travaux concurrents présents dans le checkout.

## Résultat exhaustif

| Contrôle | Résultat |
| --- | ---: |
| Anomalies source | 491 |
| Identifiants Sonar uniques | 491 |
| Identifiants dupliqués | 0 |
| Règles distinctes | 44 |
| Chemins présents dans `main` | 491 |
| Chemins absents de `main` | 0 |
| Bugs | 207 |
| Vulnérabilités | 124 |
| Code smells | 160 |

Tous les chemins exportés existent encore dans l’arbre versionné de `main`.
Aucune anomalie n’est donc classée `OBSOLETE` sur le seul critère de chemin.

### Répartition des statuts

| Statut | Nombre | Règle d’attribution dans ce lot |
| --- | ---: | --- |
| `TO_FIX` | 491 | Anomalie `OPEN` dans l’export, chemin présent dans `main`, aucune correction locale vérifiée et aucun scan SonarCloud confirmant une résolution |
| `FIXED_PENDING_SCAN` | 0 | Aucun correctif n’a été exécuté ou prouvé dans ce lot |
| `FALSE_POSITIVE` | 0 | Aucune preuve technique et décision humaine spécifique n’a été fournie |
| `ACCEPTED_PENDING_APPROVAL` | 0 | Aucun risque accepté ni approbation explicite n’a été fourni |
| `OBSOLETE` | 0 | Aucun chemin source n’a disparu de `main` |
| `BLOCKED` | 0 | Le rapprochement identifiant/règle/chemin est complet ; le blocage du runner qualité est documenté séparément ci-dessous |

`TO_FIX` ne signifie pas que chaque finding a été reproduit indépendamment par
un moteur local. Il signifie que l’anomalie reste une anomalie SonarCloud
ouverte à traiter, rattachée à un chemin toujours présent, sans preuve de
correction ou d’obsolescence. Une future correction locale pourra passer à
`FIXED_PENDING_SCAN` uniquement avec une preuve technique locale explicite ; la
résolution SonarCloud restera à confirmer séparément par un scan réel.

## Décisions humaines et faux positifs

Aucune décision humaine de type `FALSE_POSITIVE` ou
`ACCEPTED_PENDING_APPROVAL` n’est enregistrée dans ce suivi. En conséquence :

- aucune règle Sonar n’a été affaiblie ;
- aucun seuil, baseline, exclusion ou grâce n’a été modifié ;
- aucun risque n’est déclaré accepté ;
- aucune approbation n’est présumée ;
- aucun finding n’est clôturé par disparition supposée, changement de ligne ou
  différence entre deux révisions.

Les décisions humaines futures devront être ajoutées dans un audit daté avec
la preuve technique, le périmètre, la justification, le propriétaire et
l’approbation explicite correspondante. Elles devront aussi être répercutées
dans l’inventaire généré suivant, sans réutiliser ce snapshot comme source
`CURRENT`.

## Mécanismes d’audit exécutés

Le runner qualité canonique a été appelé :

```text
npm run audit:quality -- all
```

Résultat : `BLOCKED` avant génération, car son contrat exige un worktree propre
et `HEAD == origin/main`, alors que des changements SPOGOMI concurrents sont
présents dans l’index et le worktree. Cette garde n’a pas été contournée. Le
suivi Sonar a donc été généré par rapprochement read-only contre l’arbre Git de
`HEAD`, avec l’intégrité 491/491 contrôlée explicitement.

La procédure canonique de qualité existante couvre déjà la séparation entre
finding SonarCloud, preuve locale et confirmation externe ; aucune modification
de cette procédure n’était nécessaire dans ce lot.

