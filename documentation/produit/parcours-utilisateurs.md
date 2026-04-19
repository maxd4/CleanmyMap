# Parcours utilisateurs

## Vue flowchart (parcours terrain)
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
Fallback statique:
```md
![Parcours utilisateurs fallback](../archive/fallback-parcours-utilisateurs-flowchart.png)
```

## Benevole
- Rejoint la plateforme -> complete son profil -> reco locale -> agit -> suit son impact.

## Association / commercant / entreprise
- Se reference -> publie ses besoins/contributions -> coordonne actions collectives.

## Elu / coordinateur
- Consulte besoins/resultats -> arbitre -> pilote les actions locales.

## Admin
- Modere, qualifie les donnees et maintient la gouvernance.
