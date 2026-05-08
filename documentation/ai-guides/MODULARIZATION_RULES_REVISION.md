# Révision des Règles de Modularisation

**Date :** 2026-05-07  
**Version :** Guide v4.1.0 → v5.0.0  
**Raison :** Ajustement basé sur l'expérience des 3 premiers plans exécutés

## Changements principaux

### 1. Seuils de taille revus à la hausse

#### Avant (trop strict)
- `page.tsx` : 80 lignes max
- Composant orchestrateur : 150 lignes max
- Hook : 200 lignes max

#### Après (pragmatique)
- `page.tsx` : 150 lignes (acceptable jusqu'à 200)
- Composant orchestrateur : 300 lignes (limite 400)
- Hook : 250 lignes (acceptable si cohérent)

**Justification :** Les seuils précédents forçaient une sur-modularisation. Un fichier de 300 lignes bien structuré est plus maintenable que 5 fichiers de 60 lignes avec dépendances croisées.

### 2. Principe de cohésion fonctionnelle

**Nouveau principe directeur :**
> Privilégier la **cohésion fonctionnelle** sur la taille brute.

Un fichier doit être modularisé si :
- Il a **plusieurs responsabilités distinctes** (pas juste parce qu'il est long)
- Il dépasse **500 lignes** (seuil critique)
- Des blocs de **100+ lignes** sont réutilisables ailleurs

### 3. Règle des 3 usages

**Nouvelle règle :**
> N'extraire un composant que s'il est réutilisé **3+ fois** OU s'il dépasse **150 lignes**.

**Avant :** Extraction systématique dès qu'un bloc dépassait 50 lignes.  
**Après :** Évaluation au cas par cas selon la réutilisabilité et le couplage.

### 4. Critères de décision explicites

Ajout d'une section "Extraire ou pas ?" avec critères clairs :

**EXTRAIRE si :**
- Bloc > 100 lignes ET responsabilité distincte
- Réutilisé 3+ fois
- Fichier parent > 500 lignes
- Difficile à tester en contexte

**NE PAS EXTRAIRE si :**
- Bloc < 50 lignes
- Fortement couplé (5+ props du parent)
- Extraction crée plus de complexité

### 5. Anti-patterns documentés

Ajout d'exemples concrets d'anti-patterns :
- Sur-modularisation (15 fichiers pour 200 lignes)
- Prop drilling excessif (15 props sur 3 niveaux)
- Abstractions prématurées (hook pour 3 lignes)

### 6. Métriques de qualité

Ajout de métriques pour évaluer le succès d'une modularisation :

**Bonnes métriques :**
- Réduction 40-60% du fichier principal
- 1-2 responsabilités par fichier
- Temps de compréhension réduit de 50%+

**Métriques problématiques :**
- Réduction < 20%
- Plus de 10 fichiers créés
- Props par composant > 10

## Résultats des plans exécutés

### PLAN-003 : Creator Inbox ✅ Excellent
- **Avant :** 696 lignes
- **Après :** 80 lignes + 6 fichiers
- **Réduction :** 88%
- **Verdict :** Modularisation exemplaire

### PLAN-004 : Annuaire Seed ✅ Très bon
- **Avant :** 659 lignes, 26 KB
- **Après :** 5 fichiers par catégorie
- **Réduction :** Fichiers de 4-12 KB
- **Verdict :** Bonne séparation par domaine

### PLAN-005 : Actions Map ⚠️ Acceptable
- **Avant :** 506 lignes
- **Après :** 304 lignes + 4 composants
- **Réduction :** 40%
- **Verdict :** Acceptable, mais aurait pu rester à 350 lignes

**Leçon :** Le PLAN-005 montre qu'une réduction de 40% est suffisante si le fichier reste lisible. Pas besoin de viser 60% systématiquement.

## Nouveaux documents

1. **MODULARIZATION_PRAGMATIC_PRINCIPLES.md**
   - Philosophie YAGNI
   - Seuils révisés
   - Patterns de décision
   - Anti-patterns
   - Checklist de validation
   - Exemples du projet

2. **AI_MODULARIZATION_GUIDE.md (révisé)**
   - Seuils mis à jour
   - Règle des 3 usages ajoutée
   - Critères de décision explicites
   - Note sur index.ts optionnel

## Impact sur les plans futurs

Les plans restants (006-013) seront exécutés avec ces nouveaux principes :

- **Priorité :** Fichiers > 600 lignes
- **Évaluation :** Fichiers 400-600 lignes
- **Surveillance :** Fichiers 300-400 lignes
- **Pas de modularisation :** Fichiers < 300 lignes (sauf responsabilités multiples)

## Conclusion

Ces révisions rendent la modularisation :
- ✅ Plus pragmatique
- ✅ Moins dogmatique
- ✅ Mieux adaptée au contexte réel
- ✅ Plus facile à décider (critères clairs)

**Principe final :**  
*"Modulariser intelligemment, pas systématiquement."*
