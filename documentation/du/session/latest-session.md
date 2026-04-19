# Latest Session

Updated: 2026-04-19

## Done
- Restructuration du monorépo : migration de toute la logique Python, data & scripts legacy vers `/legacy`.
- Assainissement de la racine : suppression des dossiers `src/`, `data/` et des fichiers de config Python à la racine.
- Nettoyage CI : suppression du job `quality` (Python) obsolète dans `.github/workflows/ci.yml`.
- Isolation `apps/web` : vérification que le runtime Next.js est autonome (build réussi).
- Mise à jour du `project_context.md` pour refléter la nouvelle structure simplifiée.

## In Progress
- None.

## Next
- Nettoyage du dashboard Vercel : supprimer le projet "fantôme" qui pointe vers la racine du repo (celui qui est en Error).
- Verification manuelle UI admin: moderer une action pending puis confirmer affichage sur /actions/map.
- Refactor top-heavy: dashboard/action-declaration/annuaire.

## Risks
- Aucun risque majeur ; le build `apps/web` est validé et autonome.
