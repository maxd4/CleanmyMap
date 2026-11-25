-- Forward-only migration: add atomic idempotency_key for institutional relationship facts.
-- Preserves all existing historical rows without silent deletion.

alter table public.institutional_relationship_facts
  add column if not exists idempotency_key text;

create unique index if not exists idx_institutional_relationship_facts_idempotency_key
  on public.institutional_relationship_facts (idempotency_key)
  where idempotency_key is not null;
