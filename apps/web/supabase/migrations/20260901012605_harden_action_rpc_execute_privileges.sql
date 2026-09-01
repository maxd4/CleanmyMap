-- Keep action mutation RPCs server-only; the function bodies and table RLS
-- remain unchanged.
revoke all on function public.create_action_with_training(
  text, text, date, text, double precision, double precision, numeric,
  integer, integer, integer, text, text, text, double precision, text
) from public, anon, authenticated;

grant execute on function public.create_action_with_training(
  text, text, date, text, double precision, double precision, numeric,
  integer, integer, integer, text, text, text, double precision, text
) to service_role;

revoke all on function public.moderate_action_atomically(
  uuid, text, text
) from public, anon, authenticated;

grant execute on function public.moderate_action_atomically(
  uuid, text, text
) to service_role;
