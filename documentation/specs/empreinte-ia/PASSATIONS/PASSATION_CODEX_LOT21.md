# Pré-intégration du lot 21 : moteur de comparaison prêt à intégrer

**Statut : CANDIDATE, non intégré. Révision 20 novembre 2026, qualité du code / raisonnement / abonnement.** Aucun commit, push, PR, migration ou test runtime CleanMyMap n'a été effectué. Les cinq fichiers du dossier `SPECIFICATIONS_PLAN/` restent des spécifications `PLAN` (pas des pages `CURRENT` du dépôt).

## Ce qui est vérifié dans `main` (lecture seule)

- `apps/web/src/lib/environmental-impact-estimator/model-catalog.ts` possède `ExecutionEnvironment = cloud_api | local_device` et distingue `WeightsAvailability` ; l'éditeur, l'hébergeur et le mode d'exécution sont séparés. Ne pas ajouter une catégorie d'exécution `open_weight` ni `hybrid`.
- `apps/web/src/lib/environmental-impact-estimator/scientific-registry.ts`, `personal-ai-estimator.ts` et `ecologits-adapter.ts` possèdent les contrats d'estimation. Le nouveau moteur n'est pas un second registre scientifique et ne transforme pas les tarifs en énergie.
- `apps/web/src/components/environmental-impact-estimator/environmental-impact-curve-chart-view.tsx` utilise un SVG informatif et des boutons natifs accessibles. Le composant candidat reprend ce principe.
- Les tests web existants utilisent Vitest et les tests de vue `renderToStaticMarkup`.
- `/learn/empreinte-ia` n'existe **pas encore** dans `apps/web/src/app/learn/` sur le `main` examiné ; le solveur dédié des lots 0 + 08 non identifié à ce stade. L'interface ne doit pas être branchée prématurément à une autre page ou remplacer un solveur absent.

## Fichiers applicatifs produits, sans changement dans GitHub

| Chemin cible | Responsabilité |
| --- | --- |
| `apps/web/src/lib/environmental-impact-estimator/offer-comparison.ts` | Contrat pur, normalisation prix/énergie/carbone par tâche réussie, **filtre de qualité code par benchmark et effort de raisonnement**, modes `API/SUBSCRIPTION/LOCAL_OWNED`, preuve de forfait et quota, plafond +15 %, bonus de continuité <= 3 % sur deux axes et Pareto inchangé. |
| `apps/web/src/lib/environmental-impact-estimator/offer-comparison.test.ts` | Cas synthétiques pour +15 %, prix moins élevés, refus qualité/déploiement/scope, normalisation avec échecs, Pareto, carbone inconnu, régions ambiguës et identifiants. |
| `apps/web/src/components/environmental-impact-estimator/offer-comparison-scatter.tsx` | Champs contrôlés `Abonnement ou API` (+ local), plateforme/forfait en abonnement, graphique X €/réussite Y gCO₂e/réussite, badge discret de continuité, affichage benchmark/raisonnement, sélection au clavier, offres incomplètes hors points. |
| `apps/web/src/components/environmental-impact-estimator/offer-comparison-scatter.test.tsx` | Assertions de sémantique du rendu et d'accessibilité statique. |

Aucun fichier n'a été créé dans un nouveau catalogue parallèle et aucun code de génération d'émissions, d'eau, de recyclage ou de simulation n'a été dupliqué.

## Interface d'entrée et risques à résoudre au moment du lot 21

- `compareOffers(reference, candidates)` attend **des campagnes déjà vérifiées** : même travail, même règle de succès, prix total attribuable incluant échecs, énergie/CO₂e avec frontières et provenance cohérentes. Ce moteur ne vérifie **pas** les faits derrière les déclarations `quality: PASS`, les URLs ou `kind: REAL_VERIFIED`. L'owner côté serveur doit les constituer à partir de sources réelles, sourcées, datées et approuvées. Ne jamais exposer un setter permettant à l'utilisateur de se déclarer une offre vérifiée.
- `priceEuroPerSuccess` = frais attribuables totaux / tâches réussies. Les coûts `FULL_ATTRIBUTABLE`, `LOCAL_MARGINAL`, `LOCAL_TCO` ne sont pas confondus. Les méthodes `BILLED`, `PUBLISHED_TARIFF_MODELED`, `ALLOCATION_SCENARIO` restent visibles et ne sont pas de la même force de preuve.
- `operationalCarbon.totalKgCo2e` est un résultat **en entrée**, produit par le registre scientifique/estimateur. `UNKNOWN` ou région d'endpoint seule donne `null`, et la carte ne fabrique jamais d'ordonnée. En routage multi-régional, seules les bornes sont disponibles si les poids sont inconnus ; elles sont listées hors nuage plutôt que remplacées par une moyenne.
- `canPlot` nécessite un prix et un CO₂e **ponctuels**, une qualité/accessibilité recevables, l'absence d'incertitude sur le plafond, et un mode de preuve vérifié. Les candidats économiquement admissibles mais non représentables demeurent sélectionnables dans une liste explicative. Les offres dominées restent visibles.
- À coût de référence nul/inconnu, l'admission relative est indéterminée. Un modèle plus « intelligent » ou moins cher au token n'est pas réputé équivalent ni plus sobre.
- Le composant `OfferComparisonScatter` est **contrôlé** (`selectedOfferId`, `onSelect`) : la sélection seule n'entraîne pas d'appel tiers, de requête payante, de mutation, de migration de modèle ou de recomputation de la collecte. Le parent futur doit effectuer le recalcul explicite à partir du vrai solveur 0 + 08 et préserver les données personnelles.
- L'eau, l'ACV, les outils et la latence restent des données futures de l'écran de bilan, pas des coordonnées du nuage prix/CO₂e. Ne pas présenter un point comme une évaluation environnementale totale.
- Ce composant reprend les classes utilitaires du Web existant, mais son rendu final **n'a pas été comparé visuellement** avec la future page. Adapter la composition au design system et aux conventions de la page au moment du branchement, sans refonte hors périmètre.

## Vérifications réellement exécutées ici

1. `tsc` TypeScript strict sur les **4 candidats révisés** avec stubs de types `React`, `Vitest`, `model-catalog` et alias `@/` de même signature : **PASS**. Vérification isolée seulement, **pas** le `apps/web` réel.
2. Transpilation TSX du composant via l'API TypeScript : **PASS**.
3. Suite autonome Node v22 avec assertion native, exécutant le moteur sur **22 groupes synthétiques : 22/22 PASS**, et 19 cas de `offer-comparison.test.ts` exécutés avec un shim `vitest` minimal (sans exécuter Vitest officiel) : **19/19 PASS**. Contrôles des dégradations de code, modes de raisonnement, différents modes commerciaux et facture par période compris. Aucun fournisseur ou compte réel testé.
4. Vitest réel, typecheck du workspace Next.js, ESLint, couverture, rendu navigateur, auth et build : **NOT_RUN**. Aucune base distante ni production sondée.

## Intégration restante, bornée

Après livraison des lots préalables, réexaminer `main` et ses tests/consommateurs ; intégrer les fichiers ci-dessus à l'owner actuel ou les adapter sans créer de doublon. Construire les offres **réellement déployables**, preuves de qualité/coûts/régions et un raccordement au calcul physique existant ; réutiliser le solveur 0+08 pour recalculer les déchets et mégots **sans mutation**. La page personnelle doit rester protégée par AuthN/AuthZ. Conserver les validations de provenance et de comparabilité **sur serveur ou au niveau de l'owner de données**, et ne pas croire les simples indicateurs booléens provenant du client.

Exécuter alors les vrais tests Vitest, le typecheck, la couverture pertinente, les tests UI clavier/responsive et les tests d'absence d'appels externes et d'écritures. Mettre à jour seulement les documents canoniques effectivement concernés. L'ordre et les critères de STOP du lot 21 dans les 5 spécifications restent prioritaires.

**STOP CONDITION pour cette pré-intégration :** code de sélection et composant fournis, syntaxe/typecheck isolés et cas synthétiques exécutés ; aucune prétention de recommandation réelle ou d'intégration applicative.

Le script reproductible `PREVALIDATION/smoke.mjs` est fourni **hors arborescence applicative**. Pour le relancer sur cette archive décompressée : `node --experimental-strip-types PREVALIDATION/smoke.mjs` (Node 22.16). Il ne remplace ni Vitest ni les tests de déploiement. Les URLs `example.org` de ce script et des tests sont des **fixtures synthétiques**, pas des preuves d'offres réelles.


## Contrats supplémentaires retenus dans cette révision

- **Filtre qualité avant coût** : une configuration `modelId + version + reasoningConfigurationId` doit réussir le même benchmark de code et les mêmes contraintes critiques que la référence, avec borne basse candidat >= borne haute référence - 0,03. Le taux de réussite de campagne reste distinct du benchmark de code. Le prix bon marché ou le mode `max` n'excusent pas une baisse de capacité. Pour les tâches non codées (`workloadDomain=NON_CODE`), le benchmark spécifique de code ne s'impose pas.
- **Accès vérifié** : `OfferAccess` contient mode commercial, plateforme, forfait, disponibilité et modes de raisonnement prouvés sur le forfait. Une plateforme saisie librement par l'utilisateur n'est **jamais** une preuve. Ne pas utiliser des familles ou hiérarchies d'offres nominatives comme critère de réussite.
- **Abonnements** : `subscriptionAttribution` enregistre période, frais complets et dépassements, quota couvrant le volume, forfait. Ne jamais faire passer un forfait à coût marginal inconnu pour un tarif API ou une utilisation gratuite. `API` et `SUBSCRIPTION` ne sont pas comparés automatiquement par prix ; `LOCAL_OWNED` garde son périmètre propre.
- **Préférence** : lorsqu'offre et abonnement actuels sont prouvés accessibles, l'UI peut afficher une préférence si une offre sur la plateforme existante est au maximum 3 % plus coûteuse **et** 3 % plus carbonée qu'une alternative admissible documentée. Ce n'est ni une économie, ni un score global, ni un changement du Pareto. Sans forfait connu, bonus désactivé.
- **Wiring futur** : le parent contrôlera `comparison.preferences` et `onPreferencesChange`, chargera les offres vérifiées pour le mode choisi, recalculera sans écriture et préservera l'AuthN/AuthZ de la page. Ne pas câbler cette pré-intégration tant que les lots 0, 08 et la route personnelle ne sont pas prêts.

**Tests réellement exécutés sur cette archive** : 22 cas Node autonomes et 19 cas du fichier de test moteur transpilés/exécutés sous shim Node (ce shim n'est **pas** Vitest) ; `tsc` strict isolé avec types simulés, vérification de transpilation TSX. **Non exécuté** : Vitest réel, rendu React/Next, tests d'interaction navigateur, lint, build, couverture Web, tests de connexion fournisseurs, contrat réel des tarifs, migrations et déploiement.

**Identité du mode de raisonnement** : `OfferAccess.reasoningConfigurationId` appartient au déploiement, même pour les tâches non codées. Pour les tâches de code, `OfferCodingAssessment.reasoningConfigurationId` doit coïncider exactement ; pour les abonnements, la configuration doit figurer dans `verifiedReasoningConfigurationIds` du couple exact plateforme/forfait. Sans cette preuve, la comparaison n'est pas promue.
