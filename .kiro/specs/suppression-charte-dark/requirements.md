# Requirements Document

## Introduction

Ce document spécifie les exigences pour la suppression complète de la charte dark obsolète du projet CleanMyMap. La charte dark actuelle est devenue obsolète et doit être entièrement supprimée tout en préservant la fonctionnalité du mode clair et en maintenant la cohérence du système de design.

## Glossary

- **Charte_Dark**: L'ensemble des styles CSS, variables et composants dédiés au mode sombre obsolète
- **Mode_Clair**: Le mode d'affichage principal utilisant les couleurs claires
- **Système_Design**: L'ensemble cohérent des tokens, variables et styles CSS du projet
- **Scripts_Migration**: Les fichiers JavaScript dans `/scripts/` contenant des références aux classes dark
- **Plugin_Figma**: Le générateur de templates Figma contenant des tokens dark
- **Globals_CSS**: Le fichier principal `apps/web/src/app/globals.css` contenant les styles globaux

## Requirements

### Requirement 1

**User Story:** En tant que développeur, je veux supprimer complètement la section dark theme du fichier CSS principal, afin d'éliminer le code obsolète et simplifier la maintenance.

#### Acceptance Criteria

1. WHEN the `html[data-theme="dark"]` section is removed from globals.css, THEN the System SHALL maintain all light mode functionality
2. WHEN dark-specific CSS variables are removed, THEN the System SHALL preserve all existing light mode variables
3. WHEN dark-specific utility classes are removed, THEN the System SHALL maintain all light mode utility classes
4. WHEN glassmorphism dark variants are removed, THEN the System SHALL preserve light mode glassmorphism effects
5. WHEN dark mode typography styles are removed, THEN the System SHALL maintain light mode typography consistency

### Requirement 2

**User Story:** En tant que développeur, je veux nettoyer tous les scripts de migration des références aux classes dark, afin d'éliminer les dépendances obsolètes et éviter les erreurs futures.

#### Acceptance Criteria

1. WHEN dark class references are removed from upgrade-map-ui.js, THEN the Script SHALL maintain all light mode transformations
2. WHEN dark class references are removed from refactor_ui.js, THEN the Script SHALL preserve all light mode refactoring rules
3. WHEN dark class references are removed from fix_forms_and_map.js, THEN the Script SHALL maintain form and map functionality
4. WHEN dark-specific replacements are removed, THEN the Scripts SHALL continue to function for light mode updates
5. WHEN script execution completes, THEN the System SHALL validate that no dark references remain

### Requirement 3

**User Story:** En tant que designer, je veux supprimer les tokens dark du plugin Figma, afin de maintenir la cohérence avec le système de design simplifié.

#### Acceptance Criteria

1. WHEN dark tokens are removed from the plugin, THEN the Plugin SHALL generate only light mode templates
2. WHEN dark components are removed, THEN the Plugin SHALL maintain all light mode component generation
3. WHEN dark styles are removed, THEN the Plugin SHALL preserve light mode style consistency
4. WHEN the plugin executes, THEN the System SHALL generate templates without dark variants
5. WHEN template generation completes, THEN the Output SHALL contain only light mode components

### Requirement 4

**User Story:** En tant que développeur, je veux valider que la suppression n'introduit aucune régression, afin de garantir la stabilité du système existant.

#### Acceptance Criteria

1. WHEN all dark references are removed, THEN the System SHALL compile without errors
2. WHEN the application starts, THEN the Interface SHALL display correctly in light mode
3. WHEN components are rendered, THEN the Styling SHALL remain consistent with the design system
4. WHEN user interactions occur, THEN the Behavior SHALL remain unchanged from before the cleanup
5. WHEN CSS is processed, THEN the Build SHALL not contain any dark mode references

### Requirement 5

**User Story:** En tant que mainteneur, je veux documenter les changements effectués, afin de maintenir la traçabilité et faciliter les futures évolutions.

#### Acceptance Criteria

1. WHEN files are modified, THEN the System SHALL track all changes made
2. WHEN dark references are removed, THEN the Documentation SHALL list all affected files
3. WHEN the cleanup is complete, THEN the Summary SHALL detail the scope of modifications
4. WHEN validation is performed, THEN the Report SHALL confirm successful removal
5. WHEN the process ends, THEN the Archive SHALL preserve the change history

### Requirement 6

**User Story:** En tant que développeur, je veux m'assurer que le système de couleurs à 5 blocs reste intact, afin de préserver la cohérence visuelle du projet.

#### Acceptance Criteria

1. WHEN dark styles are removed, THEN the Color_System SHALL maintain the 5-block structure (amber/orange, emerald, sky, red/rose, indigo, yellow)
2. WHEN color tokens are cleaned, THEN the Multi_Teinte_Logic SHALL remain functional for light mode
3. WHEN accent classes are processed, THEN the Block_Accent_Map SHALL preserve all light mode mappings
4. WHEN profile theming is validated, THEN the Profile_Colors SHALL continue working in light mode
5. WHEN the color system is tested, THEN the Visual_Consistency SHALL be maintained across all components