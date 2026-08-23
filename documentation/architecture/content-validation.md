# Workflow de validation des contenus

Ce contrat couvre les contenus environnementaux et institutionnels publiés dans
CleanMyMap. Il est distinct du cycle de validation des actions (`pending`,
`approved`, `rejected`) décrit dans `data-governance.md`.

## Contrat obligatoire

Le type canonique est :

```txt
apps/web/src/lib/content/content-validation.ts
```

Chaque contenu possède :

- `status` : `draft`, `in_review`, `published` ou `rejected` ;
- `owner` : responsable éditorial ou institutionnel identifiable ;
- `source.name` et `source.url` ;
- `source.date`, `source.datePrecision` et `source.dateBasis` pour ne pas donner
  une fausse précision à une date connue seulement au mois ou à l’année ;
- `evidenceLevel` : `insufficient`, `limited`, `moderate` ou `strong` ;
- `lastReviewedAt` et `reviewedBy` ;
- `claims.fact`, `claims.estimate` et `claims.recommendation`.

Un claim porte son type, son texte localisé, ses pages source éventuelles et sa
limite d’interprétation. Un fait d’enquête ne doit donc pas être consommé comme
une observation terrain, une estimation ou une recommandation.

## Transitions humaines

```txt
draft -> in_review -> published
                   -> rejected -> draft
published -> in_review
```

Une publication est bloquée si le responsable, la source, la date, le niveau de
preuve, la revue ou la séparation des claims est incomplet. Les brouillons
peuvent rester incomplets, mais ne sont jamais considérés comme publiables.

## Sources intégrées dans `/learn/bonnes-pratiques`

| Contenu | Source | Date retenue | Preuve | Lecture autorisée |
|---|---|---:|---|---|
| Baromètre national | PDF IFOP × Gestes Propres | document, 2025-12-17 | strong | perceptions, croyances et pratiques déclarées |
| Dépôts sauvages | PDF IFOP × Gestes Propres | document, mai 2025 | strong | réponses d’enquête sur une étude menée en 2024 |
| Campagne « Ça va pas s’faire tout seul ! » | page Gestes Propres | campagne, 2025 | moderate | campagne diffusée en 2025 puis redéployée en 2026 |
| Éclairages Gestes Propres | articles source | date de publication indiquée | moderate | synthèses reformulées, recommandations séparées |

Les valeurs de sondage restent accompagnées de leur limite d’interprétation dans
les données et dans le rendu. Les visuels ou images partenaires restent soumis à
leur propre statut de permission ; ce statut n’est pas confondu avec la
validation éditoriale du texte.

## Contrôles

- `validateContentRecord` produit les anomalies structurées ;
- `assertPublishedContent` empêche l’usage d’un enregistrement publié mais
  incomplet dans un registre ou un import ;
- les tests du contrat couvrent les champs obligatoires, la séparation des
  claims et la machine à états ;
- les tests de la page couvrent le baromètre, l’étude IFOP et leurs liens PDF.

Avant une nouvelle source Gestes Propres ou une page « Apprendre », la fiche doit
être créée dans ce contrat, revue par le responsable identifié, puis seulement
passer à `published`.
