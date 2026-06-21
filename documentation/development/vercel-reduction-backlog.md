# Backlog réduction Vercel

Dernière mise à jour: 2026-06-16

Ce document conserve la partie de l’audit Vercel qui n’a pas encore été traitée.  
Les points déjà corrigés au moment de cette note sont exclus ici pour éviter les doublons.

## À corriger maintenant

| fichier | usage Vercel suspect | gravité | solution recommandée | risque de casse | priorité |
| --- | --- | --- | --- | --- | --- |
| [apps/web/src/app/layout.tsx](../../apps/web/src/app/layout.tsx) | Le root layout lit encore des infos d’auth et de préférences côté serveur pour tout le site. | Élevée | Continuer à réduire le travail serveur au strict nécessaire, surtout hors des routes protégées. | Élevé | P1 |
| [apps/web/src/app/api/reports/elus-dossier/route.ts](../../apps/web/src/app/api/reports/elus-dossier/route.ts) | Génération serveur de dossier Markdown / PDF / JSON. | Élevée | Pré-générer ou mettre en cache l’artefact quand l’usage le permet. | Élevé | P1 |
| [apps/web/src/app/api/reports/actions.csv/route.ts](../../apps/web/src/app/api/reports/actions.csv/route.ts) | Export CSV lourd, téléchargé à la demande. | Élevée | Limiter la volumétrie ou servir un artefact déjà produit. | Moyen à élevé | P1 |
| [apps/web/src/app/api/reports/actions.json/route.ts](../../apps/web/src/app/api/reports/actions.json/route.ts) | Export JSON lourd, même surface que le CSV. | Élevée | Même stratégie que le CSV, avec borne stricte et cache si possible. | Moyen à élevé | P1 |
| [apps/web/src/app/api/reports/governance-monthly/route.ts](../../apps/web/src/app/api/reports/governance-monthly/route.ts) | Génération PDF serveur. | Moyenne à élevée | Garder serveur seulement si l’usage reste ponctuel; sinon passer à un livrable précompilé. | Moyen | P1 |

## Acceptable provisoirement

| fichier | usage Vercel suspect | gravité | solution recommandée | risque de casse | priorité |
| --- | --- | --- | --- | --- | --- |
| [apps/web/src/app/(app)/reports/page.tsx](../../apps/web/src/app/%28app%29/reports/page.tsx) | Page dynamique par conception: auth, Supabase, météo live, agrégations. | Moyenne | Conserver dynamique tant que la vue temps réel reste utile. | Moyen | P2 |
| [apps/web/src/app/learn/bonnes-pratiques/page.tsx](../../apps/web/src/app/learn/bonnes-pratiques/page.tsx) | Dynamique surtout à cause de la locale serveur via cookies. | Faible à moyenne | Statifier par locale plus tard si nécessaire. | Faible | P2 |
| [apps/web/src/app/learn/comprendre/page.tsx](../../apps/web/src/app/learn/comprendre/page.tsx) | Même logique que la page précédente. | Faible à moyenne | Même recommandation. | Faible | P2 |
| [apps/web/src/app/learn/sentrainer/page.tsx](../../apps/web/src/app/learn/sentrainer/page.tsx) | Même logique que la page précédente. | Faible à moyenne | Même recommandation. | Faible | P2 |
| [apps/web/src/app/(app)/prints/report/page.tsx](../../apps/web/src/app/%28app%29/prints/report/page.tsx) | Page imprimable documentaire, pas un export serveur lourd. | Faible | Conserver tel quel. | Faible | P2 |
| [apps/web/src/app/api/admin/storage-usage/route.ts](../../apps/web/src/app/api/admin/storage-usage/route.ts) | Audit admin recalculé à la demande. | Moyenne | Servir un snapshot si la consultation augmente. | Faible à moyen | P2 |
| [apps/web/src/app/api/admin/codex-usage/route.ts](../../apps/web/src/app/api/admin/codex-usage/route.ts) | Audit admin recalculé à la demande. | Moyenne | Même logique de snapshot ou cache interne. | Faible à moyen | P2 |

## À revoir plus tard

| fichier | usage Vercel suspect | gravité | solution recommandée | risque de casse | priorité |
| --- | --- | --- | --- | --- | --- |
| [apps/web/src/components/ui/pdf-export/use-pdf-export.ts](../../apps/web/src/components/ui/pdf-export/use-pdf-export.ts) | Génération PDF côté client avec historique en `localStorage`. | Faible | Conserver ce pattern. | Faible | P3 |
| [apps/web/src/components/actions/map/use-actions-map-filters.ts](../../apps/web/src/components/actions/map/use-actions-map-filters.ts) | Filtres carte persistés localement. | Faible | Garder côté navigateur. | Faible | P3 |
| [apps/web/src/components/ui/site-preferences-provider.tsx](../../apps/web/src/components/ui/site-preferences-provider.tsx) | Préférences UI synchronisées localement. | Faible | Garder localStorage + cookie léger. | Faible | P3 |
| [apps/web/src/lib/storage/ui-state-storage.ts](../../apps/web/src/lib/storage/ui-state-storage.ts) | Stockage local des préférences et de l’état UI. | Faible | Garder côté client. | Faible | P3 |
| [apps/web/src/lib/learning/learn-progress.ts](../../apps/web/src/lib/learning/learn-progress.ts) | Progression d’apprentissage en local. | Faible | Garder le fallback local. | Faible | P3 |
| [apps/web/src/lib/services/quiz-srs-service.ts](../../apps/web/src/lib/services/quiz-srs-service.ts) | SRS du quiz avec fallback local. | Faible | Ne pas remonter vers Vercel. | Faible | P3 |

## Notes de contexte

- Les pages Markdown publiques doivent rester dans le dépôt.
- La carte principale passe déjà directement par Supabase côté navigateur pour la lecture de données.
- Le middleware Clerk doit rester limité aux routes réellement protégées.
- Les états non critiques doivent rester en `localStorage` ou `IndexedDB` quand c’est possible.

## Reprise

Quand on reprend ce dossier, l’ordre utile est:
1. réduire les derniers points du root layout si un sous-shell public peut encore être isolé,
2. décider si les exports PDF/CSV lourds doivent être pré-générés,
3. n’optimiser les pages dynamiques de lecture que si la pression Vercel redevient visible.
