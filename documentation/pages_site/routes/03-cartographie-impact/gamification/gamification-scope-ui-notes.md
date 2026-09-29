# Gamification - Notes de scopes et d interface

Ce document synthétise ce qui a été clarifié sur les données de gamification et sur l interface cible de la section `/sections/gamification`.

Il complète la [spécification canonique](./gamification-SPEC_CANONIQUE.md) et la [présentation détaillée](./gamification-presentation-detaillee.md).

## Objectif

La rubrique gamification doit rester:

- lisible;
- non compétitive;
- crédible sur les données;
- cohérente entre progression personnelle, classement et reconnaissance sociale;
- stable dans ses scopes temporels.

## Contrat leaderboard CURRENT

Le leaderboard est l'unique exception à la règle de non-publication de la gamification. La section privée `/sections/gamification` réutilise le
`LeaderboardPanel` public et propose le CTA « Voir le classement public » vers
`/sections/leaderboard`; elle ne crée ni moteur, ni requête, ni mapping, ni tri
parallèle. Le classement n'est pas ajouté à la navigation primaire.

Il existe deux scopes : `user` (niveau utilisateur) et `structure` (niveau
collectif). Les trois métriques sont `level`, `xp` et `badges`. Le total de
badges vaut `gradeCount + oneShotCount` et est rendu au format
`(X grades + Y one-shot)`, sans publier le détail des badges. La préférence
d'opt-in, désactivée par défaut, est contrôlée depuis `/reglages`.

La projection publique est limitée au label/handle autorisé, au niveau, à l'XP
validée, au total de badges et à ses deux compteurs. Les identifiants Clerk,
emails, metadata, rôles, XP pending, contributions détaillées, impact,
historique et données de modération restent exclus.

## Scopes temporels

Le code partage désormais une convention explicite dans `apps/web/src/lib/time-scopes.ts`.

| Scope | Sens métier | Usage recommandé |
|---|---|---|
| `allTime` | cumul depuis la création du compte | progression personnelle, badges persistants, historiques |
| `yearToDate` | depuis le 1er janvier de l année en cours | reporting annuel, comparatifs éditoriaux, palmarès annuels |
| `rolling30d` | fenêtre glissante de 30 jours | pilotage opérationnel, vue rapide |
| `rolling90d` | fenêtre glissante de 90 jours | reporting intermédiaire |
| `rolling365d` | fenêtre glissante de 365 jours | vue long terme sans être lifetime |

Règle de lecture:

- `allTime` et `yearToDate` sont des scopes sémantiques;
- `rolling*` sont des fenêtres analytiques;
- un écran doit choisir un seul scope par bloc de données et ne pas mélanger les contrats sans le nommer clairement.

## Répartition métier recommandée

### À garder en `allTime`

- progression personnelle;
- badges permanents;
- historique de points;
- parrainage;
- reconnaissance stable du contributeur;
- niveau global du compte.

### À dupliquer en `allTime` et `yearToDate`

- reconnaissance contributeur;
- vues de performance utilisateur dans le dashboard;
- KPI publics si l on veut une lecture cumulée et une lecture annuelle.

### À basculer en `yearToDate` ou sur une fenêtre bornée

- badges saisonniers;
- badges de campagne;
- classements éditoriaux de type "contributeur de l année";
- communications de bilan.

### À garder en fenêtres glissantes

- dashboards de pilotage;
- rapports opérationnels;
- observatoire;
- lecture sponsor ou institutionnelle quand on veut une tendance vivante.

## Données et routes impactées

Les ajustements récents reposent sur ces points d entrée:

- `apps/web/src/lib/time-scopes.ts`
- `apps/web/src/lib/gamification/annual-reset.ts`
- `apps/web/src/lib/gamification/progression-data.ts`
- `apps/web/src/lib/gamification/progression-user.ts` — owner de la progression personnelle
- `apps/web/src/lib/gamification/progression-ranking.ts` — owner des classements
- `apps/web/src/lib/gamification/progression-ranking-batch.ts` — owner des lectures batch des sources leaderboard
- `apps/web/src/lib/gamification/progression-retention.ts` — owner de la rétention post-action
- `apps/web/src/app/api/gamification/analytics/points/route.ts`
- `apps/web/src/app/api/gamification/leaderboard/route.ts`
- `apps/web/src/components/sections/rubriques/gamification/gamification-level-progress-panel.tsx` — panneau niveau/progression
- `apps/web/src/components/sections/rubriques/gamification/gamification-impact-panel.tsx` — panneau impact personnel
- `apps/web/src/components/sections/rubriques/gamification/gamification-catalog-panel.tsx` — panneau collections
- `apps/web/src/components/sections/rubriques/gamification/gamification-recognition.tsx` — panneau reconnaissance et lecture leaderboard
- `apps/web/src/components/sections/rubriques/gamification/gamification-types.ts` — types de composition UI

## État UI actuel

La page gamification a été réalignée sur une direction visuelle rouge et claire, avec:

- un hero éditorial blanc et rouge;
- un visuel abstrait de paysage rouge;
- un bloc de parcours d engagement avec statut actuel, statuts suivants et moteur de progression;
- une carte de reconnaissance personnelle, lifetime puis année en cours, avant la lecture communautaire;
- une carte de collections alimentée par `progression.summary`, groupée en `Acquis`, `En progression` et `À découvrir`;
- une carte de célébrations légères avec aperçu;
- une bannière de méthodologie d impact;
- un statut opérationnel;
- un panneau de réglages du profil;
- un bloc explicatif "Pourquoi cette gamification ?".

Le parti pris est de montrer:

- la progression réelle;
- la reconnaissance utile;
- les états vides sans faux signal;
- la méthode d impact séparée du XP.

### Contrats CURRENT des collections et de la reconnaissance

- Les collections ne maintiennent aucune liste de badges dans le composant : elles
  lisent l inventaire exhaustif `progression.summary` produit par le registre
  CURRENT.
- Les progressions infinies restent `En progression` après leur première
  contribution ; leur carte expose le badge courant, le prochain badge et le
  pourcentage sans les déclarer terminées.
- `isNewSinceLastRulesMigration` est affiché comme un signal de nouveauté de
  règles, sans changer l état métier de l élément.
- La reconnaissance personnelle vient de
  `progression.recognition.currentContributor` et de
  `progression.annualRecognition.currentContributor`, avec un libellé explicite
  `Lifetime` ou `Année en cours`. Ces périodes restent propres à la
  reconnaissance, pas au classement détaillé.
- Le panneau leaderboard réutilisé dans la reconnaissance charge uniquement la
  projection publique via `/api/gamification/leaderboard/public`, avec les
  dimensions supportées `scope=user|structure` et
  `metric=level|xp|badges`.

## Points de vigilance

- Ne pas confondre `XP cumulée` et `impact annuel`.
- Ne pas ajouter de période au leaderboard détaillé : les périodes restent
  portées par les contrats de reconnaissance annuelle et lifetime.
- Ne pas injecter de compétition agressive dans les formulations UI.
- Ne pas remplir artificiellement les collections : un groupe sans donnée reste
  explicitement vide et aucun badge ou objectif n est inventé.
- Garder les CTA de réglages reliés à de vraies préférences disponibles.
- Les paliers quiz (`Progression quiz par type` et `Quiz équilibré`) sont deux
  vues de la progression CURRENT `Apprentissage`, pas deux progressions
  infinies autonomes.

## Références utiles

- [Spécification canonique](./gamification-SPEC_CANONIQUE.md)
- [Présentation détaillée](./gamification-presentation-detaillee.md)
- [README de rubrique](./gamification-README.md)
