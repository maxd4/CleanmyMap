# Guide de Standardisation des Prompts IA (CleanMyMap)

Ce guide définit les bonnes pratiques pour l'utilisation de l'IA (LLM, Agents) au sein du projet CleanMyMap, afin de réduire le "bruit numérique" (itérations inutiles) et d'optimiser l'Indice d'Utilité Réelle (IUR).

## Principes Fondamentaux
1. **Zéro Feature Creep** : Ne jamais demander à l'IA d'inventer une fonctionnalité non prévue dans la roadmap.
2. **Context First** : Fournir systématiquement les fichiers de référence (schémas, types, patterns existants).
3. **Atomicité** : Demander une seule modification structurelle par prompt.
4. **Validation Humaine** : Tout code généré doit être relu et testé selon la grille de décision IA.

## Interprétation Des Plans Et Backlog Fournis Par ChatGPT

Les plans, backlogs et instructions fournis par ChatGPT doivent être traités comme un cadre d'objectif,
de contraintes métier et de validation.
Ils ne représentent pas nécessairement l'état réel du dépôt.

### Limites Du Contexte ChatGPT

ChatGPT peut ne pas avoir accès à :

- l'état actuel complet du dépôt local ;
- les modifications non commit ou non poussées ;
- les fichiers exclus par `.gitignore` ;
- les fichiers `.env` et autres secrets locaux ;
- l'état réel du terminal, des processus et des outils installés ;
- toutes les variables d'environnement Vercel ;
- toute la configuration Supabase ;
- les différences entre environnement local, preview et production ;
- les changements intervenus depuis sa dernière lecture du projet.

### Vérifications Obligatoires Avant Toute Modification Significative

1. Inspecter l'état réel du dépôt, les fichiers concernés, `git status`, les diffs locaux, les conventions existantes et les dépendances pertinentes.
2. Vérifier les hypothèses du prompt contre le code et l'infrastructure réellement disponibles.
3. Rechercher les abstractions, fonctions, types, migrations, scripts ou mécanismes existants avant d'en créer de nouveaux.
4. Ne jamais supposer qu'un chemin de fichier, une architecture, un nom de fonction, une table, une variable ou une stratégie proposée par ChatGPT existe réellement.
5. Adapter l'implémentation lorsque l'état réel du projet l'exige, sans perdre l'objectif, les contraintes critiques ni les invariants demandés.

### Priorité Des Sources De Vérité

En cas de contradiction, utiliser cet ordre de priorité :

1. l'état réel du système et les contraintes de sécurité ;
2. le code local actuel et les modifications non commit ;
3. le schéma, les migrations et l'infrastructure réellement déployés ;
4. les conventions et l'architecture existantes du projet ;
5. la documentation actuelle du dépôt ;
6. le prompt ChatGPT.

Le prompt reste prioritaire pour définir l'intention fonctionnelle et les contraintes explicites,
sauf impossibilité technique, contradiction avec l'état réel ou risque de régression.

### Liberté D'Implémentation

Le projet réel peut justifier d'autres fichiers à modifier,
la réutilisation d'une abstraction existante,
l'évitement d'une migration inutile,
la modification d'une stratégie proposée,
ou un élargissement raisonnable du périmètre lorsque cela est indispensable à une implémentation cohérente.

Toute divergence importante doit être justifiée dans le compte rendu final.

### Infrastructure Et Secrets

Ne jamais afficher, copier dans un rapport, commit ou document de travail :

- les clés privées ;
- les tokens ;
- les mots de passe ;
- les secrets `.env` ;
- les credentials Supabase, Vercel ou services tiers.

Inspecter leur présence et leur rôle lorsque nécessaire, sans exposer leur valeur.

### Validation Finale Obligatoire

Avant de déclarer la tâche terminée :

- vérifier que l'objectif fonctionnel réel est satisfait ;
- exécuter les validations pertinentes du projet ;
- vérifier les régressions potentielles ;
- distinguer clairement ce qui a été vérifié de ce qui reste non vérifiable ;
- signaler toute hypothèse importante encore non confirmée.

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
