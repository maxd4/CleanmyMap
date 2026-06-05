# Réseau & Discussions

Pages de communauté, entraide, partenaires, discussions et données publiques.

## Fiche de bloc

- **Nom canonique** : Réseau & Discussions
- **Dossier canonique** : `04-reseau-discussions`
- **Dossier photo centralisé** : `photo/`
- **Fichier d'entrée** : `README.md`
- **Fichier photo** : [photo/README.md](./photo/README.md)

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/community` | [Communauté](./community/README.md) | page de réseau | protégé | à corriger | non | critique | apps/web/src/app/(app)/community/page.tsx |
| `/sections/feedback` | [Feedback](./feedback/README.md) | rubrique cliquable — feedback | public | terminé | non | moyenne | apps/web/src/app/(app)/sections/[sectionId]/page.tsx |
| `/messagerie` | [Messagerie](./messagerie/README.md) | page de réseau | protégé | à corriger | non | critique | apps/web/src/app/(app)/messagerie/page.tsx |
| `/open-data` | [Données publiques](./open-data/README.md) | page de réseau | protégé | à corriger | non | critique | apps/web/src/app/(app)/open-data/page.tsx |
| `/partners/dashboard` | [Annuaire partenaires](./partners-dashboard/README.md) | page de réseau | protégé | à corriger | non | moyenne | apps/web/src/app/(app)/partners/dashboard/page.tsx |
| `/partners/onboarding` | [Onboarding partenaire](./partners-onboarding/README.md) | page de réseau | protégé | à corriger | non | moyenne | apps/web/src/app/(app)/partners/onboarding/page.tsx |

## Alias et redirections

| Route | Fiche | Type de page | Statut | Détail |
|---|---|---|---|---|
| `/partners/network` | [Communauté (onglet Partenaires)](./community/README.md) | redirection | hors scope | Alias technique vers `/sections/community?tab=partners` |
| `/partners/network/pepite` | [PEPITE - Alias technique](./partners-network-pepite/partners-network-pepite-README.md) | redirection | hors scope | Alias technique vers `/sections/community?tab=partners` |

## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- Les captures officielles, quand elles existent, vivent dans le dossier unique `photo/` du bloc et sont en `WebP`.
- Aucun sous-dossier photo par route ne doit être recréé pour le bloc 04.
- L'ancienne URL `/partners/network` redirige vers `/sections/community?tab=partners` et n'est plus une page canonique autonome.
