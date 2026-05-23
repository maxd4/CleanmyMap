# Design Document

## Overview

Cette spécification de design détaille l'approche technique pour supprimer complètement la charte dark obsolète du projet CleanMyMap. L'objectif est d'éliminer tous les styles, variables et références liés au mode sombre tout en préservant intégralement la fonctionnalité du mode clair et la cohérence du système de design existant.

La suppression sera effectuée de manière systématique sur trois axes principaux :
1. **Nettoyage CSS** : Suppression de la section `html[data-theme="dark"]` et de toutes les classes utilitaires dark
2. **Nettoyage des scripts** : Élimination des références dark dans les scripts de migration
3. **Nettoyage du plugin Figma** : Suppression des tokens et composants dark

## Architecture

### Structure des fichiers impactés

```
CleanMyMap-main/
├── apps/web/src/app/globals.css                    # Fichier CSS principal
├── scripts/
│   ├── upgrade-map-ui.js                          # Script de migration UI
│   ├── refactor_ui.js                             # Script de refactoring
│   └── fix_forms_and_map.js                       # Script de correction
└── apps/web/figma-plugin-cleanmymap-templates/
    └── code.js                                     # Plugin Figma
```

### Approche de suppression

La suppression suivra une approche **conservative** :
- **Préservation totale** du mode clair existant
- **Suppression ciblée** uniquement des éléments dark
- **Validation continue** de la non-régression
- **Documentation complète** des changements

## Components and Interfaces

### 1. Gestionnaire de nettoyage CSS

**Responsabilité** : Supprimer les styles dark du fichier globals.css

**Interface** :
```typescript
interface CSSCleaner {
  removeSection(selector: string): void
  removeUtilityClasses(pattern: RegExp): void
  preserveLightMode(): void
  validateSyntax(): boolean
}
```

**Éléments à supprimer** :
- Section complète `html[data-theme="dark"] { ... }`
- Classes utilitaires `.cmm-*` avec variants dark
- Variables CSS spécifiques au dark mode
- Effets glassmorphism dark

### 2. Gestionnaire de nettoyage des scripts

**Responsabilité** : Nettoyer les références dark dans les scripts de migration

**Interface** :
```typescript
interface ScriptCleaner {
  removeClassReferences(darkClasses: string[]): void
  updateReplacements(lightOnlyMappings: Map<string, string>): void
  validateScriptIntegrity(): boolean
}
```

**Patterns à supprimer** :
- `dark:bg-*`, `dark:text-*`, `dark:border-*`
- `dark:hover:*`, `dark:focus:*`
- Conditions spécifiques au dark mode

### 3. Gestionnaire de nettoyage Figma

**Responsabilité** : Supprimer les tokens et composants dark du plugin

**Interface** :
```typescript
interface FigmaCleaner {
  removeDarkTokens(): void
  removeDarkComponents(): void
  updateTemplateGeneration(): void
  validateLightModeOutput(): boolean
}
```

**Éléments à supprimer** :
- Objet `dark` dans `buildTokens()`
- Styles dark dans `createStyles()`
- Composants dark dans les fonctions de build

## Data Models

### Modèle de changement

```typescript
interface ChangeRecord {
  file: string
  lineNumber: number
  originalContent: string
  newContent: string
  changeType: 'REMOVAL' | 'MODIFICATION'
  category: 'CSS' | 'SCRIPT' | 'FIGMA'
}
```

### Modèle de validation

```typescript
interface ValidationResult {
  file: string
  isValid: boolean
  errors: string[]
  warnings: string[]
  darkReferencesRemaining: number
}
```

### Modèle de rapport

```typescript
interface CleanupReport {
  totalFilesProcessed: number
  totalChanges: number
  changesByCategory: Record<string, number>
  validationResults: ValidationResult[]
  summary: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSS Section Removal Preserves Light Mode

*For any* CSS file with dark sections, removing the `html[data-theme="dark"]` section SHALL preserve all light mode functionality and maintain syntactic validity.

**Validates: Requirements 1.1, 1.2**

### Property 2: Variable Cleanup Selectivity

*For any* CSS file containing mixed light and dark variables, removing dark-specific variables SHALL preserve all light mode variables unchanged.

**Validates: Requirements 1.2, 1.3**

### Property 3: Utility Class Preservation

*For any* CSS file with mixed utility classes, removing dark-specific classes SHALL maintain all light mode utility classes and their functionality.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 4: Script Transformation Integrity

*For any* migration script with dark class references, removing these references SHALL preserve all light mode transformations and script executability.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 5: Complete Reference Elimination

*For any* file processed during cleanup, the cleaning process SHALL remove all dark mode references without leaving any traces.

**Validates: Requirements 2.5, 4.5, 5.4**

### Property 6: Figma Plugin Light-Only Generation

*For any* Figma plugin configuration after dark token removal, template generation SHALL produce only light mode components and styles.

**Validates: Requirements 3.1, 3.2, 3.4, 3.5**

### Property 7: Build System Compatibility

*For any* project after dark reference removal, the build process SHALL complete successfully without compilation errors.

**Validates: Requirements 4.1, 4.5**

### Property 8: Design System Consistency

*For any* component after cleanup, the styling SHALL remain consistent with the design system specifications and visual guidelines.

**Validates: Requirements 4.3, 6.5**

### Property 9: Change Tracking Completeness

*For any* modification made during cleanup, the system SHALL track and document all changes with complete accuracy.

**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 10: Color System Structure Preservation

*For any* color system modification during cleanup, the 5-block structure and multi-tint logic SHALL remain intact for light mode.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

## Error Handling

### Stratégies de gestion d'erreur

1. **Erreurs de syntaxe CSS**
   - Validation avant et après modification
   - Rollback automatique en cas d'erreur
   - Rapport détaillé des problèmes de syntaxe

2. **Erreurs de script**
   - Test d'exécution avant modification
   - Préservation des fonctionnalités existantes
   - Validation des transformations

3. **Erreurs de plugin Figma**
   - Validation des tokens avant suppression
   - Test de génération de templates
   - Vérification de la cohérence des styles

### Mécanismes de récupération

- **Backup automatique** de tous les fichiers avant modification
- **Validation continue** à chaque étape
- **Rollback sélectif** par fichier en cas de problème
- **Rapport d'erreur détaillé** pour diagnostic

## Testing Strategy

### Approche de test dual

Cette fonctionnalité utilise une approche de test combinant :
- **Tests unitaires** : Validation de fonctions spécifiques et cas d'erreur
- **Tests de propriétés** : Vérification des propriétés universelles sur tous les fichiers

### Tests unitaires

**Objectif** : Valider des comportements spécifiques et des cas d'erreur

**Couverture** :
- Suppression correcte de sections CSS spécifiques
- Nettoyage des références dark dans les scripts
- Génération de templates Figma sans composants dark
- Gestion des erreurs de syntaxe et de validation

### Tests de propriétés (Property-Based Testing)

**Configuration** : Minimum 100 itérations par test de propriété

**Bibliothèque** : fast-check (pour JavaScript/TypeScript)

**Tests de propriétés** :

1. **Test de propriété 1 : Préservation du mode clair lors de la suppression CSS**
   - **Tag** : Feature: suppression-charte-dark, Property 1: CSS Section Removal Preserves Light Mode
   - Génère des fichiers CSS avec sections dark variées
   - Vérifie que la suppression préserve la fonctionnalité light mode

2. **Test de propriété 2 : Sélectivité du nettoyage des variables**
   - **Tag** : Feature: suppression-charte-dark, Property 2: Variable Cleanup Selectivity
   - Génère des CSS avec variables light/dark mixtes
   - Vérifie que seules les variables dark sont supprimées

3. **Test de propriété 3 : Préservation des classes utilitaires**
   - **Tag** : Feature: suppression-charte-dark, Property 3: Utility Class Preservation
   - Génère des CSS avec classes utilitaires mixtes
   - Vérifie que les classes light restent fonctionnelles

4. **Test de propriété 4 : Intégrité des transformations de script**
   - **Tag** : Feature: suppression-charte-dark, Property 4: Script Transformation Integrity
   - Génère des scripts avec références dark variées
   - Vérifie que les transformations light restent intactes

5. **Test de propriété 5 : Élimination complète des références**
   - **Tag** : Feature: suppression-charte-dark, Property 5: Complete Reference Elimination
   - Génère des fichiers avec patterns dark variés
   - Vérifie qu'aucune référence dark ne subsiste

6. **Test de propriété 6 : Génération light-only du plugin Figma**
   - **Tag** : Feature: suppression-charte-dark, Property 6: Figma Plugin Light-Only Generation
   - Génère des configurations de plugin variées
   - Vérifie que seuls les composants light sont générés

7. **Test de propriété 7 : Compatibilité du système de build**
   - **Tag** : Feature: suppression-charte-dark, Property 7: Build System Compatibility
   - Génère des projets avec références dark variées
   - Vérifie que la compilation réussit après nettoyage

8. **Test de propriété 8 : Cohérence du système de design**
   - **Tag** : Feature: suppression-charte-dark, Property 8: Design System Consistency
   - Génère des composants avec styles variés
   - Vérifie la cohérence avec les spécifications du design system

9. **Test de propriété 9 : Complétude du suivi des changements**
   - **Tag** : Feature: suppression-charte-dark, Property 9: Change Tracking Completeness
   - Génère des modifications variées
   - Vérifie que tous les changements sont trackés avec précision

10. **Test de propriété 10 : Préservation de la structure du système de couleurs**
    - **Tag** : Feature: suppression-charte-dark, Property 10: Color System Structure Preservation
    - Génère des configurations de couleurs 5-blocs variées
    - Vérifie que la structure reste intacte après suppression dark

### Tests d'intégration

**Objectif** : Valider le comportement end-to-end

**Couverture** :
- Compilation complète du projet après nettoyage
- Rendu correct de l'interface en mode clair
- Fonctionnement des scripts de migration
- Génération réussie des templates Figma