# Candidats de stabilisation des visualiseurs et du suivi institutionnel

**Statut : CANDIDATE / PLAN.** Pré-intégration temporaire, aucun changement runtime appliqué par cette publication. Les sources CURRENT restent les owners existants. Référence factuelle : `de58c6f5f2d99bf589c34a5e92e111ccf1ba54c3` ; ne pas imposer de checkout historique.

## Fichiers

- [01-visualiseur-3d.patch](01-visualiseur-3d.patch) : sélection et survol sous filtres, sens des relations HTML et régressions.
- [02-arborescence-2d.patch](02-arborescence-2d.patch) : sélection des ancêtres sans effacer les filtres, expansion temporaire pendant la recherche et régressions.
- [03-pagination-institutionnelle.patch](03-pagination-institutionnelle.patch) : pagination par curseur `created_at DESC, id ASC`, maximum 2000 faits, sentinelle, cas limites et absence de décalage lié aux écritures devant le curseur. Ce n'est pas un snapshot transactionnel.
- [04-contraintes-candidate.sql](04-contraintes-candidate.sql) : contraintes métier, format de clé et index de pagination. Ce fichier n'est pas une migration applicable telle quelle.

- [05-reseau-3d-exploration.patch](05-reseau-3d-exploration.patch) : après 01 ; recherche, disposition stable, filtres resserrés, fiche, preuves des relations, cycle de vie WebGL, caméra, tests.
- [06-orientation-2d.patch](06-orientation-2d.patch) : après 02 ; arrondissement partagé, orientation avant exploration, arbre sans largeur minimale, conservation des filtres, tests.
- [07-navigation-croisee.patch](07-navigation-croisee.patch) : après 05 et 06 ; références explicites, résolution non ambiguë, navigation croisée, tests et titre commun.

- [08-finitions-et-contrats.patch](08-finitions-et-contrats.patch) : après 07 ; aperçu bref au survol et mises à jour candidates des deux contrats spécialisés et de la fiche de route. Ne rendre CURRENT ces changements qu'avec le runtime réellement intégré.

- `09-contexte-public-limites.patch` : modèle de preuves partagé, données Mégothon et mégots, composant réutilisable et tests. À intégrer après 07 et avec le patch de raccordement/enrichissement 10. Les références aux nouveaux acteurs sont candidates jusqu'à intégration du lot entier.

- `10-megothon-enrichissement.patch` : six acteurs, relations documentées et financement qualifié, chaîne de traitement 2D, raccordement du composant Limites et tests. À intégrer après 08 et 09, dans le même lot de code et de tests. Adapter les hunks 2D à l'état issu de 06/07 (contextes textuels stables, numéros de ligne indicatifs).

## Intégration et validations

Intégrer depuis le checkout courant, vérifier les collisions et utiliser `git apply --check` avant application des patches. Si le contenu actuel a changé, adapter seulement les modifications nécessaires aux owners. Ordre public : 01 puis 05 ; 02 puis 06 ; 07 après les deux chaînes ; 08 après 07. Le lot privé 03/04 peut avancer séparément. Code, tests et contrats documentaires doivent être intégrés ensemble. Le patch 08 contient les modifications des owners documentaires à adapter lors de cette intégration. Préserver les changements étrangers. Vérifier les références, libellés et scénarios de régression au runtime. Ne pas recopier de fichiers entiers issus d'un checkout historique.

Le SQL est un candidat à adapter dans une migration forward-only nommée par la CLI. Les migrations de suivi et d'idempotence ont été observées dans l'historique distant le 25 novembre 2026 ; revérifier les données et la compatibilité avant toute application. Ne jamais supprimer des faits historiques pour faire passer les contraintes. Préserver RLS, grants et audit.

## Preuves et limites

- Inspection des sources et des tests existants ; reconstruction textuelle de chaque patch contrôlée sur le SHA de référence avant publication du candidat.
- Lors de la préparation précédente, le harness isolé de pagination a réussi dix scénarios simulés, dont une mutation devant le curseur. Ce résultat ne constitue ni une preuve PostgreSQL ni une validation du workspace.
- Vitest, TypeScript, ESLint et Playwright : NOT_RUN sur ce candidat ; couverture NOT_MEASURED ; DB_SEMANTICS_NOT_EXECUTED ; HOOK_NOT_AVAILABLE. Aucune mutation distante.
- Restent à traiter : intégrer et adapter les candidats publics, valider les libellés FR/EN, les sources et références croisées, compléter la navigation clavier du sélecteur territorial et la restitution du focus, vérifier les étiquettes 3D, modes d'affichage, repli et perte WebGL réelle. La normalisation des dates, l'idempotence et les preuves PostgreSQL relèvent du lot privé 03/04.
- La vision produit est portée par [Ambition territoriale de Paris](../../product/ambition-territoriale-paris.md), section Intelligence territoriale. Ne pas ajouter les extensions futures par anticipation. Les candidats n'ajoutent aucun nouveau registre, droit ni migration publique.
- Le contrat documentaire 3D initial a déjà été corrigé dans le commit de58c6f. Mettre à jour seulement les nouveaux contrats CURRENT lors de leur intégration.
- La CI de de58c6f a échoué sur des fichiers préexistants de la spécification paris-cleanwalk-contacts, sans lien avec ce candidat. Ne pas affaiblir les contrôles.

Après intégration et validation, retirer ce dossier temporaire dans le lot de réception, sans dupliquer les contrats spécialisés.
