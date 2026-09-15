# Rapports d'impact - Liste des propositions à traiter

## Préconfiguration depuis une action validée — PLAN

Une action validée pourrait proposer « Générer un rapport d'impact » en ouvrant
le générateur canonique de `/reports` avec un périmètre préparé sur cette seule
action. Ce point d'entrée ne doit pas créer un second moteur de rapport.

Le contrat devra transmettre de manière typée l'identifiant canonique de
l'action, par exemple :

```txt
scope:
  type: single_action
  actionId: <id canonique>
```

Le backend devra résoudre l'identifiant, vérifier l'admissibilité de l'action
et sélectionner exactement son périmètre. La forme finale de l'URL, le schéma
SQL, les migrations, le design du bouton et le niveau de détail par défaut
restent à définir dans un lot ultérieur. Le même contrat pourra ensuite servir
à des entrées préremplies pour une campagne, une organisation, un événement,
un territoire ou un objectif mesurable.

## Versioning et reproductibilité des générations dérivées — PLAN

Un futur mécanisme devra conserver, pour chaque génération, un snapshot JSON
immuable et suffisamment complet pour reproduire le document sans relire ni
recalculer silencieusement les données runtime. Le contrat conceptuel devra
versionner séparément les données historiques, le template, les méthodologies,
les facteurs de calcul et le renderer, avec notamment `generationId`,
`generatedAt`, `templateVersion`, `detailLevel`, `snapshotSchemaVersion`,
`filtersVersion`, `provenance` et `sourceGenerationId` lorsque nécessaire.

La relecture historique devra utiliser le snapshot d'origine. Une régénération
avec un template plus récent devra créer une nouvelle génération liée à la
source, sans écraser l'historique ni inventer de données manquantes. Elle reste
distincte de l'action actuelle « Réexporter », qui réutilise le snapshot sans
créer de nouvelle ligne. La composition précise des niveaux `Concis`,
`Par défaut` et `Exhaustif`, ainsi que les générations dérivées, seront traitées
dans un chantier séparé.

## Règle de traitement

- Conserver ici les propositions propres aux rapports d'impact.
- Déplacer les idées transverses au niveau du bloc `Cartographie & Impact` si nécessaire.
