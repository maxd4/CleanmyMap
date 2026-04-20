# Schema rubrique - [NOM_RUBRIQUE]

## Objectif
- [But principal de la rubrique]

## Parcours
```mermaid
flowchart TD
  A[Entree utilisateur] --> B[Interaction principale]
  B --> C[Donnee collecte/affichee]
  C --> D[Impact/Sortie]
```

Fallback statique:
```md
![Schema rubrique fallback](../archive/fallback-schema-rubrique.png)
```

## Sequence API
```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant UI as Rubrique UI
  participant API as Endpoint metier
  U->>UI: Action utilisateur
  UI->>API: Requete
  API-->>UI: Reponse
  UI-->>U: Feedback visible
```

Fallback statique:
```md
![Sequence rubrique fallback](../archive/fallback-sequence-rubrique.png)
```

## Points d'attention
- [Risque 1]
- [Risque 2]
- [Contrat de donnees critique]
