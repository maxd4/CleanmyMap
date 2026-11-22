-- PURPOSE: add an assignable, action-scoped welcome contact for inclusive day-of participation.
-- CALLER: existing organizer-only action_field_roles API and RPC.
-- AUTHORIZATION_BOUNDARY: field-role assignments remain informational and never grant organizer permissions.
-- IDEMPOTENCY: catalog insertion is keyed by the stable role code.
-- ATOMICITY: one catalog row is inserted or updated in this transaction.
-- FAILURE_BEHAVIOR: the existing assignment RPC continues to enforce confirmed registration.
-- GRANTS: no table, RLS, or RPC privileges change.

begin;

insert into public.action_field_role_catalog (code, label, description, sort_order)
values (
  'welcome_contact',
  'Référent d’accueil',
  'Point de contact identifié pour l’accueil et l’orientation le jour de l’action.',
  60
)
on conflict (code) do update
  set label = excluded.label,
      description = excluded.description,
      sort_order = excluded.sort_order;

commit;
