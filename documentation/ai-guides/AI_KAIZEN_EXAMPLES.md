# Exemples de Déclencheurs Kaizen

Guide pratique avec exemples concrets pour détecter et proposer des améliorations.

**Référence** : [AI_MINDSET_KAIZEN.md](../development/AI_MINDSET_KAIZEN.md)

---

## 💡 Exemple 1 : Détection Pendant Lecture de Code

**Situation** : L'IA lit un composant qui affiche "1,234 actions" en texte brut.

**Réaction Kaizen** :
```markdown
💡 Opportunité d'amélioration détectée

J'ai remarqué que les métriques sont affichées en texte brut.
Selon VISUAL_STORYTELLING.md, les données numériques devraient être visualisées.

Proposition :
- Créer des jauges circulaires animées (SVG + Framer Motion)
- Remplacer "1,234 actions" par une jauge visuelle
- Impact : Compréhension instantanée, expérience premium
- Complexité : Faible (1-2h)

Voulez-vous que j'implémente cette amélioration ?
```

---

## 💡 Exemple 2 : Détection Pendant Analyse

**Situation** : L'IA analyse une page et voit beaucoup de champs de saisie.

**Réaction Kaizen** :
```markdown
💡 Opportunité d'amélioration détectée

J'ai remarqué que le formulaire contient 8 champs de saisie texte.
Selon VISUAL_STORYTELLING.md, l'objectif est "Zéro Clavier".

Proposition :
- Remplacer les champs numériques par des curseurs
- Remplacer les listes déroulantes par des boutons visuels
- Ajouter des suggestions auto-complète
- Impact : Réduction de l'effort cognitif, expérience fluide
- Complexité : Moyenne (3-4h)

Voulez-vous que j'implémente ces améliorations ?
```

---

## 💡 Exemple 3 : Détection de Dette Technique

**Situation** : L'IA voit du code dupliqué dans plusieurs composants.

**Réaction Kaizen** :
```markdown
💡 Dette technique détectée

J'ai remarqué que la logique de calcul d'impact est dupliquée dans 3 composants :
- components/home/home-impact-summary.tsx
- components/dashboard/impact-card.tsx
- components/profil/impact-display.tsx

Proposition :
- Extraire dans lib/impact/calculations.ts
- Créer un hook use-impact-calculations.ts
- Impact : Code maintenable, évite les bugs de désynchronisation
- Complexité : Faible (1h)

Voulez-vous que je refactorise ce code ?
```

---

## ⚠️ Exemple 4 : Détection de Cas Limite

**Situation** : L'IA lit une fonction qui ne gère pas les valeurs nulles.

**Réaction Kaizen** :
```markdown
⚠️ Cas limite non géré détecté

La fonction `calculateImpact` ne gère pas le cas où `actions` est vide ou null.
Cela pourrait causer un crash si aucune action n'existe.

Proposition :
```typescript
export function calculateImpact(actions: Action[] | null | undefined) {
  if (!actions || actions.length === 0) {
    return { co2: 0, waste: 0, distance: 0 };
  }
  // ... reste du code
}
```

Impact : Robustesse, évite les crashes
Complexité : Très faible (5 min)

Voulez-vous que j'ajoute cette protection ?
```

---

## 💡 Exemple 5 : Détection d'Opportunité d'Innovation

**Situation** : L'IA travaille sur une page de profil utilisateur.

**Réaction Kaizen** :
```markdown
💡 Opportunité d'innovation détectée

La page de profil affiche les statistiques de l'utilisateur.
Opportunité : Ajouter un système de gamification visible.

Proposition :
- Afficher les badges obtenus avec animations
- Ajouter une barre de progression vers le prochain niveau
- Afficher le classement dans la communauté
- Impact : Motivation, engagement, rétention
- Complexité : Moyenne (4-5h)

Voulez-vous que j'implémente ce système de gamification ?
```

---

## ⚠️ Exemple 6 : Détection de Données Non Sourcées

**Situation** : L'IA voit un calcul de CO2 sans référence.

**Réaction Kaizen** :
```markdown
⚠️ Données non sourcées détectées

Le calcul de CO2 utilise un facteur de 0.5 kg/km sans référence.
Selon [AI_MINDSET_KAIZEN.md](../development/AI_MINDSET_KAIZEN.md), toutes les données doivent être rigoureusement sourcées.

Proposition :
- Ajouter la référence ADEME dans le code
- Créer une page Méthodologie avec toutes les sources
- Ajouter des tooltips avec les références sur le site
- Impact : Crédibilité scientifique, transparence
- Complexité : Faible (2h)

Voulez-vous que j'ajoute ces références ?
```

---

## 📋 Template Format Court

```markdown
💡 [Type] détecté(e)

[Description du problème/opportunité en 1-2 phrases]

Proposition :
- [Solution concrète]
- Impact : [Bénéfice]
- Complexité : [Très faible / Faible / Moyenne / Élevée] ([Estimation temps])

Voulez-vous que j'implémente cette amélioration ?
```

---

## 🏷️ Types de Détections

- 💡 Opportunité d'amélioration détectée
- 💡 Opportunité d'innovation détectée
- 💡 Dette technique détectée
- ⚠️ Cas limite non géré détecté
- ⚠️ Données non sourcées détectées
- ⚠️ Risque de sécurité détecté
- ⚠️ Problème de performance détecté
- ⚠️ Problème d'accessibilité détecté
- ⚠️ Warning lint détecté

---

## 💡 Exemple 7 : Détection d'un Warning Lint

**Situation** : L'IA ajoute un `useEffect` qui calcule un état dérivé, ce qui déclenche `react-hooks/set-state-in-effect`.

**Réaction Kaizen** :
```markdown
⚠️ Warning lint détecté

Le composant calcule un état dérivé dans `useEffect`.
Cela peut masquer une logique pure qui devrait vivre dans le rendu ou dans `useMemo`.

Proposition :
- Déplacer le calcul pur hors de `useEffect`
- Garder l'effet uniquement pour un vrai effet de bord
- Impact : Moins de warnings, logique plus lisible, moins de risques de divergence
- Complexité : Faible (5-10 min)

Voulez-vous que je corrige ce warning à la source ?
```

---

## 💡 Exemple 8 : Carte Interactive Et Invariants

**Situation** : L'IA modifie `/actions/map` et touche à la fois les filtres, la carte et la recherche.

**Réaction Kaizen** :
```markdown
💡 Opportunité d'amélioration détectée

J'ai remarqué que la rubrique carte combine des filtres globaux, une carte Leaflet, une recherche géographique et un journal.
Pour éviter les régressions, il faut traiter ces flux comme un système unique.

Proposition :
- Vérifier que `page.tsx`, `ActionsMapFeed`, `ActionsMapCanvas` et `map-layers` restent synchronisés
- Garder le périmètre `Paris + proche banlieue` cohérent entre recherche, formulaire et carte
- Préserver les invariants: pas de géométrie simulée principale, pas de `lat=null&lng=null`, pas de divergence KPI/journal/carte
- Conserver les fonctions déjà en place: contour du périmètre, recentrage, toggles locaux, sélection du journal, fiche latérale, export CSV, fraîcheur SWR
- Impact : Moins de bugs de cohérence, modèle plus fiable pour les phases suivantes
- Complexité : Faible (lecture + check ciblé)

Voulez-vous que j'applique ce cadrage avant la prochaine modification carte ?
```

**Checklist pratique**
- Lire d'abord `page.tsx`, puis `ActionsMapFeed`, puis `ActionsMapCanvas`
- Ne pas toucher au contrat `/api/actions/map`
- Ne pas réintroduire de carte simulée ou de heatmap fictive
- Désélectionner l’action active si le filtre la fait sortir de la vue
- Relancer le lint et les tests ciblés de la carte avant de conclure
