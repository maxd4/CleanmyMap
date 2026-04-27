# Ajout du champ "Nombre de mégots" - Résumé des modifications

## ✅ Objectif atteint

**Champ optionnel "Nombre de mégots" ajouté pour les actions spontanées**

L'utilisateur peut maintenant déclarer un nombre de mégots plutôt qu'un poids pour les actions spontanées réalisées seul.

## 📋 Modifications apportées

### 1. Types et modèles de données
- **FormState** (2 fichiers) : Ajout de `cigaretteButtsCount: string`
- **CreateActionPayload** : Ajout de `cigaretteButtsCount?: number` (optionnel)
- **État initial** : `cigaretteButtsCount: ""` (vide par défaut)

### 2. Interface utilisateur
- **ActionDeclarationMainFields** : Nouveau champ affiché pour `isActionSpontanee`
- **Apparence** : Bordure orange, fond orange/50, distinct du champ poids
- **Libellé** : "Nombre de mégots (optionnel)"
- **Placeholder** : "Ex: 50"
- **Aide** : "Alternative au poids pour les actions individuelles"

### 3. Logique métier
- **buildCreateActionPayload** : Inclusion de `cigaretteButtsCount` via `toOptionalNumber()`
- **Validation** : Strictement positif si renseigné (> 0)
- **Handler** : `onCigaretteButtsCountChange` dans le formulaire principal

### 4. Validation et schémas
- **Zod schema** : `z.number().int().min(1).max(10000).optional()`
- **Validation formulaire** : Vérification que la valeur est vide ou > 0
- **Message d'erreur** : "Le nombre de mégots doit être strictement positif"

## 🎯 Comportement utilisateur

### Affichage conditionnel
```typescript
{isActionSpontanee && (
  <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
    <label>Nombre de mégots (optionnel)</label>
    <input type="number" min="1" step="1" />
  </div>
)}
```

### Logique d'affichage
- **Affiché** : Quand `form.associationName === "Action spontanee"`
- **Masqué** : Pour toutes les autres structures (associations, entreprises)
- **Optionnel** : Peut rester vide sans erreur

## 🔒 Contraintes respectées

### ✅ Contraintes strictes
- **Aucun champ de poids supprimé** : `wasteKg` conservé intact
- **Compatibilité** : Anciennes déclarations non cassées
- **Optionnel** : Champ non obligatoire (justification: usage spécifique)
- **Aucune formule inventée** : Pas d'impact calculé affiché
- **Aucune dépendance** : Utilisation des utilitaires existants
- **Pas de changements cosmétiques** : Modifications ciblées uniquement

### 📊 Validation des données
```typescript
// Payload généré
{
  wasteKg: 2.5,                    // Champ existant préservé
  cigaretteButts: 0,               // Champ existant préservé  
  cigaretteButtsCount: 150,        // Nouveau champ optionnel
  // ... autres champs
}
```

## 🔧 Fichiers modifiés

### Types et modèles
1. `src/components/actions/action-declaration-form.model.ts`
2. `src/components/actions/action-declaration/types.ts`
3. `src/lib/actions/types.ts`

### Composants UI
4. `src/components/actions/action-declaration-form.main-fields.tsx`
5. `src/components/actions/action-declaration-form.tsx`

### Logique métier
6. `src/components/actions/action-declaration/payload.ts`
7. `src/lib/validation/action.ts`

### Tests
8. `src/test-cigarette-butts-count.ts` (nouveau)

## 📈 Cas d'usage

### Action spontanée typique
```
Utilisateur: "J'ai ramassé 150 mégots dans la rue"
Formulaire: 
- Structure: "⭐ Action spontanee"
- Nombre de mégots: 150 (nouveau champ visible)
- Poids déchets: 2.5 kg (champ existant)
```

### Action organisée
```
Utilisateur: Association "Paris Clean Walk"
Formulaire:
- Structure: "Paris Clean Walk" 
- Champ mégots: masqué (non pertinent)
- Poids déchets: 15.2 kg (champ principal)
```

## ✅ Vérifications effectuées

- ✅ **Build compile** sans erreur
- ✅ **Types TypeScript** cohérents
- ✅ **Validation Zod** fonctionnelle
- ✅ **Affichage conditionnel** correct
- ✅ **Payload API** inclut le nouveau champ
- ✅ **Compatibilité** avec données existantes

## 🎯 Résultat final

**Objectif atteint** : Les utilisateurs d'actions spontanées peuvent maintenant déclarer un **nombre de mégots** comme alternative au poids, avec un champ **optionnel**, **validé**, et **affiché conditionnellement** selon le type d'action.

La conversion automatique en poids sera gérée côté base de données sans impact sur l'interface utilisateur.