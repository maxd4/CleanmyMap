# Runbook CURRENT — convergence Supabase publiée

Le workflow `.github/workflows/supabase-convergence.yml` maintient le projet
lié avec **toute** la file canonique de migrations de `main`. Il s'exécute sur
publication dans `main`, manuellement et chaque jour à 03:15 UTC. Il n'a pas de
déclencheur `pull_request` et utilise l'environnement GitHub protégé
`supabase-production`.

## Préconditions et secrets

L'environnement doit fournir uniquement les secrets suivants, sans les écrire
dans le dépôt : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` et
`VERCEL_TOKEN`. Les variables non secrètes du projet lié et de la production
Vercel sont versionnées dans le workflow. Le job est limité à `main` et ses
permissions GitHub sont `contents: read`.

Le workflow prouve d'abord qu'un déploiement Vercel `READY` de production,
provenant de `maxd4/CleanmyMap`, `web` et `apps/web`, porte exactement le SHA
du candidat. Une absence de preuve ou un runtime plus ancien bloque la file.
La publication Git et le déploiement Vercel restent deux opérations distinctes.

## Décision et application

Le préflight canonique est exécuté avec :

```text
npm run supabase:migration:preflight -- --dry-run --runtime-proof=<proof>
```

Il réutilise `audit-supabase-release.mjs` et compare la file complète, son
ordre, les dépendances SQL, les risques de données, RLS/grants, les Advisors et
le runtime. `ALIGNED` ne fait rien ; `READY_TO_APPLY` autorise l'unique
commande mutative :

```text
npx supabase db push --linked --yes
```

`BLOCKED` et `DIVERGED` n'appliquent rien. Le résumé du workflow publie le
statut, la première migration bloquante et l'action requise. Aucun retry
automatique n'est effectué après une erreur. La concurrence est sérialisée par
`supabase-production-migrations`, avec `cancel-in-progress: false`.

Après application, le workflow rejoue le préflight et exige `ALIGNED`, donc un
historique réellement vide de migrations en attente, puis relit les Advisors,
les arbres de migration et les contrats statiques critiques Web. La lane SQL
éphémère reste le seul endroit autorisé pour exécuter les pgTAP mutatifs ; ce
workflow ne lance jamais pgTAP contre la base liée.

## Blocages et reprise

Un blocage doit être traité à sa cause : authentification/cible, divergence
d'historique, risque SQL, finding Advisor ou compatibilité du runtime. Il est
interdit de réparer l'historique, de modifier une migration déjà appliquée,
d'exécuter une DDL manuelle, de reset la base ou de relancer aveuglément. Après
coordination du déploiement applicatif ou correction forward-only validée,
relancer le workflow manuellement ou attendre le rattrapage quotidien.

Les validations locales du contrat de workflow sont :

```text
node --test scripts/ci/supabase-convergence-workflow.test.mjs scripts/ci/resolve-vercel-runtime-proof.test.mjs
npm run check:github-actions
```

Une exécution locale du préflight et de `db push --dry-run` reste read-only et
ne constitue pas une preuve d'application, de RLS, de triggers, de concurrence
ou de pgTAP. Sans lane PostgreSQL éphémère autorisée, conserver le statut
`DB_SEMANTICS_NOT_EXECUTED`.
