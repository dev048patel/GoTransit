# transitr-sms

SMS commute alerts for Transit Regina, deployed as its own Railway service. If this service crashes, the map and the rest of the main API keep working. If the main API goes down, alerts keep going out, because this service reads only Supabase and TransitLive.

For each saved commute (`public.weekly_schedules`), a trip with N buses gets N + 1 texts: "leave now", then "get off at the next stop" for each bus. If buses only cover part of the way, the rider gets a partial-trip notice. If no bus gets them there on time, they get a no-service notice with the earliest possible arrival.

A rider gets texts only if they have opted in, have a verified number, have an active account and have not had text alerts switched off by an admin. Admins switch them off on the admin panel (Person → Features → "Text Alerts"), which writes `public.feature_access` (feature `sms_alerts`, enabled false). The planner, the sender (before every text) and broadcasts all check it, so switching someone off stops their texts within seconds (`src/access.ts`).

```
src/
  transit/    timetable (from data/timetable.json), RAPTOR planner, TransitLive client
  alerts/     plan → alert rows, message text (one GSM-7 segment each), rendering at send time
  delivery/   Twilio, Resend, the outbox every text goes through
  jobs/       planner, tracker, sender, inbound replies, daily report, heartbeat + retention
  report/     the .xlsx writer (two tabs, native column chart)
  http/       /health, /twilio/inbound, /twilio/status, /internal/broadcast
  workers.ts  the timers
```

| Worker | When (Regina time) | What it does |
| --- | --- | --- |
| planner | every 10 min, 04:30–23:00 | builds today's plans and alerts; once per commute per day |
| tracker | every 15 s | matches live buses, moves due times; a transfer that will be missed drops the rest of that trip's alerts (no new text) |
| sender | every 5 s | claims due alerts (quota, cap, outage day), writes and sends them |
| heartbeat | every 30 s | `sms.heartbeats`, read by the main API's outage check |
| report | 01:00–06:00, once | yesterday's report emailed to `ALERT_EMAILS` |
| retention | 03:00–04:00 | deletes SMS data older than 90 days |

## Settings

| Variable | Needed | Meaning |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | yes | same project as the main API |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | to send | |
| `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER` | to send | a Messaging Service is preferred |
| `SMS_PUBLIC_URL` | yes | this service's public URL; Twilio signs requests against it |
| `SMS_SERVICE_TOKEN` | yes | shared secret with the main API (`openssl rand -hex 32`) |
| `TRANSIT_LIVE_API_URL` | yes | live bus feed, same as the main API |
| `RESEND_API_KEY`, `ALERT_EMAILS`, `ALERT_FROM` | for emails | admin report and warnings |
| `SMS_ENABLED` | | `false` stops all sending |
| `SMS_DAILY_LIMIT_MAX` | | ceiling on the daily quota (default 500), from the monthly budget |
| `SMS_PER_USER_DAILY_CAP` | | default 6 |
| `SMS_TRIP_DAILY_CAP` | | one-time trip texts per rider per day, counted apart from commute texts (default 10) |

**One-time trip texts.** After starting a trip on the map, a rider can ask to be texted for it (admins only for now; the main API's `POST /api/sms/trip` checks). The main API sends the buses they chose to `/internal/trips`; `src/transit/chosenTrip.ts` finds the next trips of those routes in the timetable and the plan is stored with `kind = 'trip'` and no schedule, so the tracker and sender treat it like a commute. Starting another trip, or Stop on the map (`/internal/trips/cancel`), stops the texts still to come. Needs `docs/security/sms_004_one_time_trips.sql`.

**Dry run and pilot numbers** are not Railway settings: admins set them on the admin Security page ("Text alerts today"), which saves them to `sms.settings` (`docs/security/sms_003_send_settings.sql`). The service rereads them every 15 seconds. Until that table exists, or while it can't be read on start-up, nothing is sent for real. Turning dry run off or changing the pilot numbers needs a freshly entered authenticator code; turning dry run back on never does.

## Deploying

1. Run `docs/security/sms_001_schema.sql` in the Supabase SQL editor. Then go to Project Settings → API → Exposed schemas and add `sms`.
2. Create a Railway service from this repo with the root directory set to `services/sms`. `railway.json` sets the build, start command and health check. Add the settings above.
3. In the Twilio console, set the number's (or Messaging Service's) incoming message webhook to `https://<SMS_PUBLIC_URL>/twilio/inbound` (HTTP POST).
4. On the main API, set `SMS_SERVICE_URL` (this service's URL) and the same `SMS_SERVICE_TOKEN`. This turns on the Security page's "Text alerts" card and health check, the every-minute outage check, and broadcasting through this service.
5. Roll out in stages on the admin Security page ("Text alerts today"): a week in dry run, then a team pilot (dry run off, the team's numbers as pilot numbers), then everyone (no pilot numbers). At switch-over, set `LEGACY_SMS_REMINDERS=false` on the main API so its old "Leave by" text stops, then delete that code and `/api/sms/webhook`.

## The timetable

`data/timetable.json` is built from the City's GTFS feed and committed, because Railway builds this folder alone. When Regina Transit publishes a new feed, unzip it into `data/google_transit/` at the repo root, then run:

```
npm run build:timetable
```

Commit the result. The planner refuses to plan past the feed's end date and emails the admins instead, so an expired timetable never tells riders "no buses".

## Tests

`npm test` covers the planner on a made-up network and on the real timetable, alert counts, message length, the workbook, and every job and route run end to end against stand-ins for Supabase, TransitLive, Twilio and Resend. `npm run typecheck` checks types.
