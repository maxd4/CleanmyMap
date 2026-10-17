# Rapports d'impact - Présentation détaillée

## Fiche canonique

- **Route** : `/reports`
- **Dossier canonique** : `reports`
- **Rôle** : comparer une fenêtre d'actions validées, lire les indicateurs
  calculés et accéder à la méthode KPI selon les droits du profil.
- **Périmètre** : synthèse du `ReportModel`, tendances mensuelles, méthode,
  événements, génération et exports détaillés. La météo et la logistique sont
  hors du contrat Reports.
- **États à documenter** : visiteur anonyme avec synthèse publique légère, compte connecté,
  profil incomplet, génération accessible au compte connecté, quota quotidien déjà consommé,
  indisponibilité explicite
  d'Analyse ou de l'historique, et données optionnelles indisponibles.
- **Composants concernés** : `ReportsAnalysisDashboard`, `AnalyticsCockpit`,
  `KpiMethodBlock`, `ReportsPageTabs` et les flux de génération/export
  existants.
- **Notes d'audit** : le snapshot sépare les indicateurs d'impact calculés par
  proxy des indicateurs de qualité et de couverture. `ReportModel`, les
  calculateurs d'impact et `IMPACT_PROXY_CONFIG` restent les sources de vérité;
  aucune formule parallèle ni cible statique n'est ajoutée. Le référentiel KPI
  conserve les 8 `MethodDefinition` runtime : le KPI et sa formule sont visibles
  dans une grille compacte, tandis que la source, le recalcul et les limites
  sont disponibles dans un disclosure accessible. Aucun statut live/audit ni
  lien documentaire sans destination n'est affiché. Les tendances restent
  limitées aux séries réellement produites par `aggregateMonthlyAnalytics`;
  les valeurs de comparaison proviennent de `overview.summary.kpis`. Cet
  overview conserve l'historique Pilotage ; les totaux et la qualité/cartographie
  Analyse sont dérivés des contrats de la fenêtre courante `[now - periodDays,
  now]`, avec `dates.observedAt` comme date métier et un même `now` pour le
  filtrage et le calcul. La tendance est une série historique distincte sur
  12 mois glissants, tandis que la comparaison oppose la fenêtre courante aux
  90 jours précédents selon les bornes de `computePilotageComparison()`.

  La Génération conserve trois paramètres distincts : période, périmètre et
  niveau de détail. Le sélecteur accessible expose `concis`, `default` et
  `exhaustif` avec une description courte. `concis` conserve les résultats,
  unités, périmètre et limites essentielles tout en omettant les détails
  tabulaires ; `default` conserve la composition de référence ; `exhaustif`
  ajoute les sources, limites, séries et données complémentaires disponibles
  dans les modules activés. Les trois niveaux utilisent les mêmes calculateurs
  et ne sélectionnent, ne désélectionnent ni ne verrouillent aucun module.
  `detailLevel` reste conservé dans les payloads, l'API, l'historique et les
  snapshots pour compatibilité.
  Un `ModuleState` unique porte la composition sélectionnée par les cases de
  modules pour le preview et le résumé,
  `buildPdfData()` et le PDF. Les trois chapitres cœur restent présents à tous
  les niveaux ;
  `dataAndCartography`, `transparencyAndMethods`, `rawData` et
  `detailedFiles` contrôlent respectivement leur contenu cartographique,
  transparence/méthodes, données brutes et annexes. Un module désactivé est
  réellement absent, sans placeholder. Les tableaux complémentaires du niveau
  exhaustif n'apparaissent que lorsque leur module est activé.

  Dans le document imprimable, la composition lisible suit la hiérarchie
  synthèse exécutive, résultats terrain, périmètre/identification,
  impacts/proxys, qualité/couverture, méthode/limites, puis annexes ou données
  complémentaires lorsqu'elles contiennent réellement des lignes utiles.
  `buildOfficialReportHtml()` rend le `PdfReportPayload` issu de
  `buildPdfData()` avec son sommaire ancré. Le chapitre de recommandations
  génériques n'est pas produit ; les valeurs RSVP sont explicitement décrites
  comme des réponses et non comme des présences. Les tableaux partageables
  n'exposent pas les noms du leaderboard ni les identifiants privés.

  Le périmètre typé `single_action` de la génération accepte uniquement
  `{ input: { type: "single_action", actionId }, detailLevel, modules }`.
  L'identifiant est résolu côté serveur contre `public.actions` ; seuls une
  action approuvée, terminée, publiée et explicitement visible sont
  admissibles. Le payload et les chiffres envoyés par le navigateur sont
  exclus de ce chemin. Le snapshot est construit avec le `ReportModel` et le
  composeur PDF commun, porte la provenance `public.actions` et l'identifiant
  canonique, puis est persisté avec `scope_kind = single_action`. Dans le PDF,
  le chapitre de périmètre affiche séparément cet identifiant canonique et le
  titre lisible de l'action ; les identifiants Clerk et les données de
  préparation privées ne sont pas exportés. Les valeurs manquantes restent
  `n/a`/inconnues et les indicateurs dérivés restent étiquetés comme proxies.

  Le parcours `multi_action` accepte les scopes `global`, `account`,
  `association` et `arrondissement`, ainsi que les périodes de 30 jours, 3
  mois, 6 mois, 12 mois, année en cours, historique complet et intervalle
  personnalisé. Pour ce dernier, `from` et `to` sont des dates civiles
  inclusives `YYYY-MM-DD`, interprétées en UTC sur `dates.observedAt`. Le
  navigateur transmet uniquement cette sélection et la composition des
  modules ; le serveur recharge les actions publiques admissibles depuis les
  sources canoniques, vérifie le scope contre ce corpus, filtre les événements
  et calcule le `ReportModel` et le PDF communs. Un nom libre d'association ne
  constitue ni une appartenance ni une permission privée, et une fenêtre sans
  action admissible est refusée avant quota.

  L'aperçu navigateur reçoit une projection publique de cette action : les
  identifiants privés et les données internes de préparation, notamment les
  notes logistiques et les formalités, restent côté serveur. La projection
  réutilise l'allowlist publique cartographique existante ; le contrat complet
  reste réservé à la résolution et aux calculs serveur.

  L'historique « Mes rapports récents » ne contient que les générations réellement
  persistées par le compte connecté dans `public.report_generations`, au maximum
  les 12 plus récentes de ce compte.
  Il expose le titre, la période, le périmètre, le niveau de détail et la date
  réelle. L'état vide affiche « Aucun rapport généré ». Le snapshot JSON final
  et les modules sont stockés sans binaire PDF ; le quota est réservé côté
  serveur avant le rendu du document dans la fenêtre préouverte. Les actions « Voir » et « Télécharger à
  nouveau »
  chargent le snapshot par ID à la demande. Les nouvelles générations portent
  un snapshot v2 avec métadonnées de template, renderer, provenance, période,
  scope, modules et disponibilité des sources ; les snapshots legacy restent
  lisibles ou sont rejetés avec une erreur d'incompatibilité explicite. Elles rendent ce payload immuable
  dans le document HTML imprimable sans relire les données actuelles, en
  conservant son `generatedAt` et son filename ; « Télécharger à nouveau »
  ouvre également ce document pour impression, au lieu d'annoncer un
  téléchargement binaire. Cette relecture ne crée pas de nouvelle génération,
  ne consomme pas de nouveau quota et aucune durée de conservation n'est
  annoncée. L'aperçu est fermé par défaut et rend uniquement la première
  page via `ReportCover`, jamais un aperçu complet du PDF. Une couverture
  tronquée est signalée comme partielle avec sa plage réellement disponible.

  La requête de liste ne charge que les métadonnées nécessaires à l'affichage :
  `id`, `generated_at`, `title`, `period_id`, `scope_label` et `detail_level`.
  Le snapshot et les modules ne sont pas lus dans cette liste ; la route
  `GET /api/reports/generations/[id]` les charge uniquement pour l'action
  historique demandée par l'utilisateur et vérifie l'ownership par
  `created_by_clerk_id`.

  Les exports détaillés sont accessibles à tout compte connecté, sans rôle
  administratif supplémentaire. Ils portent sur des données non sensibles,
  sont limités à un export par jour civil Europe/Paris et n'ont pas de limite
  volontaire de période, de nombre de lignes ou de longueur. Le quota est une
  protection serveur atomique ; il ne repose jamais sur `localStorage` ou sur
  l'état visuel du bouton.
