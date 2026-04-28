# Exemples de Déclencheurs Kaizen

Guide pratique avec exemples concrets pour détecter et proposer des améliorations.

**Référence** : `documentation/development/AI_MINDSET_KAIZEN.md`

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
Selon AI_MINDSET_KAIZEN.md, toutes les données doivent être rigoureusement sourcées.

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
