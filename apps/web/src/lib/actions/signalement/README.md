# Signalements terrain (`apps/web/src/lib/actions/signalement/`)

Statut : `CURRENT` — orientation et cycle de vie des signalements (`trash_spotter_spots`).

## Propriétaires et points d'entrée

- **Création et brouillons** : `create-signalement.ts`, `quick-signalement.ts`, `quick-signalement-draft.ts`, `apps/web/src/app/api/spots/route.ts`.
- **Médias et suivi utilisateur** : `signalement-media.ts`, `signalement-media-client.ts`, `my-observations.ts`, `my-observations-contract.ts`.
- **Modération serveur (owner des transitions)** : `apps/web/src/lib/admin/moderation/signalement-moderation.ts` (`readSignalementForModeration`, `listModeratableSignalements`, `moderateSignalement`) via `apps/web/src/app/api/admin/moderation/route.ts`.

## Transitions vérifiées (`trash_spotter_spots`)

- **Statuts persistés (`SignalementModerationStatus`)** : `new` | `validated` | `cleaned`.
- **Création** : insertion en `new` (`validated_at = null`, `cleaned_at = null`) ; côté mobile, `Signaler un déchet` consomme les mêmes endpoints `/api/spots` et `/api/signalements/:id/media/*` sans statut anticipé avant accusé serveur.
- **Modération (`moderateSignalement`, `admin`/`max`)** :
  - `-> new` : réinitialise `validated_at = null` et `cleaned_at = null` ;
  - `-> validated` : conserve ou fixe `validated_at = now()`, force `cleaned_at = null` ;
  - `-> cleaned` : conserve ou fixe `validated_at = now()` et `cleaned_at = now()`.
- **Tests repères** : `create-signalement.test.ts`, `my-observations.test.ts`, `signalement-media.test.ts`, `apps/web/src/lib/admin/moderation/signalement-moderation.test.ts`, `apps/web/src/app/api/admin/moderation/route.test.signalement-transition-scenarios.ts`.
