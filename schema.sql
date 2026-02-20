-- ============================================================================
-- GoTransit Regina — PostgreSQL Schema
-- ============================================================================
-- Requires: pgcrypto extension for gen_random_uuid()
--
-- Tables:
--   users, otp_verifications, user_profiles, favourite_stops,
--   favourite_routes, sessions
--
-- Includes indexes, CASCADE deletes, and an auto-create trigger for
-- user_profiles on user insert.
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TYPE account_status_enum AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE otp_purpose_enum   AS ENUM ('signup', 'login', 'reset');
CREATE TYPE theme_pref_enum    AS ENUM ('light', 'dark', 'system');

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. users
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        VARCHAR(120) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    mobile_number    VARCHAR(20)  UNIQUE,
    mobile_verified  BOOLEAN      NOT NULL DEFAULT false,
    email_verified   BOOLEAN      NOT NULL DEFAULT false,
    password_hash    TEXT         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at    TIMESTAMPTZ,
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    account_status   account_status_enum NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_users_email         ON users (email);
CREATE INDEX idx_users_mobile_number ON users (mobile_number);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. otp_verifications
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE otp_verifications (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mobile_number  VARCHAR(20) NOT NULL,
    otp_code       VARCHAR(6)  NOT NULL,
    purpose        otp_purpose_enum NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    is_used        BOOLEAN     NOT NULL DEFAULT false,
    attempts       INT         NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_mobile_used ON otp_verifications (mobile_number, is_used);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. user_profiles  (1 : 1 with users)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_profiles (
    id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                      UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    avatar_url                   TEXT,
    home_stop_id                 VARCHAR(50),
    theme_preference             theme_pref_enum NOT NULL DEFAULT 'system',
    language                     VARCHAR(10)  NOT NULL DEFAULT 'en',
    accessibility_mode           BOOLEAN      NOT NULL DEFAULT false,
    notifications_service_alerts BOOLEAN      NOT NULL DEFAULT true,
    notifications_delays         BOOLEAN      NOT NULL DEFAULT true,
    notifications_promotions     BOOLEAN      NOT NULL DEFAULT false,
    created_at                   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. favourite_stops
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE favourite_stops (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stop_id     VARCHAR(50) NOT NULL,
    stop_name   VARCHAR(255) NOT NULL,
    label       VARCHAR(50),           -- e.g. "Home", "Work", "Campus"
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_favourite_stops_user ON favourite_stops (user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. favourite_routes
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE favourite_routes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_number  VARCHAR(10) NOT NULL,
    route_name    VARCHAR(255) NOT NULL,
    direction     VARCHAR(50),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. sessions
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE sessions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT        NOT NULL,
    device_info  TEXT,
    ip_address   INET,
    expires_at   TIMESTAMPTZ NOT NULL,
    is_revoked   BOOLEAN     NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token_hash ON sessions (token_hash);

-- ──────────────────────────────────────────────────────────────────────────────
-- TRIGGER: auto-create user_profiles row on INSERT into users
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_user_profile
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_create_user_profile();
