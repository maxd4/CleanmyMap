# Standards visuels

## Objectif
Standardiser les visuels de documentation pour accelerer la comprehension et limiter les ambiguïtes.

## Formats obligatoires
1. `flowchart`
2. `sequence`
3. `architecture`
4. `decision tree`

## Regles communes
- Titre obligatoire.
- Noms de noeuds/metiers explicites.
- Un fallback image statique obligatoire.
- Version editable conservee (Mermaid ou fichier `.mmd`).

## Exemples minimaux copiables

### 1) Flowchart (Mermaid)
```mermaid
flowchart TD
  A[Declaration action] --> B{Donnees valides ?}
  B -- Oui --> C[Enregistrement]
  B -- Non --> D[Feedback correction]
```
Fallback statique:
```md
![Flow fallback - declaration](../archive/fallback-flow-declaration.png)
```

### 2) Sequence (Mermaid)
```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant W as Web App
  participant API as API Actions
  U->>W: Soumet formulaire
  W->>API: POST /api/actions
  API-->>W: id + retentionLoop
  W-->>U: Confirmation + prochaine action
```
Fallback statique:
```md
![Sequence fallback - soumission](../archive/fallback-sequence-soumission.png)
```

### 3) Architecture (Mermaid)
```mermaid
flowchart LR
  UI[Next.js UI] --> API[Routes API]
  API --> DB[(Supabase)]
  API --> AUTH[Clerk]
```
Fallback statique:
```md
![Architecture fallback - runtime](../archive/fallback-architecture-runtime.png)
```

### 4) Decision tree (Mermaid)
```mermaid
flowchart TD
  A[Besoin de documentation] --> B{Processus complexe ?}
  B -- Oui --> C[Ajouter visuel]
  B -- Non --> D[Texte court]
  C --> E{Decision critique ?}
  E -- Oui --> F[Decision tree]
  E -- Non --> G[Flowchart/Sequence]
```
Fallback statique:
```md
![Decision tree fallback - doc](../archive/fallback-decision-doc.png)
```
