# Performance locale du workspace

Ce document sert de note opérationnelle pour le workspace local `CleanmyMap-main`.
Il classe les dossiers lourds avant tout nettoyage automatique et distingue ce qui doit être conservé du cache réellement jetable.

## Baseline locale

- Date de mesure: `2026-07-14`
- Surface de travail: `C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main`
- Démarrage Next observé en local: `Ready in 1241ms` puis `Ready in 2.2s`

## Classification des dossiers lourds

| Chemin | Taille | Suivi par Git | Producteur identifié | Commande de régénération | Warm start | Runtime | Suppression sûre | Catégorie |
|---|---:|---|---|---|---|---|---|---|
| `apps/web/.next` | `136.30 MB` | Non | `next dev` / `next build` dans `apps/web` | `npm run dev -w apps/web` ou `npm run build -w apps/web` | Oui | Oui, pour le dev web | Non, à préserver par défaut | `PRESERVE_WARM` |
| `apps/web/.next-sourcemap-test` | `1773.47 MB` | Non | Aucun producteur direct prouvé dans le dépôt; artefact Next lié aux tests source maps | Non prouvée dans le dépôt | Non démontré | Non démontré | Non, tant que la régénération n’est pas prouvée | `UNKNOWN_KEEP` |
| `apps/web/node_modules` | `2.38 MB` | Non | `npm install` dans `apps/web` | `npm install` dans `apps/web` | Oui | Oui, pour le dev web | Non | `PRESERVE_WARM` |
| `node_modules` | `771.63 MB` | Non | `npm install` à la racine | `npm install` à la racine | Oui | Oui, pour le workspace racine | Non | `PRESERVE_WARM` |
| `companion-app/node_modules` | `257.96 MB` | Non | `npm install` dans `companion-app` | `npm install` dans `companion-app` | Oui pour le companion | Oui, si le companion est travaillé | Non | `PRESERVE_WARM` |
| `artifacts` | `61.97 MB` | Non | Scripts d’audit, captures, logs et exports divers | Selon le sous-dossier; pas un bloc unique prouvé régénérable | Non | Non | Non, classification par sous-dossier requise | `PRESERVE_PROJECT` |
| `backups` | `0.06 MB` | Oui, au moins pour `backups/actions-backup-2026-04-24T07-54-44.951Z.json` | Scripts de sauvegarde et archives manuelles | Selon le backup; récréation possible mais pas suffisante pour suppression globale | Non | Non | Non | `PRESERVE_PROJECT` |
| `scratch` | `0.03 MB` | Oui, plusieurs scripts utiles existent | Scripts ponctuels et brouillons techniques | Selon le script; pas de suppression globale | Non | Non | Non | `PRESERVE_PROJECT` |
| `.vercel` | `39.27 MB` | Non | Liaison Vercel locale et variables de preview | `vercel link` / reconfiguration Vercel | Non | Oui, pour le déploiement local et preview | Non | `PRESERVE_PROJECT` |

## Décisions déjà prises

- Le cache Next utile au démarrage local reste conservé.
- `companion-app` reste versionné mais est exclu des watchers et des recherches quotidiennes.
- `artifacts`, `backups`, `scratch` et `.vercel` restent hors du nettoyage safe par défaut.
- Aucun chemin n’entre encore dans un script de suppression safe sans preuve explicite de catégorie `REGENERABLE_SAFE`.

## Points encore non tranchés

- `apps/web/.next-sourcemap-test` n’a pas encore de preuve de régénération locale suffisante pour être classé `REGENERABLE_SAFE`.
- Les sous-dossiers d’`artifacts` doivent être classés individuellement avant toute suppression ciblée.

## Sous-arbres `REGENERABLE_SAFE`

Ces chemins ont une commande de régénération explicite dans le dépôt et peuvent entrer dans un nettoyage sûr après validation.

| Chemin | Commande de régénération | Notes |
|---|---|---|
| `artifacts/clerk-users.csv` | `npm run data:export:clerk` | Export Clerk local reproductible |
| `artifacts/clerk-users.json` | `npm run data:export:clerk` | Export Clerk local reproductible |
| `artifacts/clerk-supabase-audit.csv` | `npm run data:audit:clerk-supabase` | Audit Clerk/Supabase reproductible |
| `artifacts/clerk-supabase-audit.json` | `npm run data:audit:clerk-supabase` | Audit Clerk/Supabase reproductible |
| `artifacts/supabase/quota-audit/` | `npm run backend:supabase:quota-audit -w apps/web` | Rapport d’audit Supabase archivé |

## Commandes

- Simulation du nettoyage safe: `npm run clean:workspace:safe`
- Application du nettoyage safe: `npm run clean:workspace:safe:apply`
- Nettoyage cache dev plus agressif: `npm run dev:clean`
- Inventaire ciblé des processus dev: `npm run report:local-dev-processes`

`dev:clean` reste réservé aux cas où l’on veut repartir sur un cache Next purgé. Il ne doit pas être utilisé comme routine quotidienne si l’objectif est de conserver le warm start local.
`report:local-dev-processes` sert à repérer rapidement les processus locaux plausiblement liés au workspace sans parcourir tout l'arbre des processus.

## Résultats avant/après

Méthode:

- `RAM processus dev principaux` = somme des 5 plus gros processus liés au dev observés dans chaque relevé.
- `Temps démarrage froid` = démarrage avec cache Turbopack vidé mais `apps/web/.next` conservé.
- `Temps redémarrage warm` = redémarrage avec cache Next conservé.

| Indicateur | Avant | Après | Écart | Verdict |
|---|---:|---:|---:|---|
| RAM système utilisée | `6412 MB` | `6920 MB` | `+508 MB` | Pas d’amélioration nette sur la RAM système globale |
| RAM processus dev principaux | `497.3 MB` | `483.5 MB` | `-13.8 MB` | Légère baisse sur les principaux processus liés au dev |
| Nombre de processus Node | `29` | `29` | `0` | Stable |
| Taille `.next` | `136.30 MB` | `137.69 MB` | `+1.39 MB` | Cache conservé, sans explosion de taille |
| Temps démarrage froid | `1241 ms` | `877 ms` | `-364 ms` | Amélioration nette du démarrage froid mesuré localement |
| Temps redémarrage warm | `2.2 s` | `1293 ms` | `-907 ms` | Amélioration nette du warm start |

Lecture:

- Le gain le plus visible est sur le warm start.
- La RAM système globale n’a pas diminué dans cette session, car la session Codex et les processus associés restent dominants.
- Les caches utiles ont été conservés, tandis qu’un sous-ensemble reproductible d’`artifacts` a été retiré du chemin de travail.

## Gouvernance racine

- `schema-global.png` a été déplacé vers `artifacts/schema-global.png`.
- `resize_homepage.js` et `resize_image.ps1` ont été déplacés vers `scripts/media/`.
- La vérification `check:root-files` passe sans erreur après ces déplacements.
