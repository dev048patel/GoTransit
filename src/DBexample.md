
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
  page_views    INTEGER DEFAULT 0
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
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name','User'), new.email);
  INSERT INTO public.user_preferences (id) VALUES (new.id)
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
