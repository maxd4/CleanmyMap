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

- leaderboard individuel;
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
- `apps/web/src/lib/gamification/progression-leaderboard.ts`
- `apps/web/src/app/api/gamification/analytics/points/route.ts`
- `apps/web/src/app/api/gamification/leaderboard/route.ts`
- `apps/web/src/components/sections/rubriques/gamification/index.tsx`
- `apps/web/src/components/sections/rubriques/gamification/personal-progress.tsx`
- `apps/web/src/components/sections/rubriques/gamification/gamification-types.ts`

## État UI actuel

La page gamification a été réalignée sur une direction visuelle rouge et claire, avec:

- un hero éditorial blanc et rouge;
- un visuel abstrait de paysage rouge;
- un bloc de parcours d engagement avec statut actuel, statuts suivants et moteur de progression;
- une carte de reconnaissance sociale avec bascule comptes / structures et recherche;
- une carte de collections volontairement en état vide;
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

## Points de vigilance

- Ne pas confondre `XP cumulée` et `impact annuel`.
- Ne pas présenter un leaderboard annuel comme un leaderboard lifetime.
- Ne pas injecter de compétition agressive dans les formulations UI.
- Ne pas remplir artificiellement la vitrine de collections quand les données ne sont pas prêtes.
- Garder les CTA de réglages reliés à de vraies préférences disponibles.
- Les progressions quiz actives (`Progression quiz par type` et `Quiz équilibré`) doivent rester séparées visuellement pour que la logique XP reste lisible.

## Références utiles

- [Spécification canonique](./gamification-SPEC_CANONIQUE.md)
- [Présentation détaillée](./gamification-presentation-detaillee.md)
- [README de rubrique](./gamification-README.md)
