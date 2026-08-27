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
  <a href="./documentation/README.md">Documentation</a> ·
  <a href="https://cleanmymap.fr/mentions-legales">Mentions légales</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-7-blue?logo=typescript" alt="TypeScript 7" />
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
- TypeScript 7 ;
- Tailwind CSS 4 ;
- Supabase/PostgreSQL ;
- Clerk ;
- Vercel ;
- Expo/React Native pour l'application mobile.

## Structure du dépôt

| Chemin | Rôle |
| --- | --- |
| `apps/web/` | Application Next.js de production, routes API et composants |
| `apps/web/supabase/` | Configuration et migrations Supabase du workspace web |
| `apps/mobile/` | Application mobile de suivi GPS, encore à stabiliser sur l'identité et la finalisation des missions |
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

La correspondance entre les jobs GitHub Actions et les contrôles reproductibles
localement est documentée dans [l'audit de reproductibilité des workflows](documentation/operations/github-governance.md#reproductibilité-locale-des-workflows).

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

## Application mobile

`apps/mobile/` assure le suivi GPS natif.

CleanMyMap est un seul produit et un seul monorepo avec deux applications
déployables distinctes : `apps/web` pour le web et `apps/mobile` pour le mobile.
L'application mobile est issue de l'ancien `companion-app`, qui reste un repère
historique et technique, mais elle ne constitue ni une copie du web ni un
projet indépendant. Les deux applications partagent notamment Clerk,
Supabase et les contrats métier nécessaires.

Les contrats d'identité Clerk et de finalisation de distance sont finalisés puis
gelés. Les limites encore ouvertes sont le renouvellement en background
headless, `mission_actions`, la validation opérationnelle et la future évolution
produit avant toute reprise du mobile.

Les identifiants techniques historiques restent inchangés :
`cleanmymap-companion` et `fr.cleanmymap.companion`.

Voir :

- `documentation/architecture/adr/ADR-004-companion-identity.md`
- `documentation/architecture/adr/ADR-006-supabase-migrations-source-of-truth.md`

## Cadre juridique

CleanMyMap est un projet étudiant édité à titre non professionnel.

- Éditeur : **Maxence Deroome**, personne physique ;
- Directeur de la publication : **Maxence Deroome** ;
- Hébergement web : **Vercel Inc.**

Documents publics :

- [Mentions légales](https://cleanmymap.fr/mentions-legales)
- [Politique de confidentialité](https://cleanmymap.fr/politique-confidentialite)
- [Politique des cookies](https://cleanmymap.fr/politique-cookies)
- [Conditions générales d'utilisation](https://cleanmymap.fr/conditions-generales-utilisation)
- [Documentation juridique](documentation/legal/README.md)
- [Signalement de vulnérabilité](SECURITY.md)

## Origine

CleanMyMap a été initié et conçu par **Maxence Deroome**.

Références :

- `documentation/origin-about.md`
- `AUTHORS.md`

## Licence

Le code source est publiquement consultable, mais aucune licence de
réutilisation définitive n'est publiée à ce jour.

En l'absence de fichier `LICENSE`, aucune licence open source définitive ni
aucun droit général de réutilisation n'est accordé. Aucune licence open source
particulière ne doit être déduite.
