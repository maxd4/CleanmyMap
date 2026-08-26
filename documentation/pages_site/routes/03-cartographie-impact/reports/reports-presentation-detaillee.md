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
- **Composants concernés** : `ReportsImpactReadingsSection`,
  `AnimatedImpactMetrics`, `AnalyticsCockpit`, `KpiMethodBlock` et les flux de
  génération/export existants.
- **Notes d'audit** : le snapshot sépare les indicateurs d'impact calculés par
  proxy des indicateurs de qualité et de couverture. `ReportModel`, les
  calculateurs d'impact et `IMPACT_PROXY_CONFIG` restent les sources de vérité;
  aucune formule parallèle ni cible statique n'est ajoutée.
