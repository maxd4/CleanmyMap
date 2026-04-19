# Mapping colonnes

## Schema tabulaire de mapping
| Colonne source | Transformation | Champ produit |
|---|---|---|
| `action_date` | date ISO | `action_date` |
| `location_label` | trim + required | `location_label` |
| `latitude` + `longitude` | parse float + bornes | `geo.latitude` / `geo.longitude` |
| `association_name` | normalisation catalogue | `association_name` |
| `enterprise_name` | prefix `Entreprise -` | `enterprise_name` |
| `status` | mapping enum | `status` |
| `notes` | conserve + traces systeme | `notes` |

## Flowchart mapping source -> champ produit
```mermaid
flowchart TD
  A[Lecture colonne source] --> B{Colonne connue ?}
  B -- Non --> B1[Journaliser colonne ignoree]
  B -- Oui --> C[Appliquer transformation]
  C --> D{Valeur valide ?}
  D -- Non --> D1[Marquer anomalie + fallback]
  D -- Oui --> E[Ecrire champ produit]
  E --> F[Payload normalise]
```
Fallback statique:
```md
![Mapping colonnes fallback](../archive/fallback-data-mapping-colonnes.png)
```

## Import admin (Google Sheet)
Voir le mapping de reference dans [pipeline-import.md](./pipeline-import.md).

## Regles de mapping
- Colonnes source explicites
- Valeurs nulles tracees
- Transformations documentees (normalisation status, association, entreprise)
