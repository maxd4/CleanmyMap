# Product — Guide IA

Point d'entrée de la documentation produit CleanMyMap.

La source de référence pour le positionnement, les publics, la boucle produit
et les limites déclaratives est [`vision-et-objectifs.md`](./vision-et-objectifs.md).
Les documents spécialisés décrivent ensuite leur contrat propre : ils ne
doivent pas transformer un objectif en résultat mesuré, une capacité planifiée
en fonctionnalité disponible, ni une relation UX en permission serveur.

Repères transversaux à conserver dans toute la documentation produit :

- le web reste la surface fonctionnelle complète ; le mobile est en
  développement actif et n'est pas prêt pour la production ;
- l'intégration SPOGOMI est partielle et aucun partenariat officiel n'est
  démontré sans preuve indépendante ;
- les bilans spécialisés ne sont pas tous disponibles ;
- l'inclusion sociale et les bénéfices liés à l'activité physique restent des
  objectifs, sans résultat social mesuré déclaré.

## Sources principales

### Vision et stratégie

- `vision-et-objectifs.md` — vision globale et positionnement du projet ;
- `business-model.md` — hypothèses économiques et critères de validation (`PLAN`) ;
- `roadmap-priorisee.md` — priorités produit ;
- `roadmap-priorisee-long.md` — historique détaillé (`HISTORY`), conservé pour son contexte et ses critères, sans autorité sur l'ordre courant ;
- `dimension-communautaire.md` — continuité d'engagement ;
- `chantiers-q2-q3.md` — chantiers structurants.

### Utilisateurs et parcours

- `parcours-utilisateurs.md` ;
- `coherence-mobile-first.md` ;
- `matrice-rubriques.md`.

### Gamification

- `gamification-non-competitive.md` ;
- `objectifs-valides.md` ;
- `gamification-inventory.md` ;
- [`GAMIFICATION_BADGES_PRODUCT_DECISIONS.md`](./GAMIFICATION_BADGES_PRODUCT_DECISIONS.md) — décision produit sur l’identité visuelle de la gamification, ses choix et non-choix, avec implémentation gelée jusqu’à la convergence fonctionnelle ;
- mémoire locale des idées écartées dans la fiche canonique de la rubrique.

### Méthodologie

- `SCIENTIFIC_PROTOCOL.md` ;
- `methodologie-carte-actions.md` — lecture de la carte d'actions, score constaté, projection de re-pollution, couleurs, géométries et limites ;
- [`couverture-gps-multi-groupes.md`](./couverture-gps-multi-groupes.md) — spécification `PLAN / TARGET` ; elle référence le socle `CURRENT` déjà livré et sépare les extensions scientifiques encore ciblées ;
- documentation de méthodologie et impact dans les dossiers techniques ou les fiches de page concernées.

### Vocabulaire

- [`ubiquitous-language.md`](./ubiquitous-language.md) — termes métier
  transversaux et ambiguïtés à éviter.

### Documents entrepreneuriaux et financiers externes

Les documents de travail SNEE / Pépite sont conservés dans le dossier Google
Drive [`CMM-SNEE-PEPITE`](https://drive.google.com/drive/folders/1_J2yZOlHlpmsRKM3GBNV8YzxdR2B49bH).
Ils sont évolutifs et peuvent contenir des hypothèses, des budgets et des
éléments administratifs non définitifs. Ils ne constituent pas, à eux seuls,
des preuves de dépenses, de recettes, de conventions ou de partenariats
réalisés. Leur consultation dépend des permissions accordées dans Google
Drive.

Documents SNEE / Pépite :

- [01 — Business plan CleanMyMap — SNEE](https://docs.google.com/document/d/1qdJ4QwXNLmTPhD7oCDBB99nt8dCsKFILXgioLpC5uWA/edit) — cadrage du projet et du business plan ;
- [02 — Modèle économique et offres pilotes](https://docs.google.com/document/d/1M_wXjHaXkBhgWoP9WvoQbC3lXKq9tSVCsMk5o-dHFXY/edit) — hypothèses de modèle économique et offres à tester ;
- [03 — Étude de marché et validation des besoins](https://docs.google.com/document/d/1addD06lpVTIW61ecVFGZDLNyBba8a8VFrh0NfWXQ6fQ/edit) — recherche de marché et validation des besoins ;
- [04 — Prévisionnel financier et plan de financement](https://docs.google.com/document/d/1FYk5GDypDoxJudGrLrlVLYYy6hQghq66fD_1jOTv7gA/edit) — prévisions financières et financement envisagé ;
- [05 — Journal comptable et justificatifs](https://docs.google.com/document/d/1M0b6IoPi2BwkMY6dqIMl70TulKQB3Vv4hb4hpnlYqfk/edit) — suivi comptable préparatoire et pièces associées ;
- [06 — Feuille de route entrepreneuriale SNEE](https://docs.google.com/document/d/1eY-ib8GxGkvZcGjtknouORV5xj8uBIlXUR1LZ8t1AGI/edit) — suivi de l’accompagnement et prochaines étapes.

Documents complémentaires Culture-ActionS, référencés séparément du dossier
SNEE / Pépite :

- [Budget prévisionnel Culture-ActionS](https://docs.google.com/document/d/1qRPhuPlW8lhWzOKWuze4p42jQxP4oWhpV-7mK_qBgOc/edit) ;
- [Demande de subvention Culture-ActionS](https://docs.google.com/document/d/1dAUNhdI2-BlVqfhAVMP5v2MF1VdjTioWlzOxIWfStak/edit).

Ces documents ne remplacent pas les sources canoniques du dépôt pour le
comportement du produit, son architecture, sa stratégie produit durable ou
son statut juridique. Une subvention demandée, un budget prévisionnel, un prix
exploratoire ou une collaboration envisagée ne doivent pas être présentés
comme acquis, réalisés, validés ou signés sans preuve indépendante.

## Hiérarchie de lecture

Pour une fonctionnalité :

1. `vision-et-objectifs.md` ;
2. `roadmap-priorisee.md` ;
3. fiche canonique de la page dans `documentation/pages_site/` ;
4. audit ou document produit spécialisé s'il existe ;
5. documentation technique correspondante.

Pour une question de modèle économique :

1. `business-model.md` pour les hypothèses produit et la stratégie en cours ;
2. `pages_site/routes/04-reseau-discussions/funding/` pour le comportement réel de la page et des moyens de contribution ;
3. `legal/` pour l'état juridique et fiscal réellement établi.

## Source de vérité par type d'information

| Information | Source |
|---|---|
| Vision et positionnement | `vision-et-objectifs.md` |
| Modèle économique en construction | `business-model.md` |
| Priorité globale | `roadmap-priorisee.md` ou backlog global canonique |
| Rôle d'une page | `pages_site/` |
| Décision technique | `architecture/adr/` |
| Sécurité | `security/` |
| UI | `design-system/` |
| Contrat de données | code + `architecture/data-governance.md` |
| État juridique | `legal/` |

Ne pas utiliser un ancien audit comme source supérieure au code réel.

## Principes produit

### Action utile

La plateforme doit raccourcir le passage entre :

```txt
besoin visible
→ préparation
→ action
→ déclaration
→ preuve
→ coordination
```

### Données transparentes

Les chiffres d'impact doivent être :

- sourcés ;
- distingués entre mesure et estimation ;
- accompagnés de limites ;
- reproductibles lorsque possible.

### Visual first, sans décoration gratuite

Les visuels doivent aider à :

- comprendre ;
- comparer ;
- décider ;
- agir.

Une page métier ne doit pas devenir une landing page décorative.

### Mobile robuste

Les parcours terrain doivent fonctionner dans les contraintes réelles :

- écran étroit ;
- connexion instable ;
- géolocalisation ;
- permissions ;
- reprise après interruption.

### Gamification non compétitive

La progression doit encourager :

- contribution ;
- continuité ;
- apprentissage ;
- coopération.

Éviter les mécaniques qui récompensent le spam ou mettent les bénévoles en concurrence inutile.

## Avant de développer une fonctionnalité

```txt
□ Vérifier le code actuel sur GitHub
□ Lire la vision
□ Vérifier la priorité
□ Lire la fiche de page
□ Identifier le contrat de données
□ Vérifier sécurité et quotas
□ Définir le plus petit lot utile
```

## Décisions produit

Toute décision durable doit préciser :

- problème ;
- utilisateurs concernés ;
- résultat attendu ;
- compromis ;
- métrique de succès si pertinente ;
- conséquences techniques si structurantes.

Une décision technique durable doit être consignée en ADR, pas dupliquée dans le produit.

## Audits historiques

Les audits existants peuvent fournir du contexte, mais ils doivent être revalidés contre :

- code actuel ;
- route actuelle ;
- design system actuel ;
- roadmap actuelle.

Ne pas conserver un nombre codé en dur d'audits disponibles : le dossier évolue.

## Validation

Une évolution produit est considérée cohérente quand :

- la page canonique est alignée ;
- le code respecte le contrat ;
- les états critiques sont couverts ;
- les tests adaptés existent ;
- la sécurité n'est pas contournée ;
- les quotas ne sont pas dégradés sans justification.
