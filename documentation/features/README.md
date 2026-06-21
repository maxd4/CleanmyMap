# Features - Guide IA

Documentation des fonctionnalités pour agents IA.

---

## 🎮 Fichiers Disponibles

### Participation de groupe
- **group-action.md** - Guide utilisateur du flux d'action de groupe

### Gamification
- **GAMIFICATION_ENGINE.md** - Moteur de gamification complet
  - Système de badges
  - Progression utilisateur
  - Leaderboard
  - Récompenses

### Quiz & Apprentissage
- **quiz-authoring-guide.md** - Règles d'écriture des questions du quiz
  - Sept portes d'entrée: mixte, terrain, données scientifiques, sensibilisation, habitudes de vie, ordres de grandeur, tri & sécurité
  - Champs de sélection: `mode`, `review`, `skill`, `pedagogicalType`, `difficulty`, `trapLevel`, `sessionSize`
  - `difficulty` distinct de `trapLevel`
  - Sessions bornées, progression par révision, montée cognitive et piège intuitif
  - Vrai / Faux piégeux
  - Questions de situation
  - Anti-questions faciles
  - Banque équilibrée sur 10 formats
- **quiz-quality-control.md** - Grille de validation, contrôle qualité et traçabilité des sources du quiz
- **quiz-srs.md** - Système de quiz avec répétition espacée (SRS)
  - Algorithme de répétition
  - Gestion des questions
  - Progression d'apprentissage

---

## 🤖 Instructions IA

### Lors de Modification de la Gamification
1. Lire **GAMIFICATION_ENGINE.md** en entier
2. Comprendre le système de points/badges
3. Respecter les règles de progression
4. Ne pas casser les calculs existants

### Lors de Modification du Quiz
1. Consulter **quiz-srs.md**
2. Consulter **quiz-authoring-guide.md** avant de créer ou réécrire une question
3. Respecter l'algorithme SRS
4. Maintenir une répartition équilibrée des formats
5. Tester la progression

---

## 🎯 Règles Clés

### Gamification
- **Cohérence** : Les points doivent être cohérents entre fonctionnalités
- **Progression** : La progression doit être motivante
- **Badges** : Les badges doivent être atteignables

### Quiz
- **SRS** : Respecter l'algorithme de répétition espacée
- **Formats** : Variété, équilibre et alternance des formats
- **Raisonnement** : Favoriser la réflexion, les mécanismes et le doute utile
- **Feedback** : Feedback immédiat et constructif

---

## 📊 Workflow IA

```
1. Identifier la feature à modifier
   ↓
2. Lire la documentation complète
   ↓
3. Comprendre les règles métier
   ↓
4. Développer en respectant les contraintes
   ↓
5. Tester la cohérence avec le reste
```

---

**Optimisé pour** : Agents IA  
**Dernière mise à jour** : 2025-01-XX
