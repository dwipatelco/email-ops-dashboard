# Email Ops & Monitoring Dashboard

Internal operations dashboard for monitoring incoming/outgoing company email traffic.

## Stack

- Next.js App Router (`/app`) for UI and server routes
- PostgreSQL + Prisma for persistence
- Separate worker process for IMAP polling and sync
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

## Commands

```bash
pnpm install
pnpm prisma:generate
pnpm dev
pnpm worker
pnpm build
pnpm test
```

## Docker / Dokploy

Build image:

```bash
docker build -t monitor-email .
```

Run web app (default role):

```bash
docker run --rm -p 3000:3000 --env-file .env monitor-email
```

Run worker from the same image:

```bash
docker run --rm --env-file .env -e APP_ROLE=worker monitor-email
```

For Dokploy, deploy two services from the same `Dockerfile`:

- `web` service: `APP_ROLE=web` (or omit it)
- `worker` service: `APP_ROLE=worker`

## Notes

- The web app and worker both use the same Prisma models and database.
- `pnpm worker` requires a reachable Postgres instance and valid mailbox IMAP credentials.
- Outgoing visibility depends on mailbox clients writing sent mail into `Sent`.
