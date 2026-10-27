---
name: cleanmymap-actions-participation
description: "Actions de dépollution, statuts, création, organisateurs, inscriptions futures, participation confirmée et gamification CleanMyMap."
category: repository
risk: high
source: local
tags: "[actions, participation]"
---

# Actions, inscriptions et présence terrain

## Déclenchement

Activer pour créer/modifier une action, cycle de vie pré/post-action, organisateur, inscriptions, présence finale, attestation, progression/XP ou exports Actions.

## Sources

`documentation/architecture/data-governance.md`, `documentation/product/PARCOURS_UTILISATEURS.md`, `apps/web/src/lib/actions/`, routes/API concernées, RLS/migrations `apps/web/supabase/`, consommateurs rapports et gamification.

## Invariants métier

- `public.actions` reste l'action canonique ; statuts `pending`, `approved`, `rejected` sans alias technique inventé.
- `action_organizers` établit la relation organisationnelle. Créateur, organisateur, administrateur et participant sont distincts.
- `action_registrations` porte les inscriptions futures ; `action_participants` porte les participations finales.
- `registration_status=confirmed` **ne prouve jamais** la présence terrain. Statistiques, progression, badges et parts de contribution reposent sur les présences finales confirmées.
- Une création, finalisation ou organisation d'action n'accorde pas automatiquement une participation confirmée ni de l'XP.
- Les signalements utilisent `trash_spotter_spots` et ne deviennent pas une seconde source d'actions.

## Procédure

1. Cartographier toutes les écritures (formulaire, API, RPC, trigger, import, claim) et lectures (carte, historique, pilotage, rapports, progression).
2. Définir acteur, capability, ownership, phase et transition autorisée ; examiner les migrations passées et historiques sans déduire de présence manquante.
3. Spécifier idempotence, concurrence, reprise après échec et comportement des enregistrements existants.
4. Couvrir la transition positive et le contournement négatif, notamment un ID de tiers ou une mutation alternative.
5. Mettre à jour le code propriétaire, les consumers et la documentation canonique pertinente, sans nouveau calcul parallèle.

## Preuves

Séparer test métier exécuté, contrat SQL statique et preuve PostgreSQL/RLS sur le candidat exact. En absence de sémantique DB exécutée, indiquer `DB_SEMANTICS_NOT_EXECUTED`.
