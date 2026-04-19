# Runbook incidents (auth/admin/export) - decision-first

## Arbre de diagnostic global
```mermaid
flowchart TD
  A[Incident detecte] --> B{Surface touchee ?}
  B -- Auth/session --> C[Branche Auth]
  B -- Admin/moderation --> D[Branche Admin]
  B -- Export/reports --> E[Branche Export]
  C --> Z[Actions correctives + verification]
  D --> Z
  E --> Z
```
Fallback statique:
```md
![Incident global fallback](../archive/fallback-incident-global-tree.png)
```

## Branche Auth (login loop, OAuth, deconnexion)
```mermaid
flowchart TD
  A[Symptome auth] --> B{api/health et api/uptime OK ?}
  B -- Non --> B1[Traiter incident plateforme d'abord]
  B -- Oui --> C{Cles Clerk live coherentes ?}
  C -- Non --> C1[Corriger NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY]
  C -- Oui --> D{Redirects Clerk/OAuth valides ?}
  D -- Non --> D1[Corriger domaines + callback OAuth]
  D -- Oui --> E[Retester en session privee]
```
Fallback statique:
```md
![Incident auth fallback](../archive/fallback-incident-auth-tree.png)
```

## Branche Admin (acces /admin ou moderation)
```mermaid
flowchart TD
  A[Symptome admin] --> B{Role admin present ?}
  B -- Non --> B1[Appliquer role metadata ou CLERK_ADMIN_USER_IDS]
  B -- Oui --> C{Route /api/admin/* retourne JSON ?}
  C -- Non --> C1[Verifier middleware/proxy protection]
  C -- Oui --> D[Retester action moderation]
```
Fallback statique:
```md
![Incident admin fallback](../archive/fallback-incident-admin-tree.png)
```

## Branche Export (CSV/JSON)
```mermaid
flowchart TD
  A[Symptome export] --> B{Utilisateur admin ?}
  B -- Non --> B1[Corriger contexte role]
  B -- Oui --> C{Endpoints export repondent ?}
  C -- Non --> C1[Verifier contrat API / schema recent]
  C -- Oui --> D{Donnees upstream presentes ?}
  D -- Non --> D1[Verifier /api/actions et /api/actions/map]
  D -- Oui --> E[Verifier UI export]
```
Fallback statique:
```md
![Incident export fallback](../archive/fallback-incident-export-tree.png)
```

## Checklist visuelle de reprise
```mermaid
flowchart LR
  C1[1. Qualifier incident] --> C2[2. Appliquer branche cible]
  C2 --> C3[3. Corriger cause racine]
  C3 --> C4[4. Retester parcours critique]
  C4 --> C5[5. Verifier uptime]
  C5 --> C6[6. Logger post-mortem]
```
Fallback statique:
```md
![Incident checklist fallback](../archive/fallback-incident-checklist.png)
```

## Sequence de remediation (incident -> retour stable)
```mermaid
sequenceDiagram
  participant Alert as Alerte/Signalement
  participant Ops as Operateur
  participant API as API/Services
  participant DB as Donnees
  participant User as Utilisateur
  Alert->>Ops: Incident detecte
  Ops->>Ops: Qualifier surface (auth/admin/export)
  Ops->>API: Lancer diagnostic cible
  API-->>Ops: Cause probable + erreurs
  Ops->>DB: Verifier coherence donnees si necessaire
  DB-->>Ops: Etat confirme
  Ops->>API: Appliquer correctif cible
  API-->>Ops: Service retabli
  Ops->>User: Retester parcours critique
  User-->>Ops: Validation fonctionnelle
  Ops->>Ops: Clore incident + post-mortem
```
Fallback statique:
```md
![Incident remediation sequence fallback](../archive/fallback-incident-remediation-sequence.png)
```

## Commandes minimales post-correctif
```bash
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm run checks:changed:quick
```
