-- ============================================================================
-- Transit Regina — database hardening, part 2.
-- RUN ONLY AFTER:
--   • the new backend is live on Railway WITH the SUPABASE_SERVICE_ROLE_KEY setting, and
--   • the new website is live on Vercel, and
--   • every admin has opened the admin panel once and set up two-step sign-in.
-- (Check: the admin Security page shows no warning about the service key.)
-- Running it earlier stops visitor analytics and phone-number sign-in until those are deployed.
-- Run in: Supabase dashboard → SQL Editor.  Can be run more than once.
-- ============================================================================

-- ── 1. visitor analytics: backend only ──
-- These hold IP addresses. With row-level security on and no policy, only the backend's
-- service key can read or write them; the public key in the website can do nothing.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in ('visitor_sessions','feature_events')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop;
end $$;
alter table public.visitor_sessions enable row level security;
alter table public.feature_events  enable row level security;
revoke all on public.visitor_sessions, public.feature_events from anon, authenticated;

-- ── 2. phone-number lookup: backend only (it is rate limited there) ──
revoke execute on function public.get_email_by_mobile(text) from public, anon, authenticated;
grant  execute on function public.get_email_by_mobile(text) to service_role;

-- ── 3. admin rights in the database need two-step sign-in ──
-- From here on, being an admin in the database means: role = admin AND this login passed the
-- authenticator-app step. EVERY ADMIN MUST HAVE SET UP TWO-STEP SIGN-IN IN THE APP FIRST
-- (open the admin panel on the new site once and follow the setup), or the admin pages will show no data.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and account_status = 'active');
$$;

-- ── check: both tables should show rls = true and policies = 0 ──
select c.relname as table, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('visitor_sessions','feature_events');
