# TypeScript strict - Rapport priorisé

Source: `apps/web/ts-strict-flag-errors.txt`

Statut: snapshot historique, pas un blocage actuel.  
Vérification de contexte: `npm -C apps/web run typecheck` passe au moment de la rédaction.

Remédiation appliquée sur cette passe:
- `apps/web/next.config.ts`
- `apps/web/src/app/(app)/actions/new/page.tsx`
- `apps/web/src/app/api/route/recommend/route.ts`
- `apps/web/src/components/learn/planetary-boundaries.tsx`
- `apps/web/src/components/account/user-location-onboarding-form.tsx`
- `apps/web/src/components/account/account-setup-form.tsx`
- `apps/web/src/app/api/actions/prefill/route.ts`
- `apps/web/src/lib/user-location-preference.ts`
- `apps/web/src/components/learn/environmental-quiz.tsx`
- `apps/web/src/components/chat/chat-shell.tsx`
- `apps/web/src/components/chat/chat-shell.utils.ts`
- `apps/web/src/components/actions/map/actions-map-geometry.utils.ts`
- `apps/web/src/app/api/reports/elus-dossier/route.ts`
- `apps/web/src/app/api/reports/elus-dossier/route.test.ts`
- `apps/web/src/lib/partners/onboarding-requests-store.ts`
- `apps/web/src/lib/community/bug-reports-store.ts`
- `apps/web/src/lib/admin/promotion-requests-store.ts`
- `apps/web/src/components/navigation/app-navigation-ribbon-theme.ts`
- `apps/web/src/components/navigation/app-navigation-ribbon-theme.test.ts`
- `apps/web/src/lib/rate-limit/utils.ts`
- `apps/web/src/lib/weather/ops-weather.ts`
- `apps/web/src/components/sections/rubriques/annuaire-network-graph.tsx`

## Résumé

- 457 erreurs au total
- 86 fichiers impactés
- Répartition par code:
  - `TS4111`: 228
  - `TS2532`: 87
  - `TS18048`: 82
  - `TS2322`: 41
  - `TS2345`: 17
  - `TS2488`: 2

## Lecture de priorité

Le tri ci-dessous suit l'impact potentiel sur l'exécution et le risque de régression:

1. erreurs qui peuvent casser une route, une page interactive ou une transformation de données;
2. erreurs de bootstrap, config, env et observabilité;
3. erreurs massives mais mécaniques de lecture d'objets via index signature;
4. bruit restant dans les tests et fichiers de bas niveau.

## Priorité 1 - Runtime et API

Ces erreurs touchent des chemins utilisateur ou des routes serveur où une valeur `undefined` peut produire un comportement cassé, une réponse invalide ou une navigation erronée.

- `src/components/learn/planetary-boundaries.tsx` - 17 erreurs, surtout `TS2532` et `TS18048`
  - C'est le point le plus dense du dump côté UI interactive.
  - Les accès à des données potentiellement absentes doivent être sécurisés avant d'assembler l'état de la vue.
- `src/components/account/user-location-onboarding-form.tsx` - 5 erreurs
  - Formulaire d'onboarding avec dépendances utilisateur.
  - Les champs optionnels ne doivent pas être transmis tels quels aux setters.
- `src/app/api/route/recommend/route.ts` - 4 erreurs
  - Le flux de recommandation manipule des candidats possiblement absents.
  - Les garde-fous sur `candidate` doivent être posés avant tout calcul ou retour.
- `src/app/(app)/actions/new/page.tsx` - 4 erreurs
  - Page de création avec saisie utilisateur et préremplissage.
  - Les `string | undefined` remontent directement dans le rendu et les handlers.
- `src/app/api/actions/prefill/route.ts` - 3 erreurs
  - Route de préremplissage qui part de valeurs optionnelles.
  - Les paramètres doivent être normalisés avant usage.
- `src/app/api/reports/elus-dossier/route.ts` - 3 erreurs
  - Génération de rapport sensible à des pages ou tailles de blocs absentes.
  - Le flux doit traiter les bornes manquantes explicitement.
- `src/components/learn/environmental-quiz.tsx` - 2 erreurs
  - Flux utilisateur avec saisie et progression.
  - Les données doivent être rendues sûres avant d'être comparées ou persistées.
- `src/components/actions/map/actions-map-geometry.utils.ts` - 2 erreurs
  - Erreurs `TS2488` sur des tuples ou tableaux potentiellement absents.
  - Le risque ici est un crash de déstructuration ou de parcours de géométrie.
- `src/components/chat/chat-shell.tsx` - 2 erreurs
  - Flux de saisie et de contexte de conversation.
  - Les setters de state ne doivent pas recevoir `undefined`.

## Priorité 2 - Bootstrap, config et env

Ces erreurs ne touchent pas forcément le parcours principal utilisateur, mais elles fragilisent l'initialisation, la config ou l'observabilité.

- `src/lib/env.ts` - 9 erreurs
  - Cœur de la configuration d'environnement.
  - À traiter tôt pour éviter les faux positifs et les branches silencieuses vers une mauvaise config.
- `next.config.ts` - 5 erreurs
  - Les variables d'env lues depuis `process.env` sont encore traitées comme index signature brute.
  - C'est un point de fragilité au bootstrap et au build.
- `sentry.server.config.ts` - 4 erreurs
  - Initialisation serveur Sentry avec accès env.
  - La configuration doit rester stable et explicite.
- `sentry.edge.config.ts` - 2 erreurs
  - Même famille de problème sur Edge.
- `instrumentation-client.ts` - 2 erreurs
  - Initialisation client liée à la télémétrie.
- `src/app/api/services/route.ts` - 2 erreurs
  - Route qui dépend d'env Vercel et de paramètres runtime.
- `src/app/robots.ts` - 1 erreur
  - Génération SEO dépendante de l'URL d'application.
- `src/app/sitemap.ts` - 1 erreur
  - Même famille, impact SEO et déploiement.

## Priorité 3 - Warnings mécaniques à gros volume

Ces fichiers portent la majorité du bruit `TS4111`. Ils sont très probablement corrigibles par vagues, avec des helpers ou un codemod d'accès aux propriétés.

- `src/lib/partners/onboarding-requests-store.ts` - 38 erreurs
- `src/components/navigation/app-navigation-ribbon-theme.ts` - 37 erreurs
- `src/lib/community/bug-reports-store.ts` - 36 erreurs
- `src/lib/admin/promotion-requests-store.ts` - 34 erreurs
- `src/components/sections/rubriques/elus-section.tsx` - 18 erreurs
- `src/lib/errors/app-errors.ts` - 14 erreurs
- `src/lib/admin/moderation-client.ts` - 11 erreurs
- `src/lib/rate-limit/utils.ts` - 11 erreurs
- `src/components/reports/web-document/sections.tsx` - 10 erreurs
- `src/components/sections/rubriques/annuaire-network-graph.tsx` - 10 erreurs
- `src/lib/user-location-preference.ts` - 9 erreurs
- `src/lib/weather/ops-weather.ts` - 8 erreurs

## Priorité 4 - Tests et dette de périphérie

Ces éléments sont à corriger après stabilisation des couches précédentes.

- `src/app/api/services/route.test.ts` - 8 erreurs
- `src/lib/pilotage/prioritization.test.ts` - 7 erreurs
- `src/lib/data/map-records.test.ts` - 6 erreurs

## Recommandation d'ordre de traitement

1. Corriger les routes et pages de la priorité 1.
2. Sécuriser `src/lib/env.ts`, `next.config.ts` et les configs Sentry.
3. Appliquer un traitement en lot sur les gros fichiers `TS4111`.
4. Nettoyer les tests et les fichiers périphériques.
5. Relancer `npm -C apps/web run typecheck` et regénérer ce rapport.

## Annexes

- Log brut: `apps/web/ts-strict-flag-errors.txt`
- Guide de développement: `documentation/development/README.md`
