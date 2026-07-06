# Guides pour Agents IA

Documentation optimisée pour les agents IA qui développent ce projet.

---

## 🧭 Ordre De Lecture

1. `AI_ADVANCED_RULES.md` pour gérer les prompts flous, les incohérences et le format de réponse.
2. `GEMINI_FLASH_QUALITY_GUIDE.md` pour générer ou corriger du code avec un niveau de fiabilité plus élevé.
3. `GEMINI_FLASH_CHEATSHEET.md` pour la vérification finale avant livraison.
4. `AI_MODULARIZATION_GUIDE.md` si la tâche concerne un refactor structuré.

## 📚 Guides Disponibles

### 🧱 Spec Kit

1. **[SPEC_KIT_PLAYBOOK.md](./SPEC_KIT_PLAYBOOK.md)**
   - Cycle Spec -> Plan -> Tasks -> Implement
   - Commandes d'installation et d'initialisation
   - Adaptation du workflow Spec Kit à CleanMyMap

2. **[SPEC_KIT_ACTIONS.md](./SPEC_KIT_ACTIONS.md)**
   - Liste concrète des choses a faire apres la lecture de Spec Kit
   - Priorisation court / moyen terme

### 🧠 Skills Matt Pocock

1. **[MATT_POCOCK_SKILLS_PLAYBOOK.md](./MATT_POCOCK_SKILLS_PLAYBOOK.md)**
   - Principe des skills petits, composables et reutilisables
   - Quickstart du repo de reference
   - Quand activer `grill-me`, `tdd`, `diagnose`, `zoom-out`, `handoff` et les skills de garde-fou
   - Note de coherence documentaire sur les commandes de checks rapides

### 🖼️ Standards visuels de documentation

1. **[standards-visuels.md](./standards-visuels.md)**
   - Standards Mermaid et fallback image
   - Formats obligatoires de documentation visuelle
   - Règles communes pour les schémas
   - Exemples copiables

### 📐 Grille et composition

1. **[CLEANMYMAP_GRID_SYSTEM_PLAYBOOK.md](./CLEANMYMAP_GRID_SYSTEM_PLAYBOOK.md)**
   - Grille CleanMyMap 12/6/4 colonnes
   - Rythme vertical basé sur 8 px
   - À consulter pour décider si une page doit adopter une grille stricte
   - Cas d'usage pour rapports, KPI, dashboards et pages éditoriales
   - Cas d'exclusion pour cartes et formulaires complexes

### 🎨 Planche Design System

1. **[design-system-board.dynamic.html](../design-system-board.dynamic.html)**
   - Référence dynamique à utiliser en priorité
2. **[design-system-board.html](../design-system-board.html)**
   - Snapshot figé de comparaison / archive visuelle

### 🔧 Modularisation

1. **[AI_MODULARIZATION_GUIDE.md](./AI_MODULARIZATION_GUIDE.md)** ⭐
   - Guide complet de modularisation
   - Processus en 5 étapes
   - Règles strictes ✅/❌
   - Patterns réutilisables
   - Templates de code

2. **[AI_MODULARIZATION_PLAN.md](./AI_MODULARIZATION_PLAN.md)**
   - Plan des 15 fichiers prioritaires
   - Objectifs et structure cible
   - Sprints et métriques

3. **[AI_MODULARIZATION_DIAGRAMS.md](./AI_MODULARIZATION_DIAGRAMS.md)**
   - Diagrammes visuels
   - Flux de modularisation
   - Architecture cible

4. **[AI_MODULARIZATION_CHEATSHEET.md](./AI_MODULARIZATION_CHEATSHEET.md)**
   - Aide-mémoire ultra-rapide
   - Référence pendant l'exécution
   - Templates code prêts à l'emploi

5. **[AI_MODULARIZATION_PROGRESS.md](./AI_MODULARIZATION_PROGRESS.md)**
   - Tableau de bord de progression
   - Statut de chaque fichier (1/15 complété)
   - Métriques globales

### 🤖 Règles Avancées

6. **[AI_ADVANCED_RULES.md](./AI_ADVANCED_RULES.md)** ⭐
   - Validation des prompts imprécis
   - Vérification de cohérence
   - Proposition d'actions pertinentes
   - Ordre logique de développement
   - Mentalité Kaizen proactive
   - Format de récapitulatif

7. **[AI_KAIZEN_EXAMPLES.md](./AI_KAIZEN_EXAMPLES.md)**
   - Exemples concrets de déclencheurs Kaizen
   - 6 situations types avec réactions
   - Templates de propositions

### ⚡ Qualité De Code Gemini Flash

8. **[GEMINI_FLASH_QUALITY_GUIDE.md](./GEMINI_FLASH_QUALITY_GUIDE.md)**
   - Règles anti-erreurs pour la génération de code
   - Protocole de validation avant livraison
   - Patterns sûrs pour React, TypeScript et ESLint

9. **[GEMINI_FLASH_CHEATSHEET.md](./GEMINI_FLASH_CHEATSHEET.md)**
   - Mémo ultra-rapide
   - Rappels de correction ESLint
   - Checklist de dernière minute

### 📝 Historique

Fichiers historiques supprimés pour éviter la redondance.
Consulter l'historique Git si nécessaire.

---

## 🚀 Utilisation

### Pour Modulariser un Fichier

1. Lire **AI_MODULARIZATION_GUIDE.md** (section Instructions)
2. Consulter la section Plan pour le fichier cible
3. Suivre le processus en 5 étapes
4. Référencer **AI_MODULARIZATION_CHEATSHEET.md** pendant l'exécution
5. Mettre à jour **AI_MODULARIZATION_PROGRESS.md** après complétion

### Pour Corriger Du Code Ou Des Warnings Lint

1. Lire **AI_ADVANCED_RULES.md** si le besoin est ambigu.
2. Lire **GEMINI_FLASH_QUALITY_GUIDE.md** pour le protocole complet.
3. Utiliser **GEMINI_FLASH_CHEATSHEET.md** pour la vérification finale.
4. Corriger la cause racine plutôt que masquer le warning.
5. Valider avec `npm run lint`, `npm run test` et, si pertinent, `npm run build`.

### Commandes

```bash
# Analyser les fichiers volumineux
npm run analyze:heavy-files

# Générer un rapport après modularisation
npm run modularize:report <fichier>

# Valider
npm run lint && npm run test && npm run build
```

---

## 📋 Principes

- **Optimisé pour IA** : Instructions claires, non ambiguës
- **Réutilisable** : Templates et patterns prêts à l'emploi
- **Complet** : Tout au même endroit
- **Actionnable** : Processus étape par étape

### Références Complémentaires

- `AI_ADVANCED_RULES.md` : conduite générale et gestion de l'incertitude
- `GEMINI_FLASH_QUALITY_GUIDE.md` : règles de qualité de code
- `GEMINI_FLASH_CHEATSHEET.md` : mémo de validation rapide

---

**Dernière mise à jour** : 28/04/2026
