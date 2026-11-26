# Missions (`apps/web/src/lib/missions/`)

Statut : `CURRENT` — relai web des missions GPS ; l'owner mobile complet vit dans [`apps/mobile/README.md`](../../../../apps/mobile/README.md) et [`apps/mobile/architecture_gps_companion.md`](../../../../apps/mobile/architecture_gps_companion.md).

## Propriétaires et points d'entrée

- **Web** : `mission-access.ts`, `mission-images.ts`, routes `apps/web/src/app/api/missions/` (`POST /api/missions`, `POST /api/missions/[id]/reconcile`).
- **Mobile** : `apps/mobile/features/tracking/use-companion-mission-controller.ts`, `tracking-service.ts`, `tasks/gps-task.ts`.

## Cycle mission GPS mobile (résumé vérifié)

- **Création (`POST /api/missions`)** : vérifie permissions GPS, envoie `Idempotency-Key` + `sub` Clerk (et `actionId` optionnel) ; si le démarrage GPS échoue, la mission créée est annulée côté serveur.
- **Suivi (`gps_points`)** : buffer local `AsyncStorage` owner-scoped + replay foreground dès que la session Clerk est disponible.
- **Finalisation (`POST /api/missions/:id/reconcile`)** : calcul serveur autoritaire des métriques (`finalize_completed_mission_metrics`) ; aucune mission terminée n'est annoncée avant l'accusé serveur.
- **Tests repères** : `mission-access.test.ts`, `mission-images.test.ts`, et la suite Vitest mobile (`npm run mobile:test`).
