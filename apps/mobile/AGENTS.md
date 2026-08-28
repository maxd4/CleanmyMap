# Gouvernance locale — `apps/mobile`

Héritage : gouvernance racine → ce périmètre mobile. `apps/mobile` est une
application déployable distincte du web, actuellement gelée sur les contrats
stabilisés ; ce fichier ne rouvre pas son architecture.

## Identité et accès

- Clerk est l'identité canonique web et mobile ;
- conserver `ClerkProvider`, `useAuth`, l'authentification hébergée Clerk et
  le `tokenCache` sécurisé ;
- transmettre le token Clerk à Supabase via Third-Party Auth ;
- fonder les RLS `missions` / GPS sur le `sub` Clerk ;
- ne pas réintroduire Supabase Auth ou une identité anonyme comme fournisseur
  d'identité ;
- ne jamais embarquer `service_role` dans l'application mobile.

## Contrats finalisés et gelés

L'identité Clerk, les RLS et la finalisation de `distance_m` et `duration_s`
par le trigger serveur courant sont finalisées puis gelées. Le client mobile
ne doit pas reprendre le calcul ou l'écriture directe de ces métriques.

## Capacités encore ouvertes

Seuls les sujets suivants peuvent être rouverts après validation explicite :

- background headless ;
- `mission_actions` ;
- validation opérationnelle ;
- évolution future après dégel explicite.

Une évolution sur ces sujets doit d'abord recevoir une décision explicite et
réaligner les contrats, tests et documentation concernés. Ne pas transformer
une capacité ouverte en fonctionnalité finalisée par simple modification de ce
fichier.

Validation mobile ciblée :

```bash
npm run mobile:typecheck
```
