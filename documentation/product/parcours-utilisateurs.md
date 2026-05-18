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
- Contribue au signalement, a l'execution terrain et a la continuite des actions.

## Association / commercant / entreprise
- Se reference -> publie ses besoins/contributions -> coordonne actions collectives.
- Anime la mobilisation, coordonne localement et suit les besoins du terrain.

## Elu / coordinateur
- Consulte besoins/resultats -> arbitre -> pilote les actions locales.
- Utilise les resultats pour prioriser, arbitrer et soutenir les actions utiles.

## Admin
- Modere, qualifie les donnees et maintient la gouvernance.
- Assume la supervision, la qualite des donnees et la coherence des livrables.

## Publics concernes

- Benevoles et citoyens contributeurs
- Coordinateurs associatifs
- Decideurs locaux et collectivites
- Acteurs de supervision et moderation
- Publics secondaires : partenaires, scolaires, structures de sensibilisation

## Acteurs impliques et responsabilites

- **Citoyens** : signalement, participation, execution terrain
- **Associations** : animation, coordination, suivi local
- **Collectivites** : arbitrage, priorisation, soutien institutionnel
- **Equipe projet / admin** : qualite des donnees, moderation, consolidation des livrables
