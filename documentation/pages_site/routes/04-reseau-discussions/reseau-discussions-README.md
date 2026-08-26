# Réseau & Discussions

Communautés, partenaires, données publiques, annuaire et discussions.

## Fiche de bloc

- **Nom canonique** : Réseau & Discussions
- **Dossier canonique** : `04-reseau-discussions`
- **Dossier photo centralisé** : `photo/`

## Routes canoniques

| Route | Fiche | Accès runtime | Famille visuelle | Source principale |
|---|---|---|---|---|
| `/sections/community` | [Communauté](./community/community-README.md) | `auth-disabled-gate` | réseau-discussions / pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/feedback` | [Idées et problèmes](./feedback/feedback-README.md) | `public-visible` | réseau-discussions / pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/actors` | [Réseau engagé](./actors/actors-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/annuaire` | [Annuaire des acteurs](./annuaire/annuaire-README.md) | `auth-disabled-gate` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
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
| `/partners/network` | `/sections/community?tab=partners` |
| `/partners/network/pepite` | `/sections/community?tab=partners` |
| `/sections/dm` | `/sections/messagerie?tab=dm` |

## Règles

- les statuts d'accès viennent de `apps/web/src/lib/clerk-access.ts` ;
- `disabled` et `blur` ne doivent pas être résumés par le vague mot `protégé` ;
- les alias ne reçoivent pas une seconde fiche canonique du contenu ;
- aucun dossier photo par route enfant.
