# Triaging a Vercel/Next.js Build

Dernière mise à jour: 2026-06-25

Objectif: corriger un build Vercel/Next.js de CleanMyMap sans lancer `next build` à répétition après chaque micro-correction.

## Principe

Ne pas utiliser `next build` comme première méthode de diagnostic.

Ordre attendu:

1. Lire le log d'erreur complet.
2. Identifier la catégorie: TypeScript, import, route Next, config Vercel, cache, Supabase, env vars, Turbopack/Webpack.
3. Lancer les vérifications rapides: typecheck, lint, tests ciblés.
4. Corriger les erreurs groupées.
5. Lancer un seul build complet local/sandbox.
6. Déclencher Vercel seulement quand le build local/sandbox est propre.

Le chemin de correction doit rester groupé:

1. lire la configuration de build;
2. classer l'échec par famille;
3. exécuter les checks rapides;
4. corriger par lot cohérent;
5. ne lancer qu'un seul build complet par lot;
6. nettoyer `.next` seulement si le signal pointe vers un cache ou des manifests incohérents.

## Fichiers à lire en premier

- `package.json`
- `apps/web/package.json`
- `apps/web/next.config.*`
- `apps/web/tsconfig.json`
- `apps/web/vercel.json`
- `.github/workflows/ci.yml`
- `documentation/development/TESTING.md`
- `documentation/operations/session-standard-runbook.md`

## Ordre de triage

1. TypeScript
2. Lint
3. Tests ciblés ou regression gates
4. Imports serveur/client
5. Routes App Router
6. Cache `.next`
7. Configuration Vercel
8. Turbopack/Webpack
9. Fichiers générés manquants

## Commandes rapides

- `npm run typecheck -w apps/web`
- `npm run lint -w apps/web`
- `npm run test:regression-gates -w apps/web`
- `npm run audit:vercel:ci`

## Quand nettoyer le cache

Utiliser `npm run build:clean -w apps/web` si:

- les manifests Next semblent incohérents;
- la build se comporte différemment après un échec précédent;
- le log pointe vers `.next` plutôt que vers le code applicatif.

Ce script supprime `apps/web/.next` et `apps/web/.turbo`, puis relance le build stable Webpack.

## Ce qu'il ne faut pas faire

- créer à la main des fichiers internes `.next`;
- relancer `next build` après chaque petite correction;
- confondre une erreur de cache avec une erreur de code;
- basculer durablement sur une autre chaîne de build avant d'avoir isolé la cause.

## Si Turbopack bloque

Si un conflit Turbopack empêche le déploiement:

1. garder temporairement le chemin Webpack stable;
2. documenter le conflit séparément;
3. traiter l'optimisation Turbopack comme une tâche à part;
4. ne pas mélanger cette optimisation avec la correction de build.

## Résultat attendu

Le bon résultat est:

- un build local qui passe sur une base propre;
- une seule reprise de build après un lot de corrections;
- un diagnostic clair entre code, cache et configuration;
- aucune création manuelle de manifests internes Next.js.
