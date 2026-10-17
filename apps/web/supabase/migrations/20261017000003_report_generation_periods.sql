-- Forward-only extension of the Reports generation period contract.
-- Existing period ids remain valid; custom civil bounds live in the immutable snapshot.

alter table public.report_generations
  drop constraint if exists report_generations_period_id_check;

alter table public.report_generations
  add constraint report_generations_period_id_check
  check (
    period_id in (
      'thirty_days',
      'three_months',
      'six_months',
      'twelve_months',
      'current_year',
      'full_history',
      'custom_range'
    )
  );
