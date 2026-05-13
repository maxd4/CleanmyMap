# Journal d'Impact : Ateliers DU Engagement x CleanMyMap

Ce journal documente les améliorations concrètes apportées au projet CleanMyMap en application directe des enseignements suivis lors du DU Engagement à l'Université. Il sert de preuve de la transformation de la théorie en pratique opérationnelle.

---

## 1. Axe : Évaluation critique et Sobriété Numérique

*Enseignement : Savoir porter un regard critique sur son propre impact et institutionnaliser la sobriété.*

| Date | Amélioration apportée | Impact concret |
| :--- | :--- | :--- |
| 13/05/26 | **Normalisation de l'Audit d'Impact IA** | Création d'un référentiel de 3100+ lignes analysant les coûts carbone, eau et éthique de l'IA. |
| 13/05/26 | **Indice IUR (Indice d'Utilité Réelle)** | Mise en place de la formule `Impact Terrain / Coût Numérique` comme juge de paix pour tout nouveau développement. |
| 13/05/26 | **Charte de Sobriété (SOBRIETY_RULES.md)** | Création d'un protocole de développement imposant le choix de modèles légers et la mise en cache systématique. |

---

## 2. Axe : Pilotage par la donnée et Indicateurs

*Enseignement : Passer de la perception subjective à la mesure objective.*

| Date | Amélioration apportée | Impact concret |
| :--- | :--- | :--- |
| 13/05/26 | **Automatisation des statistiques d'audit** | Création de `update-audit-stats.mjs` pour synchroniser dynamiquement les métriques de code avec le dossier d'impact. |
| 13/05/26 | **Audit des Écarts (Roadmap vs Réalité)** | Identification technique des manquements (Campagnes, Qualité de donnée) pour prioriser les futurs sprints. |
| 13/05/26 | **Reporting qualité CI/CD orienté pilotage** | Création de `scripts/cicd-metrics-report.mjs` et de `documentation/maintenance/ci-cd-metrics-report.md` pour suivre les runs GitHub Actions, le cache et les déploiements Vercel dans une logique de mesure continue. |
| 13/05/26 | **Audit exécutable des messages Ateliers DU** | Formalisation de `documentation/plans/ateliers_DU_execution_rapide.md` pour distinguer les lots déjà absorbés, les écarts encore ouverts et l'ordre d'attaque réaliste. |

---

## 3. Axe : Gouvernance et Participation Citoyenne

*Enseignement : Clarifier les rôles et interfaces pour augmenter l'engagement.*

| Date | Amélioration apportée | Impact concret |
| :--- | :--- | :--- |
| 13/05/26 | **Rôle de Responsable Sobriété** | Institutionnalisation d'un droit de veto technique pour garantir que l'usage de l'IA reste éthique et sobre. |
| 13/05/26 | **Protocole Human-in-the-loop** | Garantie que toute décision d'IA est supervisée par un humain, renforçant la légitimité du projet. |

---

## 4. Axe : Souveraineté et Pérennité

*Enseignement : Anticiper les dépendances et garantir la continuité de l'action.*

| Date | Amélioration apportée | Impact concret |
| :--- | :--- | :--- |
| 13/05/26 | **Stratégie de sortie technique** | Planification de la mitigation du *vendor lock-in* (Vercel/Supabase) pour assurer l'indépendance à long terme. |
| 13/05/26 | **Standardisation Sémantique (SLB)** | Reformatage de 230 KB de documentation pour une lecture optimale par les humains et les futurs agents IA. |
| 13/05/26 | **Matrice de traçabilité cœur produit** | Création de `documentation/architecture/traceability-matrix.md` pour relier rubrique, route, composant, API et source de donnée. |
| 13/05/26 | **Dossier de validation institutionnelle** | Création d'un point d'entrée unique liant audit d'impact, gouvernance IA, sobriété, maintenance, traçabilité et stratégie de sortie technique. |

---

---

## 5. Synthèse des Solutions Issues de l'Audit d'Impact (Section 22)

*Enseignement : Transformer un diagnostic en plan de remédiation technique.*

| Action | État | Impact sur le Projet |
| :--- | :--- | :--- |
| **Sécurité (Directive 2)** | ✅ Réalisé | Création de `scripts/pre-release-check.mjs` pour scanner les secrets et fichiers critiques avant déploiement. Baisse du risque de fuite de souveraineté. |
| **Sécurité publication (durcie)** | ✅ Réalisé | Correction du script `pre-release-check.mjs`, ajout de `npm run pre-release:check` et formalisation de `documentation/operations/pre-release-security-check.md` pour l'inventaire des variables sensibles et des contrôles. |
| **IUR (Directive 7)** | ✅ Réalisé | Intégration de l'Indice d'Utilité Réelle dans le moteur de pilotage et le dashboard admin. Pilotage par la sobriété (Impact > Coût). |
| **Observabilité (Directive 3)** | ✅ Réalisé | Ajout d'une alerte de sobriété automatique dans le moteur de priorisation, enrichissement de `/api/services` avec résumé global, niveaux de sévérité et timeline courte, plus affichage admin de supervision. |
| **Data Quality (Directive 4)** | ✅ Réalisé | Détection automatique des anomalies métier (impact irréaliste, données manquantes) via `dataIntegrityPriority`. |
| **Standardisation UI (Directive 6)** | ✅ Réalisé | Mutualisation du code avec `AdminPanelShell` pour 3 panels majeurs. Réduction stricte du poids du bundle JS (Sobriété logicielle). |
| **Audit des Écarts Ateliers** | ✅ Réalisé | Clôture des écarts de sécurité, observabilité, data quality et standardisation UI. Le lot campagnes multi-actions a été cadré comme chantier partiellement couvert, à finaliser sur un modèle/API d'agrégation. |
| **Reporting qualité automatisé (Directive 7)** | ✅ Réalisé | Ajout de `scripts/cicd-metrics-report.mjs` et d'une documentation dédiée pour produire un suivi comparable des runs CI/CD, du cache et des déploiements. |
| **Check-list Sortie IA** | ✅ Réalisé | Création du `PULL_REQUEST_TEMPLATE.md` pour forcer la vérification humaine du code généré. |
| **Gouvernance IA Explicite** | ✅ Réalisé | Rédaction de `GOVERNANCE.md` définissant la responsabilité humaine sur chaque bloc de code. |
| **Optimisation Poids Plume** | 🚀 En cours | Réduction du logo de **88%** et bundle splitting pour les cartes (Leaflet), réduisant la conso batterie mobile. |
| **Tests de non-régression ciblés (Directive 5)** | 🟡 Partiellement réalisé | Renforcement de tests sur la modération admin, la validation d'actions, les filtres de carte, le stockage brouillon, l'analytics consent, `/api/services`, les endpoints critiques d'export (`actions.csv`, `actions.json`, `elus-dossier`) et les boutons UI d'export CSV/PDF. La couverture UI de `/dashboard` et `/reports` reste à consolider. |
| **Convergence exports web (Directive 11)** | ✅ Réalisé | Uniformisation des headers de livrables et des noms de fichiers pour CSV/JSON/PDF côté serveur via un helper commun, puis harmonisation des libellés/messages front d'export CSV/PDF avec `buildExportUiCopy`, couverte par des tests serveur et UI statiques. |
| **Standardisation des Prompts (Action C)** | 📅 À faire | Réduction du bruit numérique en limitant les itérations inutiles avec l'IA. |
| **Fiabilité des Indicateurs (Action J)** | 📅 À faire | Protocole de revue mensuelle pour garantir que les "tonnes de déchets" affichées sont réelles. |

---

---

**Clôture documentaire du plan supprimé :**
Le plan d'écarts supprimé a été absorbé dans ce journal. Les améliorations effectivement implémentées sont désormais tracées ici comme références de preuve, avec distinction explicite entre `réalisé`, `partiellement réalisé` et `à faire`.

---

## 6. Annexe A - Bibliothèque de pilotage IA

*Cette annexe centralise les directives opérationnelles retirées de la section 22 de l'audit principal. Elle porte le niveau d'exécution, tandis que l'audit conserve le niveau de décision, de contrôle et de preuve.*

| Action | Directive | État | Preuve attendue | Contrôle associé |
| :--- | :--- | :--- | :--- | :--- |
| **B - Validation humaine des contenus environnementaux** | Ajouter un workflow de validation humaine des contenus environnementaux et institutionnels : brouillon, revue, publication, avec responsable identifié avant mise en ligne. | 📅 À faire | Workflow documenté, rôle assigné, exemple de contenu passé en revue. | Vérification des chiffres, interprétations, promesses d'impact et niveau de preuve. |
| **C - Standardisation des usages IA utiles** | Créer un guide de prompts internes par cas d'usage (code, documentation, UX, debug) avec exemples courts, contraintes, critères d'acceptation et cas à éviter. | 📅 À faire | Guide versionné, exemples validés, usage référencé dans la contribution. | Réduction des itérations redondantes et des usages IA peu utiles. |
| **D - Protection des données sensibles** | Ajouter une politique d'usage IA du projet : données interdites, anonymisation minimale, exemples autorisés/interdits, contrôle avant partage vers un service externe. | 📅 À faire | Politique écrite, checklist de partage, cas d'usage interdits explicités. | Contrôle des données personnelles, des secrets et des données sensibles exposées. |
| **G - Clarté des messages environnementaux** | Réaliser un audit de clarté des contenus environnementaux et proposer une version harmonisée : messages clés, preuves, limites, incertitudes et distinction fait/hypothèse. | 📅 À faire | Référentiel éditorial, avant/après de contenus, validation humaine explicite. | Contrôle du vocabulaire, du niveau de preuve et de la cohérence institutionnelle. |
| **J - Fiabilité des indicateurs** | Ajouter des contrôles de cohérence des indicateurs (funnel, engagement, exports) et un protocole de revue mensuelle des métriques avec seuils d'alerte. | 📅 À faire | Protocole de revue, tableau de bord contrôlé, anomalies documentées. | Vérification de la cohérence analytics et de l'interprétation des métriques. |

---

## 7. Analyses Systémiques et Réflexions de Fond

*Enseignement : Comprendre les enjeux de pouvoir, de dépendance et d'effet rebond dans le numérique.*

| Thématique | Enseignement DU appliqué | Application dans CleanMyMap |
| :--- | :--- | :--- |
| **Effet Rebond (Jevons)** | Se méfier de la vitesse de l'IA qui pousse au *feature creep*. | Décision de geler les fonctions "gadgets" (badges, chat) pour se concentrer sur le noyau utile. |
| **Souveraineté (Section 15)** | Analyser la géopolitique du cloud (90% stack US). | Cartographie des risques de rupture (Vercel, Clerk, Supabase) et plan de mode dégradé (export statique). |
| **Éthique du "Ghost Work"** | Reconnaître le coût social caché de l'IA (annotation). | Engagement à limiter l'IA aux tâches de structure et non à la modération massive non supervisée. |
| **Dualité de Logique** | Choisir entre "Infra légère" et "Plateforme extensive". | Arbitrage en faveur de l'infrastructure légère de coordination pour rester sobre. |
| **IA comme Accélérateur** | S'inspirer d'AlphaFold pour l'action écologique. | Utilisation de l'IA pour compresser 2 ans de R&D environnementale en 3 mois de développement citoyen. |

---

## 8. Alignement avec les Objectifs de Développement Durable (ODD)

*Enseignement : Inscrire son action dans le cadre universel de l'ONU.*

Le projet CleanMyMap, audité via le prisme des ODD, valide les points suivants :

- **ODD 11 (Villes Durables)** : Amélioration prouvée de l'espace public via le signalement.
- **ODD 12 (Consommation Responsable)** : Sensibilisation à la fin de vie des produits (mégots, plastiques).
- **ODD 13 (Climat)** : Discipline de sobriété numérique (IUR) pour ne pas être un fardeau carbone.
- **ODD 17 (Partenariats)** : Création d'un outil de liaison entre citoyens, associations et élus.

---

**Note de synthèse finale :**
Grâce aux ateliers DU, CleanMyMap est passé d'une "application web de nettoyage" à une **"infrastructure civique responsable, auditée et souveraine"**.
Chaque décision technique est désormais le fruit d'un arbitrage entre **utilité sociale maximale** et **empreinte environnementale minimale**.
Le projet n'est plus seulement un outil numérique, c'est une **démonstration de sobriété en acte**.
