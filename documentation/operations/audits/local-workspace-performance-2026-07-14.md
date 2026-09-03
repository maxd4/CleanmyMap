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
| `apps/mobile/node_modules` | `257.96 MB` | Non | `npm install -w apps/mobile` | `npm install -w apps/mobile` | Oui pour le mobile | Oui, si le mobile est travaillé | Non | `PRESERVE_WARM` |
| `artifacts` | `61.97 MB` | Non | Scripts d’audit, captures, logs et exports divers | Selon le sous-dossier; pas un bloc unique prouvé régénérable | Non | Non | Non, classification par sous-dossier requise | `PRESERVE_PROJECT` |
| `backups` | `0.06 MB` | Oui, selon les archives conservées | Scripts de sauvegarde et archives manuelles | Selon le backup; récréation possible mais pas suffisante pour suppression globale | Non | Non | Non | `PRESERVE_PROJECT` |
| `scratch` | `0.03 MB` | Oui, plusieurs scripts utiles existent | Scripts ponctuels et brouillons techniques | Selon le script; pas de suppression globale | Non | Non | Non | `PRESERVE_PROJECT` |
| `.vercel` | `39.27 MB` | Non | Liaison Vercel locale et variables de preview | `vercel link` / reconfiguration Vercel | Non | Oui, pour le déploiement local et preview | Non | `PRESERVE_PROJECT` |

## Politique de rétention des sorties locales

Les sorties générées peuvent exister pendant une exécution locale, mais elles
ne doivent pas devenir un stock permanent dans le checkout. Un fichier ignoré
par Git n'est pas automatiquement supprimable : sa provenance, son producteur,
sa régénérabilité et son rôle doivent être établis avant toute suppression.

- `artifacts/` est réservé aux sorties locales d'un run : rapports, exports,
  captures, logs et snapshots temporaires. Chaque run doit utiliser un
  sous-dossier nommé et être classé à la fin en `KEEP`,
  `EXTRACT_THEN_DELETE`, `DELETE` ou `REVIEW`.
- `.artifacts/` est réservé aux preuves durables explicitement retenues et
  référencées. Une preuve conservée doit rester minimale et documenter sa
  commande productrice, sa date, son SHA ou état Git pertinent et ses hashes
  lorsqu'ils sont nécessaires à l'intégrité. Ce n'est pas un espace de cache.
- Ne jamais conserver dans `artifacts/` ou `.artifacts/` une copie complète du
  dépôt, un clone imbriqué, `.git`, `node_modules`, `.next`, un cache de build,
  un log de travail ou un dump temporaire. Ces éléments sont reproductibles ou
  locaux par nature et doivent être supprimés après vérification de l'absence
  de dépendance active.
- Une copie complète nécessaire à un diagnostic doit rester exceptionnelle,
  limitée à la durée du diagnostic et supprimée dès que les preuves utiles ont
  été extraites. Elle ne doit jamais être utilisée comme emplacement de
  sauvegarde permanent dans le checkout.
- Avant la suppression, vérifier les références actives, les processus
  producteurs et l'état Git. Ne jamais supprimer un fichier uniquement parce
  qu'il est untracked, ancien ou absent des imports. Toute utilité incertaine
  reste en `REVIEW`.
- Les migrations, fixtures, données locales, configurations, secrets locaux,
  `.clerk`, `.vercel`, `.mcp.json`, `.env*` et les preuves de validation encore
  référencées ne sont pas des temporaires par défaut.

Checklist de fin de run :

1. classer chaque sortie locale selon sa provenance et son rôle ;
2. extraire uniquement les preuves nécessaires vers leur emplacement canonique ;
3. supprimer les seuls éléments `DELETE` dont la régénération et l'absence de
   rôle canonique sont prouvées ;
4. contrôler `git status --short`, `git diff --cached --name-status` et
   `git check-ignore` pour confirmer qu'aucun temporaire n'est suivi ou staged.

## Décisions déjà prises

- Le cache Next utile au démarrage local reste conservé.
- `apps/mobile` reste versionné mais est exclu des watchers et des recherches quotidiennes.
- `artifacts`, `backups`, `scratch` et `.vercel` restent hors du nettoyage safe par défaut.
- Aucun chemin n’entre encore dans un script de suppression safe sans preuve explicite de catégorie `REGENERABLE_SAFE`.

## Points encore non tranchés

- `apps/web/.next-sourcemap-test` n’a pas encore de preuve de régénération locale suffisante pour être classé `REGENERABLE_SAFE`.
- Les sous-dossiers d’`artifacts` doivent être classés individuellement avant toute suppression ciblée.

## Sous-arbres `REGENERABLE_SAFE`

Ces chemins ont une commande de régénération explicite dans le dépôt et peuvent entrer dans un nettoyage sûr après validation.

| Chemin | Commande de régénération | Notes |
|---|---|---|
| `artifacts/exports/clerk-users.csv` | `npm run data:export:clerk` | Export Clerk local reproductible |
| `artifacts/exports/clerk-users.json` | `npm run data:export:clerk` | Export Clerk local reproductible |
| `artifacts/audits/clerk-supabase-audit.csv` | `npm run data:audit:clerk-supabase` | Audit Clerk/Supabase reproductible |
| `artifacts/audits/clerk-supabase-audit.json` | `npm run data:audit:clerk-supabase` | Audit Clerk/Supabase reproductible |
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
