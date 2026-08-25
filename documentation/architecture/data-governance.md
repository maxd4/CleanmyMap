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

`public.spots` est maintenant conservée comme archive historique uniquement
pour le runtime applicatif : aucune création, modération, carte, historique,
indicateur ou gamification ne la traite comme une source runtime équivalente.
Une commande de maintenance ou de migration peut encore la lire explicitement
pour une compatibilité offline bornée, sans que cette lecture devienne une voie
runtime. Son champ `waste_type` reste propre au chemin legacy et n'est pas
converti silencieusement en `spot_type`.

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

## Application compagnon

L'app mobile ne doit pas introduire une deuxième identité canonique indépendante sans décision explicite.

Points à résoudre :

- mapping entre session mobile et profil Clerk ;
- ownership des missions ;
- RLS de `missions`, `gps_points`, `mission_actions` ;
- finalisation de distance ;
- stockage sécurisé des sessions.

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
