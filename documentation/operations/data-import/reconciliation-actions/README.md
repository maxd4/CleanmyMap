# Réconciliation historique Actions 2026

Statut : HISTORY / SNAPSHOT. Cinq fiches individuelles révisées avec une lecture Supabase en lecture seule le 28/11/2026. Les valeurs candidates ne sont pas déclarées appliquées ; aucune mutation n'a été effectuée.

Les fiches sont des instantanés de preuve, pas des données runtime concurrentes. Les sauvegardes intégrales (identités, relations, médias, conversations et données privées) doivent rester dans le stockage privé autorisé. Les fiches ne couvrent que les données publiques ou agrégées utiles. Préférer une archive privée pour l'ensemble ; ne publier sur GitHub que les projections explicitement publiques après revue. Supabase reste canonique pour l'état courant. Ne jamais restaurer automatiquement un instantané Markdown par-dessus une action plus récente.

Le mécanisme de backup existant `npm run backup:actions -w apps/web` (format v2) et son restore sont les propriétaires de la restauration technique, sous réserve de vérifier exhaustivité, pagination, couverture média et intégrité. Markdown est un complément lisible et versionnable, généré/actualisé après validation de données, pas un dump de récupération intégrale.

## Emplacement dans le dépôt

Les fiches versionnées sont des projections publiques contrôlées, sous `fiches/`. `PROMPTS_CODEX.md` n'est pas présent dans l'arbre suivi de ce checkout ; aucune copie locale n'a été supprimée ou restaurée. Les archives techniques complètes et données privées restent dans un stockage privé autorisé.

## Index
- [2026-02-14 — b1f71234-21e2-4954-8526-f45f238249ae](./fiches/2026-02-14-b1f71234-21e2-4954-8526-f45f238249ae.md)
- [2026-03-06 — 15ee0be8-3747-48c8-9de0-c12b40e79eb9](./fiches/2026-03-06-15ee0be8-3747-48c8-9de0-c12b40e79eb9.md)
- [2026-03-21 — e168fb7a-034c-4b22-9b5f-b138188bf1e2](./fiches/2026-03-21-e168fb7a-034c-4b22-9b5f-b138188bf1e2.md)
- [2026-04-11 — da367653-530f-4554-9e9b-164519336f52](./fiches/2026-04-11-da367653-530f-4554-9e9b-164519336f52.md)
- [2026-04-22 — f92499c2-aa14-4a51-8b56-c835a7d436f6](./fiches/2026-04-22-f92499c2-aa14-4a51-8b56-c835a7d436f6.md)

Lecture Supabase effectuée le 28/11/2026 : les cinq actions existent et leurs dates concordent ; `collectors_count` est encore `NULL` partout. Les effectifs, masses hors mégots et nombres de mégots concordent avec les fiches. Les propositions de collecteurs restent des hypothèses historiques non appliquées.

Le générateur `apps/web/scripts/action-public-fiches.mjs` projette une liste blanche depuis le même objet Actions v2 validé et l'éligibilité de publication canonique, trie par UUID/date et fusionne une section balisée en préservant l'historique éditorial. Il n'effectue aucune lecture Supabase propre. Commande explicite de génération : `npm run backup:actions -w apps/web -- --public-fiches`. Pour produire aussi l'archive technique dans la même exécution : ajouter `--private-out=<chemin absolu hors dépôt>` ; le chemin doit résoudre vers un répertoire extérieur au dépôt contenant `.cmm-private-backup-destination`. Cette attestation ne remplace pas la vérification effective du stockage privé. Les archives sont créées avec des permissions restreintes et sans écrasement. Aucun chemin `artifacts/` n'est accepté par défaut. Voir [procédure de sauvegarde et restauration](../../supabase-backup-restore.md).
