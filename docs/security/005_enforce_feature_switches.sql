-- ============================================================================
-- Transit Regina — OPTIONAL. Makes the admin's feature switches real in the database.
-- Today a switched-off feature is only hidden in the app. After this script, a rider whose
-- feature is off cannot read or change that feature's data at all, even with their own tools.
-- Run it when a feature must really be off (for example once features are paid).
-- Not covered: bus suggestions, which are worked out in the browser and store nothing.
-- Side effect to expect: the weekly planner reads saved places, so switching "saved locations"
-- off for a rider also empties their planner's place list.
-- ============================================================================
create or replace function public.feature_enabled(f text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.feature_access where user_id = auth.uid() and feature = f and enabled = false);
$$;
revoke all on function public.feature_enabled(text) from public, anon;
grant execute on function public.feature_enabled(text) to authenticated, service_role;

do $$ declare r record; begin
  for r in select * from (values ('weekly_schedules','weekly_planner'), ('saved_destinations','saved_locations'),
                                 ('push_subscriptions','push_notifications'), ('trip_schedules','trip_planner')) as v(t, f)
  loop
    if to_regclass('public.' || r.t) is not null then
      execute format('drop policy if exists feature_must_be_on on public.%I', r.t);
      execute format('create policy feature_must_be_on on public.%I as restrictive for all to authenticated using (public.feature_enabled(%L)) with check (public.feature_enabled(%L))', r.t, r.f, r.f);
    end if;
  end loop;
end $$;

-- To undo:  drop policy feature_must_be_on on public.<table>;   (for each of the four tables)
