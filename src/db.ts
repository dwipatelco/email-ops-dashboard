import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  AuditLogRecord,
  MailboxRecord,
  MailboxStatus,
  MessageListFilters,
  MessageRecord,
  SyncCursorRecord,
  SyncRunRecord
} from "./types.js";

type MailboxInsertInput = {
  email: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

type MailboxUpdateInput = MailboxInsertInput;

type MailboxSyncState = {
  status: MailboxStatus;
  lastSyncStartedAt?: string | null;
  lastSyncFinishedAt?: string | null;
  lastSyncError?: string | null;
};

type MessageUpsertInput = {
  mailboxId: number;
  folderName: string;
  externalUid: number;
  messageId: string | null;
  direction: "incoming" | "outgoing";
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
};

function now(): string {
  return new Date().toISOString();
}

function normalizeBoolean(value: unknown): boolean {
  return value === 1 || value === true;
}

function ensureFileDatabase(filename: string): void {
  if (filename === ":memory:") {
    return;
  }

  mkdirSync(dirname(filename), { recursive: true });
}

export class Database {
  private readonly sqlite: DatabaseSync;
  readonly mailboxes: {
    create: (input: MailboxInsertInput) => number;
    update: (id: number, input: MailboxUpdateInput) => void;
    delete: (id: number) => void;
    list: () => MailboxRecord[];
    getById: (id: number) => MailboxRecord | null;
    setSyncState: (id: number, state: MailboxSyncState) => void;
  };
  readonly messages: {
    upsert: (input: MessageUpsertInput) => number;
    list: (filters: MessageListFilters) => MessageRecord[];
    getById: (id: number) => MessageRecord | null;
  };
  readonly syncCursors: {
    get: (mailboxId: number, folderName: string) => SyncCursorRecord | null;
    upsert: (mailboxId: number, folderName: string, lastUid: number) => void;
  };
  readonly syncRuns: {
    start: (mailboxId: number) => number;
    finishSuccess: (id: number, incomingCount: number, outgoingCount: number) => void;
    finishFailure: (id: number, errorMessage: string) => void;
    listRecent: () => SyncRunRecord[];
  };
  readonly auditLogs: {
    create: (username: string, action: string, messageId: number | null) => number;
    list: () => AuditLogRecord[];
  };

  constructor(filename: string) {
    ensureFileDatabase(filename);
    this.sqlite = new DatabaseSync(filename);
    this.sqlite.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS mailboxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        secure INTEGER NOT NULL,
        username TEXT NOT NULL,
        encrypted_password TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        last_sync_started_at TEXT,
        last_sync_finished_at TEXT,
        last_sync_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_cursors (
        mailbox_id INTEGER NOT NULL,
        folder_name TEXT NOT NULL,
        last_uid INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (mailbox_id, folder_name),
        FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mailbox_id INTEGER NOT NULL,
        folder_name TEXT NOT NULL,
        external_uid INTEGER NOT NULL,
        message_id TEXT,
        direction TEXT NOT NULL,
        sender_json TEXT NOT NULL,
        recipient_json TEXT NOT NULL,
        cc_json TEXT NOT NULL,
        bcc_json TEXT NOT NULL,
        subject TEXT,
        sent_at TEXT,
        received_at TEXT,
        snippet TEXT,
        body_text TEXT,
        body_html TEXT,
        synced_at TEXT NOT NULL,
        UNIQUE (mailbox_id, folder_name, external_uid),
        FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mailbox_id INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL,
        incoming_count INTEGER NOT NULL DEFAULT 0,
        outgoing_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        message_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
      );
    `);

    this.mailboxes = {
      create: (input) => {
        const timestamp = now();
        const result = this.sqlite
          .prepare(`
            INSERT INTO mailboxes (
              email, host, port, secure, username, encrypted_password, status,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'idle', ?, ?)
          `)
          .run(
            input.email,
            input.host,
            input.port,
            input.secure ? 1 : 0,
            input.username,
            input.password,
            timestamp,
            timestamp
          );

        return Number(result.lastInsertRowid);
      },
      update: (id, input) => {
        const timestamp = now();
        this.sqlite
          .prepare(`
            UPDATE mailboxes
            SET email = ?, host = ?, port = ?, secure = ?, username = ?, encrypted_password = ?, updated_at = ?
            WHERE id = ?
          `)
          .run(
            input.email,
            input.host,
            input.port,
            input.secure ? 1 : 0,
            input.username,
            input.password,
            timestamp,
            id
          );
      },
      delete: (id) => {
        this.sqlite.prepare("DELETE FROM mailboxes WHERE id = ?").run(id);
      },
      list: () =>
        this.sqlite
          .prepare(`
            SELECT id, email, host, port, secure, username, encrypted_password, status,
                   last_sync_started_at, last_sync_finished_at, last_sync_error, created_at, updated_at
            FROM mailboxes
            ORDER BY email ASC
          `)
          .all()
          .map((row) => this.mapMailbox(row)),
      getById: (id) => {
        const row = this.sqlite
          .prepare(`
            SELECT id, email, host, port, secure, username, encrypted_password, status,
                   last_sync_started_at, last_sync_finished_at, last_sync_error, created_at, updated_at
            FROM mailboxes
            WHERE id = ?
          `)
          .get(id);

        return row ? this.mapMailbox(row) : null;
      },
      setSyncState: (id, state) => {
        const current = this.mailboxes.getById(id);
        if (!current) {
          throw new Error(`Mailbox ${id} not found`);
        }

        this.sqlite
          .prepare(`
            UPDATE mailboxes
            SET status = ?, last_sync_started_at = ?, last_sync_finished_at = ?, last_sync_error = ?, updated_at = ?
            WHERE id = ?
          `)
          .run(
            state.status,
            state.lastSyncStartedAt ?? current.lastSyncStartedAt,
            state.lastSyncFinishedAt ?? current.lastSyncFinishedAt,
            state.lastSyncError ?? current.lastSyncError,
            now(),
            id
          );
      }
    };

    this.messages = {
      upsert: (input) => {
        const timestamp = now();
        this.sqlite
          .prepare(`
            INSERT INTO messages (
              mailbox_id, folder_name, external_uid, message_id, direction,
              sender_json, recipient_json, cc_json, bcc_json, subject,
              sent_at, received_at, snippet, body_text, body_html, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(mailbox_id, folder_name, external_uid) DO UPDATE SET
              message_id = excluded.message_id,
              direction = excluded.direction,
              sender_json = excluded.sender_json,
              recipient_json = excluded.recipient_json,
              cc_json = excluded.cc_json,
              bcc_json = excluded.bcc_json,
              subject = excluded.subject,
              sent_at = excluded.sent_at,
              received_at = excluded.received_at,
              snippet = excluded.snippet,
              body_text = excluded.body_text,
              body_html = excluded.body_html,
              synced_at = excluded.synced_at
          `)
          .run(
            input.mailboxId,
            input.folderName,
            input.externalUid,
            input.messageId,
            input.direction,
            input.from,
            input.to,
            input.cc,
            input.bcc,
            input.subject,
            input.sentAt,
            input.receivedAt,
            input.snippet,
            input.bodyText,
            input.bodyHtml,
            timestamp
          );

        const row = this.sqlite
          .prepare("SELECT id FROM messages WHERE mailbox_id = ? AND folder_name = ? AND external_uid = ?")
          .get(input.mailboxId, input.folderName, input.externalUid) as { id: number };

        return row.id;
      },
      list: (filters) => {
        const clauses: string[] = [];
        const params: Array<string | number> = [];

        if (filters.mailboxId) {
          clauses.push("messages.mailbox_id = ?");
          params.push(filters.mailboxId);
        }

        if (filters.direction) {
          clauses.push("messages.direction = ?");
          params.push(filters.direction);
        }

        if (filters.search) {
          clauses.push("(lower(messages.subject) LIKE ? OR lower(messages.sender_json) LIKE ? OR lower(messages.recipient_json) LIKE ? OR lower(messages.body_text) LIKE ?)");
          const search = `%${filters.search.toLowerCase()}%`;
          params.push(search, search, search, search);
        }

        if (filters.fromDate) {
          clauses.push("COALESCE(messages.received_at, messages.sent_at) >= ?");
          params.push(filters.fromDate);
        }

        if (filters.toDate) {
          clauses.push("COALESCE(messages.received_at, messages.sent_at) <= ?");
          params.push(filters.toDate);
        }

        const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
        return this.sqlite
          .prepare(`
            SELECT messages.id, messages.mailbox_id, mailboxes.email AS mailbox_email, messages.folder_name,
                   messages.external_uid, messages.message_id, messages.direction, messages.sender_json,
                   messages.recipient_json, messages.cc_json, messages.bcc_json, messages.subject,
                   messages.sent_at, messages.received_at, messages.snippet, messages.body_text,
                   messages.body_html, messages.synced_at
            FROM messages
            INNER JOIN mailboxes ON mailboxes.id = messages.mailbox_id
            ${whereClause}
            ORDER BY COALESCE(messages.received_at, messages.sent_at, messages.synced_at) DESC
          `)
          .all(...params)
          .map((row) => this.mapMessage(row));
      },
      getById: (id) => {
        const row = this.sqlite
          .prepare(`
            SELECT messages.id, messages.mailbox_id, mailboxes.email AS mailbox_email, messages.folder_name,
                   messages.external_uid, messages.message_id, messages.direction, messages.sender_json,
                   messages.recipient_json, messages.cc_json, messages.bcc_json, messages.subject,
                   messages.sent_at, messages.received_at, messages.snippet, messages.body_text,
                   messages.body_html, messages.synced_at
            FROM messages
            INNER JOIN mailboxes ON mailboxes.id = messages.mailbox_id
            WHERE messages.id = ?
          `)
          .get(id);

        return row ? this.mapMessage(row) : null;
      }
    };

    this.syncCursors = {
      get: (mailboxId, folderName) => {
        const row = this.sqlite
          .prepare(`
            SELECT mailbox_id, folder_name, last_uid, updated_at
            FROM sync_cursors
            WHERE mailbox_id = ? AND folder_name = ?
          `)
          .get(mailboxId, folderName);

        if (!row) {
          return null;
        }

        return {
          mailboxId: Number((row as Record<string, unknown>).mailbox_id),
          folderName: String((row as Record<string, unknown>).folder_name),
          lastUid: Number((row as Record<string, unknown>).last_uid),
          updatedAt: String((row as Record<string, unknown>).updated_at)
        };
      },
      upsert: (mailboxId, folderName, lastUid) => {
        this.sqlite
          .prepare(`
            INSERT INTO sync_cursors (mailbox_id, folder_name, last_uid, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(mailbox_id, folder_name) DO UPDATE SET
              last_uid = excluded.last_uid,
              updated_at = excluded.updated_at
          `)
          .run(mailboxId, folderName, lastUid, now());
      }
    };

    this.syncRuns = {
      start: (mailboxId) => {
        const result = this.sqlite
          .prepare(`
            INSERT INTO sync_runs (mailbox_id, started_at, status)
            VALUES (?, ?, 'running')
          `)
          .run(mailboxId, now());

        return Number(result.lastInsertRowid);
      },
      finishSuccess: (id, incomingCount, outgoingCount) => {
        this.sqlite
          .prepare(`
            UPDATE sync_runs
            SET finished_at = ?, status = 'ok', incoming_count = ?, outgoing_count = ?, error_message = NULL
            WHERE id = ?
          `)
          .run(now(), incomingCount, outgoingCount, id);
      },
      finishFailure: (id, errorMessage) => {
        this.sqlite
          .prepare(`
            UPDATE sync_runs
            SET finished_at = ?, status = 'error', error_message = ?
            WHERE id = ?
          `)
          .run(now(), errorMessage, id);
      },
      listRecent: () =>
        this.sqlite
          .prepare(`
            SELECT id, mailbox_id, started_at, finished_at, status, incoming_count, outgoing_count, error_message
            FROM sync_runs
            ORDER BY started_at DESC
            LIMIT 20
          `)
          .all()
          .map((row) => ({
            id: Number((row as Record<string, unknown>).id),
            mailboxId: Number((row as Record<string, unknown>).mailbox_id),
            startedAt: String((row as Record<string, unknown>).started_at),
            finishedAt: ((row as Record<string, unknown>).finished_at as string | null) ?? null,
            status: String((row as Record<string, unknown>).status) as SyncRunRecord["status"],
            incomingCount: Number((row as Record<string, unknown>).incoming_count),
            outgoingCount: Number((row as Record<string, unknown>).outgoing_count),
            errorMessage: ((row as Record<string, unknown>).error_message as string | null) ?? null
          }))
    };

    this.auditLogs = {
      create: (username, action, messageId) => {
        const result = this.sqlite
          .prepare(`
            INSERT INTO audit_logs (username, action, message_id, created_at)
            VALUES (?, ?, ?, ?)
          `)
          .run(username, action, messageId, now());

        return Number(result.lastInsertRowid);
      },
      list: () =>
        this.sqlite
          .prepare(`
            SELECT id, username, action, message_id, created_at
            FROM audit_logs
            ORDER BY created_at DESC
          `)
          .all()
          .map((row) => ({
            id: Number((row as Record<string, unknown>).id),
            username: String((row as Record<string, unknown>).username),
            action: String((row as Record<string, unknown>).action),
            messageId: ((row as Record<string, unknown>).message_id as number | null) ?? null,
            createdAt: String((row as Record<string, unknown>).created_at)
          }))
    };
  }

  private mapMailbox(row: unknown): MailboxRecord {
    const record = row as Record<string, unknown>;
    return {
      id: Number(record.id),
      email: String(record.email),
      host: String(record.host),
      port: Number(record.port),
      secure: normalizeBoolean(record.secure),
      username: String(record.username),
      encryptedPassword: String(record.encrypted_password),
      status: String(record.status) as MailboxStatus,
      lastSyncStartedAt: (record.last_sync_started_at as string | null) ?? null,
      lastSyncFinishedAt: (record.last_sync_finished_at as string | null) ?? null,
      lastSyncError: (record.last_sync_error as string | null) ?? null,
      createdAt: String(record.created_at),
      updatedAt: String(record.updated_at)
    };
  }

  private mapMessage(row: unknown): MessageRecord {
    const record = row as Record<string, unknown>;
    return {
      id: Number(record.id),
      mailboxId: Number(record.mailbox_id),
      mailboxEmail: String(record.mailbox_email),
      folderName: String(record.folder_name),
      externalUid: Number(record.external_uid),
      messageId: (record.message_id as string | null) ?? null,
      direction: String(record.direction) as MessageRecord["direction"],
      from: String(record.sender_json),
      to: String(record.recipient_json),
      cc: String(record.cc_json),
      bcc: String(record.bcc_json),
      subject: (record.subject as string | null) ?? null,
      sentAt: (record.sent_at as string | null) ?? null,
      receivedAt: (record.received_at as string | null) ?? null,
      snippet: (record.snippet as string | null) ?? null,
      bodyText: (record.body_text as string | null) ?? null,
      bodyHtml: (record.body_html as string | null) ?? null,
      syncedAt: String(record.synced_at)
    };
  }
}
