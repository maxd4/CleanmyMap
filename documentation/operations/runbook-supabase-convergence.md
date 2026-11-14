# Runbook CURRENT — convergence Supabase publiée

Le workflow `.github/workflows/supabase-convergence.yml` maintient le projet
lié avec toute la file canonique de migrations de `main`. Il s'exécute sur
publication dans `main`, manuellement et chaque jour à 03:15 UTC. Il n'a pas de
déclencheur `pull_request` et utilise l'environnement GitHub protégé
`supabase-production`.

## Préconditions et références

L'environnement fournit uniquement `SUPABASE_ACCESS_TOKEN` et
`SUPABASE_DB_PASSWORD`, sans les écrire dans le dépôt. Le job est limité à
`main`, ses permissions GitHub sont `contents: read`, et sa concurrence est
sérialisée par `supabase-production-migrations`.

La référence décisionnelle est le `main` vérifié et l'historique du projet
Supabase lié. Aucune preuve Vercel, aucun SHA de déploiement et aucun manifeste
de runtime n'est une condition générale du préflight. Lorsqu'une migration
modifie ou supprime un contrat SQL, le préflight vérifie séparément la
rétrocompatibilité des consommateurs existants.

## Décision et application

Le préflight canonique est exécuté avec :

```text
npm run supabase:migration:preflight -- --dry-run
```

Il réutilise `audit-supabase-release.mjs`, vérifie l'identité CLI, le projet
lié, l'ordre des historiques et la file complète, puis parse strictement les
sorties réelles de `migration list --linked` et `db push --dry-run`. Une sortie
sans payload JSON unique est bloquante. Il distingue le DML exécuté pendant la
migration du DML contenu dans les fonctions ; les cas indécidables sont
`REVIEW_REQUIRED`. Il examine aussi les dépendances SQL, RLS, grants, contrats
consommés et Advisors. Les WARN/INFO historiques restent dans le rapport ;
seuls un risque critique ou une régression explicitement attribuée à la file
bloque l'application.

`ALIGNED` signifie que l'historique est convergent et qu'il n'y a aucune
migration en attente ; ce statut ne dépend pas de contrôles d'application, mais
les alertes de sécurité restent visibles. `READY_TO_APPLY` autorise l'unique
commande mutative :

```text
npx supabase db push --linked --yes
```

`BLOCKED` et `DIVERGED` n'appliquent rien. Le résumé publie le statut, la
première migration concernée, les causes et les alertes. Aucun retry automatique
n'est effectué après une erreur. Après application, le workflow rejoue le
préflight et exige `ALIGNED`, puis relit les Advisors, les arbres de migration
et les contrats statiques critiques Web. La lane SQL éphémère reste le seul
endroit autorisé pour exécuter les pgTAP mutatifs ; ce workflow ne lance jamais
pgTAP contre la base liée.

## Blocages et reprise

Un blocage doit être traité à sa cause : authentification/cible, divergence
d'historique, sortie CLI ambiguë, mutation réelle, incompatibilité SQL, risque
Advisor critique ou revue obligatoire. Il est interdit de réparer l'historique,
de modifier une migration déjà appliquée, d'exécuter une DDL manuelle, de reset
la base ou de relancer aveuglément. Après une correction forward-only validée,
relancer le workflow manuellement ou attendre le rattrapage quotidien.

Les validations locales du contrat de workflow sont :

```text
node --test scripts/ci/supabase-convergence-workflow.test.mjs scripts/ci/supabase-migration-preflight.test.mjs
npm run check:github-actions
```

Une exécution locale du préflight et de `db push --dry-run` reste read-only et
ne constitue pas une preuve d'application, de RLS, de triggers, de concurrence
ou de pgTAP. Sans lane PostgreSQL éphémère autorisée, conserver le statut
`DB_SEMANTICS_NOT_EXECUTED`.
