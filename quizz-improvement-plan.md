# Plan d'Amélioration du Quizz Environnemental - CleanMyMap

Ce document détaille la stratégie pour transformer le quizz actuel en un outil pédagogique de premier plan, couvrant les enjeux climatiques, énergétiques et sociétaux.

## 1. Objectifs Pédagogiques
- **Sensibiliser** aux limites planétaires et aux ODD (objectifs de developpement durable).
- **Clarifier** les enjeux énergétiques (renouvelables, fossiles, nucléaire).
- **Former** aux bonnes pratiques de tri et de gestion des déchets au quotidien pour les bénévoles, à leur echelle de citoyen responsable.
- **Démystifier** les concepts complexes (fission vs fusion, civil vs militaire, equilibre thermique de la terre, effet réel des gaz a effets de serre, différences entre les gaz a effet de serre, conversion entre energie puissance, equivalent pétrole et equivalent gCO2).

## 2. Structure Technique à implémenter
- **Multi-thématiques** : Séparer les questions par catégories claires (Énergie, Climat, Déchets, ODD).
- **Niveaux de difficulté** qui s'ajuste en fonction des réponses aux question
- **Types de questions variés** : 
  - QCM (Choix multiple)
  - Phrase à trous
  - Flashcards (Vrai/Faux)
  - Association (Relier un déchet à sa filière)
  - Toujours ajouter une réponse "je ne sais pas" pour éviter les fausses bonne réponses
- **Système de Progression** : Score par catégorie, badges de réussite, et feedback immédiat avec explications sourcées.

## 3. Thématiques et Contenus cibles

### A. Énergie et Nucléaire
- **Fossiles vs Renouvelables** : Part dans le mix énergétique mondial et français.
- **Le Nucléaire** : 
  - Différence entre **Fission** (actuelle) et **Fusion** (futur, projet ITER).
  - Usages : **Civil** (production électricité), **Naval** (propulsion), **Militaire** (dissuasion).
  - Enjeux : Déchets radioactifs, sûreté, décarbonation.

### B. Limites Planétaires et ODD
- Les **9 limites planétaires** (biodiversité, cycle de l'azote, changement climatique, etc.).
- Les **17 Objectifs de Développement Durable (ODD)** de l'ONU.
- Rapports du GIEC : Scénarios de réchauffement (+1.5°C, +2°C).

### C. Gestion des Déchets (Tri et Seconde Vie)
- Règles de tri (bac jaune, verre, compost).
- Impact des plastiques sur les océans.
- Économie circulaire et réemploi.

## 4. Design et UX
- Utilisation de **Framer Motion** pour des transitions fluides.
- Interface **Mobile-first** avec des boutons larges et tactiles.
- Éléments de **Gamification** : Jauge de progression, sons de réussite (optionnel), résumé d'impact final.

## 5. Guide pour l'IA (Prompt Engineering)
Utiliser ce plan pour générer :
1. Une structure de données JSON étendue pour `QUIZ_QUESTIONS`.
2. Le code React (Tailwind CSS) pour le sélecteur de catégories et la gestion des niveaux.
3. Des explications pédagogiques riches pour chaque réponse.
4. Utiliser des diagrammes, schéma, tableaux, images pour faciliter la visualisation.
