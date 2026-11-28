begin;

-- Event reviewers are event-scoped capabilities, including on mixed editions.
-- Division eligibility is validated separately for every current division.
alter table public.spogomi_event_reviewers
  alter column division_id drop not null;

drop trigger if exists spogomi_event_reviewers_fill_single_division
  on public.spogomi_event_reviewers;

comment on column public.spogomi_event_reviewers.division_id is
  'Optional legacy division provenance. Reviewer capabilities remain event-scoped; current referee eligibility is checked for each division.';

commit;
