# Suivi SonarCloud — lot vulnérabilités historiques du 15 octobre 2026

Source du triage : `CleanMyMap_SonarCloud_491_issues_2026-10-14.json`, sur la
révision historique `ed0e2659760e3bdd8d26fba0389c6a52701a8c18`. Les statuts
`FIXED_PENDING_SCAN` restent provisoires jusqu'à un nouveau scan SonarCloud.

| Identifiant | Règle / emplacement | Qualification | Décision et statut |
| --- | --- | --- | --- |
| `AaE3K8xjzHjHEPBoeRC0` | S1523 — `scripts/design/generate-design-system-board.mjs:115` | Risque plausible : le dépôt est l'entrée de l'outil, et une expression injectée pouvait être exécutée par `Function`. | Remplacé par une évaluation AST limitée aux littéraux de données ; les appels, spreads et propriétés calculées sont refusés. Test adverse ajouté. `FIXED_PENDING_SCAN`. |
| `AaE3K8sNzHjHEPBoeRBw` | S5443 — `scripts/dev/clean-local-temp.mjs:6` | Faux positif démontré pour l'usage observé : aucune donnée web ou chemin utilisateur n'est consommé ; seuls des noms de caches/fichiers explicitement allowlistés, anciens et non liés à un éditeur actif sont candidats. Les entrées symlink ne sont pas des candidats. | Aucun changement métier ; conservation de la limite de nettoyage et justification dans ce suivi. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8sNzHjHEPBoeRBx` | S5443 — même usage | Même preuve que l'identifiant précédent ; doublon SonarCloud sur la même expression. | Même décision. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8iCzHjHEPBoeQ_3` | S5145 — `scripts/audits/audit-clerk-supabase.mjs:738` | Faux positif démontré : le JSON journalisé est le résumé local de compteurs, booléens et horodatage généré ; aucune ligne Clerk, valeur de requête ou texte utilisateur n'est incluse. | Aucun changement ; le résumé reste vérifiable et sans contenu contrôlé par l'utilisateur. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8uBzHjHEPBoeRCN` | S5145 — `scripts/data/export-clerk-users.mjs:269` | Risque plausible : les chemins de sortie CLI pouvaient contenir des contrôles de ligne avant journalisation. | Ajout de `sanitizeLogValue` et test CR/LF/NUL ; les fichiers restent bornés à `artifacts`. `FIXED_PENDING_SCAN`. |
| `AaE3K8m2zHjHEPBoeRAv` | S8707 — `scripts/checks/check-public-e2e-artifact.mjs:49` | Exploitabilité démontrée au niveau du contrat CLI : la racine fournie devait être bornée avant lecture récursive. | Racine limitée à `artifacts/ci-public-evidence` et sous-répertoires ; test de chemin parent/traversal ajouté. `FIXED_PENDING_SCAN`. |
| `AaE3K8mAzHjHEPBoeRAg` | S8707 — `scripts/reports/assemble-impact-report.mjs:44` | Exploitabilité démontrée au niveau du contrat CLI : `--output` pouvait viser un chemin arbitraire et écraser un fichier local. | Sortie limitée à un fichier direct de `artifacts/assembled-reports` ; test de rejet du chemin parent ajouté. `FIXED_PENDING_SCAN`. |
| `AaE3K8g8zHjHEPBoeQ_w` | S2245 — `apps/mobile/lib/gps-point-identity.ts:5` | Risque plausible de collision/prédictibilité pour une identité synchronisée ; ce n'est pas une preuve d'authentification. | `crypto.randomUUID` avec fallback borné sans PRNG ; test d'identifiants distincts. `FIXED_PENDING_SCAN`. |
| `AaE3K8hQzHjHEPBoeQ_y` | S2245 — `apps/mobile/lib/storage.ts:38` | Faux positif démontré pour l'usage observé : clé locale de buffer, sans secret ni décision d'autorisation ; le besoin est seulement une séparation locale à durée bornée. | Générateur non cryptographique conservé, sans élargir sa portée. `FALSE_POSITIVE_PROVEN`. |
| `AaE3K8NQzHjHEPBoeQ99` | S2245 — `apps/web/src/components/chat/hooks/use-chat-submit.helpers.ts:66` | Risque plausible de collision/prédictibilité sur un chemin d'upload client. | Remplacé par l'identifiant crypto/fallback borné, en conservant le préfixe utilisateur et l'extension. `FIXED_PENDING_SCAN`. |
| `AaE3K8M8zHjHEPBoeQ96` | S2245 — `apps/web/src/components/chat/hooks/use-chat-submit.ts:57` | Risque plausible de collision sur l'identifiant d'opération optimiste. | Remplacé par l'identifiant crypto/fallback borné ; format sécurisé sans changement du flux métier. `FIXED_PENDING_SCAN`. |
| `AaE3K8LSzHjHEPBoeQ9q` | S2245 — `apps/web/src/components/ui/pdf-export/use-pdf-export.ts:115` | Risque plausible de collision dans l'historique d'export. | Remplacé par l'identifiant crypto/fallback borné en conservant le préfixe `CMM-PDF`. `FIXED_PENDING_SCAN`. |
| `AaE3K78rzHjHEPBoeQ8b` | S2245 — `apps/web/src/lib/actions/exports/export-form-history.ts:96` | Risque plausible de collision dans l'historique d'export. | Remplacé par l'identifiant crypto/fallback borné en conservant le préfixe `CMM-EXP`. `FIXED_PENDING_SCAN`. |
| `AaE3K78gzHjHEPBoeQ8a` | S2245 — `apps/web/src/lib/actions/exports/export-form-pdf.ts:82` | Risque plausible de collision dans l'identifiant embarqué du PDF. | Remplacé par l'identifiant crypto/fallback borné en conservant le préfixe `CMM-FORM`. `FIXED_PENDING_SCAN`. |
| `AaE3K79YzHjHEPBoeQ8g` | S2245 — `apps/web/src/lib/actions/signalement/signalement-media-client.ts:53` | Risque plausible de collision d'élément d'upload côté client. | `crypto.randomUUID` ou fallback séquentiel borné ; le chemin de traitement reste inchangé. `FIXED_PENDING_SCAN`. |
| `AaE3K7-BzHjHEPBoeQ8k` | S2245 — `apps/web/src/lib/actions/vision.ts:332` | Risque plausible de collision d'identifiant photo temporaire. | `crypto.randomUUID` ou fallback séquentiel borné ; test du flux vision conservé. `FIXED_PENDING_SCAN`. |
| `AaE3K8HLzHjHEPBoeQ9Z` | S2245 — `apps/web/src/lib/photo-upload.ts:64` | Risque plausible de collision dans un chemin de stockage client. | Remplacé par l'identifiant crypto/fallback borné ; bucket, action et extension sont conservés. `FIXED_PENDING_SCAN`. |
| `AaE3K8NHzHjHEPBoeQ97` | S5332 — `apps/web/src/components/chat/hooks/use-chat-data.ts:183` | Faux positif technique sur une base de parsing locale ; aucune connexion n'est faite vers `chat.local`. | Base de parsing passée à `https://chat.local`. `FIXED_PENDING_SCAN`. |
| `AaE3K8NHzHjHEPBoeQ98` | S5332 — `apps/web/src/components/chat/hooks/use-chat-data.ts:487` | Même usage de parsing local, sans réseau. | Base de parsing passée à `https://chat.local`. `FIXED_PENDING_SCAN`. |
| `AaE3K8M0zHjHEPBoeQ95` | S5332 — `apps/web/src/components/chat/hooks/use-chat-search.ts:100` | Même usage de parsing local, sans réseau. | Base de parsing passée à `https://chat.local`. `FIXED_PENDING_SCAN`. |
| `AaE3K79MzHjHEPBoeQ8e` | S5332 — `apps/web/src/lib/actions/exports/gpx-serializer.ts:44` | Faux positif prouvé par le contrat GPX 1.1 : l'URI `http://www.topografix.com/GPX/1/1` est un namespace XML normatif, pas une destination réseau. | Namespace conservé ; ne pas le réécrire en HTTPS. `FALSE_POSITIVE_PROVEN`. |

## Preuves du lot

- Les tests scripts ciblés passent : `18/18`, dont les expressions dynamiques,
  les racines de staging, la sortie de rapport et l'injection CR/LF/NUL.
- Les tests Web ciblés passent : `18/18` après la conservation des formats
  d'identifiants sécurisés.
- Les tests mobile ciblés passent : `16/16`.
- Les typechecks Web et mobile et le lint Web ciblé passent.
- L'exécution complète du générateur de design est `BLOCKED` par une dérive
  préexistante hors S1523 : `globals.css` ne contient plus le sélecteur `:root`
  attendu par `extractCssVars`. Le parsing des sources réelles et le rejet des
  syntaxes exécutables sont toutefois testés directement.
- Aucun nouveau scan SonarCloud n'a été exécuté ; les corrections restent donc
  `FIXED_PENDING_SCAN`.
