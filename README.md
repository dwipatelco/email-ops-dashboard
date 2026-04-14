# Mail Monitor

Read-only self-hosted mailbox monitor for small teams. The app connects to each mailbox over IMAP, syncs `Inbox` and `Sent`, stores messages locally, and exposes a browser UI for search and auditing.

## Features

- Mailbox registry with encrypted IMAP credentials
- Polling sync worker for `Inbox` and `Sent`
- Unified searchable message feed
- Message detail view with audit logging
- Session-protected admin access

## Run

1. Copy `.env.example` to `.env` and set real values.
2. Generate a 32-byte base64 key for `APP_ENCRYPTION_KEY`, for example:

```bash
openssl rand -base64 32
```

3. Start the app:

```bash
pnpm dev
```

The app listens on `http://localhost:3000` by default.

## Notes

- Outgoing visibility depends on each mailbox client saving sent messages into the `Sent` folder.
- The app is read-only. It does not send, delete, or modify user mail.
- The built-in Node SQLite module is currently experimental in Node 24.
