# Historique terrain - Présentation détaillée

## Fiche canonique

- **Route** : `/actions/history`
- **Dossier canonique** : `actions-history`
- **Rôle** : consulter les enregistrements accessibles, leur qualité et les corrections à effectuer.
- **Accès** : route protégée par le proxy Clerk ; l'authentification est requise avant l'accès à la page. Le `ClerkRequiredGate` interne peut rester une défense/fallback, sans constituer un aperçu public de production.
- **Périmètre** : rappel de complétion non bloquant, liste paginée de 25 lignes par défaut, filtres de statut (`all`, `pending`, `approved`, `rejected`), grade qualité (`A`, `B`, `C`), priorité « à corriger » et recherche par bénévole ou lieu.
- **États à documenter** : chargement, absence de résultats, erreur/état partiel des sources, liste filtrée, détail sélectionné, preuve photo chargée explicitement ou refusée, audit accessible ou absent, export PDF disponible uniquement pour les lignes approuvées filtrées.
- **Composants concernés** : `ActionsHistoryList`, tableau filtrable, détail qualité et contexte opérationnel, `SignalementMediaProofs`, `OperationAuditTimeline`, gestion de participation lorsque l'utilisateur est autorisé, attribution individuelle post-action des participants confirmés, `RubriquePdfExportButton`.
- **Notes d'audit** : la page expose les dates, acteurs, lieux, types, mesures, statuts et qualité calculée/contractuelle. Le détail peut afficher les recommandations et flags qualité, le contexte opérationnel, les preuves photo d'un signalement après action explicite, ainsi que l'audit des opérations pour un profil admin-like ou le créateur. L'export reprend les lignes approuvées du filtre courant. La page propose les entrées `/actions/new` et `/reports`; aucune préconfiguration d'un rapport d'impact par action n'est actuellement implémentée, cette idée est conservée dans le document PLAN.
- **Attribution individuelle** : dans la gestion post-action, l'organisateur réel ou un administrateur autorisé peut laisser chaque participant confirmé en quote-part automatique ou enregistrer une mesure individuelle. L'interface expose la masse brute, la condition, la méthode, le nombre ou la masse brute de mégots, leur condition, la provenance et, lorsqu'elle existe, la dérivation utilisée pour Mohs. Les participations non confirmées et les participants ordinaires ne peuvent pas modifier ces valeurs. Les mesures sont validées côté serveur, conservées sur `action_participants` et auditées avec avant/après, acteur, action et cible.
