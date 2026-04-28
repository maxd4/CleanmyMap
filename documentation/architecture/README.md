# Architecture - Guide IA

Documentation d'architecture pour agents IA.

---

## 📋 Fichiers Clés pour IA

### Décisions d'Architecture (ADR)
- **adr/ADR-001-clerk-auth.md** - Authentification Clerk
- **adr/ADR-002-service-role-key.md** - Clés de service
- **adr/ADR-003-monorepo-structure.md** - Structure monorepo

### Vues d'Ensemble
- **ARCHITECTURE.md** - Architecture globale du système
- **system-overview.md** - Vue système complète
- **master-architecture.md** - Architecture maître

### Domaines Spécifiques
- **frontend-backend-boundaries.md** - Séparation frontend/backend
- **data-governance.md** - Gouvernance des données
- **modules-cles-et-dependances.md** - Modules et dépendances
- **migrations-techniques.md** - Migrations techniques
- **monolith-split-plan.md** - Plan de découpage monolithe

---

## 🤖 Instructions IA

### Avant de Modifier l'Architecture
1. Lire **ARCHITECTURE.md** pour comprendre la structure globale
2. Consulter les ADR pertinents
3. Vérifier **frontend-backend-boundaries.md** pour les limites

### Lors d'Ajout de Fonctionnalité
1. Identifier le module concerné dans **modules-cles-et-dependances.md**
2. Respecter **data-governance.md** pour les données
3. Suivre les patterns établis

### Lors de Refactoring
1. Consulter **monolith-split-plan.md** si découpage nécessaire
2. Vérifier **migrations-techniques.md** pour les migrations
3. Documenter les changements dans un nouveau ADR si décision majeure

---

## 📊 Hiérarchie de Lecture

```
1. ARCHITECTURE.md          ← Commencer ici
2. system-overview.md        ← Vue d'ensemble
3. ADR pertinents           ← Décisions spécifiques
4. Fichiers domaine         ← Détails techniques
```

---

**Optimisé pour** : Agents IA  
**Dernière mise à jour** : 2025-01-XX
