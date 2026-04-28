# Règles Avancées pour Agents IA

Règles supplémentaires pour produire des réponses utiles, cohérentes et vérifiables.

---

## 1. Règle De Fiabilité

Ne jamais inventer :

- un type,
- un chemin de fichier,
- une API,
- un résultat de test,
- un comportement qui n'a pas été lu dans le dépôt.

Si l'information manque, signaler l'hypothèse ou demander une précision.

---

## 2. Gestion Des Prompts Flous

Quand une demande est imprécise :

1. Identifier ce qui manque.
2. Poser une question courte et concrète si la suite dépend de cette information.
3. Si une hypothèse raisonnable est possible, l'indiquer clairement avant d'agir.
4. Ne pas partir sur une implémentation large sans objectif vérifié.

Exemples de signaux d'alerte :

- "améliore ça"
- "fais quelque chose de mieux"
- "optimise le code"
- fichier ou fonctionnalité non spécifié

---

## 3. Vérification De Cohérence

Si la demande impose un mauvais ordre, le signaler avant d'exécuter :

- UI avant logique métier,
- frontend avant API,
- test avant implémentation quand le comportement n'existe pas encore,
- optimisation avant fonctionnement,
- refactor large sans comprendre le flux actuel.

Ordre conseillé pour une nouvelle fonctionnalité :

1. Définir les types et la structure.
2. Implémenter la logique métier.
3. Créer ou adapter l'API.
4. Ajouter les tests.
5. Construire le frontend.
6. Vérifier lint, types et intégration.

---

## 4. Contrat De Réponse

Quand la tâche est terminée, la réponse doit contenir :

1. Ce qui a été fait.
2. Les fichiers modifiés ou créés.
3. Les tests ou vérifications effectués.
4. Les risques résiduels ou hypothèses, s'il y en a.

Quand une suite logique existe, terminer par une action recommandée concrète.

Quand aucune suite n'est utile, ne pas forcer une question finale.

---

## 5. Kaizen

Référence obligatoire : [AI_MINDSET_KAIZEN.md](../development/AI_MINDSET_KAIZEN.md)

La mentalité Kaizen doit rester active, mais seulement si elle sert réellement la tâche en cours.

### Déclencheurs utiles

- Cas limite non géré.
- Code dupliqué.
- Texte qui devrait devenir un visuel.
- Opportunité de simplifier la logique.
- Dette technique visible.

### Quand ne pas l'appliquer

- L'utilisateur demande explicitement une exécution stricte sans suggestion.
- La demande est purement informative.
- Une proposition supplémentaire créerait du bruit ou de la confusion.

### Format court attendu

```markdown
💡 Opportunité d'amélioration détectée

[Description courte du problème ou de l'opportunité]

Proposition :
- [Solution concrète]
- Impact : [bénéfice mesurable]
- Complexité : [Faible / Moyenne / Élevée]
```

---

## 6. Ordre Logique De Développement

### Nouvelle fonctionnalité

1. Structure.
2. Logique métier.
3. API.
4. Tests backend.
5. Frontend.
6. Tests frontend.
7. UI/UX.
8. Optimisation.

### Modification ciblée

1. Lire le fichier concerné.
2. Identifier la cause racine.
3. Corriger le point minimal.
4. Tester le comportement modifié.
5. Vérifier qu'aucune régression n'a été créée.

---

## 7. Règles Spécifiques UI

Avant de modifier l'interface :

- Vérifier que la logique métier existe.
- Vérifier que l'API est prête ou simulée correctement.
- Consulter le design system.
- Réutiliser les composants canoniques quand ils existent.

Checklist rapide :

- composants canoniques utilisés,
- classes cohérentes avec le design system,
- responsive vérifié,
- texte réduit si un visuel est plus clair,
- pas de décorations gratuites qui masquent le sens.

---

## 8. Règles Spécifiques Sécurité

Avant de modifier un code sensible :

- Valider les entrées utilisateur.
- Échapper ou sanitiser le HTML.
- Valider les URLs avec `new URL()` si nécessaire.
- Vérifier les autorisations.
- Éviter toute exposition de secret ou de clé.

---

## 9. Format De Récapitulatif

```markdown
## ✅ [Titre de la tâche] - TERMINÉ

### Résultat
[Résumé en une ou deux phrases]

### Actions réalisées
1. [Action 1]
2. [Action 2]
3. [Action 3]

### Fichiers modifiés
- `chemin/fichier1.ts` - [description]
- `chemin/fichier2.tsx` - [description]

### Validation
- [tests ou vérifications]

### Suite recommandée
[Action concrète uniquement si elle est pertinente]
```

---

## 10. Règle Finale

Une réponse utile doit être :

- vraie,
- vérifiable,
- contextualisée,
- courte quand le sujet est simple,
- précise quand le sujet est risqué.

Si un détail manque, mieux vaut le dire explicitement que le combler avec une supposition.
