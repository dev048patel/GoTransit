#!/usr/bin/env node
/**
 * scripts/users.mjs — GoTransit Regina User Management CLI
 *
 * Talks directly to the Express backend (Railway in production, localhost in dev).
 * Works from any terminal, any machine, any time — no dev server or file needed.
 *
 * Usage:
 *   node scripts/users.mjs list
 *   node scripts/users.mjs get <email>
 *   node scripts/users.mjs delete <email>
 *   node scripts/users.mjs suspend <id>
 *   node scripts/users.mjs count
 *   node scripts/users.mjs export [file.json]
 *
 * Set API base via env:
 *   GOTRANSIT_API=http://localhost:3001 node scripts/users.mjs list   (local dev)
 *   GOTRANSIT_API=https://gotransit-production.up.railway.app node scripts/users.mjs list  (prod)
 */

// Default: try Railway prod. Override with env var GOTRANSIT_API for local dev.
const BASE = (process.env.GOTRANSIT_API || 'https://gotransit-production.up.railway.app') + '/api/users';

async function api(path = '', opts = {}) {
    const url = BASE + path;
    const res = await fetch(url, opts);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} at ${url}: ${text}`);
    }
    // 204 / empty body check
    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

/* ── Formatting ───────────────────────────────────────────────────── */

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-CA', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function printUser(u) {
    console.log(`
  ┌──────────────────────────────────────────────────────
  │  ID            : ${u.id}
  │  Name          : ${u.full_name}
  │  Email         : ${u.email}
  │  Mobile        : ${u.mobile_number || '—'}
  │  Status        : ${u.account_status}
  │  Registered    : ${fmtDate(u.created_at)}
  │  Last Login    : ${fmtDate(u.last_login_at)}
  └──────────────────────────────────────────────────────`);
}

function printTable(users) {
    if (!users.length) { console.log('\n  (no users found)\n'); return; }
    const W = { name: 22, email: 32, status: 12, last: 22 };
    const line = `  ${'─'.repeat(W.name + W.email + W.status + W.last + 8)}`;
    const h = (s, w) => (s || '').toString().slice(0, w - 1).padEnd(w);
    console.log(`\n  ${h('Name', W.name)} ${h('Email', W.email)} ${h('Status', W.status)} Last Login`);
    console.log(line);
    for (const u of users) {
        console.log(`  ${h(u.full_name, W.name)} ${h(u.email, W.email)} ${h(u.account_status, W.status)} ${fmtDate(u.last_login_at)}`);
    }
    console.log(line);
    console.log(`  Total: ${users.length} user(s)\n`);
}

/* ── Commands ─────────────────────────────────────────────────────── */

const [,, cmd, arg] = process.argv;

(async () => {
    try {
        switch (cmd) {

            case 'list': {
                const users = await api();
                console.log(`\n🚌 GoTransit Regina — Users  [${BASE}]`);
                printTable(users);
                break;
            }

            case 'get': {
                if (!arg) { console.error('Usage: node scripts/users.mjs get <email>'); process.exit(1); }
                // getAll and filter by email (no dedicated email lookup endpoint needed)
                const users = await api();
                const user = users.find(u => u.email.toLowerCase() === arg.toLowerCase());
                if (!user) { console.log(`\n  ❌  No user found with email: ${arg}\n`); break; }
                printUser(user);
                break;
            }

            case 'delete': {
                if (!arg) { console.error('Usage: node scripts/users.mjs delete <email>'); process.exit(1); }
                await api(`/email/${encodeURIComponent(arg)}`, { method: 'DELETE' });
                console.log(`\n  ✅  Deleted user: ${arg}\n`);
                break;
            }

            case 'suspend': {
                if (!arg) { console.error('Usage: node scripts/users.mjs suspend <user-id>'); process.exit(1); }
                const user = await api(`/${arg}/status`, { method: 'PATCH' });
                console.log(`\n  ✅  User ${user.email} is now: ${user.account_status}\n`);
                break;
            }

            case 'count': {
                const { count } = await api('/count');
                console.log(`\n  👥  Total registered users: ${count}\n`);
                break;
            }

            case 'export': {
                const dest = arg || `users-export-${Date.now()}.json`;
                const users = await api();
                const { writeFileSync } = await import('node:fs');
                writeFileSync(dest, JSON.stringify(users, null, 2));
                console.log(`\n  📦  Exported ${users.length} user(s) to ${dest}\n`);
                break;
            }

            default: {
                console.log(`
  🚌 GoTransit Regina — User CLI

  Connects to: ${BASE}
  Override:    GOTRANSIT_API=http://localhost:3001 node scripts/users.mjs ...

  Commands:
    list                     List all registered users
    get <email>              Show one user's full record
    delete <email>           Hard-delete a user (cascades sessions/favourites)
    suspend <user-id>        Toggle Active ↔ Suspended
    count                    Show total user count
    export [file.json]       Export all users to a JSON file
`);
            }
        }
    } catch (err) {
        console.error(`\n  ❌  Error: ${err.message}\n`);
        console.error('  Make sure the server is running and DATABASE_URL is set on Railway.\n');
        process.exit(1);
    }
})();
