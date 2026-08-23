# Apprendre - Bonnes pratiques

## Fiche canonique

- **Route** : `/learn/bonnes-pratiques`
- **Fichier source** : `apps/web/src/app/learn/bonnes-pratiques/page.tsx`
- **Sous-composants clés** :
  - `apps/web/src/components/learn/learn-practice-theme-tabs.tsx`
  - `apps/web/src/components/learn/learn-tri-context-section.tsx`
  - `apps/web/src/components/learn/learn-behavior-awareness-section.tsx`
  - `apps/web/src/components/learn/learn-gestes-propres-campaign-section.tsx`
  - `apps/web/src/components/learn/learn-gestes-propres-barometer.tsx`
  - `apps/web/src/components/learn/learn-gestes-propres-myths-section.tsx`
  - `apps/web/src/components/learn/learn-gestes-propres-insights-section.tsx`
- **Type fonctionnel** : page éducative
- **Famille / bloc fonctionnel** : Apprendre
- **Palette attendue** : yellow / amber
- **Structure visible actuelle** :
  - chapeau court dans `PageHeader`
  - 3 onglets accessibles
  - `Bien trier`, `Composter`, `Éviter les déchets abandonnés`
  - schéma visuel par thème
  - 3 règles essentielles maximum
  - guides essentiels avant les contenus éditoriaux
  - bloc `Campagne à la une` dans le troisième thème
  - bloc `Baromètre national 2025` avec comparaisons, idées reçues et méthodologie repliée
  - bloc `Action collective` avec trois CTA vers les actions disponibles
  - accordéon unique pour les détails complémentaires
  - bloc secondaire `Pour aller plus loin avec Gestes Propres`
- **Hiérarchie UX** : l'essentiel reste visible en premier, les compléments passent en accordéons fermés par défaut.
- **Sources secondaires** : ADEME, Gestes Propres, ministère
- **Baromètre IFOP × Gestes Propres** : données déclaratives, 2 001 répondants, septembre 2025 ; la copie source est conservée dans `documentation/pages_site/routes/05-apprendre/learn-bonnes-pratiques/` et la copie statique servie par l'application dans `apps/web/public/learn/bonnes-pratiques/gestespropres-Barometre_2025.pdf`.
- **Étude IFOP sur les dépôts** : enquête menée en 2024, volet quantitatif auprès de 2 003 personnes et volet qualitatif dans quatre villes ; la copie source est conservée dans le même dossier et la copie statique servie par l'application dans `apps/web/public/learn/bonnes-pratiques/gestesprorpe-ifop-depots.pdf`.
- **Validation éditoriale** : les contenus Gestes Propres et IFOP suivent le contrat `documentation/architecture/content-validation.md` avant publication. Les faits, estimations et recommandations sont conservés dans des collections séparées.
- **Navigation** : les routes existantes sont conservées, sans changement de destination.
- **Priorité de correction** : moyenne

## Références legacy

- [que_faire_des_dechets.md](../../../../5-BLOC-APPRENDRE/que_faire_des_dechets.md)

## Notes d'audit

- Cette fiche reste la source de vérité canonique pour la page.
- La campagne Gestes Propres est traitée comme contenu éditorial secondaire, sans duplication des guides actionnables.
- Les visuels autorisés restent exclus tant qu'aucune preuve d'autorisation explicite n'est documentée.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ne sont plus la référence principale.
