# Domaine Gamification

Ce dossier porte les contrats et calculs de progression de l'application web :
XP, niveaux, statuts, badges, jalons et événements de contribution.

## Contrat courant

Le contrat publié courant est `progression-rules-v2`, représenté par
`ProgressionRulesV2` et `PROGRESSION_RULES_V2` dans
`progression-rules.ts`. Cette version décrit la sémantique actuelle des
contributions vérifiées ; elle conserve les formules et seuils existants.

La progression reste déterministe et dérivée de faits métier vérifiés. Les
consommateurs importent les types et règles depuis leur module propriétaire ;
un barrel ne doit pas recréer une seconde identité du contrat.

## Frontières

- les formules et règles pures restent indépendantes du rendu ;
- la persistance, les écritures d'événements et les lectures Supabase passent
  par leurs capacités dédiées ;
- l'UI consomme les contrats de progression mais ne recalcule pas les règles ;
- les futures récompenses communautaires ne sont pas un runtime Gamification.

## Sous-domaine referrals

Le parcours de parrainage possède sa propre capacité sous
[`referrals/`](./referrals/) :

- `referrals.ts` porte les invitations, l'identité du parrainage, les caches
  invalidés et la réconciliation des récompenses ;
- `referral-lineage.ts` porte les graphes, chaînes d'ancêtres, vues et
  classements de lignage ;
- `referral-reconciliation.ts` porte l'idempotence et la réconciliation des
  contributions utiles ;
- `referrals-cache.ts` porte la lecture serveur mise en cache du résumé.

Les tests et leurs helpers vivent avec cette capacité dans `referrals/`.
Les consommateurs importent directement le module propriétaire, sans barrel
global ni façade à l'ancien chemin. Les dépendances vers les notifications et
la progression restent celles des modules existants ; ce découpage ne modifie
ni les règles XP, ni le registre CURRENT, ni les migrations.

Une récompense future pourra partager un fait métier vérifié, mais ne doit pas
modifier les invariants de progression : XP non achetable et non dépensable,
niveau et badge sans avantage probabiliste, et aucune contribution financière
ne donnant de ticket. Un badge de mérite reste déterministe.

La spécification fonctionnelle canonique reste
[`gamification-SPEC_CANONIQUE.md`](../../../../../documentation/pages_site/routes/03-cartographie-impact/gamification/gamification-SPEC_CANONIQUE.md).

## Validation

Les tests de progression restent auprès des modules concernés. Pour une
modification locale :

```text
npm run test -w apps/web -- src/lib/gamification
npm run typecheck -w apps/web
npm run lint -w apps/web
```
