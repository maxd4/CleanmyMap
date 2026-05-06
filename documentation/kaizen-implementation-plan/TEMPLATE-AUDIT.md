# Template d'Audit Kaizen — [NOM DU FICHIER]

> **Date :** [DATE] | **Fichier :** `[CHEMIN COMPLET]`  
> **Contexte :** [Bloc UX parent, ex: 03-BLOC-AGIR]

---

## 0. Avant de commencer

**Sources obligatoires à lire avant de remplir ce template :**

```
documentation/ai-guides/AI_MODULARIZATION_GUIDE.md     ← process de découpage
documentation/design-system/VISUAL_STORYTELLING.md     ← règles de visualisation
documentation/design-system/TYPOGRAPHY_SYSTEM.md       ← classes cmm-text-*
documentation/design-system/display-modes-chartes.md   ← mode sobre + fallbacks
documentation/development/AI_MINDSET_KAIZEN.md         ← posture d'amélioration
apps/web/src/components/ui/cmm-button.tsx              ← props boutons
apps/web/src/components/ui/cmm-card.tsx                ← props cards
```

---

## 1. État Actuel

### Fichiers concernés

| Rôle | Fichier | Taille | Lignes |
|------|---------|--------|--------|
| Orchestrateur principal | `[fichier].tsx` | [X KB] | [N] |
| Hook de logique | `use-[...].ts` | [X KB] | [N] |
| Configuration | `[...].config.ts` | [X KB] | [N] |
| Types | `[...].types.ts` | [X KB] | [N] |

### Points forts

- ✅ [Point fort 1]
- ✅ [Point fort 2]

### Dette identifiée (synthèse)

- 🔴 [Dette critique 1]
- 🟠 [Dette haute 2]
- 🟡 [Dette moyenne 3]

---

## 2. Audit Fond (Logique & Architecture)

**Checklist :**

```
□ Fonctions pures extraites et testées unitairement ?
□ Logique métier isolée du rendu JSX ?
□ Cas limites (état vide, erreur réseau, permissions) gérés ?
□ Code mort ou dupliqué supprimé ?
□ Types TypeScript complets (pas de any) ?
□ Performance : memoïsation (useMemo/useCallback) utilisée à bon escient ?
□ Pas de fetch dans un composant — déplacé dans un hook dédié ?
□ Pas d'import circulaire ?
```

### Opportunité Fond 1 : [TITRE] — [CRITIQUE / HAUTE / MOYENNE]

**Problème :** [Description concrète + impact actuel]

**Solution :**
```typescript
// Avant
[code problématique]

// Après
[code corrigé]
```

**Prompt d'exécution :**
```
Fichier cible : [CHEMIN]
Action : [description précise]
Contraintes :
  - Ne pas modifier l'API publique (props, exports)
  - Valider avec : npm -C apps/web run lint && npm run typecheck
```

**Effort :** [0.5 / 1 / 2 / 4]h | **Impact :** [description mesurable]

---

### Opportunité Fond 2 : [TITRE] — [PRIORITÉ]

**Problème :** [Description]

**Solution :**
```typescript
// [code]
```

**Prompt d'exécution :**
```
[prompt]
```

**Effort :** [X]h | **Impact :** [description]

---

## 3. Audit Forme (UX & Design)

**Checklist :**

```
□ Respecte la palette couleur du bloc (tokens Tailwind exacts) ?
□ Mode mixte par défaut (couleurs douces, ni pur clair ni pur sombre) ?
□ Données chiffrables visualisées (SVG, jauge, sparkline) — jamais brutes ?
□ Animations : Framer Motion spring (stiffness 400, damping 10) uniquement ?
□ Max 3 animations simultanées par section ?
□ prefers-reduced-motion géré via useSitePreferences() ?
□ CmmButton et CmmCard utilisés — jamais de bouton/card custom ?
□ Contraste WCAG AA (4.5:1 minimum) sur tous les textes ?
□ Images WebP, max 500 KB, loading="lazy" ?
□ États vides et états d'erreur designés (pas de fallback vide) ?
```

### Opportunité Forme 1 : [TITRE] — [CRITIQUE / HAUTE / MOYENNE]

**Problème :** [Description du problème UX + friction utilisateur]

**Solution :** [Description de la correction visuelle]

**Références :**
- `documentation/design-system/VISUAL_STORYTELLING.md`
- `documentation/liberte-UX-UI/[BLOC]/UX-DIRECTION.md`

**Prompt d'exécution :**
```
Fichier cible : [CHEMIN]
Action : [description]
Tokens à utiliser :
  - Fond : [classe Tailwind exacte]
  - Accent : [classe Tailwind exacte]
  - Composants : CmmButton variant="[...] CmmCard variant="[...]"
Contrainte : gérer prefers-reduced-motion via useSitePreferences()
```

**Effort :** [X]h | **Impact :** [description]

---

### Opportunité Forme 2 : [TITRE] — [PRIORITÉ]

**Problème :** [Description]

**Solution :** [Description]

**Prompt d'exécution :**
```
[prompt]
```

**Effort :** [X]h | **Impact :** [description]

---

## 4. Innovations Proposées

### Innovation 1 : [TITRE]

**Description :** [Ce que ça apporte concrètement]

**Valeur :**
- Utilisateur : [bénéfice direct]
- Produit : [bénéfice business]

**Complexité :** [Faible / Moyenne / Élevée] — [X–Y]h

**Prompt d'exécution :**
```
[prompt détaillé avec étapes numérotées]
```

---

### Innovation 2 : [TITRE]

**Description :** [Description]

**Complexité :** [X–Y]h

**Prompt d'exécution :**
```
[prompt]
```

---

## 5. Plan d'Exécution

| # | Phase | Titre | Effort | Impact |
|---|-------|-------|--------|--------|
| 1 | Fond | [Opportunité Fond 1] | [X]h | [description courte] |
| 2 | Fond | [Opportunité Fond 2] | [X]h | [description courte] |
| 3 | Forme | [Opportunité Forme 1] | [X]h | [description courte] |
| 4 | Forme | [Opportunité Forme 2] | [X]h | [description courte] |
| 5 | Innovation | [Innovation 1] | [X]h | [description courte] |
| — | — | **TOTAL** | **[X]h** | — |

**Séquence recommandée :** Fond d'abord (logique stable) → Forme ensuite (visuel) → Innovations en dernier.

---

## 6. Tests de Validation

```bash
# Après chaque modification
npm -C apps/web run lint
npm run typecheck

# Après extraction de logique
npm -C apps/web run test -- <fichier-test>

# Vérification taille fichier
npm run quality:top-heavy

# Avant de merger
npm run build
```

**Tests spécifiques à ce composant :**
- [ ] [TEST 1] : [condition + seuil mesurable]
- [ ] [TEST 2] : [condition + outil de vérification]
- [ ] Tests accessibilité : contraste ≥ 4.5:1 sur WebAIM
- [ ] Lighthouse Performance > 90, LCP < 2.5s (mobile)

---

## 7. Suivi

| Tâche | Statut | Date |
|-------|--------|------|
| Opportunité Fond 1 | ⏳ | — |
| Opportunité Fond 2 | ⏳ | — |
| Opportunité Forme 1 | ⏳ | — |
| Opportunité Forme 2 | ⏳ | — |
| Innovation 1 | ⏳ | — |
| Tests validés | ⏳ | — |

**Statut global :** ⏸️ En attente  
**Dernière mise à jour :** [DATE]
