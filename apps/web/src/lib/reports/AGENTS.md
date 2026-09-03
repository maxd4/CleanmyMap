# Gouvernance locale — Reports

Cette frontière hérite de `AGENTS.md` à la racine et de `apps/web/AGENTS.md`.
Elle complète ces règles pour les calculs et restitutions de rapports.

## Modèle canonique

- `ReportModel`, calculé par `computeReportModel`, est la source commune des
  restitutions. Préserver ses contrats, sa provenance, ses unités, sa
  disponibilité et ses règles de calcul.
- Ne jamais inventer une métrique ni transformer une donnée absente,
  indisponible ou inconnue en `0`. Conserver explicitement les distinctions
  entre valeur mesurée, valeur calculée, absence et non-disponibilité.
- Respecter la frontière publique documentée par
  `report-model/README.md` : `@/lib/reports/report-model` pour le modèle et
  les imports directs du module propriétaire pour les builders, métriques,
  formatters, helpers, math et types spécialisés.

## Restitutions

- Éviter tout calcul divergent entre PDF, HTML, CSV, UI et master-pack ; les
  consommateurs formatent ou présentent le modèle canonique en conservant
  ses unités, arrondis, scopes et règles de disponibilité.
- Privilégier l'import depuis le propriétaire canonique existant. Ne pas
  ajouter de barrel artificiel pour raccourcir les chemins d'import ni
  contourner le check de frontière `report-model`.

## Protection du contrat

- Maintenir les tests du modèle et de sa disponibilité, ainsi que les tests
  de page-data, export/CSV, payload, historique et analytics qui vérifient la
  cohérence des restitutions communes.
