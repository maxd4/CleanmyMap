# Fiche technique CleanMyMap

Résumé ultra court: monorepo npm avec Next.js 16 / React 19, App Router, Supabase + Clerk, Tailwind CSS v4, design system CMM maison, animations Framer Motion, analytics PostHog + Vercel, monitoring Sentry, emails Resend, paiements Stripe, captures Playwright + Sharp.

Ce document est un inventaire technique du projet tel qu'il existe dans le workspace. Il ne propose pas de refonte.

## 1. Stack principale
- Framework : Next.js 16.2.3 dans [apps/web/package.json](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/package.json), avec App Router dans [apps/web/src/app](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app).
- Langage : TypeScript 5, React 19.2.4, modules ES (`type: module`) dans [apps/web/package.json](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/package.json).
- Build tool : `next build`, configuré dans [apps/web/next.config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/next.config.ts); PostCSS/Tailwind v4 dans [apps/web/postcss.config.mjs](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/postcss.config.mjs).
- Routing : App Router, route groups `(app)`, routes dynamiques `[profile]` et `[sectionId]`, routes d'auth `[[...sign-in]]` et `[[...sign-up]]`, API routes sous [apps/web/src/app/api](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/api).
- Styling : Tailwind CSS v4 via `@import "tailwindcss";` dans [apps/web/src/app/globals.css](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/globals.css), complété par des tokens CSS et classes utilitaires maison.
- UI library : pas de bibliothèque UI unique type shadcn généralisée; base maison `Cmm*` dans [apps/web/src/components/ui](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/ui), avec quelques briques Radix (`@radix-ui/react-tabs`) et Clerk.
- Icons : `lucide-react`.
- Animations : `framer-motion`, keyframes CSS dans [apps/web/src/app/globals.css](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/globals.css), transitions de page dans [apps/web/src/components/ui/page-transition.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/ui/page-transition.tsx).
- State management : hooks React locaux, contexte `SitePreferencesProvider` dans [apps/web/src/components/ui/site-preferences-provider.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/ui/site-preferences-provider.tsx), cache de vues via SWR dans [apps/web/src/lib/swr-config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/swr-config.ts).
- Backend / DB : Supabase dans [apps/web/src/lib/supabase/server.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/supabase/server.ts) et [apps/web/src/lib/supabase/client.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/supabase/client.ts), plus routes API Next et services internes.
- Auth : Clerk dans [apps/web/src/components/auth/clerk-localization-provider.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/auth/clerk-localization-provider.tsx), [apps/web/src/lib/clerk-session-config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/clerk-session-config.ts), [apps/web/src/lib/authz.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/authz.ts), et [apps/web/src/proxy.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/proxy.ts).
- Analytics : PostHog client/server dans [apps/web/src/lib/posthog/client.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/posthog/client.ts) et [apps/web/src/lib/posthog/server.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/posthog/server.ts), plus Vercel Analytics et Speed Insights dans [apps/web/src/app/layout.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/layout.tsx).
- Monitoring : Sentry via `@sentry/nextjs`, configs [apps/web/sentry.server.config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/sentry.server.config.ts) et [apps/web/sentry.edge.config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/sentry.edge.config.ts), activation conditionnelle dans [apps/web/next.config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/next.config.ts).
- Emails : Resend via [apps/web/src/lib/services/resend.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/services/resend.ts) et couche unifiée dans [apps/web/src/lib/services/email.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/services/email.ts).
- Tests : Vitest via [apps/web/vitest.config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/vitest.config.ts), tests `*.test.ts` dans `src`, plus Playwright pour les captures.
- Screenshots : script Playwright + Sharp dans [documentation/liberte-UX-UI/capture-pages.mjs](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/liberte-UX-UI/capture-pages.mjs), exposé par `npm run screenshots`.

## 2. Commandes utiles
- Installation :
```bash
npm install
```
- Dev server :
```bash
npm run dev
```
- Build :
```bash
npm run build
```
- Lint :
```bash
npm run lint
```
- Test :
```bash
npm run test
```
- Screenshot :
```bash
npm run screenshots
```
- Audit :
```bash
npm run checks
```

## 3. Structure du projet
- `apps/web/src/app` : pages, layouts, metadata, routes API, accueil, route groups `(app)`.
- `apps/web/src/components` : composants réutilisables par domaine (`accueil`, `ui`, `actions`, `sections`, `reports`, `navigation`, `admin`, `learn`, etc.).
- `apps/web/src/lib` : logique métier, navigation, sections registry, auth, Supabase, PostHog, validation, services, env, utilitaires.
- `apps/web/src/hooks` : hooks React ciblés.
- `apps/web/public` : logos, manifest, icônes, assets statiques.
- `apps/web/data/raw` : import de données brutes.
- `apps/web/data/local-db` : snapshots locaux de données.
- `apps/web/scripts` : scripts d'import, sync, export, doctor, bootstrap.
- `documentation` : architecture, design system, opérations, captures, product, security.
- `legacy` : ancien outillage Python archivé.
- `scripts` à la racine : checks et maintenance du monorepo.
- `backups` et `artifacts` : sorties historiques, pas des sources de vérité pour le produit.

## 4. Accueil
- Fichier principal de l'accueil : [apps/web/src/app/page.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/page.tsx).
- Composants utilisés par l'accueil :
- `HomeHero`
- `HomeImpactSummary`
- `HomePillars`
- `HomeBenefits`
- `HomeCommunityActivity`
  - `OriginCredibility`
  - `HomeFooter`
  - `HomeButton`
  - `SitePreferencesControls`
- Sections principales :
  - Hero + bloc d'impact en deux colonnes
  - Piliers de navigation
  - Bénéfices
  - Activité communauté
  - Origine et crédibilité
  - Footer contact
- Fichiers CSS liés :
  - [apps/web/src/app/globals.css](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/globals.css)
  - [apps/web/src/components/accueil/accueil-surface.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/accueil/accueil-surface.ts)
  - [apps/web/src/lib/ui/block-accents.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/ui/block-accents.ts)
- Où sont définies les couleurs :
  - tokens globaux dans [apps/web/src/app/globals.css](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/globals.css)
  - palettes des piliers et bénéfices dans [apps/web/src/lib/accueil/config.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/accueil/config.ts)
  - surfaces accueil dans [apps/web/src/components/accueil/accueil-surface.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/accueil/accueil-surface.ts)
  - accents par bloc dans [apps/web/src/lib/ui/block-accents.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/ui/block-accents.ts)
- Où sont définis les boutons :
  - bouton accueil dans [apps/web/src/components/accueil/accueil-button.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/accueil/accueil-button.tsx)
  - bouton générique dans [apps/web/src/components/ui/cmm-button.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/ui/cmm-button.tsx)
  - certains CTA du header et des pages sont codés inline.
- Où sont définies les cartes :
  - cartes accueil dans [apps/web/src/components/accueil/accueil-surface.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/accueil/accueil-surface.ts)
  - cartes génériques dans [apps/web/src/components/ui/cmm-card.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/ui/cmm-card.tsx)
  - cartes de sections dans [apps/web/src/components/ui/cmm-block-accent.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/ui/cmm-block-accent.tsx)
- Point de vigilance routing : l'accueil contient des liens vers `/methodology` dans [apps/web/src/components/accueil/accueil-impact-summary.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/accueil/accueil-impact-summary.tsx), alors que la route canonique trouvée dans le projet est `/methodologie` via [apps/web/src/app/(app)/methodologie/page.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/(app)/methodologie/page.tsx).

## 5. Design system actuel
- Palette utilisée : base dark premium sur `#020617` / `#f8fafc`, accents cyan/emerald, tons bleutés et violets pour les cartes et les CTA.
- Variables CSS / tokens :
  - `--background`, `--foreground`
  - `--bg-canvas`, `--bg-elevated`, `--bg-muted`
  - `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
  - `--border-default`, `--border-strong`
  - `--focus-ring`
  - `--action-primary-bg`, `--action-primary-text`, `--action-primary-hover`
  - `--action-secondary-bg`, `--action-secondary-text`, `--action-secondary-hover`
  - échelles typo / spacing / radius / shadows dans [apps/web/src/app/globals.css](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/globals.css)
- Classes utilitaires importantes :
  - surfaces : `.cmm-surface`, `.cmm-surface-muted`, `.cmm-panel`, `.cmm-card`
  - texte : `.cmm-text-h1` à `.cmm-text-h4`, `.cmm-text-body`, `.cmm-text-small`, `.cmm-text-caption`, `.cmm-text-primary`, `.cmm-text-secondary`, `.cmm-text-muted`
  - interactions : `.cmm-cta-pop`, `.cmm-surface-action`, `.cmm-clickable`, `.cmm-interactive`, `.cmm-input`
  - accessibilité / lisibilité : `.cmm-focus-ring`, `.cmm-prose`, `.cmm-line-clamp-*`, `.cmm-nowrap`
  - modes d’affichage : `[data-display-mode="minimaliste"]`, `[data-display-mode="sobre"]`
  - profils : `[data-user-profile="scientifique"]`, `[data-user-profile="elu"]`, `[data-user-profile="admin"]`, `[data-user-profile="coordinateur"]`
- Style des boutons :
  - `CmmButton` applique les tokens sémantiques et les variantes `default`, `pill`, `ghost`
  - `HomeButton` utilise des dégradés très marqués pour `primary` et `secondary`, avec `tertiary` plus discret
- Style des cartes :
  - `CmmCard` gère `slate`, `emerald`, `sky`, `amber`, `violet`, `rose`, `indigo`
- l'accueil utilise des cartes à fond gradient sombre avec bords fins et ombres profondes
- Style des sections :
  - grandes sections full-bleed, overlays radiaux, grain léger, borders translucides
  - composants structurants disponibles : `CmmSection`, `CmmPageLayout`, `CmmBlockCard`
- Breakpoints responsive :
  - base Tailwind : `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536
  - `@media (max-width: 640px)` dans [apps/web/src/app/globals.css](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/globals.css) pour densité mobile
  - `@media (min-width: 1024px)` pour le sizing global
  - `@media print` pour l’export
- Conventions de nommage :
  - préfixe `cmm-` pour les utilitaires canoniques
  - `HOME_*` pour les constantes de l'accueil
  - `BLOCK_*` pour les accents de bloc
  - composants en PascalCase
  - routes et dossiers en kebab-case

## 6. Recommandations pour écrire de bons prompts Codex
- Mentionner les fichiers exacts à modifier, pas seulement le thème général.
- Pour l'accueil, citer au minimum [apps/web/src/app/page.tsx](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/page.tsx) et les composants concernés dans [apps/web/src/components/accueil](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/accueil).
- Si la demande touche au style, inclure [apps/web/src/app/globals.css](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/app/globals.css), [apps/web/src/components/accueil/accueil-surface.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/components/accueil/accueil-surface.ts) et [apps/web/src/lib/ui/block-accents.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/ui/block-accents.ts).
- Si la demande touche au routing, inclure [apps/web/src/lib/navigation.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/navigation.ts), [apps/web/src/lib/sections-registry.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/lib/sections-registry.ts) et [apps/web/src/proxy.ts](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/apps/web/src/proxy.ts).
- Ajouter des contraintes claires :
  - conserver App Router
  - ne pas renommer les slugs
  - ne pas ajouter de nouvelle dépendance
  - réutiliser `CmmButton`, `CmmCard`, `CmmSection`, `cn()`
  - préserver Clerk, Supabase, PostHog, Sentry
- Découper les demandes section par section :
  - `hero`
  - `impact`
  - `pillars`
  - `benefits`
  - `community`
  - `credibility`
  - `footer`
- Éviter de demander une “refonte globale” si le but est une modification ciblée.

## 7. Résumé final ultra court
- Stack centrale : Next.js 16, React 19, TypeScript, Tailwind v4, Clerk, Supabase.
- UI : design system CMM maison, cartes/boutons/tokens CSS, Framer Motion, Lucide.
- Observabilité et services : PostHog, Sentry, Vercel Analytics, Resend, Stripe, Pinecone, Upstash.
- Captures : Playwright + Sharp via [documentation/liberte-UX-UI/capture-pages.mjs](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/liberte-UX-UI/capture-pages.mjs).
- Fichier principal créé : [documentation/fiche-technique-cleanmymap.md](C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/fiche-technique-cleanmymap.md).


