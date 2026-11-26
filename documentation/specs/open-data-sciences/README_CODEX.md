# Refonte Open Data et sciences participatives

**VALIDATED / RÉCEPTIONNÉ (lot `07/23 | DATA`)**. Intégré sur `main` (`857d7b2fd` et réception finale). Les deux fichiers patches candidats (`01-explorateur-scientifique.patch`, `02-contrats-documentaires.patch`) ont été intégrés et retirés.

## Sources runtime et contrats livrés

- `apps/web/src/components/sections/rubriques/open-data-section.tsx` : portail sciences participatives préservant `CmmCard tone="family"`, catalogue des trois jeux (`action`, `spot`, `clean_place`), dictionnaire, méthode/limites, exemple Python, droits distincts (`AGPL` pour le code, pas de licence ouverte générale des données ni de corpus FAIR exhaustif).
- `apps/web/src/components/sections/rubriques/open-data-explorer.tsx` et `open-data-research.model.ts` : requête bornée `1..300` sur `GET /api/actions/map`, projection minimisée sans coordonnées exactes ni champs privés, exclusion des actions préparatoires/futures/doublons, distinction entre mesures absentes (`null`) et zéro explicite, avertissements `isTruncated` / `partialSource` et gestion d'erreur.
- `documentation/pages_site/routes/04-reseau-discussions/open-data/open-data-README.md` et `open-data-presentation-detaillee.md` : contrats route `CURRENT` alignés.
- `e2e/open-data-science.spec.ts` : rattaché au projet `"local public"` (`playwright.config.ts` et `scripts/ci/e2e-project-catalog.mjs`).

Le runtime actuel a des cartes marketing répétitives, des liens « En savoir plus » vers leur propre carte et une redondance avec la page financement. Le nouvel écran est un portail de consultation, pas une API scientifique exhaustive ni un nouveau stockage. La page financement dédiée et les CTA communs restent inchangés. Pas de changement de schéma, de route API, de calcul scientifique ni de droits de publication.

Le contrat existant de GET /api/actions/map borne les réponses à 300, filtre parfois après lecture source bornée, expose isTruncated/partialSource et permet aussi des événements futurs publiés sous statut cartographique approved. L'aperçu exclut ces événements et les brouillons ; la phase déclarée et la date ne prouvent toutefois pas la réalisation indépendante, notamment lorsque les historiques sont normalisés. Préserver la distinction entre validation applicative et scientifique. Uniquement une projection d'aperçu minimisée, sans coordonnées exactes ou texte libre dans l'affichage. Les CGU actuelles séparent AGPL du code et licences des données ; aucune nouvelle licence n'est accordée.

## Conditions restant à remplir

- Valider les hunks sur le checkout courant ; consulter les docs Next locales ; adapter sans dupliquer les owners ni écraser les autres writers.
- Exécuter Vitest ciblé, tests API map existants, typecheck, lint, tests navigateur desktop/mobile et modes de présentation. Vérifier erreurs/état vide, requêtes successives, accessibilité, nombre retenu/reçu et confidentialité. Les fixtures E2E ne démontrent pas la production. Vérifier un appel public réel non destructif et les trois types de données.
- Revoir les classes et la localisation avec les règles du design system ; éviter d'introduire des messages de méthodologie contradictoires. Les tests existants ne doivent pas être affaiblis. Vérifier les liens existants et toute dépendance à une ancienne ancre ou au titre.
- Conserver les champs propriétaires, la documentation canonique et ses sections utiles ; adapter les deux fiches route avec le code validé.
- Avant d'en faire un véritable corpus FAIR : définir droits et licences par source et jeu, périmètre et consentements (y compris tiers et données scolaires), identifiant de version, métadonnées machine-readable, méthode de pagination stable, provenance par observation et mesure, effort d'échantillonnage, couverture, incertitude et restitution des résultats. Ce sont des décisions et chantiers distincts, non des capacités CURRENT. Proposer une projection scientifique minimisée serveur si ces besoins sont confirmés ; ne pas détourner l'API carte ni exposer les exports privés.

Références externes : https://www.go-fair.org/fair-principles/ et https://www.sei.org/publications/ten-principles-citizen-science/. Orientation FAIR/ECSA, aucune certification.

**Preuves de réception :**
- Vitest modèle/contrat (`open-data-research.model.test.ts` avec réponses canoniques `buildActionDataContract` / `toPublicActionMapResponse`, `open-data-section.contract.test.ts`) + couverture ciblée : PASS.
- Vitest API `/api/actions/map` (`route.test.ts`, `map-route.test.ts`, 49 tests) : PASS.
- `typecheck`, `eslint` ciblé, `check:surfaces`, `check:doc-governance` : PASS.
- Playwright `e2e/open-data-science.spec.ts` (3 jeux `action`/`spot`/`clean_place`, troncature, erreur/réessai, état vide, GET public réel `/api/actions/map`, mobile + desktop) : PASS.

**STOP CONDITION du lot :** catalogue et explorateur fonctionnels, distinction réelle des bilans terminés et événements futurs, aucun résultat fictif ni fuite de données, état partiel et erreurs explicites, unités/provenance/limites et droits lisibles, liens opérationnels, validations comportementales et documentation `CURRENT` alignées, publication sûre. Le corpus scientifique versionné et licencié est une évolution distincte.
