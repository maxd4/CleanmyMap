# Soutenir le Projet

## Fiche canonique

- **Route** : `/sections/funding`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/funding-section.tsx`
- **Type fonctionnel** : section de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `public-visible` ; la présentation du modèle économique est consultable sans compte. Les éventuels parcours partenaire ou de financement restent séparés et conservent leurs propres contrôles.
- **Objectif utilisateur principal** : Comprendre les voies de soutien du projet et la séparation entre financement, transparence et indépendance de la modération.
- **Action principale attendue** : Consulter les volets sponsoring de zones, mécénat écologique, dons et traçabilité des financements.
- **Palette attendue** : rose / pink / fuchsia sur fond réseau sombre
- **Scope** : présentation statique du modèle économique, de trois voies de financement et des garanties d'indépendance ; aucun parcours de paiement n'est déclenché par cette section.
- **Terminée** : non
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible — la page est une présentation statique sans paiement runtime.

## États à documenter

- **loading** : non applicable ; le contenu est statique et ne charge pas de données métier.
- **empty state** : non applicable ; les cartes de présentation sont rendues avec la page.
- **access refused** : non applicable à cette présentation publique.
- **Architecture commune** : `SectionShell`, cartes `motion` et `CmmButton` de présentation.
- **Variantes** : français/anglais ; les trois cartes sponsoring, mécénat et don sont toujours présentées.
- **Règle** : le financement n'accorde aucun pouvoir de modération et le bouton `Ouvrir le dossier` reste informatif tant qu'aucune destination runtime n'est reliée.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Compléter après alignement visuel et métier.

## Fichiers associés

- [Présentation détaillée](./funding-presentation-detaillee.md)
- [Liste des propositions à traiter](./funding-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./funding-objectifs-non-pertinents.md)
