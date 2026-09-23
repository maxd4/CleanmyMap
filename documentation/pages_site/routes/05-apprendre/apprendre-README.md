# Apprendre

Contenus pédagogiques, quiz, bonnes pratiques et mode École.

## Inventaire des pages

L’inventaire exhaustif des routes canoniques, alias et fiches est tenu dans
[`INDEX.md`](../../INDEX.md). Le contrat de famille runtime est décrit dans
[`PAGE_FAMILIES.md`](../../PAGE_FAMILIES.md).

## Décisions produit et backlog

- [`apprendre-liste-propositions-a-traiter.md`](./apprendre-liste-propositions-a-traiter.md) porte le backlog fonctionnel retenu pour le bloc.
- [`apprendre-objectifs-non-pertinents.md`](./apprendre-objectifs-non-pertinents.md) conserve les propositions explicitement écartées afin qu'elles ne soient pas reproposées sans nouvelle décision produit.

## Surfaces intégrées

| Surface | Statut | Rôle |
|---|---|---|
| Point de départ | intégré | orientation répartie dans les pages canoniques |
| Ressources | intégré | ressources principalement intégrées à Bonnes pratiques |
| Mode École | page canonique | kit d'atelier et porte d'entrée scolaire |

## Sitemap

Le runtime possède des pages :

```txt
/learn/bonnes-pratiques
/learn/comprendre
/learn/ecole
/learn/sentrainer
```

Aucune page canonique `/learn` n'est définie dans l'état audité.

Le sitemap ne doit pas inventer `/learn` sans page ou redirection réelle.

## Palette

Famille :

```txt
apprendre
```

Teintes :

```txt
yellow / amber
```

## Règles

- ne pas inventer une source scientifique ;
- signaler les contenus à vérifier ;
- distinguer fait, estimation et conseil ;
- conserver les détails lourds à la demande ;
- respecter la promesse « sans compte élève » tant qu'elle est affichée ;
- garder les quatre routes publiques alignées entre code, documentation et sitemap ;
- ne pas reproposer un objectif classé `NON_PERTINENT` sans nouvelle décision produit explicite.

## Snapshots

Les snapshots sont colocalisés dans le dossier de chaque page canonique, sous
`screenshots/desktop/` ou `screenshots/mobile/`. Les captures historiques des
surfaces intégrées `learn-hub` et `learn-ressources` sont conservées dans la
page `learn-bonnes-pratiques`, qui les consomme réellement ; elles ne
constituent pas des pages autonomes.
