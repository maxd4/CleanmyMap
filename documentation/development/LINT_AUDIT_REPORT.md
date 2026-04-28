# Rapport d'Audit ESLint par Rubrique

**Généré le** : 28/04/2026  
**Commande** : `npm run lint:audit`

## 📊 Résumé Global

- **Erreurs** : 0
- **Warnings** : 231
- **Fichiers concernés** : 89
- **Rubriques analysées** : 8

## 🎯 Tableau de Bord par Rubrique

| Rubrique | Priorité | Erreurs | Warnings | Fichiers | Sévérité Max |
|----------|----------|---------|----------|----------|---------------|
| Page d'accueil | 1 | 0 | 6 | 3 | 🟡 medium |
| Carte et Actions | 2 | 0 | 89 | 15 | 🔴 critical |
| Dashboard et Pilotage | 3 | 0 | 5 | 2 | 🟡 medium |
| Rapports et Analytics | 4 | 0 | 12 | 6 | 🟠 high |
| Apprentissage et Quiz | 5 | 0 | 8 | 3 | 🟠 high |
| Partenaires et Communauté | 6 | 0 | 28 | 8 | 🟡 medium |
| Chat et Communication | 7 | 0 | 9 | 2 | 🟠 high |
| Administration | 8 | 0 | 16 | 4 | 🔴 critical |
| Autres fichiers | 9 | 0 | 58 | 46 | 🟠 high |

## 📋 Détail par Rubrique

### 🟡 Page d'accueil

**Priorité** : 1 | **Erreurs** : 0 | **Warnings** : 6

**Problèmes principaux** :
- `react/no-unescaped-entities` : 3 occurrences 🟡
- `@next/next/no-img-element` : 2 occurrences 🟡
- `@typescript-eslint/no-explicit-any` : 1 occurrence 🟠

**Fichiers à traiter** :
- `home-community-activity.tsx` : 0 erreurs, 3 warnings
- `home-hero.tsx` : 0 erreurs, 1 warning
- `ZoneRepartitionChart.tsx` : 0 erreurs, 2 warnings

**Actions recommandées** :
- 🟠 **Important** : Traiter les 1 problèmes de haute priorité
- 🟡 **Modéré** : Corriger lors du développement (5 items)

### 🔴 Carte et Actions

**Priorité** : 2 | **Erreurs** : 0 | **Warnings** : 89

**Problèmes principaux** :
- `react-hooks/set-state-in-effect` : 8 occurrences 🔴
- `@typescript-eslint/no-explicit-any` : 25 occurrences 🟠
- `react/no-unescaped-entities` : 18 occurrences 🟡

**Fichiers à traiter** :
- `action-declaration-form.tsx` : 0 erreurs, 12 warnings
- `use-action-declaration-form.ts` : 0 erreurs, 11 warnings
- `action-popup-content.tsx` : 0 erreurs, 7 warnings
- `ActionStepHarvest.tsx` : 0 erreurs, 6 warnings
- `actions-history-list.tsx` : 0 erreurs, 5 warnings

**Actions recommandées** :
- 🔴 **Urgent** : Corriger les 8 problèmes critiques
- 🟠 **Important** : Traiter les 25 problèmes de haute priorité
- 🟡 **Modéré** : Corriger lors du développement (56 items)

### 🟡 Dashboard et Pilotage

**Priorité** : 3 | **Erreurs** : 0 | **Warnings** : 5

**Problèmes principaux** :
- `react/no-unescaped-entities` : 3 occurrences 🟡
- `max-lines` : 1 occurrence 🟢
- `@typescript-eslint/no-unused-vars` : 1 occurrence 🟠

**Fichiers à traiter** :
- `dashboard/page.tsx` : 0 erreurs, 3 warnings
- `business-alerts-panel.tsx` : 0 erreurs, 2 warnings

**Actions recommandées** :
- 🟠 **Important** : Traiter les 1 problèmes de haute priorité
- 🟡 **Modéré** : Corriger lors du développement (3 items)

### 🟠 Rapports et Analytics

**Priorité** : 4 | **Erreurs** : 0 | **Warnings** : 12

**Problèmes principaux** :
- `@typescript-eslint/no-unused-vars` : 5 occurrences 🟠
- `react/no-unescaped-entities` : 3 occurrences 🟡
- `max-lines` : 1 occurrence 🟢

**Fichiers à traiter** :
- `AnimatedImpactMetrics.tsx` : 0 erreurs, 3 warnings
- `reports-kpi-summary.tsx` : 0 erreurs, 2 warnings
- `analytics.ts` : 0 erreurs, 1 warning
- `EcologicalTimeline.tsx` : 0 erreurs, 1 warning
- `RadialProgressGauge.tsx` : 0 erreurs, 1 warning

**Actions recommandées** :
- 🟠 **Important** : Traiter les 8 problèmes de haute priorité
- 🟡 **Modéré** : Corriger lors du développement (3 items)

### 🟠 Apprentissage et Quiz

**Priorité** : 5 | **Erreurs** : 0 | **Warnings** : 8

**Problèmes principaux** :
- `@typescript-eslint/no-explicit-any` : 3 occurrences 🟠
- `react/no-unescaped-entities` : 4 occurrences 🟡
- `max-lines` : 1 occurrence 🟢

**Fichiers à traiter** :
- `environmental-quiz.tsx` : 0 erreurs, 4 warnings
- `planetary-boundaries.tsx` : 0 erreurs, 4 warnings

**Actions recommandées** :
- 🟠 **Important** : Traiter les 3 problèmes de haute priorité
- 🟡 **Modéré** : Corriger lors du développement (4 items)

### 🟡 Partenaires et Communauté

**Priorité** : 6 | **Erreurs** : 0 | **Warnings** : 28

**Problèmes principaux** :
- `@typescript-eslint/no-unused-vars` : 12 occurrences 🟠
- `react/no-unescaped-entities` : 9 occurrences 🟡
- `max-lines` : 1 occurrence 🟢

**Fichiers à traiter** :
- `events-tabs-card.tsx` : 0 erreurs, 7 warnings
- `annuaire-map-canvas.tsx` : 0 erreurs, 6 warnings
- `partner-onboarding-form.tsx` : 0 erreurs, 1 warning
- `compare-section.tsx` : 0 erreurs, 2 warnings
- `reminders-card.tsx` : 0 erreurs, 1 warning

**Actions recommandées** :
- 🟠 **Important** : Traiter les 15 problèmes de haute priorité
- 🟡 **Modéré** : Corriger lors du développement (12 items)

### 🟠 Chat et Communication

**Priorité** : 7 | **Erreurs** : 0 | **Warnings** : 9

**Problèmes principaux** :
- `@typescript-eslint/no-unused-vars` : 5 occurrences 🟠
- `@next/next/no-img-element` : 2 occurrences 🟡
- `react-hooks/exhaustive-deps` : 1 occurrence 🟠

**Fichiers à traiter** :
- `chat-shell.tsx` : 0 erreurs, 5 warnings
- `rich-message-card.tsx` : 0 erreurs, 4 warnings

**Actions recommandées** :
- 🟠 **Important** : Traiter les 6 problèmes de haute priorité
- 🟡 **Modéré** : Corriger lors du développement (2 items)

### 🔴 Administration

**Priorité** : 8 | **Erreurs** : 0 | **Warnings** : 16

**Problèmes principaux** :
- `react-hooks/set-state-in-effect` : 2 occurrences 🔴
- `@typescript-eslint/no-unused-vars` : 12 occurrences 🟠
- `@typescript-eslint/no-explicit-any` : 2 occurrences 🟠

**Fichiers à traiter** :
- Scripts `.mjs` : 0 erreurs, 10 warnings
- `enhanced-admin.tsx` : 0 erreurs, 3 warnings
- `feature-flag-admin.tsx` : 0 erreurs, 3 warnings

**Actions recommandées** :
- 🔴 **Urgent** : Corriger les 2 problèmes critiques
- 🟠 **Important** : Traiter les 14 problèmes de haute priorité

## 🛠️ Guide de Correction Rapide

### `react-hooks/set-state-in-effect`
**Problème** : setState dans useEffect cause des re-renders en cascade  
**Solution** : Déplacer setState dans un callback ou utiliser useLayoutEffect

### `@typescript-eslint/no-explicit-any`
**Problème** : Type any explicite réduit la sécurité des types  
**Solution** : Définir des interfaces TypeScript appropriées

### `react/no-unescaped-entities`
**Problème** : Apostrophes et guillemets non échappés dans JSX  
**Solution** : Remplacer ' par &apos; et " par &quot;

### `@next/next/no-img-element`
**Problème** : Balise <img> non optimisée  
**Solution** : Utiliser <Image> de next/image pour les performances

### `@typescript-eslint/no-unused-vars`
**Problème** : Variables ou imports non utilisés  
**Solution** : Supprimer les déclarations inutiles

## 📈 Plan d'Action Recommandé

### Phase 1 : Corrections Critiques (Immédiat - 2h)
- [ ] Corriger les 10 problèmes `react-hooks/set-state-in-effect`
- [ ] Tester que les fonctionnalités marchent toujours

### Phase 2 : Corrections par Rubrique (Avec développement)
- [ ] **Carte et Actions** - Lors des améliorations UX (25 types `any`)
- [ ] **Administration** - Lors de la maintenance (14 variables non utilisées)
- [ ] **Partenaires** - Lors du développement communauté (15 problèmes)

### Phase 3 : Corrections Opportunistes (Progressif)
- [ ] Apostrophes non échappées - Correction rapide lors de passages
- [ ] Images non optimisées - Migration progressive vers Next.js Image
- [ ] Fichiers longs - Refactorisation lors de modifications importantes

## 🎯 Objectifs

- **Court terme** (1 semaine) : 0 warning critique
- **Moyen terme** (1 mois) : < 150 warnings (-81)
- **Long terme** (3 mois) : < 50 warnings (-181)

*Ce rapport sera mis à jour automatiquement avec `npm run lint:audit`*