-- SPOGOMI lot 8: private, idempotent recap notifications for recognition changes.

alter table public.app_notifications
  drop constraint if exists app_notifications_type_check;

alter table public.app_notifications
  add constraint app_notifications_type_check
  check (type in (
    'validation',
    'community',
    'system',
    'security',
    'chat',
    'action_discussion',
    'gamification_reconciliation',
    'gamification_recognition'
  ));

create unique index if not exists app_notifications_spogomi_recognition_id_idx
  on public.app_notifications (user_id, type, ((payload ->> 'recognitionId')))
  where type = 'gamification_recognition'
    and payload ? 'recognitionId';

comment on index public.app_notifications_spogomi_recognition_id_idx is
  'One private recognition recap per user, event projection and effective award fingerprint.';
