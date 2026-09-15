# Historique des actions - Présentation détaillée

## Fiche canonique

- **Route** : `/actions/history`
- **Dossier canonique** : `actions-history`
- **Rôle** : relire et superviser l'historique des enregistrements accessibles, en priorisant les lignes dont la qualité ou la traçabilité doit être corrigée.
- **Périmètre** : page protégée avec aperçu public flouté avant authentification, rappel de complétion non bloquant, liste paginée de 25 lignes par défaut, filtres de statut (`all`, `pending`, `approved`, `rejected`), grade qualité (`A`, `B`, `C`), priorité « à corriger » et recherche par bénévole ou lieu.
- **États à documenter** : chargement, absence de résultats, erreur/état partiel des sources, liste filtrée, détail sélectionné, preuve photo chargée explicitement ou refusée, audit accessible ou absent, export PDF disponible uniquement pour les lignes approuvées filtrées.
- **Composants concernés** : `ActionsHistoryList`, tableau filtrable, détail qualité et contexte opérationnel, `SignalementMediaProofs`, `OperationAuditTimeline`, gestion de participation lorsque l'utilisateur est autorisé, `RubriquePdfExportButton`.
- **Notes d'audit** : la page expose les dates, acteurs, lieux, types, mesures, statuts et qualité calculée/contractuelle. Le détail peut afficher les recommandations et flags qualité, le contexte opérationnel, les preuves photo d'un signalement après action explicite, ainsi que l'audit des opérations pour un profil admin-like ou le créateur. L'export reprend les lignes approuvées du filtre courant. La page propose les entrées `/actions/new` et `/reports`; aucune préconfiguration d'un rapport d'impact par action n'est actuellement implémentée, cette idée est conservée dans le document PLAN.
