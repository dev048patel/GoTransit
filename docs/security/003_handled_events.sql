-- ============================================================================
-- Transit Regina — lets admins mark security events as handled.  Safe to run at any time.
-- Handled events are hidden from the Security page by default; nothing is deleted.
-- ============================================================================
alter table public.security_events
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by uuid;
