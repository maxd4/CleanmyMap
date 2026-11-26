# Découverte IA : DOC-06 à DOC-10 (P1/P2)

Statut : PLAN / CANDIDATE. Référence factuelle 8b212cc6a77203f6210a6027722789161b1627c9.
Ce lot complète les P0 publiés (9f18eb3 et 8b212cc). Ne pas refaire leur
analyse ni créer un troisième index. Les sources CURRENT enrichies sont
api-standard.md, testing-execution.md, SCIENTIFIC_PROTOCOL.md, le README
design system et MAINTENANCE.md ; aucune fonctionnalité modifiée.
Préserver les travaux P0 et les 23 lots fonctionnels concurrents.

## Inventaire statique de départ (AUDIT, pas état de production)

| Objet | Périmètre de comptage Git | Nombre |
|---|---|---:|
| Fichiers route API | apps/web/src/app/api/**/route.ts ou route.js | 253 |
| Fichiers tests Web | apps/web/src/**/*.test.ts ou .test.tsx | 1941 |
| Fichiers TSX UI partagée hors test/spec | apps/web/src/components/ui/**/*.tsx | 50 |
| Workflows versionnés | .github/workflows/*.yml ou .yaml | 12 |
| Commandes npm racine | clés scripts du manifeste | 166 |
| Commandes npm Web | clés scripts du manifeste | 36 |
| Commandes npm Mobile | clés scripts du manifeste | 13 |

Une route peut exposer plusieurs méthodes ; un fichier test peut contenir
plusieurs scénarios ; un TSX peut ne pas exposer de primitive publique.
Ces compteurs ne sont pas des mesures de couverture ni de production.

## DOC-06 : API et correspondances Web/Mobile

Owners existants : scripts/vercel-audit-core.mjs (scanVercelSurface),
scripts/reports/generate-vercel-surface-report.mjs,
apps/web/src/lib/auth/api-authorization-contract.ts et fragments,
apps/web/src/app/api/api-boundary-analysis.ts et
api-boundary-route-analysis.ts (resolveRouteMethods, utilisé par
api-boundary.test.ts). Réutiliser ces propriétaires et les preuves de
garde ; ne pas dupliquer le registre ni déduire AuthZ de la présence d'un
Bearer. L'index CURRENT API contient déjà les familles de clients mobiles.

Candidats complets : candidates/scripts/reports/mobile-api-discovery.mjs
et mobile-api-discovery.test.mjs, destination scripts/reports/ mêmes noms.
La projection réutilise le scan de routes et une vue Git à SHA complet.
Elle relève les appels directs mobileRequest importés (y compris alias)
et les fetch à suffixe /api reconnaissable, puis rapproche les motifs de
chemin sans inventer un ordre de résolution Next.js. Les cas ambigus,
non résolus, sans méthode littérale et hors inventaire restent explicites.
Aucun URL brut, query, corps, header ni token n'est exporté. Limites :
liaison de symboles non résolue, wrappers, fetch dynamiques, RPC et
Supabase directs ne sont pas couverts exhaustivement. Ne pas qualifier
une correspondance de contrat runtime validé.

Exécuter les tests Node et le CLI sur le vrai graphe de routes au SHA
courant. Compléter le rapprochement méthode, garde et owner en réutilisant
le résolveur du test API (si nécessaire, extraire son accès source pour
supporter la vue Git sans modifier les oracles existants). Couvrir re-exports,
routes sans contrat explicite et incompatibilités de méthode, sans donner
un faux verdict public/privé. Vérifier les cas dynamiques non résolus
sur les consommateurs réels (notamment tracking, médias, comptes).
Les lectures/écritures Supabase directes restent une frontière distincte.
Intégrer le CLI npm et sa documentation uniquement après validation.

## DOC-07 : tests

Le sélecteur existant est scripts/checks/validation-policy.mjs :
createValidationPlan, groupes security/regression, fichiers tests changés.
CI : scripts/ci/detect-scope.mjs. Les métriques de module sont déjà générées
par scripts/reports/generate-module-test-metrics.mjs, schéma 3,
avec provenance de couverture. Ne pas modifier le snapshot historique
de la matrice qualité pour afficher une fraîcheur fictive.
Compléter l'interrogation P0 du graphe par une sélection explicite des tests
voisins, importeurs directs/indirects, tests des consommateurs, et garde
HTTP/SQL/E2E. La sélection de candidats n'est pas un verdict de couverture.
Réutiliser le plan existant sans modifier les règles de déclenchement.
Tester trois scénarios : UI, service avec RPC, contrat partagé Web/Mobile ;
vérifier qu'un test indirect ou un cas interdit n'est pas supprimé par
absence d'import. Sorties bornées et provenance exacte sous artifacts/.
Aucun FULL.

## DOC-08 : chaînes scientifiques

Le protocole scientifique CURRENT est enrichi avec six chaînes et leurs
points d'entrée. Ne pas recopier les coefficients ni modifier les modèles.
Compléter chaque pipeline réellement consommé (terrain, pollution/références,
risque/itinéraires, GPS, rapports, empreinte IA personnelle et projet, autres
imports scientifiques utiles) à partir des modules et tests propriétaires :
source/version, unité et statut, normalisation, agrégat, persistance,
projection, provenance et preuve. Relier les versions SQL et TypeScript via
le garde de version scientifique existant. La planification et les modèles
hypothétiques restent séparés du CURRENT. Ne pas réécrire les fiches
route-first protégées ni les données scientifiques.

## DOC-09 : UI et hooks

Le générateur existant scripts/design/generate-design-system-board.mjs
liste les composants UI/navigation et produit la planche sous
documentation/design-system/generated/board/. Étendre cette capacité
ou sa projection de données seulement pour les métadonnées manquantes :
exports/props, variantes réellement déclarées, consommateurs, hooks,
frontière Web/Mobile et tests. Réutiliser le graphe P0 pour les importeurs.
Les hooks sont aussi colocalisés avec les features ; pas de catalogue
limité au dossier src/hooks. Vérifier la fraîcheur de la planche sans
changer les tokens, CSS, composants, captures ou matrice UI/UX gelée.
Toute qualification de rendu ou d'accessibilité exige les preuves propres
à la surface ; le catalogue n'en est pas une.

## DOC-10 : scripts, jobs et maintenance

Dériver les entrées npm des manifestes (nom, workspace, script cible),
les workflows GitHub des YAML, les jobs applicatifs de leur registre
canonique. Le README Maintenance est déjà corrigé pour ne plus figer le
nombre de jobs. Le registre actuel déclare :

| Job | Cadence logique |
|---|---|
| territorial-legends | daily |
| action-reminders | daily |
| action-retention | daily |
| external-action-sync | daily |
| impact-terrain | monthly |
| platform-usage | weekly |
| map-pollution-references | weekly |
| action-collection-context-references | monthly |
| governance-report | monthly |

Un seul cron applicatif déclaré dans apps/web/vercel.json : 20 3 * * * UTC.
Ce tableau est un snapshot, non un second scheduler. Compléter les
métadonnées non dérivables (effets, modes, cible, autorisation et reprise)
dans les README propriétaires ; vérifier notamment les commandes à nom
d'audit qui écrivent un export, les scripts de backfill/cleanup, les
workflows de preuve et la distinction Python legacy/runtime.
Un outil dont l'effet n'est pas prouvé reste UNCLASSIFIED et n'est pas
exécuté. Ne pas lancer les jobs, déployer, écrire dans Supabase ou exécuter
les scripts de données pour construire le catalogue.

## Réception et preuves

1. Intégrer et valider la projection API, puis compléter la sélection des
   tests par réutilisation des owners P0 et existants.
2. Compléter les chaînes scientifiques et les métadonnées UI/hooks sans
   dupliquer les contrats.
3. Générer l'inventaire des opérations, valider la fraîcheur des index et
   les liens via les gardes existants. Reprendre la mesure P0 sur les
   scénarios API mobile, pipeline scientifique et opération de maintenance.

STOP CONDITION : méthodes/consommateurs API qualifiés, sélection de tests
testée avec cas indirects et interdits, pipelines prioritaires traçables,
catalogues UI/hooks et opérations reproductibles avec provenance et limites,
gardes documentaires et validations ciblées satisfaits, publication
vérifiée. Retirer les candidats seulement après réception. Ne pas
confondre catalogue généré, test présent, résultat exécuté et production.

Preuves ChatGPT : arborescence Git non tronquée, lecture des owners cités,
vérification de chemins et du registre des jobs, 9 assertions isolées
sur la correspondance des motifs de route. Le scanner TypeScript et ses tests Node ont ensuite été exécutés en environnement
isolé (voir preuve complémentaire). Le CLI sur checkout réel et les gardes
locaux restent à valider. HOOK_NOT_AVAILABLE ; aucune mesure de couverture ni économie
de tokens revendiquée, aucune mutation distante.

## Compléments d'implémentation et preuves

### DOC-06 : tests Node isolés

Les deux blobs du premier commit 3c33c136265ae9cf9011e31e840df4ebd6446ed7 ont été reconstruits
à l'identique, vérifiés par git hash-object (664e44e, ebf5fec) puis exécutés
avec Node 22.16.0 et TypeScript 5.8.3 : trois tests, trois réussites.
Les imports repository-view et vercel-audit-core ont été substitués par
des stubs qui lèvent une erreur s'ils sont invoqués. La preuve concerne
les fonctions de rapprochement, l'analyse TypeScript et la projection
sur vue fixture ; pas le vrai CLI, le vrai inventaire ni la version de
TypeScript installée dans le checkout. L'accès réseau brut au dépôt depuis
le conteneur était indisponible (résolution DNS). Ne pas refaire ces
tests isolés comme s'il s'agissait de la preuve d'intégration manquante.

### DOC-07 : sélection statique complémentaire

Deux nouveaux candidats complets sous candidates/scripts/reports/ :
discover-related-tests.mjs et discover-related-tests.test.mjs.
Destination scripts/reports/ mêmes noms. Ils projettent le graphe v1
existant en parcourant ses arêtes inverses (runtime et type), bornent la
profondeur et les résultats par surface, signalent les chemins absents,
cycles, troncatures et limites de preuve. Le CLI ne lance aucun test et
ne modifie pas validation-policy. Exécuter les tests Node puis le CLI sur
les vrais graphes et compléter les associations non importées ; ne jamais
utiliser son résultat comme liste restrictive de tests autorisés.

### DOC-10 : catalogue générable

Deux nouveaux candidats sous candidates/scripts/reports/ :
generate-operations-discovery.mjs et generate-operations-discovery.test.mjs.
Destination scripts/reports/ mêmes noms. Réutilisent la vue Git existante,
TypeScript et js-yaml déjà utilisés/déclarés dans le dépôt. Inventorient
les clés npm, triggers de workflows, registre de jobs et crons Vercel.
Ne chargent pas le runtime, n'exécutent rien, n'exportent pas les commandes
ou leurs arguments, et laissent les effets UNCLASSIFIED. Qualifier les
effets au niveau des owners documentaires, sans second registre de jobs.
Intégrer après tests Node et exécution sur le checkout actuel. Vérifier
explicitement l'identité du commit demandé dans les CLI de découverte
(et non seulement la forme d'un SHA ou la présence d'un objet arbre).
Ne pas réexécuter les opérations recensées.

Preuves isolées supplémentaires : 10 assertions JS exécutées
sur la traversée inverse, la provenance, les bornes, les clés npm et
les déclencheurs de workflow. Les tests Node de ces quatre nouveaux
fichiers et l'intégration des deux CLI restent NOT_RUN.

## Réception du 26 novembre 2026 (AUDIT)

Statut : lots P1/P2 (DOC-06 à DOC-10) intégrés ; les candidats sous `candidates/` ont été retirés après intégration et validation.

- **DOC-06** : `npm run audit:mobile-api-discovery` (`scripts/reports/mobile-api-discovery.mjs`, 3 tests Node PASS). Exécuté sur le checkout réel au SHA `1fd5e4c16` : 31 références mobiles (21 `CANDIDATE`, 10 `AMBIGUOUS`, 0 `methodMismatch`, 0 `UNRESOLVED_PATH`), avec méthodes serveur extraites et présence dans le contrat AuthZ.
- **DOC-07** : `npm run discover:related-tests` (`scripts/reports/discover-related-tests.mjs`, 3 tests Node PASS, réutilise `VITEST_GROUPS` de `validation-policy.mjs`). Testé sur le graphe réel `1fd5e4c16` (UI `action-buddy-panel.tsx` → 2 tests ; service `action-buddy.ts` → 10 tests ; contrat partagé `domain-language.ts` → 277 tests bornés à 50).
- **DOC-08** : `documentation/product/SCIENTIFIC_PROTOCOL.md` complété avec les chaînes itinéraires/revisite et missions GPS/finalisation serveur et le lien vers `npm run check:scientific-formulas`.
- **DOC-09** : `scripts/design/generate-design-system-board.mjs` étendu via `collectUiAndHooksMetadata` (exports, props, variantes, tests colocaux, hooks colocalisés dans `apps/web/src/`, frontière `web`), testé et régénéré dans `documentation/design-system/generated/board/` sans modifier tokens, composants ni la matrice UI/UX gelée.
- **DOC-10** : `npm run audit:operations-discovery` (`scripts/reports/generate-operations-discovery.mjs`, 2 tests Node PASS). Exécuté sur le checkout réel `1fd5e4c16` sans exécuter aucun job ni exporter de commandes brutes.
- **Mesures et limites** : aucune mutation Supabase, aucun job exécuté, aucun `FULL`. Les artefacts générés restent sous `artifacts/ai-discovery-p1-p2/` et ne remplacent ni `validation-policy` ni les preuves runtime/PostgreSQL.
