# Execution rapide des messages `ateliers_DU`

## Objet

Ce document execute le **Message 1** de `documentation/plans/ateliers_DU.md` en listant uniquement les ecarts encore ouverts ou partiellement couverts, puis classe les messages 2 a 14 selon leur cout probable.

## Ecarts non finalises

| Message | Statut actuel | Ecart restant |
| --- | --- | --- |
| 5. Tests minimaux de non-regression | Partiellement couvert | La couverture des endpoints d'export critiques est maintenant posee, les helpers dashboard/map sont couverts et une premiere couche UI statique couvre les boutons d'export. La couverture de page sur `/dashboard` et `/reports` reste legere. |
| 6. Campagnes multi-actions | Cadrage seulement | Des signaux metier existent (`campaignGoals`, `campaign_name`), mais le modele, l'API et l'UI de suivi multi-actions ne sont pas industrialises. |
| 8. Clarification des pages coeur | Partiellement couvert | Le projet a deja deplace une partie des exports et de la moderation, mais les frontieres entre `dashboard`, `reports`, `compare/climate` et certains blocs analytiques restent a resserrer. |
| 9. Refactor `section-renderer` | Non lance | Le composant reste central et volumineux. Aucun sous-decoupage complet avec smoke tests n'est encore documente comme termine. |
| 11. Convergence PDF cote web | Quasi stabilise | Les endpoints serveur CSV/JSON/PDF partagent maintenant un contrat commun de headers et de noms de livrables, les boutons web CSV/PDF partagent des libelles/messages homogenes et une couverture UI statique fige ce comportement. Le reliquat porte surtout sur des tests de page plus globaux, pas sur le contrat d'export lui-meme. |
| 14. Verification finale complete | Non lance | La verification transversale finale avec synthese des risques restants n'a pas encore ete executee comme lot autonome. |

## Messages rapides executes dans ce passage

| Message | Sortie concrete |
| --- | --- |
| 1. Audit des ecarts | Present document |
| 2. Securite publication | `scripts/pre-release-check.mjs` fiabilise, script `npm run pre-release:check`, documentation [pre-release-security-check.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/operations/pre-release-security-check.md) |
| 3. Observabilite admin centralisee | `/api/services` enrichi avec `summary`, `severity`, `statusMessage` et `timeline`, puis affichage admin et tests de contrat. |
| 5. Tests minimaux de non-regression | Tests ajoutes sur `/api/services`, `/api/reports/actions.csv`, `/api/reports/actions.json`, `/api/reports/elus-dossier`, helpers associes dashboard/exports et boutons UI d'export CSV/PDF. |
| 11. Convergence exports web | Contrat commun d'headers et de noms de livrables pour CSV/JSON/PDF via `buildDeliverableHeaders`, puis harmonisation des libelles/messages front CSV/PDF via `buildExportUiCopy`, avec tests serveur et UI statiques. |
| 10. Tracabilite documentaire | [traceability-matrix.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/architecture/traceability-matrix.md) |
| 12. Strategie de sortie technique | [vendor-exit-strategy.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/operations/vendor-exit-strategy.md) |
| 13. Dossier de validation institutionnelle | [dossier_validation_institutionnelle.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/plans/dossier_validation_institutionnelle.md) |

## Priorisation conseillee apres ce lot rapide

### Priorite immediate

1. Message 5 - terminer les tests de non-regression cibles.
2. Durcir la couverture UI legere de `/dashboard` et `/reports`, maintenant que le contrat d'export est borne.
3. Revenir sur les exports seulement si une divergence reelle reapparait apres evolution produit.

### Priorite moyen terme

1. Message 8 - clarifier les responsabilites produit par page.
2. Message 6 - industrialiser les campagnes multi-actions.
3. Message 9 - decouper `section-renderer`.

### Priorite finale

1. Message 14 - verification finale complete et risques restants.

## Regle de lecture

Ce document ne reclasse pas les travaux deja realises comme ecarts. Il liste uniquement les chantiers encore ouverts, partiels ou non stabilises.
