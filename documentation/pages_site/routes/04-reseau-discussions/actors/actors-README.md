# Activité des acteurs

## Fiche canonique

- **Route** : `/sections/actors`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/actors-section.tsx`
- **Type fonctionnel** : observation d’activité déclarée
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `public-visible` ; aucune session n'est requise pour consulter la synthèse des actions publiées.
- **Objectif utilisateur principal** : Observer l’activité déclarée dans les actions et distinguer cette observation de l’annuaire des structures référencées.
- **Action principale attendue** : Consulter les acteurs observés dans les actions enregistrées.
- **Palette attendue** : indigo / sky sur fond réseau sombre
- **Scope** : agrégation publique des actions approuvées sur douze mois, hotspots par zone et cartes d'acteurs observés avec qualité moyenne des déclarations.
- **Terminée** : non
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible — le rendu et le contrat public sont déjà finalisés.

## États à documenter

- **loading** : skeletons séparés pour les hotspots cartographiques et les cartes d'acteurs.
- **empty state** : absence d'action sur la période ou absence d'acteur nommé dans les actions récentes.
- **access refused** : non applicable à la consultation publique ; aucune capacité métier n'est ouverte par cette visibilité.
- **Architecture commune** : `SectionShell`, `RubriqueCard`, `CmmSkeleton`, `ActionsMapFeed` et les agrégats `buildActorActivityCards`.
- **Variantes** : chargement, données agrégées, liste vide ; la section reste publique.
- **Règle** : un `actor_name` issu d’une action est une attribution observée ; il ne constitue ni une fiche Annuaire validée, ni une preuve de partenariat, ni un statut organisationnel.

## Contrat de données

- La surface agrège exclusivement les actions chargées par la section.
- Les données affichées sont le nom réellement porté par `actor_name`, le nombre d’actions, la zone majoritaire dérivée des lieux des actions et la qualité moyenne des déclarations/actions.
- Aucun rôle, capacité, contact, prochaine action, statut « actif » ou statut partenaire n’est déduit de ces agrégats.
- L’Annuaire des structures référencées est une surface distincte, alimentée par son propre contrat partenaire ; Actors ne transforme pas un nom d’action en fiche Annuaire.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Le rendu runtime est finalisé ; la qualité visuelle détaillée reste hors de cette fiche faute de snapshot de référence.

## Fichiers associés

- [Présentation détaillée](./actors-presentation-detaillee.md)
- [Liste des propositions à traiter](./actors-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./actors-objectifs-non-pertinents.md)
