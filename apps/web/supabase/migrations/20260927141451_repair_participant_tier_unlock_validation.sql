-- Historical participant tier unlocks were written as pending even though
-- confirmed participation is already a final CURRENT fact. Remove a pending
-- copy when the validated logical event already exists, then promote the
-- remaining historical events in place so rebuilds remain idempotent under
-- uq_progression_events_logical_identity.

delete from public.progression_events pending
using public.progression_events validated
where pending.event_type = 'participant_tier_unlock'
  and pending.status_phase = 'pending'
  and validated.event_type = pending.event_type
  and validated.user_id = pending.user_id
  and validated.source_table = pending.source_table
  and validated.source_id = pending.source_id
  and validated.status_phase = 'validated';

update public.progression_events
set status_phase = 'validated'
where event_type = 'participant_tier_unlock'
  and status_phase = 'pending';
