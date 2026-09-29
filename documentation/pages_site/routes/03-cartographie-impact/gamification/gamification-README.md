# Gamification - Progression & badges

Point d entrée de la rubrique gamification, désormais canonique sur `/sections/gamification`.

## Références principales

- [Présentation détaillée](./gamification-presentation-detaillee.md)
- [Spécification canonique](./gamification-SPEC_CANONIQUE.md)
- [Notes de scopes et d interface](./gamification-scope-ui-notes.md)
- [Liste des propositions à traiter](./gamification-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./gamification-objectifs-non-pertinents.md)

La présentation détaillée décrit la section `/sections/gamification`. L URL `/gamification` reste un alias de compatibilité. La spec canonique centralise les règles métier des badges, des paliers, des XP et des garde-fous.

La surface authentifiée expose désormais séparément le niveau global réel et
potentiel, sa progression vers le prochain niveau et les prérequis manquants,
puis un retour d'impact personnel. Les indicateurs d'eau, de CO₂e et de surface
sont affichés comme des proxys, à partir des valeurs fournies par
`GET /api/gamification/me`, avec un lien vers la méthodologie documentée.

Les collections CURRENT sont dérivées de `progression.summary` et distinguent
les éléments acquis, en progression et à découvrir, sans recopier de catalogue
dans l UI. La reconnaissance personnelle affiche d abord les cartes lifetime
et année en cours issues de `progression.recognition` et
`progression.annualRecognition`.

La section privée réutilise le composant canonique `LeaderboardPanel` pour
afficher un aperçu du classement public, avec un lien vers
`/sections/leaderboard`. Le panneau public utilise les deux scopes `user` et
`structure` et les trois métriques `level`, `xp` et `badges`. Pour un utilisateur,
le niveau est le niveau utilisateur ; pour une structure, il s'agit du niveau
collectif. Le compteur de badges suit `total = gradeCount + oneShotCount` et
est affiché au format `(X grades + Y one-shot)`, sans exposer le détail des
badges. La préférence d'opt-in est gérée dans `/reglages`, désactivée par
défaut. Le leaderboard est l'unique exception à la règle de non-publication de la gamification.

La page `/sections/gamification` reste privée et protégée par authentification.
La page `/sections/leaderboard` est publique, sans indexation ni URL canonique,
et sa projection n'expose que le label public, le niveau, l'XP validée et les
compteurs de badges autorisés.

**Contrat SEO** : `ACCESS=PRIVATE`, `SEARCH=NOINDEX`,
`DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`. Le soft-gate décrit la
présentation anonyme ; il ne rend pas la progression personnelle indexable.

## Arborescence canonique

La rubrique suit la convention globale de `pages_site`.

- `gamification-README.md`
- `gamification-presentation-detaillee.md`
- `gamification-liste-propositions-a-traiter.md`
- `gamification-objectifs-non-pertinents.md`
- un dossier `screenshots/desktop/` ou `screenshots/mobile/` propre à cette
  page, lorsqu'un snapshot existe

Les captures de référence sont en `.webp` et sont nommées avec la route, le nom lisible de la page et la date.

## Mémoire de rubrique

Cette rubrique conserve localement quatre documents de travail:

- une présentation détaillée;
- une liste de propositions à traiter;
- une mémoire des objectifs non pertinents.

Ces trois fichiers doivent rester synchronisés avec la spec canonique.
