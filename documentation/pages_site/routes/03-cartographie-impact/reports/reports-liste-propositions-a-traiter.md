# Rapports d'impact - Liste des propositions à traiter

## CURRENT — Préconfiguration depuis une action validée — LIVRÉE

Une action validée propose désormais « Générer un rapport d'impact » en ouvrant
le générateur canonique de `/reports` avec un périmètre préparé sur cette seule
action. Ce point d'entrée ne crée pas de second moteur de rapport.

Le contrat transmet de manière typée l'identifiant canonique de l'action :

```txt
input:
  type: single_action
  actionId: <id canonique>
```

Le backend résout l'identifiant côté serveur, vérifie l'authentification,
l'admissibilité, la publication et la visibilité, puis sélectionne exactement
son périmètre. La génération réutilise l'historique et le renderer existants ;
le snapshot mono-action porte `snapshotSchemaVersion: 1` et les snapshots
historiques sans version restent compatibles. Le parcours couvert par le code
et les tests ciblés est livré ; la preuve Supabase réelle et l'E2E authentifié
restent des validations d'environnement à exécuter avant une attestation de
persistance en production. Le même contrat pourra ensuite servir à des entrées préremplies
pour une campagne, une organisation, un événement, un territoire ou un
objectif mesurable, hors de ce lot.

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

Les habillages PDF `Impact` et `Scientifique` relèvent d'une spécification
graphique distincte, [documentée en PLAN](../../../../features/reports/report-pdf-themes-and-reuse.md),
et ne constituent pas une nouvelle version de génération.

## Règle de traitement

- Conserver ici les propositions propres aux rapports d'impact.
- Déplacer les idées transverses au niveau du bloc `Cartographie & Impact` si nécessaire.
