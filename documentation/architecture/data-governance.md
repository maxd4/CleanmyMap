# Gouvernance des données et contrats

Ce document définit les sources de vérité, les contrats métier et les règles d'accès aux données CleanMyMap.

## Sources de vérité

Il faut distinguer trois niveaux.

### Schéma versionné

Les migrations Supabase versionnées décrivent le schéma attendu.

Le workspace CLI canonique est :

```txt
apps/web/supabase/
```

Il n'existe pas de second arbre éditable. Le garde-fou
`npm run audit:supabase-migration-trees` doit rester vert avant toute
modification de migration.

### Base distante

La base Supabase distante est l'état runtime effectif.

Elle ne doit jamais être modifiée durablement sans migration associée.

### Contrats TypeScript

Les types et contrats du code doivent refléter le schéma et les règles métier.

Exemples :

```txt
apps/web/src/lib/actions/types.ts
apps/web/src/lib/actions/data-contract.ts
apps/web/src/lib/domain-language.ts
```

## Entités principales

| Entité | Table principale | Contrat |
|---|---|---|
| Action | `public.actions` | `ActionStatus`, `ActionListItem` et contrats actions |
| Signalement `spot` / `clean_place` | `public.trash_spotter_spots` | `SignalementModerationSource`, contrats unifiés |
| Spot legacy | `public.spots` | archive historique en extinction, sans lecture/écriture runtime |
| Profil | `public.profiles` | modèle Profile |
| Mission GPS | `public.missions` | types de `companion-app/types/mission.ts` |
| Point GPS | `public.gps_points` | types mission/location |

## Cycle de vie des actions

Le contrat TypeScript courant est :

```txt
pending
approved
rejected
```

Ne pas utiliser `validated` comme statut canonique si le runtime attend `approved`.

- `pending` : saisie en attente de validation ;
- `approved` : donnée approuvée et éligible aux usages publics selon le flux concerné ;
- `rejected` : donnée refusée.

Toute évolution de statut doit traverser :

- schéma ou contraintes ;
- types ;
- routes API ;
- UI ;
- exports ;
- tests ;
- documentation.

### Signalements et modération

`public.trash_spotter_spots` est la source canonique runtime pour les nouveaux
signalements `spot` et `clean_place`. Les créations applicatives et la file de
modération passent par cette table et utilisent ses colonnes `spot_type`,
`validated_at` et `cleaned_at`.

`public.spots` est maintenant conservée comme archive historique
`service_role` read-only : aucune création, modération, carte, historique,
indicateur ou gamification ne la traite comme une source runtime équivalente,
et aucune RPC ni écriture runtime ne doit la cibler. Une commande de
maintenance ou de migration peut encore la lire explicitement avec
`service_role` pour une compatibilité offline bornée, sans que cette lecture
devienne une voie runtime. Son champ `waste_type` reste propre au chemin
legacy et n'est pas converti silencieusement en `spot_type`.

La migration
`apps/web/supabase/migrations/20260825000000_migrate_legacy_spots_to_trash_spotter.sql`
copie les lignes historiques vers `trash_spotter_spots` sans suppression,
conserve les champs utiles et écrit une correspondance idempotente dans
`public.legacy_spot_migrations`. Elle réutilise l'UUID legacy lorsqu'il est
libre et génère un nouvel UUID en cas de collision ; `legacy_waste_type` et
`legacy_notes` préservent la provenance.

La capacité `apps/web/src/lib/admin/signalement-moderation.ts` et les flux
unifiés utilisent désormais uniquement `trash_spotter_spots`. Les anciennes
clés d'événement XP (`spots` + `spot-id:*`) restent reconnues comme historique
dans la progression afin de ne pas réattribuer un XP après migration, sans
relire la table legacy.

La suppression physique de `public.spots` reste un lot ultérieur : elle exige
la preuve que la migration a été appliquée sur tous les environnements
historiques, que la correspondance de provenance est conservée et qu'aucun
outil d'import ou opération externe ne dépend encore de la table.

### Authentification des flux signalements/actions

Les handlers protégés de `/api/spots` et des écritures `/api/actions` utilisent
le helper central `requireAuthenticatedAccess`. En développement sur un hôte
localhost, l'identité de test peut être fournie par le bypass
`CMM_DEV_AUTH_BYPASS_*`, notamment pour les profils `benevole` et `max` déjà
prévus par les environnements locaux. Ce bypass reste limité au développement
et ne constitue jamais une identité HTTP de production ni un remplacement de
Clerk.

En production, Clerk reste obligatoire : une requête sans session conserve la
réponse `401`. `service_role` est réservé aux opérations serveur de maintenance
ou de nettoyage précisément bornées ; il ne doit jamais être utilisé comme
substitut d'une session utilisateur HTTP.

État de vérification au 25 août 2026 : les contrats d'authentification et les
tests offline des flux canonical passent. Le smoke production authentifié a
ensuite été exécuté avec une session Clerk temporaire : `POST /api/spots` a
retourné `201`, la ligne `spot`/`new` a été retrouvée dans
`trash_spotter_spots`, l'événement `spot_create_pending` est resté à `0` XP,
aucun `points_ledger`, `xp_audit` ou notification de validation n'a été créé,
et le signalement est apparu dans les flux spots, actions unifiés et carte.
Le marker `CMM_PROD_SMOKE_1787677027552` et l'ID de signalement
`47bcd82a-aed2-45b3-a2e2-2e26f5cb0ab1` ont ensuite été nettoyés avec leurs
artefacts de progression ; aucune ligne ne subsiste dans la source canonical,
la table legacy ou `progression_events`. La session Clerk temporaire a été
révoquée. Le replay persistant local reste non exécuté, Docker et le runtime
Supabase local n'étant pas disponibles.

### Maintenance et opérations

Les outils d'opérations suivent la même séparation :

- `export-supabase-archive.mjs` archive `trash_spotter_spots`,
  `legacy_spot_migrations` et `spots`, ce dernier étant explicitement marqué
  comme archive legacy dans le manifeste ;
- `backfill-derived-geometry.mjs` cible par défaut `actions` et
  `trash_spotter_spots` uniquement ; il ne modifie jamais `spots` ;
- `db-cleanup-suspect-runtime-records.mjs` peut auditer les lignes `spots` pour
  le rapport, mais ses suppressions sont limitées à `actions` et
  `trash_spotter_spots` ; aucune option d'application ne peut supprimer
  l'archive legacy ;
- `sync-validated-local-store.mjs` est une commande explicite de synchronisation
  locale : elle lit la source canonique avant le fallback legacy historique,
  n'est pas appelée par le runtime web et ne réécrit jamais `spots` ;
- les contrôles de coordonnées et les règles d'identité restent indépendants
  de `waste_type`, qui ne devient jamais un discriminant `spot_type`.

## Validation des entrées

Toute API modifiant une donnée métier doit valider l'entrée.

Utiliser les schémas existants, notamment Zod, plutôt que des contrôles dispersés.

Vérifier :

- type ;
- bornes ;
- taille ;
- unité ;
- coordonnées ;
- enum ;
- ownership ;
- rôle ;
- état courant.

## Géolocalisation

Ne pas supposer qu'une coordonnée partielle est valide.

Vérifier :

- latitude et longitude ensemble ;
- bornes géographiques ;
- précision éventuelle ;
- provenance ;
- format GeoJSON si utilisé ;
- cohérence avec le type de géométrie.

## Unités

Utiliser des unités explicites dans les noms et contrats :

```txt
waste_kg
duration_minutes
distance_m
accuracy_m
```

Ne pas convertir silencieusement une unité sans documenter le contrat.

## Ingestion multi-source

Le module :

```txt
apps/web/src/lib/actions/unified-source.ts
```

est un point central de normalisation des actions.

Toute ingestion externe, y compris l'import administrateur, doit appeler la
normalisation de ce module avant l'ecriture dans `actions`, puis utiliser le store
canonique. Les anomalies de date, de mesure et de geolocalisation sont exposees
par `apps/web/src/lib/actions/data-quality.ts` afin que dashboard, rapports et
exports partagent le meme diagnostic.

Ne pas créer un nouveau chemin d'ingestion concurrent sans vérifier :

- contrat canonique ;
- déduplication ;
- provenance ;
- statut ;
- géométrie ;
- qualité ;
- date de collecte ;
- droits d'écriture.

## RLS et autorisation

Principe :

- authentification ≠ autorisation ;
- une session valide ne donne pas accès à toutes les lignes ;
- `service_role` reste serveur ;
- une dérogation admin doit être explicite et auditée si sensible.

Tester au minimum :

- anonyme ;
- connecté propriétaire ;
- connecté non-propriétaire ;
- rôle privilégié ;
- service role lorsque réellement requis.

Les lignes `public.missions` et `public.gps_points` sont des données
propriétaires sensibles. La lecture web de `/missions/[id]` est autorisée au
propriétaire porté par `missions.volunteer_id` et aux profils `admin`/`max`,
après AuthN puis décision d'AuthZ côté serveur. Les profils `elu` et les autres
profils ordinaires ne sont pas autorisés par analogie avec les actions.

Pour le companion, la migration
`apps/web/supabase/migrations/20260826070000_clerk_missions_gps_rls.sql`
réalise le contrat Clerk Third-Party Auth : `missions` est lisible et
modifiable par `authenticated` uniquement lorsque `volunteer_id` correspond au
claim Clerk `sub` non vide. Les points `gps_points` sont lisibles et insérables
uniquement lorsque la mission référencée appartient au même `sub`. Aucun accès
ne découle de la seule connaissance d'un `mission_id`, et un token sans `sub`
est refusé.

Le grant UPDATE mobile est limité à `status`, `started_at` et `ended_at`.
`volunteer_id`, `created_by`, `distance_m` et `duration_s` restent hors de la
surface d'écriture `authenticated`. Le `service_role` conserve ses privilèges
serveur sans devenir une identité mobile.

`missions.created_by` est conservé comme provenance potentielle, pas comme
permission. Le `service_role` reste un moyen technique serveur uniquement ; il
ne remplace ni l'identité Clerk ni la décision d'ownership et ne doit jamais
être exposé au client. Les points GPS ne sont chargés qu'après une décision
d'accès positive et cette lecture ne passe pas par un cache partagé indexé par
mission.

Aucun partage public de mission ou de GPS n'est autorisé dans ce contrat. Toute
future surface publique devra reposer sur une vue sanitizée explicite et un
contrat distinct.

## Application compagnon

Le LOT 1 de l'ADR-004 a supprimé l'identité Supabase Auth anonyme et établi
Clerk comme identité canonique du companion. Le LOT 2A a aligné les RLS de
`missions` et `gps_points` sur le claim Clerk `sub` et a borné les grants
UPDATE mobiles.

Restent explicitement hors production :

- RLS et contrat de synchronisation de `mission_actions` ;
- appel client à `compute_mission_distance` et finalisation de distance ;
- renouvellement fiable du token Clerk lors d'un réveil background headless ;
- gel du companion jusqu'à la finalisation et à l'utilisation réelle de
  l'application web.

Voir :

```txt
documentation/architecture/adr/ADR-004-companion-identity.md
```

## Évolution d'un contrat

Pour toute modification structurante :

1. identifier la source canonique ;
2. créer une migration si la base change ;
3. mettre à jour types et validateurs ;
4. adapter les appels ;
5. ajouter des tests de régression ;
6. mettre à jour la documentation ;
7. exécuter les checks adaptés.

Validation complète :

```bash
npm run checks
```
