# Blocages de validation

Derniere photographie des verifications lancees apres la derniere passe de correction.

Etat observe:
- `npm run lint -w apps/web` : passe, avec warnings acceptes en phase de developpement.
- `npm run typecheck -w apps/web` : passe.
- `npm run build -w apps/web` : passe.
- `npm run test -w apps/web` : non relance dans cette passe.

## Source de verite actuelle

Le backlog TypeScript priorise les erreurs restantes dans:

- [typescript-strict-priority-report.md](./typescript-strict-priority-report.md)

## Blocages TypeScript restants par priorite

- Aucun blocage TypeScript actif sur le `typecheck` standard.
- Le contrôle strict TypeScript est maintenant vert. Le suivi historique reste dans [typescript-strict-priority-report.md](./typescript-strict-priority-report.md).
- Les anciens points de la table suivante sont consideres comme clos.

## Ce qui demande encore un peu de tri

- La prochaine mise a jour de ce document devra partir d'un nouveau `typecheck` s'il redevient non vide.
- Tant que `apps/web` reste vert, ce document sert surtout de trace de validation.

## Commandes lancees

- `npm run typecheck -w apps/web`
- `npm run lint -w apps/web`
- `npm run build -w apps/web`
- `npx tsc -p apps/web/tsconfig.json --noEmit --pretty false --skipLibCheck --noPropertyAccessFromIndexSignature`
