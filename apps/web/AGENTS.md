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

- Pour toute validation locale d'une surface protégée, Codex doit utiliser en
  priorité le bypass officiel `CMM_DEV_AUTH_BYPASS` plutôt que rechercher une
  vraie session Clerk.
- Sur `localhost` avec `NODE_ENV=development`, le bypass est prévu par le code
  et doit être considéré avant de conclure à un blocage d'authentification.
- Choisir le rôle minimal correspondant au scénario. Pour une capacité
  bénévole ordinaire, utiliser `benevole` ; ne pas utiliser `max` par défaut.
- Ne jamais demander une session Clerk de production ou un Agent Task
  uniquement parce qu'une validation locale protégée nécessite une identité.
- Ne jamais injecter de clés Clerk de production dans `localhost`.
- Avant de déclarer une validation locale bloquée, rechercher et utiliser le
  lanceur ou protocole local officiel du dépôt. Les références canoniques sont
  `.aLANCER_SITE_LOCAL_ROLE_MAX.bat`,
  `apps/web/src/lib/auth/dev-auth.ts`, `apps/web/.env.local.example` et
  `documentation/security/CODEX_SECURITY_PLAYBOOK.md`.
- Si le serveur échoue avant démarrage avec `Invalid local Clerk
  configuration`, classifier séparément le problème : `AUTH_SESSION` relève
  du bypass local ; `CLERK_BOOT_CONFIG` relève d'une configuration Clerk
  Development cohérente nécessaire au démarrage. Une erreur
  `CLERK_BOOT_CONFIG` ne doit jamais être décrite comme « bypass indisponible ».
- Dans le rapport, classifier tout blocage parmi `AUTH_SESSION`,
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
