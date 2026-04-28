# Système de Répétition Espacée (SRS) Adaptatif

Ce document décrit l'algorithme et les paramètres du système de répétition espacée implémenté pour le Quiz Environnemental de CleanMyMap.

## Algorithme

L'algorithme est une variante simplifiée de **SM-2** (SuperMemo-2), conçu pour optimiser la mémorisation à long terme en adaptant les intervalles de révision selon la performance de l'utilisateur.

### Paramètres de base
- **Ease Factor (EF)** : Facteur de multiplication de l'intervalle. Par défaut à `2.5`. Minimum à `1.3`.
- **Intervalle (I)** : Temps en jours avant la prochaine révision.
- **Streak** : Nombre de succès consécutifs.

### Logique de calcul
Après chaque réponse, une qualité `Q` est attribuée :
- `0` : Réponse fausse.
- `3` : Réponse juste mais difficile ("Pas évident").
- `5` : Réponse juste et facile ("Trop facile").

#### Si la réponse est juste (Q >= 3) :
1. **Streak** est incrémenté.
2. **Intervalle** est calculé selon l'étape :
   - `Streak 1` : 1 jour.
   - `Streak 2` : 6 jours.
   - `Streak > 2` : `Intervalle Précédent * EF`.
3. **Ease Factor** est mis à jour :
   - `EF' = EF + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02))`
   - Si la réponse était "Facile" (5), l'EF augmente, allongeant les futurs intervalles.
   - Si la réponse était "Difficile" (3), l'EF diminue, raccourcissant les futurs intervalles.

#### Si la réponse est fausse (Q = 0) :
1. **Streak** est réinitialisé à 0.
2. **Intervalle** est mis à 0 (la question réapparaîtra dans la session actuelle après 10 minutes).
3. **Ease Factor** subit une pénalité de `-0.2`.

## Stockage
- **Connecté** : Les données sont persistées dans la table Supabase `quiz_srs`.
- **Anonyme** : Les données sont sauvegardées dans le `localStorage` du navigateur.

## Priorisation des questions
Lorsqu'un utilisateur lance un quiz, les questions sont triées selon :
1. Les questions dont la date `next_review_at` est passée (Priorité absolue).
2. Les nouvelles questions (jamais vues).
3. Les questions futures triées par date de révision la plus proche.
