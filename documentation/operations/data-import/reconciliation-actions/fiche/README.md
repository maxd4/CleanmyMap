# Réconciliation historique Actions 2026

Statut : CANDIDATE / HISTORY. Cinq fiches individuelles préparées le 27/11/2026 à partir du CSV brut versionné, de lectures Supabase et de recherches publiques. Pas de mutation ni de commit effectués.

Les fiches sont des instantanés de preuve, pas des données runtime concurrentes. Les sauvegardes intégrales (identités, relations, médias, conversations et données privées) doivent rester dans le stockage privé autorisé. Les fiches ne couvrent que les données publiques ou agrégées utiles. Préférer une archive privée pour l'ensemble ; ne publier sur GitHub que les projections explicitement publiques après revue. Supabase reste canonique pour l'état courant. Ne jamais restaurer automatiquement un instantané Markdown par-dessus une action plus récente.

Le mécanisme de backup existant `npm run backup:actions -w apps/web` (format v2) et son restore sont les propriétaires de la restauration technique, sous réserve de vérifier exhaustivité, pagination, couverture média et intégrité. Markdown est un complément lisible et versionnable, généré/actualisé après validation de données, pas un dump de récupération intégrale.

## Emplacement dans le dépôt

Chemin cible des fiches publiques revues et de leur index : `documentation/operations/data-import/reconciliation-actions/`. Ne jamais créer `reconciliation-actions/` à la racine du dépôt. Le fichier `PROMPTS_CODEX.md` est un support de passation temporaire, à exclure des commits. Les archives techniques complètes et données privées restent dans le stockage privé autorisé.

## Index
- [2026-02-14 : Gambetta et Martin Nadaud](2026-02-14.md)
- [2026-03-06 : Studio Ferber et Saint-Fargeau](2026-03-06.md)
- [2026-03-21 : Porte des Lilas et jardin Serge Gainsbourg](2026-03-21.md)
- [2026-04-11 : Pierre Foncin et boulevard Mortier](2026-04-11.md)
- [2026-04-22 : Jacques Louvel-Tessier et Marguerite Moret](2026-04-22.md)
