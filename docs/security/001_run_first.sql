-- ============================================================================
-- Transit Regina — database hardening, part 1.  SAFE TO RUN AT ANY TIME.
-- Run in: Supabase dashboard → SQL Editor.  Can be run more than once.
--
-- What it does
--   1. Stops any user from making themselves an admin (or un-suspending themselves).
--   2. Creates the security_events table the admin Security page reads.
--   3. Records every role / status change, including ones made directly in the dashboard.
--   4. Cuts suspended and deleted accounts off from their data in the database itself.
-- ============================================================================

-- ── helpers (SECURITY DEFINER so policies can ask "who is this?" without recursion) ──
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and account_status = 'active');
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active');
$$;

revoke all on function public.is_admin(), public.is_active_user() from public, anon;
grant execute on function public.is_admin(), public.is_active_user() to authenticated, service_role;

-- ── 1. profiles: who may read and change what ──
alter table public.profiles enable row level security;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
  loop execute format('drop policy %I on public.profiles', p.policyname); end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- No insert or delete policy: rows are created by the signup trigger and removed by the backend.

-- Row-level rules cannot protect single columns, so a trigger does:
-- an ordinary user may edit their name, phone and text-message choice, and nothing else.
create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- No end-user behind the request (backend service key, dashboard) or an admin: allowed.
  if auth.uid() is null or public.is_admin() then return new; end if;

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
  return new;
end $$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ── 2. security events (written by the backend, read by admins) ──
create table if not exists public.security_events (
  id          bigint generated always as identity primary key,
  type        text not null,
  severity    text not null check (severity in ('info','warning','critical')),
  message     text not null,
  ip          text,
  user_id     uuid,
  path        text,
  created_at  timestamptz not null default now()
);
create index if not exists security_events_created_at on public.security_events (created_at desc);
alter table public.security_events enable row level security;
drop policy if exists security_events_admin_read on public.security_events;
create policy security_events_admin_read on public.security_events for select to authenticated using (public.is_admin());
revoke all on public.security_events from anon;
-- No insert/update/delete policy: only the backend's service key can write.

-- ── 3. audit: every role or status change, however it was made ──
create or replace function public.audit_profile_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    insert into public.security_events (type, severity, message, user_id)
    values ('role_changed_db', 'critical', format('Role of user %s changed from %s to %s', new.id, old.role, new.role), auth.uid());
  end if;
  if new.account_status is distinct from old.account_status then
    insert into public.security_events (type, severity, message, user_id)
    values ('status_changed_db', 'warning', format('Status of user %s changed from %s to %s', new.id, old.account_status, new.account_status), auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists audit_profile_change on public.profiles;
create trigger audit_profile_change after update on public.profiles
  for each row execute function public.audit_profile_change();

-- ── 4. suspended and deleted accounts lose access to their data ──
-- A RESTRICTIVE policy is ANDed with the existing ones: "…and the account must be active".
do $$ declare t text; begin
  foreach t in array array['user_preferences','favourite_stops','favourite_routes','saved_destinations',
                           'weekly_schedules','push_subscriptions','trip_schedules','trip_schedule_legs','feature_access']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists active_accounts_only on public.%I', t);
      execute format('create policy active_accounts_only on public.%I as restrictive for all to authenticated using (public.is_active_user()) with check (public.is_active_user())', t);
    end if;
  end loop;
end $$;

-- ── pin the search path of the existing SECURITY DEFINER functions ──
alter function public.handle_new_user() set search_path = public;
alter function public.get_email_by_mobile(text) set search_path = public;

-- ── check: this should list profiles_read, profiles_update_own, profiles_update_admin ──
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'profiles' order by 1;
