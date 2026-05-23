# Implementation Plan: Suppression Charte Dark

## Overview

Ce plan d'implémentation détaille les étapes pour supprimer complètement la charte dark obsolète du projet CleanMyMap. L'approche est conservative et préserve intégralement le mode clair existant tout en éliminant systématiquement tous les éléments liés au mode sombre.

## Tasks

- [-] 1. Analyser et préparer l'environnement de nettoyage
  - Créer un script TypeScript de sauvegarde des fichiers originaux
  - Mettre en place la structure de validation et de rapport
  - Configurer les outils de parsing CSS et JavaScript
  - _Requirements: 5.1, 5.5_

- [ ] 2. Implémenter le nettoyeur CSS principal
  - [~] 2.1 Créer le module CSSCleaner avec parsing et validation
    - Implémenter les fonctions de parsing CSS sécurisé
    - Créer les méthodes de suppression sélective des sections
    - Ajouter la validation syntaxique CSS
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 2.2 Écrire les tests de propriété pour le nettoyage CSS
    - **Property 1: CSS Section Removal Preserves Light Mode**
    - **Property 2: Variable Cleanup Selectivity**
    - **Property 3: Utility Class Preservation**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [~] 2.3 Implémenter la suppression de la section html[data-theme="dark"]
    - Localiser et supprimer la section complète dans globals.css
    - Préserver toutes les variables et styles light mode
    - Valider la syntaxe CSS après suppression
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 2.4 Écrire les tests unitaires pour la suppression CSS
    - Tester la suppression de sections spécifiques
    - Tester la préservation des styles light
    - Tester la gestion des erreurs de syntaxe
    - _Requirements: 1.1, 1.2, 1.3_

- [~] 3. Checkpoint - Valider le nettoyage CSS
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implémenter le nettoyeur de scripts de migration
  - [~] 4.1 Créer le module ScriptCleaner pour les fichiers JavaScript
    - Implémenter le parsing et la manipulation des scripts JS
    - Créer les méthodes de suppression des références dark
    - Ajouter la validation de l'intégrité des scripts
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 4.2 Écrire les tests de propriété pour le nettoyage des scripts
    - **Property 4: Script Transformation Integrity**
    - **Property 5: Complete Reference Elimination**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  
  - [~] 4.3 Nettoyer upgrade-map-ui.js des références dark
    - Supprimer toutes les classes dark: (bg, text, border, hover)
    - Préserver toutes les transformations light mode
    - Valider l'exécution du script après modification
    - _Requirements: 2.1_
  
  - [~] 4.4 Nettoyer refactor_ui.js des références dark
    - Supprimer les règles de remplacement dark mode
    - Préserver toutes les règles de refactoring light
    - Tester l'intégrité des transformations
    - _Requirements: 2.2_
  
  - [~] 4.5 Nettoyer fix_forms_and_map.js des références dark
    - Supprimer les styles dark pour les formulaires et cartes
    - Préserver la fonctionnalité des formulaires et cartes
    - Valider le bon fonctionnement après nettoyage
    - _Requirements: 2.3_
  
  - [ ]* 4.6 Écrire les tests unitaires pour le nettoyage des scripts
    - Tester la suppression sélective des références dark
    - Tester la préservation des fonctionnalités light
    - Tester la validation de l'intégrité des scripts
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [~] 5. Checkpoint - Valider le nettoyage des scripts
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implémenter le nettoyeur du plugin Figma
  - [~] 6.1 Créer le module FigmaCleaner pour le plugin
    - Implémenter le parsing du code JavaScript du plugin
    - Créer les méthodes de suppression des tokens et composants dark
    - Ajouter la validation de la génération de templates
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 6.2 Écrire les tests de propriété pour le plugin Figma
    - **Property 6: Figma Plugin Light-Only Generation**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
  
  - [~] 6.3 Supprimer les tokens dark du plugin
    - Supprimer l'objet `dark` de la fonction buildTokens()
    - Supprimer les styles dark de createStyles()
    - Préserver tous les tokens et styles light
    - _Requirements: 3.1, 3.3_
  
  - [~] 6.4 Supprimer les composants dark du plugin
    - Supprimer les fonctions de build des composants dark
    - Modifier buildTemplateFrame pour ne générer que du light
    - Valider que seuls les templates light sont générés
    - _Requirements: 3.2, 3.4, 3.5_
  
  - [ ]* 6.5 Écrire les tests unitaires pour le plugin Figma
    - Tester la suppression des tokens dark
    - Tester la génération light-only des templates
    - Tester la cohérence des styles générés
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 7. Implémenter la validation globale et les rapports
  - [~] 7.1 Créer le module de validation globale
    - Implémenter la validation de compilation du projet
    - Créer les vérifications d'intégrité du système de couleurs
    - Ajouter la génération de rapports détaillés
    - _Requirements: 4.1, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 7.2 Écrire les tests de propriété pour la validation globale
    - **Property 7: Build System Compatibility**
    - **Property 8: Design System Consistency**
    - **Property 9: Change Tracking Completeness**
    - **Property 10: Color System Structure Preservation**
    - **Validates: Requirements 4.1, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5**
  
  - [~] 7.3 Valider la compilation du projet après nettoyage
    - Exécuter la compilation complète du projet
    - Vérifier l'absence d'erreurs de build
    - Valider que le CSS généré ne contient aucune référence dark
    - _Requirements: 4.1, 4.5_
  
  - [~] 7.4 Valider l'intégrité du système de couleurs 5-blocs
    - Vérifier que la structure 5-blocs est préservée
    - Tester la logique multi-teintes en mode light
    - Valider les mappings d'accent par bloc
    - Vérifier le fonctionnement des couleurs de profil
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [~] 7.5 Générer le rapport de nettoyage complet
    - Créer le rapport détaillé des fichiers modifiés
    - Lister tous les changements effectués par catégorie
    - Générer le résumé de validation
    - Archiver l'historique des changements
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 7.6 Écrire les tests unitaires pour la validation
    - Tester la validation de compilation
    - Tester la vérification du système de couleurs
    - Tester la génération de rapports
    - _Requirements: 4.1, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Intégration et tests end-to-end
  - [~] 8.1 Créer le script principal d'orchestration
    - Intégrer tous les modules de nettoyage
    - Implémenter l'exécution séquentielle avec validation
    - Ajouter la gestion d'erreur et le rollback
    - _Requirements: 4.1, 4.4, 5.1_
  
  - [ ]* 8.2 Écrire les tests d'intégration
    - Tester le processus complet de nettoyage
    - Tester la gestion d'erreur et le rollback
    - Tester la génération du rapport final
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.3_
  
  - [~] 8.3 Exécuter le nettoyage complet sur une copie de test
    - Créer une copie complète du projet pour test
    - Exécuter le processus de nettoyage complet
    - Valider tous les résultats et rapports
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [~] 9. Checkpoint final - Validation complète
  - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2.1"] },
    { "wave": 3, "tasks": ["2.2", "2.3"] },
    { "wave": 4, "tasks": ["2.4"] },
    { "wave": 5, "tasks": ["3"] },
    { "wave": 6, "tasks": ["4.1"] },
    { "wave": 7, "tasks": ["4.2", "4.3", "4.4", "4.5"] },
    { "wave": 8, "tasks": ["4.6"] },
    { "wave": 9, "tasks": ["5"] },
    { "wave": 10, "tasks": ["6.1"] },
    { "wave": 11, "tasks": ["6.2", "6.3", "6.4"] },
    { "wave": 12, "tasks": ["6.5"] },
    { "wave": 13, "tasks": ["7.1"] },
    { "wave": 14, "tasks": ["7.2", "7.3", "7.4", "7.5"] },
    { "wave": 15, "tasks": ["7.6"] },
    { "wave": 16, "tasks": ["8.1"] },
    { "wave": 17, "tasks": ["8.2"] },
    { "wave": 18, "tasks": ["8.3"] },
    { "wave": 19, "tasks": ["9"] }
  ]
}
```

## Notes

- Les tâches marquées avec `*` sont optionnelles et peuvent être omises pour un MVP plus rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les checkpoints garantissent une validation incrémentale
- Les tests de propriété valident les propriétés de correction universelles
- Les tests unitaires valident des exemples spécifiques et les cas d'erreur
- L'approche conservative préserve intégralement le mode clair existant