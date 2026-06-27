# Blocages de validation

Derniere photographie des verifications lancees apres la derniere passe de correction.

Etat observe:
- `npm run lint -w apps/web` : passe, avec warnings acceptes en phase de developpement.
- `npm run typecheck -w apps/web` : passe.
- `npm run test -w apps/web` : non relance dans cette passe.

## Source de verite actuelle

Le backlog TypeScript priorise les erreurs restantes dans:

- [typescript-strict-priority-report.md](./typescript-strict-priority-report.md)

## Blocages TypeScript restants par priorite

- Aucun blocage TypeScript actif.
- Les anciens points de la table suivante ont ete absorbes dans le backlog clos:
  - routes `group-join`
  - `gamification/badges/list`
  - tests `referrals`, `organizers`, `counters`, `badges/listing`
  - fixtures `progression-data.*`

## Ce qui demande encore un peu de tri

- La prochaine mise a jour de ce document doit partir d'un nouveau `typecheck` s'il redevient non vide.
- Tant que `apps/web` reste vert, ce document sert surtout de trace de validation.

## Commandes lancees

- `npm run typecheck -w apps/web`
- `npm run lint -w apps/web`
