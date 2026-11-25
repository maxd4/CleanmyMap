# Candidats de stabilisation des visualiseurs et du suivi institutionnel

**Statut : CANDIDATE / PLAN.** Pré-intégration temporaire, aucun changement runtime appliqué par cette publication. Les sources CURRENT restent les owners existants. Référence factuelle : `de58c6f5f2d99bf589c34a5e92e111ccf1ba54c3` ; ne pas imposer de checkout historique.

## Fichiers

- [01-visualiseur-3d.patch](01-visualiseur-3d.patch) : sélection et survol sous filtres, sens des relations HTML et régressions.
- [02-arborescence-2d.patch](02-arborescence-2d.patch) : sélection des ancêtres sans effacer les filtres, expansion temporaire pendant la recherche et régressions.
- [03-pagination-institutionnelle.patch](03-pagination-institutionnelle.patch) : pagination par curseur `created_at DESC, id ASC`, maximum 2000 faits, sentinelle, cas limites et absence de décalage lié aux écritures devant le curseur. Ce n'est pas un snapshot transactionnel.
- [04-contraintes-candidate.sql](04-contraintes-candidate.sql) : contraintes métier, format de clé et index de pagination. Ce fichier n'est pas une migration applicable telle quelle.

## Intégration et validations

Intégrer depuis le checkout courant, vérifier les collisions et utiliser `git apply --check` avant application des patches. Si le contenu actuel a changé, adapter seulement les modifications nécessaires aux owners. Les trois patches sont indépendants. Préserver les changements étrangers. Vérifier les références, libellés et scénarios de régression au runtime. Ne pas recopier de fichiers entiers issus d'un checkout historique.

Le SQL est un candidat à adapter dans une migration forward-only nommée par la CLI. Les migrations de suivi et d'idempotence ont été observées dans l'historique distant le 25 novembre 2026 ; revérifier les données et la compatibilité avant toute application. Ne jamais supprimer des faits historiques pour faire passer les contraintes. Préserver RLS, grants et audit.

## Preuves et limites

- Inspection des sources et des tests existants ; reconstruction textuelle de chaque patch contrôlée sur le SHA de référence avant publication du candidat.
- Lors de la préparation précédente, le harness isolé de pagination a réussi dix scénarios simulés, dont une mutation devant le curseur. Ce résultat ne constitue ni une preuve PostgreSQL ni une validation du workspace.
- Vitest, TypeScript, ESLint et Playwright : NOT_RUN sur ce candidat ; couverture NOT_MEASURED ; DB_SEMANTICS_NOT_EXECUTED ; HOOK_NOT_AVAILABLE. Aucune mutation distante.
- Restent à traiter : consultation des relations historiques, cycle de vie WebGL, focus et clavier, références croisées, normalisation des dates et idempotence, validation navigateur et PostgreSQL, réception finale.
- Le contrat documentaire 3D initial a déjà été corrigé dans le commit de58c6f. Mettre à jour seulement les nouveaux contrats CURRENT lors de leur intégration.
- La CI de de58c6f a échoué sur des fichiers préexistants de la spécification paris-cleanwalk-contacts, sans lien avec ce candidat. Ne pas affaiblir les contrôles.

Après intégration et validation, retirer ce dossier temporaire dans le lot de réception, sans dupliquer les contrats spécialisés.
