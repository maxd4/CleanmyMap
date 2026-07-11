# Gouvernance des données et contrats

Ce document définit les sources de vérité, les contrats métier et les règles d'accès aux données CleanMyMap.

## Sources de vérité

Il faut distinguer trois niveaux.

### Schéma versionné

Les migrations Supabase versionnées décrivent le schéma attendu.

Le workspace CLI actif est actuellement :

```txt
apps/web/supabase/
```

Un second arbre historique existe sous :

```txt
supabase/migrations/
```

Voir `adr/ADR-006-supabase-migrations-source-of-truth.md` avant toute suppression ou migration d'arborescence.

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
| Spot | `public.spots` | contrats spots |
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
architecture/adr/ADR-004-companion-identity.md
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
