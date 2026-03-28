# CleanMyMap — Plan d'Implémentation (Mis à jour le 28 Mars 2026)

Ce document sert de feuille de route pour l'évolution de CleanMyMap.

---

## ✅ ARCHIVE : Étapes Complétées

### Structure & Modularisation
- [x] **Démantèlement du Monolithe** : `app.py` est devenu un routeur léger déléguant aux tabs dans `src/ui/tabs/`.
- [x] **Couche UI Unifiée** : Centralisation des composants dans `src/ui/components/` et `src/ui/tabs/`.
- [x] **Pattern Repository** : Accès aux données via `src/repositories/` et proxies dans `database.py`.
- [x] **Services Découplés** : Logique métier extraite dans `src/services/` (Géo, Analytics, Impact).
- [x] **Internationalisation (I18n)** : Système robuste dans `src/ui/i18n.py`.

### Sécurité & Fiabilité
- [x] **Security Service** : Gestion centralisée des identités et des secrets d'administration.
- [x] **Auth Guard** : Protection des onglets sensibles via le décorateur `@require_admin`.
- [x] **Sanitization Gateway** : Nettoyage global des entrées (XSS/Injection) dans `src/security_utils.py`.
- [x] **Pipeline de Données** : Unification des colonnes (`benevoles`) et durcissement de l'import Google Sheet.
- [x] **Restauration des Compteurs** : Rétablissement du "Mission Control" sur la page d'accueil.

### Monitoring & Performance (Phase 8 & 10)
- [x] **Tableau de Bord Admin UX** : Visualisation des `UXEvents` (erreurs de saisie) dans l'onglet Admin.
- [x] **Alertes Proactives** : Indicateur de santé du Google Sheet (Green/Red) dans le monitoring.
- [x] **Audit Logs** : Traçabilité des validations/refus avec l'identité de l'admin.
- [x] **Optimisation du Cache** : Mise en place de `@st.cache_data` pour le bundle de données publiques.

### Tests (Phase 6 & 9)
- [x] **Tests de Service** : Suite `pytest` couvrant la géo, les analytics et la sécurité.
- [x] **Socle Playwright** : Configuration E2E et premier test `home.spec.js`.

---

## 🚀 PROCHAINE ÉTAPE : Phase 11 — Maintenance & Robustesse des Données

Suite aux retours utilisateurs, nous maintenons une séparation claire entre données de test et réelles.

- [ ] **Flag "Données Réelles"** : Ajouter une colonne `is_real` dans la base SQLite pour distinguer les actions citoyennes vérifiées des tests.
- [ ] **Nettoyage Automatisé** : Script périodique pour purger les `TEST_DATA` de la base de données après une période définie.
- [ ] **Amélioration du Reporting Admin** : Export CSV détaillé incluant les `UXEvents` pour analyse hors-ligne.

---

## Questions Résolues

- **Données de Démo** : Conservées pour l'instant (utile pour les démos et tests), seront supprimées plus tard.
- **Notifications Email** : Reportées (projet à long terme).

---

## Plan de Vérification
### Tests de non-régression
- [ ] Lancer `pytest tests/services/` après chaque modification de la logique métier.
- [ ] Vérifier la cohérence des compteurs Home via le monitoring admin.
