# Gouvernance locale — `apps/mobile`

Héritage : gouvernance racine → ce périmètre mobile. `apps/mobile` est
`CURRENT / ACTIVE DEVELOPMENT`, pas `LEGACY` : c'est une application
déployable distincte du web, officiellement rouverte par le lot M0, mais
`NOT_PRODUCTION_READY`. Le lot M0 installe une baseline testable ; il n'ajoute
aucune fonctionnalité produit et ne refait pas l'UI.

## Périmètre V1

La V1 mobile est destinée aux bénévoles terrain et reste volontairement petite.
Le site web demeure la surface complète du produit et évolue indépendamment.
Le frontend mobile ne cherche pas à reproduire le site ; les développements
mobiles approfondis sont réservés au mode activité GPS live avec carte et tracé
temps réel, ainsi qu'aux contacts d'urgence.

Les autres capacités mobiles doivent réutiliser les contrats, données et
services communs existants. Aucun package partagé générique, second modèle
métier mobile ou système de gamification parallèle ne doit être créé pour la
V1.

Le workspace `apps/mobile`, son `package.json`, cet `AGENTS.md` et ses contrats
essentiels restent présents tant qu'une décision d'architecture explicite ne
les retire pas simultanément avec les contrats, la documentation et les
consommateurs concernés.

## Identité et accès

- Clerk est l'identité canonique web et mobile ;
- conserver `ClerkProvider`, `useAuth`, l'authentification hébergée Clerk et
  le `tokenCache` sécurisé ;
- transmettre le token Clerk à Supabase via Third-Party Auth ;
- fonder les RLS `missions` / GPS sur le `sub` Clerk ;
- ne pas réintroduire Supabase Auth ou une identité anonyme comme fournisseur
  d'identité ;
- ne jamais embarquer `service_role` dans l'application mobile.

## Contrats finalisés et invariants

L'identité Clerk, les RLS et la finalisation de `distance_m` et `duration_s`
par le trigger serveur courant sont finalisées et restent invariantes pendant le
développement actif. Le client mobile ne doit pas reprendre le calcul ou
l'écriture directe de ces métriques.

## Capacités encore ouvertes et limites de production

Les sujets suivants restent hors production et nécessitent une validation
explicite avant toute évolution :

- background headless ;
- `mission_actions` ;
- validation opérationnelle ;
- évolution future du produit mobile, après validation de chaque lot.

Une évolution sur ces sujets doit d'abord recevoir une décision explicite et
réaligner les contrats, tests et documentation concernés. Ne pas transformer
une capacité ouverte en fonctionnalité finalisée par simple modification de ce
fichier.

Validation mobile ciblée :

```bash
npm run mobile:typecheck
npm run mobile:test
```
