# Journal d'execution rapide des messages `ateliers_DU`

## Objet

Ce document conserve la trace du lot rapide deja execute autour de `documentation/plans/ateliers_DU.md`.

> [!IMPORTANT]
> Ce document ne definit plus la priorite courante.
> La priorite active se trouve dans [documentation/plans/ateliers_DU.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/plans/ateliers_DU.md).

## Ecarts encore ouverts ou partiellement couverts

| Chantier | Statut actuel | Ecart restant |
| --- | --- | --- |
| Tests de non-regression | Partiellement couvert | Les endpoints critiques d'export, `/api/services` et les boutons UI d'export sont couverts. La couverture de page sur `/dashboard` et `/reports` reste legere. |
| Campagnes multi-actions | Cadrage seulement | Des signaux metier existent (`campaignGoals`, `campaign_name`), mais le modele, l'API et l'UI de suivi ne sont pas industrialises. |
| Clarification des pages coeur | Partiellement couvert | Une partie des frontieres produit a ete resserree, mais les responsabilites entre `dashboard`, `reports`, `pilotage` et certains blocs analytiques restent a expliciter. |
| Refactor `section-renderer` | Non lance | Le composant reste central et volumineux. Aucun sous-decoupage complet avec smoke tests n'est documente comme termine. |
| Verification finale transverse | Non lance | La synthese finale des risques restants et des dettes assumees n'a pas encore ete executee comme lot autonome. |

## Messages rapides executes

| Message | Statut | Sortie concrete |
| --- | --- | --- |
| 1. Audit des ecarts | Execute | Present document de suivi initial, maintenant conserve comme trace. |
| 2. Securite publication | Execute | `scripts/pre-release-check.mjs`, commande `npm run pre-release:check` et documentation [pre-release-security-check.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/operations/pre-release-security-check.md). |
| 3. Observabilite admin centralisee | Execute en version utile | `/api/services` enrichi avec `summary`, `severity`, `statusMessage` et `timeline`, plus affichage admin et tests de contrat. |
| 5. Tests minimaux de non-regression | Partiellement execute | Tests ajoutes sur `/api/services`, `/api/reports/actions.csv`, `/api/reports/actions.json`, `/api/reports/elus-dossier`, helpers associes et boutons UI d'export CSV/PDF. Reliquat principal : couverture de page sur `/dashboard` et `/reports`. |
| 10. Tracabilite documentaire | Execute | [traceability-matrix.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/architecture/traceability-matrix.md). |
| 11. Convergence exports web | Execute sur le contrat d'export | Contrat commun d'headers et de noms de livrables cote serveur, harmonisation des libelles/messages CSV/PDF cote web et tests serveur/UI. Reliquat limite aux tests de page. |
| 12. Strategie de sortie technique | Execute au niveau socle | [vendor-exit-strategy.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/operations/vendor-exit-strategy.md). |
| 13. Dossier de validation institutionnelle | Execute | [dossier_validation_institutionnelle.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/plans/dossier_validation_institutionnelle.md). |
| 14. Verification finale complete | Non execute | Aucun lot transverse finalise a ce stade. |

## Ce qui est clos

- Securite publication
- Observabilite admin au niveau socle
- Convergence serveur/UI des exports
- Tracabilite documentaire
- Strategie de sortie au niveau documentaire
- Dossier de validation institutionnelle

## Ce qui reste

- Terminer la couverture UI de `/dashboard` et `/reports`
- Mettre en place la validation humaine des contenus
- Fiabiliser les indicateurs
- Clarifier les responsabilites des pages coeur
- Industrialiser les campagnes multi-actions
- Refactorer `section-renderer`
- Completer l'inventaire technique du lock-in
- Realiser la verification finale transverse

## Regle de lecture

Ce document ne porte plus de priorisation active. Pour l'ordre courant de traitement, se reporter a [documentation/plans/ateliers_DU.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/plans/ateliers_DU.md).
