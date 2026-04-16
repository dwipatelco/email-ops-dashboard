# Email Ops & Monitoring Dashboard

Internal operations dashboard for monitoring incoming/outgoing company email traffic.

## Stack

- Next.js App Router (`/app`) for UI and server routes
- PostgreSQL + Prisma for persistence
- Worker runs inside Next.js process (production mode)
- Tailwind CSS + lightweight UI primitives
- TanStack React Table for the message explorer
- SSE endpoint for near-realtime UI refresh

## Core Features

- Single admin auth (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- Mailbox CRUD with encrypted IMAP credentials
- Manual sync queueing + background scheduled sync
- Unified searchable message feed (`Inbox` = incoming, `Sent` = outgoing)
- Message detail page with audit logging
- Dashboard + system status pages

## Environment

Use `.env` with at least:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/monitor_email
APP_ENCRYPTION_KEY=<openssl rand -base64 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>
SESSION_SECRET=<strong-session-secret>
SYNC_POLL_INTERVAL_MS=60000
EVENTS_POLL_INTERVAL_MS=3000
```

Production runtime rejects placeholder values for `APP_ENCRYPTION_KEY`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.
Polling intervals must be positive integers with minimum values:
- `SYNC_POLL_INTERVAL_MS >= 5000`
- `EVENTS_POLL_INTERVAL_MS >= 1000`

## Commands

```bash
pnpm install
pnpm prisma:generate
pnpm dev
pnpm build
pnpm start
pnpm test
```

**Note:** In development (`pnpm dev`), the worker doesn't run. Use `pnpm dev` for UI testing, or set `NODE_ENV=production` to test the full stack.

## Docker / Dokploy

Build image:

```bash
docker build -t monitor-email .
```

Run container:

```bash
docker run --rm -p 3000:3000 --env-file .env monitor-email
```

For Dokploy, deploy a single service. The worker runs inside the Next.js process automatically.

## Notes

- The worker runs inside the Next.js process in production mode only.
- Worker requires a reachable Postgres instance and valid mailbox IMAP credentials.
- Outgoing visibility depends on mailbox clients writing sent mail into `Sent`.
