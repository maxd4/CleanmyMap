-- CANDIDATE uniquement. Ne pas exécuter directement sur la base distante.
-- Intégrer dans une migration forward-only nommée par la CLI, après revalidation.
-- Les ALTER échouent si des données incompatibles sont apparues ; ne pas les effacer.

alter table public.institutional_relationship_facts
  alter column idempotency_key set not null,
  add constraint institutional_relationship_facts_idempotency_format_check
    check (idempotency_key ~ '^[0-9a-f]{64}$'),
  add constraint institutional_relationship_facts_nonblank_evidence_check
    check (nullif(btrim(evidence_ref), '') is not null and nullif(btrim(summary), '') is not null),
  add constraint institutional_relationship_facts_explicit_support_required_check
    check (kind <> 'explicit_support' or support_target is not null),
  add constraint institutional_relationship_facts_completed_contribution_required_check
    check (
      kind <> 'completed_contribution'
      or (
        contribution_role is not null
        and activity_kind is not null
        and nullif(btrim(activity_ref), '') is not null
        and (activity_kind <> 'external_event' or activity_ref ~* '^https://')
      )
    );

-- Index de parcours adapté à l'ordre du candidat de pagination.
create index if not exists idx_institutional_relationship_facts_created_at_id
  on public.institutional_relationship_facts (created_at desc, id asc);

-- Le contrôle d'existence de l'action référencée reste dans le store.
-- Le contrôle URL complet reste dans le store ; le CHECK ne protège que le schéma.
-- L'index UNIQUE partiel existant devient effectif pour chaque ligne grâce à NOT NULL.
-- Aucun GRANT, RLS, statut, fait ou contact n'est modifié par ce candidat.
