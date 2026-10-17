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
le snapshot mono-action porte désormais `snapshotSchemaVersion: 2` avec ses
métadonnées de période, scope, provenance, modules, versions réellement
disponibles et état des sources ; les snapshots historiques sans version ou v1
restent compatibles en lecture. Le parcours couvert par le code
et les tests ciblés est livré ; la preuve Supabase réelle et l'E2E authentifié
restent des validations d'environnement à exécuter avant une attestation de
persistance en production. Le même contrat pourra ensuite servir à des entrées préremplies
pour une campagne, une organisation, un événement, un territoire ou un
objectif mesurable, hors de ce lot.

## Versioning et reproductibilité des générations dérivées — PLAN

Le snapshot JSON immuable et la relecture sémantique des générations courantes
sont livrés. Restent planifiées les capacités qui nécessiteraient un nouveau
contrat : dériver une nouvelle génération liée à une source avec
`sourceGenerationId`, faire varier un template alternatif ou une méthodologie
sans ambiguïté, et éventuellement versionner des filtres supplémentaires
(`filtersVersion`) lorsqu’un owner canonique sera défini. Aucune version
scientifique ou facteur n’est inventé pour ce lot.

Une régénération avec un template plus récent devra créer une nouvelle
génération liée à la source, sans écraser l'historique ni inventer de données
manquantes. Elle reste distincte de l'action actuelle « Réexporter », qui
réutilise le snapshot sans créer de nouvelle ligne. Les trois niveaux
`Concis`, `Par défaut` et `Exhaustif` sont déjà livrés dans le moteur commun ;
les templates alternatifs et générations dérivées restent dans ce PLAN.

Les habillages PDF `Impact` et `Scientifique` relèvent d'une spécification
graphique distincte, [documentée en PLAN](../../../../features/reports/report-pdf-themes-and-reuse.md),
et ne constituent pas une nouvelle version de génération.

## Règle de traitement

- Conserver ici les propositions propres aux rapports d'impact.
- Déplacer les idées transverses au niveau du bloc `Cartographie & Impact` si nécessaire.
