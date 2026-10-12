-- SPOGOMI lot 8 follow-up: a revoked certificate reference stays invalid.
-- Reissuing the same corrected source state must create a new opaque reference.

alter table public.spogomi_volunteer_certificates
  drop constraint if exists spogomi_volunteer_certificates_user_id_event_id_source_fingerprint_key;

create index spogomi_volunteer_certificates_source_idx
  on public.spogomi_volunteer_certificates(user_id, event_id, source_fingerprint, issued_at desc);
