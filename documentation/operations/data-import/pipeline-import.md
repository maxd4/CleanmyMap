# Data pipeline import (visual-first)

## Diagramme global source -> normalisation -> stockage -> restitution
```mermaid
flowchart LR
  S1[Source Google Sheet CSV historique] --> N1[Extraction & parsing]
  N1 --> N2[Normalisation metier]
  N2 --> N3[Validation qualité]
  N3 --> ST1[Stockage runtime : public.actions + public.trash_spotter_spots]
  ST1 --> R1[Restitution API actions/map/reports]
  N3 --> E1[Erreurs de schema/qualite]
  N1 --> E2[Erreurs d'acces Sheet/CSV]
  ST1 --> E3[Erreurs DB/env]
```
Fallback statique:
```md
![Pipeline import fallback](../archive/fallback-data-pipeline-import.png)
```

## Etapes avec entree/sortie/erreurs connues
| Etape | Entree | Sortie | Erreurs connues |
|---|---|---|---|
| Extraction & parsing | URL CSV Google Sheet, snapshots locaux | CSV brut local | Sheet non accessible, HTML au lieu de CSV, encodage invalide |
| Normalisation metier | CSV brut + mapping colonnes | Payload JSON admin + payload lieux propres | Colonnes manquantes, types invalides, association non reconnue |
| Validation qualite | Payload normalise | Payload validable importable | Geoloc manquante/incoherente, dates invalides, champs requis absents |
| Stockage Supabase | Payload valide + env Supabase | Lignes `public.actions` et `public.trash_spotter_spots` | `SUPABASE_SERVICE_ROLE_KEY` absente, échec insertion, conflit idempotence |
| Restitution API | Donnees stockees | `/api/actions`, RPC `actions_map_feed`, exports reports | Contrat data casse, mismatch champs, reponse partielle |

### Frontière des tables

- `public.actions` est la table canonique des actions.
- `public.trash_spotter_spots` est la cible unique de tout nouveau
  signalement `spot` ou `clean_place`.
- `public.spots` est une archive legacy read-only. Elle est hors du chemin
  d'import runtime : aucune nouvelle écriture, modération ou restitution
  runtime ne doit la cibler. Une lecture explicite reste réservée aux
  opérations de maintenance ou d'export historiques.

## Sequence d'execution recommandee
```mermaid
sequenceDiagram
  participant Ops as Operateur
  participant Build as Build script
  participant Import as Import API/script
  participant DB as Supabase
  participant API as API restitution
  Ops->>Build: data:sheet:build-import (--geocode optionnel)
  Build-->>Ops: payloads JSON + CSV
  Ops->>Import: flux retire
  Import->>DB: écriture public.actions
  Import->>DB: écriture public.trash_spotter_spots pour les nouveaux spot/clean_place
  DB-->>Import: statut insertion
  Import-->>Ops: resultat sync
  Ops->>API: verifier /api/actions et le RPC actions_map_feed
  Note over DB: public.spots reste une archive legacy read-only, hors de la séquence d'import runtime
```
Fallback statique:
```md
![Pipeline sequence fallback](../archive/fallback-data-pipeline-sequence.png)
```

## Flowchart build -> import -> sync
```mermaid
flowchart TD
  A[Build import depuis Sheet historique] --> B{Payload JSON/CSV genere ?}
  B -- Non --> B1[Corriger mapping/colonnes source]
  B -- Oui --> C[Import vers Supabase]
  C --> D{Insertions DB valides ?}
  D -- Non --> D1[Verifier env/droits/contrat]
  D -- Oui --> E[Sync et verification API map/reports]
  E --> F{Restitution cohérente ?}
  F -- Non --> F1[Corriger contrat et rejouer sync]
  F -- Oui --> G[Pipeline OK]
```
Fallback statique:
```md
![Pipeline build import sync fallback](../archive/fallback-data-pipeline-build-import-sync.png)
```

## Commandes
```bash
npm --prefix apps/web run data:sheet:build-import
npm --prefix apps/web run data:sheet:build-import -- --geocode
```

La synchronisation directe Google Sheet -> Supabase est retiree.

## Variables critiques
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLEANMYMAP_SHEET_URL` (si override source)

## Decision tree de depannage
```mermaid
flowchart TD
  A[Echec pipeline] --> B{Erreur extraction ?}
  B -- Oui --> B1[Verifier partage Sheet + URL CSV]
  B -- Non --> C{Erreur normalisation ?}
  C -- Oui --> C1[Verifier colonnes/template]
  C -- Non --> D{Erreur stockage ?}
  D -- Oui --> D1[Verifier env Supabase + droits]
  D -- Non --> E[Verifier contrat API restitution]
```
Fallback statique:
```md
![Pipeline troubleshooting fallback](../archive/fallback-data-pipeline-decision.png)
```
