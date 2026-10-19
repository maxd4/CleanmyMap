-- PURPOSE: make the seven terrain specializations consumable by the existing
--          post-action attestation and gamification reconciliation contracts.
-- LEDGER: no new ledger; specialized threshold events remain in progression_events.
-- AUTHORIZATION: organizer_primary/coorganizer require a historical snapshot of
--                action_organizers at the decision time; the attestation never
--                grants action permission.
-- CALLER: trigger execution during the service_role-only attestation mutation.
-- IDEMPOTENCY: role catalog inserts and the attestation trigger are repeatable.
-- ATOMICITY: the provenance check runs in the same statement as the attestation.
-- FAILURE_BEHAVIOR: reject organizer-role rows without matching organizer provenance.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: browser roles cannot execute the trigger function directly.

insert into public.action_field_role_catalog (code, label, description, sort_order)
values
  ('organizer_primary', 'Organisateur référent', 'Responsabilité d’organisation principale attestée après l’action.', 60),
  ('coorganizer', 'Coorganisateur', 'Responsabilité de coorganisation attestée après l’action.', 70)
on conflict (code) do update
  set label = excluded.label,
      description = excluded.description,
      sort_order = excluded.sort_order;

create or replace function public.enforce_organizer_role_attestation_provenance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_expected_primary boolean;
begin
  if NEW.role_code not in ('organizer_primary', 'coorganizer') then
    return NEW;
  end if;

  v_expected_primary := NEW.role_code = 'organizer_primary';
  if not exists (
    select 1
      from public.action_organizers organizer
     where organizer.action_id = NEW.action_id
       and organizer.organizer_clerk_id = NEW.user_id
       and organizer.is_primary = v_expected_primary
  ) then
    raise exception 'action_role_attestation_organizer_provenance_required'
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_organizer_role_attestation_provenance
  on public.action_role_attestations;
create trigger enforce_organizer_role_attestation_provenance
before insert or update of action_id, user_id, role_code
on public.action_role_attestations
for each row
execute function public.enforce_organizer_role_attestation_provenance();

create index if not exists action_role_attestations_user_status_action_idx
  on public.action_role_attestations (user_id, verification_status, action_id);

revoke all on function public.enforce_organizer_role_attestation_provenance() from public, anon, authenticated;
