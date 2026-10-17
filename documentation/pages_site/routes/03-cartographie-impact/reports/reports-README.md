# Rapports d’impact : index documentaire

Ce dossier sépare les contrats observables (`CURRENT`), les évolutions encore proposées (`PLAN`) et les liens historiques (`COMPATIBILITY`). Le runtime et ses tests priment sur toute formulation documentaire.

## `CURRENT`

- [Master Pack](../../../../features/reports/master-pack.md) : **repère de chapitres**, borné aux constantes et à leurs consommateurs vérifiés. Il n'est pas la preuve que le PDF produit par `/reports` contient exactement ces chapitres.
- [Présentation détaillée](./reports-presentation-detaillee.md) : parcours, surfaces et limites fonctionnelles de la page.
- Cette fiche est la référence canonique de `/reports` : accès, onglets, modules réellement exposés, quota, historique et états.
- **Modèle et calculs :** `apps/web/src/lib/reports/report-model/` et `apps/web/src/lib/reports/master-pack/`, selon les consommateurs réels.
- **Génération et historique `/reports` :** `apps/web/src/components/reports/reports-web-document.tsx`, `apps/web/src/lib/pdf-export/`, `apps/web/src/app/api/reports/generations/` et tests associés. Les frontières client/serveur comptent pour la confiance accordée aux résultats.
- **Génération multi-actions CURRENT :** `POST /api/reports/generations` reçoit une entrée `multi_action` typée avec période, scope et composition uniquement. Le corpus public exige `approved`, `visible`, publié et `post_action_complete`, est chargé par pages stables dans le budget configuré, et toute projection indispensable absente ou page en erreur provoque un refus fail-closed. La couverture communautaire distingue une source indisponible d'un corpus partiel ; une limite atteinte est signalée et ne produit pas de KPI présentés comme exhaustifs. Les événements, filtres et KPI sont résolus et calculés côté serveur depuis les sources canoniques ; les KPI ou snapshots envoyés par le navigateur sont rejetés.
- **Rendu livré :** `/reports` ouvre le HTML imprimable officiel depuis le snapshot validé. Si la fenêtre est bloquée ou si le rendu échoue après persistance, l'interface affiche un échec explicite et la génération reste relisible depuis l'historique ; aucun PDF simplifié avec perte n'est substitué automatiquement.
- **Périodes CURRENT :** `thirty_days`, `three_months`, `six_months`, `twelve_months`, `current_year`, `full_history` et `custom_range`. Une période personnalisée porte des bornes civiles inclusives `YYYY-MM-DD`, interprétées en UTC sur la date métier `dates.observedAt`.
- **Scopes CURRENT :** `global`, `account`, `association` et `arrondissement`. Un scope est accepté seulement s'il existe dans le corpus public résolu côté serveur. Un nom d'association n'établit aucune appartenance organisationnelle ni permission privée ; faute de relation canonique dans `community_events`, les indicateurs d'événements d'un scope association restent explicitement non attribuables (`n/a`).
- **Niveaux de détail CURRENT :** `concis`, `default` et `exhaustif` produisent des compositions PDF distinctes avec les mêmes calculateurs et KPI communs. `concis` privilégie les résultats essentiels, `default` conserve la composition de référence et `exhaustif` ajoute les sources, limites et données complémentaires des modules activés. Le sélecteur est accessible dans la configuration et indépendant des quatre modules.
- **Hiérarchie PDF CURRENT :** le renderer officiel reprend, lorsque les données sont disponibles, la séquence synthèse exécutive, résultats terrain, périmètre/identification, impacts et proxys qualifiés, qualité/couverture, méthode et limites, puis annexes ou données complémentaires pertinentes ; cartographie, contexte et communauté s'insèrent uniquement lorsqu'un module les active. La composition est produite par `buildPdfData()` et non par les constantes Master Pack. Un module désactivé est absent ; un calendrier ou une annexe sans ligne utile n'est pas remplacé par un chapitre vide. Les recommandations opérationnelles génériques ne sont pas présentées comme des décisions validées.
- **Sémantique et partage CURRENT :** les valeurs calculées, les proxys et les données indisponibles sont distingués dans les libellés et les limites. CO2e, eau, voirie et surface sont des proxys et ne sont pas présentés comme des mesures physiques directes. Une valeur RSVP « oui » décrit une réponse déclarée, pas une présence constatée. Les noms du leaderboard et les identifiants privés ne sont pas exportés dans le document partageable.
- **Entrée mono-action :** depuis `/actions/history`, une action `action` terminée, approuvée, publiée et visible ouvre ce même générateur avec un scope typé `single_action`. Le serveur résout l'action depuis `public.actions`, rejette un changement de statut/visibilité ou une fraude d'identifiant, et réserve le quota une seule fois avant la persistance du snapshot.
- **Relecture :** la première page affichée est un aperçu partiel, distinct du PDF complet. « Mes rapports récents », « Voir » et « Télécharger à nouveau » relisent le snapshot serveur ; la relecture ne recalcule pas les données actuelles et ne consomme pas de nouveau quota.
- **Snapshots CURRENT :** toute nouvelle génération est un snapshot JSON `snapshotSchemaVersion: 2` complet et cohérent. `snapshotMetadata` conserve le template `reports-template-v1`, le renderer HTML officiel `official-report-html-v1`, `generatedAt`, la période et ses bornes UTC, le scope résolu, le niveau, les modules, la provenance canonique, les versions proxy/règles qualité réellement produites et la disponibilité des sources. Les snapshots legacy sans version ou v1 sont lus comme compatibilité historique ; un snapshot v2 incomplet ou incohérent est refusé explicitement.
- **Reproductibilité :** la relecture garantit une reproductibilité sémantique des données et libellés du snapshot, pas une reproduction binaire octet pour octet : le PDF n’est pas stocké et le renderer peut évoluer. « Télécharger à nouveau » ne crée ni génération, ni quota, ni mise à jour d’une ligne existante.
- [Paramètres de génération](../../../../features/reports/reports-generation-parameters.md) : contrat CURRENT de filtrage des rapports multi-actions ; les familles avancées non exposées restent explicitement PLAN dans ce document.
- [Deux thèmes PDF et réutilisation scientifique](../../../../features/reports/report-pdf-themes-and-reuse.md) : contrat CURRENT de deux habillages, Impact et Scientifique, appliqués à une composition logique unique. Le sélecteur est indépendant du niveau de détail et des modules ; le thème reste une présentation côté client, n'est pas envoyé à la génération métier et n'est pas ajouté au snapshot. « Voir » et « Télécharger à nouveau » peuvent repeindre le même snapshot historique avec le thème choisi, sans recalcul ni quota. Les capacités de citabilité et d'export machine restent PLAN.

## `PLAN`

- [Objectifs et progression](../../../../features/reports/impact-goals-and-progression.md) : **autre responsabilité métier**, objectifs persistants, progression collective et surface UX restant à arbitrer.
- [Propositions propres à `/reports`](./reports-liste-propositions-a-traiter.md) : futur versionnement et générations dérivées ; l'ancien périmètre `single_action` y est marqué livré.
- [Roadmap priorisée](../../../../product/roadmap-priorisee.md) : ordre et conditions de clôture des chantiers.

## `COMPATIBILITY`

- [Paramètres et objectifs historiques](../../../../features/reports/reports-parameters-and-objectives.md) : ancien index maintenu comme compatibilité, sans seconde source de vérité.

## Frontières non négociables

- Une fonction présente dans le code ne suffit pas à prouver qu'elle est appelée par la page `/reports`.
- Le snapshot de données historiques et l'identité binaire du PDF sont deux garanties différentes ; seule la reproductibilité sémantique du snapshot est livrée.
- Le scope `single_action` exige une résolution canonique côté serveur et reste verrouillé sur l'action choisie ; les chiffres fournis par le client ne prouvent pas une action réelle.
- Une fenêtre tronquée ou une source optionnelle indisponible reste signalée dans le snapshot ; la source canonique des actions doit être disponible et une fenêtre sans action admissible est refusée avant quota.
- Le corpus multi-actions n'est pas substitué par une projection legacy : si `moderation_visibility`, `published_at` ou `action_phase` ne sont pas vérifiables, aucune génération exhaustive n'est produite.
- Ni les cibles d'objectifs, ni les campagnes ni les nouvelles migrations proposées ne sont requises pour le premier rapport mono-action.
