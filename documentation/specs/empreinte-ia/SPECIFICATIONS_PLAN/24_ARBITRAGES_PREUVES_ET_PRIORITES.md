# Arbitrages scientifiques, produit et preuves : Mon empreinte IA

> **Statut documentaire : PLAN.** Décisions de conception du 22 novembre 2026. Ce texte ne prouve ni un comportement déployé ni une validation en production. Référence de préparation : `main` de `maxd4/CleanmyMap`, état vérifié le 22 novembre 2026.

## 1. Rôle, autorité et périmètre

Ce document consigne les arbitrages transversaux qui restaient implicites dans les spécifications `00` à `23`. Il complète `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md`, `02_SOURCES_ET_FIXTURES_API.md` et `ERRATA_CONTRATS_0_08.md`. Pour les points explicitement révisés ci-dessous, il précise la décision produit postérieure aux versions du 20 novembre 2026. Il ne remplace pas les conventions scientifiques déjà intégrées ni le code CURRENT. En cas de divergence avec le runtime, `main`, `CHATGPT.md`, les gouvernances scoped et les documents CURRENT prévalent ; une décision PLAN attend son lot d'intégration.

**Décision de périmètre** : priorité à un calculateur compréhensible et accessible aux utilisateurs de chatbots gratuits ou avec abonnement, puis aux imports vérifiables, budgets et parcours pédagogique. Les lots futurs de reconnaissance terrain, entreprise et comparaison de modèles ne deviennent pas CURRENT par cette priorisation.

Aucun nouveau module métier, table, migration, API, score environnemental, page parallèle ou implémentation mobile n'est demandé par ce document. Les contrats concrets continuent d'être possédés par `apps/web/src/lib/environmental-impact-estimator/` et les owners de données, d'Actions et de gamification déjà établis.

## 2. Décisions fermes et preuves scientifiques

| ID | Décision retenue | Motif et niveau de preuve | Effet attendu |
| --- | --- | --- | --- |
| SCI-01 | Ne jamais appeler une estimation « mesure personnelle » sans instrumentation compatible et périmètre connu. | Une activité de chatbot ne révèle pas le matériel, le contexte caché, la charge partagée ni le routage. Les fournisseurs publient des observations non universelles. | Statuts `MEASURED`, `DECLARED`, `PROXY_SCENARIO` et `NA` distingués dans chaque résultat. |
| SCI-02 | Conserver `0,06 / 0,30 / 0,60 kWh IT / million de tokens` comme **trois scénarios non calibrés**, pas comme quantiles statistiques ni bornes physiques garanties. | Coefficients CURRENT du registre, couverture seulement textuelle et dépendance au modèle, raisonnement et service. | Aucune probabilité de couverture ou précision à 95 % inventée. Recalibrage réservé à des données reproductibles. |
| SCI-03 | Ne pas utiliser une moyenne d'énergie par prompt d'un fournisseur pour tous les chatbots. | Google publie 0,24 Wh pour un prompt textuel médian Gemini Apps mesuré en mai 2025, avec périmètre propre. L'AIE décrit des usages multimodaux et agentiques beaucoup plus consommateurs. | Observation externe de plausibilité contextuelle seulement, non multiplicateur universel. |
| SCI-04 | Le lieu de l'utilisateur, du siège, d'un endpoint, d'un stockage ou de l'éditeur ne prouve pas le lieu physique de l'inférence. | Chaînes cloud multi-régions et routage potentiellement inconnus. | `inferenceRegion = UNKNOWN/null` si non prouvé ; carbone attribuable `NA`, pays hypothétique explicitement `SCENARIO_ONLY`. |
| SCI-05 | Versionner les facteurs électriques par **année, région et frontière**. | RTE 2025 : France consommation directe 20,0 gCO₂e/kWh, production directe 19,6 gCO₂e/kWh ; ces grandeurs ne sont pas interchangeables avec les ACV. | Le scénario France 2025, s'il est intégré, est opt-in et n'écrase pas la valeur 2024 ni les anciens snapshots. |
| SCI-06 | Séparer énergie IT, facility, wall local, PUE, carbone location-based/market-based, ACV partielle et eau. | Risque de double PUE et de facteurs incompatibles. | `NA` si unité, frontière, date ou facteur sont absents. Le +30 % historique d'ACV partielle reste une sensibilité indépendante, jamais un supplément automatique EcoLogits. |
| SCI-07 | Distinguer eau directe consommée, eau indirecte, eau prélevée, eau rejetée et **risque conventionnel** de pollution. | ADEME « jusqu'à 500 L potentiellement pollués par mégot » n'est pas une mesure d'eau économisée. | Aucun rapprochement arithmétique affiché comme compensation d'eau réellement consommée. |
| SCI-08 | La collecte et le recyclage ne neutralisent pas les émissions de l'IA. | Comparaison d'impacts et calcul contrefactuel ne sont pas des crédits ; destination et réincorporation non garanties. | Objectifs terrain volontaires et analogies séparés de l'empreinte. Aucun score total « IA moins collecte ». |
| SCI-09 | Un matériau ramassé n'est pas nécessairement recyclé puis réincorporé. | Facteurs ADEME BNR relatifs à la **matière secondaire incorporée**, non aux kg collectés. | `collecté`, `orienté`, `réincorporé` et destination suivis séparément ; bénéfice net réel `NA` sans filière/rendement. |
| SCI-10 | Le chiffre prestataire `63 kg CO₂ / 18 000 mégots = 3,5 g CO₂/mégot` n'est pas une ACV indépendamment validée en CO₂e. | Donnée de filière SMET 71/TchaoMegot utilisée dans `01` et `08`. | Simulation fournisseur opt-in seulement, non crédit attribué au retrait d'un mégot. |
| SCI-11 | Les rendements de collecte de `9,9 kg/personne-heure` et `380 mégots/personne-heure` sont des paramètres de simulation, **pas** des rendements prédictifs universels. | Calibration indépendante sur des actions comparables non prouvée. | Valeurs affichées comme hypothèses éditables ; aucune durée de travail effectivement requise affirmée. |

**Frontière de calcul recommandée** : si une composante du résultat manque, afficher un résultat partiel portant précisément son périmètre et des champs `NA`, plutôt qu'un total silencieusement complété par zéro. Les scénarios bas, central et haut ne constituent ni des écarts-types ni un intervalle de confiance.

## 3. Mode rapide pour les personnes sans tokens, décision prioritaire

### 3.1 Parcours public

Trois entrées au sein de la **même** page `/learn/empreinte-ia` :

1. **Estimation rapide** (première entrée) : sans compte ni facture ni tokens. L'utilisateur choisit un chatbot ou « autre », le type d'accès `GRATUIT / ABONNEMENT / API / INCONNU`, la période et un volume d'échanges ou une fréquence déclarée. Longueurs typiques des questions **et réponses** facultatives ; catégories images, audio, vidéo et agents distinctes et non converties arbitrairement.
2. **Importer un relevé ou un historique** : CSV/JSON/JSONL/PDF autorisés par format prouvé. Un export de conversations n'est pas un rapport fournisseur de tokens. Aperçu local obligatoire avant confirmation.
3. **Saisie avancée** : les compteurs de tokens, frontières et mesures existants restent disponibles. Pas de suppression des champs métier actuels.

Le calcul rapide est **anonyme et local par défaut**, même pour un compte connecté. Sauvegarde facultative seulement après un acte explicite d'un compte authentifié, avec la provenance propre au scénario ; aucun prompt ou transcript brut dans les données personnelles stockées.

### 3.2 Contrat scientifique et règle d'arrêt

- Les nombres de messages et caractères **visibles** sont des déclarations ou des observations locales. Ils ne mesurent pas les tokens exécutés côté fournisseur : contexte injecté, system prompts, tools, sorties cachées, chain-of-thought et cache peuvent manquer.
- Une approximation `caractères -> tokens` doit spécifier langue, tokenizer ou relation empirique, période, bornes et qualité de la calibration. Un ratio de caractères anglais n'est pas universellement applicable au français. **Ne pas coder un multiplicateur invisible ou un « total de tokens » artificiellement exact.**
- Les scénarios énergétiques actuels peuvent être utilisés **seulement** sur une estimation textuelle explicitement hypothétique et compatible, avec une chaîne de provenance `messages déclarés -> longueurs hypothétiques -> tokens équivalents hypothétiques -> facteur de sensibilité non calibré`. L'interface ne présente jamais ce résultat comme l'empreinte observée.
- Si les longueurs, la conversion ou la modalité rendent cette chaîne injustifiable, restituer les échanges déclarés et `énergie = NA`, avec une simulation pédagogique indépendante facultative, clairement non attribuable à la personne. « Utilisable sans tokens » n'implique pas « chiffre physique toujours disponible ».
- Un chatbot gratuit et le même chatbot payant **ne reçoivent pas un facteur kWh différent du seul fait du prix**. Le prix d'abonnement et les quotas ne renseignent ni l'énergie ni les tokens.
- Pour un usage mixte image/audio/vidéo/agent sans facteur propre et frontière connue, garder les impacts physiques de ces modalités à `NA` ; un sous-total texte peut être indiqué avec `PARTIAL_MULTIMODAL`.
- La région physique inconnue conserve CO₂e localisé `NA`. Un scénario géographique opt-in reste indépendant du résultat attribuable.

Le premier résultat doit être compréhensible pour un usager qui n'a jamais entendu parler de tokens. Une fiche de méthode dépliable rend visibles unités, période, facteurs, limitations, incertitude et version. Aucun pourcentage de confiance inventé.

### 3.3 Identité, contrats et non-double comptage

**Ne pas ajouter de second moteur** : adaptateur pur vers l'estimateur existant, ou résultat d'activité quand aucun calcul physique n'est défendable. Conserver séparément : `sourceKind=SELF_REPORTED_CHAT_USAGE` ou `LOCAL_VISIBLE_HISTORY`, estimation technique `PROXY_SCENARIO`, et vrais `PROVIDER_REPORTED`. Les noms proposés sont conceptuels et non une prescription immédiate de schéma SQL.

Séparer : (a) canal d'usage `CHATBOT / API / AGENT / LOCAL`, (b) modèle/plateforme s'ils sont connus, (c) mode économique `FREE / PAID_SUBSCRIPTION / PAY_AS_YOU_GO / UNKNOWN`, et (d) caractère observé ou hypothétique des compteurs. Le champ CURRENT `access=API / SUBSCRIPTION / LOCAL_OWNED` ne doit pas être réinterprété silencieusement : une extension rétrocompatible est à définir lors de l'intégration. `SUBSCRIPTION` n'est pas synonyme de « payant », et `API` n'est pas une unité énergétique.

Un scénario manuel couvrant une période et un historique importé couvrant la même activité ne peuvent pas être additionnés sans réconciliation explicite. Un même utilisateur doit pouvoir remplacer/exclure l'estimation initiale, jamais doubler mécaniquement ses résultats.

**STOP du mode rapide** : un visiteur utilisant seulement un chatbot gratuit peut renseigner son activité sans tokens, comprendre ce qui est et n'est pas calculable, explorer un scénario honnête lorsque ses hypothèses sont explicites, et éventuellement l'enregistrer après connexion sans double comptage ni faux statut `MEASURED`.

## 4. Imports particuliers, exports et identité

### Sources à distinguer

| Source | Ce qu'elle établit | Ce qu'elle ne prouve pas | Décision |
| --- | --- | --- | --- |
| ChatGPT, export personnel de conversations JSON | Conversations visibles et métadonnées présentes dans l'export, selon format et couverture | Compteurs internes exacts, cache, raisonnement caché, site GPU, coût marginal | **P1** : adapter dédié après fixture représentative vérifiée ; traiter et minimiser **dans le navigateur**. |
| Claude, export personnel de conversations | Conversations et métadonnées exportables sur les offres individuelles supportées | Compteurs serveur et empreinte complète | **P1** : même règle que ChatGPT, sans inventer une compatibilité de schéma. |
| OpenAI Organization Usage, Anthropic Analytics | Statistiques API déclarées sur un scope d'organisation, projet ou compte autorisé | Attribution automatiquement personnelle, site physique d'inférence | Conserver les parseurs du lot 2 avec provenance `PROVIDER_REPORTED` et scope explicite. |
| Gemini `usageMetadata` | Tokens déclarés pour une réponse API conforme à son schéma | Coût et région d'exécution sans données supplémentaires | Conserver parseur spécifique et test des catégories `thoughts`, `toolUsePrompt` et cache. |
| Codex rollout JSONL | Compteurs techniques si la reconstruction cumulative est vérifiée | Total arbitraire si sessions ou réinitialisations sont confondues ; confidentialité du transcript | Réutiliser l'owner de reconstruction, traiter localement, ne persister que les compteurs utiles. |
| Facture seulement monétaire | Dépense, devise, période si disponibles | Tokens et énergie | Coût seul, tokens/énergie/CO₂e `NA` ; jamais de conversion monétaire en énergie. |

**Précaution centrale** : le support des historiques de particuliers est un objectif **PLAN** supplémentaire du lot 2, pas une preuve que des exports réels ou des parseurs sont déjà compatibles. Les formats peuvent changer. Tester des fichiers synthétiques anonymisés représentatifs, cases d'exports volumineux, multi-fichiers, dates absentes, messages supprimés, pièces jointes, et absence de logs du texte brut. Ne pas annoncer un export Gemini grand public sans preuve.

Conserver les décisions de `02` et `05` : preview avant confirmation, limites bornées, contrôle du scope et de la pagination, identité stable distincte du hash de contenu, révision remplaçant l'ancien état, non-addition requête/bucket et confirmation PostgreSQL atomique owner-scoped. Une période inconnue exclut du total mensuel. Ne jamais réclamer une clé Admin fournisseur sur CleanMyMap.

## 5. Budget, suivi, engagement et B2B

| ID | Décision | Condition d'ouverture ou limite |
| --- | --- | --- |
| PROD-01 | **Budget de tokens** facultatif, fondé uniquement sur les totaux logiques connus et dédupliqués. | Un total partiel est une borne minimale, jamais un total complet. `80 %` est une préférence d'alerte configurable, pas un quota fournisseur. |
| PROD-02 | **Budget monétaire** distinct, par devise et période ; facture et tokens ne sont pas convertibles. | Ne pas cumuler EUR/USD sans taux et date sourcés. Coût marginal d'un abonnement inconnu = `NA`, pas zéro. |
| PROD-03 | **Scénario de seuil énergétique** facultatif et séparé d'un budget de kWh mesurés. | Impossible d'en faire un quota physique vérifié si l'estimation est `PROXY_SCENARIO`. |
| PROD-04 | **Objectif de terrain** éphémère et volontaire aux lots 0/08/4/09. | Aucun nettoyage exigé, dette, compensation, XP ou badge à partir d'une estimation IA. Ancien ratio « cleanwalk de 5 kg » abandonné, y compris dans le lot 3. |
| PROD-05 | **Parts personnelles et gamification** futures, lot 11 : évolution séparée sous preuve. | Pas d'XP sur quantités tant que la révision personnelle, les corrections, le partage estimé et la lutte contre double comptage/farming ne sont pas fiabilisés ; badge de participation réelle déjà géré par l'owner CURRENT. Les seuils 25/100/500/2000 mégots et 1/5/25/100 kg restent `PLAN`, non une activation automatique. |
| PROD-06 | **Entraînement des modèles**, lot 12 : pédagogie distincte de l'inférence individuelle. | Aucun coût d'entraînement ajouté à l'empreinte personnelle, faute d'allocation et de périmètres homogènes. Comparaison énergie/énergie seulement si frontières compatibles. |
| PROD-07 | **Attestation salariée**, lot 14 : preuve personnelle sélectionnée, pas transfert. | L'utilisateur contrôle le partage ; aucun accès durable employeur à ses historiques IA, ni certificat officiel inventé. Un PDF téléchargé n'est pas révocable. |
| PROD-08 | **RSE/entreprises**, lots 15 et 16 : données terrain attribuées, séparées des émissions IA et des impacts évités. | Pilote entreprise/association, droits, règles de réattribution, petit effectif, durée et anonymisation validés avant agrégation et offre payante. Aucune conformité CSRD/ESRS/BEGES automatique. |
| PROD-09 | **Bénéfices multidimensionnels**, lot 18 : trois familles non sommables. | Empreinte IA, bénéfices terrain prouvés/conditionnels, impacts humains et territoriaux observés : aucune unité globale synthétique. |

Le rôle employeur/salarié peut empêcher de retenir librement le consentement comme base juridique. La CNIL exige un examen sérieux des fondements, de la minimisation et des pouvoirs du destinataire ; pas de « partage volontaire » traité comme une preuve automatique de légalité. La Commission a adopté des ESRS révisées **le 3 juillet 2026**, mais ce fait ne démontre ni leur date d'entrée en vigueur ni que CleanMyMap ou un partenaire soit soumis aux obligations. Re-vérifier le cadre applicable au moment du pilote.

## 6. Comparateur de modèles et abonnements, lot 21

**Décision de lancement** : ne pas publier de classement concret d'offres si la comparabilité n'est pas démontrée. À défaut de preuves concordantes sur le même travail, montrer un comparateur méthodologique fictif, avec accès aux preuves et un verdict `NO_DEFENSIBLE_COMBINATION`.

1. Unité fonctionnelle : **tâche réussie** sur le même protocole, capacités bloquantes et benchmarks équivalents ; code, confidentialité, outils, raisonnement et limite de temps contrôlés.
2. Offre réelle : modèle/version **plus** hébergeur/déploiement **plus** région effective prouvée ou ensemble exhaustif documenté. Ne pas inventer de triplet par produit cartésien de catalogues.
3. Énergie et coût : frontières identiques, essais ratés et frais d'outils comptés. Un tarif API par million de tokens et un abonnement mensuel ne sont **pas** deux prix par tâche directement comparables. Les offres aux données manquantes restent hors nuage de points, avec motif.
4. Indicateurs principaux non fusionnés : X `€/tâche réussie`, Y `gCO₂e/tâche réussie`, `Wh/tâche` distinct ; offres admissibles et front de Pareto sans score « vert ». Aucun carbone `location-based` attribué à une région inconnue.
5. Seuil `+15 %` sur le coût comparable : **politique produit provisoire**, pas résultat scientifique. Toutes les offres moins chères sont admissibles. Si le coût de référence est nul, absent ou incompatible, éligibilité relative `NA`.
6. Tolérance de qualité `3 points absolus` : garde-fou provisoire, seulement si l'intervalle de réussite et le niveau de difficulté permettent la comparaison. Une exigence de sûreté ou capacité perdue élimine l'offre indépendamment du prix.
7. Seuil `30 % d'énergie` : étiquette descriptive « nettement moins énergivore », pas critère universel d'admissibilité. Préférence d'environnement `3 % prix/carbone` uniquement comme signal UX si les deux preuves sont établies ; **désactivée par défaut faute de preuves**, sans modifier Pareto.
8. L'utilisateur choisit, aucun reroutage vers fournisseur tiers, aucune transmission de prompts/code, aucune modification du stockage, budget, défis ou XP. Le recalcul de scénario terrain appelle le solveur existant de double seuil, jamais un multiplicateur appliqué aux kg/mégots.

**Prérequis de recherche** : métriques énergie par tâche à frontière connue, taux de succès sur tâches identiques avec intervalles, modèle/version/effort de raisonnement et outils réellement accessibles sur le forfait, coût complet par tâche, possibilité de routage physique vérifiée, date de fraîcheur des offres. Une étude standardisée de GPU ne prouve pas à elle seule l'énergie d'une API commerciale en production.

## 7. Ordonnancement et conditions d'ouverture

| Priorité | Périmètre | Prêt quand | Statut au 22/11/2026 |
| --- | --- | --- | --- |
| **P0** | Clore les validations du lot 1; le complément XL corrige le chemin du formulaire technique classique. | Calcul anonyme, brouillons compatibles avec l’API stricte, stockage privé prouvé par PostgreSQL/RLS A/B et cycle E2E authentifié. | **CODE_PUBLISHED / PARTIEL**. La création/gestion privée et l’estimation rapide sont dans `main`; l’E2E public rapide est confirmé. Le formulaire technique envoie désormais le brouillon, et le serveur normalise après validation stricte; le test UI create-edit et les tests API passent. Les workflows [44975700101](https://github.com/maxd4/CleanMyMap/actions/runs/44975700101) et [44975700144](https://github.com/maxd4/CleanMyMap/actions/runs/44975700144) avaient échoué avant migration, pgTAP/RLS et E2E authentifié. Ces preuves d’intégration restent requises. |
| **P1** | Achever les preuves du lot 2, puis poursuivre le lot 3 et le lot 4 + 09 selon l’ordre des dépendances. | Formats réellement supportés, preview locale, confirmation atomique/idempotente owner-scoped et isolation PostgreSQL/E2E vérifiées. | **CODE_PUBLISHED / PARTIEL**. Parseurs, preview, API/RPC et corrections d’identité sont publiés (`d035f6ee`, `e06cbeaf`); les formats d’import effectivement proposés sont décrits dans la fiche CURRENT de la page. Les exports personnels de conversations ChatGPT/Claude restent non supportés en attente de fixtures représentatives. Les preuves PostgreSQL/RLS et E2E authentifiées ne sont pas obtenues : les deux workflows cités au P0 ont bloqué avant les tests métier. |
| **P2** | Lots 10/11/12/18 : pédagogie, engagement et analogies. | Couverture scientifique, données individuelles vérifiables, absence de récompense sur hypothèse. | **PLAN**, chaque lot garde ses dépendances métier. |
| **P2 conditionnelle** | Lots 14/15/16 et 21 : attestations/RSE et offres IA. | Pilotes, autorisations, cadre réglementaire vérifié, protocoles de mesure et jeu d'offres réelles comparables. | **PLAN**, ne pas implémenter seulement parce que des candidats existent. |

**Ordre technique des dépendances** conservé par défaut : `0+08 -> 1 -> 2 -> 3 -> 4+09 -> 11 -> 12 -> 10 -> 14 -> 15 -> 16 -> 18 -> 21`. Le mode rapide publié reste une extension de la page et de l’owner du lot 1, sans nouvelle dépendance ni table. La priorité fonctionnelle n’autorise pas à sauter l’ordre technique; les exports personnels non qualifiés restent PLAN.

**État et preuves du complément XL (22 novembre 2026)** : `personal-ai-declaration-client.tsx` envoie le brouillon HTTP brut en création comme en modification; `personal-ai-declaration-http.ts` reste l’owner de la normalisation après parsing `.strict()`. Régression UI create-edit et tests ciblés Personal AI : PASS; typecheck Web, lint des fichiers touchés et E2E public rapide : PASS. La couverture ciblée est rapportée dans le bilan du lot, sans seuil ni baseline modifiés. Les workflows [E2E éphémère](https://github.com/maxd4/CleanMyMap/actions/runs/44975700101) et [preuve SQL](https://github.com/maxd4/CleanMyMap/actions/runs/44975700144) avaient échoué à `Start ephemeral Supabase`, avant migrations, pgTAP/RLS, concurrence ou E2E authentifié; **DB_SEMANTICS_NOT_EXECUTED**, aucune application distante n’est démontrée. L’E2E authentifié et PostgreSQL restent bloqués jusqu’à une exécution effective dans la lane autorisée. La CI standard [44975700083](https://github.com/maxd4/CleanmyMap/actions/runs/44975700083) avait validé typecheck, lint, build et tests ciblés, mais sa suite complète avait échoué sur `mixed-division-smoke.contract.test.ts`, hors des fichiers Personal AI.

## 8. Recherches et avis humains restant nécessaires

| Demande de preuve ou avis | Question précise | Décision en attendant |
| --- | --- | --- |
| Chercheur en énergie des systèmes numériques / ACV | Quels facteurs et intervalles sont reproductibles par type de tâche, modèle, phase et frontière ? Comment calibrer les messages visibles ? | Scénarios non calibrés, aucune prétention d'empreinte précise. |
| Opérateur de tri/recyclage et organisateur d'actions | Quelles masses, destinations, parts de matière réincorporée et durées sont réellement observables ? Peut-on vérifier le CO₂ de la filière mégots ? | Efforts editables ; ACV conditionnelle/NA. |
| Test UX qualitatif de particuliers utilisant gratuits et abonnements | Le visiteur comprend-il la différence entre messages visibles, tokens estimés, énergie hypothétique et empreinte mesurée ? | Test indicatif de 6 à 10 personnes variées, sans prétention de validation statistique. |
| DPO/juriste et organisme pilote | Quelle base légale, quelle audience, quelle durée, quelle maîtrise du consentement et quel contrôle d'attestation sont possibles en présence d'un employeur ? | Aucune vue employeur de données individuelles privées, aucune attestation officielle présumée. |
| Benchmarks comparables des offres IA | Même difficulté, succès, outils, délai, niveau de raisonnement, coût, énergie et région de traitement vérifiés ? | Aucun classement réel ni gain fournisseur inventé. |

Aucune recherche externe supplémentaire n'est indispensable pour implémenter les invariants de confidentialité, la distinction `NA/0`, les tests de la frontière HTTP et le traitement local des données : les contrats existants suffisent. En revanche, une mise à jour du **facteur** quantitatif ou une recommandation concrète de fournisseur exige sa preuve spécifique.

## 9. Sources primaires consultées le 22 novembre 2026

Les documents externes étayent uniquement les assertions qui leur sont attribuées. Ils ne prouvent pas les fixtures synthétiques, les chiffres de rendement terrain, la région d'inférence d'un utilisateur ou l'état de production CleanMyMap.

- AIE, *Key Questions on Energy and AI* (16 avril 2026), usages énergivores selon tâche : https://www.iea.org/reports/key-questions-on-energy-and-ai
- Google Cloud, *Measuring the environmental impact of AI inference*, 0,24 Wh pour le prompt textuel médian Gemini Apps en mai 2025, périmètre spécifique : https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference
- RTE, *Bilan électrique 2025, Émissions*, 20,0 gCO₂e/kWh consommation et 19,6 gCO₂e/kWh production en émissions directes : https://analysesetdonnees.rte-france.com/bilan-electrique-2025/emissions
- ADEME, *Que faire de mon mégot de cigarette ?*, risque potentiel jusqu'à 500 L par mégot : https://quefairedemesdechets.ademe.fr/dechet/megot-de-cigarette/
- ADEME, *Bilan national du recyclage, verre*, unité par tonne de matière première recyclée **incorporée** : https://economie-circulaire.ademe.fr/bnr/verre
- OpenAI Help Center, export des conversations et données personnelles JSON : https://help.openai.com/fr-fr/articles/7260999-exporting-your-chatgpt-history-and-data
- Anthropic Help Center, export de données Claude individuelles : https://support.claude.com/fr/articles/9450526-exportez-vos-donnees-claude
- OpenAI, *Organization Usage Completions API*, besoin d'une clé administrateur : https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions
- GHG Protocol, *Estimating and Reporting Avoided Emissions*, déclaration séparée des impacts évités : https://ghgprotocol.org/estimating-and-reporting-avoided-emissions
- CNIL, *Le contrôle de l'activité des personnes employées* : https://cnil.fr/fr/controle-de-lactivite-des-personnes-employees
- Commission européenne, *Revised sustainability reporting standards*, adoption le **3 juillet 2026**, sans présumer de l'entrée en vigueur : https://finance.ec.europa.eu/news/commission-adopts-revised-sustainability-reporting-standards-reduce-administrative-burdens-eu-2026-07-03_en

## 10. STOP documentaire

Ce document clôt l'arbitrage **PLAN**, pas les travaux de runtime. Son intégration correcte référence les lots sans copier les matrices, confronte leurs statuts au code et aux preuves de `main`, conserve l'ordre des dépendances et retire du lot 3 toute équivalence en nombre de cleanwalks de 5 kg. Les fonctionnalités non livrées restent PLAN; aucune fiche CURRENT n'annonce une validation ou une capacité absente.
