# Data pipeline import (visual-first)

## Diagramme global source -> normalisation -> stockage -> restitution
```mermaid
flowchart LR
  S1[Source Google Sheet CSV] --> N1[Extraction & parsing]
  N1 --> N2[Normalisation metier]
  N2 --> N3[Validation qualite]
  N3 --> ST1[Stockage Supabase actions/spots]
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
| Stockage Supabase | Payload valide + env Supabase | Lignes `public.actions` et `public.spots` | `SUPABASE_SERVICE_ROLE_KEY` absente, echec insertion, conflit idempotence |
| Restitution API | Donnees stockees | `/api/actions`, `/api/actions/map`, exports reports | Contrat data casse, mismatch champs, reponse partielle |

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
  Ops->>Import: data:sheet:sync-supabase
  Import->>DB: ecriture actions/spots
  DB-->>Import: statut insertion
  Import-->>Ops: resultat sync
  Ops->>API: verifier /api/actions et /api/actions/map
```
Fallback statique:
```md
![Pipeline sequence fallback](../archive/fallback-data-pipeline-sequence.png)
```

## Flowchart build -> import -> sync
```mermaid
flowchart TD
  A[Build import depuis Sheet] --> B{Payload JSON/CSV genere ?}
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
npm --prefix apps/web run data:sheet:sync-supabase
```

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
