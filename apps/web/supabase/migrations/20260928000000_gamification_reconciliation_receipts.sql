-- User-owned, structured consequences of CURRENT gamification reconciliation.
-- This extends the existing in-app notification channel; it is not an admin
-- audit inbox and does not replace progression_events.

alter table public.app_notifications
  add column if not exists seen_at timestamptz,
  add column if not exists acknowledged_at timestamptz;

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
    'gamification_reconciliation'
  ));

-- A deterministic reconciliation may be retried after its ledger write. The
-- receipt remains one user notification rather than being duplicated.
create unique index if not exists app_notifications_gamification_reconciliation_id_idx
  on public.app_notifications (user_id, type, ((payload ->> 'reconciliationId')))
  where type = 'gamification_reconciliation'
    and payload ? 'reconciliationId';

comment on column public.app_notifications.seen_at is
  'When the owner first viewed the notification; nullable for unread rows.';
comment on column public.app_notifications.acknowledged_at is
  'When the owner explicitly acknowledged the notification; nullable.';
