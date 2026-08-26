# Rapports d'impact - Présentation détaillée

## Fiche canonique

- **Route** : `/reports`
- **Dossier canonique** : `reports`
- **Rôle** : comparer une fenêtre d'actions validées, lire les indicateurs
  calculés et accéder à la méthode KPI selon les droits du profil.
- **Périmètre** : synthèse du `ReportModel`, tendances mensuelles, méthode,
  événements, météo, génération et exports autorisés.
- **États à documenter** : visiteur anonyme avec aperçu flouté, compte connecté,
  profil incomplet, accès génération réservé, données de repli en cas d'échec
  de chargement.
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
