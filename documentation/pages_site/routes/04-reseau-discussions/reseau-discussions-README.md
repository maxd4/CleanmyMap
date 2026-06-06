# Réseau & Discussions

Bloc documentaire des surfaces de réseau, communautés, partenaires, données publiques et rubriques de discussion.

## Fiche de bloc

- **Nom canonique** : Réseau & Discussions
- **Dossier canonique** : `04-reseau-discussions`
- **Fichier d'entrée** : `reseau-discussions-README.md`
- **Dossier photo centralisé** : `photo/`
- **Fichier photo** : [photo/reseau-discussions-photo-README.md](./photo/reseau-discussions-photo-README.md)

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/sections/community` | [Communauté](./community/community-README.md) | section de réseau | protégé | à corriger | non | critique | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/feedback` | [Idées et problèmes](./feedback/feedback-README.md) | rubrique cliquable | public | terminé | non | moyenne | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/actors` | [Réseau engagé](./actors/actors-README.md) | section de réseau | protégé | à cadrer | non | moyenne | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/annuaire` | [Annuaire des acteurs](./annuaire/annuaire-README.md) | section de réseau | protégé | à cadrer | non | moyenne | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/messagerie` | [Groupes de discussion](./messagerie/messagerie-README.md) | page de réseau | protégé | à corriger | non | critique | `apps/web/src/app/(app)/messagerie/page.tsx` |
| `/sections/open-data` | [Données publiques](./open-data/open-data-README.md) | section de réseau | protégé | à corriger | non | critique | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/funding` | [Soutenir le Projet](./funding/funding-README.md) | section de réseau | protégé | à cadrer | non | moyenne | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/trash-spotter` | [Signaler un déchet](./trash-spotter/trash-spotter-README.md) | section de réseau | public | à cadrer | non | moyenne | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/partners/dashboard` | [Annuaire partenaires](./partners-dashboard/partners-dashboard-README.md) | page de réseau | protégé | à corriger | non | moyenne | `apps/web/src/app/(app)/partners/dashboard/page.tsx` |
| `/partners/onboarding` | [Onboarding partenaire](./partners-onboarding/partners-onboarding-README.md) | page de réseau | protégé | à corriger | non | moyenne | `apps/web/src/app/(app)/partners/onboarding/page.tsx` |

## Alias et redirections

| Route | Fiche | Type de page | Statut | Détail |
|---|---|---|---|---|
| `/community` | [Communauté](./community/community-README.md) | redirection | hors scope | Alias technique vers `/sections/community` |
| `/open-data` | [Données publiques](./open-data/open-data-README.md) | redirection | hors scope | Alias technique vers `/sections/open-data` |
| `/partners/network` | [Communauté (onglet Partenaires)](./partners-network/partners-network-README.md) | redirection | hors scope | Alias technique vers `/sections/community?tab=partners` |
| `/partners/network/pepite` | [PEPITE - Alias technique](./partners-network-pepite/partners-network-pepite-README.md) | redirection | hors scope | Alias technique vers `/sections/community?tab=partners` |

## Notes

- Les rubriques `actors`, `annuaire`, `funding` et `trash-spotter` correspondent aux sections exposées par le registre métier actuel.
- Les captures officielles, quand elles existent, vivent dans le dossier unique `photo/` du bloc et sont en `WebP`.
- Aucun sous-dossier photo par route ne doit être recréé pour le bloc 04.
- `/community` et `/open-data` restent des alias, la vérité métier passe par les sections canoniques.
