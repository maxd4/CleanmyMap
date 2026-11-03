# Communauté — domaine et projections web

`lib/community/` porte les contrats, normalisations, lectures et mutations du domaine communautaire. Il ne rend pas l’interface et ne remplace pas les gardes d’accès des routes API.

## Sous-domaines

- `event-*.ts`, `events-pagination.ts`, `event-location.ts` et `event-ops.ts` portent les événements, leur localisation, pagination et opérations RSVP.
- `action-needs*.ts`, `action-need-offers.ts` et `needs-http.ts` portent les besoins d’action, suggestions et offres d’aide.
- `helper-skills.ts` et `helper-skills-service.ts` portent les compétences d’aide communautaire.
- `bug-report-*.ts`, `feedback-*.ts` et `creator-inbox*.ts` portent les signalements, preuves, exports et boîtes de réception.
- `engagement/`, `subscriptions.ts`, `digest-*.ts`, `report-events.ts` et les modules de notification portent l’engagement et les projections associées.

Les routes correspondantes sont sous `apps/web/src/app/api/community/`. Elles restent responsables de l’AuthN/AuthZ, de la validation HTTP et du mapping de réponse ; les modules de ce dossier fournissent les opérations et projections canoniques appelées après ces frontières.

La source d’architecture transversale est [`master-architecture.md`](../../../../../documentation/architecture/master-architecture.md), tandis que les contrats effectifs sont les modules et tests voisins. Pour une modification, vérifier aussi les migrations Supabase et les règles de sécurité propriétaires ; ne pas recopier ici leurs SQL, permissions ou schémas.
