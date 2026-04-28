# Règles Avancées pour Agents IA

Règles supplémentaires pour optimiser le développement et la communication.

---

## 🎯 Proposer une Action Pertinente

À la fin de CHAQUE récapitulatif, tâche ou réponse, TOUJOURS inclure :

```
## 🎯 Prochaine Action Recommandée

[Action concrète et pertinente basée sur le contexte]

Voulez-vous que je procède ?
```

### Exemples d'Actions Pertinentes

**Après modularisation** :
```
🎯 Prochaine Action Recommandée

Option 1 : Améliorer la rubrique modularisée (Kaizen)
- Audit Fond : Optimiser la logique, gérer les cas limites
- Audit Forme : Améliorer l'UX selon VISUAL_STORYTELLING.md
- Proposer des innovations (gamification, visualisations)

Option 2 : Modulariser le fichier suivant
- apps/web/src/app/(app)/dashboard/page.tsx
- Priorité : #2 (CRITIQUE)
- Taille : 22KB

Que préférez-vous ?
```

**Après création API** :
```
🎯 Prochaine Action Recommandée

Créer le frontend qui consomme cette API :
1. Créer le hook use-gamification-data.ts
2. Créer les composants React
3. Intégrer avec l'API

Voulez-vous que je commence par le hook ?
```

**Après structure de données** :
```
🎯 Prochaine Action Recommandée

Implémenter la logique métier :
1. Créer lib/gamification/progression.ts
2. Implémenter le calcul des points
3. Implémenter le système de badges

Voulez-vous que je procède ?
```

### ❌ Mauvais Exemples (Trop Vagues)

- "Continuer le développement"
- "Améliorer le code"
- "Passer à la suite"
- "Faire les tests"

### ✅ Bons Exemples (Concrets)

- "Modulariser apps/web/src/app/(app)/dashboard/page.tsx (22KB - priorité #2)"
- "Créer les tests unitaires pour use-gamification-data.ts"
- "Implémenter l'API POST /api/gamification/progress"
- "Créer le composant GamificationBadge.tsx selon le design system"

---

## 🔄 Amélioration Continue (Kaizen)

### Mentalité Kaizen - Toujours Active

**RÈGLE FONDAMENTALE** : L'IA doit adopter une mentalité Kaizen **en permanence** et proposer des améliorations dès que cela semble pertinent.

**Référence obligatoire** : `documentation/development/AI_MINDSET_KAIZEN.md`

### Quand Appliquer Kaizen ?

✅ **TOUJOURS dans ces situations** :
- Après modularisation d'un fichier
- Après création/modification d'une fonctionnalité
- Après correction d'un bug
- Quand l'IA détecte une opportunité d'amélioration
- Quand l'IA lit du code qui pourrait être meilleur
- Quand l'IA voit du texte qui pourrait être visuel
- Quand l'IA identifie une dette technique

❌ **Ne PAS appliquer Kaizen** :
- Si l'utilisateur demande explicitement de ne pas proposer d'améliorations
- Si l'utilisateur est pressé et demande juste une tâche précise

### Posture Kaizen

**"C'est bien, mais comment cela pourrait-il être exceptionnel ?"**

L'IA doit :
- ✅ Être force de proposition
- ✅ Identifier les opportunités d'amélioration
- ✅ Proposer des innovations
- ✅ Signaler la dette technique
- ✅ Suggérer des simplifications
- ❌ Ne jamais considérer une fonctionnalité comme "parfaite" ou "finale"

### Audit en 2 Axes

#### 1. Le Fond (Logique & Science)
```
□ Les données sont-elles rigoureusement sourcées ?
□ Les calculs sont-ils optimaux ?
□ Les cas limites sont-ils gérés ?
□ La logique peut-elle être simplifiée ?
□ Y a-t-il du code mort à supprimer ?
```

#### 2. La Forme (UX & Design Premium)
```
□ L'interface respecte-t-elle VISUAL_STORYTELLING.md ?
□ Peut-on remplacer du texte par du visuel (SVG, graphiques) ?
□ L'interaction est-elle "Zéro Clavier" ?
□ Le feedback visuel est-il instantané et élégant ?
□ Les animations sont-elles sémantiques (Framer Motion) ?
```

### Déclencheurs Kaizen

**L'IA doit proposer un audit Kaizen quand** :

1. **Après une tâche terminée**
   - Modularisation ✓
   - Création de fonctionnalité ✓
   - Correction de bug ✓
   - Refactoring ✓

2. **Pendant la lecture de code**
   - Détection de texte qui pourrait être visuel
   - Détection de logique qui pourrait être optimisée
   - Détection de dette technique
   - Détection de cas limites non gérés

3. **Pendant l'analyse**
   - UX qui pourrait être améliorée
   - Performance qui pourrait être optimisée
   - Sécurité qui pourrait être renforcée
   - Accessibilité qui pourrait être améliorée

### Format Court vs Format Complet

**Format Court** (quand l'IA détecte une opportunité) :
```markdown
💡 Opportunité d'amélioration détectée

[Description brève du problème]

Proposition :
- [Solution concrète]
- Impact : [Bénéfice]
- Complexité : [Faible/Moyenne/Élevée]

Voulez-vous que j'implémente cette amélioration ?
```

**Format Complet** (après une tâche terminée) :
Voir template détaillé dans `AI_MINDSET_KAIZEN.md`

**Exemples concrets** : Voir `AI_KAIZEN_EXAMPLES.md`

---

## ⚠️ Validation des Prompts

### Prompts Imprécis - Demander Clarification

Si le prompt contient :
- **Termes vagues** : "améliore ça", "fais quelque chose", "optimise"
- **Objectifs flous** : "rends-le mieux", "améliore l'UX"
- **Informations manquantes** : fichier non spécifié, fonctionnalité non décrite

**Action IA** : Demander des précisions AVANT de procéder.

**Template de réponse** :
```
⚠️ Prompt imprécis. J'ai besoin de clarifications :

1. [Question spécifique 1]
2. [Question spécifique 2]
3. [Question spécifique 3]

Merci de préciser pour que je puisse vous aider efficacement.
```

---

## 🔄 Vérification de Cohérence

### Prompts Incohérents - Signaler et Corriger

Si le prompt demande :
- **UI/UX avant structure** : Design avant que la logique existe
- **Frontend avant API** : Composants avant endpoints
- **Tests avant code** : Tests avant implémentation
- **Optimisation avant fonctionnement** : Perf avant que ça marche

**Action IA** : Signaler l'incohérence et proposer l'ordre correct.

**Template de réponse** :
```
⚠️ Incohérence détectée dans l'ordre des étapes.

Avant [action demandée], nous devons :

1. ✅ [Étape préalable 1]
2. ✅ [Étape préalable 2]
3. ✅ [Étape préalable 3]
4. ✅ PUIS [action demandée]

Voulez-vous que je commence par l'étape 1 ?
```

---

## 📋 Ordre Logique de Développement

### Ordre Standard pour Nouvelle Fonctionnalité

```
1. STRUCTURE
   ├─ Définir les types TypeScript
   ├─ Définir le schéma de données
   └─ Définir les relations

2. LOGIQUE MÉTIER
   ├─ Implémenter les fonctions de calcul
   ├─ Implémenter les règles métier
   └─ Créer les utilitaires

3. API
   ├─ Créer les endpoints
   ├─ Implémenter la validation
   └─ Gérer les erreurs

4. TESTS BACKEND
   ├─ Tests unitaires logique
   ├─ Tests API
   └─ Tests d'intégration

5. FRONTEND
   ├─ Créer les hooks
   ├─ Créer les composants
   └─ Intégrer avec l'API

6. TESTS FRONTEND
   ├─ Tests unitaires composants
   ├─ Tests hooks
   └─ Tests d'intégration

7. UI/UX
   ├─ Appliquer le design system
   ├─ Animations
   └─ Responsive

8. OPTIMISATION
   ├─ Performance
   ├─ Accessibilité
   └─ SEO
```

### Vérification Avant de Commencer

Avant de coder, vérifier :
```
□ La structure de données est-elle définie ?
□ La logique métier est-elle claire ?
□ L'API existe-t-elle (si frontend) ?
□ Le design system est-il consulté (si UI) ?
□ Les prérequis sont-ils remplis ?
```

---

## 🎨 Règles Spécifiques UI

### Avant de Créer/Modifier de l'UI

**TOUJOURS vérifier** :
```
1. ✅ La logique métier est implémentée
2. ✅ L'API est créée et testée
3. ✅ Le design system est consulté
4. ✅ Les composants canoniques sont identifiés
```

### Checklist UI

```
□ documentation/design-system/charte-ui-pro-moderne-futuriste.md lu
□ Composants canoniques utilisés (CmmCard, CmmButton)
□ Classes cmm-* utilisées (pas text-[Xpx])
□ Pas de font-extrabold
□ Display modes respectés
□ Visuels prioritaires sur texte
```

---

## 🔐 Règles Spécifiques Sécurité

### Avant de Créer/Modifier du Code Sensible

**TOUJOURS vérifier** :
```
1. ✅ Les entrées utilisateur sont-elles validées ?
2. ✅ Le HTML est-il échappé/sanitized ?
3. ✅ Les URLs sont-elles validées ?
4. ✅ Les autorisations sont-elles vérifiées ?
5. ✅ Pas de secrets exposés ?
```

---

## 📊 Format de Récapitulatif

### Structure Standard

```markdown
## ✅ [Titre de la Tâche] - TERMINÉ

### 📊 Résultat
[Résumé en 1-2 phrases]

### 📝 Actions Réalisées
1. ✅ [Action 1]
2. ✅ [Action 2]
3. ✅ [Action 3]

### 📁 Fichiers Modifiés/Créés
- `chemin/fichier1.ts` - [Description]
- `chemin/fichier2.tsx` - [Description]

### 🎯 Prochaine Action Recommandée

[Action concrète et pertinente]

Voulez-vous que je procède ?
```

---

**Optimisé pour** : Agents IA  
**Version** : 2.0.0  
**Dernière mise à jour** : 28/04/2026
