# Conversion automatique des mégots en masse

## Résumé des modifications

La conversion du nombre de mégots en masse se fait maintenant directement dans le formulaire selon l'état choisi (sec, humide, mouillé), permettant à la base de données de recevoir directement la masse sans mélanger différents types de données.

## Fichiers modifiés

### 1. `action-declaration-form.model.ts`
- **Ajout** : Champ `cigaretteButtsCondition: ActionMegotsCondition` au type `FormState`
- **Ajout** : Constantes de conversion `CIGARETTE_BUTT_WEIGHTS`
- **Ajout** : Fonction `convertCigaretteButtsToKg(count, condition)` pour la conversion automatique
- **Modification** : `initialState` avec valeur par défaut `cigaretteButtsCondition: "propre"`

### 2. `action-declaration-form.main-fields.tsx`
- **Ajout** : Import de `convertCigaretteButtsToKg` et `ActionMegotsCondition`
- **Ajout** : Prop `onCigaretteButtsConditionChange` dans les props du composant
- **Modification** : Section mégots avec sélecteur d'état (sec/humide/mouillé)
- **Ajout** : Calcul et affichage en temps réel de la conversion automatique
- **Ajout** : Indicateur visuel de la masse convertie

### 3. `action-declaration-form.tsx`
- **Ajout** : Import de `convertCigaretteButtsToKg` et `ActionMegotsCondition`
- **Modification** : Logique `updateField` avec conversion automatique pour les champs mégots
- **Ajout** : Gestionnaire `onCigaretteButtsConditionChange` passé au composant des champs principaux
- **Logique** : Mise à jour automatique du poids total quand le nombre ou l'état des mégots change

### 4. `action-declaration/types.ts`
- **Ajout** : Champ `cigaretteButtsCondition: ActionMegotsCondition` au type `FormState`

### 5. `action-declaration/payload.ts`
- **Modification** : `BASE_FORM_STATE` avec `cigaretteButtsCondition: "propre"`

## Logique de conversion

### Poids par mégot (en grammes)
- **Sec (propre)** : 0.2g
- **Humide** : 0.4g  
- **Mouillé** : 0.6g

### Comportement du formulaire
1. L'utilisateur saisit le nombre de mégots (pour actions spontanées uniquement)
2. L'utilisateur choisit l'état : sec, humide, ou mouillé
3. La conversion se fait automatiquement : `masse_kg = (nombre × poids_par_état) / 1000`
4. La masse convertie est ajoutée au poids total des déchets
5. Un indicateur visuel montre la conversion en temps réel

### Exemple de conversion
- 50 mégots secs = 50 × 0.2g = 10g = 0.010 kg
- 50 mégots humides = 50 × 0.4g = 20g = 0.020 kg  
- 50 mégots mouillés = 50 × 0.6g = 30g = 0.030 kg

## Interface utilisateur

### Champs ajoutés (actions spontanées uniquement)
1. **Nombre de mégots** : Input numérique optionnel
2. **État des mégots** : Sélecteur avec options "Sec", "Humide", "Mouillé"
3. **Indicateur de conversion** : Affichage en temps réel de la masse calculée

### Affichage de la conversion
```
Conversion automatique : 75 mégots secs = 0.015 kg
Cette masse sera ajoutée automatiquement au poids total
```

## Avantages

1. **Cohérence des données** : La base de données ne reçoit que des masses en kg
2. **Simplicité utilisateur** : Possibilité de déclarer en nombre de mégots pour les petites actions
3. **Précision** : Prise en compte de l'état d'humidité des mégots
4. **Transparence** : Conversion visible en temps réel pour l'utilisateur
5. **Flexibilité** : Disponible uniquement pour les actions spontanées où c'est pertinent

## Tests

La logique de conversion a été testée avec différents scénarios :
- ✅ Conversion correcte selon l'état (sec/humide/mouillé)
- ✅ Mise à jour automatique du poids total
- ✅ Affichage en temps réel de la conversion
- ✅ Compilation réussie sans erreurs liées aux modifications