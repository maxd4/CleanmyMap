# Ruban: bouton Feedback compact

## Summary
- Ajouter un bouton `Feedback` dans `AppNavigationRibbon`, sans toucher à Explorer ni au design system.
- Le placer après `Réglages`, avant les blocs compte, pour rester dans la logique utilitaire du ruban.
- Garder le ruban centré sur l’ordre demandé : `CMM | Naviguer | Chercher | CTA contextuel | Réglages | Feedback | Profil | Badges | Notifications`.

## Changes
- Créer un petit menu déroulant `Feedback` cohérent avec les autres contrôles du ruban.
- Le menu restera léger, sans descriptions ni cartes, avec uniquement ces 3 entrées visibles :
  - `🐞 Signaler un bug`
  - `💡 Suggérer une amélioration`
  - `❓ Demande de collaboration`
- Pour cette première version, les entrées seront des éléments UI simples, sans logique métier ni backend, afin de valider la place, la densité et le comportement d’ouverture/fermeture.
- Conserver le comportement accessible déjà utilisé ailleurs dans le ruban : clic extérieur, `Escape`, focus clavier, fermeture propre sur mobile.
- Limiter les changements à une zone courte du ruban, avec au besoin un petit composant dédié pour éviter de surcharger `app-navigation-ribbon.tsx`.

## Test Plan
- Vérifier le rendu desktop à largeur standard et large : ordre visuel correct, pas de retour à la ligne, pas de débordement.
- Vérifier le mobile : bouton compact, menu lisible, ouverture/fermeture simple.
- Vérifier au clavier : tabulation, ouverture au clavier, fermeture avec `Escape`.
- Vérifier qu’aucun autre menu du ruban n’est cassé : `Naviguer`, `Chercher`, `Réglages`, `Profil`, `Badges`, `Notifications`.
- Lancer lint et build après intégration.

## Assumptions
- `Feedback` est un outil transversal, donc il doit vivre dans la zone utilitaire du ruban, pas dans les blocs de profil.
- La première version ne déclenche aucune action réelle, elle sert seulement de point d’entrée visuel et stable.
- Le CTA contextuel reste un slot séparé entre `Chercher` et `Réglages`, sans être fusionné avec `Feedback`.
