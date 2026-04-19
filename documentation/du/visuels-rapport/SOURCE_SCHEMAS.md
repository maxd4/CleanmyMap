# Source des Schémas Techniques (pour Mermaid Live)

Ce document regroupe les codes sources de tous les schémas majeurs de votre projet. 
**Méthode :** Copiez le bloc de code (entre les ` ```mermaid `), collez-le sur [Mermaid.live](https://mermaid.live/), et choisissez le thème **"Neutral"** pour un rendu professionnel sobre.

---

## 1. VISION GLOBALE (Les "Incontournables")

### A. Écosystème CleanMyMap (Infrastructure)
*Utile pour : Montrer la solidité technologique et le choix des partenaires (Cloud).*
```mermaid
flowchart TD
    subgraph Services_Externes["Services Cloud"]
        CLERK[Clerk Auth]
        SB[(Supabase DB)]
    end

    subgraph App_Core["CleanMyMap Monorepo"]
        ROOT[Configuration Racine]
        WEB[Application Web]
    end

    USER[Utilisateurs] <--> WEB
    WEB <--> CLERK
    WEB <--> SB
```

### B. Parcours Utilisateur (UX)
*Utile pour : Expliquer comment chaque rôle (Bénévole, Élu, Admin) utilise le site.*
```mermaid
flowchart TD
  A[Utilisateur arrive] --> B{Type de profil}
  B -- Benevole --> C[Complete profil + localisation]
  C --> D[Reco locale + itineraire IA]
  D --> E[Declaration action]
  E --> F[Classement + impact personnel]
  B -- Association/Entreprise --> G[Publie besoins/contributions]
  G --> H[Coordonne actions collectives]
  B -- Elu/Coordinateur --> I[Lit besoins/resultats]
  I --> J[Arbitre et pilote]
  B -- Admin --> K[Modere + qualifie donnees]
```

---

## 2. DONNÉES ET IMPACT

### A. Cycle de Traitement des Données (Ingestion)
*Utile pour : Prouver la fiabilité des chiffres d'impact présentés.*
```mermaid
flowchart LR
    G_SHEETS[Google Sheets] --> UNIFIED[Logiciel de Normalisation]
    DB_PROPER[(Base de Données)] --> UNIFIED
    FORM[Formulaires] --> UNIFIED
    
    UNIFIED --> API[Filtrage des Données]
    API --> UI[Dashboard / Carte]
```

### B. Normalisation des Entités
*Utile pour : Montrer la rigueur de structure.*
```mermaid
flowchart LR
  IMPORT[Import source] --> ACTION[Action normalisee]
  IMPORT --> SPOT[Spot normalise]
  IMPORT --> EVENT[Evenement communautaire]
  ACTION --> REPORT[Rapports / classements]
  SPOT --> REPORT
  EVENT --> REPORT
```

---

## 3. SÉCURITÉ ET PROTECTION (RGPD)

### A. La Cascade de Sécurité (Protection des accès)
*Utile pour : Démontrer la protection de la vie privée.*
```mermaid
flowchart TD
    REQ[Requête HTTP] --> MW[Middleware / Proxy]
    MW -->|AuthN| CLERK_VAL{Session Valide ?}
    CLERK_VAL -- Oui --> AUTHZ[Vérification du Rôle]
    AUTHZ -->|Autorisé| PROTECTED[Accès aux Données]
    PROTECTED --> EXEC[Exécution]
    
    CLERK_VAL -- Non --> REDIRECT[Accès Refusé]
```

### B. Arbre de Décision API
*Utile pour : Illustrer la gestion des erreurs et des droits.*
```mermaid
flowchart TD
  A[Requete API entrante] --> B{Session/AuthN valide ?}
  B -- Non --> B1[401 Unauthorized]
  B -- Oui --> C{Endpoint sensible ?}
  C -- Oui --> D{Role autorise ?}
  C -- Non --> E[Contrôle validité données]
  D -- Non --> D1[403 Forbidden]
  D -- Oui --> E
  E --> F{Données valides ?}
  F -- Non --> F1[400 Bad Request]
  F -- Oui --> G[Exécution et Journalisation]
```

---

## 4. CONCEPTION RESPONSIVE

### Adaptation Mobile First
*Utile pour : Montrer que le site est pensé pour le terrain (mobile).*
```mermaid
flowchart LR
  M[Mobile<br/>Priorités : Agir] --> T[Tablette<br/>Priorités : Consulter]
  T --> D[Desktop<br/>Priorités : Piloter]
  M --> R1[Règle : CTA Pleine-largeur]
  T --> R2[Règle : Double colonne]
  D --> R3[Règle : Analyses détaillées]
```
