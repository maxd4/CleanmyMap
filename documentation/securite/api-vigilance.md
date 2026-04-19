# API vigilance

## Decision tree authz / input validation / journalisation
```mermaid
flowchart TD
  A[Requete API entrante] --> B{Session/AuthN valide ?}
  B -- Non --> B1[401 Unauthorized]
  B -- Oui --> C{Endpoint sensible ?}
  C -- Oui --> D{Role autorise (AuthZ) ?}
  C -- Non --> E[Continuer controle input]
  D -- Non --> D1[403 Forbidden]
  D -- Oui --> E
  E --> F{Payload valide (schema/borne/type) ?}
  F -- Non --> F1[400 Bad Request]
  F -- Oui --> G{Operation sensible ?}
  G -- Oui --> H[Journalisation obligatoire]
  G -- Non --> I[Execution metier]
  H --> I
  I --> J[Reponse API + metriques]
```
Fallback statique:
```md
![API vigilance decision tree fallback](../archive/fallback-api-vigilance-decision.png)
```

## Gardes minimales
- Validation d'entree stricte
- Controle de role avant operations sensibles
- Journalisation des operations admin

## Zones sensibles
- `/api/admin/*`
- endpoints d'import/export data
- endpoints de moderation et classement
