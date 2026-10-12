# Security: setup and operations

This folder holds what is needed to finish and run the security hardening. The code changes are
in the application; the steps below are the parts that can only be done in a dashboard.

## 1. Rollout order

Do these in order. Steps 1 and 2 can be done before the code is deployed.

1. **Run `001_run_first.sql`** in Supabase → SQL Editor. Safe at any time. It stops users from
   making themselves admins and creates the table the Security page reads.
2. **Add settings on Railway** (backend → Variables):

   | Setting | Value | Why |
   |---|---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key | The backend's own database access. Never put this in Vercel or in any `VITE_` setting. |
   | `RESEND_API_KEY` | A Resend API key with sending access | Sends alert emails |
   | `ALERT_EMAILS` | Admin addresses, comma-separated | Who receives alerts | 
   | `ALERT_FROM` | `Transit Regina Alerts <alerts@transitregina.ca>` | Sender shown on alerts (optional) |
   | `BACKEND_URL` | The backend's public address, no trailing slash | Needed to verify Twilio's signature |

3. **Deploy** the backend (Railway) and the website (Vercel) from the merged branch.
4. **Check** Admin → Security: both health checks say "Working" and there is no yellow warning.
   Opening the admin panel will first ask each admin to set up two-step sign-in (section 4).
5. **Run `002_run_after_deploy.sql`**. It locks the visitor tables and the phone lookup to the
   backend only. Running it before step 4 passes would stop analytics and phone sign-in.

## 2. How admins find out that something is wrong

| What happens | How admins learn about it |
|---|---|
| Someone without rights calls an admin endpoint | Listed on Admin → Security as a warning |
| The same address does that 10 times in 10 minutes | Escalated to critical and emailed |
| A user is deleted, or a role is changed | Critical event and email, naming the admin who did it |
| A role or status is changed directly in the database | Recorded by a database trigger |
| The database or the bus feed stops responding for two checks in a row (about 10 minutes) | Critical event and email; another when it recovers |
| The backend hits an unexpected error | Warning on the Security page |
| A text-message webhook arrives without Twilio's signature | Warning |
| A setting is missing (service key, alert email) | Yellow notice on the Security page |

Emails are limited to one per kind of event every 15 minutes, so an attack cannot flood the inbox.
Events are kept for 90 days, as are visitor records.

**What this cannot tell you:** if the backend itself is down, it cannot send an alert. Add an
outside uptime monitor (UptimeRobot and Better Stack both have free plans) that requests
`<backend address>/api/status` every few minutes and emails you when it fails.

## 3. Dashboard settings to change by hand

- **Supabase → Authentication → Sign In / Providers → Email:** set minimum password length to 10
  and turn on leaked-password protection. Turn on "Secure password change".
- **Supabase → Authentication → Rate Limits:** review sign-in and email limits.
- **Supabase → Authentication → Multi-Factor:** keep "TOTP (App Authenticator)" set to Enabled.
  The app does the rest (see "Two-step sign-in for admins" below).
- **Google Cloud → Credentials → the Maps key:** restrict it to `https://transitregina.ca/*` and
  `https://www.transitregina.ca/*`, limit it to the Maps and Places APIs, and set a daily quota alert.
- **GitHub → Settings → Code security:** enable Dependabot alerts and secret scanning.

## October 2026 audit fixes

A full audit found ten weaknesses; all ten are fixed in code.

- **Railway setting (optional):** `TRUST_PROXY_HOPS`. Leave unset; the default of 2 matches Railway today.
  **Check after every deploy:** `curl -X POST -H "Content-Type: application/json" -d '{"page":"/"}' https://gotransit-production.up.railway.app/api/analytics/beacon`
  must answer with **your own** public address at the start of `sessionId`, and must give the same
  answer when you add `-H "X-Forwarded-For: 1.2.3.4"`. If it shows a `152.233.…` address, every
  visitor is sharing one rate limit: raise the setting by one.
- **Run `004_audit_fixes.sql`** once the new backend is live.
- **`005_enforce_feature_switches.sql`** is optional; read its header first.
- **Text reminders** now go only to numbers marked verified, and nothing marks a number verified
  yet. Build a code-by-text check before switching Twilio on.
- **Phone sign-in** is now done by the backend (`/api/auth/login-mobile`). All phone sign-ins reach
  Supabase from the backend's address, so Supabase's own sign-in limit applies to them together.

## Marking events as handled

On Admin → Security, "Mark handled" (or "Mark all shown as handled") hides an event once you have
dealt with it. It also clears it from the Home page's "needs attention" banner. Nothing is deleted:
tick "Show handled" to see them again, and everything is removed automatically after 90 days.
Needs `003_handled_events.sql` to be run once; until then the buttons do not appear.

## 4. Two-step sign-in for admins

Admin accounts need an authenticator-app code as well as a password. Riders are not affected.

- **First time:** an admin who opens the admin panel is taken to a setup page: scan the QR code
  with Google Authenticator, Microsoft Authenticator or Authy, then enter the 6-digit code.
- **After that:** each new login asks for the current code before the admin panel opens.
- **Enforced in three places:** the admin pages, every admin endpoint on the backend, and (after
  `002_run_after_deploy.sql`) the database rules. A stolen password alone gets none of them.
- **Lost phone:** in Supabase → Authentication → Users, open the admin's account and remove their
  MFA factor. They will be asked to set it up again at their next visit to the admin panel.
- **Before running script 002:** every admin must have completed setup, or their admin pages
  will load empty until they do.

## 5. Content-Security-Policy

`vercel.json` sends the policy in report-only mode: browsers report what would be blocked (in the
developer console) without blocking it. After a week with no reports on the map, login and
admin pages, rename the header from `Content-Security-Policy-Report-Only` to
`Content-Security-Policy` to enforce it.

## 6. If personal data may have been exposed

1. Stop the leak first (disable the endpoint or rotate the key).
2. Write down what was exposed, for how long, and how many people it covers.
3. Check Railway and Supabase logs for evidence that it was actually accessed.
4. Under Canada's privacy law (PIPEDA), a breach that creates a real risk of significant harm
   must be reported to the Privacy Commissioner and to the people affected, and a record of
   every breach must be kept for 24 months. Get legal advice on whether an incident meets that bar.

## 7. Tests

`npm test` starts the real backend against a stand-in database and checks the access rules,
input validation, rate limits and alerting. Run it before every deploy.
