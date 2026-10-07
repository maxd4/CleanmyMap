# Supabase — optimisation des tables et requêtes

## Objet

Ce document est la source `CURRENT` pour optimiser une table ou une requête
Supabase sans casser le métier, l'UX, la sécurité ni la traçabilité.

Il consolide les règles de requête, de quota et d'optimisation auparavant
dispersées dans plusieurs guides de développement.

Le choix de l'emplacement d'une donnée reste défini dans
[`../architecture/data-governance.md`](../architecture/data-governance.md).
Les audits ponctuels ne remplacent pas ce contrat.

## Invariants

Une optimisation ne doit jamais :

- affaiblir RLS ;
- introduire `service_role` sur un chemin qui n'en a pas besoin ;
- supprimer une donnée métier utile uniquement pour réduire un warning ;
- déplacer un filtre métier de la base vers React ou Node ;
- transformer un cache en source de vérité ;
- remplacer un contrat explicite par un cast ou un fallback arbitraire.

Une table centrale peut rester visible comme coûteuse si son usage est
légitime, borné et correctement indexé.

## 1. Qualifier la table

Avant toute modification, déterminer son rôle :

```txt
centrale
support
administrative
dérivée / agrégée
archive
recherche
```

Puis inventorier les chemins qui :

- lisent ;
- écrivent ;
- comptent ;
- recherchent ;
- exportent ;
- agrègent ;
- chargent automatiquement la table ;
- utilisent un accès privilégié.

Le problème à résoudre est le coût réel d'un chemin, pas la présence du nom de
la table dans un audit.

## 2. Ordre d'optimisation

Appliquer cet ordre avant de revoir le modèle :

1. sélectionner uniquement les colonnes nécessaires ;
2. borner la cardinalité avec filtre, `limit`, `range`, curseur, période,
   utilisateur, scope ou bbox ;
3. déplacer le filtre dans PostgreSQL ;
4. ajouter ou corriger l'index adapté ;
5. utiliser une RPC ou une vue stable si la logique est partagée ou coûteuse ;
6. utiliser un agrégat persistant ou un snapshot lorsque la fraîcheur immédiate
   n'est pas nécessaire ;
7. revoir le schéma seulement si le besoin métier le justifie réellement.

## 3. Anti-patterns

À éviter :

```ts
supabase.from("table").select("*")
```

sur un chemin runtime susceptible de croître sans borne.

À éviter également :

```ts
const rows = await supabase.from("table").select("...");
return rows.filter(...);
```

lorsque PostgreSQL peut appliquer le filtre lui-même.

Autres signaux :

- recherche partielle sans index adapté ;
- même scan répété par plusieurs écrans ;
- lecture complète pour un compteur ;
- pagination cosmétique après chargement d'un gros jeu de données ;
- requêtes au montage sans besoin de fraîcheur ;
- export qui reconstruit un dataset déjà agrégé ailleurs.

## 4. Projection et bornes

Toute requête runtime croissante doit rendre visibles ses limites.

Exemples de bornes valides :

- `eq` sur propriétaire ou ressource ;
- `in` sur un ensemble borné ;
- période ;
- statut ;
- territoire ;
- bbox ;
- `limit` ;
- `range` ;
- curseur ;
- RPC d'agrégation ;
- `head: true` pour un comptage adapté.

Une borne doit correspondre au contrat produit. Ne pas ajouter arbitrairement
un `limit` qui tronque silencieusement le résultat attendu.

## 5. Index

Créer un index lorsque le chemin runtime le justifie, notamment pour :

- filtres fréquents ;
- tris fréquents sur un ensemble croissant ;
- relations propriétaire/ressource ;
- recherche partielle ;
- expression JSONB normalisée utilisée comme filtre.

Choisir l'index pour le prédicat réellement exécuté.

Un index inutile augmente aussi les coûts d'écriture et de maintenance ; ne pas
indexer chaque colonne par réflexe.

### Advisors Performance — état CURRENT du 8 octobre 2026

L'audit Performance linked observé le `2026-10-08`, avant application de la
migration append-only `20261003000010_optimize_action_geometry_contributions_rls.sql`,
rapporte :

```text
PERFORMANCE_ERROR: 0
PERFORMANCE_WARN: 1
UNUSED_INDEX_INFO: 82
RECENT_FK_PROTECTION: 6
EXPLICIT_PENDING_WORKLOAD: 3
DEFER_NO_CURRENT_WORKLOAD_PROOF: 1
OTHER_NEEDS_WORKLOAD_EVIDENCE: 73
IMMEDIATE_INDEX_REMOVAL: 0
```

Le seul WARN est `auth_rls_initplan` sur la policy
`action_geometry_contributions_service_only`. La migration candidate remplace
`auth.role()` par `(select auth.role())` sans changer la frontière service-only ;
le finding reste donc visible sur l'environnement distant tant que cette
migration n'a pas été appliquée.

Le finding `unindexed_foreign_keys` concerne
`action_geometry_contributions_mission_id_fkey`. La table distante est vide,
aucun workload CURRENT ne lit, écrit ou supprime par `mission_id`, et le champ
reste une provenance nullable avec `ON DELETE SET NULL`. La décision canonique
est donc `DEFER_NO_CURRENT_WORKLOAD_PROOF` : aucun index n'est ajouté ; la
décision devra être réévaluée si le workload apparaît. Les six index
correctifs peuvent cependant apparaître temporairement comme
`unused_index` :

- `idx_action_share_contact_requests_action_id` ;
- `idx_app_messages_feedback_reply_feedback_id` ;
- `idx_badge_events_user_id` ;
- `idx_chat_dm_read_states_peer_id` ;
- `idx_missions_created_by` ;
- `idx_missions_volunteer_id`.

Trois index restent explicitement en attente d'une preuve de workload :
`idx_messages_dm`, `idx_user_points` et
`idx_progression_events_user_type`. Cette décision est portée par la
migration `20260927000003_remove_redundant_unused_indexes.sql` et son test.
Les quatre index redondants déjà prouvés ont été supprimés par cette migration.

Un finding isolé `unused_index`, et a fortiori un compteur de scans nul dans
un projet encore peu chargé, ne constitue pas une preuve de redondance et ne
justifie jamais un `DROP INDEX`. Une suppression future exige soit une preuve
statique de redondance, soit une observation de workload suffisamment
représentative. Le tooling de présentation
`apps/web/scripts/supabase-performance-advisors.mjs` conserve les findings
dynamiques dans `OTHER_NEEDS_WORKLOAD_EVIDENCE`, classe explicitement le FK
ci-dessus dans `DEFER_NO_CURRENT_WORKLOAD_PROOF`, expose un mode `--raw` et ne
déclenche aucune mutation.

La synthèse liée se lance explicitement depuis la racine du dépôt :

```bash
npm run backend:supabase:advisors:linked -w apps/web
npm run backend:supabase:advisors:linked -w apps/web -- --raw
```

Le premier mode affiche les compteurs et les catégories ; `--raw` restitue le
payload JSON original après validation. Aucun de ces modes n'utilise
`query_logs`.

## 6. RPC, vues et agrégats

Préférer une RPC ou une vue lorsque :

- plusieurs écrans réutilisent la même agrégation ;
- un calcul nécessite plusieurs tables ;
- le client n'a besoin que d'un résumé ;
- la logique doit rester cohérente entre web, export et reporting.

Préférer un agrégat persistant ou snapshot lorsque :

- le résultat est informatif ;
- une fraîcheur à la seconde n'est pas requise ;
- le recalcul live provoque plusieurs lectures coûteuses ;
- un mécanisme explicite de rafraîchissement existe.

Pattern :

```txt
lecture du snapshot / agrégat
→ fallback live uniquement si nécessaire
→ recalcul sur chemin d'écriture, cron ou opération explicite
```

## 7. Données et stockage

Ne pas créer une table uniquement parce qu'une fonctionnalité peut être
persistée.

Rappels :

- contenu pédagogique et documentation durable → Git ;
- préférence UI ou brouillon non critique → navigateur ;
- donnée métier partagée, persistante ou sécurisée → Supabase ;
- fichier réutilisable → Storage / fichier préparé ;
- donnée recalculable → cache ou agrégat selon le contrat.

La matrice canonique complète est dans
[`../architecture/data-governance.md`](../architecture/data-governance.md).

## 8. Tables centrales

La liste et les règles synthétiques des tables centrales sont maintenues dans
[`README.md`](./README.md).

Elles doivent être interrogées par un motif clair :

```txt
utilisateur
ressource
période
zone
statut
agrégat
```

Une table centrale n'autorise jamais un scan global par défaut.

## 9. Cas spécial : score de pollution relatif

Le score de pollution des actions dépend d'une référence dynamique, pas d'un
seuil fixe.

Contrat existant :

- la RPC canonique `action_pollution_score_references_v2` calcule les références
  à partir des actions éligibles ;
- cette RPC expose une ligne globale et les lignes départementales, avec des
  codes texte et des comptes de sources distincts par métrique ;
- un département ne disposant pas de ces données minimales est absent du
  dictionnaire départemental et reste indisponible dans ce scope ;
- `apps/web/src/lib/actions/pollution/pollution-score.ts` normalise chaque
  action contre cette référence ;
- `100 %` représente la plus grande action approuvée disponible pour l'axe
  concerné, rapportée au nombre de bénévoles ;
- la sévérité conserve la règle métier existante fondée sur le maximum des
  composantes utiles.

L'ancienne RPC `action_pollution_score_references()` n'a plus de consommateur
applicatif et est retirée par migration append-only. Les migrations historiques
qui la définissaient restent conservées comme historique Git, mais elle ne
constitue plus une source métier compatible ou concurrente.

Une optimisation de ce chemin doit préserver :

- la source de référence dynamique ;
- la normalisation relative ;
- la règle de sévérité ;
- les tests qui verrouillent ce comportement.

Ne pas remplacer ce calcul par une constante uniquement pour simplifier la
requête ou l'audit.

## 10. Sécurité

Pour tout changement de requête ou de schéma :

- préserver l'ownership et le scope ;
- tester les accès propriétaire / non-propriétaire pertinents ;
- préserver les rôles privilégiés et les refus attendus ;
- ne pas utiliser `service_role` comme substitut d'une RLS correcte ;
- versionner toute évolution de schéma avec la migration canonique.

Les règles AuthN/AuthZ vivent dans `documentation/security/`.

## 11. Validation

Après optimisation :

- vérifier que la surface lit réellement moins ou plus précisément ;
- vérifier que le résultat visible reste conforme ;
- ajouter ou adapter un test de la requête, RPC ou agrégat concerné ;
- exécuter les tests RLS si le contrat d'accès change ou est touché ;
- relancer l'audit Supabase pertinent ;
- vérifier qu'aucun scan équivalent n'a été recréé ailleurs.

Commandes et scripts exacts : utiliser ceux présents sur `main` au moment du
chantier plutôt qu'un inventaire documentaire figé.

## Critères de sortie

Une optimisation est terminée lorsque :

- le chemin est borné ;
- les colonnes sont proportionnées au besoin ;
- les filtres utiles sont exécutés au bon endroit ;
- les index correspondent aux prédicats réels ;
- les agrégats partagés ne sont pas recalculés inutilement ;
- la RLS et le métier sont préservés ;
- les tests pertinents passent.

## Références

- [`README.md`](./README.md)
- [`../architecture/data-governance.md`](../architecture/data-governance.md)
- [`supabase-quota-audit.md`](./supabase-quota-audit.md)
- [`../operations/audits/supabase-refresh-strategy-audit.md`](../operations/audits/supabase-refresh-strategy-audit.md)
- [`../security/authorization-capabilities.md`](../security/authorization-capabilities.md)
