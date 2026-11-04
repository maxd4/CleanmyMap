-- PURPOSE: keep territorial consent mutations behind the authenticated server
--          boundary while preserving a stable activation watermark.
-- CALLER: the Web/Mobile Clerk-authenticated consent route through service_role.
-- AUTHORIZATION_BOUNDARY: authenticated may read its own row only; no client
--          role may insert or update consent state or age metadata directly.
-- IDEMPOTENCY: enabling an already active row preserves activated_at; a row
--          revoked before reactivation receives a new activation watermark.
-- ATOMICITY: one user is serialized by a transaction advisory lock and one
--          locked-row mutation.
-- FAILURE_BEHAVIOR: invalid caller, owner or age-band input fails closed.
-- SEARCH_PATH: fixed for SECURITY DEFINER.
-- GRANTS: authenticated SELECT only; service_role executes the mutation RPC.

revoke insert, update, delete, truncate
  on table public.territorial_legend_consents
  from public, anon, authenticated;
grant select on table public.territorial_legend_consents to authenticated;

drop policy if exists territorial_legend_consents_owner_insert
  on public.territorial_legend_consents;
drop policy if exists territorial_legend_consents_owner_update
  on public.territorial_legend_consents;

create or replace function public.set_territorial_legend_consent(
  p_user_id text,
  p_enabled boolean,
  p_age_band text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.territorial_legend_consents%rowtype;
  v_activated_at timestamptz;
  v_revoked_at timestamptz;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'user id required';
  end if;
  if p_age_band is null or p_age_band not in ('under_15', '15_or_over', 'unknown') then
    raise exception 'invalid age band';
  end if;
  if p_now is null then
    raise exception 'consent timestamp required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('territorial-legend-consent:' || p_user_id, 0));
  select *
    into v_existing
    from public.territorial_legend_consents
   where user_id = p_user_id
   for update;

  if p_enabled then
    v_activated_at := case
      when found and v_existing.enabled and v_existing.activated_at is not null and v_existing.revoked_at is null
        then v_existing.activated_at
      else p_now
    end;
    v_revoked_at := null;
  else
    -- Keep the last activation watermark for owner-scoped history. A later
    -- reactivation is still assigned a fresh watermark by the branch above.
    v_activated_at := case when found then v_existing.activated_at else null end;
    v_revoked_at := p_now;
  end if;

  insert into public.territorial_legend_consents (
    user_id, enabled, age_band, activated_at, revoked_at, updated_at
  ) values (
    p_user_id, p_enabled, p_age_band, v_activated_at, v_revoked_at, p_now
  )
  on conflict (user_id) do update
    set enabled = excluded.enabled,
        age_band = excluded.age_band,
        activated_at = excluded.activated_at,
        revoked_at = excluded.revoked_at,
        updated_at = excluded.updated_at;

  if not p_enabled then
    update public.territorial_legend_hold_periods
       set ended_on = coalesce(ended_on, last_verified_on),
           validity_status = 'closed',
           updated_at = p_now
     where user_id = p_user_id
       and validity_status = 'active';
  end if;

  return (
    select jsonb_build_object(
      'enabled', enabled,
      'age_band', age_band,
      'activated_at', activated_at,
      'revoked_at', revoked_at,
      'updated_at', updated_at
    )
      from public.territorial_legend_consents
     where user_id = p_user_id
  );
end;
$$;

revoke all on function public.set_territorial_legend_consent(text, boolean, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.set_territorial_legend_consent(text, boolean, text, timestamptz)
  to service_role;
