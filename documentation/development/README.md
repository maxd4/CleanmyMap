# Development - Guide IA

Guides de développement pour agents IA.

---

## 🤖 Fichiers Essentiels pour IA

### Guides IA Spécifiques
- **SPEC_KIT_PLAYBOOK.md** ⭐ - Workflow Spec Kit adapte a CleanMyMap
- **MATT_POCOCK_SKILLS_PLAYBOOK.md** ⭐ - Workflow des skills Matt Pocock adapte a CleanMyMap
- **AI_DEVELOPER_GUIDE.md** ⭐ - Guide développeur IA
- **AI_MINDSET_KAIZEN.md** ⭐ - Mindset amélioration continue

### Standards & Conventions
- **api-standard.md** - Standards API
- **conventions-composants.md** - Conventions composants React
- **conventions-modularisation.md** - Conventions modularisation et lecture des warnings de densité

### Qualité & Tests
- **TESTING.md** - Guide de tests
- **page-by-page-ui-qa.md** - Workflow de QA page par page avec capture écran et export `.MD this page`
- **regression-gates.md** - Tests de non-régression
- **bugs-structurants.md** - Bugs structurants à éviter
- **performance-quotas-vercel-checklist.md** - Checklist PR pour prévenir les régressions de coût Vercel
- **vercel-anti-regression-playbook.md** - Retour d'expérience et erreurs à ne pas reproduire sur les surfaces Vercel
- **vercel-supabase-browser-strategy.md** - Règle de répartition entre Vercel, Supabase et le navigateur
- **codex-vercel-development-guide.md** - Guide pratique Codex pour développer sans augmenter inutilement les quotas Vercel
- **vercel-next-build-triage.md** - Méthode courte pour corriger un build Vercel/Next sans rebuilds successifs inutiles
- **client-server-bundle-splitting.md** - Guide pour éviter de gonfler le bundle initial avec de mauvaises frontières serveur/client
- **vercel-surface-report.md** - Rapport automatique des surfaces Vercel et du risque associé
- **vercel-route-cost-audit.md** - Audit route par route des coûts Vercel
- **typescript-strict-priority-report.md** - Synthèse priorisée du log TypeScript strict
- **typescript-precision-policy.md** - Politique de précision TypeScript
- **typescript-anti-errors-checklist.md** - Checklist courte de correction TypeScript
- **typescript-anti-errors-playbook.md** - Playbook de correction TypeScript pour agents IA
- **LINT_WARNING_PRIORITY.md** - Priorité actuelle des warnings ESLint restants
- **blocages-de-validation.md** - Etat des erreurs restantes et cas qui exigeraient un breaking change

### Contribution & Documentation
- **CONTRIBUTING.md** - Guide de contribution
- **DOCUMENTATION_POLICY.md** - Politique de documentation
- **supabase-quota-guide.md** - Guide développeur Supabase: quotas, stockage, limites et doctrine produit
- **vercel-quota-governance.md** - Guide de gouvernance des quotas Vercel et des régressions de coût

### Dette Technique
- **dette-technique.md** - Dette technique actuelle
- **refactors-prioritaires.md** - Refactorings prioritaires
- **ts-strict-flag-errors.txt** - Dump brut historique des erreurs TypeScript strict

---

## 🤖 Instructions IA

### Avant de Coder
1. Lire **SPEC_KIT_PLAYBOOK.md** si la tâche doit passer par spec, plan et tâches avant implémentation
2. Lire **MATT_POCOCK_SKILLS_PLAYBOOK.md** si la tâche implique plan, debug, TDD ou transfert de session
3. Lire **AI_DEVELOPER_GUIDE.md** pour les règles IA
4. Consulter **AI_MINDSET_KAIZEN.md** pour l'esprit d'amélioration
5. Vérifier **conventions-composants.md** pour les patterns

### Lors du Développement
1. Respecter **api-standard.md** pour les APIs
2. Suivre **conventions-modularisation.md** si modularisation
3. Appliquer **TESTING.md** pour les tests
4. Appliquer **page-by-page-ui-qa.md** pour toute route visible modifiée
5. Suivre **typescript-precision-policy.md** pour tout typage, cast ou accès dynamique
6. Utiliser **typescript-anti-errors-checklist.md** pour le runbook court
7. Utiliser **typescript-anti-errors-playbook.md** pour classer et corriger les erreurs TypeScript
8. Relire **supabase-quota-guide.md** avant d'ajouter une requête Supabase lourde
9. Relire **vercel-quota-governance.md** avant d'ajouter une route API, une page dynamique, un cron ou un fetch `no-store`
10. Relire **vercel-next-build-triage.md** avant de repartir sur un build complet quand le cache ou les manifests semblent suspects

### Avant de Commit
1. Vérifier **regression-gates.md** (tests critiques)
2. Éviter **bugs-structurants.md**
3. Documenter selon **DOCUMENTATION_POLICY.md**

### Refactoring
1. Consulter **dette-technique.md** pour contexte
2. Prioriser selon **refactors-prioritaires.md**

---

## 📊 Workflow IA Standard

```
1. Lire AI_DEVELOPER_GUIDE.md
   ↓
2. Consulter conventions pertinentes
   ↓
3. Développer en suivant standards
   ↓
4. Tester selon TESTING.md
   ↓
5. Valider regression-gates.md
   ↓
6. Documenter si nécessaire
```

---

## ✅ Checklist Développement IA

```
□ AI_DEVELOPER_GUIDE.md lu
□ Conventions respectées
□ Standards API suivis
□ Tests écrits
□ Regression gates passent
□ Bugs structurants évités
□ Documentation à jour
```

---

## 🎯 Règles Clés

### Amélioration Continue
- Ne jamais considérer le code comme parfait
- Toujours chercher à améliorer
- Corriger en améliorant la logique existante, pas en la dégradant ou en simplifiant à l'excès
- Être force de proposition

### Qualité
- Tests obligatoires
- Pas de régression
- Code maintenable

### Documentation
- Code auto-documenté
- Commentaires si nécessaire
- Documentation technique à jour

---

**Optimisé pour** : Agents IA  
**Dernière mise à jour** : 2025-01-XX
