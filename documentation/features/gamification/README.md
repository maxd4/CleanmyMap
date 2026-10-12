# Gamification — index des contrats

> Statut documentaire : `CURRENT` pour les contrats effectivement exposés par
> le runtime ; les compatibilités historiques sont explicitement marquées
> `LEGACY` ou `COMPATIBILITY` dans le moteur.

Cette fiche oriente vers les propriétaires réels de la gamification. Elle ne
recopie ni les seuils de progression ni les familles de badges.

## Contrats CURRENT

- Le moteur de progression est détenu par `apps/web/src/lib/gamification/`.
  `GAMIFICATION_REGISTRY` dans `progression-utils.ts` est le catalogue de
  décision des mécaniques.
- Les neuf progressions infinies sont `participation`, `organisation`,
  `exploration`, `clean_zones`, `regularity`, `versatility`, `learning`,
  `moderation` et `cartography`.
- Les faits métier restent dans leurs sources. `progression_events` est le
  ledger XP CURRENT et `progression_profiles` sa projection persistante.
- Les identités et collections de badges sont détenues par
  `badge-catalog.ts`. Les exemplaires répétables SPOGOMI sont une collection
  séparée et ne sont pas ajoutés à `badgeTotal`.

## Réconciliation et surfaces

`gamification-reconstruction.ts` calcule l’état attendu sans mutation et
`gamification-reconciliation.ts` applique un plan idempotent aux événements
CURRENT qu’il possède. Les réconciliations administratives passent par le
script serveur dédié et produisent le reçu utilisateur existant lorsqu’un
changement visible est réel.

La surface utilisateur est `/api/gamification/me` et les interfaces
administratives sont protégées par leurs contrôles AuthN/AuthZ, notamment
`/admin/gamification/xp-audit`. Les composants lisent les contrats exposés ;
ils ne recalculent pas les niveaux, badges ou seuils.

## SPOGOMI et compatibilités

SPOGOMI réutilise les propriétaires CURRENT et ajoute les distinctions
répétables ainsi que le jalon `spogomi_first_referee`. Les résultats sportifs,
les mesures environnementales et l’XP restent des domaines séparés. Les
anciennes tables, événements et labels conservés pour compatibilité ne sont
pas une seconde source de vérité.

## Documents complémentaires

- [Moteur technique](./GAMIFICATION_ENGINE.md)
- [Spécification fonctionnelle canonique](../../pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md)
- [Gamification non compétitive](../../product/gamification-non-competitive.md)
- [Inventaire gamification](../../product/gamification-inventory.md)
- [Contrat SPOGOMI](../spogomi.md)
