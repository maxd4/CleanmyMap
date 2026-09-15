# Réseau & Discussions

Communautés, partenaires, données publiques, annuaire et discussions.

## Fiche de bloc

- **Nom canonique** : Réseau & Discussions
- **Dossier canonique** : `04-reseau-discussions`
- **Snapshots** : colocalisés dans le dossier de chaque page canonique.

## Routes canoniques

| Route | Fiche | Accès runtime | Famille visuelle | Source principale |
|---|---|---|---|---|
| `/sections/community` | [Communauté](./community/community-README.md) | `public-visible` | réseau-discussions / pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/feedback` | [Idées et problèmes](./feedback/feedback-README.md) | `public-visible` | réseau-discussions / pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/actors` | [Réseau engagé](./actors/actors-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/annuaire` | [Annuaire des acteurs](./annuaire/annuaire-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/messagerie` | [Messagerie](./messagerie/messagerie-README.md) | `auth-blur-gate` | réseau-discussions / pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/open-data` | [Données publiques](./open-data/open-data-README.md) | `public-visible` | réseau-discussions / pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/funding` | [Soutenir le projet](./funding/funding-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/trash-spotter` | [Signaler un déchet](./trash-spotter/trash-spotter-README.md) | `auth-blur-gate` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/partners/dashboard` | [Annuaire partenaires](./partners-dashboard/partners-dashboard-README.md) | `protected` | partenaires / réseau | `apps/web/src/app/(app)/partners/dashboard/page.tsx` |
| `/partners/onboarding` | [Onboarding partenaire](./partners-onboarding/partners-onboarding-README.md) | `protected` | partenaires / réseau | `apps/web/src/app/(app)/partners/onboarding/page.tsx` |

## Alias et redirections

| Route | Cible |
|---|---|
| `/community` | `/sections/community` |
| `/messagerie` | `/sections/messagerie` |
| `/open-data` | `/sections/open-data` |
| `/sections/dm` | `/sections/messagerie?tab=dm` |

## Règles

- les statuts de présentation anonyme viennent de `apps/web/src/lib/sections-registry/config.ts` et sont appliqués par `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` ;
- `disabled` et `blur` ne doivent pas être résumés par le vague mot `protégé` ;
- les alias ne reçoivent pas une seconde fiche canonique du contenu ;
- les snapshots sont placés sous `screenshots/desktop/` ou `screenshots/mobile/`
  dans la page canonique concernée.
