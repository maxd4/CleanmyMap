<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Gouvernance locale — `apps/web`

Ce fichier hérite de la gouvernance racine. Il ajoute uniquement les règles
propres à l'application web ; les règles spécialisées des API, de Supabase et
des scripts sont définies dans les `AGENTS.md` de ces sous-arbres.

## Stack web

- Next.js `16.3.1` avec App Router ;
- React `19.2.8` ;
- TypeScript `^7`.

Les versions exactes restent celles de `apps/web/package.json`.

## Identité et domaine web

- Clerk reste le fournisseur d'identité principal du web ;
- préserver la distinction entre `Role`, `SessionRole` et `Parcours` ;
- modifier avec prudence les contrats d'identité et de profil dans :

  ```txt
  apps/web/src/lib/domain-language.ts
  apps/web/src/lib/profiles.ts
  apps/web/src/lib/authz.ts
  apps/web/src/lib/auth/
  apps/web/src/proxy.ts
  ```

## Auth locale et validations navigateur

Avant toute validation navigateur, classifier la surface et annoncer le
protocole choisi :

- `PUBLIC` : aucune AuthN ; utiliser le navigateur intégré ou Playwright public
  selon le besoin, sans bypass.
- `PROTECTED_SERVER_ONLY` : AuthN/AuthZ uniquement côté serveur ; utiliser le
  lanceur local canonique avec `CMM_DEV_AUTH_BYPASS=1` et le rôle minimal.
  Le port 3000 est préféré mais le lanceur peut basculer ; utiliser l'URL
  réellement annoncée, jamais une URL supposée.
- `PROTECTED_CLERK_CLIENT` : la surface consomme `useUser`, `useAuth`, les UI
  Clerk, `SignedIn`/`SignedOut` ou exige une session navigateur réelle. Le
  bypass serveur est insuffisant : utiliser le harness Playwright Clerk
  Development, `127.0.0.1:3000` strict, `CMM_DISABLE_DEV_AUTH_BYPASS=1` et
  l'état de session produit par le global setup. `/onboarding` est un exemple
  explicite.
- `PROD_SMOKE` : utiliser uniquement une vraie session Clerk Production selon
  le playbook, sans bypass local.
- `E2E_MUTABLE_SUPABASE` : lane CI éphémère dédiée uniquement ; jamais Docker
  ou Supabase local sur le poste.

Annoncer avant le test :

```text
AUTH_SURFACE: PUBLIC | PROTECTED_SERVER_ONLY | PROTECTED_CLERK_CLIENT
BROWSER_HARNESS: INTEGRATED_BROWSER | PLAYWRIGHT_CLERK
AUTH_MODE: NONE | DEV_BYPASS | CLERK_DEVELOPMENT
HOST_URL: URL réellement utilisée
ROLE: rôle réel/simulé
PERSISTENCE: NONE | REMOTE_READONLY | CI_EPHEMERAL
```

Les rôles de bypass acceptés sont exactement `benevole`, `coordinateur`,
`scientifique`, `entreprise`, `elu`, `admin` et `max`. Choisir le rôle minimal
correspondant au scénario ; `max` n'est jamais le choix par défaut.

Ne jamais injecter de clés Clerk Production dans `localhost`. Le bypass ne
modifie ni les permissions métier ni les contrôles centraux d'AuthN/AuthZ. Si
le serveur échoue avec `Invalid local Clerk configuration`, classifier
`CLERK_BOOT_CONFIG` séparément d'une session manquante et utiliser une
configuration Clerk Development cohérente.

Dans le rapport, classifier tout blocage parmi `AUTH_SESSION`,
`CLERK_BOOT_CONFIG`, `AUTHZ_ROLE`, `BROWSER_PERMISSION` et
`HOST_ENVIRONMENT`.

## Frontières Server/Client

- préserver la séparation entre Server Components, Client Components, Server
  Actions et services existants ;
- garder les Client Components minimaux et ne pas déplacer de logique sensible
  vers le client ;
- ne pas ajouter `"use client"` sans nécessité vérifiée ;
- préserver les contrats, composants et consommateurs existants avant toute
  modification de structure.

## Modularité préventive web

- un composant ou une fonctionnalité web qui combine des dérivations métier
  significatives, de l'état ou des effets et un rendu JSX substantiel doit
  être structuré dès le départ par responsabilités ;
- lorsque ces frontières existent réellement :
  - logique pure et dérivations : module `*.model.ts` ou domaine existant ;
  - état, APIs navigateur, lifecycle et effets : hook, controller ou service
    approprié ;
  - rendu : composant ou vue ;
  - accès réseau ou persistence : couche existante appropriée ;
- ne pas imposer ces suffixes si une autre structure canonique du domaine est
  meilleure ;
- les APIs navigateur (`window`, `navigator`, `localStorage`, media queries,
  downloads, clipboard, etc.) ne doivent pas contaminer inutilement la
  logique pure ;
- garder `"use client"` au plus près de la frontière réellement interactive ;
- si une nouvelle page ou section comporte plusieurs panneaux autonomes ayant
  des données, états ou évolutions indépendantes, les composer depuis un shell
  plutôt que tout écrire dans le même composant ;
- une façade publique légère est préférable lorsque plusieurs modules internes
  composent une même fonctionnalité ;
- ne pas déplacer du JSX dans des composants artificiels qui n'ont aucune
  autonomie sémantique.

La modularisation utile fait partie de l'implémentation de la fonctionnalité ;
elle n'est pas un chantier facultatif à reporter après livraison lorsque les
frontières sont déjà prévisibles.

## UI web

- appliquer l'invariant global de textes publics en français à l'UI web ;
- charger Leaflet avec `next/dynamic` et `{ ssr: false }` lorsque la surface
  l'utilise ; ne pas accéder aux APIs navigateur pendant le SSR ;
- ne pas modifier la homepage, le header global ou le footer global sans
  demande explicite :

  ```txt
  apps/web/src/app/page.tsx
  apps/web/src/components/accueil/
  ```

- pour les scores, conserver le stockage interne `0–100`, mais présenter les
  valeurs en pourcentage (`63 %`, `63,5 %`) sans multiplier ni diviser ;
  utiliser `apps/web/src/lib/formatters/score.ts` et maintenir son garde
  anti-régression ;
- avant toute modification UI, lire `documentation/design-system/README.md`,
  `documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md`,
  `documentation/pages_site/INDEX.md` et la fiche canonique de la page ;
- réutiliser les composants canoniques comme `CmmCard`, `CmmButton` et
  `PageHeader` ;
- respecter la famille de page et les palettes documentées, éviter les retours
  à la ligne décoratifs, et traiter les états de chargement, vide, erreur,
  accès refusé, succès, mobile et accessibilité lorsque c'est pertinent ;
- la règle complète des scores et ses exceptions techniques sont documentées
   dans `documentation/design-system/ui-score-formatting.md`.

### Cible UI fournie par image ou mockup

Lorsqu'un utilisateur fournit une image, une maquette, une capture ou une
version cible UI, cette référence visuelle est prioritaire pour la composition,
les proportions, la hiérarchie, la densité, les alignements, les espacements,
les tailles relatives, les rayons, la palette, le style des boutons et cartes,
les retours à la ligne, la quantité d'icônes et la position ou l'ordre des
éléments. Le lot vise une fidélité stricte à la cible : une divergence visible
importante signifie que le lot est incomplet ; « proche » ou « dans l'esprit »
ne suffit pas.

- Reproduire fidèlement les textes visibles : formulation, casse, accents,
  ponctuation, retours à la ligne demandés et libellés explicitement retirés.
- Si un détail de la cible est incompatible avec une contrainte fonctionnelle,
  le design system, l'accessibilité ou les données runtime, conserver le
  résultat le plus proche possible avec les primitives canoniques, signaler
  chaque écart restant et en expliquer la nécessité ; ne jamais remplacer
  silencieusement la cible par une approximation libre.
- Valider réellement le rendu sur `localhost`, comparer aux images de référence
  sur desktop et sur les largeurs pertinentes, puis corriger jusqu'à disparition
  des écarts majeurs. La validation finale doit distinguer les éléments alignés,
  les écarts résiduels, leur justification et la preuve visuelle disponible.
- Si l'utilisateur exclut le header ou le footer, ne pas les réinventer pour
  embellir le mockup ; cette exclusion fait partie du périmètre visuel.

## Validation web ciblée

Pour une modification limitée à l'application web, utiliser les validations
proportionnées au périmètre :

```bash
npm run typecheck -w apps/web
npm run lint -w apps/web
npm run test -w apps/web -- <test-file-or-pattern>
```

Ajouter les checks de route, de documentation ou de sécurité lorsqu'ils sont
directement concernés ; ne pas lancer une validation runtime globale pour une
modification documentaire seule.
