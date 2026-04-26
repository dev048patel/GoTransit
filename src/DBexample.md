
The PostgreSQL Database Schema for GoTransit Regina is in Supabase. But here is the code for it.


-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT 'User',
  email         TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended','deleted')),
  mobile_number TEXT,
  mobile_verified BOOLEAN DEFAULT FALSE,
  last_active   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own or admin profile" ON public.profiles FOR ALL USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================
-- 2. USER PREFERENCES
-- ============================================
CREATE TABLE public.user_preferences (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme         TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  larger_text   BOOLEAN DEFAULT FALSE,
  high_contrast BOOLEAN DEFAULT FALSE,
  notif_alerts  BOOLEAN DEFAULT TRUE,
  notif_delays  BOOLEAN DEFAULT TRUE,
  notif_promos  BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. FAVOURITE STOPS
-- ============================================
CREATE TABLE public.favourite_stops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stop_id     TEXT NOT NULL,
  stop_name   TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.favourite_stops ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. FAVOURITE ROUTES
-- ============================================
CREATE TABLE public.favourite_routes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_number  TEXT NOT NULL,
  route_name    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.favourite_routes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. VISITOR SESSIONS
-- ============================================
CREATE TABLE public.visitor_sessions (
  session_id    TEXT PRIMARY KEY,
  ip            TEXT,
  browser       TEXT,
  os            TEXT,
  device        TEXT,
  first_seen    TIMESTAMPTZ DEFAULT now(),
  last_seen     TIMESTAMPTZ DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  pages_visited TEXT[] DEFAULT '{}',
  page_views    INTEGER DEFAULT 0,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. FEATURE EVENTS
-- ============================================
CREATE TABLE public.feature_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('places','directions')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feature_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGER: Auto-create profile + prefs on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, mobile_number)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    new.raw_user_meta_data->>'mobile_number'
  );
  INSERT INTO public.user_preferences (id) VALUES (new.id)
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RPC: Lookup email by mobile (for mobile login)
-- SECURITY DEFINER bypasses RLS so unauthenticated users can resolve mobile → email.
-- Only returns email for active accounts.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_email_by_mobile(mobile TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.profiles
  WHERE mobile_number = mobile AND account_status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

ALTER TABLE public.visitor_sessions 
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================
-- 7. SAVED DESTINATIONS
-- Arbitrary Google Places locations saved by users (Home, Work, etc.)
-- ============================================
CREATE TABLE public.saved_destinations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  place_id    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved destinations"
ON public.saved_destinations
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. WEEKLY COMMUTE SCHEDULES
-- Recurring per-day-of-week commute plans with departure time + push notification support
-- ============================================
CREATE TABLE public.weekly_schedules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week          INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  from_dest_id         UUID REFERENCES public.saved_destinations(id) ON DELETE SET NULL,
  to_dest_id           UUID REFERENCES public.saved_destinations(id) ON DELETE SET NULL,
  arrive_by            TEXT NOT NULL DEFAULT '09:00',  -- "HH:MM" target arrival
  depart_by            TEXT,                           -- computed: arrive_by - route_total_minutes
  route_num            TEXT,                           -- pinned route number
  route_total_minutes  INTEGER,                        -- stored for quick recalculation
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,  -- whether to send push reminder
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, day_of_week)
);

ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weekly schedules"
ON public.weekly_schedules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. PUSH SUBSCRIPTIONS (Web Push / Phase 3)
-- Stores browser push subscription per user+device
-- ============================================
CREATE TABLE public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 10. TRIP SCHEDULES (legacy — quick route planner, no DB persistence)
-- ============================================
CREATE TABLE public.trip_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Trip Plan',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.trip_schedule_legs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID NOT NULL REFERENCES public.trip_schedules(id) ON DELETE CASCADE,
  day_index       INTEGER NOT NULL,
  from_name       TEXT NOT NULL,
  from_lat        DOUBLE PRECISION NOT NULL,
  from_lng        DOUBLE PRECISION NOT NULL,
  to_name         TEXT NOT NULL,
  to_lat          DOUBLE PRECISION NOT NULL,
  to_lng          DOUBLE PRECISION NOT NULL,
  arrive_by       TEXT NOT NULL,
  route_summary   JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trip_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_schedule_legs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedules"
ON public.trip_schedules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own schedule legs"
ON public.trip_schedule_legs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.trip_schedules ts
    WHERE ts.id = schedule_id AND ts.user_id = auth.uid()
  )
);

-- ============================================================
-- 11. FEATURE ACCESS CONTROL
-- ============================================================
-- No row = feature is enabled (only store restrictions/overrides)
CREATE TABLE public.feature_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,  -- weekly_planner | trip_planner | saved_locations | bus_suggestions | push_notifications
  enabled     BOOLEAN NOT NULL DEFAULT false,
  note        TEXT,
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, feature)
);

ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own access flags
CREATE POLICY "Users read own feature access"
ON public.feature_access FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can insert/update/delete (use service-role key from backend)
-- No INSERT/UPDATE/DELETE policy for regular users — all writes go through the backend with service-role key
