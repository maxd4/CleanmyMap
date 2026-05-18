# Guide de Standardisation des Prompts IA (CleanMyMap)

Ce guide définit les bonnes pratiques pour l'utilisation de l'IA (LLM, Agents) au sein du projet CleanMyMap, afin de réduire le "bruit numérique" (itérations inutiles) et d'optimiser l'Indice d'Utilité Réelle (IUR).

## Principes Fondamentaux
1. **Zéro Feature Creep** : Ne jamais demander à l'IA d'inventer une fonctionnalité non prévue dans la roadmap.
2. **Context First** : Fournir systématiquement les fichiers de référence (schémas, types, patterns existants).
3. **Atomicité** : Demander une seule modification structurelle par prompt.
4. **Validation Humaine** : Tout code généré doit être relu et testé selon la grille de décision IA.

## Bibliothèque de Prompts par Cas d'Usage

### 1. Développement UI / Composants
**Objectif** : Créer des composants sobres, accessibles et typés.
> "Agis en tant qu'expert React/Next.js. Crée un composant [Nom] en utilisant le design system existant (@/components/ui). Contraintes : Utilise Tailwind CSS uniquement, assure-toi que le composant est accessible (ARIA), et évite les bibliothèques lourdes pour les animations simples."

### 2. Documentation Technique
**Objectif** : Documenter l'architecture de manière concise.
> "Analyse le fichier [Path] et génère une documentation technique au format Markdown. Structure : Rôle du fichier, Entrées/Sorties, Dépendances critiques, et Points de vigilance sécurité/performance. Reste factuel et évite le superflu."

### 3. Debugging & Performance
**Objectif** : Identifier les goulots d'étranglement énergétiques.
> "Analyse ce bloc de code pour identifier des problèmes de performance potentiels (re-renders inutiles, bundles lourds, requêtes redondantes). Propose une solution optimisant le rendu côté serveur (RSC) si possible."

## Critères d'Acceptation du Code Généré
- [ ] Le code respecte les types TypeScript.
- [ ] Aucune nouvelle dépendance `npm` n'est ajoutée sans justification.
- [ ] L'impact sur le bundle final est minimal.
- [ ] Les secrets et données sensibles sont protégés.

## Sécurité et Vérification (Garde-fous)
Pour éviter l'erreur critique d'**oubli de déplacement** (suppression accidentelle de paragraphes), tout agent doit :
1. Comparer le nombre de lignes avant/après chaque modification.
2. Tolérer une variation de maximum **2%** du volume global.
3. Consulter systématiquement [AI_GUARDRAILS.md](file:///c:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/maintenance/AI_GUARDRAILS.md) avant toute intervention complexe.
