# Authentification et normalisation des rôles

Ce dossier regroupe les frontières d'identité du web : résolution des rôles
Clerk, bypass local, synchronisation de profil et compatibilités d'entrée.

## Organisation

- `role-aliases.json` est l'unique table des alias de rôles entrants ; ses
  valeurs sont toujours des rôles runtime canoniques.
- `role-resolution.ts` expose la résolution commune des métadonnées Clerk.
- `sync.ts` persiste les profils dans Supabase et doit conserver les valeurs
  canoniques.
- `dev-auth.ts` porte uniquement les valeurs de configuration du bypass local.

Les alias legacy peuvent rester lisibles à cette frontière, mais les nouvelles
écritures doivent utiliser les identifiants canoniques. Le contrat métier
Role + Capability + Scope et le vocabulaire produit sont documentés dans
`documentation/security/authorization-capabilities.md`.
