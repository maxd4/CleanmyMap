# CleanMyMap

<p align="center">
  <img src="apps/web/src/app/favicon.ico" alt="CleanMyMap" width="180" />
</p>

<p align="center">
  <strong>Plateforme citoyenne pour déclarer, visualiser et exporter des actions de dépollution.</strong>
</p>

<p align="center">
  <a href="https://cleanmymap.vercel.app">Démo</a> ·
  <a href="https://github.com/maxd4/CleanMyMap/issues">Issues</a> ·
  <a href="./documentation/README.md">Documentation</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-6-blue?logo=typescript" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk" alt="Clerk" />
  <img src="https://img.shields.io/badge/Vercel-Deploy-000000?logo=vercel" alt="Vercel" />
</p>

## En bref

CleanMyMap est une plateforme civic-tech centrée sur l'action terrain, la cartographie, la preuve d'impact et la coordination locale.

Le projet permet notamment de :

- préparer et déclarer des actions de dépollution ;
- suivre les impacts et produire des rapports ;
- explorer une carte communautaire ;
- coordonner citoyens, associations, collectivités et partenaires ;
- proposer des contenus pédagogiques sur les déchets et les bonnes pratiques.

## Stack

La version exacte des dépendances est définie dans les manifestes.

Repères actuels :

- Next.js 16 avec App Router ;
- React 19 ;
- TypeScript 6 ;
- Tailwind CSS 4 ;
- Supabase/PostgreSQL ;
- Clerk ;
- Vercel ;
- Expo/React Native pour l'application compagnon.

## Structure du dépôt

| Chemin | Rôle |
| --- | --- |
| `apps/web/` | Application Next.js de production, routes API et composants |
| `apps/web/supabase/` | Configuration et migrations Supabase du workspace web |
| `companion-app/` | Application mobile de suivi GPS, encore à stabiliser sur l'identité et la finalisation des missions |
| `documentation/` | Architecture, produit, sécurité, design system, opérations et pages |
| `scripts/` | Garde-fous, audits et maintenance Node |
| `maintenance/python/` | Outils Python de maintenance hors runtime principal |

## Source de vérité

Pour tout travail ciblé sur le dépôt :

1. lire l'état actuel de GitHub ;
2. inspecter les fichiers réellement concernés ;
3. ne pas appliquer aveuglément un ancien plan ou une ancienne conversation ;
4. lire `AGENTS.md`.

Documentation principale :

- `documentation/README.md`
- `documentation/architecture/README.md`
- `documentation/design-system/README.md`
- `documentation/security/README.md`
- `documentation/pages_site/INDEX.md`
- `apps/web/README.md`

## Démarrage

Pré-requis :

- Node.js 20 ou plus récent ;
- dépendances npm installées.

```bash
npm install
npm run dev
```

Le script de développement utilise le port `3000` s'il est libre, sinon il choisit le premier port disponible suivant.

## Commandes utiles

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:security
npm run test:regression-gates
npm run build

npm run checks:changed
npm run checks
npm run checks:maintenance
npm run test:e2e:list
npm run test:e2e

npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:agent-skills

npm run audit:vercel-quota
npm run report:vercel-surface
```

## Validation

Pour une boucle rapide :

```bash
npm run checks:changed
```

Pour une livraison importante :

```bash
npm run checks
```

La lane maintenance reste disponible à part :

```bash
npm run checks:maintenance
```

Les tests E2E sont séparés car Playwright peut nécessiter l'installation locale de Chromium :

```bash
npx playwright install chromium
npm run test:e2e
```

## Sécurité

- signalement responsable : `SECURITY.md` ;
- documentation interne : `documentation/security/README.md` ;
- audit secrets : `npm run security:secrets` ;
- AuthN : Clerk ;
- AuthZ : contrôles serveur ;
- données : Supabase avec RLS et séparation des clients anon/service role.

Ne jamais exposer une clé `service_role` dans un client web ou mobile.

## Application compagnon

`companion-app/` assure le suivi GPS natif.

Deux points doivent être stabilisés avant de la considérer comme prête pour la production :

- l'identité doit converger avec l'identité Clerk principale ;
- la finalisation de distance ne doit pas appeler directement depuis le client une RPC réservée à `service_role`.

Voir :

- `documentation/architecture/adr/ADR-004-companion-identity.md`
- `documentation/architecture/adr/ADR-006-supabase-migrations-source-of-truth.md`

## Origine

CleanMyMap a été initié et conçu par **Maxence Deroome**.

Références :

- `documentation/origin-about.md`
- `AUTHORS.md`

## Licence

Le code est publiquement visible, mais la licence définitive reste à arbitrer.

Tant qu'aucun fichier `LICENSE` explicite n'est publié, ne pas présenter ISC ou une autre licence comme décision définitive du projet.
