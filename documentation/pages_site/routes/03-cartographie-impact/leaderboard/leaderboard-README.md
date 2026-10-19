# Classement public

La surface canonique du classement public est `/sections/leaderboard`.

## Contrat d’accès

```text
ACCESS: PUBLIC
SEARCH: NOINDEX
DISCOVERY: INTERNAL_ONLY
CANONICAL: NONE
```

La page est consultable sans compte et reste accessible par son lien direct,
mais elle n’est pas publiée dans le sitemap ni destinée à l’indexation.
La rubrique privée `/sections/gamification` conserve son accès protégé.

## Données affichées

La page consomme exclusivement `GET /api/gamification/leaderboard/public`.
Elle propose les périmètres utilisateurs et structures, ainsi que les métriques
`level`, `xp` et `badges`. Le serveur ne transmet que le label public autorisé,
le rang, le niveau, l’XP validée, le total de badges et sa ventilation grades /
one-shot ; aucun identifiant Clerk, email, métadonnée ou identifiant de
structure n’est rendu à la page.

Les structures affichent leur type et leur niveau collectif. L’XP en attente est
exclue. Les badges additionnent les grades et les one-shot ; Observateur vaut 0,
les éléments LEGACY et les éléments privilégiés ou de modération sont exclus.

Exemple de ventilation : 4 grades Participant + 3 grades Exploration +
2 one-shot = 9 badges.

## Chargement et cache

`LeaderboardPanel` est monté uniquement par cette page canonique. La section
`/sections/gamification` conserve sa reconnaissance personnelle et son CTA,
mais ne monte pas le panneau, ne déclenche pas sa requête et désactive le
prefetch du lien. Les changements de périmètre ou de métrique utilisent la clé
de vue du panneau et les options `swrRecentViewOptions` : une vue récente est
réutilisée en mémoire, sans revalidation automatique au focus ou au retour, et
les filtres utilisateurs/structures ainsi que niveau/XP/badges restent actifs.
