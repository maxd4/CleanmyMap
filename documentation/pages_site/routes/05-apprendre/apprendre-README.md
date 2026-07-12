# Apprendre

Contenus pédagogiques, quiz, bonnes pratiques et mode École.

## Routes canoniques

| Route | Fiche | Type | Accès | Source principale |
|---|---|---|---|---|
| `/learn/bonnes-pratiques` | [Bonnes pratiques](./learn-bonnes-pratiques/learn-bonnes-pratiques-README.md) | éducative | `public-visible` | `apps/web/src/app/learn/bonnes-pratiques/page.tsx` |
| `/learn/comprendre` | [Ordres de grandeur](./learn-comprendre/learn-comprendre-README.md) | éducative | `public-visible` | `apps/web/src/app/learn/comprendre/page.tsx` |
| `/learn/sentrainer` | [S'entraîner](./learn-sentrainer/learn-sentrainer-README.md) | quiz | `public-visible` | `apps/web/src/app/learn/sentrainer/page.tsx` |
| `/learn/ecole` | [Mode École](./learn-ecole/learn-ecole-README.md) | atelier éducatif | `public-visible` | `apps/web/src/app/learn/ecole/page.tsx` |

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
- garder les quatre routes publiques alignées entre code, documentation et sitemap.

## Captures

Un seul dossier photo centralisé pour le bloc.

Mobile uniquement sur instruction explicite.
