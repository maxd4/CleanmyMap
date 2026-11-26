# Annuaire partenaires et onboarding (`apps/web/src/lib/partners/`)

Statut : `CURRENT` — orientation et cycle de publication de l'annuaire partenaires.

## Propriétaires et points d'entrée

- **Entrées publiées** : `published-annuaire-entries-store.ts`, `published-annuaire-entry-builder.ts`, `annuaire-types.ts`.
- **Demandes d'onboarding** : `onboarding-requests-store.ts`, `onboarding-requests-normalization.ts`, `onboarding-types.ts`.
- **Réseaux territoriaux** : `territory-network-catalog.ts`, `paris-cleanwalk-network.ts`, `public-structure-context.ts`.
- **Registre organisateurs actions** : `apps/web/src/lib/actions/organizer-directory-registry.ts` (distinct de l'annuaire partenaires).

## Cycle de vie vérifié

- **Statuts de publication (`PublishedPartnerAnnuaireEntry.publicationStatus`)** : `pending_admin_review` → `accepted` | `rejected` (avec `reviewedAt` et `reviewedByUserId`).
- **Frontière public/privé** : `serializePublishedPartnerAnnuaireEntry` sépare strictement `public_data` de `private_admin_contact` (`internalAdminContact`).
- **Tests repères** : `published-annuaire-entries-store.test.ts`, `published-annuaire-entries-store.persistence.test.ts`, `onboarding-requests-store.test.ts`, `apps/web/src/lib/supabase/migration-contracts/partner-annuaire-privacy-review-concurrency-migration.test.ts`.
