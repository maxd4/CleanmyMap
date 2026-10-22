# Développement : index de lecture Codex

Statut : `CURRENT` (routage). La gouvernance applicable est celle de la racine et du scope de la cible ; ce document ne la recopie pas.

| Besoin | Owner documentaire | Mode de lecture |
|---|---|---|
| Quand/où documenter, formats et statuts | [`DOCUMENTATION_POLICY.md`](./DOCUMENTATION_POLICY.md) | CURRENT ; propriété documentaire |
| API HTTP, erreur et garde | [`api-standard.md`](./api-standard.md) | CURRENT ; puis handler réel |
| Vocabulaire, FR/EN, interactions UI | [`AI_DEVELOPER_GUIDE.md`](./AI_DEVELOPER_GUIDE.md) | Orientation, puis owners spécialisés |
| Stratégie de test, niveaux de preuve | [`TESTING.md`](./TESTING.md) | CURRENT, point d'entrée |
| Exécution et CI | [`testing-execution.md`](./testing-execution.md) | Procédures spécialisées |
| Qualité, audits de tests | [`testing-quality.md`](./testing-quality.md) | Contrats spécialisés |
| Plateformes et intégration | [`testing-platforms.md`](./testing-platforms.md) | Contrats spécialisés |
| Qualité du dépôt | [`repo-quality-rules.md`](./repo-quality-rules.md) | CURRENT |
| Matrice de couverture des contrôles | [`quality-check-coverage-matrix.md`](./quality-check-coverage-matrix.md) | SNAPSHOT de l'inventaire effectif par SHA |
| Modularisation | [`conventions-modularisation.md`](./conventions-modularisation.md) | Règles avant extraction |
| Nommage | [`file-naming-conventions.md`](./file-naming-conventions.md) | Convention des nouveaux fichiers |
| TypeScript | [`typescript-precision-policy.md`](./typescript-precision-policy.md) | Entrées non fiables, casts, frontières |
| Lint / diagnostic statique | [`lint-refactor-playbook.md`](./lint-refactor-playbook.md) | Playbook de correction |
| Versions runtime/outillage | [`runtime-version-matrix.md`](./runtime-version-matrix.md) | Instantané explicatif ; manifestes font foi |
| Environnement host et Git | [`host-environment.md`](./host-environment.md) | Diagnostic local spécialisé |
| Mode rapide explicitement demandé | [`rapid-development-mode.md`](./rapid-development-mode.md) | Mode conditionnel, non défaut |
| Kaizen, audit ciblé | [`kaizen/README.md`](./kaizen/README.md) | Doctrine et méthode |

Frontière Server/Client et bundle : [`../architecture/frontend-backend-boundaries.md`](../architecture/frontend-backend-boundaries.md) (source unique). Les modules web et mobile possèdent leurs README locaux ; ne pas les déplacer vers le présent index.

**Sélection :** lire seulement les sources associées à la responsabilité modifiée ; les README orientent, ils ne répètent pas les contrats. Les commandes de validation et l'état Git sont régis par les sources spécialisées et la gouvernance racine.
