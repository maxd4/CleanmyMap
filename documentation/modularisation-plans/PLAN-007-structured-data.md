# Plan de Modularisation : Structured Data (SEO)

**Fichier Cible** : `apps/web/src/components/seo/structured-data.tsx`
**Taille Actuelle** : ~627 lignes, 21 KB
**Objectif** : Séparer les différents types de métadonnées structurées JSON-LD en fichiers catégorisés pour améliorer la maintenabilité.

Validez chaque phase avec `npm run typecheck` et `npm run lint`.

---

## Phase 1 : Mise en place de la structure

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/seo/structured-data/`.
2. Crée le fichier `json-ld-wrapper.tsx` contenant uniquement l'interface `JsonLdProps` et le composant `JsonLd` (qui rend le `<Script>`).
3. Crée le fichier d'index `index.ts` qui ré-exportera tous les composants SEO.
```

## Phase 2 : Extraction par thématique

**Instructions pour l'agent** :
```markdown
1. **Organisation** : Crée `organization-data.tsx` et déplaces-y `OrganizationJsonLd` et `LocalBusinessJsonLd`.
2. **Navigation** : Crée `navigation-data.tsx` et déplaces-y `WebSiteJsonLd`, `WebPageJsonLd`, `SiteNavigationJsonLd`, et `BreadcrumbJsonLd`.
3. **Tutoriels (HowTo)** : Crée `how-to-data.tsx` et déplaces-y toutes les fonctions liées aux guides : `HowToDeclareActionJsonLd`, `HowToSignalPollutionJsonLd`, `HowToJoinCleanwalkJsonLd`, `HowToJoinCommunityJsonLd`.
4. **Contenu & Événements** : Crée `content-data.tsx` et déplaces-y `FAQJsonLd`, `ReviewJsonLd`, `ArticleRessourceJsonLd`, `VideoTutorialJsonLd`, et `EventCleanwalkJsonLd`.
5. Dans chaque fichier, importe le composant de base `JsonLd` depuis `json-ld-wrapper.tsx`.
```

## Phase 3 : Reconstruction et Nettoyage

**Instructions pour l'agent** :
```markdown
1. Remplis le fichier `apps/web/src/components/seo/structured-data/index.ts` avec les exports de tous les nouveaux fichiers :
   ```typescript
   export * from "./organization-data";
   export * from "./navigation-data";
   export * from "./how-to-data";
   export * from "./content-data";
   ```
2. Recherche dans tout le projet les imports qui pointaient vers `components/seo/structured-data.tsx` et remplace-les par le nouveau chemin pointant vers le dossier `components/seo/structured-data/` (l'index s'occupera de la résolution).
3. Supprime l'ancien fichier monolithique `components/seo/structured-data.tsx`.
```

## Phase 4 : Améliorations Kaizen (SEO & Data Dynamics)

Bien qu'il s'agisse de data JSON-LD, une amélioration métier est possible.

**Instructions pour l'agent (Améliorations métier)** :
```markdown
1. **Passage de paramètres** : Actuellement, beaucoup de ces composants (ex: `EventCleanwalkJsonLd`, `ReviewJsonLd`) sont complètement statiques. Suggère et implémente (si simple) l'ajout de props optionnelles (ex: `startDate`, `endDate`, `url` dynamique) pour que ces balises puissent être générées dynamiquement côté serveur dans les pages détaillées d'actions ou d'événements.
```

## Résultat Attendu
Une bibliothèque SEO propre, avec des fichiers courts, regroupés par thème sémantique Schema.org, et une indexation préservant la compatibilité avec l'existant.
