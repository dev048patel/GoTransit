-- ============================================================================
-- Transit Regina — fixes from the October 2026 audit.  Run after the matching
-- backend and website are live.  Can be run more than once.
-- Run in: Supabase dashboard → SQL Editor.
-- ============================================================================

-- ── 1. role and status changes go through the backend only ──
-- The admin panel changes accounts through the backend, which asks for a fresh authenticator
-- code and emails an alert. This rule let an admin login change any account directly in the
-- database, skipping both. Admins can still read every profile.
drop policy if exists profiles_update_admin on public.profiles;

-- ── 2. a changed phone number is no longer a verified one ──
create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- No end-user behind the request (backend service key, dashboard): allowed.
  if auth.uid() is null then return new; end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at
     or new.mobile_verified is distinct from old.mobile_verified then
    raise exception 'You are not allowed to change that field' using errcode = '42501';
  end if;
  -- The one status change a user may make themselves: closing their own active account.
  if new.account_status is distinct from old.account_status
     and not (old.account_status = 'active' and new.account_status = 'deleted') then
    raise exception 'You are not allowed to change your account status' using errcode = '42501';
  end if;
  -- Text reminders only go to verified numbers, so a new number starts unverified.
  if new.mobile_number is distinct from old.mobile_number then new.mobile_verified := false; end if;
  return new;
end $$;

-- ── 3. a route number in a reminder must look like a route number ──
-- NOT VALID: applies to new and changed rows without failing on anything already stored.
alter table public.weekly_schedules drop constraint if exists weekly_schedules_route_num_shape;
alter table public.weekly_schedules add constraint weekly_schedules_route_num_shape
  check (route_num is null or route_num ~ '^[A-Za-z0-9]{1,6}$') not valid;

-- ── check: should list profiles_read and profiles_update_own only ──
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'profiles' order by 1;
