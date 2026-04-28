# Master Architecture : CleanMyMap

Ce document constitue la source de vérité pour l'architecture globale du projet. Il lie les concepts métier aux implémentations techniques et à la structure physique du dépôt.

---

## 1. Vision Systémique Globale
Ce schéma montre comment les services externes interagissent avec l'application cœur.

```mermaid
flowchart TD
    subgraph Services_Externes["Cloud & Managed Services"]
        CLERK[Clerk Auth]
        SB[(Supabase DB)]
        VERCEL[Vercel Edge]
    end

    subgraph App_Core["CleanMyMap Monorepo"]
        ROOT[Root Config / Workflows]
        WEB[apps/web : Next.js App]
        INGEST[Scripts d'Ingestion]
    end

    USER[Utilisateur / Elu / Admin] <--> VERCEL
    VERCEL <--> WEB
    WEB <--> CLERK
    WEB <--> SB
    INGEST --> SB
```

---

## 2. Structure du Monorépo
Organisation physique des fichiers et dépendances.

```mermaid
flowchart LR
    ROOT[CleanMyMap-main /]
    ROOT --> APPS[apps/]
    ROOT --> DOCS[documentation/]
    ROOT --> LEGACY[legacy/ : Archives]

    APPS --> WEB[web/ : React & API]
    WEB --> SRC[src/]
    SRC --> LIB[lib/ : Logique métier]
    SRC --> COMPONENTS[components/ : UI]
    SRC --> APP_ROUTE[app/ : Pages & API Routes]
```

---

## 3. Flux de Données Unifié
Comment les actions passent de la source à l'écran.

```mermaid
flowchart LR
    G_SHEETS[Google Sheets] --> UNIFIED[unified-source.ts]
    DB_PROPER[(Supabase Actions)] --> UNIFIED
    FORM[Formulaires Directs] --> UNIFIED
    
    UNIFIED --> API[/api/actions/map]
    API --> UI[Dashboard / Carte]
```

---

## 4. Pile de Sécurité (Cascade)
Les couches de protection appliquées à chaque requête.

```mermaid
flowchart TD
    REQ[Requête HTTP] --> MW[Middleware / Proxy.ts]
    MW -->|AuthN| CLERK_VAL{Session Clerk ?}
    CLERK_VAL -- Oui --> AUTHZ[AuthZ : src/lib/authz.ts]
    AUTHZ -->|Role Check| PROTECTED[Protected Routes]
    PROTECTED --> EXEC[Exécution Métier]
    
    CLERK_VAL -- Non --> REDIRECT[Redirection Login]
```

---

## Liens vers les détails techniques
*   [Sécurité approfondie](./securite/authz-authn-regles.md)
*   [Normalisation des données](./data/schema-normalisation.md)
*   [Processus de déploiement](./exploitation/runbook-deploiement.md)
