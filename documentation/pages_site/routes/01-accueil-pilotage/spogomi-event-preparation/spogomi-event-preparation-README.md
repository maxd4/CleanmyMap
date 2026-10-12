# Préparation d’un événement SPOGOMI

## Fiche canonique

- **Route** : `/spogomi/[eventId]`
- **Fichiers source** :
  - `apps/web/src/app/(app)/spogomi/[eventId]/page.tsx`
  - `apps/web/src/components/spogomi/spogomi-preparation-workspace.tsx`
- **Type fonctionnel** : cockpit privé de préparation
- **Famille / bloc fonctionnel** : Accueil & Pilotage
- **Statut** : CURRENT — lot 2, brouillon sans résultats
- **Accès** : `protected` ; session puis contrôle serveur de la relation organisateur de l’action liée
- **Parcours** : aperçu/confirmation du roster CSV/XLSX, composition automatique, déplacement manuel, verrouillage et rattachement d’un GPX officiel
- **Confidentialité** : les noms et groupes ne sont rendus qu’au cockpit autorisé ; aucune route publique ne lit le roster
- **GPX** : carte opérateur avec provenance `official_reference` et distance de référence, jamais une distance de terrain observée
- **Erreurs** : accès refusé, événement absent, import mal formé, doublons probables, équipe non conforme et verrouillage incomplet
- **Limites** : pas de score, arbitrage, consolidation, publication publique, export final ou gamification

Le contrat métier détaillé est [`documentation/features/spogomi.md`](../../../../features/spogomi.md).
