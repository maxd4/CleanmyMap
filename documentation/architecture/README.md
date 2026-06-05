# Architecture - Guide IA

Documentation d'architecture pour agents IA.

---

## 📋 Fichiers Clés pour IA

### Source de vérité
- **master-architecture.md** - Architecture globale du système

### Décisions d'Architecture (ADR)
- **adr/ADR-001-clerk-auth.md** - Authentification Clerk
- **adr/ADR-002-service-role-key.md** - Clés de service
- **adr/ADR-003-monorepo-structure.md** - Structure monorepo

### Vues d'Ensemble
- **system-overview.md** - Vue runtime synthétique
- **ARCHITECTURE.md** - Entrée compacte pour assistants IA

### Domaines Spécifiques
- **frontend-backend-boundaries.md** - Séparation frontend/backend
- **data-governance.md** - Gouvernance des données
- **modules-cles-et-dependances.md** - Modules et dépendances
- **section-ownership-boundaries.md** - Frontieres `app` / registry / UI pour les rubriques
- **rubrique-placement-guide.md** - Guide de placement concret pour les développeurs
- **methodologie-fonctionnement-site.md** - Fonctionnement technique du site et quotas gratuits de référence
- **traceability-matrix.md** - Rattachement code/doc
- **migrations-techniques.md** - Migrations techniques
- **monolith-split-plan.md** - Plan de découpage monolithe

---

## 🤖 Instructions IA

### Avant de Modifier l'Architecture
1. Lire **master-architecture.md** pour comprendre la structure globale
2. Consulter les ADR pertinents
3. Vérifier **system-overview.md** puis **frontend-backend-boundaries.md** pour les limites

### Lors d'Ajout de Fonctionnalité
1. Identifier le module concerné dans **modules-cles-et-dependances.md**
2. Respecter **data-governance.md** pour les données
3. Vérifier **traceability-matrix.md** si la demande touche des routes, pages, APIs ou sources de données

### Lors de Refactoring
1. Consulter **monolith-split-plan.md** si découpage nécessaire
2. Vérifier **migrations-techniques.md** pour les migrations
3. Documenter les changements dans un nouveau ADR si décision majeure

---

## 📊 Hiérarchie de Lecture

```
1. master-architecture.md   ← Source de vérité
2. system-overview.md       ← Vue d'ensemble runtime
3. ADR pertinents          ← Décisions spécifiques
4. Fichiers domaine        ← Détails techniques
```

---

**Optimisé pour** : Agents IA  
**Dernière mise à jour** : 2025-01-XX
