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

## Versioning et reproductibilité des générations dérivées — CURRENT

Le contrat est livré pour le template et le renderer courants. Chaque nouvelle
génération porte `snapshotSchemaVersion: 2`, un `generationId`,
`sourceGenerationId`, `templateVersion`, `rendererVersion`, `filtersVersion`,
la provenance et les versions méthodologiques réellement produites par leurs
owners. Les versions `proxyVersion` et `qualityRulesVersion` viennent du
runtime existant ; aucun facteur ou version scientifique n'est inventé ni
recopié en dur.

Les snapshots sans version, v1 et les anciens v2 incomplets restent lisibles en
compatibilité explicite. Ils ne sont pas silencieusement mis à niveau. Une
génération historique ne peut être dérivée que si son snapshot est complet et
compatible avec `reports-template-v1`, `official-report-html-v1` et
`reports-filters-v1`; sinon l'API refuse explicitement l'opération.

« Voir », « Télécharger PDF » et « Imprimer » relisent le snapshot immuable, sans
nouvelle génération ni quota ; le premier téléchargement crée l'artefact PDF et
les suivants récupèrent le même fichier. « Créer une nouvelle version » est l'opération
distincte qui vérifie le propriétaire de la source, réserve le quota existant,
crée une nouvelle ligne immutable et conserve la filiation par
`sourceGenerationId`. Elle réutilise le snapshot source comme base de données,
préserve les unités, valeurs inconnues et la provenance, et n'écrase jamais
l'original. Les phases de quota, persistance et audit de succès sont séparées :
le quota n'est libéré qu'après confirmation de l'absence de ligne persistée ;
un résultat de persistance incertain conserve le quota et demande une
vérification avant toute nouvelle tentative. Si l'insertion est confirmée mais
que l'audit de succès échoue, la réponse indique explicitement que la
génération existe, le quota reste consommé et une anomalie est journalisée ou
signalée sans seconde insertion. L'audit couvre les refus de compatibilité,
les échecs de quota, les échecs de persistance et les anomalies postérieures à
une insertion.

Le snapshot JSON ne contient pas le PDF binaire : le téléchargement produit et
conserve séparément un artefact PDF A4 dans le bucket privé `reports`, indexé par
génération, thème et version effective du renderer. Le renderer vérifie la version
enregistrée et refuse une paire incompatible ; aucune identité binaire entre deux versions de
renderer n'est promise sans capacité de rendu historique conservée. Les trois
niveaux `Concis`, `Par défaut` et `Exhaustif` restent ceux du moteur commun ;
les templates alternatifs et les versions scientifiques supplémentaires restent
des propositions tant qu'un owner et un renderer correspondants ne sont pas
livrés.

Les habillages PDF `Impact` et `Scientifique` relèvent d'une spécification
graphique distincte, [documentée en CURRENT](../../../../features/reports/report-pdf-themes-and-reuse.md),
et ne constituent pas une nouvelle version de génération ; ils distinguent les artefacts PDF sans modifier le snapshot.

## Règle de traitement

- Conserver ici les propositions propres aux rapports d'impact.
- Déplacer les idées transverses au niveau du bloc `Cartographie & Impact` si nécessaire.
