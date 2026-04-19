# Checklist push deploy

## Decision tree securite avant push
```mermaid
flowchart TD
  A[Demande de push/deploy] --> B{Typecheck OK ?}
  B -- Non --> B1[Corriger avant push]
  B -- Oui --> C{Lint OK ?}
  C -- Non --> C1[Corriger conventions]
  C -- Oui --> D{Tests cibles OK ?}
  D -- Non --> D1[Corriger regression]
  D -- Oui --> E{Secrets/env verifies ?}
  E -- Non --> E1[Corriger variables]
  E -- Oui --> F{Routes sensibles protegees ?}
  F -- Non --> F1[Bloquer deploy]
  F -- Oui --> G[Deploy + verif uptime]
```
Fallback statique:
```md
![Checklist securite fallback](../archive/fallback-checklist-push-deploy-decision-tree.png)
```

1. `npm -C apps/web run typecheck`
2. `npm -C apps/web run lint`
3. Lancer les tests cibles des zones modifiees
4. Verifier variables d'environnement critiques
5. Controler routes sensibles (`/admin`, auth, API metier)
6. Verifier `api/uptime` apres mise en production
