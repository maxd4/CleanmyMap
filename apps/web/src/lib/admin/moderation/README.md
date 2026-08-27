# Admin moderation

Ce dossier regroupe les modules directement liés à la revue admin des actions
et des signalements.

- `action-moderation-edits.ts` définit les schémas et constructions de mises à
  jour de revue.
- `moderation-client.ts` est le client de la route de revue admin.
- `signalement-moderation.ts` lit et met à jour les signalements modérables.

Le journal d’audit propre au domaine Actions reste dans
`../../actions/moderation-audit.ts`.
