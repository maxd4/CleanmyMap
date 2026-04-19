# Regles de nettoyage et cas limites

## Decision tree nettoyage / validation
```mermaid
flowchart TD
  A[Ligne importee] --> B{Date + geoloc valides ?}
  B -- Non --> B1[Journaliser anomalie critique]
  B1 --> B2{Correction possible ?}
  B2 -- Oui --> C[Corriger et revalider]
  B2 -- Non --> X[Exclure de l'import + trace]
  B -- Oui --> D{Doublon detecte ?}
  D -- Oui --> D1[Fusion/ignore selon regle idempotence]
  D -- Non --> E{Statut reconnu ?}
  E -- Non --> E1[Mapper vers statut par defaut + trace]
  E -- Oui --> F[Accepter dans payload]
  C --> F
  D1 --> F
```
Fallback statique:
```md
![Regles nettoyage fallback](../archive/fallback-data-cleaning-decision.png)
```

## Nettoyage
- Validation format date/coordonnees
- Filtrage des doublons source
- Standardisation des libelles organisation/zone

## Cas limites
- Donnees geoloc manquantes
- Actions rejetees/non qualifiees
- Lignes imports partielles

## Regle
- Ne jamais supprimer silencieusement: journaliser et rendre les exclusions auditable.
