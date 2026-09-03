# Gouvernance locale — API Actions

Cette frontière hérite de `AGENTS.md` à la racine, de `apps/web/AGENTS.md` et
de `apps/web/src/app/api/AGENTS.md`. Elle complète ces règles pour les routes
Actions sans déplacer la logique du domaine.

## Contrat et sécurité

- Préserver les contrats Actions, la validation des entrées, l'AuthN/AuthZ,
  RLS, les limites applicables et la modération ; aucune dérogation admin ne
  peut être implicite.
- Les handlers portent le transport HTTP et son orchestration. Réutiliser les
  propriétaires de `apps/web/src/lib/actions` pour les contrats de données,
  permissions, stockage, validation, sources unifiées, participation,
  modération et géométrie ; ne pas dupliquer leur sémantique dans une route.

## Flux et ordre des effets

- Préserver les flux publics de création, lecture et mise à jour, ainsi que
  l'ordre des effets associés aux participants et organisateurs, audits de
  modération, métadonnées et persistance.
- Préserver les contrats de participation et `group-join`, d'import, de map et
  `initial-nearest`, de prefill et de géométrie ; conserver leurs scopes,
  validations et réponses HTTP propres.

## Protection du contrat

- Maintenir les tests publics des routes, les tests de sécurité et d'accès,
  ainsi que les tests ciblés de participation/group-join, audit, import, map
  et prefill. Un changement de contrat ou de permission doit être éprouvé à
  la frontière HTTP concernée.
