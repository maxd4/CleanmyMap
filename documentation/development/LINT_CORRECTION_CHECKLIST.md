# Checklist de Correction ESLint

**Rubrique** : _[Nom de la rubrique en cours de développement]_  
**Date** : _[Date de début des corrections]_  
**Développeur** : _[Nom du développeur]_

---

## 📋 Avant de commencer

- [ ] Consulter l'audit ESLint : `npm run lint:audit`
- [ ] Identifier les warnings de la rubrique concernée
- [ ] Estimer le temps nécessaire pour les corrections
- [ ] Créer une branche dédiée : `git checkout -b fix/lint-[rubrique]`

---

## 🔍 Analyse des warnings

### Warnings critiques (🔴 - À corriger immédiatement)
- [ ] `react-hooks/set-state-in-effect` : _____ occurrences
- [ ] `react/jsx-no-undef` : _____ occurrences
- [ ] Autres critiques : _____

### Warnings haute priorité (🟠 - À corriger avec le développement)
- [ ] `@typescript-eslint/no-explicit-any` : _____ occurrences
- [ ] `@typescript-eslint/no-unused-vars` : _____ occurrences
- [ ] `react-hooks/exhaustive-deps` : _____ occurrences

### Warnings moyenne priorité (🟡 - Corrections rapides)
- [ ] `react/no-unescaped-entities` : _____ occurrences
- [ ] `@next/next/no-img-element` : _____ occurrences

### Warnings faible priorité (🟢 - Optionnel)
- [ ] `max-lines` : _____ occurrences
- [ ] Directives ESLint inutiles : _____ occurrences

---

## 🛠️ Plan de correction

### Étape 1 : Corrections critiques
**Fichiers concernés** :
- [ ] `_____` - Description du problème
- [ ] `_____` - Description du problème
- [ ] `_____` - Description du problème

**Actions** :
- [ ] Déplacer les `setState` hors des `useEffect`
- [ ] Corriger les imports manquants
- [ ] Tester que les fonctionnalités marchent toujours

### Étape 2 : Corrections haute priorité
**Fichiers concernés** :
- [ ] `_____` - Types `any` à remplacer
- [ ] `_____` - Variables non utilisées à supprimer
- [ ] `_____` - Dépendances useEffect à ajouter

**Actions** :
- [ ] Créer les interfaces TypeScript appropriées
- [ ] Nettoyer les imports et variables inutiles
- [ ] Vérifier les dépendances des hooks

### Étape 3 : Corrections rapides
**Fichiers concernés** :
- [ ] `_____` - Apostrophes à échapper
- [ ] `_____` - Images à optimiser

**Actions** :
- [ ] Remplacer `'` par `&apos;` dans JSX
- [ ] Remplacer `<img>` par `<Image>` de Next.js
- [ ] Ajouter les props width/height nécessaires

---

## ✅ Validation

### Tests automatiques
- [ ] `npm run lint` passe sans erreur
- [ ] `npm run typecheck` passe sans erreur
- [ ] `npm run test` passe (si tests existants)

### Tests manuels
- [ ] La rubrique fonctionne correctement
- [ ] Aucune régression visuelle
- [ ] Performance maintenue (pas de ralentissement)

### Métriques
**Avant corrections** :
- Erreurs : _____
- Warnings : _____

**Après corrections** :
- Erreurs : _____
- Warnings : _____

**Amélioration** : _____ warnings corrigés

---

## 📝 Documentation des corrections

### Corrections appliquées

#### `react-hooks/set-state-in-effect`
```typescript
// Avant
useEffect(() => {
  setState(value);
}, []);

// Après  
useEffect(() => {
  const updateState = () => setState(value);
  updateState();
}, []);
```

#### `@typescript-eslint/no-explicit-any`
```typescript
// Avant
const handleData = (data: any) => { ... }

// Après
interface DataProps {
  id: string;
  value: number;
}
const handleData = (data: DataProps) => { ... }
```

#### `react/no-unescaped-entities`
```jsx
// Avant
<p>L'action s'est bien passée</p>

// Après
<p>L&apos;action s&apos;est bien passée</p>
```

#### `@next/next/no-img-element`
```jsx
// Avant
<img src="/photo.jpg" alt="Photo" />

// Après
import Image from 'next/image';
<Image src="/photo.jpg" alt="Photo" width={300} height={200} />
```

### Difficultés rencontrées
- [ ] Aucune difficulté particulière
- [ ] Problème de types complexes : _____
- [ ] Régression fonctionnelle : _____
- [ ] Performance impactée : _____

### Solutions trouvées
_[Décrire les solutions non-standard ou créatives utilisées]_

---

## 🚀 Finalisation

### Commit et merge
- [ ] Commit avec message descriptif : `fix(lint): correct [rubrique] warnings`
- [ ] Push de la branche
- [ ] Création de la PR avec description des corrections
- [ ] Review et merge

### Mise à jour de la documentation
- [ ] Mettre à jour `LINT_AUDIT.md` si nécessaire
- [ ] Documenter les patterns de correction pour l'équipe
- [ ] Partager les bonnes pratiques découvertes

### Suivi
- [ ] Vérifier que les métriques sont mises à jour
- [ ] Planifier les prochaines corrections si nécessaire
- [ ] Célébrer l'amélioration de la qualité du code ! 🎉

---

## 📊 Métriques finales

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| Erreurs totales | _____ | _____ | _____ |
| Warnings totaux | _____ | _____ | _____ |
| Warnings critiques | _____ | _____ | _____ |
| Fichiers concernés | _____ | _____ | _____ |

**Temps passé** : _____ heures  
**Efficacité** : _____ warnings/heure

---

*Cette checklist doit être remplie à chaque session de correction de warnings ESLint pour maintenir la traçabilité et l'amélioration continue.*